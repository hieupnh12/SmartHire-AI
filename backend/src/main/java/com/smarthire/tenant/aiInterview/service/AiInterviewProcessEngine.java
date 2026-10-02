package com.smarthire.tenant.aiInterview.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.AiInterviewProcessStatus;
import com.smarthire.domain.enums.AiInterviewStatus;
import com.smarthire.domain.tenant.entity.AiAnswer;
import com.smarthire.domain.tenant.entity.AiFeedback;
import com.smarthire.domain.tenant.entity.AiInterview;
import com.smarthire.domain.tenant.entity.AiInterviewProcessRun;
import com.smarthire.domain.tenant.entity.AiQuestion;
import com.smarthire.domain.tenant.repository.AiFeedbackRepository;
import com.smarthire.domain.tenant.repository.AiInterviewProcessRunRepository;
import com.smarthire.domain.tenant.repository.AiQuestionRepository;
import com.smarthire.tenant.aiInterview.ai.AiInterviewClient;
import com.smarthire.tenant.aiInterview.dto.request.InterviewPolicy;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** V2 process state machine. It never exposes future-process questions to the candidate. */
@Service
public class AiInterviewProcessEngine {
    private final AiInterviewProcessRunRepository runs;
    private final AiQuestionRepository questions;
    private final AiFeedbackRepository feedbacks;
    private final AiInterviewClient ai;
    private final ObjectMapper mapper;
    private final AiInterviewActivityLog activity;

    public AiInterviewProcessEngine(AiInterviewProcessRunRepository runs, AiQuestionRepository questions,
            AiFeedbackRepository feedbacks, AiInterviewClient ai, ObjectMapper mapper, AiInterviewActivityLog activity) {
        this.runs = runs; this.questions = questions; this.feedbacks = feedbacks; this.ai = ai; this.mapper = mapper; this.activity = activity;
    }

    @Transactional
    public void initializeAndGenerateFirst(AiInterview interview) {
        if (!InterviewPolicies.isV2(interview)) return;
        if (runs.findByAiInterview_IdOrderByProcessOrderAsc(interview.getId()).isEmpty()) {
            for (InterviewPolicy.Process process : InterviewPolicies.config(interview).policy().processes()) {
                if (!process.enabled()) continue;
                runs.save(AiInterviewProcessRun.builder().aiInterview(interview).processKey(process.key()).processOrder(process.order())
                        .mainQuestionTarget(questionCount(process.config())).configSnapshotJson(InterviewPolicies.json(process)).build());
            }
        }
        generateNextPending(interview);
    }

    @Transactional
    public void start(AiInterview interview) {
        if (!InterviewPolicies.isV2(interview)) return;
        var current = runs.findFirstByAiInterview_IdAndStatusOrderByProcessOrderAsc(interview.getId(), AiInterviewProcessStatus.READY)
                .orElseThrow(() -> new BusinessException("Quy trình AI Interview chưa sẵn sàng", HttpStatus.CONFLICT, "AI_INTERVIEW_PROCESS_NOT_READY"));
        current.setStatus(AiInterviewProcessStatus.IN_PROGRESS);
        current.setStartedAt(Instant.now());
        activity.record(interview, "PROCESS_STARTED", current.getProcessKey());
    }

    @Transactional
    public void answerSaved(AiInterview interview, AiQuestion question, AiAnswer answer) {
        if (!InterviewPolicies.isV2(interview) || question.getProcessRun() == null) return;
        var run = question.getProcessRun();
        if (run.getStatus() != AiInterviewProcessStatus.IN_PROGRESS) {
            throw new BusinessException("Câu hỏi không thuộc quy trình đang thực hiện", HttpStatus.CONFLICT, "AI_INTERVIEW_PROCESS_LOCKED");
        }
        if (feedbacks.findByAiAnswer_Id(answer.getId()).isPresent()) {
            throw new BusinessException("Câu trả lời đã được chấm và không thể sửa", HttpStatus.CONFLICT, "AI_ANSWER_LOCKED");
        }
        evaluate(question, answer);
        if ("MAIN".equals(question.getQuestionRole())) run.setMainQuestionCompleted(run.getMainQuestionCompleted() + 1);
        if (run.getMainQuestionCompleted() >= run.getMainQuestionTarget()) {
            completeRunAndGenerateNext(interview, run);
        }
    }

    private void generateNextPending(AiInterview interview) {
        var next = runs.findFirstByAiInterview_IdAndStatusOrderByProcessOrderAsc(interview.getId(), AiInterviewProcessStatus.PENDING);
        if (next.isEmpty()) {
            if (interview.getStartedAt() != null) {
                interview.setCompletedAt(Instant.now());
                interview.setStatus(AiInterviewStatus.SCORING);
                activity.record(interview, "ALL_PROCESSES_COMPLETED", "Evaluation queued");
            }
            return;
        }
        generate(interview, next.get());
        if (interview.getStartedAt() != null) {
            next.get().setStatus(AiInterviewProcessStatus.IN_PROGRESS);
            next.get().setStartedAt(Instant.now());
            activity.record(interview, "PROCESS_STARTED", next.get().getProcessKey());
        }
    }

    private void generate(AiInterview interview, AiInterviewProcessRun run) {
        run.setStatus(AiInterviewProcessStatus.GENERATING);
        var request = mapper.createObjectNode();
        request.put("jobTitle", interview.getApplication().getJob().getTitle());
        request.put("jobDescription", interview.getApplication().getJob().getDescription());
        request.put("processKey", run.getProcessKey());
        request.set("configuration", InterviewPolicies.tree(run.getConfigSnapshotJson()));
        request.put("questionCount", run.getMainQuestionTarget());
        JsonNode output = ai.generate("Generate exactly questionCount Vietnamese interview questions for one process. Return "
                + "{\"questions\":[{\"questionText\":\"...\",\"questionType\":\"CONCEPTUAL|SCENARIO|EXPERIENCE_BASED|CODE_REVIEW|BEHAVIORAL|COMMUNICATION\","
                + "\"referenceAnswer\":\"...\",\"keyPoints\":[\"...\"]}]}. Every question must have a private model answer and 3-6 scoring key points. "
                + "Never put the answer in questionText.", request).path("questions");
        if (!output.isArray() || output.size() != run.getMainQuestionTarget()) throw new IllegalStateException("Invalid process question count");
        List<AiQuestion> generated = new ArrayList<>();
        int overallOrder = questions.findByAiInterview_IdOrderByQuestionOrderAscIdAsc(interview.getId()).size();
        for (int index = 0; index < output.size(); index++) {
            JsonNode row = output.get(index);
            String text = row.path("questionText").asText().trim();
            String reference = row.path("referenceAnswer").asText().trim();
            if (text.isEmpty() || reference.isEmpty() || !row.path("keyPoints").isArray() || row.path("keyPoints").size() < 3) {
                throw new IllegalStateException("Invalid process question rubric");
            }
            String type = row.path("questionType").asText("CONCEPTUAL").toUpperCase(Locale.ROOT);
            if (!List.of("CONCEPTUAL", "SCENARIO", "EXPERIENCE_BASED", "CODE_REVIEW", "BEHAVIORAL", "COMMUNICATION").contains(type)) type = "CONCEPTUAL";
            var rubric = mapper.createObjectNode(); rubric.put("processKey", run.getProcessKey()); rubric.put("referenceAnswer", reference); rubric.set("keyPoints", row.path("keyPoints"));
            generated.add(AiQuestion.builder().aiInterview(interview).processRun(run).questionText(text).questionType(type)
                    .questionOrder(overallOrder + index).sequenceNo(index + 1).questionRole("MAIN").rubricJson(rubric.toString()).build());
        }
        questions.saveAll(generated);
        run.setMainQuestionGenerated(generated.size()); run.setStatus(AiInterviewProcessStatus.READY);
        activity.record(interview, "PROCESS_QUESTIONS_GENERATED", run.getProcessKey() + ": " + generated.size() + " questions");
    }

    private void evaluate(AiQuestion question, AiAnswer answer) {
        if (feedbacks.findByAiAnswer_Id(answer.getId()).isPresent()) return;
        JsonNode rubric = InterviewPolicies.tree(question.getRubricJson());
        var data = mapper.createObjectNode(); data.put("answer", answer.getAnswerText()); data.set("rubric", rubric);
        JsonNode result = ai.generate("Grade the answer only against rubric.referenceAnswer and rubric.keyPoints. Return "
                + "{\"score\":0-100,\"feedback\":\"...\",\"strengths\":\"...\",\"weaknesses\":\"...\"}. Do not assess personality or accent.", data);
        BigDecimal score = BigDecimal.valueOf(Math.clamp(result.path("score").asInt(0), 0, 100));
        feedbacks.save(AiFeedback.builder().aiAnswer(answer).score(score).feedbackText(result.path("feedback").asText())
                .strengths(result.path("strengths").asText()).weaknesses(result.path("weaknesses").asText()).evaluationJson(result.toString()).build());
    }

    private void completeRunAndGenerateNext(AiInterview interview, AiInterviewProcessRun run) {
        run.setStatus(AiInterviewProcessStatus.COMPLETED); run.setCompletedAt(Instant.now());
        run.setReportJson("{\"completedQuestions\":" + run.getMainQuestionCompleted() + "}");
        activity.record(interview, "PROCESS_COMPLETED", run.getProcessKey());
        generateNextPending(interview);
    }

    private int questionCount(Map<String, Object> config) {
        for (String key : List.of("questionCount", "problemCount", "mainQuestionCount", "scenarioCount", "conversationTopics")) {
            Object value = config.get(key);
            if (value instanceof Number number) return Math.clamp(number.intValue(), 1, 10);
            if (value instanceof String text) try { return Math.clamp(Integer.parseInt(text), 1, 10); } catch (NumberFormatException ignored) { }
        }
        return 1;
    }
}
