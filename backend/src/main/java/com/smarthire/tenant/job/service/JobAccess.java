package com.smarthire.tenant.job.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.AssignmentRole;
import com.smarthire.domain.enums.RecruiterFeature;
import com.smarthire.domain.enums.UserRole;
import com.smarthire.domain.tenant.entity.Job;
import com.smarthire.domain.tenant.entity.JobAssignment;
import com.smarthire.domain.tenant.repository.JobAssignmentRepository;
import com.smarthire.domain.tenant.repository.JobRepository;
import com.smarthire.tenant.auth.service.RolePermissionService;
import com.smarthire.tenant.cv.service.CvAccess;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

/**
 * Central job-level access control.
 *
 * <p>Design rules:
 * <ul>
 *   <li>TENANT_ADMIN / ADMIN always bypasses all checks.</li>
 *   <li>Users with {@code JOBS_ALL} permission can view any job in the company.</li>
 *   <li>The creator of a job ({@code created_by}) always has full view & edit rights.</li>
 *   <li>Other users can view or edit only if explicitly granted {@code canView} or {@code canEdit}.</li>
 * </ul>
 */
@Service
public class JobAccess {

    private final CvAccess cvAccess;
    private final JobAssignmentRepository assignments;
    private final JobRepository jobs;
    private final RolePermissionService rolePermissionService;

    public JobAccess(
            CvAccess cvAccess,
            JobAssignmentRepository assignments,
            JobRepository jobs,
            RolePermissionService rolePermissionService) {
        this.cvAccess = cvAccess;
        this.assignments = assignments;
        this.jobs = jobs;
        this.rolePermissionService = rolePermissionService;
    }

    // ── Public query helpers ──────────────────────────────────────────────────

    /** Returns true when the current actor is a company admin (bypasses all job checks). */
    public boolean isAdmin() {
        return UserRole.isCompanyAdmin(cvAccess.actor().getRole());
    }

    /** Returns true when actor is admin OR has JOBS_ALL feature permission. */
    public boolean canViewAllJobs() {
        if (isAdmin()) return true;
        return rolePermissionService.hasFeature(cvAccess.actor().getRole(), RecruiterFeature.JOBS_ALL);
    }

    /** Returns true if current actor is the creator of the job. */
    public boolean isCreator(long jobId) {
        return isCreator(jobId, cvAccess.actor().getId());
    }

    /** Returns true if given user is the creator of the job. */
    public boolean isCreator(long jobId, Long userId) {
        if (userId == null) return false;
        return jobs.findById(jobId)
                .map(j -> j.getCreatedBy() != null && userId.equals(j.getCreatedBy().getId()))
                .orElse(false);
    }

    /**
     * Returns true when the actor can view the job:
     * - Admin or JOBS_ALL feature
     * - Creator of the job
     * - Explicitly granted canView on this job
     */
    public boolean canViewJob(long jobId) {
        if (canViewAllJobs()) return true;
        Long userId = cvAccess.actor().getId();
        if (isCreator(jobId, userId)) return true;
        return assignments.findByJob_IdAndUser_Id(jobId, userId)
                .map(JobAssignment::isCanView)
                .orElse(false);
    }

    /**
     * Returns true when the actor can edit the job:
     * - Admin
     * - Creator of the job
     * - Explicitly granted canEdit on this job
     */
    public boolean canEditJob(long jobId) {
        if (isAdmin()) return true;
        Long userId = cvAccess.actor().getId();
        if (isCreator(jobId, userId)) return true;
        return assignments.findByJob_IdAndUser_Id(jobId, userId)
                .map(JobAssignment::isCanEdit)
                .orElse(false);
    }

    /** Returns true if user can delete job (Admin or Creator). */
    public boolean canDeleteJob(long jobId) {
        if (isAdmin()) return true;
        return isCreator(jobId);
    }

    /** Returns true if user can manage permissions of this job (Admin or Creator). */
    public boolean canManagePermissions(long jobId) {
        if (isAdmin()) return true;
        return isCreator(jobId);
    }

    /** Returns true if actor is admin or has permission to create jobs. */
    public boolean canCreateJob() {
        if (isAdmin()) return true;
        return rolePermissionService.hasAction(cvAccess.actor().getRole(), RecruiterFeature.JOBS, "CREATE");
    }

    public void requireCreateJob() {
        if (!canCreateJob()) {
            throw forbidden("Bạn không có quyền tạo tin tuyển dụng");
        }
    }

    /**
     * Returns the current user's {@link AssignmentRole} for display compatibility:
     * - admin: null
     * - creator: OWNER
     * - canEdit: COLLABORATOR
     * - canView only: VIEWER
     */
    public AssignmentRole currentRole(long jobId) {
        if (isAdmin()) return null;
        Long userId = cvAccess.actor().getId();
        if (isCreator(jobId, userId)) return AssignmentRole.OWNER;
        return assignments.findByJob_IdAndUser_Id(jobId, userId)
                .map(a -> a.isCanEdit() ? AssignmentRole.COLLABORATOR : AssignmentRole.VIEWER)
                .orElse(null);
    }

    // ── Guard methods (throw 403 on failure) ──────────────────────────────────

    public void requireViewJob(long jobId) {
        if (!canViewJob(jobId)) {
            throw forbidden("Not authorized to view this job");
        }
    }

    public void requireEditJob(long jobId) {
        if (!canEditJob(jobId)) {
            throw forbidden("Not authorized to edit this job");
        }
    }

    public void requireDeleteJob(long jobId) {
        if (!canDeleteJob(jobId)) {
            throw forbidden("Only the job creator or admin can delete this job");
        }
    }

    public void requireManagePermissions(long jobId) {
        if (!canManagePermissions(jobId)) {
            throw forbidden("Only the job creator or admin can manage permissions for this job");
        }
    }

    // ── Backward-compatible guards ───────────────────────────────────────────

    public void requireOwner(long jobId) {
        requireManagePermissions(jobId);
    }

    public void requireOwnerOrCollaborator(long jobId) {
        requireEditJob(jobId);
    }

    public void requireAnyJobRole(long jobId) {
        requireViewJob(jobId);
    }

    public void requireJobWrite(long jobId) {
        requireEditJob(jobId);
    }

    public void requireManageTeam(long jobId) {
        requireManagePermissions(jobId);
    }

    public void assertNotDeleted(Job job) {
        if (job.getDeletedAt() != null) {
            throw new BusinessException("Job not found", HttpStatus.NOT_FOUND, "JOB_NOT_FOUND");
        }
    }

    private static BusinessException forbidden(String message) {
        return new BusinessException(message, HttpStatus.FORBIDDEN, "JOB_FORBIDDEN");
    }
}
