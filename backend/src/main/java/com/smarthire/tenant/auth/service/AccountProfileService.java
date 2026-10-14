package com.smarthire.tenant.auth.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.UserRole;
import com.smarthire.domain.tenant.entity.Candidate;
import com.smarthire.domain.tenant.repository.CandidateRepository;
import com.smarthire.tenant.auth.dto.AccountProfileModels.AccountProfileResponse;
import com.smarthire.tenant.auth.dto.AccountProfileModels.UpdateAccountProfileRequest;
import com.smarthire.tenant.cv.service.CvAccess;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@RequiredArgsConstructor
public class AccountProfileService {

    private final CvAccess access;
    private final CandidateRepository candidates;

    @Transactional(readOnly = true)
    public AccountProfileResponse current() {
        return toResponse(access.candidateActor());
    }

    @Transactional
    public AccountProfileResponse update(UpdateAccountProfileRequest request) {
        Candidate candidate = access.candidateActor();
        String phone = normalizePhone(request.phone());
        if (phone != null && candidates.existsByPhoneAndIdNot(phone, candidate.getId())) {
            throw new BusinessException("Số điện thoại đã được dùng cho một tài khoản ứng viên khác",
                    HttpStatus.CONFLICT, "PHONE_ALREADY_USED");
        }
        candidate.setFullName(request.fullName().trim());
        candidate.setPhone(phone);
        candidate.setHeadline(blankToNull(request.headline()));
        candidate.setBio(blankToNull(request.bio()));
        return toResponse(candidates.save(candidate));
    }

    private static AccountProfileResponse toResponse(Candidate candidate) {
        return new AccountProfileResponse(
                candidate.getId(),
                candidate.getEmail(),
                candidate.getFullName(),
                UserRole.CANDIDATE.name(),
                candidate.getPhone(),
                candidate.getHeadline(),
                candidate.getBio(),
                candidate.getAvatarUrl(),
                StringUtils.hasText(candidate.getPasswordHash()));
    }

    /** One canonical form per number so "+84 912-345-678" and "0912345678" collide. */
    static String normalizePhone(String value) {
        if (!StringUtils.hasText(value)) return null;
        String digits = value.trim().replaceAll("[\\s().-]", "");
        if (digits.startsWith("+84")) digits = "0" + digits.substring(3);
        return digits.isEmpty() ? null : digits;
    }

    private static String blankToNull(String value) {
        return StringUtils.hasText(value) ? value.trim() : null;
    }
}
