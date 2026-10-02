package com.smarthire.tenant.cv.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.AssignmentRole;
import com.smarthire.domain.enums.UserRole;
import com.smarthire.domain.tenant.entity.Cv;
import com.smarthire.domain.tenant.entity.Job;
import com.smarthire.domain.tenant.entity.User;
import com.smarthire.domain.tenant.repository.JobAssignmentRepository;
import com.smarthire.domain.tenant.repository.UserRepository;
import com.smarthire.multitenancy.context.TenantContext;
import com.smarthire.domain.enums.RecruiterFeature;
import com.smarthire.tenant.auth.service.RolePermissionService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
public class CvAccess {
    private final UserRepository users;
    private final JobAssignmentRepository assignments;
    private final RolePermissionService rolePermissionService;

    public CvAccess(UserRepository users, JobAssignmentRepository assignments) {
        this(users, assignments, null);
    }

    @Autowired
    public CvAccess(
            UserRepository users,
            JobAssignmentRepository assignments,
            RolePermissionService rolePermissionService) {
        this.users = users;
        this.assignments = assignments;
        this.rolePermissionService = rolePermissionService;
    }

    public Authentication auth() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        String tenant = TenantContext.getCurrentTenant();
        if (tenant == null || tenant.isBlank() || tenant.equals("smarthire_master")
                || authentication == null || !authentication.isAuthenticated()
                || !tenant.equals(authentication.getDetails())) {
            throw new BusinessException("Tenant access required", HttpStatus.FORBIDDEN, "CV_FORBIDDEN");
        }
        return authentication;
    }

    public User actor() {
        return users.findByEmailIgnoreCase(auth().getName())
                .orElseThrow(() -> new BusinessException("User not found", HttpStatus.UNAUTHORIZED, "USER_NOT_FOUND"));
    }

    public boolean staff() {
        return auth().getAuthorities().stream()
                .map(GrantedAuthority::getAuthority)
                .map(CvAccess::roleCode)
                .anyMatch(code -> UserRole.isCompanyAdmin(code) || UserRole.isRecruiterStaff(code));
    }

    public boolean candidate() {
        return auth().getAuthorities().stream().anyMatch(a -> "ROLE_CANDIDATE".equals(a.getAuthority()));
    }

    public boolean companyAdmin() {
        return UserRole.isCompanyAdmin(actor().getRole());
    }

    public Long jobScopeUserId() {
        User user = actor();
        if (UserRole.isCompanyAdmin(user.getRole())) {
            return null;
        }
        if (rolePermissionService != null && rolePermissionService.hasFeature(user.getRole(), RecruiterFeature.JOBS_ALL)) {
            return null;
        }
        return user.getId();
    }

    public void requireJob(Job job) {
        User user = actor();
        if (job.getDeletedAt() != null) {
            throw new BusinessException("Job not found", HttpStatus.NOT_FOUND, "JOB_NOT_FOUND");
        }
        if (UserRole.isCompanyAdmin(user.getRole())
                || (rolePermissionService != null && rolePermissionService.hasFeature(user.getRole(), RecruiterFeature.JOBS_ALL))) {
            return;
        }
        if (staff()) {
            if (job.getCreatedBy() != null && user.getId().equals(job.getCreatedBy().getId())) {
                return;
            }
            if (assignments.existsByJob_IdAndUser_IdAndCanViewTrue(job.getId(), user.getId())) {
                return;
            }
            throw new BusinessException("Not assigned to this job", HttpStatus.FORBIDDEN, "JOB_NOT_ASSIGNED");
        }
        throw new BusinessException("Recruiter access required", HttpStatus.FORBIDDEN, "CV_FORBIDDEN");
    }

    public void requireRecruiterWrite() {
        if (!staff()) {
            throw new BusinessException("Recruiter access required", HttpStatus.FORBIDDEN, "CV_FORBIDDEN");
        }
    }

    public boolean canEditRecruitmentWorkflow(Job job) {
        if (companyAdmin()) {
            return true;
        }
        if (!staff()) {
            return false;
        }
        User user = actor();
        return assignments.findByJob_IdAndUser_Id(job.getId(), user.getId())
                // OWNER (new) and PRIMARY_RECRUITER (legacy, backfilled) both grant workflow edit.
                .map(row -> row.getAssignmentRole() == AssignmentRole.OWNER
                        || row.getAssignmentRole() == AssignmentRole.PRIMARY_RECRUITER)
                .orElse(false);
    }

    public void requirePrimaryRecruiter(Job job) {
        requireRecruiterWrite();
        if (companyAdmin()) {
            return;
        }
        if (!canEditRecruitmentWorkflow(job)) {
            throw new BusinessException(
                    "Only the job OWNER can change the recruitment workflow",
                    HttpStatus.FORBIDDEN,
                    "WORKFLOW_PRIMARY_ONLY");
        }
    }

    public void requireCv(Cv cv) {
        User user = actor();
        if (candidate()) {
            if (!cv.getUser().getId().equals(user.getId())) {
                throw new BusinessException("CV not found", HttpStatus.NOT_FOUND, "CV_NOT_FOUND");
            }
            return;
        }
        if (staff()) {
            return;
        }
        throw new BusinessException("CV not found", HttpStatus.NOT_FOUND, "CV_NOT_FOUND");
    }

    private static String roleCode(String authority) {
        return authority != null && authority.startsWith("ROLE_") ? authority.substring(5) : authority;
    }
}
