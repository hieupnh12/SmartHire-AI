package com.smarthire.tenant.assessment.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.domain.enums.*;
import com.smarthire.domain.tenant.entity.*;
import com.smarthire.domain.tenant.repository.*;
import com.smarthire.tenant.aiInterview.ai.AiInterviewClient;
import com.smarthire.tenant.assessment.dto.request.*;
import com.smarthire.tenant.assessment.mapper.AssessmentMapper;
import com.smarthire.tenant.cv.service.CvAccess;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AssessmentGradingServiceTest {
    @Mock SubmissionRepository submissions;
    @Mock AnswerRepository answers;
    @Mock CodingSubmissionRepository executions;
    @Mock AiInterviewClient ai;
    @Mock CodingJudge judge;
    @Mock CvAccess access;
    @Mock ApplicationEventPublisher events;
    final ObjectMapper json = new ObjectMapper();
    AssessmentGradingService service;
    Submission submission;
    Answer answer;
    @BeforeEach void setup() {
        service = new AssessmentGradingService(submissions, answers, executions, ai, judge, json, access, events);
        var job = new Job(); job.setId(1L); var test = new JobTest(); test.setJob(job);
        submission = new Submission(); submission.setId(1L); submission.setTest(test); submission.setStatus(TestSubmissionStatus.SUBMITTED);
        var question = new Question(); question.setId(2L); question.setPoints(10); question.setQuestionText("Explain WAL"); question.setQuestionType("ESSAY");
        answer = new Answer(); answer.setSubmission(submission); answer.setQuestion(question); answer.setAnswerText("Log changes before data writes to enable recovery.");
        lenient().when(submissions.findLockedById(1L)).thenReturn(Optional.of(submission));
    }
    @Test void semanticRubricSuggestionRequiresHumanApprovalAndAggregatesOnlyAfterReview() throws Exception {
        answer.getQuestion().setRubricJson(json.readTree("{\"referenceAnswer\":\"Write log first\",\"criteria\":[{\"description\":\"Durability\",\"weight\":50},{\"description\":\"Recovery\",\"weight\":50}]}"));
        var objective = new Answer(); var question = new Question(); question.setQuestionType("MCQ"); objective.setQuestion(question); objective.setScore(new BigDecimal("5"));
        when(answers.findBySubmission_IdOrderByQuestion_QuestionOrderAscQuestion_IdAsc(1L)).thenReturn(List.of(objective, answer));
        when(ai.evaluate(anyString(), any())).thenReturn(json.readTree("{\"criteria_results\":[{\"score_percent\":100,\"feedback\":\"Equivalent meaning\"},{\"score_percent\":70,\"feedback\":\"Partial explanation\"}]}"));
        service.suggest(1L, "ESSAY");
        assertThat(answer.getSuggestedScore()).isEqualByComparingTo("8.50"); assertThat(answer.getScore()).isNull(); assertThat(submission.getScore()).isNull();
        when(access.staff()).thenReturn(true); when(access.actor()).thenReturn(new User());
        when(answers.findBySubmission_IdAndQuestion_Id(1L, 2L)).thenReturn(Optional.of(answer));
        service.approve(1L, 2L, null);
        assertThat(submission.getScore()).isEqualByComparingTo("13.50"); assertThat(submission.getStatus()).isEqualTo(TestSubmissionStatus.GRADED);
        assertThat(answer.getReviewedAt()).isNotNull();
        service.suggest(1L, "ESSAY"); verify(ai, times(1)).evaluate(anyString(), any());
    }
    @Test void providerFailureNeverBecomesCandidateZero() throws Exception {
        answer.getQuestion().setRubricJson(json.readTree("{\"referenceAnswer\":\"WAL\",\"criteria\":[{\"description\":\"Correctness\",\"weight\":100}]}"));
        when(answers.findBySubmission_IdOrderByQuestion_QuestionOrderAscQuestion_IdAsc(1L)).thenReturn(List.of(answer));
        when(ai.evaluate(anyString(), any())).thenThrow(new IllegalStateException("Unavailable"));
        service.suggest(1L, "ESSAY");
        assertThat(answer.getScore()).isNull(); assertThat(answer.getSuggestedScore()).isNull();
        assertThat(answer.getEvaluationJson().path("status").asText()).isEqualTo("ERROR");
    }
    @Test void codeIsGradedByBehaviorWithEightyTwentyWeights() throws Exception {
        var problem = new CodingProblem(); var sample = new TestCase(); sample.setInputData("1"); sample.setExpectedOutput("2"); sample.setSample(true);
        var hidden = new TestCase(); hidden.setInputData("2"); hidden.setExpectedOutput("4");
        problem.getTestCases().addAll(List.of(sample, hidden)); answer.getQuestion().setCodingProblem(problem); answer.getQuestion().setQuestionType("CODING"); answer.setLanguage("python");
        when(answers.findBySubmission_IdOrderByQuestion_QuestionOrderAscQuestion_IdAsc(1L)).thenReturn(List.of(answer));
        when(judge.run(eq(problem), eq("python"), anyString(), eq("1"), eq("2"))).thenReturn(json.readTree("{\"status\":{\"id\":3}}"));
        when(judge.run(eq(problem), eq("python"), anyString(), eq("2"), eq("4"))).thenReturn(json.readTree("{\"status\":{\"id\":4}}"));
        when(ai.evaluate(anyString(), any())).thenReturn(json.readTree("{\"score_percent\":50}"));
        service.suggest(1L, "CODING");
        assertThat(answer.getSuggestedScore()).isEqualByComparingTo("5.00"); assertThat(answer.getScore()).isNull();
        verify(executions).save(argThat(execution -> execution.getStatus() == SubmissionStatus.FAILED));
    }
    @Test void hiddenWeightsDetermineTestScoreAndSampleDoesNotContribute() throws Exception {
        var problem = new CodingProblem();
        var sample = new TestCase(); sample.setSample(true); sample.setInputData("sample"); sample.setExpectedOutput("ok"); sample.setWeight(BigDecimal.ZERO);
        var first = new TestCase(); first.setInputData("first"); first.setExpectedOutput("ok"); first.setWeight(new BigDecimal("70"));
        var second = new TestCase(); second.setInputData("second"); second.setExpectedOutput("ok"); second.setWeight(new BigDecimal("30"));
        problem.getTestCases().addAll(List.of(sample, first, second));
        answer.getQuestion().setCodingProblem(problem); answer.getQuestion().setQuestionType("CODING"); answer.setLanguage("cpp");
        when(answers.findBySubmission_IdOrderByQuestion_QuestionOrderAscQuestion_IdAsc(1L)).thenReturn(List.of(answer));
        when(judge.run(eq(problem), eq("cpp"), anyString(), anyString(), eq("ok")))
                .thenAnswer(call -> json.readTree("{\"status\":{\"id\":" + (call.getArgument(3).equals("first") ? 3 : 4) + "}}"));
        when(ai.evaluate(anyString(), any())).thenReturn(json.readTree("{\"score_percent\":100}"));
        service.suggest(1L, "CODING");
        assertThat(answer.getSuggestedScore()).isEqualByComparingTo("7.60");
        assertThat(answer.getEvaluationJson().path("tests_percent").decimalValue()).isEqualByComparingTo("70");
        assertThat(answer.getScore()).isNull();
    }

    @Test void invalidAiScoresAreRejectedWithoutPublishingAGrade() throws Exception {
        answer.getQuestion().setRubricJson(json.readTree("{\"referenceAnswer\":\"WAL\",\"criteria\":[{\"description\":\"Correctness\",\"weight\":100}]}"));
        when(answers.findBySubmission_IdOrderByQuestion_QuestionOrderAscQuestion_IdAsc(1L)).thenReturn(List.of(answer));
        when(ai.evaluate(anyString(), any())).thenReturn(json.readTree("{\"criteria_results\":[{\"score_percent\":200}]}"));
        service.suggest(1L, "ESSAY"); assertThat(answer.getSuggestedScore()).isNull();
    }
    @Test void invalidRubricWeightsAreRejected() throws Exception {
        assertThatThrownBy(() -> QuestionContent.validateRubric(json.readTree("{\"referenceAnswer\":\"WAL\",\"criteria\":[{\"description\":\"Correctness\",\"weight\":70}]}")))
                .hasMessageContaining("total 100");
    }
    @Test void candidateCodingDtoNeverContainsHiddenTestsHarnessOrRubric() throws Exception {
        var problem = new CodingProblem(); problem.setStarterCodeJson(json.readTree("{\"python\":\"def solve(): pass\"}")); problem.setHarnessJson(json.readTree("{\"python\":\"SECRET {{SOURCE}}\"}"));
        var sample = new TestCase(); sample.setSample(true); sample.setInputData("1"); sample.setExpectedOutput("2");
        var hidden = new TestCase(); hidden.setInputData("HIDDEN INPUT"); hidden.setExpectedOutput("HIDDEN OUTPUT"); problem.getTestCases().addAll(List.of(sample, hidden));
        answer.getQuestion().setCodingProblem(problem); answer.getQuestion().setExplanation("SECRET ANSWER");
        String dto = json.writeValueAsString(new AssessmentMapper().candidateQuestion(answer.getQuestion(), List.of()));
        assertThat(dto).doesNotContain("SECRET", "HIDDEN", "rubricJson");
    }
}
