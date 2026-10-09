package com.smarthire.master.contract.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.master.entity.Contract;
import lombok.Builder;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.Base64;
import java.util.HexFormat;
import java.util.UUID;

@Slf4j
@Service
public class DropboxSignClient {

    private final String apiKey;
    private final String baseUrl;
    private final boolean testMode;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    @Autowired
    public DropboxSignClient(
            @Value("${dropbox-sign.api-key:}") String apiKey,
            @Value("${dropbox-sign.base-url:https://api.hellosign.com/v3}") String baseUrl,
            @Value("${dropbox-sign.test-mode:true}") boolean testMode,
            ObjectMapper objectMapper) {
        this(apiKey, baseUrl, testMode, HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(25))
                .followRedirects(HttpClient.Redirect.NORMAL)
                .build(), objectMapper);
    }

    DropboxSignClient(String apiKey, String baseUrl, boolean testMode, HttpClient httpClient, ObjectMapper objectMapper) {
        this.apiKey = apiKey != null ? apiKey.trim() : "";
        this.baseUrl = (baseUrl != null ? baseUrl.trim() : "https://api.hellosign.com/v3").replaceAll("/+$", "");
        this.testMode = testMode;
        this.httpClient = httpClient;
        this.objectMapper = objectMapper;
    }

    public boolean isConfigured() {
        return StringUtils.hasText(this.apiKey);
    }

    public boolean isTestMode() {
        return this.testMode;
    }

    @Getter
    @Builder
    public static class DropboxSignSendResult {
        private final String signatureRequestId;
        private final String signatureId;
        private final String detailsUrl;
        private final String signingUrl;
        private final boolean testMode;
        private final String signerStatusCode;
    }

    @Getter
    @Builder
    public static class DropboxSignStatusResult {
        private final String signatureRequestId;
        private final boolean complete;
        private final boolean declined;
        private final String detailsUrl;
        private final String signatureId;
        private final String signerName;
        private final String signerEmail;
        private final String signerStatusCode;
        private final Long signedAtEpochSeconds;
    }

    /**
     * Calls POST /v3/signature_request/send on Dropbox Sign API to send the PDF contract
     * directly to Party B's email address for legally binding e-Signature + Audit Trail.
     */
    public DropboxSignSendResult sendSignatureRequest(Contract contract, byte[] pdfBytes) {
        requireApiKey();
        if (!StringUtils.hasText(contract.getPartyBEmail())) {
            throw new BusinessException(
                    "Hợp đồng chưa có địa chỉ Email đại diện Bên B để gửi yêu cầu ký số qua Dropbox Sign.",
                    HttpStatus.BAD_REQUEST,
                    "MISSING_PARTY_B_EMAIL");
        }

        String signerName = StringUtils.hasText(contract.getPartyBRepresentative())
                ? contract.getPartyBRepresentative().trim()
                : (StringUtils.hasText(contract.getPartyBName()) ? contract.getPartyBName().trim() : "Đại diện Bên B");
        String signerEmail = contract.getPartyBEmail().trim();

        String boundary = "----SmartHireDropboxSignBoundary" + UUID.randomUUID().toString().replace("-", "");
        try {
            byte[] multipartBody = buildSendMultipartBody(boundary, contract, signerName, signerEmail, pdfBytes);

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + "/signature_request/send"))
                    .timeout(Duration.ofSeconds(45))
                    .header("Authorization", basicAuthHeader())
                    .header("Content-Type", "multipart/form-data; boundary=" + boundary)
                    .header("Accept", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofByteArray(multipartBody))
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                String errorDetail = extractDropboxSignError(response.body());
                log.error("Dropbox Sign /signature_request/send failed ({}): {}", response.statusCode(), errorDetail);
                throw new BusinessException(
                        "Dropbox Sign API từ chối yêu cầu gửi hợp đồng (" + response.statusCode() + "): " + errorDetail,
                        HttpStatus.BAD_GATEWAY,
                        "DROPBOX_SIGN_API_ERROR");
            }

            JsonNode root = objectMapper.readTree(response.body());
            JsonNode sigReq = root.path("signature_request");
            String sigReqId = sigReq.path("signature_request_id").asText(null);
            String detailsUrl = sigReq.path("details_url").asText(null);
            String signingUrl = sigReq.path("signing_url").asText(null);
            boolean respTestMode = sigReq.path("test_mode").asBoolean(this.testMode);

            String signatureId = null;
            String signerStatusCode = "awaiting_signature";
            JsonNode signaturesNode = sigReq.path("signatures");
            if (signaturesNode.isArray() && !signaturesNode.isEmpty()) {
                JsonNode firstSig = signaturesNode.get(0);
                signatureId = firstSig.path("signature_id").asText(null);
                signerStatusCode = firstSig.path("status_code").asText("awaiting_signature");
            }

            return DropboxSignSendResult.builder()
                    .signatureRequestId(sigReqId)
                    .signatureId(signatureId)
                    .detailsUrl(detailsUrl)
                    .signingUrl(signingUrl)
                    .testMode(respTestMode)
                    .signerStatusCode(signerStatusCode)
                    .build();
        } catch (BusinessException ex) {
            throw ex;
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new BusinessException("Kết nối tới Dropbox Sign API bị gián đoạn", HttpStatus.BAD_GATEWAY, "DROPBOX_SIGN_INTERRUPTED");
        } catch (Exception ex) {
            log.error("Error calling Dropbox Sign sendSignatureRequest for contract {}: {}", contract.getContractNumber(), ex.getMessage(), ex);
            throw new BusinessException("Không thể kết nối tới Dropbox Sign API: " + ex.getMessage(), HttpStatus.BAD_GATEWAY, "DROPBOX_SIGN_CONNECTION_ERROR");
        }
    }

    /**
     * Calls GET /v3/signature_request/{signature_request_id} on Dropbox Sign API.
     */
    public DropboxSignStatusResult getSignatureRequestStatus(String signatureRequestId) {
        requireApiKey();
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + "/signature_request/" + signatureRequestId))
                    .timeout(Duration.ofSeconds(30))
                    .header("Authorization", basicAuthHeader())
                    .header("Accept", "application/json")
                    .GET()
                    .build();

            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                String errorDetail = extractDropboxSignError(response.body());
                throw new BusinessException(
                        "Không thể tra cứu trạng thái từ Dropbox Sign (" + response.statusCode() + "): " + errorDetail,
                        HttpStatus.BAD_GATEWAY,
                        "DROPBOX_SIGN_STATUS_ERROR");
            }

            JsonNode root = objectMapper.readTree(response.body());
            return parseSignatureRequestStatusNode(root.path("signature_request"));
        } catch (BusinessException ex) {
            throw ex;
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new BusinessException("Tra cứu Dropbox Sign bị gián đoạn", HttpStatus.BAD_GATEWAY, "DROPBOX_SIGN_INTERRUPTED");
        } catch (Exception ex) {
            throw new BusinessException("Lỗi khi tra cứu trạng thái ký trên Dropbox Sign: " + ex.getMessage(), HttpStatus.BAD_GATEWAY, "DROPBOX_SIGN_STATUS_ERROR");
        }
    }

    public DropboxSignStatusResult parseSignatureRequestStatusNode(JsonNode sigReq) {
        String sigReqId = sigReq.path("signature_request_id").asText(null);
        boolean isComplete = sigReq.path("is_complete").asBoolean(false);
        boolean isDeclined = sigReq.path("is_declined").asBoolean(false);
        String detailsUrl = sigReq.path("details_url").asText(null);

        String signatureId = null;
        String signerName = null;
        String signerEmail = null;
        String statusCode = null;
        Long signedAtEpoch = null;

        JsonNode signatures = sigReq.path("signatures");
        if (signatures.isArray() && !signatures.isEmpty()) {
            JsonNode first = signatures.get(0);
            signatureId = first.path("signature_id").asText(null);
            signerName = first.path("signer_name").asText(null);
            signerEmail = first.path("signer_email_address").asText(null);
            statusCode = first.path("status_code").asText(null);
            if (!first.path("signed_at").isMissingNode() && !first.path("signed_at").isNull()) {
                long epoch = first.path("signed_at").asLong(0L);
                if (epoch > 0) {
                    signedAtEpoch = epoch;
                }
            }
        }

        return DropboxSignStatusResult.builder()
                .signatureRequestId(sigReqId)
                .complete(isComplete)
                .declined(isDeclined)
                .detailsUrl(detailsUrl)
                .signatureId(signatureId)
                .signerName(signerName)
                .signerEmail(signerEmail)
                .signerStatusCode(statusCode)
                .signedAtEpochSeconds(signedAtEpoch)
                .build();
    }

    /**
     * Calls GET /v3/signature_request/files/{signature_request_id}?file_type=pdf
     * to download the final signed PDF including the appended Dropbox Sign Audit Trail.
     */
    public byte[] downloadSignedPdf(String signatureRequestId) {
        requireApiKey();
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(baseUrl + "/signature_request/files/" + signatureRequestId + "?file_type=pdf"))
                    .timeout(Duration.ofSeconds(45))
                    .header("Authorization", basicAuthHeader())
                    .GET()
                    .build();

            HttpResponse<byte[]> response = httpClient.send(request, HttpResponse.BodyHandlers.ofByteArray());
            if (response.statusCode() != 200 || response.body() == null || response.body().length == 0) {
                throw new BusinessException(
                        "Không thể tải file PDF đã ký từ Dropbox Sign (HTTP " + response.statusCode() + ")",
                        HttpStatus.BAD_GATEWAY,
                        "DROPBOX_SIGN_FILE_DOWNLOAD_ERROR");
            }
            return response.body();
        } catch (BusinessException ex) {
            throw ex;
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new BusinessException("Tải file PDF từ Dropbox Sign bị gián đoạn", HttpStatus.BAD_GATEWAY, "DROPBOX_SIGN_INTERRUPTED");
        } catch (Exception ex) {
            throw new BusinessException("Lỗi khi tải PDF đã ký từ Dropbox Sign: " + ex.getMessage(), HttpStatus.BAD_GATEWAY, "DROPBOX_SIGN_FILE_DOWNLOAD_ERROR");
        }
    }

    /**
     * Verifies the Dropbox Sign webhook event_hash using HMAC-SHA256(apiKey, eventTime + eventType).
     */
    public boolean verifyWebhookEventHash(String eventTime, String eventType, String expectedEventHash) {
        if (!isConfigured() || !StringUtils.hasText(eventTime) || !StringUtils.hasText(eventType) || !StringUtils.hasText(expectedEventHash)) {
            return false;
        }
        try {
            Mac hmac = Mac.getInstance("HmacSHA256");
            SecretKeySpec secretKey = new SecretKeySpec(this.apiKey.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            hmac.init(secretKey);
            byte[] macBytes = hmac.doFinal((eventTime + eventType).getBytes(StandardCharsets.UTF_8));
            String computedHex = HexFormat.of().formatHex(macBytes);
            return MessageDigest.isEqual(
                    computedHex.toLowerCase().getBytes(StandardCharsets.UTF_8),
                    expectedEventHash.trim().toLowerCase().getBytes(StandardCharsets.UTF_8));
        } catch (Exception e) {
            log.error("Failed to verify Dropbox Sign webhook HMAC: {}", e.getMessage());
            return false;
        }
    }

    private void requireApiKey() {
        if (!isConfigured()) {
            throw new BusinessException(
                    "Chưa cấu hình DROPBOX_SIGN_API_KEY trong biến môi trường (.env). Vui lòng thêm API Key từ tài khoản Dropbox Sign (app.hellosign.com -> Settings -> API) để gửi hợp đồng ký số.",
                    HttpStatus.BAD_REQUEST,
                    "DROPBOX_SIGN_API_KEY_MISSING");
        }
    }

    private String basicAuthHeader() {
        String raw = this.apiKey + ":";
        return "Basic " + Base64.getEncoder().encodeToString(raw.getBytes(StandardCharsets.UTF_8));
    }

    private byte[] buildSendMultipartBody(
            String boundary,
            Contract contract,
            String signerName,
            String signerEmail,
            byte[] pdfBytes) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();

        String title = contract.getTitle() + " (" + contract.getContractNumber() + ")";
        String subject = "[SmartHire-AI] Yêu cầu Ký số Hợp đồng B2B - " + contract.getContractNumber();
        String message = "Kính gửi " + signerName + " (" + (contract.getPartyBName() != null ? contract.getPartyBName() : "Quý Doanh nghiệp")
                + "),\n\nSmartHire-AI trân trọng gửi tới Quý Đối tác văn bản Hợp đồng cung cấp dịch vụ số "
                + contract.getContractNumber() + "/HĐDV-SMARTHIRE.\n"
                + "Vui lòng xem chi tiết điều khoản trong tệp PDF đính kèm và thực hiện ký số điện tử trực tiếp trên nền tảng Dropbox Sign.";

        writeFormField(out, boundary, "title", title);
        writeFormField(out, boundary, "subject", subject);
        writeFormField(out, boundary, "message", message);
        writeFormField(out, boundary, "signers[0][email_address]", signerEmail);
        writeFormField(out, boundary, "signers[0][name]", signerName);
        writeFormField(out, boundary, "metadata[contract_id]", String.valueOf(contract.getId()));
        writeFormField(out, boundary, "metadata[contract_number]", contract.getContractNumber());
        writeFormField(out, boundary, "test_mode", this.testMode ? "1" : "0");

        String safeFileName = "Hop-Dong-B2B-" + contract.getContractNumber() + ".pdf";
        writeFilePart(out, boundary, "files[0]", safeFileName, "application/pdf", pdfBytes);

        out.write(("--" + boundary + "--\r\n").getBytes(StandardCharsets.UTF_8));
        return out.toByteArray();
    }

    private void writeFormField(ByteArrayOutputStream out, String boundary, String name, String value) throws IOException {
        if (value == null) return;
        out.write(("--" + boundary + "\r\n").getBytes(StandardCharsets.UTF_8));
        out.write(("Content-Disposition: form-data; name=\"" + name + "\"\r\n\r\n").getBytes(StandardCharsets.UTF_8));
        out.write(value.getBytes(StandardCharsets.UTF_8));
        out.write("\r\n".getBytes(StandardCharsets.UTF_8));
    }

    private void writeFilePart(
            ByteArrayOutputStream out,
            String boundary,
            String fieldName,
            String filename,
            String contentType,
            byte[] fileBytes) throws IOException {
        out.write(("--" + boundary + "\r\n").getBytes(StandardCharsets.UTF_8));
        out.write(("Content-Disposition: form-data; name=\"" + fieldName + "\"; filename=\"" + filename + "\"\r\n").getBytes(StandardCharsets.UTF_8));
        out.write(("Content-Type: " + contentType + "\r\n\r\n").getBytes(StandardCharsets.UTF_8));
        out.write(fileBytes);
        out.write("\r\n".getBytes(StandardCharsets.UTF_8));
    }

    private String extractDropboxSignError(String responseBody) {
        if (!StringUtils.hasText(responseBody)) {
            return "Empty response from Dropbox Sign";
        }
        try {
            JsonNode root = objectMapper.readTree(responseBody);
            JsonNode err = root.path("error");
            if (!err.isMissingNode()) {
                String msg = err.path("error_msg").asText("");
                String name = err.path("error_name").asText("");
                if (StringUtils.hasText(msg)) {
                    return StringUtils.hasText(name) ? (msg + " [" + name + "]") : msg;
                }
            }
        } catch (Exception ignored) {
        }
        return responseBody.length() > 300 ? responseBody.substring(0, 300) : responseBody;
    }
}
