package com.smarthire.tenant.aiInterview.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.smarthire.config.ai.DynamicAiConfigProvider;
import com.smarthire.domain.tenant.entity.AiAnswer;
import com.smarthire.domain.tenant.entity.AiInterview;
import com.smarthire.domain.tenant.entity.AiInterviewRagAudit;
import com.smarthire.domain.tenant.entity.AiQuestion;
import com.smarthire.domain.tenant.entity.InterviewMessage;
import com.smarthire.domain.tenant.repository.AiInterviewRagAuditRepository;
import com.smarthire.domain.tenant.repository.AiQuestionRepository;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestClient;

@Service
@Slf4j
public class InterviewRagService {

    public static final double DEFAULT_SIMILARITY_THRESHOLD = 0.65;

    public record KeyPointMatch(int index, String point, String target, double similarity, boolean matched) {}

    public record QuestionRagResult(
            Long questionId,
            String questionText,
            double matchPercentage,
            List<String> matchedKeyPoints,
            List<String> missingKeyPoints,
            List<KeyPointMatch> details
    ) {}

    public record RagInterviewSummary(
            double overallSemanticMatchPercentage,
            double thresholdUsed,
            int totalKeyPoints,
            int totalMatchedKeyPoints,
            List<QuestionRagResult> questionResults
    ) {
        public List<QuestionRagResult> results() {
            return questionResults;
        }
    }

    private final DynamicAiConfigProvider configProvider;
    private final ObjectMapper mapper;
    private final RestClient restClient;
    private final AiQuestionRepository questionRepository;
    private final AiInterviewRagAuditRepository auditRepository;
    private final String nativeBaseUrl;

    @Autowired
    public InterviewRagService(
            DynamicAiConfigProvider configProvider,
            ObjectMapper mapper,
            @Qualifier("interviewConversationHttp") RestClient.Builder clientBuilder,
            AiQuestionRepository questionRepository,
            AiInterviewRagAuditRepository auditRepository,
            @Value("${AI_INTERVIEW_NATIVE_BASE_URL:https://generativelanguage.googleapis.com/v1beta}") String nativeBaseUrl) {
        this.configProvider = configProvider;
        this.mapper = mapper;
        this.restClient = clientBuilder.clone().build();
        this.questionRepository = questionRepository;
        this.auditRepository = auditRepository;
        this.nativeBaseUrl = nativeBaseUrl.replaceAll("/+$", "");
    }

    /**
     * Compute Cosine Similarity between two normalized float vectors.
     */
    public static double cosineSimilarity(float[] vectorA, float[] vectorB) {
        if (vectorA == null || vectorB == null || vectorA.length == 0 || vectorB.length == 0
                || vectorA.length != vectorB.length) {
            return 0.0;
        }
        double dotProduct = 0.0;
        double normA = 0.0;
        double normB = 0.0;
        for (int i = 0; i < vectorA.length; i++) {
            dotProduct += vectorA[i] * vectorB[i];
            normA += vectorA[i] * vectorA[i];
            normB += vectorB[i] * vectorB[i];
        }
        if (normA <= 0.0 || normB <= 0.0) {
            return 0.0;
        }
        return Math.clamp(dotProduct / (Math.sqrt(normA) * Math.sqrt(normB)), -1.0, 1.0);
    }

    /**
     * Call embedding model to generate a float vector (768 dimensions).
     */
    public float[] embed(String text) {
        if (text == null || text.isBlank()) {
            return new float[0];
        }
        String clean = text.trim();
        if (clean.length() > 2000) {
            clean = clean.substring(0, 2000);
        }

        var speechConfig = configProvider.resolveConfig("INTERVIEW_STT");
        String apiKey = speechConfig != null ? speechConfig.apiKey() : null;
        if (apiKey == null || apiKey.isBlank()) {
            var genConfig = configProvider.resolveConfig("INTERVIEW_GEN");
            apiKey = genConfig != null ? genConfig.apiKey() : null;
        }

        if (apiKey == null || apiKey.isBlank()) {
            log.warn("No active AI API key available for embedding, returning zero vector");
            return new float[0];
        }

        try {
            String url = nativeBaseUrl + "/models/gemini-embedding-001:embedContent?key=" + apiKey;
            ObjectNode body = mapper.createObjectNode();
            body.put("model", "models/gemini-embedding-001");
            body.putObject("content").putArray("parts").addObject().put("text", clean);

            JsonNode response = restClient.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(JsonNode.class);

            if (response != null && response.has("embedding") && response.path("embedding").has("values")) {
                JsonNode values = response.path("embedding").path("values");
                float[] vector = new float[values.size()];
                for (int i = 0; i < values.size(); i++) {
                    vector[i] = (float) values.get(i).asDouble();
                }
                return vector;
            }
        } catch (Exception ex) {
            log.warn("Gemini embedding call failed: {}", ex.getMessage());
        }

        return new float[0];
    }

    /**
     * Index key points of all questions for an interview (Pre-generation / Approval step).
     */
    @Transactional
    public int indexQuestionsKeyPoints(List<AiQuestion> questions) {
        int indexedCount = 0;
        for (AiQuestion question : questions) {
            String rubricJson = question.getRubricJson();
            if (rubricJson == null || rubricJson.isBlank()) continue;

            try {
                JsonNode rubric = mapper.readTree(rubricJson);
                if (rubric.has("keyPoints") && rubric.path("keyPoints").isArray()) {
                    ArrayNode keyPoints = (ArrayNode) rubric.path("keyPoints");
                    boolean updated = false;
                    for (JsonNode kp : keyPoints) {
                        if (kp instanceof ObjectNode kpObj && (!kpObj.has("embedding") || kpObj.path("embedding").isEmpty())) {
                            String pointText = kpObj.path("point").asText("");
                            if (!pointText.isBlank()) {
                                float[] vector = embed(pointText);
                                if (vector.length > 0) {
                                    ArrayNode embNode = kpObj.putArray("embedding");
                                    for (float v : vector) embNode.add(v);
                                    updated = true;
                                    indexedCount++;
                                }
                            }
                        }
                    }
                    if (updated) {
                        question.setRubricJson(mapper.writeValueAsString(rubric));
                        questionRepository.save(question);
                    }
                }
            } catch (Exception ex) {
                log.warn("Could not index key points for question {}: {}", question.getId(), ex.getMessage());
            }
        }
        return indexedCount;
    }

    /**
     * Evaluate one candidate answer against a question's indexed key points.
     */
    @Transactional
    public QuestionRagResult evaluateAnswer(
            AiInterview interview,
            AiQuestion question,
            String candidateAnswer,
            double threshold) {
        if (question == null || question.getRubricJson() == null) {
            return new QuestionRagResult(question != null ? question.getId() : null, "", 0.0, List.of(), List.of(), List.of());
        }

        List<String> matched = new ArrayList<>();
        List<String> missing = new ArrayList<>();
        List<KeyPointMatch> details = new ArrayList<>();

        if (candidateAnswer == null || candidateAnswer.isBlank()) {
            return new QuestionRagResult(question.getId(), question.getQuestionText(), 0.0, matched, missing, details);
        }

        float[] answerVector = embed(candidateAnswer);

        try {
            JsonNode rubric = mapper.readTree(question.getRubricJson());
            if (rubric.has("keyPoints") && rubric.path("keyPoints").isArray()) {
                ArrayNode keyPoints = (ArrayNode) rubric.path("keyPoints");
                int index = 0;
                for (JsonNode kp : keyPoints) {
                    String point = kp.path("point").asText("");
                    String target = kp.path("target").asText("TECHNICAL_KNOWLEDGE");
                    float[] kpVector = null;

                    if (kp.has("embedding") && kp.path("embedding").isArray() && !kp.path("embedding").isEmpty()) {
                        ArrayNode emb = (ArrayNode) kp.path("embedding");
                        kpVector = new float[emb.size()];
                        for (int i = 0; i < emb.size(); i++) kpVector[i] = (float) emb.get(i).asDouble();
                    } else {
                        kpVector = embed(point);
                    }

                    double sim = (answerVector.length > 0 && kpVector.length > 0)
                            ? cosineSimilarity(answerVector, kpVector) : 0.0;
                    boolean isMatch = sim >= threshold;

                    if (isMatch) matched.add(point);
                    else missing.add(point);

                    details.add(new KeyPointMatch(index++, point, target, sim, isMatch));
                }
            }
        } catch (Exception ex) {
            log.warn("Error evaluating answer for question {}: {}", question.getId(), ex.getMessage());
        }

        int total = details.size();
        double matchPct = total > 0 ? ((double) matched.size() / total) * 100.0 : 0.0;
        matchPct = BigDecimal.valueOf(matchPct).setScale(2, RoundingMode.HALF_UP).doubleValue();

        double avgSim = details.stream().mapToDouble(KeyPointMatch::similarity).average().orElse(0.0);

        try {
            auditRepository.save(AiInterviewRagAudit.builder()
                    .aiInterview(interview)
                    .aiQuestion(question)
                    .candidateAnswer(candidateAnswer)
                    .similarityScore(BigDecimal.valueOf(avgSim).setScale(4, RoundingMode.HALF_UP))
                    .thresholdUsed(BigDecimal.valueOf(threshold).setScale(4, RoundingMode.HALF_UP))
                    .matchedKeypointsJson(mapper.writeValueAsString(matched))
                    .missingKeypointsJson(mapper.writeValueAsString(missing))
                    .build());
        } catch (Exception ex) {
            log.warn("Could not save RAG audit log: {}", ex.getMessage());
        }

        return new QuestionRagResult(question.getId(), question.getQuestionText(), matchPct, matched, missing, details);
    }

    /**
     * Holistic RAG evaluation for an interview conversation.
     */
    @Transactional
    public RagInterviewSummary evaluateInterviewConversation(
            AiInterview interview,
            List<InterviewMessage> messages,
            List<AiQuestion> questions,
            double threshold) {
        List<QuestionRagResult> results = new ArrayList<>();
        int totalKeyPoints = 0;
        int totalMatchedKeyPoints = 0;

        String combinedCandidateAnswers = messages.stream()
                .filter(m -> "USER".equals(m.getRole()) && m.getContent() != null && !m.getContent().isBlank())
                .map(InterviewMessage::getContent)
                .reduce("", (a, b) -> a.isEmpty() ? b : a + " " + b);

        for (AiQuestion question : questions) {
            QuestionRagResult res = evaluateAnswer(interview, question, combinedCandidateAnswers, threshold);
            results.add(res);
            totalKeyPoints += res.details().size();
            totalMatchedKeyPoints += res.matchedKeyPoints().size();
        }

        double overallPct = totalKeyPoints > 0
                ? ((double) totalMatchedKeyPoints / totalKeyPoints) * 100.0 : 0.0;
        overallPct = BigDecimal.valueOf(overallPct).setScale(2, RoundingMode.HALF_UP).doubleValue();

        return new RagInterviewSummary(overallPct, threshold, totalKeyPoints, totalMatchedKeyPoints, results);
    }

    /**
     * Evaluate a list of submitted AiAnswer records using RAG & Vector similarity.
     */
    @Transactional
    public RagInterviewSummary evaluateAnswers(
            AiInterview interview,
            List<AiAnswer> answers,
            double threshold) {
        List<QuestionRagResult> results = new ArrayList<>();
        int totalKeyPoints = 0;
        int totalMatchedKeyPoints = 0;

        for (AiAnswer answer : answers) {
            AiQuestion question = answer.getAiQuestion();
            QuestionRagResult res = evaluateAnswer(interview, question, answer.getAnswerText(), threshold);
            results.add(res);
            totalKeyPoints += res.details().size();
            totalMatchedKeyPoints += res.matchedKeyPoints().size();
        }

        double overallPct = totalKeyPoints > 0
                ? ((double) totalMatchedKeyPoints / totalKeyPoints) * 100.0 : 0.0;
        overallPct = BigDecimal.valueOf(overallPct).setScale(2, RoundingMode.HALF_UP).doubleValue();

        return new RagInterviewSummary(overallPct, threshold, totalKeyPoints, totalMatchedKeyPoints, results);
    }
}
