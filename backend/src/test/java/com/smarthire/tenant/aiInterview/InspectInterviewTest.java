package com.smarthire.tenant.aiInterview;

import com.smarthire.multitenancy.service.TenantCredentialService;
import org.junit.jupiter.api.Test;
import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.Statement;

public class InspectInterviewTest {

    @Test
    public void inspect() throws Exception {
        String masterUrl = "jdbc:postgresql://42.96.2.6:5432/smarthire_postgres";
        String masterUser = "smarthire_pg";
        String masterPass = "AVNS_NfTNJikL2M8FHwq8b8V";

        String endpoint = null;
        String encryptedKey = null;

        String defaultEndpoint = "http://127.0.0.1:8000/v1";
        String defaultApiKey = System.getenv().getOrDefault("AI_INTERVIEW_API_KEY", "");

        try (Connection conn = DriverManager.getConnection(masterUrl, masterUser, masterPass);
             Statement stmt = conn.createStatement()) {
            ResultSet rs = stmt.executeQuery("SELECT endpoint_url, api_key_encrypted FROM ai_provider_keys WHERE id = 10");
            if (rs.next()) {
                endpoint = rs.getString("endpoint_url");
                encryptedKey = rs.getString("api_key_encrypted");
            }
        } catch (Exception e) {
            System.out.println("Could not query master DB: " + e.getMessage());
        }

        String apiKey = defaultApiKey;
        if (encryptedKey != null) {
            try {
                var credentialService = new TenantCredentialService("sNBhQ7PPWFDBaJkwHXNSbpQW7YV+c5gQZCM6+vlDwFk=");
                apiKey = credentialService.decrypt("MASTER_AI_KEY", encryptedKey);
            } catch (Exception e) {
                System.out.println("Failed to decrypt DB key: " + e.getMessage());
            }
        }
        if (endpoint == null || endpoint.isBlank()) {
            endpoint = defaultEndpoint;
        }

        System.out.println("Endpoint: " + endpoint);
        System.out.println("API Key (masked): " + (apiKey != null && apiKey.length() > 6 ? apiKey.substring(0, 4) + "..." : "empty"));

        HttpClient client = HttpClient.newBuilder()
                .connectTimeout(java.time.Duration.ofSeconds(10))
                .build();
        String targetUrl = endpoint.replaceAll("/+$", "") + (endpoint.endsWith("/chat/completions") ? "" : "/chat/completions");

        // TEST A: Plain text prompt without response_format
        System.out.println("\n=======================================================");
        System.out.println("=== TEST A: Plain text prompt (no response_format) ===");
        System.out.println("=======================================================");
        String payloadA = "{\n"
                + "  \"model\": \"vanilj/llama-3-8b-instruct-32k-v0.1:Q4_K_M\",\n"
                + "  \"messages\": [\n"
                + "    {\"role\": \"user\", \"content\": \"What is Java? Answer in one short sentence.\"}\n"
                + "  ],\n"
                + "  \"max_tokens\": 60\n"
                + "}";
        runTestCase(client, targetUrl, apiKey, "TEST A", payloadA);

        // TEST B: JSON requested in prompt text, NO response_format
        System.out.println("\n=======================================================");
        System.out.println("=== TEST B: JSON requested in prompt (no response_format) ===");
        System.out.println("=======================================================");
        String payloadB = "{\n"
                + "  \"model\": \"vanilj/llama-3-8b-instruct-32k-v0.1:Q4_K_M\",\n"
                + "  \"messages\": [\n"
                + "    {\"role\": \"user\", \"content\": \"Return a valid JSON object with keys 'status' and 'language'. Output ONLY the raw JSON object, no markdown, no explanation.\"}\n"
                + "  ],\n"
                + "  \"max_tokens\": 60\n"
                + "}";
        runTestCase(client, targetUrl, apiKey, "TEST B", payloadB);

        // TEST C: response_format with json_schema (Structured Outputs)
        System.out.println("\n=======================================================");
        System.out.println("=== TEST C: response_format with json_schema ===");
        System.out.println("=======================================================");
        String payloadC = "{\n"
                + "  \"model\": \"vanilj/llama-3-8b-instruct-32k-v0.1:Q4_K_M\",\n"
                + "  \"messages\": [\n"
                + "    {\"role\": \"user\", \"content\": \"Return status and language.\"}\n"
                + "  ],\n"
                + "  \"response_format\": {\n"
                + "    \"type\": \"json_schema\",\n"
                + "    \"json_schema\": {\n"
                + "      \"name\": \"test_output\",\n"
                + "      \"strict\": true,\n"
                + "      \"schema\": {\n"
                + "        \"type\": \"object\",\n"
                + "        \"properties\": {\n"
                + "          \"status\": {\"type\": \"string\"},\n"
                + "          \"language\": {\"type\": \"string\"}\n"
                + "        },\n"
                + "        \"required\": [\"status\", \"language\"],\n"
                + "        \"additionalProperties\": false\n"
                + "      }\n"
                + "    }\n"
                + "  },\n"
                + "  \"max_tokens\": 60\n"
                + "}";
        runTestCase(client, targetUrl, apiKey, "TEST C", payloadC);
    }

    @Test
    public void inspectDbConfigs() throws Exception {
        String masterUrl = "jdbc:postgresql://42.96.2.6:5432/smarthire_postgres";
        String masterUser = "smarthire_pg";
        String masterPass = "AVNS_NfTNJikL2M8FHwq8b8V";

        try (Connection conn = DriverManager.getConnection(masterUrl, masterUser, masterPass);
             Statement stmt = conn.createStatement()) {
            System.out.println("\n=== CURRENT ai_model_configs IN MASTER DB ===");
            ResultSet rs = stmt.executeQuery("SELECT task_type, provider, model_name, is_active FROM ai_model_configs WHERE task_type IN ('INTERVIEW_GEN', 'INTERVIEW_NLP', 'ASSESSMENT_GEN', 'CODE_GRADING')");
            while (rs.next()) {
                System.out.println("TASK: " + rs.getString("task_type") + " -> provider=" + rs.getString("provider") + ", model=" + rs.getString("model_name") + ", active=" + rs.getBoolean("is_active"));
            }

            System.out.println("\n=== CURRENT ai_provider_keys IN MASTER DB ===");
            ResultSet rs2 = stmt.executeQuery("SELECT id, provider, key_alias, endpoint_url, is_default, status FROM ai_provider_keys");
            while (rs2.next()) {
                System.out.println("KEY #" + rs2.getInt("id") + ": provider=" + rs2.getString("provider") + ", alias=" + rs2.getString("key_alias") + ", endpoint=" + rs2.getString("endpoint_url") + ", default=" + rs2.getBoolean("is_default") + ", status=" + rs2.getString("status"));
            }
        }
    }

    @Test
    public void testAiInterviewWithGranite() throws Exception {
        String endpoint = "http://127.0.0.1:8000/v1/chat/completions";
        String apiKey = System.getenv().getOrDefault("AI_INTERVIEW_API_KEY", "");
        String model = "smarthire-llama"; // or "granite4.2:8b"

        HttpClient client = HttpClient.newBuilder()
                .connectTimeout(java.time.Duration.ofSeconds(10))
                .build();

        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();

        // 1. TEST DIALOGUE GENERATION (INTERVIEW_GEN)
        System.out.println("\n=======================================================");
        System.out.println("=== 1. TEST DIALOGUE GENERATION (INTERVIEW_GEN) ===");
        System.out.println("=======================================================");
        String dialoguePayload = "{\n"
                + "  \"model\": \"" + model + "\",\n"
                + "  \"messages\": [\n"
                + "    {\"role\": \"system\", \"content\": \"Bạn là người phỏng vấn AI chuyên nghiệp của SmartHire-AI cho vị trí Senior Backend Java Developer. Hãy đặt 1 câu hỏi đào sâu (follow-up question) ngắn gọn, chuyên sâu bằng tiếng Việt dựa trên câu trả lời của ứng viên.\"},\n"
                + "    {\"role\": \"assistant\", \"content\": \"Chào bạn, bạn có thể chia sẻ về kinh nghiệm tối ưu hóa hiệu năng cơ sở dữ liệu trong các dự án Spring Boot trước đây không?\"},\n"
                + "    {\"role\": \"user\", \"content\": \"Tôi thường giải quyết vấn đề N+1 query bằng cách dùng EntityGraph hoặc JOIN FETCH. Ngoài ra tôi đánh index cho các cột hay filter và dùng Redis để cache dữ liệu ít biến động.\"}\n"
                + "  ],\n"
                + "  \"temperature\": 0.3,\n"
                + "  \"max_tokens\": 250\n"
                + "}";
        runTestCase(client, endpoint, apiKey, "1. DIALOGUE GENERATION", dialoguePayload);

        // 2. TEST TRANSCRIPT EVALUATION (INTERVIEW_NLP)
        System.out.println("\n=======================================================");
        System.out.println("=== 2. TEST TRANSCRIPT EVALUATION (INTERVIEW_NLP) ===");
        System.out.println("=======================================================");
        String rubricInstruction = "Bạn là chuyên gia đánh giá phỏng vấn AI. Đánh giá biên bản phỏng vấn sau theo 4 tiêu chí: "
                + "TECHNICAL_KNOWLEDGE (40%), PROBLEM_SOLVING (30%), REASONING (20%), COMMUNICATION (10%). "
                + "Mỗi tiêu chí cho điểm từ 0 đến 100 và trích dẫn 1 câu nói của ứng viên làm bằng chứng (quote, messageId). "
                + "Bắt buộc trả về đúng cấu trúc JSON, không kèm bất kỳ giải thích nào khác ngoài raw JSON:\n"
                + "{\n"
                + "  \"criteria\": {\n"
                + "    \"TECHNICAL_KNOWLEDGE\": {\"score\": 85, \"evidence\": [{\"messageId\": 2, \"quote\": \"...\"}]},\n"
                + "    \"PROBLEM_SOLVING\": {\"score\": 80, \"evidence\": [{\"messageId\": 2, \"quote\": \"...\"}]},\n"
                + "    \"REASONING\": {\"score\": 80, \"evidence\": [{\"messageId\": 2, \"quote\": \"...\"}]},\n"
                + "    \"COMMUNICATION\": {\"score\": 85, \"evidence\": [{\"messageId\": 2, \"quote\": \"...\"}]}\n"
                + "  },\n"
                + "  \"summary\": \"Nhận xét tổng quan ứng viên (tối đa 300 từ)\",\n"
                + "  \"strengths\": \"Điểm mạnh nổi bật\",\n"
                + "  \"weaknesses\": \"Điểm cần cải thiện\"\n"
                + "}";

        String transcript = "Message 1 (AI): Chào bạn, bạn xử lý race condition trong giao dịch tiền tệ như thế nào?\n"
                + "Message 2 (Candidate): Tôi dùng Pessimistic Locking ở tầng database với SELECT FOR UPDATE cho các giao dịch nhạy cảm để tránh cập nhật đồng thời. Ngoài ra ở tầng ứng dụng tôi dùng distributed lock bằng Redis Redlock khi cần xử lý đa instance.\n"
                + "Message 3 (AI): Khi Redis lock bị timeout giữa chừng thì bạn xử lý thế nào?\n"
                + "Message 4 (Candidate): Tôi dùng cơ chế renew lock (heartbeat) trong lúc transaction đang chạy và bao bọc bằng idempotency key để đảm bảo giao dịch không bị lặp lại.";

        String evaluationPayload = mapper.createObjectNode()
                .put("model", model)
                .put("temperature", 0.1)
                .put("max_tokens", 800)
                .set("messages", mapper.createArrayNode()
                        .add(mapper.createObjectNode().put("role", "system").put("content", rubricInstruction))
                        .add(mapper.createObjectNode().put("role", "user").put("content", transcript)))
                .toPrettyString();

        runTestCase(client, endpoint, apiKey, "2. EVALUATION & SCORING", evaluationPayload);
    }

    private void runTestCase(HttpClient client, String targetUrl, String apiKey, String testName, String payload) {
        System.out.println("Request URL: " + targetUrl);
        System.out.println("Request Payload:\n" + payload);

        long startMs = System.currentTimeMillis();
        try {
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(targetUrl))
                    .header("Content-Type", "application/json")
                    .header("Authorization", "Bearer " + apiKey)
                    .timeout(java.time.Duration.ofSeconds(240))
                    .POST(HttpRequest.BodyPublishers.ofString(payload))
                    .build();

            HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
            long latencyMs = System.currentTimeMillis() - startMs;

            System.out.println("HTTP Status: " + response.statusCode());
            System.out.println("Latency: " + latencyMs + " ms");
            System.out.println("Response Body:\n" + response.body());

            if (response.statusCode() == 200 && response.body().contains("\"content\":")) {
                com.fasterxml.jackson.databind.JsonNode root = new com.fasterxml.jackson.databind.ObjectMapper().readTree(response.body());
                String content = root.path("choices").path(0).path("message").path("content").asText();
                String cleaned = com.smarthire.tenant.aiInterview.service.InterviewConversationService.cleanDialogueText(content);
                System.out.println("\n--- CLEANED DIALOGUE OUTPUT ---");
                System.out.println(cleaned);
                System.out.println("--------------------------------\n");
            }
        } catch (Exception ex) {
            long latencyMs = System.currentTimeMillis() - startMs;
            System.out.println("Execution Error after " + latencyMs + " ms: " + ex.getMessage());
        }
    }
}
