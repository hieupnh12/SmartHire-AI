package com.smarthire.tenant.aiInterview.mapper;

import com.smarthire.domain.tenant.entity.AiAnswer;
import com.smarthire.domain.tenant.entity.AiFeedback;
import com.smarthire.domain.tenant.entity.AiInterview;
import com.smarthire.domain.tenant.entity.AiInterviewLog;
import com.smarthire.domain.tenant.entity.AiQuestion;
import com.smarthire.domain.tenant.entity.Application;
import com.smarthire.tenant.aiInterview.dto.response.AiAnswerResponse;
import com.smarthire.tenant.aiInterview.dto.response.AiFeedbackResponse;
import com.smarthire.tenant.aiInterview.dto.response.AiInterviewLogResponse;
import com.smarthire.tenant.aiInterview.dto.response.AiInterviewResponse;
import com.smarthire.tenant.aiInterview.dto.response.AiQuestionResponse;
import com.smarthire.tenant.aiInterview.dto.response.RoadmapStep;
import com.smarthire.tenant.aiInterview.service.InterviewPolicies;
import com.smarthire.tenant.aiInterview.service.InterviewRubric;
import com.smarthire.tenant.aiInterview.service.InterviewProcessSettings;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Component;

@Component
public class AiInterviewMapper {

    public AiInterviewResponse toResponse(AiInterview interview) {
        return toResponse(interview, List.of());
    }

    public AiInterviewResponse toResponse(AiInterview interview, List<AiQuestionResponse> questions) {
        Application app = interview.getApplication();
        return new AiInterviewResponse(
                interview.getId(),
                app != null ? app.getId() : null,
                app != null && app.getJob() != null ? app.getJob().getId() : null,
                app != null && app.getCandidate() != null ? app.getCandidate().getId() : null,
                interview.getWorkflowStage() != null ? interview.getWorkflowStage().getId() : null,
                interview.getStartedAt(),
                interview.getCompletedAt(),
                interview.getOverallScore(),
                interview.getStatus(),
                interview.getCreatedAt(),
                questions,
                app != null && app.getJob() != null ? app.getJob().getTitle() : null,
                interview.getPassingScoreSnapshot() != null ? interview.getPassingScoreSnapshot()
                        : app != null && app.getJob() != null ? app.getJob().getAiInterviewPassingScore() : null,
                interview.getErrorMessage(),
                expectedQuestions(interview),
                interview.getExpiresAt(),
                interview.getAttemptNumber(),
                InterviewPolicies.canRetry(interview, Instant.now()),
                interview.getReportJson(),
                interview.getConfigSnapshotJson() == null ? null : InterviewPolicies.config(interview).policy().durationMinutes(),
                interview.getConfigSnapshotJson() == null ? null : InterviewPolicies.config(interview).policy().maxAttempts(),
                interview.getConfigSnapshotJson() == null ? null : InterviewPolicies.config(interview).availableFrom(),
                interview.getConfigSnapshotJson() == null ? null : InterviewPolicies.config(interview).availableUntil(),
                roadmap(interview), InterviewPolicies.isV2(interview), InterviewPolicies.voiceEnabled(interview),
                InterviewPolicies.voiceEnabled(interview) && InterviewPolicies.config(interview).policy().voice().recordAudio());
    }

    private static List<RoadmapStep> roadmap(AiInterview interview) {
        if (interview.getConfigSnapshotJson() == null) return null;
        var policy = InterviewPolicies.config(interview).policy();
        if (policy.processes() != null && !policy.processes().isEmpty()) {
            return policy.processes().stream()
                    .filter(com.smarthire.tenant.aiInterview.dto.request.InterviewPolicy.Process::enabled)
                    .sorted(java.util.Comparator.comparingInt(com.smarthire.tenant.aiInterview.dto.request.InterviewPolicy.Process::order))
                    .map(process -> new RoadmapStep(processTitle(process.key()), process.key().equals("TECHNICAL_KNOWLEDGE") ? "MCQ" : "OPEN", InterviewProcessSettings.questionCount(process.config())))
                    .toList();
        }
        if (policy.stages() == null || policy.stages().isEmpty()) return null;
        List<RoadmapStep> steps = new ArrayList<>();
        String current = null;
        for (var slot : InterviewRubric.plan(policy)) {
            String stageId = slot.path("stageId").asText();
            if (stageId.equals(current)) {
                var last = steps.removeLast();
                steps.add(new RoadmapStep(last.title(), last.kind(), last.questionCount() + 1));
            } else {
                steps.add(new RoadmapStep(slot.path("stageTitle").asText(), slot.path("kind").asText(), 1));
                current = stageId;
            }
        }
        return steps;
    }

    private static int expectedQuestions(AiInterview interview) {
        if (interview.getConfigSnapshotJson() != null) {
            var policy = InterviewPolicies.config(interview).policy();
            if (InterviewPolicies.isV2(policy)) return policy.processes().stream().filter(com.smarthire.tenant.aiInterview.dto.request.InterviewPolicy.Process::enabled)
                    .mapToInt(process -> InterviewProcessSettings.questionCount(process.config())).sum();
            if (policy.stages() != null && !policy.stages().isEmpty()) return InterviewRubric.plan(policy).size();
            return InterviewPolicies.config(interview).questionCount();
        }
        var app = interview.getApplication();
        return app != null && app.getJob() != null ? app.getJob().getAiInterviewQuestionCount() : 0;
    }

    public AiQuestionResponse toQuestion(AiQuestion question, AiAnswer answer, AiFeedback feedback) {
        return toQuestion(question, answer, feedback, false);
    }

    public AiQuestionResponse toQuestion(AiQuestion question, AiAnswer answer, AiFeedback feedback, boolean revealKey) {
        return toQuestion(question, answer, feedback, revealKey, revealKey);
    }

    public AiQuestionResponse toQuestion(AiQuestion question, AiAnswer answer, AiFeedback feedback,
            boolean revealCorrectOption, boolean revealExplanation) {
        List<String> options = texts(question.getOptionsJson() == null ? null : InterviewPolicies.tree(question.getOptionsJson()));
        String stageTitle = null;
        List<String> competencies = List.of();
        List<String> skills = List.of();
        var rubric = question.getRubricJson() == null ? null : InterviewPolicies.tree(question.getRubricJson());
        List<Integer> correctOptions = null;
        String difficulty = rubric == null ? null : rubric.path("difficulty").asText(null);
        String hint = rubric == null ? null : rubric.path("hint").asText(null);
        boolean multiple = rubric != null && "MULTIPLE_CHOICE".equals(rubric.path("kind").asText());
        boolean explanationRequired = rubric != null && rubric.path("explanationRequired").asBoolean(false);
        if (revealCorrectOption && rubric != null && rubric.path("correctOptions").isArray()) {
            var indices = new ArrayList<Integer>(); rubric.path("correctOptions").forEach(item -> indices.add(item.asInt())); correctOptions = indices;
        }
        String responseMode = "text", language = "Vietnamese";
        if (question.getProcessRun() != null) {
            var process = InterviewPolicies.read(question.getProcessRun().getConfigSnapshotJson(), com.smarthire.tenant.aiInterview.dto.request.InterviewPolicy.Process.class);
            var config = InterviewProcessSettings.config(process);
            responseMode = config.getOrDefault("responseMode", "text").toString();
            language = config.getOrDefault("language", "Vietnamese").toString();
            if ("COMMUNICATION".equals(process.key()) && !InterviewProcessSettings.bool(config, "generateTranscript", false)) responseMode = "text";
        }
        if (question.getRubricJson() != null) {
            if (rubric != null) {
                if (rubric.path("stageTitle").isTextual()) stageTitle = rubric.path("stageTitle").asText();
                else if (rubric.path("processKey").isTextual()) stageTitle = processTitle(rubric.path("processKey").asText());
                competencies = texts(rubric.path("competencies"));
                skills = texts(rubric.path("skills"));
            }
        }
        return new AiQuestionResponse(
                question.getId(),
                question.getAiInterview() != null ? question.getAiInterview().getId() : null,
                question.getQuestionText(),
                question.getQuestionType(),
                question.getQuestionOrder(),
                question.getCreatedAt(),
                answer == null ? null : toAnswer(answer, feedback),
                options.isEmpty() ? null : options,
                stageTitle,
                competencies.isEmpty() ? null : competencies,
                skills.isEmpty() ? null : skills,
                revealCorrectOption ? question.getCorrectOption() : null,
                revealExplanation ? question.getExplanation() : null,
                correctOptions, multiple, explanationRequired, difficulty, hint, question.getQuestionRole(), responseMode, language);
    }

    private static String processTitle(String key) {
        return switch (key == null ? "" : key) {
            case "TECHNICAL_KNOWLEDGE" -> "Technical Knowledge";
            case "PROBLEM_SOLVING" -> "Problem Solving";
            case "PRACTICAL_EXPERIENCE" -> "Practical Experience";
            case "TECHNICAL_REASONING" -> "Technical Reasoning";
            case "BEHAVIORAL_SITUATIONAL" -> "Behavioral / Situational";
            case "COMMUNICATION" -> "Communication";
            default -> key == null || key.isBlank() ? "Interview Process" : key.replace('_', ' ');
        };
    }

    private static List<String> texts(com.fasterxml.jackson.databind.JsonNode node) {
        if (node == null || !node.isArray()) return List.of();
        var values = new ArrayList<String>();
        node.forEach(item -> { if (item.isTextual()) values.add(item.asText()); });
        return values;
    }

    public AiAnswerResponse toAnswer(AiAnswer answer, AiFeedback feedback) {
        return new AiAnswerResponse(
                answer.getId(),
                answer.getAiQuestion() != null ? answer.getAiQuestion().getId() : null,
                answer.getAnswerText(),
                answer.getAnswerDuration(),
                answer.getAnsweredAt(),
                feedback == null ? null : toFeedback(feedback));
    }

    public AiFeedbackResponse toFeedback(AiFeedback feedback) {
        return new AiFeedbackResponse(
                feedback.getId(),
                feedback.getAiAnswer() != null ? feedback.getAiAnswer().getId() : null,
                feedback.getScore(),
                feedback.getFeedbackText(),
                feedback.getStrengths(),
                feedback.getWeaknesses(),
                feedback.getCreatedAt(), feedback.getEvaluationJson());
    }

    public AiInterviewLogResponse toLog(AiInterviewLog log) {
        return new AiInterviewLogResponse(
                log.getId(),
                log.getAiInterview() != null ? log.getAiInterview().getId() : null,
                log.getEvent(),
                log.getStatus(),
                log.getDetail(),
                log.getCreatedAt());
    }

    public List<AiQuestionResponse> toQuestions(
            List<AiQuestion> questions,
            Map<Long, AiAnswer> answersByQuestionId,
            Map<Long, AiFeedback> feedbackByAnswerId,
            boolean revealKey) {
        return questions.stream()
                .map(q -> {
                    AiAnswer answer = answersByQuestionId.get(q.getId());
                    AiFeedback feedback = answer == null ? null : feedbackByAnswerId.get(answer.getId());
                    return toQuestion(q, answer, feedback, revealKey);
                })
                .toList();
    }

    public List<AiQuestionResponse> toQuestions(
            List<AiQuestion> questions, Map<Long, AiAnswer> answersByQuestionId,
            Map<Long, AiFeedback> feedbackByAnswerId, boolean revealCorrectOption, boolean revealExplanation) {
        return questions.stream().map(q -> {
            AiAnswer answer = answersByQuestionId.get(q.getId());
            AiFeedback feedback = answer == null ? null : feedbackByAnswerId.get(answer.getId());
            return toQuestion(q, answer, feedback, revealCorrectOption, revealExplanation);
        }).toList();
    }
}
