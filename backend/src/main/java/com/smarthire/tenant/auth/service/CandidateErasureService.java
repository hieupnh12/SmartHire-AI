package com.smarthire.tenant.auth.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.ApplicationStatus;
import com.smarthire.domain.enums.UserStatus;
import com.smarthire.domain.tenant.entity.Candidate;
import com.smarthire.domain.tenant.repository.ApplicationRepository;
import com.smarthire.domain.tenant.repository.CandidateRepository;
import com.smarthire.domain.tenant.repository.CvRepository;
import com.smarthire.domain.tenant.repository.OauthAccountRepository;
import com.smarthire.tenant.applicant.service.ApplicationClosureService;
import com.smarthire.tenant.cv.service.CvAccess;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.Locale;
import java.util.Optional;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Candidate "delete my data": profile and CV content are wiped, but the row survives under a hashed email so
 * closed applications still block re-applying to the same job if the person signs in again.
 */
@Service
public class CandidateErasureService {
    public static final String ERASED_NAME = "Ứng viên đã xoá dữ liệu";
    private final CvAccess access;
    private final CandidateRepository candidates;
    private final ApplicationRepository applications;
    private final CvRepository cvs;
    private final OauthAccountRepository oauthAccounts;
    private final ApplicationClosureService closures;

    public CandidateErasureService(CvAccess access, CandidateRepository candidates, ApplicationRepository applications,
            CvRepository cvs, OauthAccountRepository oauthAccounts, ApplicationClosureService closures) {
        this.access = access;
        this.candidates = candidates;
        this.applications = applications;
        this.cvs = cvs;
        this.oauthAccounts = oauthAccounts;
        this.closures = closures;
    }

    @Transactional
    public void eraseCurrent() {
        Candidate candidate = candidates.findLockedById(access.candidateActor().getId())
                .orElseThrow(() -> new BusinessException("Candidate not found", HttpStatus.NOT_FOUND, "CANDIDATE_NOT_FOUND"));
        boolean inProgress = applications.findByCandidate_IdAndStatusNotIn(candidate.getId(), ApplicationClosureService.CLOSED)
                .stream().anyMatch(app -> app.getStatus() != ApplicationStatus.HIRED);
        if (inProgress) {
            throw new BusinessException("Bạn đang có hồ sơ ứng tuyển chưa kết thúc. Hãy rút đơn hoặc chờ kết quả trước khi xoá dữ liệu",
                    HttpStatus.CONFLICT, "CANDIDATE_HAS_OPEN_APPLICATION");
        }
        cvs.findByCandidate_IdOrderByIdDesc(candidate.getId()).forEach(closures::purge);
        oauthAccounts.findByCandidate(candidate).ifPresent(oauthAccounts::delete);
        candidate.setEmail(erasedEmail(candidate.getEmail()));
        candidate.setFullName(ERASED_NAME);
        candidate.setPasswordHash(null);
        candidate.setPhone(null);
        candidate.setAvatarUrl(null);
        candidate.setHeadline(null);
        candidate.setBio(null);
        candidate.setLinksJson(null);
        candidate.setStatus(UserStatus.DISABLED);
    }

    /** Re-activates an erased record when the same email signs in or is added again. */
    @Transactional
    public Optional<Candidate> restore(String email, String fullName) {
        return candidates.findByEmailIgnoreCase(erasedEmail(email)).map(candidate -> {
            candidate.setEmail(email.trim().toLowerCase(Locale.ROOT));
            candidate.setFullName(fullName == null || fullName.isBlank() ? email : fullName.trim());
            candidate.setStatus(UserStatus.ACTIVE);
            return candidates.save(candidate);
        });
    }

    public static String erasedEmail(String email) {
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256")
                    .digest(email.trim().toLowerCase(Locale.ROOT).getBytes(StandardCharsets.UTF_8));
            return "erased+" + HexFormat.of().formatHex(hash) + "@erased.invalid";
        } catch (NoSuchAlgorithmException ex) {
            throw new IllegalStateException(ex);
        }
    }
}
