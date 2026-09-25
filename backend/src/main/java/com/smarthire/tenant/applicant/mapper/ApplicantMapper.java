package com.smarthire.tenant.applicant.mapper;

import com.smarthire.domain.tenant.entity.Application;
import com.smarthire.domain.tenant.entity.ApplicationStatusHistory;
import com.smarthire.domain.tenant.entity.Cv;
import com.smarthire.tenant.applicant.dto.ApplicantModels.ApplicationDetail;
import com.smarthire.tenant.applicant.dto.ApplicantModels.ApplicationSummary;
import com.smarthire.tenant.applicant.dto.ApplicantModels.CvRef;
import com.smarthire.tenant.applicant.dto.ApplicantModels.GateScoreView;
import com.smarthire.tenant.applicant.dto.ApplicantModels.ScreeningRoundsView;
import com.smarthire.tenant.applicant.dto.ApplicantModels.HistoryView;
import java.time.Instant;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class ApplicantMapper {

    public ApplicationSummary summary(Application application, boolean duplicate) {
        var job = application.getJob();
        var candidate = application.getCandidate();
        var assignee = application.getAssignee();
        return new ApplicationSummary(
                application.getId(),
                job.getId(),
                job.getTitle(),
                candidate.getId(),
                candidate.getFullName(),
                candidate.getEmail(),
                application.getStage() == null ? null : application.getStage().getId(),
                application.getStatus().name(),
                application.getSource(),
                application.getReferralCode(),
                application.getTags(),
                assignee == null ? null : assignee.getFullName(),
                application.getArchivedAt() != null,
                duplicate,
                application.getCreatedAt(),
                job.getLocation(),
                job.getDepartment(),
                job.getWorkMode(),
                job.getEmploymentType());
    }

    public ApplicationDetail detail(
            Application application,
            long candidateApplicationCount,
            List<Cv> cvs,
            List<ApplicationStatusHistory> history,
            GateScoreView gateScore,
            ScreeningRoundsView rounds) {
        var job = application.getJob();
        var candidate = application.getCandidate();
        var assignee = application.getAssignee();
        return new ApplicationDetail(
                application.getId(),
                job.getId(),
                job.getTitle(),
                candidate.getId(),
                candidate.getFullName(),
                candidate.getEmail(),
                application.getStage() == null ? null : application.getStage().getId(),
                application.getStatus().name(),
                application.getSource(),
                application.getReferralCode(),
                application.getTags(),
                application.getNotes(),
                application.getRejectReason(),
                assignee == null ? null : assignee.getId(),
                assignee == null ? null : assignee.getFullName(),
                application.getArchivedAt() != null,
                application.getArchivedAt(),
                application.getWithdrawnAt(),
                application.getCreatedAt(),
                candidateApplicationCount,
                cvs.stream().map(this::cv).toList(),
                history.stream().map(this::history).toList(),
                job.getLocation(),
                job.getDepartment(),
                job.getWorkMode(),
                job.getEmploymentType(),
                gateScore,
                rounds);
    }

    public CvRef cv(Cv cv) {
        boolean expired = cv.getRetainUntil() != null && Instant.now().isAfter(cv.getRetainUntil());
        return new CvRef(cv.getId(), cv.getOriginalFilename(), cv.getStatus().name(), cv.getCreatedAt(), cv.getRetainUntil(), expired);
    }

    public HistoryView history(ApplicationStatusHistory row) {
        return new HistoryView(row.getFromStatus(), row.getToStatus(), row.getNote(), row.getCreatedAt(), row.getChangedBy());
    }
}
