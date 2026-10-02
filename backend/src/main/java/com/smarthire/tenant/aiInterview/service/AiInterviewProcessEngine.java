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
import java.util.Set;
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

    @Transactional(noRollbackFor = {IllegalStateException.class, BusinessException.class})
    public void initializeAndGenerateFirst(AiInterview interview) {
        InterviewPolicies.requireCommunicationOnly(interview);
        if (!InterviewPolicies.isV2(interview)) return;
        if (runs.findByAiInterview_IdOrderByProcessOrderAsc(interview.getId()).isEmpty()) {
            for (InterviewPolicy.Process process : InterviewPolicies.config(interview).policy().processes()) {
                if (!process.enabled()) continue;
                runs.save(AiInterviewProcessRun.builder().aiInterview(interview).processKey(process.key()).processOrder(process.order())
                        .mainQuestionTarget(InterviewProcessSettings.questionCount(process.config())).configSnapshotJson(InterviewPolicies.json(process)).build());
            }
        }
        var ordered = runs.findByAiInterview_IdOrderByProcessOrderAsc(interview.getId());
        if (interview.getStartedAt() == null && interview.getStatus() == AiInterviewStatus.GENERATING && !ordered.isEmpty()
                && ordered.getFirst().getStatus() == AiInterviewProcessStatus.READY) {
            ordered.getFirst().setStatus(AiInterviewProcessStatus.PENDING);
        }
        for (var run : ordered) {
            if (run.getStatus() == AiInterviewProcessStatus.GENERATING) run.setStatus(AiInterviewProcessStatus.PENDING);
        }
        generateNextPending(interview);
    }

    @Transactional
    public void start(AiInterview interview) {
        InterviewPolicies.requireCommunicationOnly(interview);
        if (!InterviewPolicies.isV2(interview)) return;
        var current = runs.findFirstByAiInterview_IdAndStatusOrderByProcessOrderAsc(interview.getId(), AiInterviewProcessStatus.READY)
                .orElseThrow(() -> new BusinessException("Quy trình AI Interview chưa sẵn sàng", HttpStatus.CONFLICT, "AI_INTERVIEW_PROCESS_NOT_READY"));
        current.setStatus(AiInterviewProcessStatus.IN_PROGRESS);
        current.setStartedAt(Instant.now());
        activity.record(interview, "PROCESS_STARTED", current.getProcessKey());
    }

    @Transactional
    public void answerSaved(AiInterview interview, AiQuestion question, AiAnswer answer) { answerSaved(interview, question, answer, null); }

    public void answerSaved(AiInterview interview, AiQuestion question, AiAnswer answer,
            com.smarthire.tenant.aiInterview.dto.request.SpeechMetrics speechMetrics) {
        if (!InterviewPolicies.isV2(interview) || question.getProcessRun() == null) return;
        var run = question.getProcessRun();
        if (run.getStatus() != AiInterviewProcessStatus.IN_PROGRESS) {
            throw new BusinessException("Câu hỏi không thuộc quy trình đang thực hiện", HttpStatus.CONFLICT, "AI_INTERVIEW_PROCESS_LOCKED");
        }
        if (feedbacks.findByAiAnswer_Id(answer.getId()).isPresent()) {
            throw new BusinessException("Câu trả lời đã được chấm và không thể sửa", HttpStatus.CONFLICT, "AI_ANSWER_LOCKED");
        }
        if (question.getParentQuestion() != null && !java.util.Objects.equals(question.getParentQuestion().getProcessRun().getId(), run.getId()))
            throw new IllegalStateException("Invalid follow-up process");
        evaluate(question, answer, speechMetrics);
        if ("MAIN".equals(question.getQuestionRole())) run.setMainQuestionCompleted(run.getMainQuestionCompleted() + 1);
        boolean followUp = generateFollowUp(interview, run, question, answer);
        if (!followUp && run.getMainQuestionCompleted() >= run.getMainQuestionTarget()) {
            completeRunAndGenerateNext(interview, run);
        } else if (!followUp && run.getMainQuestionGenerated() < run.getMainQuestionTarget()
                && run.getProcessKey().equals("COMMUNICATION") && InterviewProcessSettings.bool(settings(run), "adaptiveQuestions", true)) {
            generate(interview, run, question, answer); run.setStatus(AiInterviewProcessStatus.IN_PROGRESS);
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

    private void generate(AiInterview interview, AiInterviewProcessRun run) { generate(interview, run, null, null); }

    private void generate(AiInterview interview, AiInterviewProcessRun run, AiQuestion previous, AiAnswer answer) {
        // Keep the run pending until its questions are validated so a failed call can be retried.
        var config = settings(run);
        var request = generationContext(interview, run, config);
        var policy = InterviewPolicies.config(interview).policy();
        var slots = InterviewProcessQuestions.slots(mapper, run.getProcessKey(), config,
                policy.selectedSkills() == null ? List.of() : policy.selectedSkills(),
                run.getProcessKey().equals("COMMUNICATION") && InterviewProcessSettings.bool(config, "adaptiveQuestions", true) ? 1 : run.getMainQuestionTarget());
        request.set("slots", mapper.valueToTree(slots)); request.put("questionCount", slots.size());
        if (answer != null) { request.put("previousQuestion", previous.getQuestionText()); request.put("previousAnswer", answer.getAnswerText()); }
        var stored = questions.findByAiInterview_IdOrderByQuestionOrderAscIdAsc(interview.getId());
        var replaced = interview.getStartedAt() == null ? stored.stream().filter(q -> q.getProcessRun() != null
                && java.util.Objects.equals(q.getProcessRun().getId(), run.getId())).toList() : List.<AiQuestion>of();
        var paper = stored.stream().filter(q -> !replaced.contains(q)).toList();
        request.set("alreadyAskedQuestions", mapper.valueToTree(paper.stream().map(AiQuestion::getQuestionText).toList()));
        JsonNode output = ai.generate(InterviewProcessQuestions.INSTRUCTION, request).path("questions");
        int overallOrder = paper.stream().mapToInt(AiQuestion::getQuestionOrder).max().orElse(-10) + 10;
        var generated = InterviewProcessQuestions.validate(mapper, interview, run, config, slots, output, overallOrder);
        var existing = paper.stream().map(q -> q.getQuestionText().trim().toLowerCase(Locale.ROOT)).collect(java.util.stream.Collectors.toSet());
        if (generated.stream().anyMatch(q -> existing.contains(q.getQuestionText().trim().toLowerCase(Locale.ROOT))))
            throw new IllegalStateException("Repeated process question");
        if (!replaced.isEmpty()) questions.deleteAll(replaced);
        questions.saveAll(generated);
        run.setMainQuestionGenerated((int) paper.stream().filter(q -> q.getProcessRun() != null && java.util.Objects.equals(q.getProcessRun().getId(), run.getId()) && "MAIN".equals(q.getQuestionRole())).count() + generated.size()); run.setStatus(AiInterviewProcessStatus.READY);
        activity.record(interview, "PROCESS_QUESTIONS_GENERATED", run.getProcessKey() + ": " + generated.size() + " questions");
    }

    private Map<String, Object> settings(AiInterviewProcessRun run) {
        var saved = InterviewPolicies.read(run.getConfigSnapshotJson(), InterviewPolicy.Process.class);
        return InterviewProcessSettings.config(new InterviewPolicy.Process(run.getProcessKey(), true,
                run.getProcessOrder(), saved.weight(), saved.config()));
    }

    private com.fasterxml.jackson.databind.node.ObjectNode generationContext(AiInterview interview, AiInterviewProcessRun run, Map<String, Object> config) {
        var request = interview.getContextSnapshotJson() == null ? mapper.createObjectNode()
                : ((com.fasterxml.jackson.databind.node.ObjectNode) InterviewPolicies.tree(interview.getContextSnapshotJson())).deepCopy();
        var policy = InterviewPolicies.config(interview).policy();
        if (!request.has("jobTitle")) request.put("jobTitle", interview.getApplication().getJob().getTitle());
        if (!request.has("jobDescription")) request.put("jobDescription", interview.getApplication().getJob().getDescription());
        request.put("processKey", run.getProcessKey()); request.set("configuration", mapper.valueToTree(config));
        var common = request.putObject("commonConfiguration");
        common.put("durationMinutes", policy.durationMinutes()); common.set("weights", mapper.valueToTree(policy.weights()));
        common.set("selectedSkills", mapper.valueToTree(policy.selectedSkills()));
        request.put("language", run.getProcessKey().equals("COMMUNICATION") ? config.get("language").toString() : "Vietnamese");
        if (run.getProcessKey().equals("PRACTICAL_EXPERIENCE") && !InterviewProcessSettings.bool(config, "verifyAgainstCV", true))
            request.remove("candidateEvidence");
        return request;
    }

    private void evaluate(AiQuestion question, AiAnswer answer, com.smarthire.tenant.aiInterview.dto.request.SpeechMetrics speechMetrics) {
        if (feedbacks.findByAiAnswer_Id(answer.getId()).isPresent()) return;
        JsonNode rubric = InterviewPolicies.tree(question.getRubricJson());
        boolean choice = InterviewChoiceAnswers.isV2Choice(question);
        var selected = choice ? InterviewChoiceAnswers.parse(question, answer.getAnswerText()) : null;
        String written = choice ? selected.explanation() : answer.getAnswerText();
        BigDecimal accuracy = choice && selected.selected().equals(InterviewChoiceAnswers.correct(question)) ? BigDecimal.valueOf(100) : BigDecimal.ZERO;
        var result = mapper.createObjectNode(); BigDecimal score = accuracy;
        if (!choice || rubric.path("explanationRequired").asBoolean(false)) {
            var data = mapper.createObjectNode().put("question", question.getQuestionText()).put("answer", written);
            data.set("rubric", rubric); data.set("configuration", mapper.valueToTree(settings(question.getProcessRun())));
            var processConfig = settings(question.getProcessRun());
            if ("PRACTICAL_EXPERIENCE".equals(question.getProcessRun().getProcessKey())
                    && InterviewProcessSettings.bool(processConfig, "verifyAgainstCV", true)
                    && question.getAiInterview().getContextSnapshotJson() != null) {
                var evidence = InterviewPolicies.tree(question.getAiInterview().getContextSnapshotJson()).path("candidateEvidence");
                if (evidence.isObject()) data.set("candidateEvidence", evidence);
            }
            boolean communication = "COMMUNICATION".equals(question.getProcessRun().getProcessKey());
            var graded = ai.generate((communication ? "Also return criteria with exactly TECHNICAL_KNOWLEDGE, PROBLEM_SOLVING, REASONING, COMMUNICATION. Each is {score:0-100,evidence:exact answer quote}. Assess job knowledge, feasible solutions, reasoning and clarity. Empty evidence means zero. " : "") + "Grade the written answer strictly against rubric.referenceAnswer and rubric.keyPoints. "
                    + "For each key point return its 0-based index, score 0-100 and evidence copied exactly from the answer. "
                    + "Missing/off-topic content scores 0 with empty evidence. Return {\"keyPoints\":[{\"index\":0,\"score\":80,\"evidence\":\"...\"}],"
                    + "\"feedback\":\"...\",\"strengths\":\"...\",\"weaknesses\":\"...\"}. When candidateEvidence is present, compare actual claims with it "
                    + "and describe supported consistency or contradictions in feedback; missing evidence is unknown. "
                    + "Never award key point credit merely for CV claims or assess personality/accent.", data);
            var entries = graded.path("keyPoints");
            if (!entries.isArray() || entries.size() != rubric.path("keyPoints").size()) throw new IllegalStateException("Invalid process evaluation");
            Set<Integer> seen = new java.util.HashSet<>(); BigDecimal total = BigDecimal.ZERO;
            for (var point : entries) {
                int index = point.path("index").asInt(-1); var value = point.path("score"); String evidence = point.path("evidence").asText("");
                if (!point.path("index").isIntegralNumber() || index < 0 || index >= entries.size() || !seen.add(index)
                        || !value.isNumber() || value.decimalValue().compareTo(BigDecimal.ZERO) < 0 || value.decimalValue().compareTo(BigDecimal.valueOf(100)) > 0)
                    throw new IllegalStateException("Invalid process evaluation score");
                if (!evidence.isBlank() && written.contains(evidence)) total = total.add(value.decimalValue());
            }
            score = total.divide(BigDecimal.valueOf(entries.size()), 2, java.math.RoundingMode.HALF_UP);
            if (choice) score = accuracy.multiply(new BigDecimal("0.7")).add(score.multiply(new BigDecimal("0.3")));
            for (String field : List.of("feedback", "strengths", "weaknesses")) result.put(field, InterviewProcessQuestions.text(graded, field, 10000));
            result.set("keyPoints", entries);
            if (communication) {
                var criteria = graded.path("criteria"); var scores = result.putObject("criteria"); BigDecimal sum = BigDecimal.ZERO;
                for (String key : List.of("TECHNICAL_KNOWLEDGE", "PROBLEM_SOLVING", "REASONING", "COMMUNICATION")) {
                    var row = criteria.path(key); var value = row.path("score"); String quote = row.path("evidence").asText("");
                    if (!value.isNumber() || value.decimalValue().signum() < 0 || value.decimalValue().compareTo(BigDecimal.valueOf(100)) > 0)
                        throw new IllegalStateException("Invalid Communication criterion score");
                    BigDecimal verified = !quote.isBlank() && written.contains(quote) ? value.decimalValue() : BigDecimal.ZERO;
                    scores.put(key, verified); sum = sum.add(verified);
                }
                score = sum.divide(BigDecimal.valueOf(4), 2, java.math.RoundingMode.HALF_UP);
            }
        } else {
            result.put("feedback", accuracy.signum() > 0 ? "Chọn đúng đáp án." : "Lựa chọn chưa chính xác.");
            result.put("strengths", accuracy.signum() > 0 ? "Nắm được kiến thức được kiểm tra." : "Chưa có bằng chứng đạt.");
            result.put("weaknesses", accuracy.signum() > 0 ? "Không có." : "Cần ôn tập kiến thức của câu hỏi.");
        }
        if (speechMetrics != null && InterviewProcessSettings.bool(settings(question.getProcessRun()), "speechSignals", true)) {
            result.set("speechMetrics", mapper.valueToTree(speechMetrics));
            if (speechMetrics.voicedMs() > 0) result.put("wordsPerMinute", written.trim().split("\\s+").length * 60000.0 / speechMetrics.voicedMs());
        }
        result.put("score", score);
        feedbacks.save(AiFeedback.builder().aiAnswer(answer).score(score).feedbackText(result.path("feedback").asText())
                .strengths(result.path("strengths").asText()).weaknesses(result.path("weaknesses").asText()).evaluationJson(result.toString()).build());
    }

    private boolean generateFollowUp(AiInterview interview, AiInterviewProcessRun run, AiQuestion question, AiAnswer answer) {
        if (InterviewChoiceAnswers.isChoice(question)) return false;
        var config = settings(run); int limit = InterviewProcessSettings.followUpLimit(config);
        var root = question.getParentQuestion() == null ? question : question.getParentQuestion();
        var paper = questions.findByProcessRun_IdOrderBySequenceNoAscIdAsc(run.getId());
        long count = paper.stream().filter(q -> q.getParentQuestion() != null && q.getParentQuestion().getId().equals(root.getId())).count();
        if (count >= limit) return false;
        var request = generationContext(interview, run, config); request.put("parentQuestion", question.getQuestionText());
        request.put("candidateAnswer", answer.getAnswerText()); request.put("followUpNumber", count + 1);
        var skills = new ArrayList<String>();
        if (root.getRubricJson() != null) InterviewPolicies.tree(root.getRubricJson()).path("skills").forEach(skill -> skills.add(skill.asText()));
        if (skills.isEmpty() && InterviewPolicies.config(interview).policy().selectedSkills() != null) skills.addAll(InterviewPolicies.config(interview).policy().selectedSkills());
        var slots = InterviewProcessQuestions.slots(mapper, run.getProcessKey(), config, skills == null ? List.of() : skills, 1);
        request.set("slots", mapper.valueToTree(slots)); request.put("questionCount", 1);
        request.set("alreadyAskedQuestions", mapper.valueToTree(paper.stream().map(AiQuestion::getQuestionText).toList()));
        var output = ai.generate(InterviewProcessQuestions.INSTRUCTION
                + " This is an explicitly requested follow-up. Ask one focused question that probes the supplied candidateAnswer, "
                + "respecting configuration and the maximum follow-up depth. Do not repeat the parent or previous questions.", request);
        var follow = InterviewProcessQuestions.validate(mapper, interview, run, config, slots, output.path("questions"), root.getQuestionOrder() + (int) count + 1).getFirst();
        follow.setQuestionRole("FOLLOW_UP"); follow.setParentQuestion(root); follow.setSequenceNo(root.getSequenceNo() + (int) count + 1);
        if (paper.stream().anyMatch(q -> q.getQuestionText().equalsIgnoreCase(follow.getQuestionText()))) throw new IllegalStateException("Repeated follow-up question");
        questions.save(follow); run.setFollowUpCount(run.getFollowUpCount() + 1);
        activity.record(interview, "FOLLOW_UP_GENERATED", run.getProcessKey() + ": follow-up " + (count + 1));
        return true;
    }

    private void completeRunAndGenerateNext(AiInterview interview, AiInterviewProcessRun run) {
        run.setStatus(AiInterviewProcessStatus.COMPLETED); run.setCompletedAt(Instant.now());
        run.setReportJson("{\"completedQuestions\":" + run.getMainQuestionCompleted() + "}");
        activity.record(interview, "PROCESS_COMPLETED", run.getProcessKey());
        generateNextPending(interview);
    }

}
