package com.smarthire.tenant.auth.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.common.exception.BusinessException;
import com.smarthire.common.storage.FileStorageService;
import com.smarthire.domain.enums.UserRole;
import com.smarthire.domain.tenant.entity.Candidate;
import com.smarthire.domain.tenant.repository.CandidateRepository;
import com.smarthire.multitenancy.context.TenantContext;
import com.smarthire.multitenancy.service.TenantRegistryService;
import com.smarthire.tenant.auth.dto.AccountProfileModels.AccountProfileResponse;
import com.smarthire.tenant.auth.dto.AccountProfileModels.ProfileLinks;
import com.smarthire.tenant.auth.dto.AccountProfileModels.UpdateAccountProfileRequest;
import com.smarthire.tenant.cv.service.CvAccess;
import java.net.URI;
import java.util.Locale;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

@Service
public class AccountProfileService {

    private static final Logger log = LoggerFactory.getLogger(AccountProfileService.class);
    private static final Set<String> AVATAR_MIME = Set.of("image/jpeg", "image/png", "image/webp");
    private static final long MAX_AVATAR_BYTES = 2L * 1024 * 1024;
    private static final int MAX_LINK_LENGTH = 512;

    private final CvAccess access;
    private final CandidateRepository candidates;
    private final FileStorageService storage;
    private final TenantRegistryService tenants;
    private final ObjectMapper json;

    public AccountProfileService(CvAccess access, CandidateRepository candidates) {
        this(access, candidates, null, null, new ObjectMapper());
    }

    @Autowired
    public AccountProfileService(
            CvAccess access,
            CandidateRepository candidates,
            FileStorageService storage,
            TenantRegistryService tenants,
            ObjectMapper json) {
        this.access = access;
        this.candidates = candidates;
        this.storage = storage;
        this.tenants = tenants;
        this.json = json != null ? json : new ObjectMapper();
    }

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
        if (request.links() != null) {
            candidate.setLinksJson(serializeLinks(normalizeLinks(request.links())));
        }
        return toResponse(candidates.save(candidate));
    }

    @Transactional
    public AccountProfileResponse uploadAvatar(MultipartFile file) {
        Candidate candidate = access.candidateActor();
        if (file == null || file.isEmpty()) {
            throw new BusinessException("Ảnh đại diện không được để trống",
                    HttpStatus.BAD_REQUEST, "PROFILE_AVATAR_REQUIRED");
        }
        if (file.getSize() > MAX_AVATAR_BYTES) {
            throw new BusinessException("Ảnh đại diện vượt quá giới hạn 2MB",
                    HttpStatus.BAD_REQUEST, "PROFILE_AVATAR_TOO_LARGE");
        }
        String mime = file.getContentType() == null ? "" : file.getContentType().toLowerCase(Locale.ROOT);
        if (!AVATAR_MIME.contains(mime)) {
            throw new BusinessException("Chỉ hỗ trợ ảnh JPG, PNG hoặc WEBP",
                    HttpStatus.BAD_REQUEST, "PROFILE_AVATAR_TYPE_REJECTED");
        }
        if (storage == null || tenants == null) {
            throw new BusinessException("Dịch vụ lưu trữ ảnh chưa sẵn sàng",
                    HttpStatus.SERVICE_UNAVAILABLE, "PROFILE_AVATAR_STORE_UNAVAILABLE");
        }
        try {
            String tenant = tenants.requireActive(TenantContext.getCurrentTenant()).getSubdomain();
            String url = storage.storeImage(tenant, file.getBytes());
            candidate.setAvatarUrl(url);
            return toResponse(candidates.save(candidate));
        } catch (BusinessException ex) {
            throw ex;
        } catch (Exception ex) {
            log.error("Failed to store account avatar for candidate {}", candidate.getId(), ex);
            throw new BusinessException("Không thể lưu ảnh đại diện",
                    HttpStatus.INTERNAL_SERVER_ERROR, "PROFILE_AVATAR_STORE_FAILED");
        }
    }

    @Transactional
    public AccountProfileResponse removeAvatar() {
        Candidate candidate = access.candidateActor();
        candidate.setAvatarUrl(null);
        return toResponse(candidates.save(candidate));
    }

    private AccountProfileResponse toResponse(Candidate candidate) {
        return new AccountProfileResponse(
                candidate.getId(),
                candidate.getEmail(),
                candidate.getFullName(),
                UserRole.CANDIDATE.name(),
                candidate.getPhone(),
                candidate.getHeadline(),
                candidate.getBio(),
                candidate.getAvatarUrl(),
                StringUtils.hasText(candidate.getPasswordHash()),
                parseLinks(candidate.getLinksJson()));
    }

    private ProfileLinks parseLinks(String linksJson) {
        if (!StringUtils.hasText(linksJson)) {
            return ProfileLinks.empty();
        }
        try {
            ProfileLinks parsed = json.readValue(linksJson, ProfileLinks.class);
            if (parsed == null) {
                return ProfileLinks.empty();
            }
            return new ProfileLinks(
                    blankToNull(parsed.github()),
                    blankToNull(parsed.linkedin()),
                    blankToNull(parsed.portfolio()),
                    blankToNull(parsed.website()));
        } catch (Exception ex) {
            log.warn("Could not parse candidate links_json", ex);
            return ProfileLinks.empty();
        }
    }

    private ProfileLinks normalizeLinks(ProfileLinks links) {
        if (links == null) {
            return ProfileLinks.empty();
        }
        return new ProfileLinks(
                normalizeUrl(links.github()),
                normalizeUrl(links.linkedin()),
                normalizeUrl(links.portfolio()),
                normalizeUrl(links.website()));
    }

    private String serializeLinks(ProfileLinks links) {
        if (links.github() == null && links.linkedin() == null
                && links.portfolio() == null && links.website() == null) {
            return null;
        }
        try {
            return json.writeValueAsString(links);
        } catch (Exception ex) {
            throw new BusinessException("Không thể lưu danh sách liên kết hồ sơ",
                    HttpStatus.BAD_REQUEST, "INVALID_PROFILE_LINK");
        }
    }

    static String normalizeUrl(String raw) {
        String trimmed = blankToNull(raw);
        if (trimmed == null) {
            return null;
        }
        if (trimmed.length() > MAX_LINK_LENGTH) {
            throw new BusinessException("Đường dẫn tối đa 512 ký tự",
                    HttpStatus.BAD_REQUEST, "INVALID_PROFILE_LINK");
        }
        try {
            URI uri = URI.create(trimmed);
            String scheme = uri.getScheme() == null ? "" : uri.getScheme().toLowerCase(Locale.ROOT);
            if ((!"http".equals(scheme) && !"https".equals(scheme)) || !StringUtils.hasText(uri.getHost())) {
                throw new BusinessException("Liên kết phải bắt đầu bằng http:// hoặc https://",
                        HttpStatus.BAD_REQUEST, "INVALID_PROFILE_LINK");
            }
            return trimmed;
        } catch (IllegalArgumentException ex) {
            throw new BusinessException("Liên kết không đúng định dạng URL",
                    HttpStatus.BAD_REQUEST, "INVALID_PROFILE_LINK");
        }
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
