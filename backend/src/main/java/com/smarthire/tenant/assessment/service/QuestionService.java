package com.smarthire.tenant.assessment.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.TestStatus;
import com.smarthire.domain.tenant.entity.JobTest;
import com.smarthire.domain.tenant.entity.Question;
import com.smarthire.domain.tenant.entity.Option;
import com.smarthire.domain.tenant.repository.JobTestRepository;
import com.smarthire.domain.tenant.repository.QuestionRepository;
import com.smarthire.domain.tenant.repository.OptionRepository;
import com.smarthire.domain.tenant.repository.CodingProblemRepository;
import com.smarthire.tenant.assessment.dto.request.QuestionRequest;
import com.smarthire.tenant.assessment.dto.response.QuestionResponse;
import com.smarthire.tenant.assessment.dto.response.JobTestResponse;
import com.smarthire.tenant.assessment.mapper.AssessmentMapper;
import com.smarthire.tenant.cv.service.CvAccess;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Isolation;

@Service
public class QuestionService {
    private final JobTestRepository tests;
    private final QuestionRepository questions;
    private final OptionRepository options;
    private final CodingProblemRepository codingProblems;
    private final CvAccess access;
    private final AssessmentMapper mapper;

    public QuestionService(JobTestRepository tests, QuestionRepository questions, OptionRepository options,
            CodingProblemRepository codingProblems, CvAccess access, AssessmentMapper mapper) {
        this.tests = tests;
        this.questions = questions;
        this.options = options;
        this.codingProblems = codingProblems;
        this.access = access;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public List<QuestionResponse> list(long testId) {
        staff();
        var test = tests.findById(testId).orElseThrow(() -> notFound("Test"));
        access.requireJob(test.getJob());
        return questions.findByTest_IdOrderByQuestionOrderAscIdAsc(testId).stream()
                .map(q -> mapper.question(q, options.findByQuestion_IdOrderByIdAsc(q.getId()))).toList();
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public QuestionResponse create(long testId, QuestionRequest request) {
        JobTest test = draft(testId);
        if (questions.countByTest_Id(testId) >= 100) throw invalid("A test can contain at most 100 questions");
        validateOptions(request);
        Question question = new Question();
        question.setTest(test);
        apply(question, request);
        questions.save(question);
        return mapper.question(question, replaceOptions(question, request));
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public QuestionResponse update(long testId, long questionId, QuestionRequest request) {
        draft(testId);
        Question question = find(testId, questionId);
        validateOptions(request);
        apply(question, request);
        questions.save(question);
        return mapper.question(question, replaceOptions(question, request));
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void delete(long testId, long questionId) {
        draft(testId);
        Question question = find(testId, questionId);
        options.deleteAll(options.findByQuestion_IdOrderByIdAsc(questionId));
        options.flush();
        questions.delete(question);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public JobTestResponse publish(long testId) {
        JobTest test = draft(testId);
        var items = questions.findByTest_IdOrderByQuestionOrderAscIdAsc(testId);
        if (items.isEmpty() || items.size() > 100) throw invalid("A test requires 1 to 100 questions");
        if (codingProblems.existsByTest_Id(testId)) throw invalid("Only MCQ-only tests are supported by this flow");
        int total = 0;
        for (Question question : items) {
            var choices = options.findByQuestion_IdOrderByIdAsc(question.getId());
            if (!"MCQ".equals(question.getQuestionType()) || question.getPoints() < 1 || question.getPoints() > 10000
                    || choices.size() < 2 || choices.size() > 10
                    || choices.stream().filter(Option::isCorrect).count() != 1) {
                throw invalid("Every question must be an MCQ with 2-10 options and exactly one correct answer");
            }
            total += question.getPoints();
        }
        if (test.getPassingScore() != null && (test.getPassingScore().signum() < 0
                || test.getPassingScore().compareTo(BigDecimal.valueOf(total)) > 0)) {
            throw invalid("Passing score must be between zero and total points");
        }
        test.setStatus(TestStatus.PUBLISHED);
        return mapper.response(tests.save(test));
    }

    private JobTest draft(long id) {
        staff();
        // All authoring and start operations share this lock to freeze the published paper atomically.
        JobTest test = tests.findLockedById(id).orElseThrow(() -> notFound("Test"));
        access.requireJob(test.getJob());
        if (test.getStatus() != TestStatus.DRAFT) {
            throw new BusinessException("Only draft tests can be edited", HttpStatus.CONFLICT, "TEST_LOCKED");
        }
        return test;
    }

    private void staff() {
        if (!access.staff()) throw new BusinessException("Staff access required", HttpStatus.FORBIDDEN, "ASSESSMENT_FORBIDDEN");
        access.actor();
    }

    private Question find(long testId, long questionId) {
        return questions.findByIdAndTest_Id(questionId, testId).orElseThrow(() -> notFound("Question"));
    }

    private void validateOptions(QuestionRequest request) {
        if (request.options().stream().filter(o -> Boolean.TRUE.equals(o.correct())).count() != 1) {
            throw invalid("Exactly one option must be correct");
        }
    }

    private void apply(Question question, QuestionRequest request) {
        question.setQuestionText(request.questionText().trim());
        question.setQuestionType("MCQ");
        question.setPoints(request.points());
        question.setQuestionOrder(request.questionOrder());
    }

    private List<Option> replaceOptions(Question question, QuestionRequest request) {
        options.deleteAll(options.findByQuestion_IdOrderByIdAsc(question.getId()));
        options.flush();
        return options.saveAll(request.options().stream().map(input -> {
            Option option = new Option();
            option.setQuestion(question);
            option.setOptionText(input.optionText().trim());
            option.setCorrect(input.correct());
            return option;
        }).toList());
    }

    private BusinessException invalid(String message) {
        return new BusinessException(message, HttpStatus.BAD_REQUEST, "INVALID_TEST");
    }

    private BusinessException notFound(String resource) {
        return new BusinessException(resource + " not found", HttpStatus.NOT_FOUND, "ASSESSMENT_NOT_FOUND");
    }
}
