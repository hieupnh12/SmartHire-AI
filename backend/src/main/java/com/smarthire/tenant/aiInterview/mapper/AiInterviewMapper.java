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
                interview.getErrorMessage());
    }

    public AiQuestionResponse toQuestion(
            AiQuestion question,
            AiAnswer answer,
            AiFeedback feedback) {
        return new AiQuestionResponse(
                question.getId(),
                question.getAiInterview() != null ? question.getAiInterview().getId() : null,
                question.getQuestionText(),
                question.getQuestionType(),
                question.getQuestionOrder(),
                question.getCreatedAt(),
                answer == null ? null : toAnswer(answer, feedback));
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
                feedback.getCreatedAt());
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
            Map<Long, AiFeedback> feedbackByAnswerId) {
        return questions.stream()
                .map(q -> {
                    AiAnswer answer = answersByQuestionId.get(q.getId());
                    AiFeedback feedback = answer == null ? null : feedbackByAnswerId.get(answer.getId());
                    return toQuestion(q, answer, feedback);
                })
                .toList();
    }
}
