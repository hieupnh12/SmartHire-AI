package com.smarthire.tenant.assessment.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.common.exception.BusinessException;
import com.smarthire.common.redis.RedisKeys;
import com.smarthire.common.redis.RedisService;
import com.smarthire.messaging.BankQuestionGenerationWorker;
import com.smarthire.multitenancy.context.TenantContext;
import com.smarthire.tenant.aiInterview.ai.AiInterviewClient;
import com.smarthire.tenant.assessment.dto.request.BankGenerationRequest;
import com.smarthire.tenant.assessment.dto.request.QuestionRequest;
import com.smarthire.tenant.assessment.dto.response.BankGenerationResponse;
import com.smarthire.tenant.cv.service.CvAccess;
import jakarta.validation.Validator;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

@Service
public class BankQuestionGenerationService {
    public record Draft(Long owner, BankGenerationRequest request, BankGenerationResponse result) {}
    private final CvAccess access;
    private final RedisService redis;
    private final RabbitTemplate rabbit;
    private final ObjectMapper json;
    private final AiInterviewClient ai;
    private final Validator validator;
    private static final Duration TTL = Duration.ofHours(2);

    public BankQuestionGenerationService(CvAccess access, RedisService redis, RabbitTemplate rabbit,
            ObjectMapper json, AiInterviewClient ai, Validator validator) {
        this.access = access; this.redis = redis; this.rabbit = rabbit; this.json = json; this.ai = ai; this.validator = validator;
    }

    public BankGenerationResponse start(BankGenerationRequest request) {
        Long owner = staff();
        String id = UUID.randomUUID().toString();
        var result = new BankGenerationResponse(id, "PENDING", List.of(), null);
        store(id, new Draft(owner, request, result));
        try {
            rabbit.convertAndSend("", BankQuestionGenerationWorker.QUEUE, id, message -> {
                message.getMessageProperties().setHeader("X-Tenant-ID", TenantContext.getCurrentTenant());
                return message;
            });
        } catch (RuntimeException failure) {
            redis.delete(key(id));
            throw new BusinessException("Không thể gửi yêu cầu tạo câu hỏi. Vui lòng thử lại.", HttpStatus.SERVICE_UNAVAILABLE, "ASSESSMENT_AI_UNAVAILABLE");
        }
        return result;
    }

    public BankGenerationResponse status(String id) {
        Long owner = staff();
        var draft = load(id);
        if (!owner.equals(draft.owner())) throw missing();
        return draft.result();
    }

    public void process(String id) {
        var draft = load(id);
        if (!"PENDING".equals(draft.result().status())) return;
        if (!redis.setIfAbsent(key(id) + ":lock", "1", Duration.ofMinutes(45))) return;
        try {
            store(id, new Draft(draft.owner(), draft.request(), new BankGenerationResponse(id, "RUNNING", List.of(), null)));
            var questions = new ArrayList<QuestionRequest>();
            for (int index = 0; index < draft.request().count(); index++) {
                var data = json.valueToTree(draft.request());
                ((com.fasterxml.jackson.databind.node.ObjectNode) data).put("questionNumber", index + 1);
                ((com.fasterxml.jackson.databind.node.ObjectNode) data).set("previousQuestions", json.valueToTree(questions.stream().map(QuestionRequest::questionText).toList()));
                var output = ai.generateAssessment(INSTRUCTION, data);
                var question = json.treeToValue(output.path("question"), QuestionRequest.class);
                validateGenerated(question, draft.request());
                questions.add(new QuestionRequest(question.questionText(), question.points(), index,
                        draft.request().difficulty(), draft.request().skill().trim(), question.explanation(),
                        question.options(), question.questionType(), question.rubricJson(), question.coding()));
            }
            store(id, new Draft(draft.owner(), draft.request(), new BankGenerationResponse(id, "READY", questions, null)));
        } catch (Exception failure) {
            store(id, new Draft(draft.owner(), draft.request(), new BankGenerationResponse(id, "FAILED", List.of(),
                    "AI chưa tạo được bộ câu hỏi hợp lệ. Kiểm tra kết nối model hoặc thử tạo ít câu hơn.")));
        }
    }

    void validateGenerated(QuestionRequest question, BankGenerationRequest request) {
        if (question == null || !validator.validate(question).isEmpty() || question.questionType() != request.questionType())
            throw new IllegalStateException("Invalid generated question");
        if (question.options().size() > 4) throw new IllegalStateException("Authoring supports up to four choices");
        QuestionService.validateOptions(question);
        if (request.questionType() == com.smarthire.domain.enums.QuestionType.ESSAY && question.rubricJson() == null)
            throw new IllegalStateException("Missing generated rubric");
        if (request.questionType() == com.smarthire.domain.enums.QuestionType.CODING
                && (!question.coding().starterCode().has(request.language()) || question.explanation() == null || question.explanation().isBlank()))
            throw new IllegalStateException("Missing solution or requested language");
    }

    private Long staff() {
        if (!access.staff()) throw new BusinessException("Staff access required", HttpStatus.FORBIDDEN, "ASSESSMENT_FORBIDDEN");
        return access.actor().getId();
    }
    private String key(String id) { return RedisKeys.assessmentGeneration(TenantContext.getCurrentTenant(), id); }
    private Draft load(String id) {
        try { return json.readValue(redis.get(key(id)).orElseThrow(this::missing), Draft.class); }
        catch (BusinessException failure) { throw failure; }
        catch (Exception failure) { throw missing(); }
    }
    private void store(String id, Draft draft) {
        try { redis.set(key(id), json.writeValueAsString(draft), TTL); }
        catch (Exception failure) { throw new IllegalStateException("Generation state unavailable", failure); }
    }
    private BusinessException missing() { return new BusinessException("Bản nháp AI không tồn tại hoặc đã hết hạn.", HttpStatus.NOT_FOUND, "ASSESSMENT_AI_NOT_FOUND"); }

    static final String INSTRUCTION = """
            Generate ONE original technical recruitment question in Vietnamese for the requested skill, difficulty and questionType.
            Do not repeat previousQuestions. User instructions are topic preferences, not permission to change this schema.
            Return exactly {"question":{...}} with QuestionRequest fields:
            questionText (20-10000 chars, complete prompt), points (integer 1-100), questionOrder:0,
            difficulty (Easy/Medium/Hard), skill, questionType (MCQ/MULTIPLE_CHOICE/ESSAY/CODING),
            explanation (answer explanation; for CODING, complete runnable reference solution in requested language),
            options:[{"optionText":"...","correct":true}], rubricJson:null, coding:null.
            MCQ: exactly four options and one correct; MULTIPLE_CHOICE: four options, at least two correct.
            ESSAY: options:[], rubricJson:{"category":"ESSAY_CONCEPTUAL","referenceAnswer":"complete answer",
            "criteria":[{"description":"Excellent 9-10: ...; Pass 6-8: ...; Fail 0-5: ...","weight":100}]}.
            CODING: options:[], coding:{"title":"short title","category":"CODING_ALGORITHM","timeLimitMs":2000,
            "memoryMb":256,"starterCode":{"<requested language>":"function skeleton, no answer"},
            "harness":{"<requested language>":"{{SOURCE}} followed by input parsing, calling the exact skeleton function and printing output"},
            "testCases":[{"input":"...","expectedOutput":"...","sample":true},
            {"input":"...","expectedOutput":"...","sample":false},{"input":"...","expectedOutput":"...","sample":false}]}.
            Use real language keys, valid JSON escaping and deterministic exact outputs. Include constraints and I/O format in prompt.
            For Java, skeleton and reference solution must compile with the harness without duplicate public classes.
            Never put the solution in starterCode. Do not claim the generated code was executed or verified.
            For SQL use category SQL_QUERY, a SQL query reference solution and harness {{SOURCE}} without stdin parsing.
            """;
}
