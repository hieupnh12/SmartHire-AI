package com.smarthire.tenant.cv.github;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.smarthire.common.redis.RedisKeys;
import com.smarthire.common.redis.RedisService;
import com.smarthire.domain.enums.GithubAnalysisStatus;
import com.smarthire.domain.tenant.entity.Cv;
import com.smarthire.domain.tenant.entity.GithubAnalysis;
import com.smarthire.domain.tenant.entity.GithubRepoCache;
import com.smarthire.domain.tenant.entity.Job;
import com.smarthire.domain.tenant.entity.JobSkill;
import com.smarthire.domain.tenant.repository.CvDocumentRepository;
import com.smarthire.domain.tenant.repository.CvExtractionRepository;
import com.smarthire.domain.tenant.repository.CvRepository;
import com.smarthire.domain.tenant.repository.GithubAnalysisRepository;
import com.smarthire.domain.tenant.repository.GithubRepoCacheRepository;
import com.smarthire.domain.tenant.repository.JobSkillRepository;
import com.smarthire.tenant.cv.github.GithubApiClient.RepoSnapshot;
import com.smarthire.tenant.cv.github.GithubApiClient.TreeItem;
import com.smarthire.tenant.cv.github.GithubEvidenceReport.Report;
import com.smarthire.tenant.cv.github.GithubEvidenceReport.Skill;
import com.smarthire.tenant.cv.github.GithubEvidenceReport.SkillNeed;
import com.smarthire.tenant.cv.github.GithubFileSelector.SelectedFile;
import com.smarthire.tenant.cv.github.GithubFileSelector.Selection;
import com.smarthire.tenant.cv.github.GithubFileSelector.Signals;
import com.smarthire.tenant.cv.github.GithubFileSelector.TreeFile;
import com.smarthire.tenant.cv.github.GithubIncrementalPlan.Mode;
import com.smarthire.tenant.cv.github.GithubUrls.GithubRef;
import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class GithubAnalysisService {
    private static final Logger log = LoggerFactory.getLogger(GithubAnalysisService.class);
    private static final String NOTE =
            "Điểm GitHub chỉ là bằng chứng kỹ thuật nhìn thấy trong các file đã chọn. "
                    + "Hệ thống không kết luận ứng viên viết toàn bộ code và không giảm điểm CV khi không có GitHub.";

    private final CvRepository cvs;
    private final CvDocumentRepository documents;
    private final CvExtractionRepository extractions;
    private final JobSkillRepository jobSkills;
    private final GithubAnalysisRepository analyses;
    private final GithubRepoCacheRepository caches;
    private final GithubApiClient github;
    private final GithubCodeAdvisor advisor;
    private final RedisService redis;
    private final ObjectMapper mapper;
    private final GithubAnalysisSettings settings;

    public GithubAnalysisService(
            CvRepository cvs,
            CvDocumentRepository documents,
            CvExtractionRepository extractions,
            JobSkillRepository jobSkills,
            GithubAnalysisRepository analyses,
            GithubRepoCacheRepository caches,
            GithubApiClient github,
            GithubCodeAdvisor advisor,
            RedisService redis,
            ObjectMapper mapper,
            GithubAnalysisSettings settings) {
        this.cvs = cvs;
        this.documents = documents;
        this.extractions = extractions;
        this.jobSkills = jobSkills;
        this.analyses = analyses;
        this.caches = caches;
        this.github = github;
        this.advisor = advisor;
        this.redis = redis;
        this.mapper = mapper;
        this.settings = settings;
    }

    /** Failure here must not change CV screening. */
    public void analyzeSafely(long cvId) {
        try {
            analyze(cvId);
        } catch (RuntimeException ex) {
            log.warn("GitHub analysis left CV {} screening unchanged: {}", cvId, ex.toString());
        }
    }

    @Transactional
    public void analyze(long cvId) {
        if (!settings.enabled()) return;
        if (!lock(cvId)) return;
        long started = System.nanoTime();
        try {
            github.resetRequests();
            Cv cv = cvs.findById(cvId).orElse(null);
            if (cv == null || cv.getJob() == null) return;
            Job job = cv.getJob();
            List<SkillNeed> skills = skills(job);
            String raw = documents.findByCv_Id(cvId).map(doc -> doc.getRawText()).orElse("");
            String extraction = extractions.findByCv_Id(cvId).map(row -> row.getExtractionJson()).orElse("");
            GithubUrlExtractor.Found found = GithubUrlExtractor.extract(cv.getBuilderData(), raw, extraction);
            GithubAnalysis row = loadRow(cv, job);
            if (found.refs().isEmpty() && found.rejected().isEmpty()) {
                finish(row, GithubAnalysisStatus.NOT_PROVIDED, null, null, null, emptyResult(found.rejected(), List.of()), started, false, null);
                return;
            }
            if (found.refs().isEmpty()) {
                finish(row, GithubAnalysisStatus.FAILED, null, "INVALID_GITHUB_URL", "GitHub URL is not a public github.com profile or repository",
                        emptyResult(found.rejected(), List.of()), started, false, null);
                return;
            }
            if (skills.isEmpty()) {
                finish(row, GithubAnalysisStatus.PARTIAL, null, "INSUFFICIENT_EVIDENCE", "Job has no skills to check",
                        emptyResult(found.rejected(), List.of("Không có kỹ năng của JD để đối chiếu.")), started, false, null);
                return;
            }
            String description = job.getDescription() == null ? "" : job.getDescription();
            if (description.length() > 1500) description = description.substring(0, 1500);
            String fingerprint = GithubFingerprints.of(settings.strategyVersion(), settings.promptVersion(), advisor.modelKey(), skills);
            List<Piece> pieces = collect(found.refs(), skills, job.getTitle(), description, fingerprint);
            Aggregated aggregated = aggregate(pieces, found.rejected(), skills);
            finish(row, aggregated.status(), aggregated.score(), aggregated.errorCode(), aggregated.errorMessage(),
                    aggregated.json(), started, aggregated.cacheHit(), aggregated.model());
        } catch (RuntimeException ex) {
            log.warn("GitHub analysis failed for CV {}: {}", cvId, ex.toString());
            failUnexpected(cvId, ex);
        } finally {
            unlock(cvId);
        }
    }

    private List<Piece> collect(List<GithubRef> refs, List<SkillNeed> skills, String title, String description, String fingerprint) {
        int slots = settings.maxRepos();
        int budget = settings.maxPromptChars();
        List<String> tokens = GithubFileSelector.tokens(new Signals(names(skills, true), names(skills, false), title, description));
        List<Piece> pieces = new ArrayList<>();
        List<String> overflow = new ArrayList<>();
        for (GithubRef ref : refs) {
            if (slots <= 0) {
                overflow.add(ref.canonical());
                continue;
            }
            try {
                if (ref.kind() == GithubUrls.Kind.PROFILE) {
                    List<RepoSnapshot> picked = rank(github.listRepositories(ref.owner(), 10), tokens, slots);
                    if (picked.isEmpty()) {
                        pieces.add(Piece.failed(ref.canonical(), ref.canonical(), "GITHUB_404", "No public repository"));
                        slots--;
                        continue;
                    }
                    for (RepoSnapshot listed : picked) {
                        if (slots <= 0) break;
                        RepoSnapshot repo = github.repository(listed.owner(), listed.name());
                        Piece piece = inspect(repo, skills, title, description, fingerprint, budget);
                        budget -= piece.promptChars();
                        pieces.add(piece);
                        slots--;
                    }
                } else {
                    Piece piece = inspect(github.repository(ref.owner(), ref.repo()), skills, title, description, fingerprint, budget);
                    budget -= piece.promptChars();
                    pieces.add(piece);
                    slots--;
                }
            } catch (GithubApiException ex) {
                pieces.add(Piece.failed(ref.canonical(), ref.canonical(), ex.code(), ex.getMessage()));
                slots--;
            }
        }
        if (!overflow.isEmpty() && !pieces.isEmpty()) pieces.get(0).omitted().addAll(overflow);
        return pieces;
    }

    private Piece inspect(RepoSnapshot repo, List<SkillNeed> skills, String title, String description,
                          String fingerprint, int budget) {
        if (repo.privateRepo()) return Piece.failed(repo.fullName(), repo.htmlUrl(), "GITHUB_PRIVATE", "Private repository was not read");
        var exact = caches.findByRepoFullNameAndCommitShaAndSkillFingerprintAndStrategyVersion(
                repo.fullName(), repo.commitSha(), fingerprint, settings.strategyVersion());
        if (exact.isPresent()) return Piece.cached(repo, GithubEvidenceReport.readStored(mapper, exact.get().getResultJson()), "HIT", 0, 0);
        var previous = caches.findFirstByRepoFullNameAndSkillFingerprintAndStrategyVersionAndCommitShaNotOrderByIdDesc(
                repo.fullName(), fingerprint, settings.strategyVersion(), repo.commitSha());
        Mode mode = Mode.FULL;
        List<String> changed = List.of();
        if (previous.isPresent()) {
            try {
                changed = github.compare(repo.owner(), repo.name(), previous.get().getCommitSha(), repo.commitSha()).paths();
                mode = GithubIncrementalPlan.decide(paths(previous.get()), changed);
            } catch (GithubApiException ex) {
                mode = Mode.FULL;
            }
        }
        if (mode == Mode.REUSE && previous.isPresent()) {
            remember(repo, fingerprint, previous.get().getSelectedFilesJson(), previous.get().getResultJson(), previous.get().getModelVersion(), 0, 0);
            return Piece.cached(repo, GithubEvidenceReport.readStored(mapper, previous.get().getResultJson()), "INCREMENTAL", 0, 0);
        }
        var tree = github.tree(repo.owner(), repo.name(), repo.commitSha());
        Signals signals = new Signals(names(skills, true), names(skills, false), title, description);
        Selection selection = GithubFileSelector.select(signals, toFiles(tree.items()), settings.maxFiles(), settings.maxFileBytes(), settings.maxTotalBytes());
        List<SelectedFile> files = new ArrayList<>(selection.files());
        if (mode == Mode.PARTIAL) {
            List<String> changedPaths = changed;
            files.removeIf(file -> !changedPaths.contains(file.path()));
            if (files.isEmpty() && previous.isPresent()) {
                remember(repo, fingerprint, previous.get().getSelectedFilesJson(), previous.get().getResultJson(), previous.get().getModelVersion(), 0, 0);
                return Piece.cached(repo, GithubEvidenceReport.readStored(mapper, previous.get().getResultJson()), "INCREMENTAL", 0, 0);
            }
        }
        if (files.isEmpty()) return Piece.insufficient(repo, tree.truncated(), selection.skipped());
        if (budget < 2000) return Piece.budget(repo);
        String readme = "";
        try {
            readme = GithubText.cap(github.readme(repo.owner(), repo.name(), repo.commitSha()), Math.min(2000, settings.maxFileBytes()));
        } catch (GithubApiException ex) {
            if (ex.status() != 404) return Piece.failed(repo.fullName(), repo.htmlUrl(), ex.code(), ex.getMessage());
        }
        Map<String, String> bodies = new LinkedHashMap<>();
        Map<String, Boolean> manifests = new LinkedHashMap<>();
        int bytes = 0;
        List<String> omitted = new ArrayList<>();
        for (SelectedFile file : files) {
            if (bodies.size() >= settings.maxFiles() || bytes >= settings.maxTotalBytes()) {
                omitted.add(file.path());
                continue;
            }
            try {
                String text = GithubText.cap(github.fileText(repo.owner(), repo.name(), file.path(), repo.commitSha()), settings.maxFileBytes());
                if (text.isBlank()) continue;
                if (bytes + text.length() > settings.maxTotalBytes()) {
                    omitted.add(file.path());
                    continue;
                }
                bodies.put(file.path(), text);
                manifests.put(file.path(), file.manifest());
                bytes += text.length();
            } catch (GithubApiException ex) {
                if (ex.status() == 404) continue;
                return Piece.failed(repo.fullName(), repo.htmlUrl(), ex.code(), ex.getMessage());
            }
        }
        if (bodies.isEmpty() || bodies.keySet().stream().allMatch(path -> manifests.getOrDefault(path, false))) {
            return Piece.insufficient(repo, tree.truncated(), selection.skipped());
        }
        String prompt = prompt(title, description, skills, repo, readme, bodies, manifests);
        while (prompt.length() > budget && bodies.size() > 1) {
            String last = null;
            for (String path : bodies.keySet()) last = path;
            bodies.remove(last);
            manifests.remove(last);
            omitted.add(last);
            prompt = prompt(title, description, skills, repo, readme, bodies, manifests);
        }
        if (prompt.length() > budget) return Piece.budget(repo);
        GithubCodeAdvisor.Advice advice;
        try {
            advice = callModel(prompt);
        } catch (RuntimeException ex) {
            String code = GithubCodeAdvisor.quota(ex) ? "AI_QUOTA" : (ex.getMessage() != null && ex.getMessage().contains("JSON") ? "AI_INVALID_JSON" : "AI_UNAVAILABLE");
            return Piece.failed(repo.fullName(), repo.htmlUrl(), code, ex.getMessage());
        }
        Set<String> source = new LinkedHashSet<>();
        Set<String> manifest = new LinkedHashSet<>();
        manifests.forEach((path, isManifest) -> (isManifest ? manifest : source).add(path));
        Report report = GithubEvidenceReport.attribute(
                GithubEvidenceReport.parse(mapper, advice.json(), skills, source, manifest), repo.fullName());
        if (mode == Mode.PARTIAL && previous.isPresent()) {
            report = GithubEvidenceReport.merge(GithubEvidenceReport.readStored(mapper, previous.get().getResultJson()), report, new LinkedHashSet<>(changed));
            report = GithubEvidenceReport.attribute(report, repo.fullName());
        }
        String resultJson = GithubEvidenceReport.toJson(mapper, report).toString();
        remember(repo, fingerprint, selectedJson(bodies, manifests), resultJson, advice.model(), advice.promptTokens(), advice.completionTokens());
        return Piece.analyzed(repo, report, tree.truncated(), omitted, prompt.length(), advice, selection.skipped(), bodies.size());
    }

    private GithubCodeAdvisor.Advice callModel(String prompt) {
        try {
            return advisor.advise(GithubAnalysisPrompt.SYSTEM, prompt);
        } catch (RuntimeException ex) {
            if (GithubCodeAdvisor.quota(ex)) throw ex;
            return advisor.advise(GithubAnalysisPrompt.SYSTEM, prompt + "\nReturn one JSON object only.");
        }
    }

    private String prompt(String title, String description, List<SkillNeed> skills, RepoSnapshot repo, String readme,
                          Map<String, String> bodies, Map<String, Boolean> manifests) {
        return GithubAnalysisPrompt.user(settings.promptVersion(), title, description, names(skills, true), names(skills, false),
                repo.fullName(), repo.commitSha(), readme, bodies, manifests);
    }

    private Aggregated aggregate(List<Piece> pieces, List<String> rejected, List<SkillNeed> requested) {
        Map<String, Skill> skills = new LinkedHashMap<>();
        for (SkillNeed need : requested) {
            skills.put(need.name().toLowerCase(Locale.ROOT), new Skill(need.name(), need.required(), "UNVERIFIED", "LOW", null, List.of(), "Chưa đủ file nguồn để xác minh."));
        }
        List<String> strengths = new ArrayList<>();
        List<String> improvements = new ArrayList<>();
        List<String> unverified = new ArrayList<>();
        StringBuilder summary = new StringBuilder();
        String confidence = "LOW";
        String model = advisor.modelKey();
        boolean cacheHit = !pieces.isEmpty();
        boolean anyCompleted = false;
        boolean anyProblem = !rejected.isEmpty();
        String errorCode = null;
        String errorMessage = null;
        int promptTokens = 0;
        int completionTokens = 0;
        ObjectNode root = mapper.createObjectNode();
        ArrayNode repos = root.putArray("repositories");
        List<String> omitted = new ArrayList<>();
        int filesRead = 0;
        boolean truncated = false;
        for (Piece piece : pieces) {
            ObjectNode node = repos.addObject();
            node.put("fullName", piece.fullName());
            node.put("url", piece.url());
            node.put("commitSha", piece.sha());
            node.put("language", piece.language());
            node.put("description", piece.description());
            node.put("cache", piece.cache());
            node.put("status", piece.status());
            node.put("error", piece.error());
            if (!"HIT".equals(piece.cache()) && !"INCREMENTAL".equals(piece.cache())) cacheHit = false;
            if ("COMPLETED".equals(piece.status())) anyCompleted = true;
            if (!"COMPLETED".equals(piece.status())) anyProblem = true;
            if (piece.errorCode() != null && errorCode == null) {
                errorCode = piece.errorCode();
                errorMessage = piece.error();
            }
            truncated = truncated || piece.truncated();
            omitted.addAll(piece.omitted());
            filesRead += piece.filesRead();
            promptTokens += piece.promptTokens();
            completionTokens += piece.completionTokens();
            if (piece.model() != null) model = piece.model();
            if (piece.report() == null) continue;
            if (!piece.report().summary().isBlank()) summary.append(piece.report().summary()).append('\n');
            strengths.addAll(piece.report().strengths());
            improvements.addAll(piece.report().improvements());
            unverified.addAll(piece.report().unverified());
            confidence = lowerConfidence(confidence, piece.report().confidence());
            for (Skill skill : piece.report().skills()) {
                String key = skill.name().toLowerCase(Locale.ROOT);
                Skill prior = skills.get(key);
                if (prior == null || rank(skill.status()) > rank(prior.status())) skills.put(key, skill);
            }
        }
        List<Skill> skillList = new ArrayList<>(skills.values());
        BigDecimal score = GithubEvidenceReport.score(skillList);
        GithubAnalysisStatus status;
        if (!anyCompleted && pieces.stream().allMatch(piece -> "INSUFFICIENT".equals(piece.status()))) {
            status = GithubAnalysisStatus.PARTIAL;
            errorCode = "INSUFFICIENT_EVIDENCE";
            errorMessage = "Not enough related source files";
            score = null;
        } else if (anyCompleted && anyProblem) {
            status = GithubAnalysisStatus.PARTIAL;
        } else if (anyCompleted) {
            status = GithubAnalysisStatus.COMPLETED;
            errorCode = null;
            errorMessage = null;
        } else if (pieces.stream().anyMatch(piece -> "PARTIAL".equals(piece.status()) || "INSUFFICIENT".equals(piece.status())
                || "GITHUB_PRIVATE".equals(piece.errorCode()))) {
            status = GithubAnalysisStatus.PARTIAL;
            if (errorCode == null) errorCode = "INSUFFICIENT_EVIDENCE";
            if (skillList.stream().noneMatch(skill -> skill.quality() != null)) score = null;
        } else {
            status = GithubAnalysisStatus.FAILED;
            score = null;
        }
        if (status != GithubAnalysisStatus.COMPLETED && status != GithubAnalysisStatus.PARTIAL) score = null;
        if (status == GithubAnalysisStatus.PARTIAL && skillList.stream().noneMatch(skill -> skill.quality() != null)) score = null;
        Report report = new Report(skillList, strengths, improvements, unverified, summary.toString().trim(), confidence);
        ObjectNode body = GithubEvidenceReport.toJson(mapper, report);
        body.set("repositories", repos);
        body.set("rejectedUrls", strings(rejected));
        ObjectNode limits = body.putObject("limits");
        limits.put("filesRead", filesRead);
        limits.put("promptTokens", promptTokens);
        limits.put("completionTokens", completionTokens);
        limits.put("githubRequests", github.requestsMade());
        limits.put("truncated", truncated);
        limits.set("omitted", strings(omitted));
        body.set("notes", strings(List.of(NOTE)));
        boolean hit = cacheHit && anyCompleted && pieces.stream().allMatch(piece -> "HIT".equals(piece.cache()) || "INCREMENTAL".equals(piece.cache()));
        return new Aggregated(status, score, errorCode, errorMessage, body.toString(), hit, model);
    }

    private void remember(RepoSnapshot repo, String fingerprint, String selectedFiles, String result, String model,
                          long promptTokens, long completionTokens) {
        if (caches.findByRepoFullNameAndCommitShaAndSkillFingerprintAndStrategyVersion(
                repo.fullName(), repo.commitSha(), fingerprint, settings.strategyVersion()).isPresent()) {
            return;
        }
        GithubRepoCache cache = new GithubRepoCache();
        cache.setRepoFullName(repo.fullName());
        cache.setCommitSha(repo.commitSha());
        cache.setSkillFingerprint(fingerprint);
        cache.setStrategyVersion(settings.strategyVersion());
        cache.setModelVersion(model);
        cache.setSelectedFilesJson(selectedFiles);
        cache.setResultJson(result);
        cache.setPromptTokens((int) Math.min(Integer.MAX_VALUE, promptTokens));
        cache.setCompletionTokens((int) Math.min(Integer.MAX_VALUE, completionTokens));
        caches.save(cache);
    }

    private String selectedJson(Map<String, String> bodies, Map<String, Boolean> manifests) {
        ArrayNode files = mapper.createArrayNode();
        bodies.keySet().forEach(path -> {
            ObjectNode node = files.addObject();
            node.put("path", path);
            node.put("manifest", manifests.getOrDefault(path, false));
        });
        return files.toString();
    }

    private List<String> paths(GithubRepoCache cache) {
        List<String> paths = new ArrayList<>();
        try {
            for (var node : mapper.readTree(cache.getSelectedFilesJson())) paths.add(node.path("path").asText());
        } catch (Exception ex) {
            return List.of();
        }
        return paths;
    }

    private void finish(GithubAnalysis row, GithubAnalysisStatus status, BigDecimal score, String errorCode, String errorMessage,
                        String json, long started, boolean cacheHit, String model) {
        row.setStatus(status);
        row.setScore(score);
        row.setErrorCode(errorCode);
        row.setErrorMessage(clip(errorMessage));
        row.setResultJson(json);
        row.setStrategyVersion(settings.strategyVersion());
        row.setPromptVersion(settings.promptVersion());
        row.setModelVersion(model == null ? advisor.modelKey() : model);
        row.setPromptTokens(tokens(json, "promptTokens"));
        row.setCompletionTokens(tokens(json, "completionTokens"));
        row.setGithubRequests(github.requestsMade());
        row.setDurationMs((int) Math.min(Integer.MAX_VALUE, (System.nanoTime() - started) / 1_000_000L));
        row.setCacheHit(cacheHit);
        row.setAnalyzedAt(Instant.now());
        analyses.save(row);
        log.info("GitHub analysis CV {} status {} cacheHit {}", row.getCv().getId(), status, cacheHit);
    }

    private void failUnexpected(long cvId, Exception ex) {
        try {
            Cv cv = cvs.findById(cvId).orElse(null);
            if (cv == null || cv.getJob() == null) return;
            GithubAnalysis row = loadRow(cv, cv.getJob());
            finish(row, GithubAnalysisStatus.FAILED, null, "UNEXPECTED", ex.getMessage(), emptyResult(List.of(), List.of()), System.nanoTime(), false, null);
        } catch (RuntimeException nested) {
            log.warn("Could not store GitHub failure for CV {}", cvId);
        }
    }

    private GithubAnalysis loadRow(Cv cv, Job job) {
        GithubAnalysis row = analyses.findByCv_IdAndJob_Id(cv.getId(), job.getId()).orElseGet(GithubAnalysis::new);
        row.setCv(cv);
        row.setJob(job);
        row.setStatus(GithubAnalysisStatus.PROCESSING);
        row.setStrategyVersion(settings.strategyVersion());
        row.setPromptVersion(settings.promptVersion());
        return analyses.save(row);
    }

    private List<SkillNeed> skills(Job job) {
        List<SkillNeed> skills = new ArrayList<>();
        for (JobSkill row : jobSkills.findByJob_IdOrderByIdAsc(job.getId())) {
            if (row.getSkill() == null || row.getSkill().getName() == null || row.getSkill().getName().isBlank()) continue;
            skills.add(new SkillNeed(row.getSkill().getName().trim(), row.isRequired()));
        }
        return skills;
    }

    private static List<RepoSnapshot> rank(List<RepoSnapshot> repos, List<String> tokens, int slots) {
        record Scored(RepoSnapshot repo, int score) {}
        List<Scored> scored = new ArrayList<>();
        for (RepoSnapshot repo : repos) {
            if (repo.privateRepo() || repo.archived()) continue;
            String hay = ((repo.language() == null ? "" : repo.language()) + " "
                    + (repo.description() == null ? "" : repo.description()) + " " + repo.fullName()).toLowerCase(Locale.ROOT);
            int score = 0;
            for (String token : tokens) if (hay.contains(token)) score += 3;
            if (repo.fork()) score -= 2;
            scored.add(new Scored(repo, score));
        }
        scored.sort(Comparator.comparingInt(Scored::score).reversed());
        boolean positive = scored.stream().anyMatch(item -> item.score() > 0);
        List<RepoSnapshot> picked = new ArrayList<>();
        for (Scored item : scored) {
            if (picked.size() >= slots) break;
            if (positive && item.score() <= 0) continue;
            if (!positive && !picked.isEmpty()) break;
            picked.add(item.repo());
        }
        return picked;
    }

    private static List<TreeFile> toFiles(List<TreeItem> items) {
        List<TreeFile> files = new ArrayList<>();
        for (TreeItem item : items) files.add(new TreeFile(item.path(), item.sha(), item.size()));
        return files;
    }

    private static List<String> names(List<SkillNeed> skills, boolean required) {
        List<String> names = new ArrayList<>();
        for (SkillNeed skill : skills) if (skill.required() == required) names.add(skill.name());
        return names;
    }

    private String emptyResult(List<String> rejected, List<String> omitted) {
        ObjectNode root = mapper.createObjectNode();
        root.put("summary", "");
        root.put("confidence", "LOW");
        root.putArray("skills");
        root.putArray("strengths");
        root.putArray("improvements");
        root.putArray("unverified");
        root.putArray("repositories");
        root.set("rejectedUrls", strings(rejected));
        ObjectNode limits = root.putObject("limits");
        limits.put("filesRead", 0);
        limits.put("githubRequests", github.requestsMade());
        limits.put("truncated", false);
        limits.set("omitted", strings(omitted));
        root.set("notes", strings(List.of(NOTE)));
        return root.toString();
    }

    private ArrayNode strings(List<String> values) {
        ArrayNode array = mapper.createArrayNode();
        for (String value : values) if (value != null && !value.isBlank()) array.add(value);
        return array;
    }

    private int tokens(String json, String field) {
        try {
            return mapper.readTree(json).path("limits").path(field).asInt(0);
        } catch (Exception ex) {
            return 0;
        }
    }

    private boolean lock(long cvId) {
        try {
            if (redis.setIfAbsent(RedisKeys.githubAnalyzeLock(cvId), "1", Duration.ofSeconds(180))) return true;
            log.info("Skip GitHub analysis for CV {} because it is already running", cvId);
            return false;
        } catch (RuntimeException ex) {
            log.warn("Redis lock unavailable for GitHub analysis of CV {}", cvId);
            return true;
        }
    }

    private void unlock(long cvId) {
        try {
            redis.delete(RedisKeys.githubAnalyzeLock(cvId));
        } catch (RuntimeException ex) {
            log.warn("Redis unlock failed for GitHub analysis of CV {}", cvId);
        }
    }

    private static String clip(String value) {
        if (value == null) return null;
        String clean = value.replaceAll("[\\p{Cntrl}]", " ").trim();
        return clean.length() <= 512 ? clean : clean.substring(0, 512);
    }

    private static int rank(String status) {
        return switch (status) {
            case "VERIFIED" -> 3;
            case "PARTIAL" -> 2;
            default -> 1;
        };
    }

    private static String lowerConfidence(String current, String next) {
        if ("LOW".equals(current) || "LOW".equals(next)) return "LOW";
        if ("MEDIUM".equals(current) || "MEDIUM".equals(next)) return "MEDIUM";
        return "HIGH";
    }

    private record Aggregated(GithubAnalysisStatus status, BigDecimal score, String errorCode, String errorMessage,
                              String json, boolean cacheHit, String model) {}

    private record Piece(String fullName, String url, String sha, String language, String description, String cache,
                         String status, String errorCode, String error, Report report, boolean truncated,
                         List<String> omitted, int promptChars, int filesRead, int promptTokens, int completionTokens,
                         String model) {
        static Piece failed(String name, String url, String code, String error) {
            return new Piece(name, url, "", "", "", "NONE", "FAILED", code, error, null, false, new ArrayList<>(), 0, 0, 0, 0, null);
        }

        static Piece insufficient(RepoSnapshot repo, boolean truncated, int skipped) {
            List<String> omitted = new ArrayList<>();
            if (skipped > 0) omitted.add("Bỏ " + skipped + " file không liên quan hoặc vượt giới hạn.");
            return new Piece(repo.fullName(), repo.htmlUrl(), repo.commitSha(), repo.language(), repo.description(),
                    "NONE", "INSUFFICIENT", "INSUFFICIENT_EVIDENCE", "Not enough related source files", null, truncated, omitted, 0, 0, 0, 0, null);
        }

        static Piece budget(RepoSnapshot repo) {
            return new Piece(repo.fullName(), repo.htmlUrl(), repo.commitSha(), repo.language(), repo.description(),
                    "NONE", "PARTIAL", "TOKEN_BUDGET", "Đã chạm ngân sách token", null, false,
                    new ArrayList<>(List.of("token budget")), 0, 0, 0, 0, null);
        }

        static Piece cached(RepoSnapshot repo, Report report, String cache, int promptTokens, int completionTokens) {
            return new Piece(repo.fullName(), repo.htmlUrl(), repo.commitSha(), repo.language(), repo.description(),
                    cache, "COMPLETED", null, null, report, false, new ArrayList<>(), 0, 0, promptTokens, completionTokens, null);
        }

        static Piece analyzed(RepoSnapshot repo, Report report, boolean truncated, List<String> omitted, int promptChars,
                              GithubCodeAdvisor.Advice advice, int skipped, int filesRead) {
            if (skipped > 0) omitted.add("Bỏ " + skipped + " file không liên quan hoặc vượt giới hạn.");
            boolean verified = report.skills().stream().anyMatch(skill -> "VERIFIED".equals(skill.status()) || "PARTIAL".equals(skill.status()));
            return new Piece(repo.fullName(), repo.htmlUrl(), repo.commitSha(), repo.language(), repo.description(),
                    "MISS", verified ? "COMPLETED" : "PARTIAL", verified ? null : "INSUFFICIENT_EVIDENCE",
                    verified ? null : "Model found no source evidence", report, truncated, omitted, promptChars, filesRead,
                    (int) advice.promptTokens(), (int) advice.completionTokens(), advice.model());
        }
    }
}
