package com.smarthire.tenant.auth.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.common.redis.RedisService;
import com.smarthire.domain.enums.AssignmentRole;
import com.smarthire.domain.enums.UserRole;
import com.smarthire.domain.enums.UserStatus;
import com.smarthire.domain.tenant.entity.Job;
import com.smarthire.domain.tenant.entity.TenantRole;
import com.smarthire.domain.tenant.entity.User;
import com.smarthire.domain.tenant.repository.JobRepository;
import com.smarthire.domain.tenant.repository.UserRepository;
import com.smarthire.multitenancy.context.TenantContext;
import com.smarthire.tenant.auth.dto.UpdateUserStatusRequest;
import com.smarthire.tenant.auth.dto.UserResponse;
import com.smarthire.tenant.auth.mapper.AuthMapper;
import com.smarthire.tenant.cv.service.CvAccess;
import com.smarthire.tenant.job.dto.JobAssignmentModels.TransferOwnerRequest;
import com.smarthire.tenant.job.service.JobAssignmentService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class TenantUserService {

    private static final List<AssignmentRole> OWNER_ROLES = List.of(AssignmentRole.OWNER, AssignmentRole.PRIMARY_RECRUITER);

    private final UserRepository userRepository;
    private final AuthMapper authMapper;
    private final TenantRoleService tenantRoleService;
    private final JobRepository jobRepository;
    private final JobAssignmentService jobAssignmentService;
    private final CvAccess cvAccess;
    private final RedisService redisService;

    @Transactional
    public UserResponse assignRole(Long userId, String roleCode) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("User not found", HttpStatus.NOT_FOUND, "USER_NOT_FOUND"));
        if (UserRole.isCandidate(user.getRole())) {
            throw new BusinessException("Cannot change a candidate account to a staff role",
                    HttpStatus.BAD_REQUEST, "USER_NOT_STAFF");
        }
        TenantRole tenantRole = tenantRoleService.requireAssignable(roleCode);
        user.setRole(tenantRole.getCode());
        return withWorkspace(authMapper.toUserResponse(userRepository.save(user)));
    }

    @Transactional
    public UserResponse updateStatus(Long userId, UpdateUserStatusRequest request) {
        User target = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("User not found", HttpStatus.NOT_FOUND, "USER_NOT_FOUND"));
        if (UserRole.isCandidate(target.getRole())) {
            throw new BusinessException("Cannot update candidate status here",
                    HttpStatus.BAD_REQUEST, "USER_NOT_STAFF");
        }

        UserStatus targetStatus = request.getStatus();
        if (target.getStatus() == targetStatus) {
            return withWorkspace(authMapper.toUserResponse(target));
        }

        if (targetStatus != UserStatus.ACTIVE) {
            User actor = cvAccess.actor();
            if (actor != null && actor.getId().equals(target.getId())) {
                throw new BusinessException("Không thể tự khóa hoặc vô hiệu hóa tài khoản của chính mình",
                        HttpStatus.BAD_REQUEST, "CANNOT_LOCK_SELF");
            }
            if (UserRole.TENANT_ADMIN.name().equalsIgnoreCase(target.getRole())
                    && target.getStatus() == UserStatus.ACTIVE
                    && userRepository.countByRoleAndStatus(UserRole.TENANT_ADMIN.name(), UserStatus.ACTIVE) <= 1) {
                throw new BusinessException("Không thể khóa hoặc vô hiệu hóa quản trị viên TENANT_ADMIN cuối cùng đang hoạt động",
                        HttpStatus.CONFLICT, "LAST_TENANT_ADMIN");
            }

            List<Job> ownedJobs = jobRepository.findOwnedActiveJobsByUserId(target.getId(), OWNER_ROLES);
            if (!ownedJobs.isEmpty()) {
                Long recipientId = request.getTransferToUserId();
                if (recipientId == null) {
                    throw new BusinessException(
                            "Nhân viên đang sở hữu " + ownedJobs.size() + " tin tuyển dụng. Vui lòng chọn người nhận chuyển giao trước khi khóa.",
                            HttpStatus.CONFLICT,
                            "OWNER_TRANSFER_REQUIRED");
                }
                if (recipientId.equals(target.getId())) {
                    throw new BusinessException("Không thể chuyển giao tin tuyển dụng cho chính người bị khóa",
                            HttpStatus.BAD_REQUEST, "INVALID_TRANSFER_TARGET");
                }
                User recipient = userRepository.findById(recipientId)
                        .orElseThrow(() -> new BusinessException("Người nhận chuyển giao không tồn tại",
                                HttpStatus.NOT_FOUND, "USER_NOT_FOUND"));
                if (recipient.getStatus() != UserStatus.ACTIVE || UserRole.isCandidate(recipient.getRole())) {
                    throw new BusinessException("Người nhận chuyển giao phải là nhân sự đang hoạt động",
                            HttpStatus.BAD_REQUEST, "INVALID_TRANSFER_TARGET");
                }
                for (Job job : ownedJobs) {
                    jobAssignmentService.transferOwnership(job.getId(), new TransferOwnerRequest(recipient.getId()));
                }
            }
        }

        target.setStatus(targetStatus);
        User saved = userRepository.save(target);

        if (targetStatus != UserStatus.ACTIVE) {
            revokeRefreshSessions(saved.getEmail());
        }

        return withWorkspace(authMapper.toUserResponse(saved));
    }

    private void revokeRefreshSessions(String email) {
        String tenant = TenantContext.getCurrentTenant();
        if (tenant == null || tenant.isBlank() || email == null) {
            return;
        }
        try {
            String expected = tenant + ":" + email;
            redisService.deleteMatchingValues("auth:tenant:refresh:*", v -> v.equalsIgnoreCase(expected));
        } catch (Exception ex) {
            log.warn("Could not revoke refresh sessions for {}: {}", email, ex.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public List<UserResponse> getEmployees() {
        return authMapper.toUserResponseList(userRepository.findAll()).stream()
                .filter(user -> !UserRole.isCandidate(user.getRole()))
                .map(this::withWorkspace)
                .toList();
    }

    private UserResponse withWorkspace(UserResponse response) {
        if (response != null) {
            response.setWorkspace(UserRole.workspaceOf(response.getRole()));
        }
        return response;
    }
}
