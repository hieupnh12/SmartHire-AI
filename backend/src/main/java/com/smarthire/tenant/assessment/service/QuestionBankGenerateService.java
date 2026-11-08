package com.smarthire.tenant.assessment.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.QuestionType;
import com.smarthire.tenant.aiInterview.ai.AiInterviewClient;
import com.smarthire.tenant.assessment.ai.GeneratedBankQuestionBatch;
import com.smarthire.tenant.assessment.ai.GeneratedBankQuestionBatch.GeneratedBankQuestion;
import com.smarthire.tenant.assessment.ai.GeneratedBankQuestionBatch.GeneratedCriterion;
import com.smarthire.tenant.assessment.ai.GeneratedBankQuestionBatch.GeneratedOption;
import com.smarthire.tenant.assessment.ai.GeneratedBankQuestionBatch.GeneratedRubric;
import com.smarthire.domain.tenant.repository.QuestionRepository;
import com.smarthire.tenant.assessment.dto.request.BankQuestionRequest;
import com.smarthire.tenant.assessment.dto.request.QuestionBankGenerateRequest;
import com.smarthire.tenant.assessment.dto.request.QuestionRequest;
import com.smarthire.tenant.assessment.dto.request.QuestionRequest.OptionRequest;
import com.smarthire.tenant.cv.service.CvAccess;
import com.smarthire.multitenancy.context.TenantContext;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.atomic.AtomicBoolean;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@lombok.extern.slf4j.Slf4j
@Service
public class QuestionBankGenerateService {
    private static final String INSTRUCTION = """
            You draft technical assessment questions for a hiring question bank.
            Return JSON matching the schema for GeneratedBankQuestionBatch: {"questions":[...]} with exactly the requested count.
            Each item: questionText (string), points (int 1..100), explanation (string),
            options (array of {optionText, correct}) for MCQ/MULTIPLE_CHOICE only,
            rubricJson for ESSAY only as {"referenceAnswer":string,"criteria":[{"description":string,"weight":int}]}
            with criteria weights summing to 100 and 2..5 criteria.
            MCQ: 4 options, exactly one correct. MULTIPLE_CHOICE: 4..6 options, at least two correct.
            ESSAY: options empty or omit; fill rubricJson. Difficulty and skill must match the request.
            When jobContext is provided, align topics with that job description without copying it verbatim.
            Write in the requested language. Do not invent coding problems. No markdown fences.
            """;

    private final AiInterviewClient ai;
    private final CvAccess access;
    private final ObjectMapper json;
    private final QuestionRepository questions;

    public QuestionBankGenerateService(AiInterviewClient ai, CvAccess access, ObjectMapper json,
            QuestionRepository questions) {
        this.ai = ai;
        this.access = access;
        this.json = json;
        this.questions = questions;
    }

    public List<BankQuestionRequest> generate(QuestionBankGenerateRequest request) {
        if (!access.staff()) {
            throw new BusinessException("Staff access required", HttpStatus.FORBIDDEN, "ASSESSMENT_FORBIDDEN");
        }
        access.actor();
        ObjectNode payload = json.createObjectNode();
        payload.put("skill", request.skill().trim());
        payload.put("difficulty", request.difficulty());
        payload.put("questionType", request.questionType());
        payload.put("count", request.count());
        payload.put("language", request.language());
        if (request.topic() != null)
            payload.put("topic", request.topic().trim());
        if (request.context() != null) {
            String ctx = request.context().trim();
            payload.put("jobContext", ctx.substring(0, Math.min(4000, ctx.length())));
        }

        GeneratedBankQuestionBatch batch;
        try {
            batch = ai.generateBankQuestions(INSTRUCTION, payload, GeneratedBankQuestionBatch.class);
        } catch (IllegalStateException ex) {
            throw new BusinessException("AI question generation unavailable. Check Admin > AI Config (QUESTION_GEN).",
                    HttpStatus.SERVICE_UNAVAILABLE, "QUESTION_GEN_UNAVAILABLE");
        } catch (Exception ex) {
            log.error("AI question generation failed: {}", ex.getMessage(), ex);
            throw new BusinessException(
                    "Không thể kết nối dịch vụ AI hoặc AI trả về định dạng không hợp lệ. Vui lòng thử lại.",
                    HttpStatus.BAD_GATEWAY, "QUESTION_GEN_FAILED");
        }

        if (batch == null || batch.questions() == null || batch.questions().isEmpty()) {
            throw new BusinessException("AI returned no questions", HttpStatus.BAD_GATEWAY, "QUESTION_GEN_INVALID");
        }

        QuestionType type = QuestionType.valueOf(request.questionType());
        List<BankQuestionRequest> drafts = new ArrayList<>();
        int order = 0;
        int limit = Math.min(request.count(), batch.questions().size());
        String lastFailureReason = null;
        AiInterviewClient.AiExecutionInfo exec = ai.getLastExecutionInfo();
        String modelName = exec != null ? exec.displayName() : null;
        for (int i = 0; i < limit; i++) {
            GeneratedBankQuestion item = batch.questions().get(i);
            try {
                BankQuestionRequest draft = map(item, type, request.skill().trim(), request.difficulty(), order, modelName);
                QuestionService.validateOptions(draft.question());
                if (type == QuestionType.ESSAY) {
                    if (draft.question().rubricJson() == null || draft.question().rubricJson().isNull()) {
                        throw new BusinessException("Essay draft missing rubric", HttpStatus.BAD_GATEWAY,
                                "QUESTION_GEN_INVALID");
                    }
                    QuestionContent.validateRubric(draft.question().rubricJson());
                }
                drafts.add(draft);
                order++;
            } catch (Exception ex) {
                log.warn("Skipping invalid AI generated question at index {}: {}", i, ex.getMessage());
                lastFailureReason = ex.getMessage();
            }
        }
        if (drafts.isEmpty()) {
            String msg = lastFailureReason != null && !lastFailureReason.isBlank()
                    ? "AI sinh câu hỏi thất bại: " + lastFailureReason
                    : "AI không tạo được câu hỏi nào hợp lệ theo tiêu chuẩn kiểm duyệt. Vui lòng thử lại với chủ đề hoặc kỹ năng cụ thể hơn.";
            throw new BusinessException(msg, HttpStatus.BAD_GATEWAY, "QUESTION_GEN_INVALID");
        }
        return drafts;
    }

    private BankQuestionRequest map(GeneratedBankQuestion item, QuestionType type, String skill, String difficulty,
            int order, String modelName) {
        String text = item.questionText() == null ? "" : item.questionText().trim();
        if (text.isBlank()) {
            throw new BusinessException("AI draft missing questionText", HttpStatus.BAD_GATEWAY,
                    "QUESTION_GEN_INVALID");
        }
        int points = item.points() == null ? (type == QuestionType.ESSAY ? 10 : 5) : item.points();
        points = Math.max(1, Math.min(100, points));
        String explanation = item.explanation() == null ? "" : item.explanation().trim();
        List<OptionRequest> options = List.of();
        JsonNode rubric = null;
        if (type == QuestionType.ESSAY) {
            rubric = toRubricJson(item.rubricJson(), explanation.isBlank() ? text : explanation);
        } else {
            options = mapOptions(item.options(), type);
        }
        QuestionRequest question = new QuestionRequest(text, points, order, difficulty, skill,
                explanation.isBlank() ? null : explanation, options, type, rubric, null);
        ObjectNode meta = json.createObjectNode();
        meta.put("source", "AI");
        meta.put("aiGenerated", true);
        if (modelName != null && !modelName.isBlank()) {
            meta.put("model", modelName);
            meta.put("aiModel", modelName);
        }
        List<Long> similar = findSimilarIds(text);
        if (!similar.isEmpty()) {
            var ids = meta.putArray("similarQuestionIds");
            similar.forEach(ids::add);
        }
        return new BankQuestionRequest(question, meta);
    }

    private List<Long> findSimilarIds(String text) {
        String needle = text.toLowerCase(Locale.ROOT).replaceAll("[^\\p{L}\\p{N}\\s]", " ").replaceAll("\\s+", " ")
                .trim();
        if (needle.length() < 12)
            return List.of();
        String probe = needle.substring(0, Math.min(48, needle.length())).trim();
        if (probe.length() < 12)
            return List.of();
        return questions.findSimilarByText(probe, PageRequest.of(0, 3)).stream()
                .map(q -> q.getId())
                .toList();
    }

    private List<OptionRequest> mapOptions(List<GeneratedOption> nodes, QuestionType type) {
        if (nodes == null || nodes.isEmpty()) {
            throw new BusinessException("AI draft missing options", HttpStatus.BAD_GATEWAY, "QUESTION_GEN_INVALID");
        }
        List<OptionRequest> rawOptions = new ArrayList<>();
        for (GeneratedOption option : nodes) {
            if (option == null || option.optionText() == null || option.optionText().isBlank())
                continue;
            rawOptions.add(new OptionRequest(option.optionText().trim(), Boolean.TRUE.equals(option.correct())));
        }
        if (rawOptions.size() < 2) {
            throw new BusinessException("AI draft must have at least 2 options", HttpStatus.BAD_GATEWAY,
                    "QUESTION_GEN_INVALID");
        }

        // Auto-heal / normalize correct options count to satisfy
        // QuestionService.validateType
        long correctCount = rawOptions.stream().filter(o -> Boolean.TRUE.equals(o.correct())).count();
        if (type == QuestionType.MCQ) {
            // Exactly one option must be correct
            if (correctCount == 0) {
                List<OptionRequest> healed = new ArrayList<>();
                for (int i = 0; i < rawOptions.size(); i++) {
                    healed.add(new OptionRequest(rawOptions.get(i).optionText(), i == 0));
                }
                return healed;
            } else if (correctCount > 1) {
                boolean firstKept = false;
                List<OptionRequest> healed = new ArrayList<>();
                for (OptionRequest o : rawOptions) {
                    if (Boolean.TRUE.equals(o.correct())) {
                        if (!firstKept) {
                            healed.add(o);
                            firstKept = true;
                        } else {
                            healed.add(new OptionRequest(o.optionText(), false));
                        }
                    } else {
                        healed.add(o);
                    }
                }
                return healed;
            }
        } else if (type == QuestionType.MULTIPLE_CHOICE) {
            // At least two options must be correct
            if (correctCount < 2) {
                List<OptionRequest> healed = new ArrayList<>();
                int needed = 2 - (int) correctCount;
                int added = 0;
                for (OptionRequest o : rawOptions) {
                    if (Boolean.TRUE.equals(o.correct())) {
                        healed.add(o);
                    } else if (added < needed) {
                        healed.add(new OptionRequest(o.optionText(), true));
                        added++;
                    } else {
                        healed.add(o);
                    }
                }
                return healed;
            }
        }
        return rawOptions;
    }

    private JsonNode toRubricJson(GeneratedRubric rubric, String fallbackReference) {
        if (rubric == null || rubric.referenceAnswer() == null || rubric.referenceAnswer().isBlank()
                || rubric.criteria() == null || rubric.criteria().isEmpty()) {
            return defaultRubric(fallbackReference);
        }
        List<GeneratedCriterion> validCriteria = rubric.criteria().stream()
                .filter(c -> c != null && c.description() != null && !c.description().isBlank())
                .toList();
        if (validCriteria.isEmpty() || validCriteria.size() > 20) {
            return defaultRubric(fallbackReference);
        }

        int totalWeight = validCriteria.stream().mapToInt(c -> c.weight() != null && c.weight() > 0 ? c.weight() : 1)
                .sum();

        ObjectNode node = json.createObjectNode();
        node.put("referenceAnswer", rubric.referenceAnswer().trim());
        ArrayNode criteriaArray = node.putArray("criteria");

        int runningSum = 0;
        for (int i = 0; i < validCriteria.size(); i++) {
            GeneratedCriterion c = validCriteria.get(i);
            int rawWeight = c.weight() != null && c.weight() > 0 ? c.weight() : 1;
            int normalizedWeight;
            if (i == validCriteria.size() - 1) {
                normalizedWeight = Math.max(1, 100 - runningSum);
            } else {
                normalizedWeight = Math.max(1, Math.round((rawWeight / (float) totalWeight) * 100));
                runningSum += normalizedWeight;
            }
            ObjectNode row = criteriaArray.addObject();
            row.put("description", c.description().trim());
            row.put("weight", normalizedWeight);
        }
        return node;
    }

    private JsonNode defaultRubric(String reference) {
        ObjectNode rubric = json.createObjectNode();
        rubric.put("referenceAnswer", reference);
        ArrayNode criteria = rubric.putArray("criteria");
        ObjectNode c1 = criteria.addObject();
        c1.put("description", "Đúng bản chất / kiến thức cốt lõi");
        c1.put("weight", 60);
        ObjectNode c2 = criteria.addObject();
        c2.put("description", "Giải thích rõ và có ví dụ / áp dụng");
        c2.put("weight", 40);
        return rubric;
    }

    public SseEmitter generateStream(QuestionBankGenerateRequest request) {
        if (!access.staff()) {
            throw new BusinessException("Staff access required", HttpStatus.FORBIDDEN, "ASSESSMENT_FORBIDDEN");
        }
        access.actor();
        String tenant = TenantContext.getCurrentTenant();
        var emitter = new SseEmitter(180_000L); // 3 minutes timeout

        AtomicBoolean cancelled = new AtomicBoolean(false);
        emitter.onCompletion(() -> cancelled.set(true));
        emitter.onTimeout(() -> cancelled.set(true));
        emitter.onError(e -> cancelled.set(true));

        CompletableFuture.runAsync(() -> {
            TenantContext.setCurrentTenant(tenant);
            try {
                // Event 1: generation_started
                sendSse(emitter, "generation_started", Map.of(
                        "count", request.count(),
                        "skill", request.skill().trim(),
                        "questionType", request.questionType()));

                // Event 2: generation_progress - Analyzing
                sendSse(emitter, "generation_progress", Map.of(
                        "stage", "analyzing",
                        "message", request.context() != null
                                ? "Đang phân tích Yêu cầu công việc (JD) & Kỹ năng trọng tâm..."
                                : "Đang phân tích cấu trúc chuyên môn kỹ năng " + request.skill().trim() + "...",
                        "step", 1,
                        "progressPercent", 15));

                String ctx = request.context() != null ? request.context().trim() : null;
                String jobContext = ctx != null ? ctx.substring(0, Math.min(4000, ctx.length())) : null;
                QuestionType type = QuestionType.valueOf(request.questionType());
                int targetCount = Math.max(1, Math.min(5, request.count()));

                List<BankQuestionRequest> drafts = new ArrayList<>();
                List<String> previousQuestionTexts = new ArrayList<>();
                String lastFailureReason = null;

                for (int qIdx = 0; qIdx < targetCount; qIdx++) {
                    if (cancelled.get()) {
                        log.info("Question generation stream cancelled by client at question {}/{}", qIdx + 1,
                                targetCount);
                        return;
                    }

                    // Progress update for current question drafting
                    int progress = 15 + Math.round((qIdx / (float) targetCount) * 75);
                    sendSse(emitter, "generation_progress", Map.of(
                            "stage", "generating",
                            "message",
                            "Đang biên soạn nội dung câu hỏi " + (qIdx + 1) + "/" + targetCount + " (" + request.questionType()
                                    + " " + request.skill().trim() + ")...",
                            "step", 2,
                            "progressPercent", progress,
                            "currentQuestionIndex", qIdx));

                    ObjectNode payload = json.createObjectNode();
                    payload.put("skill", request.skill().trim());
                    payload.put("difficulty", request.difficulty());
                    payload.put("questionType", request.questionType());
                    payload.put("count", 1);
                    payload.put("language", request.language());
                    if (request.topic() != null)
                        payload.put("topic", request.topic().trim());
                    if (jobContext != null)
                        payload.put("jobContext", jobContext);
                    if (!previousQuestionTexts.isEmpty()) {
                        payload.set("previousQuestions", json.valueToTree(previousQuestionTexts));
                    }

                    if (qIdx > 0) {
                        try {
                            Thread.sleep(400);
                        } catch (InterruptedException ignored) {
                        }
                    }

                    GeneratedBankQuestionBatch batch = null;
                    for (int attempt = 0; attempt < 2; attempt++) {
                        if (cancelled.get()) return;
                        if (attempt > 0) {
                            try {
                                Thread.sleep(600);
                            } catch (InterruptedException ignored) {
                            }
                        }
                        try {
                            batch = ai.generateBankQuestions(INSTRUCTION, payload, GeneratedBankQuestionBatch.class);
                            if (batch != null && batch.questions() != null && !batch.questions().isEmpty()) {
                                break;
                            }
                        } catch (Exception ex) {
                            log.warn("Attempt {}/2 failed generating question {}/{}: {}",
                                    attempt + 1, qIdx + 1, targetCount, ex.getMessage());
                            lastFailureReason = ex.getMessage();
                            if (attempt == 1 && qIdx == 0) {
                                String errorMsg = ex.getMessage() != null && !ex.getMessage().isBlank()
                                        ? ex.getMessage()
                                        : "Dịch vụ AI không phản hồi hoặc mất kết nối";
                                sendSse(emitter, "generation_error", Map.of("message", "Lỗi kết nối AI: " + errorMsg));
                                emitter.complete();
                                return;
                            }
                        }
                    }

                    if (batch == null || batch.questions() == null || batch.questions().isEmpty()) {
                        continue;
                    }

                    GeneratedBankQuestion item = batch.questions().get(0);
                    try {
                        AiInterviewClient.AiExecutionInfo exec = ai.getLastExecutionInfo();
                        String modelName = exec != null ? exec.displayName() : null;
                        BankQuestionRequest draft = map(item, type, request.skill().trim(), request.difficulty(),
                                drafts.size(), modelName);
                        QuestionService.validateOptions(draft.question());
                        if (type == QuestionType.ESSAY) {
                            if (draft.question().rubricJson() == null || draft.question().rubricJson().isNull()) {
                                throw new BusinessException("Essay draft missing rubric", HttpStatus.BAD_GATEWAY,
                                        "QUESTION_GEN_INVALID");
                            }
                            QuestionContent.validateRubric(draft.question().rubricJson());
                        }

                        // Verifying stage progress
                        int verifyingProgress = 15 + Math.round(((qIdx + 0.8f) / (float) targetCount) * 75);
                        sendSse(emitter, "generation_progress", Map.of(
                                "stage", "verifying",
                                "message",
                                "Đang thẩm định logic đáp án & đối soát ngân hàng cho câu " + (qIdx + 1) + "...",
                                "step", 3,
                                "progressPercent", verifyingProgress,
                                "currentQuestionIndex", qIdx));

                        drafts.add(draft);
                        previousQuestionTexts.add(draft.question().questionText());

                        // Event 3: question_created (Pushed immediately!)
                        sendSse(emitter, "question_created", Map.of(
                                "question", draft.question(),
                                "authoringMetadata", draft.authoringMetadata(),
                                "index", qIdx,
                                "total", targetCount));
                    } catch (Exception ex) {
                        log.warn("Skipping invalid question during stream at index {}: {}", qIdx, ex.getMessage());
                        lastFailureReason = ex.getMessage();
                    }
                }

                if (drafts.isEmpty()) {
                    String msg = lastFailureReason != null && !lastFailureReason.isBlank()
                            ? "AI sinh câu hỏi thất bại: " + lastFailureReason
                            : "AI không tạo được câu hỏi nào hợp lệ theo tiêu chuẩn kiểm duyệt. Vui lòng thử lại với chủ đề hoặc kỹ năng cụ thể hơn.";
                    sendSse(emitter, "generation_error", Map.of("message", msg));
                    emitter.complete();
                    return;
                }

                // Event 4: generation_completed
                sendSse(emitter, "generation_completed", Map.of(
                        "count", drafts.size(),
                        "questions", drafts));
                emitter.complete();
            } catch (Exception ex) {
                log.error("Error in question generation stream: {}", ex.getMessage(), ex);
                try {
                    sendSse(emitter, "generation_error", Map.of("message", ex.getMessage()));
                } catch (Exception ignored) {
                }
                emitter.complete();
            } finally {
                TenantContext.clear();
            }
        });

        return emitter;
    }

    private void sendSse(SseEmitter emitter, String eventName, Object data) {
        try {
            emitter.send(SseEmitter.event()
                    .name(eventName)
                    .data(data, MediaType.APPLICATION_JSON));
        } catch (Exception ex) {
            log.debug("Client closed SSE connection: {}", ex.getMessage());
        }
    }
}
