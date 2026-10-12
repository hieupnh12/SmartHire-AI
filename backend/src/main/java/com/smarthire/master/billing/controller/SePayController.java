package com.smarthire.master.billing.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.master.billing.dto.SePayWebhookPayload;
import com.smarthire.master.billing.dto.SePayWebhookResponse;
import com.smarthire.master.billing.service.SePayService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Map;

@Slf4j
@RestController
@RequestMapping("/api/v1/public")
@RequiredArgsConstructor
@Tag(name = "SePay Webhook", description = "Public Webhook API for SePay VietQR bank transfer automation")
public class SePayController {

    private final SePayService sePayService;
    private final ObjectMapper objectMapper;

    @Value("${sepay.webhook-secret:}")
    private String webhookSecret;

    @Value("${sepay.require-signature:true}")
    private boolean requireSignature;

    @PostMapping({"/sepay/webhook", "/checkout/sepay-webhook"})
    @Operation(summary = "Receive SePay Webhook", description = "Handles incoming transaction notifications from SePay with HMAC-SHA256 signature or API Key verification and automatically activates tenant subscription.")
    public ResponseEntity<?> handleSePayWebhook(
            @RequestHeader(value = "X-SePay-Signature", required = false) String signatureHeader,
            @RequestHeader(value = "X-SePay-Timestamp", required = false) String timestampHeader,
            @RequestHeader(value = "Authorization", required = false) String authorizationHeader,
            @RequestBody String rawBody
    ) {
        log.info("Received SePay webhook: Signature={}, AuthHeader={}, Timestamp={}, RawLength={}",
                StringUtils.hasText(signatureHeader) ? "[PROTECTED]" : "NONE",
                StringUtils.hasText(authorizationHeader) ? "[PROTECTED]" : "NONE",
                timestampHeader,
                rawBody != null ? rawBody.length() : 0);

        if (!StringUtils.hasText(rawBody)) {
            log.warn("SePay webhook rejected: empty body");
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Empty payload"));
        }

        // 1. Xác thực bảo mật (Fail-closed mặc định khi requireSignature = true)
        if (StringUtils.hasText(signatureHeader)) {
            if (!StringUtils.hasText(webhookSecret)) {
                log.error("SePay webhook rejected: SEPAY_WEBHOOK_SECRET is not configured on server");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("success", false, "message", "Webhook secret not configured"));
            }
            boolean isValid = verifyHmacSha256(rawBody, signatureHeader, timestampHeader, webhookSecret);
            if (!isValid) {
                log.error("SePay webhook authentication failed: Invalid X-SePay-Signature");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("success", false, "message", "Invalid signature"));
            }
            log.info("SePay webhook HMAC-SHA256 signature verified successfully.");
        } else if (StringUtils.hasText(authorizationHeader)) {
            if (!StringUtils.hasText(webhookSecret)) {
                log.error("SePay webhook rejected: SEPAY_WEBHOOK_SECRET is not configured on server");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("success", false, "message", "Webhook secret not configured"));
            }
            boolean isValidApiKey = verifyApiKeyHeader(authorizationHeader, timestampHeader, webhookSecret);
            if (!isValidApiKey) {
                log.error("SePay webhook authentication failed: Invalid Authorization Apikey header");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("success", false, "message", "Invalid API key"));
            }
            log.info("SePay webhook Authorization Apikey verified successfully.");
        } else {
            if (requireSignature) {
                log.warn("SePay webhook rejected: Missing required X-SePay-Signature or Authorization Apikey header");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                        .body(Map.of("success", false, "message", "Missing X-SePay-Signature header"));
            }
        }

        // 2. Deserialize raw body sang DTO
        SePayWebhookPayload payload;
        try {
            payload = objectMapper.readValue(rawBody, SePayWebhookPayload.class);
        } catch (Exception e) {
            log.error("Failed to parse SePay webhook JSON payload", e);
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Malformed JSON"));
        }

        // 3. Xử lý nghiệp vụ đối soát hoá đơn và tự động kích hoạt
        SePayWebhookResponse response = sePayService.processWebhook(payload);
        return ResponseEntity.ok(response);
    }

    /**
     * Xác thực chuẩn SePay API Key:
     * Header: "Authorization: Apikey <secretKey>"
     * So sánh hằng thời gian (constant-time) phân biệt hoa/thường để bảo toàn entropy của khóa.
     */
    private boolean verifyApiKeyHeader(String authorizationHeader, String timestampHeader, String secretKey) {
        if (!StringUtils.hasText(authorizationHeader) || !StringUtils.hasText(secretKey)) {
            return false;
        }
        if (!isValidTimestampIfPresent(timestampHeader)) {
            return false;
        }
        String trimmed = authorizationHeader.trim();
        if (!trimmed.regionMatches(true, 0, "Apikey ", 0, 7)) {
            return false;
        }
        String providedKey = trimmed.substring(7).trim();
        if (!StringUtils.hasText(providedKey)) {
            return false;
        }
        return MessageDigest.isEqual(
                providedKey.getBytes(StandardCharsets.UTF_8),
                secretKey.trim().getBytes(StandardCharsets.UTF_8)
        );
    }

    /**
     * Xác thực HMAC-SHA256 theo chuẩn SePay:
     * - Header X-SePay-Signature: sha256={hash} hoặc {hash}
     * - Dữ liệu ký: {timestamp}.{raw_body} hoặc {raw_body}
     * - Khóa bí mật: webhookSecret
     */
    private boolean verifyHmacSha256(String rawBody, String signatureHeader, String timestampHeader, String secretKey) {
        if (!StringUtils.hasText(signatureHeader) || !StringUtils.hasText(secretKey)) {
            return false;
        }

        String actualSignature = signatureHeader.trim();
        if (actualSignature.toLowerCase().startsWith("sha256=")) {
            actualSignature = actualSignature.substring(7).trim();
        }

        // Kiểm tra timestamp chống replay attack (nếu có header)
        if (!isValidTimestampIfPresent(timestampHeader)) {
            return false;
        }

        String cleanSecret = secretKey.trim();

        // Thử trường hợp 1: {timestamp}.{raw_body}
        if (StringUtils.hasText(timestampHeader)) {
            String payloadWithTimestamp = timestampHeader.trim() + "." + rawBody;
            String expected1 = computeHmacSha256(payloadWithTimestamp, cleanSecret);
            if (isEqualHexSafe(actualSignature, expected1)) {
                return true;
            }
        }

        // Thử trường hợp 2: {raw_body}
        String expected2 = computeHmacSha256(rawBody, cleanSecret);
        return isEqualHexSafe(actualSignature, expected2);
    }

    private boolean isValidTimestampIfPresent(String timestampHeader) {
        if (!StringUtils.hasText(timestampHeader)) {
            return true;
        }
        try {
            long ts = Long.parseLong(timestampHeader.trim());
            long now = System.currentTimeMillis() / 1000;
            // Cho phép lệch tối đa 5 phút (300 giây)
            if (Math.abs(now - ts) > 300) {
                log.warn("SePay webhook timestamp expired: sent={}, current={}", ts, now);
                return false;
            }
            return true;
        } catch (NumberFormatException e) {
            log.warn("SePay webhook invalid timestamp format: {}", timestampHeader);
            return false;
        }
    }

    private String computeHmacSha256(String data, String key) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKeySpec = new SecretKeySpec(key.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(secretKeySpec);
            byte[] hmacBytes = mac.doFinal(data.getBytes(StandardCharsets.UTF_8));
            StringBuilder sb = new StringBuilder(hmacBytes.length * 2);
            for (byte b : hmacBytes) {
                sb.append(String.format("%02x", b));
            }
            return sb.toString();
        } catch (Exception e) {
            log.error("Error computing HMAC-SHA256", e);
            return "";
        }
    }

    private boolean isEqualHexSafe(String a, String b) {
        if (a == null || b == null) return false;
        return MessageDigest.isEqual(
                a.toLowerCase().getBytes(StandardCharsets.UTF_8),
                b.toLowerCase().getBytes(StandardCharsets.UTF_8)
        );
    }
}
