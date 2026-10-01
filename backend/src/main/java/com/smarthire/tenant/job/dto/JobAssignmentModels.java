package com.smarthire.tenant.job.dto;

import jakarta.validation.constraints.NotNull;
import java.time.Instant;
import java.util.List;

public final class JobAssignmentModels {
    private JobAssignmentModels() {}

    public record AssignRecruiterRequest(
            @NotNull Long userId,
            Boolean canView,
            Boolean canEdit,
            String assignmentRole) {
        public AssignRecruiterRequest(Long userId, String assignmentRole) {
            this(userId, true, "COLLABORATOR".equalsIgnoreCase(assignmentRole) || "OWNER".equalsIgnoreCase(assignmentRole), assignmentRole);
        }
    }

    public record UpdateAssignmentRequest(
            Boolean canView,
            Boolean canEdit,
            String assignmentRole) {
        public UpdateAssignmentRequest(String assignmentRole) {
            this(true, "COLLABORATOR".equalsIgnoreCase(assignmentRole) || "OWNER".equalsIgnoreCase(assignmentRole), assignmentRole);
        }
    }

    /** Request body for POST /jobs/{id}/transfer-owner */
    public record TransferOwnerRequest(@NotNull Long newOwnerId) {}

    public record JobAssignmentResponse(
            long id,
            long jobId,
            long userId,
            String fullName,
            String email,
            String role,
            boolean canView,
            boolean canEdit,
            boolean isCreator,
            String assignmentRole,
            Instant assignedAt,
            String assignedByName) {}

    public record JobAssignmentList(List<JobAssignmentResponse> items) {}

    public record StaffAssignmentResponse(
            long jobId,
            String title,
            String status,
            boolean canView,
            boolean canEdit,
            String assignmentRole) {}
}
