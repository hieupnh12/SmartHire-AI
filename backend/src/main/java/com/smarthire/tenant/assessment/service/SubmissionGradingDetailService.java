package com.smarthire.tenant.assessment.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.NotificationCategory;
import com.smarthire.domain.enums.NotificationStatus;
import com.smarthire.domain.enums.TestSubmissionStatus;
import com.smarthire.domain.tenant.entity.EmailOutbox;
import com.smarthire.domain.tenant.entity.Submission;
import com.smarthire.domain.tenant.repository.*;
import com.smarthire.tenant.assessment.dto.request.UpdateGradingRequest;
import com.smarthire.tenant.assessment.dto.response.SubmissionGradingDetailResponse;
import com.smarthire.tenant.cv.service.CvAccess;
import com.smarthire.tenant.notification.service.NotificationPreferenceService;
import java.math.BigDecimal;
import java.util.HashSet;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class SubmissionGradingDetailService {
    private final SubmissionRepository submissions;
    private final QuestionRepository questions;
    private final AnswerRepository answers;
    private final EmailOutboxRepository emails;
    private final ProctorEventRepository proctorEvents;
    private final AssessmentGradingService grading;
    private final SubmissionService submissionService;
    private final CvAccess access;
    private final NotificationPreferenceService preferences;

    public SubmissionGradingDetailService(SubmissionRepository submissions, QuestionRepository questions,
            AnswerRepository answers, EmailOutboxRepository emails, ProctorEventRepository proctorEvents,
            AssessmentGradingService grading, SubmissionService submissionService, CvAccess access,
            NotificationPreferenceService preferences) {
        this.submissions = submissions; this.questions = questions; this.answers = answers; this.emails = emails;
        this.proctorEvents = proctorEvents; this.grading = grading; this.submissionService = submissionService;
        this.access = access; this.preferences = preferences;
    }

    private Submission completed(long id) {
        if (!access.staff()) throw new BusinessException("Staff access required", HttpStatus.FORBIDDEN, "ASSESSMENT_FORBIDDEN");
        access.actor();
        submissionService.staffResult(id);
        var submission = submissions.findLockedById(id).orElseThrow(() -> new BusinessException("Submission not found", HttpStatus.NOT_FOUND, "ASSESSMENT_NOT_FOUND"));
        access.requireJob(submission.getTest().getJob());
        if (submission.getStatus() == TestSubmissionStatus.NOT_STARTED || submission.getStatus() == TestSubmissionStatus.IN_PROGRESS)
            throw conflict("Submit before reviewing", "SUBMISSION_NOT_SUBMITTED");
        return submission;
    }

    @Transactional
    public SubmissionGradingDetailResponse detail(long id) {
        return response(completed(id));
    }

    private SubmissionGradingDetailResponse response(Submission submission) {
        var paper = questions.findByTest_IdOrderByQuestionOrderAscIdAsc(submission.getTest().getId());
        var objective = paper.stream().filter(SubmissionService::isObjective).toList();
        var saved = answers.findBySubmission_IdOrderByQuestion_QuestionOrderAscQuestion_IdAsc(submission.getId());
        var objectiveAnswers = saved.stream().filter(answer -> SubmissionService.isObjective(answer.getQuestion())).toList();
        var candidate = submission.getCandidate();
        boolean canEmail = candidate.getEmail() != null && !candidate.getEmail().isBlank()
                && !preferences.emailOff(candidate, NotificationCategory.ASSESSMENT);
        var proctor = proctorEvents.findBySubmission_IdOrderByCreatedAtAsc(submission.getId());
        var integrity = new SubmissionGradingDetailResponse.Integrity(proctor.size(),
                proctor.stream().map(event -> new SubmissionGradingDetailResponse.ProctorRow(event.getEventType(), event.getCreatedAt(),
                        event.getPayloadJson())).toList(),
                saved.stream().filter(answer -> answer.getCustomRunCount() > 0)
                        .map(answer -> new SubmissionGradingDetailResponse.CustomRunRow(answer.getQuestion().getId(),
                                answer.getQuestion().getQuestionText(), answer.getCustomRunCount())).toList());
        return new SubmissionGradingDetailResponse(submission.getId(), submission.getTest().getTitle(), candidate.getFullName(), candidate.getEmail(),
                submission.getStatus(), submission.getScore(), paper.stream().mapToInt(question -> question.getPoints()).sum(), submission.getTest().getPassingScore(), canEmail,
                new SubmissionGradingDetailResponse.ObjectiveSummary((int) objectiveAnswers.stream().filter(answer -> Boolean.TRUE.equals(answer.getCorrect())).count(), objective.size(),
                    objectiveAnswers.stream().map(answer -> answer.getScore() == null ? BigDecimal.ZERO : answer.getScore()).reduce(BigDecimal.ZERO, BigDecimal::add),
                    objective.stream().mapToInt(question -> question.getPoints()).sum()), grading.reviews(submission.getId()), integrity);
    }

    @Transactional
    public SubmissionGradingDetailResponse update(long id, UpdateGradingRequest request) {
        var submission = completed(id);
        var ids = new HashSet<Long>();
        for (var decision : request.decisions()) {
            if (!ids.add(decision.questionId())) throw new BusinessException("Duplicate question decisions", HttpStatus.BAD_REQUEST, "INVALID_GRADE");
            grading.approve(id, decision.questionId(), decision.score());
        }
        // Every approval joins this transaction; a later invalid score rolls back the whole update.
        return response(submission);
    }

    public record EmailReceipt(long id, NotificationStatus status) {}

    @Transactional
    public EmailReceipt sendResult(long id) {
        var submission = completed(id);
        var saved = answers.findBySubmission_IdOrderByQuestion_QuestionOrderAscQuestion_IdAsc(id);
        var paper = questions.findByTest_IdOrderByQuestionOrderAscIdAsc(submission.getTest().getId());
        if (submission.getScore() == null || saved.stream().anyMatch(answer -> answer.getScore() == null
                || (!SubmissionService.isObjective(answer.getQuestion()) && answer.getReviewedAt() == null))
                || paper.stream().filter(question -> !SubmissionService.isObjective(question)).anyMatch(question -> saved.stream()
                    .noneMatch(answer -> question.getId().equals(answer.getQuestion().getId()) && answer.getReviewedAt() != null && answer.getScore() != null)))
            throw conflict("Approve every subjective score before notifying the candidate", "GRADING_INCOMPLETE");
        var candidate = submission.getCandidate();
        if (candidate.getEmail() == null || candidate.getEmail().isBlank()) throw conflict("Candidate email unavailable", "EMAIL_UNAVAILABLE");
        if (preferences.emailOff(candidate, NotificationCategory.ASSESSMENT)) throw conflict("Candidate disabled assessment emails", "EMAIL_DISABLED");
        int total = paper.stream().mapToInt(question -> question.getPoints()).sum();
        String rawSubject = "Kết quả bài đánh giá: " + submission.getTest().getTitle();
        String subject = rawSubject.substring(0, Math.min(255, rawSubject.length()));
        String result = submission.getTest().getPassingScore() == null ? "Đã chấm điểm"
                : submission.getScore().compareTo(submission.getTest().getPassingScore()) >= 0 ? "Đạt yêu cầu" : "Chưa đạt yêu cầu";
        String body = "Chào " + candidate.getFullName() + ",\n\nBài đánh giá của bạn đã được duyệt.\n"
                + "Bài: " + submission.getTest().getTitle() + "\nLượt làm: #" + id + "\nĐiểm: "
                + submission.getScore().stripTrailingZeros().toPlainString() + "/" + total + "\nKết quả: " + result
                + "\n\nĐăng nhập vào workspace và mở mục Bài kiểm tra để xem kết quả chính thức.";
        String reference = "assessment-result:" + id;
        var existing = emails.findFirstByPurposeAndReferenceKeyOrderByIdDesc("ASSESSMENT_RESULT", reference)
                .or(() -> emails.findFirstByPurposeAndToEmailAndSubjectAndBodyOrderByIdDesc("ASSESSMENT_RESULT", candidate.getEmail(), subject, body));
        if (existing.isPresent()) {
            var email = existing.get();
            if (email.getReferenceKey() == null) email.setReferenceKey(reference);
            if (email.getStatus() == NotificationStatus.FAILED || email.getStatus() == NotificationStatus.PENDING) {
                // Refresh body/subject if score changed and re-queue failed or stuck pending rows.
                email.setSubject(subject);
                email.setBody(body);
                email.setToEmail(candidate.getEmail());
                if (email.getStatus() == NotificationStatus.FAILED) {
                    email.setAttempts(0);
                    email.setStatus(NotificationStatus.PENDING);
                }
            }
            return new EmailReceipt(email.getId(), email.getStatus());
        }
        var email = emails.save(EmailOutbox.builder().purpose("ASSESSMENT_RESULT").referenceKey(reference)
                .toEmail(candidate.getEmail()).subject(subject).body(body).build());
        return new EmailReceipt(email.getId(), email.getStatus());
    }

    @Transactional
    public void sendResultEmailSilently(long id) {
        try {
            var submission = submissions.findById(id).orElse(null);
            if (submission == null || submission.getScore() == null) return;
            var candidate = submission.getCandidate();
            if (candidate == null || candidate.getEmail() == null || candidate.getEmail().isBlank()) return;
            if (preferences.emailOff(candidate, NotificationCategory.ASSESSMENT)) return;

            var paper = questions.findByTest_IdOrderByQuestionOrderAscIdAsc(submission.getTest().getId());
            int total = paper.stream().mapToInt(com.smarthire.domain.tenant.entity.Question::getPoints).sum();
            String rawSubject = "Kết quả bài đánh giá: " + submission.getTest().getTitle();
            String subject = rawSubject.substring(0, Math.min(255, rawSubject.length()));
            String result = submission.getTest().getPassingScore() == null ? "Đã chấm điểm"
                    : submission.getScore().compareTo(submission.getTest().getPassingScore()) >= 0 ? "Đạt yêu cầu" : "Chưa đạt yêu cầu";
            String body = "Chào " + candidate.getFullName() + ",\n\nBài đánh giá của bạn đã được chấm tự động.\n"
                    + "Bài: " + submission.getTest().getTitle() + "\nLượt làm: #" + id + "\nĐiểm: "
                    + submission.getScore().stripTrailingZeros().toPlainString() + "/" + total + "\nKết quả: " + result
                    + "\n\nĐăng nhập vào workspace và mở mục Bài kiểm tra để xem kết quả chính thức.";
            String reference = "assessment-result:" + id;
            var existing = emails.findFirstByPurposeAndReferenceKeyOrderByIdDesc("ASSESSMENT_RESULT", reference);
            if (existing.isEmpty()) {
                emails.save(EmailOutbox.builder().purpose("ASSESSMENT_RESULT").referenceKey(reference)
                        .toEmail(candidate.getEmail()).subject(subject).body(body)
                        .status(NotificationStatus.PENDING).attempts(0).build());
            }
        } catch (Exception ignored) {
            // Do not fail auto-grading flow on notification delivery issue
        }
    }

    private BusinessException conflict(String message, String code) { return new BusinessException(message, HttpStatus.CONFLICT, code); }
}
