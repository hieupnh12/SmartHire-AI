package com.smarthire.tenant.assessment.mapper;

import org.springframework.stereotype.Component;
import com.smarthire.domain.tenant.entity.JobTest;
import com.smarthire.tenant.assessment.dto.response.JobTestResponse;
import com.smarthire.domain.tenant.entity.Question;
import com.smarthire.domain.tenant.entity.Option;
import com.smarthire.tenant.assessment.dto.response.QuestionResponse;
import com.smarthire.tenant.assessment.dto.response.SubmissionResponse.CandidateQuestion;
import com.smarthire.tenant.assessment.dto.response.SubmissionResponse.CandidateOption;
import java.util.List;

/**
 * Map entities &lt;-&gt; DTOs for assessment module.
 * Prefer MapStruct when mapping grows.
 */
@Component
public class AssessmentMapper {
    public QuestionResponse question(Question question, List<Option> options) {
        return new QuestionResponse(question.getId(), question.getQuestionText(), question.getQuestionType(),
                question.getPoints(), question.getQuestionOrder(), options.stream()
                .map(option -> new QuestionResponse.OptionResponse(option.getId(), option.getOptionText(), option.isCorrect()))
                .toList());
    }

    public CandidateQuestion candidateQuestion(Question question, List<Option> options) {
        return new CandidateQuestion(question.getId(), question.getQuestionText(), question.getQuestionType(),
                question.getPoints(), question.getQuestionOrder(), options.stream()
                .map(option -> new CandidateOption(option.getId(), option.getOptionText())).toList());
    }
    public JobTestResponse response(JobTest test) {
        return new JobTestResponse(test.getId(), test.getJob().getId(), test.getTitle(),
                test.getDescription(), test.getDurationMinutes(), test.getPassingScore(),
                test.getStatus(), test.getCreatedAt());
    }
}

