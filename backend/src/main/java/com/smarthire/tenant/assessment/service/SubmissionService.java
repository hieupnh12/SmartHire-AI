package com.smarthire.tenant.assessment.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.ApplicationStatus;
import com.smarthire.domain.enums.TestStatus;
import com.smarthire.domain.enums.TestSubmissionStatus;
import com.smarthire.domain.tenant.entity.*;
import com.smarthire.domain.tenant.repository.*;
import com.smarthire.tenant.assessment.dto.request.SaveAnswersRequest;
import com.smarthire.tenant.assessment.dto.request.StartSubmissionRequest;
import com.smarthire.tenant.assessment.dto.response.SubmissionResponse;
import com.smarthire.tenant.assessment.dto.response.AvailableAssessmentResponse;
import com.smarthire.tenant.assessment.dto.response.SubmissionResponse.SavedAnswer;
import com.smarthire.tenant.assessment.dto.response.SubmissionSummaryResponse;
import com.smarthire.tenant.assessment.mapper.AssessmentMapper;
import com.smarthire.tenant.cv.service.CvAccess;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashSet;
import org.springframework.http.HttpStatus;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.annotation.Isolation;

@Service
public class SubmissionService {
    private final JobTestRepository tests;
    private final ApplicationRepository applications;
    private final SubmissionRepository submissions;
    private final QuestionRepository questions;
    private final OptionRepository options;
    private final AnswerRepository answers;
    private final CodingProblemRepository codingProblems;
    private final CvAccess access;
    private final AssessmentMapper mapper;
    private final AiInterviewRepository aiInterviews;
    private final JobRepository jobs;

    public SubmissionService(JobTestRepository tests, ApplicationRepository applications, SubmissionRepository submissions,
            QuestionRepository questions, OptionRepository options, AnswerRepository answers,
            CodingProblemRepository codingProblems, CvAccess access, AssessmentMapper mapper, AiInterviewRepository aiInterviews,
            JobRepository jobs) {
        this.tests = tests;
        this.applications = applications;
        this.submissions = submissions;
        this.questions = questions;
        this.options = options;
        this.answers = answers;
        this.codingProblems = codingProblems;
        this.access = access;
        this.mapper = mapper;
        this.aiInterviews = aiInterviews;
        this.jobs = jobs;
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public SubmissionResponse start(long testId, StartSubmissionRequest request) {
        User candidate = candidate();
        // Serialize starts on the paper so concurrent requests cannot create duplicate attempts.
        JobTest test = tests.findLockedById(testId).orElseThrow(this::notFound);
        Application application = applications.findById(request.applicationId()).orElseThrow(this::notFound);
        if (!application.getCandidate().getId().equals(candidate.getId())
                || !application.getJob().getId().equals(test.getJob().getId())) throw notFound();
        if (test.getAssignedApplication() != null && !test.getAssignedApplication().getId().equals(application.getId())) throw notFound();
        requireEligible(application);
        var previous = submissions.findLatestIds(testId, application.getId(), PageRequest.of(0, 1));
        Submission submission = previous.isEmpty() ? new Submission() : owned(previous.getFirst(), candidate);
        if (submission.getId() != null && submission.getStatus() != TestSubmissionStatus.NOT_STARTED) {
            expire(submission);
            return response(submission);
        }
        if (test.getStatus() != TestStatus.PUBLISHED || test.getJob().getDeletedAt() != null) {
            throw conflict("Test is not available", "TEST_UNAVAILABLE");
        }
        requireEligible(application);
        var paper = questions.findByTest_IdOrderByQuestionOrderAscIdAsc(testId);
        if (paper.isEmpty() || paper.stream().anyMatch(q -> !java.util.Set.of("MCQ", "MULTIPLE_CHOICE", "ESSAY").contains(q.getQuestionType()))
                || codingProblems.existsByTest_Id(testId)) {
            throw conflict("Test contains unsupported question types", "UNSUPPORTED_TEST");
        }
        submission.setTest(test);
        submission.setApplication(application);
        submission.setCandidate(candidate);
        submission.setStartedAt(Instant.now().truncatedTo(ChronoUnit.SECONDS));
        submission.setStatus(TestSubmissionStatus.IN_PROGRESS);
        return response(submissions.save(submission));
    }

    @Transactional(readOnly = true)
    public java.util.List<AvailableAssessmentResponse> available(long applicationId) {
        User candidate = candidate();
        Application application = applications.findById(applicationId).orElseThrow(this::notFound);
        if (!application.getCandidate().getId().equals(candidate.getId())) throw notFound();
        requireEligible(application);
        return tests.findByJob_IdAndStatusOrderByIdDesc(application.getJob().getId(), TestStatus.PUBLISHED).stream()
                .filter(test -> test.getAssignedApplication() == null || test.getAssignedApplication().getId().equals(applicationId))
                .map(test -> {
                    var ids = submissions.findLatestIds(test.getId(), applicationId, PageRequest.of(0, 1));
                    Submission latest = ids.isEmpty() ? null : submissions.findById(ids.getFirst()).orElse(null);
                    return new AvailableAssessmentResponse(test.getId(), test.getTitle(), test.getDescription(),
                            test.getDurationMinutes(), test.getPassingScore(), latest == null ? null : latest.getId(),
                            latest == null ? null : latest.getStatus());
                }).toList();
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public SubmissionResponse get(long id) {
        Submission submission = owned(id, candidate());
        requireEligible(submission.getApplication());
        expire(submission);
        return response(submission);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED, noRollbackFor = SubmissionExpiredException.class)
    public SubmissionResponse save(long id, SaveAnswersRequest request) {
        Submission submission = owned(id, candidate());
        if (expire(submission) || submission.getStatus() == TestSubmissionStatus.EXPIRED) {
            // Keep the expiration/score committed while rejecting the late payload.
            throw new SubmissionExpiredException();
        }
        if (submission.getStatus() != TestSubmissionStatus.IN_PROGRESS) {
            throw conflict("Submission is closed", "SUBMISSION_CLOSED");
        }
        requireEligible(submission.getApplication());
        var seen = new HashSet<Long>();
        var changed = new ArrayList<Answer>();
        for (var input : request.answers()) {
            if (!seen.add(input.questionId())) throw invalid("Duplicate questionId in answers");
            Question question = questions.findByIdAndTest_Id(input.questionId(), submission.getTest().getId())
                    .orElseThrow(() -> invalid("Question does not belong to this test"));
            Answer answer = answers.findBySubmission_IdAndQuestion_Id(id, question.getId()).orElseGet(Answer::new);
            answer.setSubmission(submission);
            answer.setQuestion(question);
            applyAnswer(answer, question, input);
            answer.setCorrect(null);
            answer.setScore(null);
            changed.add(answer);
        }
        answers.saveAll(changed);
        return response(submission);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public SubmissionResponse submit(long id) {
        Submission submission = owned(id, candidate());
        if (!expire(submission) && submission.getStatus() == TestSubmissionStatus.IN_PROGRESS) {
            requireEligible(submission.getApplication());
            grade(submission, false);
        } else if (submission.getStatus() != TestSubmissionStatus.GRADED
                && submission.getStatus() != TestSubmissionStatus.SUBMITTED
                && submission.getStatus() != TestSubmissionStatus.EXPIRED) {
            throw conflict("Submission cannot be submitted in its current state", "SUBMISSION_CLOSED");
        }
        return response(submission);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public SubmissionResponse staffResult(long id) {
        if (!access.staff()) throw new BusinessException("Staff access required", HttpStatus.FORBIDDEN, "ASSESSMENT_FORBIDDEN");
        access.actor();
        Submission submission = submissions.findLockedById(id).orElseThrow(this::notFound);
        access.requireJob(submission.getTest().getJob());
        expire(submission);
        return response(submission);
    }

    @Transactional(readOnly = true)
    public java.util.List<SubmissionSummaryResponse> staffList(long jobId) {
        if (!access.staff()) throw new BusinessException("Staff access required", HttpStatus.FORBIDDEN, "ASSESSMENT_FORBIDDEN");
        Job job = jobs.findById(jobId).orElseThrow(() ->
                new BusinessException("Job not found", HttpStatus.NOT_FOUND, "JOB_NOT_FOUND"));
        access.requireJob(job);
        Instant now = Instant.now();
        var totals = new java.util.HashMap<Long, Integer>();
        return submissions.findByJobId(jobId).stream().map(submission -> {
            JobTest test = submission.getTest();
            int totalPoints = totals.computeIfAbsent(test.getId(), id ->
                    questions.findByTest_IdOrderByQuestionOrderAscIdAsc(id).stream().mapToInt(Question::getPoints).sum());
            Instant expiresAt = submission.getStartedAt() == null ? null : deadline(submission);
            // Read-only view: overdue papers are reported as EXPIRED; they are finalized on the next locked access.
            boolean overdue = submission.getStatus() == TestSubmissionStatus.IN_PROGRESS
                    && expiresAt != null && !now.isBefore(expiresAt);
            TestSubmissionStatus status = overdue ? TestSubmissionStatus.EXPIRED : submission.getStatus();
            long remaining = status == TestSubmissionStatus.IN_PROGRESS && expiresAt != null
                    ? Math.max(0, expiresAt.getEpochSecond() - now.getEpochSecond()) : 0;
            BigDecimal score = overdue ? null : submission.getScore();
            BigDecimal threshold = test.getPassingScore();
            Boolean passed = threshold == null || score == null ? null : score.compareTo(threshold) >= 0;
            User candidate = submission.getCandidate();
            return new SubmissionSummaryResponse(submission.getId(), test.getId(), test.getTitle(),
                    submission.getApplication().getId(), candidate.getId(), candidate.getFullName(), candidate.getEmail(),
                    status, submission.getStartedAt(), expiresAt, overdue ? null : submission.getSubmittedAt(),
                    remaining, score, totalPoints, threshold, passed);
        }).toList();
    }

    private User candidate() {
        if (!access.candidate()) throw new BusinessException("Candidate access required", HttpStatus.FORBIDDEN, "ASSESSMENT_FORBIDDEN");
        return access.actor();
    }

    private Submission owned(long id, User candidate) {
        return submissions.findOwnedLocked(id, candidate.getId()).orElseThrow(this::notFound);
    }

    private void requireEligible(Application application) {
        if (!aiInterviews.existsByApplication_IdAndStatus(application.getId(), com.smarthire.domain.enums.AiInterviewStatus.PASSED)) {
            throw conflict("AI interview must be passed before accessing assessment", "AI_INTERVIEW_NOT_PASSED");
        }
        if (application.getArchivedAt() != null || application.getWithdrawnAt() != null
                || application.getJob().getDeletedAt() != null
                || application.getStatus() != ApplicationStatus.ASSESSMENT) {
            throw conflict("Application is not eligible for assessment", "APPLICATION_NOT_ELIGIBLE");
        }
    }

    private Instant deadline(Submission submission) {
        return submission.getStartedAt().plusSeconds(submission.getTest().getDurationMinutes() * 60L);
    }

    private boolean expire(Submission submission) {
        if (submission.getStatus() == TestSubmissionStatus.IN_PROGRESS
                && !Instant.now().isBefore(deadline(submission))) {
            grade(submission, true);
            return true;
        }
        return false;
    }

    private void grade(Submission submission, boolean expired) {
        BigDecimal total = BigDecimal.ZERO;
        boolean needsReview = questions.findByTest_IdOrderByQuestionOrderAscIdAsc(submission.getTest().getId())
                .stream().anyMatch(q -> "ESSAY".equals(q.getQuestionType()));
        var saved = answers.findBySubmission_IdOrderByQuestion_QuestionOrderAscQuestion_IdAsc(submission.getId());
        for (Answer answer : saved) {
            if ("ESSAY".equals(answer.getQuestion().getQuestionType())) {
                answer.setCorrect(null);
                answer.setScore(null);
                continue;
            }
            boolean correct;
            if ("MULTIPLE_CHOICE".equals(answer.getQuestion().getQuestionType())) {
                var expected = options.findByQuestion_IdOrderByIdAsc(answer.getQuestion().getId()).stream()
                        .filter(Option::isCorrect).map(Option::getId).collect(java.util.stream.Collectors.toSet());
                var selected = answer.getSelectedOptions().stream()
                        .map(row -> row.getOption().getId()).collect(java.util.stream.Collectors.toSet());
                correct = !expected.isEmpty() && expected.equals(selected);
            } else {
                correct = answer.getSelectedOption() != null && answer.getSelectedOption().isCorrect();
            }
            answer.setCorrect(correct);
            answer.setScore(correct ? BigDecimal.valueOf(answer.getQuestion().getPoints()) : BigDecimal.ZERO);
            total = total.add(answer.getScore());
        }
        answers.saveAll(saved);
        submission.setScore(needsReview ? null : total);
        submission.setSubmittedAt(expired ? deadline(submission) : Instant.now().truncatedTo(ChronoUnit.SECONDS));
        submission.setStatus(expired ? TestSubmissionStatus.EXPIRED
                : needsReview ? TestSubmissionStatus.SUBMITTED : TestSubmissionStatus.GRADED);
        submissions.save(submission);
    }

    private SubmissionResponse response(Submission submission) {
        var paper = questions.findByTest_IdOrderByQuestionOrderAscIdAsc(submission.getTest().getId());
        Instant now = Instant.now();
        Instant expiresAt = submission.getStartedAt() == null ? null : deadline(submission);
        long remaining = submission.getStatus() == TestSubmissionStatus.IN_PROGRESS && expiresAt != null
                ? Math.max(0, expiresAt.getEpochSecond() - now.getEpochSecond()) : 0;
        var saved = answers.findBySubmission_IdOrderByQuestion_QuestionOrderAscQuestion_IdAsc(submission.getId()).stream()
                .map(answer -> new SavedAnswer(answer.getQuestion().getId(),
                        answer.getSelectedOption() == null ? null : answer.getSelectedOption().getId(),
                        answer.getSelectedOptions().stream().map(row -> row.getOption().getId()).sorted().toList(),
                        answer.getAnswerText())).toList();
        BigDecimal threshold = submission.getTest().getPassingScore();
        Boolean passed = threshold == null || submission.getScore() == null ? null : submission.getScore().compareTo(threshold) >= 0;
        return new SubmissionResponse(submission.getId(), submission.getTest().getId(), submission.getApplication().getId(),
                submission.getTest().getTitle(), submission.getStatus(), submission.getStartedAt(), expiresAt,
                submission.getSubmittedAt(), now, remaining, submission.getScore(),
                paper.stream().mapToInt(Question::getPoints).sum(), passed,
                paper.stream().map(q -> mapper.candidateQuestion(q, options.findByQuestion_IdOrderByIdAsc(q.getId()))).toList(), saved);
    }

    private void applyAnswer(Answer answer, Question question, SaveAnswersRequest.AnswerInput input) {
        var ids = input.selectedOptionIds() == null ? java.util.List.<Long>of() : input.selectedOptionIds();
        String type = question.getQuestionType();
        if ("ESSAY".equals(type)) {
            if (input.selectedOptionId() != null || !ids.isEmpty()) throw invalid("Essay answers cannot select options");
            if (input.answerText() != null && input.answerText().length() > 10000) throw invalid("Essay answer is too long");
            answer.setSelectedOption(null);
            answer.getSelectedOptions().clear();
            answer.setAnswerText(input.answerText());
        } else if ("MCQ".equals(type)) {
            if (!ids.isEmpty() || input.answerText() != null) throw invalid("MCQ requires selectedOptionId only");
            answer.setSelectedOption(input.selectedOptionId() == null ? null : option(question, input.selectedOptionId()));
            answer.getSelectedOptions().clear();
            answer.setAnswerText(null);
        } else if ("MULTIPLE_CHOICE".equals(type)) {
            if (input.selectedOptionId() != null || input.answerText() != null) throw invalid("Multiple-choice requires selectedOptionIds only");
            if (ids.size() > 10 || ids.stream().anyMatch(java.util.Objects::isNull) || new HashSet<>(ids).size() != ids.size()) throw invalid("Invalid or duplicate selectedOptionIds");
            var selected = ids.stream().map(id -> option(question, id)).toList();
            answer.setSelectedOption(null);
            answer.setAnswerText(null);
            replaceSelectedOptions(answer, selected);
        } else {
            throw invalid("Unsupported question type");
        }
    }

    private void replaceSelectedOptions(Answer answer, java.util.Collection<Option> options) {
        // Diff instead of clear+re-add: Hibernate flushes inserts before orphan deletes,
        // so re-adding a kept (answer_id, option_id) row would collide with its own primary key.
        var wanted = options.stream().map(Option::getId).collect(java.util.stream.Collectors.toSet());
        answer.getSelectedOptions().removeIf(row -> !wanted.contains(row.getOption().getId()));
        var kept = answer.getSelectedOptions().stream()
                .map(row -> row.getOption().getId()).collect(java.util.stream.Collectors.toSet());
        for (Option option : options) {
            if (kept.contains(option.getId())) continue;
            answer.getSelectedOptions().add(AnswerSelectedOption.builder()
                    .answer(answer)
                    .option(option)
                    .build());
        }
    }

    private Option option(Question question, Long id) {
        return options.findByIdAndQuestion_Id(id, question.getId())
                .orElseThrow(() -> invalid("Option does not belong to this question"));
    }

    private BusinessException notFound() {
        return new BusinessException("Assessment resource not found", HttpStatus.NOT_FOUND, "ASSESSMENT_NOT_FOUND");
    }

    private BusinessException conflict(String message, String code) {
        return new BusinessException(message, HttpStatus.CONFLICT, code);
    }

    private BusinessException invalid(String message) {
        return new BusinessException(message, HttpStatus.BAD_REQUEST, "INVALID_ANSWERS");
    }
}
