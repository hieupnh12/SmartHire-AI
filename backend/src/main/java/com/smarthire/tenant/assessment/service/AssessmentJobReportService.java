package com.smarthire.tenant.assessment.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.TestSubmissionStatus;
import com.smarthire.domain.tenant.entity.Answer;
import com.smarthire.domain.tenant.entity.Question;
import com.smarthire.domain.tenant.entity.Submission;
import com.smarthire.domain.tenant.repository.*;
import com.smarthire.tenant.assessment.dto.response.AssessmentJobReportResponse;
import com.smarthire.tenant.assessment.dto.response.AssessmentJobReportResponse.AttemptStat;
import com.smarthire.tenant.assessment.dto.response.AssessmentJobReportResponse.QuestionStat;
import com.smarthire.tenant.cv.service.CvAccess;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AssessmentJobReportService {
    private final JobRepository jobs;
    private final SubmissionRepository submissions;
    private final QuestionRepository questions;
    private final AnswerRepository answers;
    private final ProctorEventRepository proctorEvents;
    private final CvAccess access;

    public AssessmentJobReportService(JobRepository jobs, SubmissionRepository submissions, QuestionRepository questions,
            AnswerRepository answers, ProctorEventRepository proctorEvents, CvAccess access) {
        this.jobs = jobs; this.submissions = submissions; this.questions = questions; this.answers = answers;
        this.proctorEvents = proctorEvents; this.access = access;
    }

    @Transactional(readOnly = true)
    public AssessmentJobReportResponse report(long jobId) {
        if (!access.staff()) throw new BusinessException("Staff access required", HttpStatus.FORBIDDEN, "ASSESSMENT_FORBIDDEN");
        var job = jobs.findById(jobId).orElseThrow(() -> new BusinessException("Job not found", HttpStatus.NOT_FOUND, "JOB_NOT_FOUND"));
        access.requireJob(job);
        List<Submission> attempts = submissions.findByJobId(jobId).stream()
                .filter(s -> s.getStatus() == TestSubmissionStatus.SUBMITTED
                        || s.getStatus() == TestSubmissionStatus.GRADED
                        || s.getStatus() == TestSubmissionStatus.EXPIRED)
                .toList();
        Map<Long, Agg> byQuestion = new HashMap<>();
        List<AttemptStat> attemptStats = new ArrayList<>();
        for (Submission submission : attempts) {
            var paper = questions.findByTest_IdOrderByQuestionOrderAscIdAsc(submission.getTest().getId());
            var saved = answers.findBySubmission_IdOrderByQuestion_QuestionOrderAscQuestion_IdAsc(submission.getId());
            int customRuns = saved.stream().mapToInt(Answer::getCustomRunCount).sum();
            int proctorCount = (int) proctorEvents.countBySubmission_Id(submission.getId());
            Long duration = null;
            if (submission.getStartedAt() != null && submission.getSubmittedAt() != null) {
                duration = Math.max(0, submission.getSubmittedAt().getEpochSecond() - submission.getStartedAt().getEpochSecond());
            }
            int totalPoints = paper.stream().mapToInt(Question::getPoints).sum();
            attemptStats.add(new AttemptStat(submission.getId(), submission.getTest().getId(), submission.getTest().getTitle(),
                    submission.getCandidate().getFullName(), submission.getStatus().name(), submission.getScore(), totalPoints,
                    duration, customRuns, proctorCount));
            for (Answer answer : saved) {
                if (answer.getScore() == null) continue;
                Question question = answer.getQuestion();
                Agg agg = byQuestion.computeIfAbsent(question.getId(), id -> new Agg(question));
                agg.graded++;
                agg.scoreSum = agg.scoreSum.add(answer.getScore());
                if (answer.getScore().compareTo(BigDecimal.valueOf(question.getPoints())) >= 0) agg.fullCredit++;
            }
        }
        List<QuestionStat> questionStats = byQuestion.values().stream().map(agg -> {
            double passRate = agg.graded == 0 ? 0 : agg.fullCredit * 100.0 / agg.graded;
            Double avg = agg.graded == 0 ? null : agg.scoreSum.multiply(BigDecimal.valueOf(100))
                    .divide(BigDecimal.valueOf(agg.points * (double) agg.graded), 2, RoundingMode.HALF_UP).doubleValue();
            return new QuestionStat(agg.questionId, agg.type, agg.points, agg.graded, agg.fullCredit,
                    Math.round(passRate * 10) / 10.0, avg);
        }).toList();
        return new AssessmentJobReportResponse(jobId, questionStats, attemptStats);
    }

    private static final class Agg {
        final long questionId; final String type; final int points;
        long graded; long fullCredit; BigDecimal scoreSum = BigDecimal.ZERO;
        Agg(Question question) {
            this.questionId = question.getId();
            this.type = question.getQuestionType();
            this.points = question.getPoints();
        }
    }
}
