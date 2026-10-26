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
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

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

    public QuestionBankGenerateService(AiInterviewClient ai, CvAccess access, ObjectMapper json, QuestionRepository questions) {
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
        if (request.topic() != null) payload.put("topic", request.topic().trim());
        if (request.context() != null) {
            String ctx = request.context().trim();
            payload.put("jobContext", ctx.substring(0, Math.min(1500, ctx.length())));
        }

        GeneratedBankQuestionBatch batch;
        try {
            batch = ai.generateBankQuestions(INSTRUCTION, payload, GeneratedBankQuestionBatch.class);
        } catch (IllegalStateException ex) {
            throw new BusinessException("AI question generation unavailable. Check Admin > AI Config (QUESTION_GEN).",
                    HttpStatus.SERVICE_UNAVAILABLE, "QUESTION_GEN_UNAVAILABLE");
        }

        if (batch == null || batch.questions() == null || batch.questions().isEmpty()) {
            throw new BusinessException("AI returned no questions", HttpStatus.BAD_GATEWAY, "QUESTION_GEN_INVALID");
        }

        QuestionType type = QuestionType.valueOf(request.questionType());
        List<BankQuestionRequest> drafts = new ArrayList<>();
        int order = 0;
        int limit = Math.min(request.count(), batch.questions().size());
        for (int i = 0; i < limit; i++) {
            GeneratedBankQuestion item = batch.questions().get(i);
            BankQuestionRequest draft = map(item, type, request.skill().trim(), request.difficulty(), order++);
            try {
                QuestionService.validateOptions(draft.question());
                if (type == QuestionType.ESSAY) {
                    if (draft.question().rubricJson() == null || draft.question().rubricJson().isNull()) {
                        throw new BusinessException("Essay draft missing rubric", HttpStatus.BAD_GATEWAY, "QUESTION_GEN_INVALID");
                    }
                    QuestionContent.validateRubric(draft.question().rubricJson());
                }
            } catch (BusinessException ex) {
                throw new BusinessException("AI draft failed validation: " + ex.getMessage(),
                        HttpStatus.BAD_GATEWAY, "QUESTION_GEN_INVALID");
            }
            drafts.add(draft);
        }
        if (drafts.isEmpty()) {
            throw new BusinessException("AI returned no valid questions", HttpStatus.BAD_GATEWAY, "QUESTION_GEN_INVALID");
        }
        return drafts;
    }

    private BankQuestionRequest map(GeneratedBankQuestion item, QuestionType type, String skill, String difficulty, int order) {
        String text = item.questionText() == null ? "" : item.questionText().trim();
        if (text.isBlank()) {
            throw new BusinessException("AI draft missing questionText", HttpStatus.BAD_GATEWAY, "QUESTION_GEN_INVALID");
        }
        int points = item.points() == null ? (type == QuestionType.ESSAY ? 10 : 5) : item.points();
        points = Math.max(1, Math.min(100, points));
        String explanation = item.explanation() == null ? "" : item.explanation().trim();
        List<OptionRequest> options = List.of();
        JsonNode rubric = null;
        if (type == QuestionType.ESSAY) {
            rubric = toRubricJson(item.rubricJson(), explanation.isBlank() ? text : explanation);
        } else {
            options = mapOptions(item.options());
        }
        QuestionRequest question = new QuestionRequest(text, points, order, difficulty, skill,
                explanation.isBlank() ? null : explanation, options, type, rubric, null);
        ObjectNode meta = json.createObjectNode();
        meta.put("source", "AI");
        meta.put("aiGenerated", true);
        List<Long> similar = findSimilarIds(text);
        if (!similar.isEmpty()) {
            var ids = meta.putArray("similarQuestionIds");
            similar.forEach(ids::add);
        }
        return new BankQuestionRequest(question, meta);
    }

    private List<Long> findSimilarIds(String text) {
        String needle = text.toLowerCase(Locale.ROOT).replaceAll("[^\\p{L}\\p{N}\\s]", " ").replaceAll("\\s+", " ").trim();
        if (needle.length() < 12) return List.of();
        String probe = needle.substring(0, Math.min(48, needle.length())).trim();
        if (probe.length() < 12) return List.of();
        return questions.findSimilarByText(probe, PageRequest.of(0, 3)).stream()
                .map(q -> q.getId())
                .toList();
    }

    private List<OptionRequest> mapOptions(List<GeneratedOption> nodes) {
        if (nodes == null || nodes.isEmpty()) {
            throw new BusinessException("AI draft missing options", HttpStatus.BAD_GATEWAY, "QUESTION_GEN_INVALID");
        }
        List<OptionRequest> options = new ArrayList<>();
        for (GeneratedOption option : nodes) {
            if (option == null || option.optionText() == null || option.optionText().isBlank()) continue;
            options.add(new OptionRequest(option.optionText().trim(), Boolean.TRUE.equals(option.correct())));
        }
        return options;
    }

    private JsonNode toRubricJson(GeneratedRubric rubric, String fallbackReference) {
        if (rubric == null || rubric.referenceAnswer() == null || rubric.referenceAnswer().isBlank()
                || rubric.criteria() == null || rubric.criteria().isEmpty()) {
            return defaultRubric(fallbackReference);
        }
        ObjectNode node = json.createObjectNode();
        node.put("referenceAnswer", rubric.referenceAnswer().trim());
        ArrayNode criteria = node.putArray("criteria");
        for (GeneratedCriterion criterion : rubric.criteria()) {
            if (criterion == null || criterion.description() == null || criterion.description().isBlank()) continue;
            ObjectNode row = criteria.addObject();
            row.put("description", criterion.description().trim());
            row.put("weight", criterion.weight() == null ? 0 : criterion.weight());
        }
        return criteria.isEmpty() ? defaultRubric(fallbackReference) : node;
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
}
