package com.smarthire.tenant.cv.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.tenant.entity.Cv;
import com.smarthire.domain.tenant.entity.Job;
import com.smarthire.domain.tenant.entity.User;
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
            "ROLE_RECRUITER", "ROLE_HR", "ROLE_ADMIN", "ROLE_TENANT_ADMIN");

    private final UserRepository users;

    public CvAccess(UserRepository users) {
        this.users = users;
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

    public void requireJob(Job job) {
        actor();
        if (job.getDeletedAt() != null) {
            throw new BusinessException("Job not found", HttpStatus.NOT_FOUND, "JOB_NOT_FOUND");
        }
        if (staff()) {
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
