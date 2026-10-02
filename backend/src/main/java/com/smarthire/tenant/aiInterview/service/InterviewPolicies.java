package com.smarthire.tenant.aiInterview.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.tenant.entity.AiInterview;
import com.smarthire.domain.tenant.entity.Job;
import com.smarthire.tenant.aiInterview.dto.request.AiInterviewConfigRequest;
import com.smarthire.tenant.aiInterview.dto.request.InterviewPolicy;
import java.time.Instant;
import java.util.*;
import org.springframework.http.HttpStatus;

/** Versioned configuration is stored as a complete snapshot on each new attempt. */
public final class InterviewPolicies {
    public static final List<String> COMPETENCIES = List.of("TECHNICAL_KNOWLEDGE", "PROBLEM_SOLVING",
            "PRACTICAL_EXPERIENCE", "COMMUNICATION", "BEHAVIORAL_SITUATIONAL");
    private static final ObjectMapper JSON = new ObjectMapper().findAndRegisterModules()
            .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES);
    private InterviewPolicies() {}

    public static String json(Object value) {
        try { return JSON.writeValueAsString(value); }
        catch (Exception ex) { throw invalidData("serialize", ex); }
    }
    public static <T> T read(String value, Class<T> type) {
        try { return JSON.readValue(value, type); }
        catch (Exception ex) { throw invalidData("deserialize " + type.getSimpleName(), ex); }
    }
    public static JsonNode tree(String value) { return value == null ? null : read(value, JsonNode.class); }
    public static InterviewPolicy defaults() {
        return new InterviewPolicy(30, 1, true, 3, 30, 0,
                Map.of(COMPETENCIES.get(0), 35, COMPETENCIES.get(1), 25, COMPETENCIES.get(2), 20,
                        COMPETENCIES.get(3), 10, COMPETENCIES.get(4), 10), List.of(), List.of());
    }
    public static AiInterviewConfigRequest config(Job job) {
        var policy = communicationPolicy(job.getAiInterviewPolicyJson() == null ? defaults() : read(job.getAiInterviewPolicyJson(), InterviewPolicy.class));
        int count = policy.processes().stream().filter(InterviewPolicy.Process::enabled).mapToInt(process -> InterviewProcessSettings.questionCount(process.config())).sum();
        return new AiInterviewConfigRequest(job.isAiInterviewEnabled(), job.getAiInterviewPassingScore(),
                count, job.getAiInterviewAvailableFrom(), job.getAiInterviewAvailableUntil(),
                policy);
    }
    public static InterviewPolicy communicationPolicy(InterviewPolicy source) {
        var communication = source.processes() == null ? null : source.processes().stream()
                .filter(process -> "COMMUNICATION".equals(process.key())).findFirst().orElse(null);
        var settings = InterviewProcessSettings.config(communication == null
                ? new InterviewPolicy.Process("COMMUNICATION", true, 1, 100, Map.of("questionCount", 3)) : communication);
        var processes = new ArrayList<InterviewPolicy.Process>();
        if (source.processes() != null) source.processes().stream().filter(process -> !"COMMUNICATION".equals(process.key()))
                .forEach(process -> processes.add(new InterviewPolicy.Process(process.key(), false, processes.size() + 1, 0, process.config())));
        processes.add(new InterviewPolicy.Process("COMMUNICATION", true, processes.size() + 1, 100, settings));
        return new InterviewPolicy(source.durationMinutes(), source.maxAttempts(), false, 3, 0, 0,
                communicationWeights(), source.selectedSkills(), List.of(), 2,
                "speech".equals(settings.get("responseMode")) ? "VOICE" : "TEXT", source.review(),
                new InterviewPolicy.Voice("speech".equals(settings.get("responseMode")), settings.get("language").toString(),
                        InterviewProcessSettings.bool(settings, "recordAudio", true), true, true, false), processes);
    }
    public static Map<String, Integer> communicationWeights() {
        var weights = new LinkedHashMap<String, Integer>();
        COMPETENCIES.forEach(key -> weights.put(key, "COMMUNICATION".equals(key) ? 100 : 0));
        return weights;
    }
    public static boolean communicationOnly(InterviewPolicy policy) {
        return isV2(policy) && !policy.miniAssessmentEnabled()
                && policy.processes().stream().filter(InterviewPolicy.Process::enabled).allMatch(process -> "COMMUNICATION".equals(process.key()))
                && policy.processes().stream().anyMatch(process -> process.enabled() && "COMMUNICATION".equals(process.key()));
    }
    public static void requireCommunicationOnly(InterviewPolicy policy) {
        if (!communicationOnly(policy)) {
            throw new BusinessException("Chỉ Communication đang hoạt động. Các quy trình khác sẽ được phát triển trong tương lai; hãy tạo phiên Communication mới.",
                    HttpStatus.CONFLICT, "AI_INTERVIEW_PROCESS_UNAVAILABLE");
        }
    }
    public static void requireCommunicationOnly(AiInterview interview) {
        requireCommunicationOnly(interview.getConfigSnapshotJson() == null ? null : config(interview).policy());
    }
    public static AiInterviewConfigRequest config(AiInterview interview) {
        return interview.getConfigSnapshotJson() == null ? config(interview.getApplication().getJob())
                : read(interview.getConfigSnapshotJson(), AiInterviewConfigRequest.class);
    }
    public static void snapshot(AiInterview interview) {
        if (interview.getConfigSnapshotJson() == null) {
            var config = config(interview.getApplication().getJob());
            interview.setConfigSnapshotJson(json(config));
            interview.setPassingScoreSnapshot(config.passingScore());
        }
    }
    public static boolean canRetry(AiInterview interview, Instant now) {
        if (interview.getConfigSnapshotJson() == null || interview.getStatus() != com.smarthire.domain.enums.AiInterviewStatus.FAILED) return false;
        var c = config(interview);
        return interview.getAttemptNumber() < c.policy().maxAttempts()
                && (c.availableUntil() == null || now.isBefore(c.availableUntil()));
    }
    public static boolean expired(AiInterview interview) {
        return interview.getExpiresAt() != null && !Instant.now().isBefore(interview.getExpiresAt());
    }
    public static boolean isV2(AiInterview interview) { return interview.getConfigSnapshotJson() != null && isV2(config(interview).policy()); }
    public static boolean isV2(InterviewPolicy policy) {
        return policy != null && policy.schemaVersion() != null && policy.schemaVersion() >= 2
                && policy.processes() != null && !policy.processes().isEmpty();
    }
    public static boolean voiceEnabled(AiInterview interview) {
        var voice = config(interview).policy().voice();
        return voice != null && voice.enabled();
    }
    public static void validate(AiInterviewConfigRequest c, Set<String> jobSkills, boolean requireRoadmap) {
        var p = c.policy();
        if (p == null || p.weights() == null || !p.weights().keySet().equals(new HashSet<>(COMPETENCIES))
                || p.weights().values().stream().anyMatch(w -> w == null || w < 0 || w > 100)
                || p.weights().values().stream().mapToInt(Integer::intValue).sum() != 100) fail("Tổng trọng số phải bằng 100%.");
        if (p.selectedSkills() == null || new HashSet<>(p.selectedSkills()).size() != p.selectedSkills().size()
                || !jobSkills.containsAll(p.selectedSkills())) fail("Chỉ chọn kỹ năng thuộc Job.");
        if (isV2(p)) {
            validateV2(p, jobSkills);
            int total = p.processes().stream().filter(InterviewPolicy.Process::enabled).mapToInt(process -> InterviewProcessSettings.questionCount(process.config())).sum();
            if (total < 1 || total > 30 || total != c.questionCount()) fail("Tổng câu hỏi chính của các bài tập bật phải bằng số câu chung (1–30).");
            if (p.processes().stream().filter(InterviewPolicy.Process::enabled).noneMatch(process -> p.weights().getOrDefault(InterviewProcessSettings.competency(process.key()), 0) > 0))
                fail("Cần ít nhất một bài tập bật có trọng số năng lực lớn hơn 0%.");
            return;
        }
        if (p.miniAssessmentEnabled() && (p.weights().get("TECHNICAL_KNOWLEDGE") == 0 || p.selectedSkills().isEmpty()))
            fail("Mini Assessment cần Technical Knowledge và ít nhất một Job Skill.");
        if (p.stages() == null || p.miniAfterStage() > p.stages().size()) fail("Vị trí Mini Assessment không hợp lệ.");
        if (p.stages().isEmpty() && !requireRoadmap) return;
        if (p.stages().isEmpty() || p.stages().stream().mapToInt(InterviewPolicy.Stage::questionCount).sum() != c.questionCount())
            fail("Tổng số câu của lộ trình phải bằng số câu phỏng vấn.");
        // Communication is attached to every stage by InterviewRubric.plan.
        Set<String> covered = new HashSet<>(Set.of("COMMUNICATION")), skills = new HashSet<>();
        for (var stage : p.stages()) {
            if (stage.competencies() == null || stage.competencies().isEmpty()
                    || new HashSet<>(stage.competencies()).size() != stage.competencies().size()
                    || !COMPETENCIES.containsAll(stage.competencies()) || stage.competencies().stream().anyMatch(k -> p.weights().get(k) == 0)
                    || stage.skills() == null || new HashSet<>(stage.skills()).size() != stage.skills().size()
                    || !p.selectedSkills().containsAll(stage.skills())) fail("Năng lực hoặc kỹ năng của chặng không hợp lệ.");
            covered.addAll(stage.competencies()); skills.addAll(stage.skills());
        }
        if (!skills.containsAll(p.selectedSkills()) || p.weights().entrySet().stream().anyMatch(e -> e.getValue() > 0 && !covered.contains(e.getKey())))
            fail("Lộ trình phải bao phủ mọi năng lực có trọng số và kỹ năng đã chọn.");
    }
    private static void validateV2(InterviewPolicy p, Set<String> jobSkills) {
        if (p.processes().size() > 6 || p.processes().stream().map(InterviewPolicy.Process::key).distinct().count() != p.processes().size()
                || p.processes().stream().mapToInt(InterviewPolicy.Process::order).distinct().count() != p.processes().size()) {
            fail("Mỗi quy trình AI Interview phải có khóa và thứ tự duy nhất.");
        }
        for (var process : p.processes()) {
            if (!COMPETENCIES.contains(process.key()) && !"TECHNICAL_REASONING".equals(process.key())) fail("Quy trình AI Interview không hợp lệ.");
            if (process.enabled() && process.config().isEmpty()) fail("Quy trình bật phải có cấu hình.");
            if (process.enabled()) {
                try {
                    var settings = InterviewProcessSettings.config(process);
                    int count = InterviewProcessSettings.questionCount(settings);
                    if (count < 1 || count > 10) fail("Mỗi bài tập có 1–10 câu hỏi chính.");
                    int followUp = InterviewProcessSettings.followUpLimit(settings);
                    if (followUp < 0 || followUp > 3) fail("Giới hạn hỏi bồi phải từ 0–3.");
                    for (String key : List.of("difficulty", "questionFormat", "problemStyle", "complexity", "scenarioComplexity", "experienceDepth", "responseMode", "language")) {
                        if (!settings.containsKey(key)) continue;
                        var allowed = switch (key) {
                            case "difficulty" -> Set.of("easy", "medium", "hard", "adaptive");
                            case "questionFormat" -> Set.of("single", "multiple", "mixed");
                            case "problemStyle" -> Set.of("scenario", "coding", "debugging", "mixed");
                            case "complexity", "scenarioComplexity" -> Set.of("short", "medium", "complex");
                            case "experienceDepth" -> Set.of("basic", "standard", "deep");
                            case "responseMode" -> Set.of("text", "speech");
                            default -> Set.of("English", "Vietnamese", "Japanese");
                        };
                        if (!allowed.contains(settings.get(key).toString())) fail("Giá trị cấu hình không hợp lệ: " + key);
                    }
                    if ("multiple".equals(settings.get("questionFormat")) && !InterviewProcessSettings.bool(settings, "allowMultipleCorrectAnswers", true))
                        fail("Định dạng Multiple cần bật Allow Multiple Correct Answers.");
                    if (InterviewProcessSettings.bool(settings, "realTimeInteraction", false))
                        fail("Streaming hai chiều chưa khả dụng. Communication hoạt động theo lượt.");
                } catch (IllegalStateException ex) { fail("Cấu hình bài tập không hợp lệ: " + process.key()); }
            }
            Object selected = process.config().get("selectedSkills");
            if (selected instanceof Collection<?> values && values.stream().map(String::valueOf).anyMatch(skill -> !jobSkills.contains(skill))) {
                fail("Chỉ chọn kỹ năng thuộc Job.");
            }
        }
    }
    private static void fail(String message) { throw new BusinessException(message, HttpStatus.BAD_REQUEST, "AI_INTERVIEW_BAD_CONFIG"); }

    private static IllegalStateException invalidData(String operation, Exception cause) {
        return new IllegalStateException("Invalid interview data (" + operation + "): "
                + cause.getClass().getSimpleName(), cause);
    }
}
