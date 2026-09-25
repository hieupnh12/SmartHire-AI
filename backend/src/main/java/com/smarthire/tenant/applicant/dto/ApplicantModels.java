package com.smarthire.tenant.applicant.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class ApplicantModels {
    private ApplicantModels() {}

    public record ApplyRequest(String source, String referralCode) {}

    public record ManualCreateRequest(
            @NotBlank @Email String email,
            @NotBlank String fullName,
            String source,
            String referralCode,
            String notes,
            String tags) {}

    public record PatchRequest(
            String notes,
            String tags,
            String assigneeEmail,
            String source,
            String referralCode) {}

    public record StatusRequest(String status, String note) {}

    public record PageResult<T>(List<T> items, int page, int size, long total) {}

    public record CvRef(
            long id,
            String originalFilename,
            String status,
            Instant createdAt,
            Instant retainUntil,
            boolean expired) {}

    public record HistoryView(String fromStatus, String toStatus, String note, Instant createdAt, Long changedBy) {}

    public record ApplicationSummary(
            long id,
            long jobId,
            String jobTitle,
            long candidateId,
            String candidateName,
            String candidateEmail,
            Long stageId,
            String status,
            String source,
            String referralCode,
            String tags,
            String assigneeName,
            boolean archived,
            boolean duplicate,
            Instant createdAt,
            String jobLocation,
            String jobDepartment,
            String jobWorkMode,
            String jobEmploymentType) {}

    public record ApplicationDetail(
            long id,
            long jobId,
            String jobTitle,
            long candidateId,
            String candidateName,
            String candidateEmail,
            Long stageId,
            String status,
            String source,
            String referralCode,
            String tags,
            String notes,
            String rejectReason,
            Long assigneeId,
            String assigneeName,
            boolean archived,
            Instant archivedAt,
            Instant withdrawnAt,
            Instant createdAt,
            long candidateApplicationCount,
            List<CvRef> cvs,
            List<HistoryView> history,
            String jobLocation,
            String jobDepartment,
            String jobWorkMode,
            String jobEmploymentType,
            GateScoreView gateScore,
            ScreeningRoundsView rounds) {}

    public record ScreeningRoundsView(
            RoundItemView cv,
            RoundItemView aiInterview,
            RoundItemView assessment,
            Instant aiInterviewInvitedAt) {}

    public record RoundItemView(
            String status,
            BigDecimal score,
            BigDecimal threshold,
            Boolean passed,
            BigDecimal weight) {}

    public record GateScoreView(
            BigDecimal score,
            boolean passed,
            boolean complete,
            BigDecimal cvScore,
            BigDecimal aiInterviewScore,
            BigDecimal assessmentScore,
            BigDecimal cvWeight,
            BigDecimal aiInterviewWeight,
            BigDecimal assessmentWeight,
            BigDecimal passThreshold) {}
}
