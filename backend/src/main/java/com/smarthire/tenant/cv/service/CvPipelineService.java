package com.smarthire.tenant.cv.service;

import com.smarthire.common.redis.RedisKeys;
import com.smarthire.common.redis.RedisService;
import com.smarthire.common.storage.FileStorageService;
import com.smarthire.domain.enums.CvStatus;
import com.smarthire.domain.tenant.entity.Cv;
import com.smarthire.domain.tenant.entity.CvDocument;
import com.smarthire.domain.tenant.entity.CvExtraction;
import com.smarthire.domain.tenant.entity.JobSkill;
import com.smarthire.domain.tenant.repository.CvDocumentRepository;
import com.smarthire.domain.tenant.repository.CvExtractionRepository;
import com.smarthire.domain.tenant.repository.CvRepository;
import com.smarthire.domain.tenant.repository.JobSkillRepository;
import com.smarthire.messaging.JobPublisher;
import com.smarthire.tenant.applicant.service.ApplicantService;
import com.smarthire.tenant.job.screening.GateScreeningService;
import com.smarthire.tenant.cv.ai.CvAiClient;
import com.smarthire.tenant.cv.parse.CvDocumentParser;
import java.time.Duration;
import java.util.stream.Collectors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CvPipelineService {
    private static final Logger log = LoggerFactory.getLogger(CvPipelineService.class);
    private final CvRepository cvs;
    private final CvDocumentRepository documents;
    private final CvExtractionRepository extractions;
    private final FileStorageService storage;
    private final CvDocumentParser parser;
    private final CvAiClient ai;
    private final CvSkillAnalysisService analysis;
    private final CvMatchingService matching;
    private final ApplicantService applicants;
    private final GateScreeningService gateScreening;
    private final JobPublisher publisher;
    private final RedisService redis;
    private final JobSkillRepository jobSkills;
    private final com.smarthire.multitenancy.quota.TenantQuotaRedisService quotaService;

    public CvPipelineService(
            CvRepository cvs,
            CvDocumentRepository documents,
            CvExtractionRepository extractions,
            FileStorageService storage,
            CvDocumentParser parser,
            CvAiClient ai,
            CvSkillAnalysisService analysis,
            CvMatchingService matching,
            ApplicantService applicants,
            GateScreeningService gateScreening,
            JobPublisher publisher,
            RedisService redis,
            JobSkillRepository jobSkills,
            com.smarthire.multitenancy.quota.TenantQuotaRedisService quotaService) {
        this.cvs = cvs;
        this.documents = documents;
        this.extractions = extractions;
        this.storage = storage;
        this.parser = parser;
        this.ai = ai;
        this.analysis = analysis;
        this.matching = matching;
        this.applicants = applicants;
        this.gateScreening = gateScreening;
        this.publisher = publisher;
        this.redis = redis;
        this.jobSkills = jobSkills;
        this.quotaService = quotaService;
    }

    /** Used when RabbitMQ is down so recruiters can still screen a CV locally. */
    @Transactional
    public void processInline(long cvId) {
        if (!parse(cvId, false)) return;
        if (!extract(cvId, false)) return;
        if (!analyze(cvId, false)) return;
        match(cvId, false);
    }

    @Transactional
    public void parse(long cvId) {
        parse(cvId, true);
    }

    @Transactional
    public boolean parse(long cvId, boolean enqueue) {
        if (!lock(cvId)) return false;
        Cv cv = require(cvId);
        try {
            cv.mark(CvStatus.PARSING);
            byte[] bytes = storage.read(cv.getStorageKey());
            var parsed = parser.parse(bytes, cv.getOriginalFilename(), cv.getMimeType());
            CvDocument document = documents.findByCv_Id(cvId).orElseGet(CvDocument::new);
            document.setCv(cv);
            document.setRawText(parsed.text());
            document.setPageCount(parsed.pageCount());
            document.setParserVersion(CvDocumentParser.VERSION);
            document.setOcrUsed(parsed.likelyScan());
            documents.save(document);
            cv.mark(CvStatus.PARSED);
            cvs.save(cv);
            if (enqueue) publisher.publishExtract(cvId);
            return true;
        } catch (Exception ex) {
            fail(cv, "PARSE_FAILED", ex, enqueue);
            return false;
        } finally {
            unlock(cvId);
        }
    }

    @Transactional
    public void extract(long cvId) {
        extract(cvId, true);
    }

    @Transactional
    public boolean extract(long cvId, boolean enqueue) {
        if (!lock(cvId)) return false;
        Cv cv = require(cvId);
        try {
            CvDocument document = documents.findByCv_Id(cvId)
                    .orElseThrow(() -> new IllegalStateException("CV document missing"));
            cv.mark(CvStatus.EXTRACTING);
            String json = ai.extractJson(document.getRawText(), jobContext(cv));
            CvExtraction extraction = extractions.findByCv_Id(cvId).orElseGet(CvExtraction::new);
            extraction.setCv(cv);
            extraction.setExtractionJson(json);
            extraction.setModelVersion(ai.modelVersionFor(json));
            extraction.setPromptVersion(ai.promptVersionFor(json));
            extractions.save(extraction);
            cvs.save(cv);
            if (enqueue) publisher.publishAnalysis(cvId);
            return true;
        } catch (Exception ex) {
            fail(cv, "EXTRACT_FAILED", ex, enqueue);
            return false;
        } finally {
            unlock(cvId);
        }
    }

    @Transactional
    public void analyze(long cvId) {
        analyze(cvId, true);
    }

    @Transactional
    public boolean analyze(long cvId, boolean enqueue) {
        if (!lock(cvId)) return false;
        Cv cv = require(cvId);
        try {
            cv.mark(CvStatus.ANALYZING);
            String json = extractions.findByCv_Id(cvId)
                    .orElseThrow(() -> new IllegalStateException("CV extraction missing"))
                    .getExtractionJson();
            analysis.analyze(cv, json);
            cv.mark(CvStatus.ANALYZED);
            cvs.save(cv);
            if (enqueue) publisher.publishMatching(cvId);
            return true;
        } catch (Exception ex) {
            fail(cv, "ANALYZE_FAILED", ex, enqueue);
            return false;
        } finally {
            unlock(cvId);
        }
    }

    @Transactional
    public void match(long cvId) {
        match(cvId, true);
    }

    @Transactional
    public boolean match(long cvId, boolean enqueue) {
        if (!lock(cvId)) return false;
        try {
            Cv cv = require(cvId);
            if (cv.getJob() == null) return true;
            var score = matching.score(cv);
            applicants.advanceFromCvScreening(cv, score);
            if (cv.getApplication() != null) {
                gateScreening.recalculate(cv.getApplication());
            }
            return true;
        } catch (Exception ex) {
            fail(require(cvId), "MATCH_FAILED", ex, enqueue);
            return false;
        } finally {
            unlock(cvId);
        }
    }

    private String jobContext(Cv cv) {
        var job = cv.getJob();
        if (job == null) return "Personal CV (no job context)";
        String skills = jobSkills.findByJob_IdOrderByIdAsc(job.getId()).stream()
                .filter(js -> js.getSkill() != null && js.getSkill().getName() != null)
                .map(js -> js.getSkill().getName() + (js.isRequired() ? " (required)" : ""))
                .collect(Collectors.joining(", "));
        String description = job.getDescription() == null ? "" : job.getDescription();
        if (description.length() > 1500) description = description.substring(0, 1500);
        return "Title: " + nullToEmpty(job.getTitle())
                + "\nSkills: " + skills
                + "\nEducation: " + nullToEmpty(job.getEducationLevel())
                + "\nMin years: " + (job.getMinYearsExperience() == null ? "" : job.getMinYearsExperience())
                + "\nDescription: " + description;
    }

    private static String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    private void fail(Cv cv, String code, Exception ex, boolean enqueue) {
        cv.fail(code, ex.getMessage());
        cvs.save(cv);
        
        try {
            String tenantCode = com.smarthire.multitenancy.context.TenantContext.getCurrentTenant();
            if (tenantCode != null) {
                quotaService.rollbackQuota(tenantCode, com.smarthire.multitenancy.quota.QuotaType.CV_PARSE, 1);
            }
        } catch (Exception rollbackEx) {
            log.error("Failed to rollback quota for CV {}", cv.getId(), rollbackEx);
        }

        if (enqueue) throw new IllegalStateException(ex);
        log.error("CV {} failed at {}", cv.getId(), code, ex);
    }

    private boolean lock(long cvId) {
        try {
            if (redis.setIfAbsent(RedisKeys.cvAnalyzeLock(cvId), "1", Duration.ofSeconds(120))) return true;
            log.info("Skip CV {} — already processing", cvId);
            return false;
        } catch (Exception ex) {
            log.warn("Redis lock unavailable for CV {}, continue without lock", cvId);
            return true;
        }
    }

    private void unlock(long cvId) {
        try {
            redis.delete(RedisKeys.cvAnalyzeLock(cvId));
        } catch (Exception ex) {
            log.warn("Redis unlock failed for CV {}", cvId);
        }
    }

    private Cv require(long cvId) {
        return cvs.findById(cvId).orElseThrow(() -> new IllegalStateException("CV not found: " + cvId));
    }
}
