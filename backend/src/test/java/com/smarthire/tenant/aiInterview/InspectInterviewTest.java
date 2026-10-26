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

        try (Connection conn = DriverManager.getConnection(masterUrl, masterUser, masterPass);
             Statement stmt = conn.createStatement()) {
            ResultSet rs = stmt.executeQuery("SELECT endpoint_url, api_key_encrypted FROM ai_provider_keys WHERE id = 10");
            if (rs.next()) {
                endpoint = rs.getString("endpoint_url");
                encryptedKey = rs.getString("api_key_encrypted");
            }
        }

        System.out.println("Endpoint: " + endpoint);
        var credentialService = new TenantCredentialService("sNBhQ7PPWFDBaJkwHXNSbpQW7YV+c5gQZCM6+vlDwFk=");
        String apiKey = credentialService.decrypt("MASTER_AI_KEY", encryptedKey);
        System.out.println("API Key length: " + (apiKey != null ? apiKey.length() : 0));

        HttpClient client = HttpClient.newHttpClient();

        // Test 1: Simple chat completion without json_schema
        System.out.println("\n--- TEST 1: Simple chat completion without json_schema ---");
        String body1 = "{"
                + "\"model\": \"vanilj/llama-3-8b-instruct-32k-v0.1:Q4_K_M\","
                + "\"messages\": [{\"role\": \"user\", \"content\": \"Hello\"}],"
                + "\"max_tokens\": 50"
                + "}";
        HttpRequest req1 = HttpRequest.newBuilder()
                .uri(URI.create(endpoint.replaceAll("/+$", "") + "/chat/completions"))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + apiKey)
                .POST(HttpRequest.BodyPublishers.ofString(body1))
                .build();
        try {
            HttpResponse<String> resp1 = client.send(req1, HttpResponse.BodyHandlers.ofString());
            System.out.println("Status 1: " + resp1.statusCode());
            System.out.println("Body 1: " + resp1.body());
        } catch (Exception e) {
            System.out.println("Error 1: " + e.getMessage());
        }

        // Test 2: With response_format json_schema (which is what Spring AI sends!)
        System.out.println("\n--- TEST 2: With response_format json_schema ---");
        String body2 = "{"
                + "\"model\": \"vanilj/llama-3-8b-instruct-32k-v0.1:Q4_K_M\","
                + "\"messages\": [{\"role\": \"user\", \"content\": \"Hello\"}],"
                + "\"response_format\": {\"type\": \"json_schema\", \"json_schema\": {\"name\": \"test\", \"schema\": {\"type\": \"object\"}}},"
                + "\"max_tokens\": 50"
                + "}";
        HttpRequest req2 = HttpRequest.newBuilder()
                .uri(URI.create(endpoint.replaceAll("/+$", "") + "/chat/completions"))
                .header("Content-Type", "application/json")
                .header("Authorization", "Bearer " + apiKey)
                .POST(HttpRequest.BodyPublishers.ofString(body2))
                .build();
        try {
            HttpResponse<String> resp2 = client.send(req2, HttpResponse.BodyHandlers.ofString());
            System.out.println("Status 2: " + resp2.statusCode());
            System.out.println("Body 2: " + resp2.body());
        } catch (Exception e) {
            System.out.println("Error 2: " + e.getMessage());
        }

        // Test 3: What does Gemini return if INTERVIEW_NLP uses Gemini?
        System.out.println("\n--- TEST 3: Check Gemini Model Config in Master ---");
        try (Connection conn = DriverManager.getConnection(masterUrl, masterUser, masterPass);
             Statement stmt = conn.createStatement()) {
            ResultSet rs = stmt.executeQuery("SELECT * FROM ai_model_configs WHERE task_type = 'INTERVIEW_NLP'");
            if (rs.next()) {
                System.out.println("INTERVIEW_NLP config: provider=" + rs.getString("provider") +
                        ", model=" + rs.getString("model_name") +
                        ", failover_provider=" + rs.getString("failover_provider") +
                        ", failover_model=" + rs.getString("failover_model"));
            }
        }
    }
}
