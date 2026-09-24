package com.smarthire.tenant.cv.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.common.storage.FileStorageService;
import com.smarthire.domain.enums.CvStatus;
import com.smarthire.domain.enums.JobStatus;
import com.smarthire.domain.tenant.entity.Application;
import com.smarthire.domain.tenant.entity.Cv;
import com.smarthire.domain.tenant.entity.Job;
import com.smarthire.domain.tenant.entity.User;
import com.smarthire.domain.tenant.repository.ApplicationRepository;
import com.smarthire.domain.tenant.repository.CvAnalysisRepository;
import com.smarthire.domain.tenant.repository.CvDocumentRepository;
import com.smarthire.domain.tenant.repository.CvExtractionRepository;
import com.smarthire.domain.tenant.repository.CvRepository;
import com.smarthire.domain.tenant.repository.CvSkillRepository;
import com.smarthire.domain.tenant.repository.InterviewRepository;
import com.smarthire.domain.tenant.repository.JobRepository;
import com.smarthire.domain.tenant.repository.MatchScoreRepository;
import com.smarthire.domain.tenant.repository.RankingDataRepository;
import com.smarthire.domain.tenant.repository.UserRepository;
import com.smarthire.messaging.JobPublisher;
import com.smarthire.multitenancy.context.TenantContext;
import com.smarthire.multitenancy.service.TenantRegistryService;
import com.smarthire.tenant.cv.dto.CvModels.CvDetail;
import com.smarthire.tenant.cv.dto.CvModels.CvSummary;
import com.smarthire.tenant.cv.dto.CvModels.MatchView;
import com.smarthire.tenant.cv.mapper.CvMapper;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

@Service
public class CvService {
    private static final Logger log = LoggerFactory.getLogger(CvService.class);
    private static final Set<String> ALLOWED_MIME = Set.of(
            "application/pdf",
            "application/msword",
            "application/vnd.ms-word",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    private final CvRepository cvs;
    private final JobRepository jobs;
    private final UserRepository users;
    private final ApplicationRepository applications;
    private final CvDocumentRepository documents;
    private final CvExtractionRepository extractions;
    private final CvSkillRepository cvSkills;
    private final CvAnalysisRepository analyses;
    private final MatchScoreRepository scores;
    private final InterviewRepository interviews;
    private final RankingDataRepository rankingData;
    private final FileStorageService storage;
    private final JobPublisher publisher;
    private final CvAccess access;
    private final CvMapper mapper;
    private final CvMatchingService matching;
    private final CvPipelineService pipeline;
    private final TenantRegistryService tenants;
    private final long maxBytes;

    public CvService(
            CvRepository cvs,
            JobRepository jobs,
            UserRepository users,
            ApplicationRepository applications,
            CvDocumentRepository documents,
            CvExtractionRepository extractions,
            CvSkillRepository cvSkills,
            CvAnalysisRepository analyses,
            MatchScoreRepository scores,
            InterviewRepository interviews,
            RankingDataRepository rankingData,
            FileStorageService storage,
            JobPublisher publisher,
            CvAccess access,
            CvMapper mapper,
            CvMatchingService matching,
            CvPipelineService pipeline,
            TenantRegistryService tenants,
            @Value("${app.cv.max-file-bytes:10485760}") long maxBytes) {
        this.cvs = cvs;
        this.jobs = jobs;
        this.users = users;
        this.applications = applications;
        this.documents = documents;
        this.extractions = extractions;
        this.cvSkills = cvSkills;
        this.analyses = analyses;
        this.scores = scores;
        this.interviews = interviews;
        this.rankingData = rankingData;
        this.storage = storage;
        this.publisher = publisher;
        this.access = access;
        this.mapper = mapper;
        this.matching = matching;
        this.pipeline = pipeline;
        this.tenants = tenants;
        this.maxBytes = maxBytes;
    }

    public Map<String, String> health() {
        return Map.of("module", "cv", "status", "ready");
    }

    @Transactional
    public CvDetail upload(MultipartFile file, Long jobId, Long applicationId, String candidateEmail) {
        if (!access.candidate()) {
            throw new BusinessException("Only candidates can upload CVs", HttpStatus.FORBIDDEN, "CV_UPLOAD_CANDIDATE_ONLY");
        }
        User actor = access.actor();
        User owner = owner(actor, candidateEmail);
        if (!owner.getId().equals(actor.getId())) {
            throw new BusinessException("Cannot upload for another user", HttpStatus.FORBIDDEN, "CV_FORBIDDEN");
        }
        validate(file);
        Job job = null;
        Application application = null;
        if (jobId != null) {
            job = jobs.findById(jobId).orElseThrow(() -> notFound("Job not found", "JOB_NOT_FOUND"));
            if (job.getStatus() != JobStatus.PUBLISHED) {
                throw new BusinessException("Job is not open for applications", HttpStatus.BAD_REQUEST, "JOB_NOT_PUBLISHED");
            }
            application = resolveApplication(job, owner, applicationId);
        }
        try {
            byte[] bytes = file.getBytes();
            String filename = safeName(file.getOriginalFilename());
            Cv cv = new Cv();
            cv.setJob(job);
            cv.setUser(owner);
            cv.setApplication(application);
            cv.setOriginalFilename(filename);
            cv.setMimeType(file.getContentType());
            cv.setFileSize((long) bytes.length);
            cv.setChecksumSha256(sha256(bytes));
            cv.setStatus(CvStatus.UPLOADED);
            cv.setFileUrl("pending");
            cv.setRetainUntil(java.time.Instant.now().plus(730, java.time.temporal.ChronoUnit.DAYS));
            cvs.save(cv);
            try {
                var stored = storage.store(tenants.requireActive(TenantContext.getCurrentTenant()).getSubdomain(),
                        String.valueOf(cv.getId()), filename, bytes);
                cv.setStorageKey(stored.storageKey());
                cv.setFileUrl(stored.url());
                cvs.save(cv);
            } catch (Exception ex) {
                cvs.delete(cv);
                throw ex;
            }
            publisherOrInline(cv.getId());
            return mapper.detail(cv, null, List.of(), null, null, false);
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Failed to store CV", ex);
            throw new BusinessException("Failed to store CV", HttpStatus.INTERNAL_SERVER_ERROR, "CV_STORE_FAILED");
        }
    }

    @Transactional(readOnly = true)
    public StoredCvFile file(long id) {
        Cv cv = cvs.findById(id).orElseThrow(() -> notFound("CV not found", "CV_NOT_FOUND"));
        access.requireCv(cv);
        if (cv.getRetainUntil() != null && java.time.Instant.now().isAfter(cv.getRetainUntil())) {
            throw new BusinessException("CV retention period has ended", HttpStatus.GONE, "CV_EXPIRED");
        }
        try {
            String name = cv.getOriginalFilename() == null ? "cv.pdf" : cv.getOriginalFilename();
            String mime = cv.getMimeType() == null || cv.getMimeType().isBlank()
                    ? (name.toLowerCase(Locale.ROOT).endsWith(".pdf")
                    ? "application/pdf"
                    : "application/octet-stream")
                    : cv.getMimeType();
            return new StoredCvFile(storage.read(cv.getStorageKey()), name, mime);
        } catch (Exception ex) {
            log.error("Cannot read CV file {}", id, ex);
            throw new BusinessException("Cannot read CV file", HttpStatus.NOT_FOUND, "CV_FILE_MISSING");
        }
    }

    public record StoredCvFile(byte[] content, String filename, String mimeType) {}

    @Transactional
    public void delete(long id) {
        Cv cv = cvs.findById(id).orElseThrow(() -> notFound("CV not found", "CV_NOT_FOUND"));
        access.requireCv(cv);
        String storageKey = cv.getStorageKey();
        scores.deleteByCv_Id(id);
        cvSkills.deleteByCv_Id(id);
        analyses.deleteByCv_Id(id);
        extractions.deleteByCv_Id(id);
        documents.deleteByCv_Id(id);
        interviews.findByCv_Id(id).forEach(interview -> interview.setCv(null));
        rankingData.detachCv(id);
        cvs.delete(cv);
        try {
            storage.delete(storageKey);
        } catch (Exception ex) {
            log.warn("Could not delete stored CV file {}", storageKey, ex);
        }
    }

    @Transactional(readOnly = true)
    public CvDetail get(long id) {
        Cv cv = cvs.findById(id).orElseThrow(() -> notFound("CV not found", "CV_NOT_FOUND"));
        access.requireCv(cv);
        return toDetail(cv);
    }

    @Transactional(readOnly = true)
    public List<CvSummary> listByJob(long jobId) {
        Job job = jobs.findById(jobId).orElseThrow(() -> notFound("Job not found", "JOB_NOT_FOUND"));
        access.requireJob(job);
        return cvs.findByJob_IdOrderByIdDesc(jobId).stream()
                .map(cv -> mapper.summary(cv, scores.findByJob_IdAndCv_Id(jobId, cv.getId()).orElse(null)))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<CvSummary> mine() {
        User actor = access.actor();
        return cvs.findByUser_IdOrderByIdDesc(actor.getId()).stream()
                .map(cv -> mapper.summary(cv, null))
                .toList();
    }

    @Transactional(readOnly = true)
    public MatchView match(long jobId, long cvId) {
        Cv cv = cvs.findById(cvId).orElseThrow(() -> notFound("CV not found", "CV_NOT_FOUND"));
        if (cv.getJob() == null || !cv.getJob().getId().equals(jobId)) throw notFound("CV not found", "CV_NOT_FOUND");
        access.requireJob(cv.getJob());
        var score = scores.findByJob_IdAndCv_Id(jobId, cvId)
                .orElseThrow(() -> notFound("Match score not found", "MATCH_NOT_FOUND"));
        return mapper.detail(cv, null, List.of(), null, score, true).match();
    }

    @Transactional
    public CvDetail processNow(long id) {
        Cv cv = cvs.findById(id).orElseThrow(() -> notFound("CV not found", "CV_NOT_FOUND"));
        access.requireCv(cv);
        pipeline.processInline(id);
        return toDetail(cvs.findById(id).orElseThrow(() -> notFound("CV not found", "CV_NOT_FOUND")));
    }

    @Transactional
    public void enqueueParse(long id) {
        enqueue(id, CvStatus.UPLOADED, CvStatus.FAILED, () -> publisherOrInline(id));
    }

    @Transactional
    public void enqueueExtract(long id) {
        enqueue(id, CvStatus.PARSED, CvStatus.FAILED, () -> publisher.publishExtract(id));
    }

    @Transactional
    public void enqueueAnalyze(long id) {
        enqueue(id, CvStatus.EXTRACTING, CvStatus.FAILED, () -> publisher.publishAnalysis(id));
    }

    @Transactional
    public MatchView recomputeMatch(long jobId, long cvId) {
        Cv cv = cvs.findById(cvId).orElseThrow(() -> notFound("CV not found", "CV_NOT_FOUND"));
        if (cv.getJob() == null || !cv.getJob().getId().equals(jobId)) throw notFound("CV not found", "CV_NOT_FOUND");
        access.requireJob(cv.getJob());
        if (cv.getStatus() != CvStatus.ANALYZED) {
            throw new BusinessException("CV is not analyzed yet", HttpStatus.CONFLICT, "CV_NOT_ANALYZED");
        }
        var score = matching.score(cv);
        return mapper.detail(cv, null, List.of(), null, score, true).match();
    }

    private void enqueue(long id, CvStatus expected, CvStatus retry, Runnable publish) {
        Cv cv = cvs.findById(id).orElseThrow(() -> notFound("CV not found", "CV_NOT_FOUND"));
        access.requireCv(cv);
        if (cv.getStatus() != expected && cv.getStatus() != retry && cv.getStatus() != CvStatus.ANALYZED) {
            throw new BusinessException("CV is not ready for this step", HttpStatus.CONFLICT, "CV_BAD_STATE");
        }
        publish.run();
    }

    private void publisherOrInline(long cvId) {
        Runnable run = () -> {
            try {
                publisher.publishParse(cvId);
            } catch (Exception ex) {
                log.warn("RabbitMQ unavailable, processing CV {} inline", cvId);
                try {
                    pipeline.processInline(cvId);
                } catch (Exception inline) {
                    log.error("Inline CV pipeline failed for {}", cvId, inline);
                }
            }
        };
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCommit() {
                    run.run();
                }
            });
            return;
        }
        run.run();
    }

    private CvDetail toDetail(Cv cv) {
        boolean includeMatch = access.staff();
        return mapper.detail(
                cv,
                extractions.findByCv_Id(cv.getId()).orElse(null),
                cvSkills.findByCv_Id(cv.getId()),
                analyses.findByCv_Id(cv.getId()).orElse(null),
                includeMatch && cv.getJob() != null ? scores.findByJob_IdAndCv_Id(cv.getJob().getId(), cv.getId()).orElse(null) : null,
                includeMatch);
    }

    private User owner(User actor, String candidateEmail) {
        if (candidateEmail == null || candidateEmail.isBlank() || candidateEmail.equalsIgnoreCase(actor.getEmail())) {
            return actor;
        }
        if (!access.staff()) {
            throw new BusinessException("Cannot upload for another user", HttpStatus.FORBIDDEN, "CV_FORBIDDEN");
        }
        return users.findByEmailIgnoreCase(candidateEmail.trim())
                .orElseThrow(() -> notFound("Candidate not found", "USER_NOT_FOUND"));
    }

    private Application resolveApplication(Job job, User owner, Long applicationId) {
        if (applicationId != null) {
            Application application = applications.findByIdAndJob_Id(applicationId, job.getId())
                    .orElseThrow(() -> notFound("Application not found", "APPLICATION_NOT_FOUND"));
            if (!application.getCandidate().getId().equals(owner.getId())) {
                throw new BusinessException("Application does not belong to candidate", HttpStatus.BAD_REQUEST, "APPLICATION_MISMATCH");
            }
            return application;
        }
        return applications.findByJob_IdAndCandidate_Id(job.getId(), owner.getId()).orElse(null);
    }

    private void validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("CV file is required", HttpStatus.BAD_REQUEST, "CV_FILE_REQUIRED");
        }
        if (file.getSize() > maxBytes) {
            throw new BusinessException("CV exceeds size limit", HttpStatus.BAD_REQUEST, "CV_TOO_LARGE");
        }
        String mime = file.getContentType() == null ? "" : file.getContentType().toLowerCase(Locale.ROOT);
        String name = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase(Locale.ROOT);
        boolean allowed = ALLOWED_MIME.contains(mime)
                || name.endsWith(".pdf")
                || name.endsWith(".doc")
                || name.endsWith(".docx");
        if (!allowed) throw new BusinessException("Only PDF, DOC, and DOCX are allowed", HttpStatus.BAD_REQUEST, "CV_TYPE_REJECTED");
    }

    private static String safeName(String original) {
        String name = original == null || original.isBlank() ? "cv.pdf" : original.replaceAll("[\\\\/]+", "_");
        return name.length() > 200 ? name.substring(name.length() - 200) : name;
    }

    private static String sha256(byte[] bytes) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes));
        } catch (Exception ex) {
            return HexFormat.of().formatHex(Integer.toHexString(bytes.length).getBytes(StandardCharsets.UTF_8));
        }
    }

    private static BusinessException notFound(String message, String code) {
        return new BusinessException(message, HttpStatus.NOT_FOUND, code);
    }
}
