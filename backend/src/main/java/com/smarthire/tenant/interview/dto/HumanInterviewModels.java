package com.smarthire.tenant.interview.dto;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
public final class HumanInterviewModels {
    private HumanInterviewModels() {}
    public record ParticipantInput(@NotNull @Positive Long userId, @NotBlank @Pattern(regexp="LEAD|CO_INTERVIEWER|NOTE_TAKER") String role) {}
    public record SaveRequest(@Positive long jobId, @Positive long applicationId,
        @NotBlank @Pattern(regexp="TECHNICAL|CULTURE|EXECUTIVE") String round,
        @NotBlank @Pattern(regexp="ONLINE|OFFLINE") String mode,
        @NotNull Instant start, @NotNull Instant end,
        @Size(max=512) String meetingUrl, @Size(max=255) String location,
        @NotBlank @Pattern(regexp="GOOGLE_MEET|ZOOM|TEAMS|OFFICE") String provider,
        @NotBlank @Pattern(regexp="TECHNICAL|CULTURE|GENERAL") String rubric,
        @NotBlank @Pattern(regexp="STANDARD|EXPRESS|EXECUTIVE") String emailTemplate,
        @Size(max=2000) String notes, boolean attachCalendar, boolean smsReminder, boolean draft,
        @NotEmpty @Size(max=10) List<@Valid ParticipantInput> participants) {}
    public record Configuration(String rubric, String provider, String emailTemplate, String notes,
        boolean attachCalendar, String rescheduleReason, Instant requestedStart, Instant requestedEnd) {}
    public record ParticipantView(long userId, String name, String email, String role) {}
    public record EvaluationView(long id, long evaluatorId, String evaluatorName, BigDecimal technicalScore,
        BigDecimal communicationScore, BigDecimal cultureScore, BigDecimal overallScore,
        String comments, String recommendation, Instant createdAt) {}
    public record InterviewView(long id, long applicationId, long jobId, String jobTitle,
        long candidateId, String candidateName, String candidateEmail, String round, String mode, String status,
        Instant start, Instant end, String meetingUrl, String location, Configuration configuration,
        List<ParticipantView> participants, List<EvaluationView> evaluations) {}
    public record PageResult(List<InterviewView> items, long total, int page, int size) {}
    public record Summary(long monthTotal, long previousMonthTotal, long todayTotal, long todayOnline,
        long todayOffline, long pendingConfirmation, long pendingScorecards) {}
    public record CandidateOption(long applicationId, long candidateId, String name, String email, String jobTitle) {}
    public record Choice(String code, String label) {}
    public record Options(List<CandidateOption> candidates, List<ParticipantView> interviewers,
        List<Choice> rounds, List<Choice> rubrics, List<Choice> emailTemplates, boolean automaticMeetings, boolean smsReminders) {}
    public record AvailabilityRequest(@Positive long jobId, @NotNull Instant start, @NotNull Instant end,
        @NotEmpty @Size(max=11) List<@Positive Long> userIds, Long excludeId) {}
    public record ConflictView(long interviewId, Instant start, Instant end, List<Long> userIds) {}
    public record Availability(boolean available, List<ConflictView> conflicts) {}
    public record RescheduleRequest(@NotNull Instant start, @NotNull Instant end, @NotBlank @Size(max=2000) String reason) {}
    public record EvaluationRequest(@NotNull @DecimalMin("0") @DecimalMax("100") BigDecimal technicalScore,
        @NotNull @DecimalMin("0") @DecimalMax("100") BigDecimal communicationScore,
        @NotNull @DecimalMin("0") @DecimalMax("100") BigDecimal cultureScore,
        @Size(max=4000) String comments, @NotBlank @Pattern(regexp="STRONG_HIRE|HIRE|NO_HIRE|STRONG_NO_HIRE") String recommendation) {}
    public record BulkRequest(@NotEmpty @Size(max=100) List<@Positive Long> ids,
        @NotBlank @Pattern(regexp="REMIND|CANCEL|RESCHEDULE") String action, @Min(-10080) @Max(10080) Integer shiftMinutes) {}
    public record BulkResult(int affected) {}
    public record EmailPreview(String subject, String body) {}
}
