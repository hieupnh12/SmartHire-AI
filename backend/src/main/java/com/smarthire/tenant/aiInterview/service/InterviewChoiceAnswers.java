package com.smarthire.tenant.aiInterview.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.tenant.entity.AiQuestion;
import java.util.*;
import org.springframework.http.HttpStatus;

/** V1 keeps its numeric answer; V2 uses selectedOptions plus an optional explanation. */
public final class InterviewChoiceAnswers {
    private InterviewChoiceAnswers() {}
    public record Answer(Set<Integer> selected, String explanation) {}
    public static boolean isChoice(AiQuestion question) { return question.getOptionsJson() != null; }
    public static boolean isV2Choice(AiQuestion question) {
        return question.getRubricJson() != null && InterviewPolicies.tree(question.getRubricJson()).has("correctOptions");
    }
    public static Answer parse(AiQuestion question, String value) {
        try {
            var rubric = InterviewPolicies.tree(question.getRubricJson());
            var data = InterviewPolicies.tree(value);
            var choices = data.path("selectedOptions"); Set<Integer> selected = new HashSet<>();
            if (!data.isObject() || !choices.isArray() || choices.isEmpty()) throw new IllegalStateException();
            for (var item : choices) if (!item.isIntegralNumber() || item.asInt() < 0 || item.asInt() > 3
                    || !selected.add(item.asInt())) throw new IllegalStateException();
            if ("SINGLE_CHOICE".equals(rubric.path("kind").asText()) && selected.size() != 1) throw new IllegalStateException();
            var explanation = data.path("explanation");
            if (!explanation.isMissingNode() && !explanation.isTextual()) throw new IllegalStateException();
            String text = explanation.asText("").trim();
            if (text.length() > 10000 || rubric.path("explanationRequired").asBoolean(false) && text.isEmpty()) throw new IllegalStateException();
            return new Answer(selected, text);
        } catch (IllegalStateException | NullPointerException ex) {
            throw new BusinessException("Chọn đáp án hợp lệ và nhập giải thích nếu được yêu cầu.", HttpStatus.BAD_REQUEST, "AI_ANSWER_BAD_OPTION");
        }
    }
    public static Set<Integer> correct(AiQuestion question) {
        Set<Integer> result = new HashSet<>();
        InterviewPolicies.tree(question.getRubricJson()).path("correctOptions").forEach(item -> result.add(item.asInt()));
        return result;
    }
}
