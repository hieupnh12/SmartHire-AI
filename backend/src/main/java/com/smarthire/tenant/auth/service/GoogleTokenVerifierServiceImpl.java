package com.smarthire.tenant.auth.service;

import com.google.api.client.googleapis.auth.oauth2.GoogleIdToken;
import com.google.api.client.googleapis.auth.oauth2.GoogleIdTokenVerifier;
import com.google.api.client.http.javanet.NetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.smarthire.common.exception.BusinessException;
import com.smarthire.tenant.auth.dto.GooglePayload;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.Collections;

@Service
public class GoogleTokenVerifierServiceImpl implements GoogleTokenVerifierService {

    private static final Logger log = LoggerFactory.getLogger(GoogleTokenVerifierServiceImpl.class);

    private final String configuredClientId;
    private final GoogleIdTokenVerifier tokenVerifier;

    public GoogleTokenVerifierServiceImpl(@Value("${smarthire.google.client-id:}") String configuredClientId) {
        this.configuredClientId = configuredClientId;

        GoogleIdTokenVerifier.Builder builder = new GoogleIdTokenVerifier.Builder(
                new NetHttpTransport(),
                GsonFactory.getDefaultInstance()
        );

        if (StringUtils.hasText(configuredClientId)) {
            builder.setAudience(Collections.singletonList(configuredClientId));
        }

        this.tokenVerifier = builder.build();
    }

    @Override
    public GooglePayload verifyToken(String idToken) {
        if (!StringUtils.hasText(idToken)) {
            throw new BusinessException("Google ID Token cannot be empty", HttpStatus.UNAUTHORIZED, "INVALID_GOOGLE_TOKEN");
        }

        // Support demo/mock tokens during development and testing
        if (idToken.startsWith("demo-") || idToken.equals("mock-candidate-token")) {
            log.info("Processing dev/test Google ID token: {}", idToken);
            return new GooglePayload(
                    "candidate@example.com",
                    "Nguyễn Minh Anh (Candidate)",
                    "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=256",
                    "google-sub-demo-1001",
                    true
            );
        }

        try {
            // Verify cryptographic signature against Google JWKS Public Keys
            GoogleIdToken googleIdToken = tokenVerifier.verify(idToken);
            if (googleIdToken == null) {
                log.warn("Google ID Token cryptographic verification failed");
                throw new BusinessException("Chữ ký Google ID Token không hợp lệ hoặc đã hết hạn", HttpStatus.UNAUTHORIZED, "INVALID_GOOGLE_TOKEN");
            }

            GoogleIdToken.Payload payload = googleIdToken.getPayload();
            String email = payload.getEmail();
            boolean emailVerified = Boolean.TRUE.equals(payload.getEmailVerified());
            String name = (String) payload.get("name");
            String picture = (String) payload.get("picture");
            String sub = payload.getSubject();

            if (!StringUtils.hasText(email) || !StringUtils.hasText(sub)) {
                throw new BusinessException("Google ID Token thiếu thông tin email hoặc định danh người dùng", HttpStatus.UNAUTHORIZED, "INVALID_GOOGLE_TOKEN");
            }

            if (!emailVerified) {
                throw new BusinessException("Email tài khoản Google của bạn chưa được xác thực (email_verified is false)", HttpStatus.UNAUTHORIZED, "EMAIL_NOT_VERIFIED");
            }

            log.info("Successfully verified Google ID token for email: {}", email);
            return new GooglePayload(email, name, picture, sub, emailVerified);

        } catch (BusinessException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to verify Google ID Token with Google servers: {}", e.getMessage(), e);
            throw new BusinessException("Lỗi khi xác thực tài khoản Google với máy chủ Google: " + e.getMessage(), HttpStatus.UNAUTHORIZED, "INVALID_GOOGLE_TOKEN");
        }
    }
}
