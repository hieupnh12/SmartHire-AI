package com.smarthire.tenant.job.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.List;

public final class JobAssignmentModels {
    private JobAssignmentModels() {}

    public record AssignRecruiterRequest(
            @NotNull Long userId,
            @NotBlank String assignmentRole) {}

    public record UpdateAssignmentRequest(@NotBlank String assignmentRole) {}

    public record JobAssignmentResponse(
            long id,
            long jobId,
            long userId,
            String fullName,
            String email,
            String role,
            String assignmentRole,
            Instant assignedAt,
            String assignedByName) {}

    public record JobAssignmentList(List<JobAssignmentResponse> items) {}

    public record StaffAssignmentResponse(
            long jobId,
            String title,
            String status,
            String assignmentRole) {}
}
