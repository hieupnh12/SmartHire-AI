package com.smarthire.tenant.cv.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.UserRole;
import com.smarthire.domain.tenant.entity.Cv;
import com.smarthire.domain.tenant.entity.Job;
import com.smarthire.domain.tenant.entity.User;
import com.smarthire.domain.tenant.repository.JobAssignmentRepository;
import com.smarthire.domain.tenant.repository.UserRepository;
import com.smarthire.multitenancy.context.TenantContext;
import java.util.Set;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Component
public class CvAccess {
    private static final Set<String> STAFF = Set.of(
            "ROLE_RECRUITER", "ROLE_HR", "ROLE_ADMIN", "ROLE_TENANT_ADMIN", "ROLE_STAFF");

    private final UserRepository users;
    private final JobAssignmentRepository assignments;

    public CvAccess(UserRepository users, JobAssignmentRepository assignments) {
        this.users = users;
        this.assignments = assignments;
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
        return auth().getAuthorities().stream().map(GrantedAuthority::getAuthority).anyMatch(STAFF::contains);
    }

    public boolean candidate() {
        return auth().getAuthorities().stream().anyMatch(a -> "ROLE_CANDIDATE".equals(a.getAuthority()));
    }

    public boolean companyAdmin() {
        return UserRole.isCompanyAdmin(actor().getRole());
    }

    public Long jobScopeUserId() {
        User user = actor();
        return UserRole.isCompanyAdmin(user.getRole()) ? null : user.getId();
    }

    public void requireJob(Job job) {
        User user = actor();
        if (job.getDeletedAt() != null) {
            throw new BusinessException("Job not found", HttpStatus.NOT_FOUND, "JOB_NOT_FOUND");
        }
        if (UserRole.isCompanyAdmin(user.getRole())) {
            return;
        }
        if (staff()) {
            if (!assignments.existsByJob_IdAndUser_Id(job.getId(), user.getId())) {
                throw new BusinessException("Not assigned to this job", HttpStatus.FORBIDDEN, "JOB_NOT_ASSIGNED");
            }
            return;
        }
        throw new BusinessException("Recruiter access required", HttpStatus.FORBIDDEN, "CV_FORBIDDEN");
    }

    public void requireCv(Cv cv) {
        User user = actor();
        if (candidate()) {
            if (!cv.getUser().getId().equals(user.getId())) {
                throw new BusinessException("CV not found", HttpStatus.NOT_FOUND, "CV_NOT_FOUND");
            }
            return;
        }
        if (cv.getJob() == null) {
            throw new BusinessException("CV not found", HttpStatus.NOT_FOUND, "CV_NOT_FOUND");
        }
        requireJob(cv.getJob());
    }
}
