package com.smarthire.tenant.assessment.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.TestSubmissionStatus;
import com.smarthire.domain.tenant.entity.ProctorEvent;
import com.smarthire.domain.tenant.entity.ProctorReport;
import com.smarthire.domain.tenant.repository.ProctorEventRepository;
import com.smarthire.domain.tenant.repository.ProctorReportRepository;
import com.smarthire.domain.tenant.repository.SubmissionRepository;
import com.smarthire.tenant.assessment.dto.request.AssessmentProctorEventRequest;
import com.smarthire.tenant.cv.service.CvAccess;
import java.util.Map;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AssessmentProctorService {
    private static final Set<String> ALLOWED = Set.of(
            "FULLSCREEN_EXIT", "PAGE_HIDDEN", "WINDOW_BLUR", "COPY_ATTEMPT", "PASTE_ATTEMPT",
            "CONTEXT_MENU", "BLOCKED_SHORTCUT", "CAMERA_LOST", "MICROPHONE_LOST", "SCREEN_SHARE_STOPPED",
            "MULTI_FACE", "LOST_FACE");
    private final SubmissionRepository submissions;
    private final ProctorEventRepository events;
    private final ProctorReportRepository reports;
    private final CvAccess access;
    private final ObjectMapper json;

    public AssessmentProctorService(SubmissionRepository submissions, ProctorEventRepository events,
            ProctorReportRepository reports, CvAccess access, ObjectMapper json) {
        this.submissions = submissions; this.events = events; this.reports = reports; this.access = access; this.json = json;
    }

    @Transactional
    public void record(long submissionId, AssessmentProctorEventRequest request) {
        if (!access.candidate()) throw new BusinessException("Candidate access required", HttpStatus.FORBIDDEN, "ASSESSMENT_FORBIDDEN");
        var candidate = access.candidateActor();
        var submission = submissions.findOwnedLocked(submissionId, candidate.getId())
                .orElseThrow(() -> new BusinessException("Submission not found", HttpStatus.NOT_FOUND, "ASSESSMENT_NOT_FOUND"));
        if (submission.getStatus() != TestSubmissionStatus.IN_PROGRESS)
            throw new BusinessException("Submission closed", HttpStatus.CONFLICT, "SUBMISSION_CLOSED");
        if (!ALLOWED.contains(request.event()))
            throw new BusinessException("Unsupported proctor event", HttpStatus.BAD_REQUEST, "INVALID_PROCTOR_EVENT");
        var event = new ProctorEvent();
        event.setSubmission(submission);
        event.setEventType(request.event());
        try {
            event.setPayloadJson(json.createObjectNode().put("detail", request.detail() == null ? "" : request.detail()).toString());
        } catch (Exception ignored) {
            event.setPayloadJson(null);
        }
        events.save(event);
        var risk = ProctorRisk.of(events.findBySubmission_IdOrderByCreatedAtAsc(submission.getId()));
        var report = reports.findBySubmission_Id(submission.getId()).orElseGet(() -> ProctorReport.builder().submission(submission).build());
        report.setRiskScore(risk.score());
        report.setSummaryJson(json.valueToTree(Map.of("level", risk.level(), "counts", risk.counts())).toString());
        reports.save(report);
    }
}
