package com.smarthire.tenant.job.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.AssignmentRole;
import com.smarthire.domain.enums.RecruiterFeature;
import com.smarthire.domain.enums.UserRole;
import com.smarthire.domain.enums.UserStatus;
import com.smarthire.domain.tenant.entity.Job;
import com.smarthire.domain.tenant.entity.JobAssignment;
import com.smarthire.domain.tenant.entity.User;
import com.smarthire.domain.tenant.repository.JobAssignmentRepository;
import com.smarthire.tenant.auth.service.RolePermissionService;
import com.smarthire.domain.tenant.repository.JobRepository;
import com.smarthire.domain.tenant.repository.UserRepository;
import com.smarthire.tenant.cv.service.CvAccess;
import com.smarthire.tenant.job.dto.JobAssignmentModels.AssignRecruiterRequest;
import com.smarthire.tenant.job.dto.JobAssignmentModels.JobAssignmentResponse;
import com.smarthire.tenant.job.dto.JobAssignmentModels.StaffAssignmentResponse;
import com.smarthire.tenant.job.dto.JobAssignmentModels.TransferOwnerRequest;
import com.smarthire.tenant.job.dto.JobAssignmentModels.UpdateAssignmentRequest;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class JobAssignmentService {

    private final JobAssignmentRepository assignments;
    private final JobRepository jobs;
    private final UserRepository users;
    private final CvAccess cvAccess;
    private final JobAccess jobAccess;
    private final RolePermissionService rolePermissionService;

    public JobAssignmentService(
            JobAssignmentRepository assignments,
            JobRepository jobs,
            UserRepository users,
            CvAccess cvAccess,
            JobAccess jobAccess,
            RolePermissionService rolePermissionService) {
        this.assignments = assignments;
        this.jobs = jobs;
        this.users = users;
        this.cvAccess = cvAccess;
        this.jobAccess = jobAccess;
        this.rolePermissionService = rolePermissionService;
    }

    // ── Read ──────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<JobAssignmentResponse> list(long jobId) {
        jobAccess.requireViewJob(jobId);
        Job job = job(jobId);

        List<JobAssignmentResponse> responses = new ArrayList<>();
        List<JobAssignment> list = assignments.findByJob_IdOrderByIdAsc(jobId);
        boolean creatorIncluded = false;

        for (JobAssignment row : list) {
            boolean isCreator = job.getCreatedBy() != null && row.getUser().getId().equals(job.getCreatedBy().getId());
            if (isCreator) creatorIncluded = true;
            responses.add(toResponse(row, isCreator));
        }

        // If job creator is active recruiter staff and not in job_assignments, display them at the top
        if (!creatorIncluded && job.getCreatedBy() != null && UserRole.isRecruiterStaff(job.getCreatedBy().getRole())) {
            User creator = job.getCreatedBy();
            responses.add(0, new JobAssignmentResponse(
                    0L,
                    job.getId(),
                    creator.getId(),
                    creator.getFullName(),
                    creator.getEmail(),
                    creator.getRole(),
                    true,
                    true,
                    true,
                    AssignmentRole.OWNER.name(),
                    job.getCreatedAt(),
                    creator.getFullName()));
        }

        return responses.stream()
                .sorted(Comparator.comparing((JobAssignmentResponse r) -> !r.isCreator())
                        .thenComparing(JobAssignmentResponse::id))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<StaffAssignmentResponse> listForUser(long userId) {
        requireSelfOrAdmin(userId);
        User user = users.findById(userId)
                .orElseThrow(() -> notFound("User not found", "USER_NOT_FOUND"));
        if (UserRole.isCandidate(user.getRole())) {
            throw notFound("User not found", "USER_NOT_FOUND");
        }
        return assignments.findActiveByUserId(userId).stream()
                .map(row -> new StaffAssignmentResponse(
                        row.getJob().getId(),
                        row.getJob().getTitle(),
                        row.getJob().getStatus().name(),
                        row.isCanView(),
                        row.isCanEdit(),
                        row.getAssignmentRole().name()))
                .toList();
    }

    // ── Write ─────────────────────────────────────────────────────────────────

    /**
     * Grant permissions to a staff member on a job.
     */
    @Transactional
    public JobAssignmentResponse assign(long jobId, AssignRecruiterRequest request) {
        jobAccess.requireManagePermissions(jobId);
        Job job = job(jobId);
        User recruiter = assignableUser(request.userId());

        if (job.getCreatedBy() != null && recruiter.getId().equals(job.getCreatedBy().getId())) {
            throw conflict("Job creator already has full access", "ALREADY_CREATOR");
        }
        if (assignments.existsByJob_IdAndUser_Id(jobId, recruiter.getId())) {
            throw conflict("User already assigned to this job", "ALREADY_ASSIGNED");
        }

        boolean canView = request.canView() != null ? request.canView() : true;
        boolean canEdit = request.canEdit() != null ? request.canEdit() : false;
        AssignmentRole role = canEdit ? AssignmentRole.COLLABORATOR : AssignmentRole.VIEWER;
        if (request.assignmentRole() != null && !request.assignmentRole().isBlank()) {
            AssignmentRole parsed = parseRole(request.assignmentRole());
            if (parsed != null) {
                role = parsed;
                if (role.canEdit()) canEdit = true;
            }
        }

        JobAssignment assignment = new JobAssignment();
        assignment.setJob(job);
        assignment.setUser(recruiter);
        assignment.setCanView(canView);
        assignment.setCanEdit(canEdit);
        assignment.setAssignmentRole(role);
        assignment.setAssignedBy(cvAccess.actor());
        return toResponse(assignments.save(assignment), false);
    }

    /**
     * Update permissions of an existing member on a job.
     */
    @Transactional
    public JobAssignmentResponse updateRole(long jobId, long userId, UpdateAssignmentRequest request) {
        jobAccess.requireManagePermissions(jobId);
        Job job = job(jobId);

        if (job.getCreatedBy() != null && userId == job.getCreatedBy().getId()) {
            throw forbidden("Cannot modify permissions of job creator");
        }

        JobAssignment assignment = assignments.findByJob_IdAndUser_Id(jobId, userId)
                .orElseThrow(() -> notFound("Assignment not found", "ASSIGNMENT_NOT_FOUND"));

        if (request.canView() != null) {
            assignment.setCanView(request.canView());
        }
        if (request.canEdit() != null) {
            assignment.setCanEdit(request.canEdit());
        }
        if (request.assignmentRole() != null && !request.assignmentRole().isBlank()) {
            AssignmentRole parsed = parseRole(request.assignmentRole());
            if (parsed != null) {
                assignment.setAssignmentRole(parsed);
                if (parsed.canEdit()) assignment.setCanEdit(true);
            }
        } else {
            assignment.setAssignmentRole(assignment.isCanEdit() ? AssignmentRole.COLLABORATOR : AssignmentRole.VIEWER);
        }

        return toResponse(assignments.save(assignment), false);
    }

    /**
     * Remove a member's access from a job.
     */
    @Transactional
    public void remove(long jobId, long userId) {
        jobAccess.requireManagePermissions(jobId);
        Job job = job(jobId);

        if (job.getCreatedBy() != null && userId == job.getCreatedBy().getId()) {
            throw forbidden("Cannot remove job creator from job");
        }

        JobAssignment assignment = assignments.findByJob_IdAndUser_Id(jobId, userId)
                .orElseThrow(() -> notFound("Assignment not found", "ASSIGNMENT_NOT_FOUND"));

        assignments.delete(assignment);
    }

    /**
     * Transfer job ownership to another recruiter (backward compatibility).
     */
    @Transactional
    public JobAssignmentResponse transferOwnership(long jobId, TransferOwnerRequest request) {
        Job job = job(jobId);
        jobAccess.requireManagePermissions(jobId);

        User newOwner = assignableUser(request.newOwnerId());
        boolean canCreate = UserRole.isCompanyAdmin(newOwner.getRole())
                || rolePermissionService.hasAction(newOwner.getRole(), RecruiterFeature.JOBS, "CREATE");
        if (!canCreate) {
            throw new BusinessException("Chỉ người có quyền Tạo tin tuyển dụng mới có thể làm Chủ sở hữu (OWNER)", HttpStatus.BAD_REQUEST, "NEW_OWNER_CANNOT_CREATE_JOBS");
        }

        job.setCreatedBy(newOwner);
        jobs.save(job);

        // Update or create assignment for new owner
        JobAssignment assignment = assignments.findByJob_IdAndUser_Id(jobId, newOwner.getId())
                .orElseGet(() -> {
                    JobAssignment a = new JobAssignment();
                    a.setJob(job);
                    a.setUser(newOwner);
                    a.setAssignedBy(cvAccess.actor());
                    return a;
                });
        assignment.setCanView(true);
        assignment.setCanEdit(true);
        assignment.setAssignmentRole(AssignmentRole.OWNER);
        return toResponse(assignments.save(assignment), true);
    }

    /**
     * Called internally after job creation: assigns the creator.
     */
    @Transactional
    public void assignCreator(Job job) {
        User creator = job.getCreatedBy();
        if (creator == null || creator.getId() == null || !UserRole.isRecruiterStaff(creator.getRole())) {
            return;
        }
        if (assignments.existsByJob_IdAndUser_Id(job.getId(), creator.getId())) {
            return;
        }
        JobAssignment assignment = new JobAssignment();
        assignment.setJob(job);
        assignment.setUser(creator);
        assignment.setCanView(true);
        assignment.setCanEdit(true);
        assignment.setAssignmentRole(AssignmentRole.OWNER);
        assignment.setAssignedBy(creator);
        assignments.save(assignment);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private void requireSelfOrAdmin(long userId) {
        User actor = cvAccess.actor();
        if (UserRole.isCompanyAdmin(actor.getRole()) || actor.getId().equals(userId)) {
            return;
        }
        throw forbidden("Access denied");
    }

    private Job job(long jobId) {
        Job job = jobs.findById(jobId)
                .orElseThrow(() -> notFound("Job not found", "JOB_NOT_FOUND"));
        if (job.getDeletedAt() != null) {
            throw notFound("Job not found", "JOB_NOT_FOUND");
        }
        return job;
    }

    private User assignableUser(Long userId) {
        User user = users.findById(userId)
                .orElseThrow(() -> notFound("User not found", "USER_NOT_FOUND"));
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new BusinessException("User is not active", HttpStatus.BAD_REQUEST, "USER_INACTIVE");
        }
        if (!UserRole.isRecruiterStaff(user.getRole())) {
            throw new BusinessException("User must be recruiter staff", HttpStatus.BAD_REQUEST, "INVALID_RECRUITER");
        }
        return user;
    }

    private AssignmentRole parseRole(String raw) {
        if (raw == null || raw.isBlank()) return null;
        AssignmentRole role = AssignmentRole.from(raw);
        if (role == null) {
            throw new BusinessException("Invalid role", HttpStatus.BAD_REQUEST, "INVALID_ROLE");
        }
        return role;
    }

    private JobAssignmentResponse toResponse(JobAssignment assignment, boolean isCreator) {
        User user = assignment.getUser();
        User assignedBy = assignment.getAssignedBy();
        return new JobAssignmentResponse(
                assignment.getId(),
                assignment.getJob().getId(),
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getRole(),
                assignment.isCanView(),
                assignment.isCanEdit(),
                isCreator,
                assignment.getAssignmentRole().name(),
                assignment.getCreatedAt(),
                assignedBy == null ? null : assignedBy.getFullName());
    }

    private static BusinessException notFound(String msg, String code) {
        return new BusinessException(msg, HttpStatus.NOT_FOUND, code);
    }

    private static BusinessException conflict(String msg, String code) {
        return new BusinessException(msg, HttpStatus.CONFLICT, code);
    }

    private static BusinessException forbidden(String msg) {
        return new BusinessException(msg, HttpStatus.FORBIDDEN, "JOB_FORBIDDEN");
    }
}
