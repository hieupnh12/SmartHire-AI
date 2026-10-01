package com.smarthire.tenant.aiInterview.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
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
    private static final ObjectMapper JSON = new ObjectMapper().findAndRegisterModules();
    private InterviewPolicies() {}

    public static String json(Object value) {
        try { return JSON.writeValueAsString(value); }
        catch (Exception ex) { throw new IllegalStateException("Invalid interview data"); }
    }
    public static <T> T read(String value, Class<T> type) {
        try { return JSON.readValue(value, type); }
        catch (Exception ex) { throw new IllegalStateException("Invalid interview data"); }
    }
    public static JsonNode tree(String value) { return value == null ? null : read(value, JsonNode.class); }
    public static InterviewPolicy defaults() {
        return new InterviewPolicy(30, 1, true, 3, 30, 0,
                Map.of(COMPETENCIES.get(0), 35, COMPETENCIES.get(1), 25, COMPETENCIES.get(2), 20,
                        COMPETENCIES.get(3), 10, COMPETENCIES.get(4), 10), List.of(), List.of());
    }
    public static AiInterviewConfigRequest config(Job job) {
        return new AiInterviewConfigRequest(job.isAiInterviewEnabled(), job.getAiInterviewPassingScore(),
                job.getAiInterviewQuestionCount(), job.getAiInterviewAvailableUntil(),
                job.getAiInterviewPolicyJson() == null ? defaults() : read(job.getAiInterviewPolicyJson(), InterviewPolicy.class));
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
    public static boolean isV2(AiInterview interview) { return isV2(config(interview).policy()); }
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
        if (isV2(p)) {
            validateV2(p, jobSkills);
            return;
        }
        if (p == null || p.weights() == null || !p.weights().keySet().equals(new HashSet<>(COMPETENCIES))
                || p.weights().values().stream().anyMatch(w -> w == null || w < 0 || w > 100)
                || p.weights().values().stream().mapToInt(Integer::intValue).sum() != 100) fail("Tổng trọng số phải bằng 100%.");
        if (p.selectedSkills() == null || new HashSet<>(p.selectedSkills()).size() != p.selectedSkills().size()
                || !jobSkills.containsAll(p.selectedSkills())) fail("Chỉ chọn kỹ năng thuộc Job.");
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
            Object selected = process.config().get("selectedSkills");
            if (selected instanceof Collection<?> values && values.stream().map(String::valueOf).anyMatch(skill -> !jobSkills.contains(skill))) {
                fail("Chỉ chọn kỹ năng thuộc Job.");
            }
        }
    }
    private static void fail(String message) { throw new BusinessException(message, HttpStatus.BAD_REQUEST, "AI_INTERVIEW_BAD_CONFIG"); }
}
