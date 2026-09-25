package com.smarthire.tenant.job.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.AssignmentRole;
import com.smarthire.domain.enums.UserRole;
import com.smarthire.domain.enums.UserStatus;
import com.smarthire.domain.tenant.entity.Job;
import com.smarthire.domain.tenant.entity.JobAssignment;
import com.smarthire.domain.tenant.entity.User;
import com.smarthire.domain.tenant.repository.JobAssignmentRepository;
import com.smarthire.domain.tenant.repository.JobRepository;
import com.smarthire.domain.tenant.repository.UserRepository;
import com.smarthire.tenant.cv.service.CvAccess;
import com.smarthire.tenant.job.dto.JobAssignmentModels.AssignRecruiterRequest;
import com.smarthire.tenant.job.dto.JobAssignmentModels.JobAssignmentResponse;
import com.smarthire.tenant.job.dto.JobAssignmentModels.StaffAssignmentResponse;
import com.smarthire.tenant.job.dto.JobAssignmentModels.UpdateAssignmentRequest;
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
    private final CvAccess access;

    public JobAssignmentService(
            JobAssignmentRepository assignments,
            JobRepository jobs,
            UserRepository users,
            CvAccess access) {
        this.assignments = assignments;
        this.jobs = jobs;
        this.users = users;
        this.access = access;
    }

    @Transactional(readOnly = true)
    public List<JobAssignmentResponse> list(long jobId) {
        access.requireJob(job(jobId));
        return assignments.findByJob_IdOrderByIdAsc(jobId).stream()
                .sorted(Comparator.comparing((JobAssignment row) -> row.getAssignmentRole() != AssignmentRole.PRIMARY_RECRUITER)
                        .thenComparing(JobAssignment::getId))
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<StaffAssignmentResponse> listForUser(long userId) {
        requireSelfOrAdmin(userId);
        User user = users.findById(userId)
                .orElseThrow(() -> new BusinessException("User not found", HttpStatus.NOT_FOUND, "USER_NOT_FOUND"));
        if (UserRole.isCandidate(user.getRole())) {
            throw new BusinessException("User not found", HttpStatus.NOT_FOUND, "USER_NOT_FOUND");
        }
        return assignments.findActiveByUserId(userId).stream()
                .map(row -> new StaffAssignmentResponse(
                        row.getJob().getId(),
                        row.getJob().getTitle(),
                        row.getJob().getStatus().name(),
                        row.getAssignmentRole().name()))
                .toList();
    }

    @Transactional
    public JobAssignmentResponse assign(long jobId, AssignRecruiterRequest request) {
        requireAdmin();
        Job job = job(jobId);
        User recruiter = assignableUser(request.userId());
        if (assignments.existsByJob_IdAndUser_Id(jobId, recruiter.getId())) {
            throw new BusinessException("Recruiter already assigned to this job", HttpStatus.CONFLICT, "ALREADY_ASSIGNED");
        }
        AssignmentRole role = parseRole(request.assignmentRole());
        if (role == AssignmentRole.PRIMARY_RECRUITER) {
            demoteCurrentPrimary(jobId);
        }
        JobAssignment assignment = new JobAssignment();
        assignment.setJob(job);
        assignment.setUser(recruiter);
        assignment.setAssignmentRole(role);
        assignment.setAssignedBy(access.actor());
        return toResponse(assignments.save(assignment));
    }

    @Transactional
    public JobAssignmentResponse updateRole(long jobId, long userId, UpdateAssignmentRequest request) {
        requireAdmin();
        job(jobId);
        JobAssignment assignment = assignments.findByJob_IdAndUser_Id(jobId, userId)
                .orElseThrow(() -> new BusinessException("Assignment not found", HttpStatus.NOT_FOUND, "ASSIGNMENT_NOT_FOUND"));
        AssignmentRole role = parseRole(request.assignmentRole());
        if (role == AssignmentRole.PRIMARY_RECRUITER) {
            demoteCurrentPrimary(jobId, userId);
        }
        assignment.setAssignmentRole(role);
        return toResponse(assignments.save(assignment));
    }

    @Transactional
    public void remove(long jobId, long userId) {
        requireAdmin();
        job(jobId);
        JobAssignment assignment = assignments.findByJob_IdAndUser_Id(jobId, userId)
                .orElseThrow(() -> new BusinessException("Assignment not found", HttpStatus.NOT_FOUND, "ASSIGNMENT_NOT_FOUND"));
        assignments.delete(assignment);
    }

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
        assignment.setAssignmentRole(AssignmentRole.PRIMARY_RECRUITER);
        assignment.setAssignedBy(creator);
        assignments.save(assignment);
    }

    private void requireAdmin() {
        if (!UserRole.isCompanyAdmin(access.actor().getRole())) {
            throw new BusinessException("Admin access required", HttpStatus.FORBIDDEN, "FORBIDDEN");
        }
    }

    private void requireSelfOrAdmin(long userId) {
        User actor = access.actor();
        if (UserRole.isCompanyAdmin(actor.getRole()) || actor.getId().equals(userId)) {
            return;
        }
        throw new BusinessException("Access denied", HttpStatus.FORBIDDEN, "FORBIDDEN");
    }

    private Job job(long jobId) {
        Job job = jobs.findById(jobId)
                .orElseThrow(() -> new BusinessException("Job not found", HttpStatus.NOT_FOUND, "JOB_NOT_FOUND"));
        if (job.getDeletedAt() != null) {
            throw new BusinessException("Job not found", HttpStatus.NOT_FOUND, "JOB_NOT_FOUND");
        }
        return job;
    }

    private User assignableUser(Long userId) {
        User user = users.findById(userId)
                .orElseThrow(() -> new BusinessException("User not found", HttpStatus.NOT_FOUND, "USER_NOT_FOUND"));
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new BusinessException("User is not active", HttpStatus.BAD_REQUEST, "USER_INACTIVE");
        }
        if (!UserRole.isRecruiterStaff(user.getRole())) {
            throw new BusinessException("Assignee must be recruiter staff", HttpStatus.BAD_REQUEST, "INVALID_RECRUITER");
        }
        return user;
    }

    private AssignmentRole parseRole(String raw) {
        AssignmentRole role = AssignmentRole.from(raw);
        if (role == null) {
            throw new BusinessException("Invalid assignment role", HttpStatus.BAD_REQUEST, "INVALID_ASSIGNMENT_ROLE");
        }
        return role;
    }

    private void demoteCurrentPrimary(long jobId) {
        demoteCurrentPrimary(jobId, null);
    }

    private void demoteCurrentPrimary(long jobId, Long keepUserId) {
        assignments.findByJob_IdAndAssignmentRole(jobId, AssignmentRole.PRIMARY_RECRUITER)
                .filter(current -> keepUserId == null || !current.getUser().getId().equals(keepUserId))
                .ifPresent(current -> {
                    current.setAssignmentRole(AssignmentRole.CO_RECRUITER);
                    assignments.save(current);
                });
    }

    private JobAssignmentResponse toResponse(JobAssignment assignment) {
        User user = assignment.getUser();
        User assignedBy = assignment.getAssignedBy();
        return new JobAssignmentResponse(
                assignment.getId(),
                assignment.getJob().getId(),
                user.getId(),
                user.getFullName(),
                user.getEmail(),
                user.getRole(),
                assignment.getAssignmentRole().name(),
                assignment.getCreatedAt(),
                assignedBy == null ? null : assignedBy.getFullName());
    }
}
