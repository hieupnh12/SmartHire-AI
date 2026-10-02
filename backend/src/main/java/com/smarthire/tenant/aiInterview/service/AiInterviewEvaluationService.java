package com.smarthire.tenant.aiInterview.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.smarthire.domain.enums.*;
import com.smarthire.domain.tenant.entity.*;
import com.smarthire.domain.tenant.repository.*;
import com.smarthire.tenant.aiInterview.ai.AiInterviewClient;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AiInterviewEvaluationService {
    private static final Logger log = LoggerFactory.getLogger(AiInterviewEvaluationService.class);
    static final int MIN_QUESTIONS = 1;
    static final int MAX_QUESTIONS = 30;
    // Small batches keep every provider response well inside the model output limit.
    static final int QUESTION_BATCH = 10;
    static final int EVALUATION_BATCH = 10;
    private static final Set<String> QUESTION_TYPES = Set.of("TECHNICAL", "SITUATIONAL", "BEHAVIORAL");
    private static final String GENERATE_INSTRUCTION = "Generate exactly questionCount Vietnamese interview questions for"
            + " this job, based on jobDescription, responsibilities, requirements and jobSkills (and candidateEvidence when"
            + " present). Mostly TECHNICAL questions on the required skills; some SITUATIONAL or BEHAVIORAL questions about"
            + " applying them in this role are allowed. Never repeat or paraphrase any item of alreadyAskedQuestions."
            + " Return {\"questions\":[{\"questionText\":\"...\",\"questionType\":\"TECHNICAL|SITUATIONAL|BEHAVIORAL\"}]}."
            + " Do not include answers.";
    private static final String REFERENCE_FORMAT = "referenceAnswer: a concise correct model answer in Vietnamese; keyPoints: 3-6 items"
            + " {\"point\":\"one specific idea a correct answer must contain\",\"target\":\"...\"}. When the question has a rubric,"
            + " target must be exactly one of its competencies or skills and every competency and skill needs at least one key point;"
            + " without a rubric omit target.";
    private static final String REFERENCE_INSTRUCTION = "Write the answer key for every supplied interview question before any"
            + " candidate answer is seen. " + REFERENCE_FORMAT
            + " Return {\"references\":[{\"questionId\":1,\"referenceAnswer\":\"...\",\"keyPoints\":[{\"point\":\"...\",\"target\":\"...\"}]}]}.";
    private static final String EVALUATE_INSTRUCTION = "Grade each answer strictly against its rubric.referenceAnswer and"
            + " rubric.keyPoints (index = 0-based position in rubric.keyPoints). For every key point give score 0-100 for how"
            + " correctly and completely the answer covers it, and evidence: an exact quote copied verbatim from the answer."
            + " A key point the answer does not cover scores 0 with empty evidence; an empty, off-topic or meaningless answer"
            + " scores 0 on every key point. Never credit content that is not written in the answer. Do not judge accent,"
            + " personality or untested skills. Return exactly one evaluation for every answerId:"
            + " {\"evaluations\":[{\"answerId\":1,\"keyPoints\":[{\"index\":0,\"score\":80,\"evidence\":\"...\"}],"
            + "\"feedback\":\"compare with the reference answer\",\"strengths\":\"...\",\"weaknesses\":\"...\"}]}.";

    private final AiInterviewRepository interviews;
    private final AiQuestionRepository questions;
    private final AiAnswerRepository answers;
    private final AiFeedbackRepository feedbacks;
    private final JobSkillRepository skills;
    private final CvRepository cvs;
    private final CvExtractionRepository extractions;
    private final ApplicationStatusHistoryRepository history;
    private final RecruitmentStageRepository stages;
    private final NotificationRepository notifications;
    private final EmailOutboxRepository emails;
    private final JobTestRepository tests;
    private final AiInterviewClient ai;
    private final ObjectMapper mapper;
    private final AiInterviewActivityLog activity;
    private final AiInterviewProcessEngine processEngine;

    public AiInterviewEvaluationService(AiInterviewRepository interviews, AiQuestionRepository questions,
            AiAnswerRepository answers, AiFeedbackRepository feedbacks, JobSkillRepository skills, CvRepository cvs,
            CvExtractionRepository extractions, ApplicationStatusHistoryRepository history, RecruitmentStageRepository stages,
            NotificationRepository notifications, EmailOutboxRepository emails, JobTestRepository tests,
            AiInterviewClient ai, ObjectMapper mapper, AiInterviewActivityLog activity, AiInterviewProcessEngine processEngine) {
        this.interviews = interviews; this.questions = questions; this.answers = answers; this.feedbacks = feedbacks;
        this.skills = skills; this.cvs = cvs; this.extractions = extractions; this.history = history; this.stages = stages;
        this.notifications = notifications; this.emails = emails; this.tests = tests; this.ai = ai; this.mapper = mapper;
        this.activity = activity; this.processEngine = processEngine;
    }

    @Transactional
    public void process(long id) {
        var interview = interviews.findByIdForUpdate(id).orElse(null);
        if (interview == null || interview.getStatus() != AiInterviewStatus.GENERATING
                && interview.getStatus() != AiInterviewStatus.SCORING) return;
        AiInterviewStatus phase = interview.getStatus();
        try {
            InterviewPolicies.requireCommunicationOnly(interview);
            if (interview.getConfigSnapshotJson() == null) AiInterviewEligibility.require(interview.getApplication());
            else AiInterviewEligibility.requireExisting(interview);
            if (phase == AiInterviewStatus.GENERATING) generate(interview);
            else evaluate(interview);
            interview.setErrorMessage(null);
        } catch (IllegalStateException | com.smarthire.common.exception.BusinessException ex) {
            interview.setStatus(AiInterviewStatus.ERROR);
            interview.setErrorMessage(ex instanceof AiInterviewClient.ProviderException ? ex.getMessage()
                    : "Không thể xử lý AI Interview. Kiểm tra cấu hình và thử lại.");
            // Messages here are our own validation texts; provider errors are already sanitized by AiInterviewClient.
            activity.record(interview, phase == AiInterviewStatus.GENERATING ? "GENERATION_FAILED" : "EVALUATION_FAILED",
                    ex.getMessage());
        }
    }

    private ObjectNode context(Application application) {
        Job job = application.getJob();
        ObjectNode data = mapper.createObjectNode();
        data.put("jobTitle", job.getTitle()); data.put("jobDescription", job.getDescription());
        data.put("responsibilities", job.getResponsibilities()); data.put("educationRequirement", job.getEducationLevel());
        data.put("minimumYearsExperience", job.getMinYearsExperience());
        var requiredSkills = data.putArray("jobSkills");
        for (var skill : skills.findByJob_IdOrderByIdAsc(job.getId())) {
            requiredSkills.addObject().put("name", skill.getSkill().getName()).put("required", skill.isRequired());
        }
        var documents = cvs.findByApplication_IdOrderByIdDesc(application.getId());
        if (!documents.isEmpty()) extractions.findByCv_Id(documents.getFirst().getId()).ifPresent(extraction -> {
            try {
                var cv = mapper.readTree(extraction.getExtractionJson());
                var profile = data.putObject("candidateEvidence");
                for (String field : List.of("skills", "experience", "education", "projects", "certifications")) {
                    if (cv.has(field)) profile.set(field, cv.get(field));
                }
            } catch (Exception ignored) { /* Missing optional CV evidence does not invent a profile. */ }
        });
        return data;
    }

    private void generate(AiInterview interview) {
        if (InterviewPolicies.isV2(interview)) {
            if (interview.getContextSnapshotJson() == null) interview.setContextSnapshotJson(context(interview.getApplication()).toString());
            processEngine.initializeAndGenerateFirst(interview);
            interview.setStatus(AiInterviewStatus.QUESTIONS_READY);
            activity.record(interview, "PROCESS_FIRST_READY", "First process questions are ready");
            return;
        }
        if (interview.getConfigSnapshotJson() != null) { generatePlanned(interview); return; }
        if (!questions.findByAiInterview_IdOrderByQuestionOrderAscIdAsc(interview.getId()).isEmpty()) {
            throw new IllegalStateException("Questions already exist");
        }
        int target = Math.clamp(interview.getApplication().getJob().getAiInterviewQuestionCount(), MIN_QUESTIONS, MAX_QUESTIONS);
        var data = context(interview.getApplication());
        List<AiQuestion> generated = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        int maxCalls = (target + QUESTION_BATCH - 1) / QUESTION_BATCH + 2;
        for (int call = 1; generated.size() < target && call <= maxCalls; call++) {
            int need = Math.min(QUESTION_BATCH, target - generated.size());
            var request = data.deepCopy();
            request.put("questionCount", need);
            var asked = request.putArray("alreadyAskedQuestions");
            generated.forEach(q -> asked.add(q.getQuestionText()));
            int added = 0;
            JsonNode output = ai.generate(GENERATE_INSTRUCTION, request);
            log.info("AI interview {} generation call {} completed", interview.getId(), call);
            for (JsonNode row : output.path("questions")) {
                if (added == need) break;
                String text = row.path("questionText").asText("").trim();
                if (text.isEmpty() || text.length() > 10000 || !seen.add(text.toLowerCase(Locale.ROOT))) continue;
                String type = row.path("questionType").asText("").trim().toUpperCase(Locale.ROOT);
                generated.add(AiQuestion.builder().aiInterview(interview).questionText(text)
                        .questionType(QUESTION_TYPES.contains(type) ? type : "TECHNICAL")
                        .questionOrder(generated.size()).build());
                added++;
            }
            activity.record(interview, "QUESTIONS_BATCH_GENERATED",
                    "Call " + call + ": +" + added + " questions (" + generated.size() + "/" + target + ")");
        }
        if (generated.size() < target) {
            throw new IllegalStateException("Generated " + generated.size() + "/" + target + " questions");
        }
        questions.saveAll(generated);
        interview.setStatus(AiInterviewStatus.QUESTIONS_READY);
        activity.record(interview, "QUESTIONS_GENERATED", generated.size() + " questions saved");
        notify(interview, "AI_INTERVIEW_READY", "AI Interview đã sẵn sàng",
                "Bộ " + generated.size() + " câu hỏi phỏng vấn cho vị trí " + interview.getApplication().getJob().getTitle()
                        + " đã sẵn sàng. Bạn có thể bắt đầu AI Interview.", false);
    }

    private void evaluate(AiInterview interview) {
        if (InterviewPolicies.isV2(interview)) { evaluateV2(interview); return; }
        if (interview.getConfigSnapshotJson() != null) { evaluatePlanned(interview); return; }
        var paper = questions.findByAiInterview_IdOrderByQuestionOrderAscIdAsc(interview.getId());
        var saved = new ArrayList<>(answers.findByAiQuestion_IdIn(paper.stream().map(AiQuestion::getId).toList()));
        if (paper.isEmpty() || saved.size() != paper.size() || interview.getPassingScoreSnapshot() == null
                || saved.stream().anyMatch(a -> a.getAnswerText() == null || a.getAnswerText().isBlank())) {
            throw new IllegalStateException("Incomplete interview");
        }
        saved.sort(Comparator.comparingInt(a -> a.getAiQuestion().getQuestionOrder()));
        var data = context(interview.getApplication());
        ensureReferences(interview, saved, data);
        List<AiFeedback> validated = new ArrayList<>();
        for (int from = 0; from < saved.size(); from += EVALUATION_BATCH) {
            var chunk = saved.subList(from, Math.min(from + EVALUATION_BATCH, saved.size()));
            validated.addAll(grade(ai.generate(EVALUATE_INSTRUCTION, gradingRequest(data, chunk)).path("evaluations"), chunk));
            activity.record(interview, "ANSWERS_BATCH_EVALUATED", validated.size() + "/" + saved.size() + " answers evaluated");
        }
        BigDecimal total = validated.stream().map(AiFeedback::getScore).reduce(BigDecimal.ZERO, BigDecimal::add)
                .divide(BigDecimal.valueOf(validated.size()), 2, RoundingMode.HALF_UP);
        // Validate the whole provider result before any evaluation or outcome is persisted.
        feedbacks.saveAll(validated);
        activity.record(interview, "FEEDBACK_SAVED", validated.size() + " AI feedbacks saved; interview score " + total + "/100");
        finish(interview, total);
    }

    private void evaluateV2(AiInterview interview) {
        var paper = questions.findByAiInterview_IdOrderByQuestionOrderAscIdAsc(interview.getId());
        var saved = answers.findByAiQuestion_IdIn(paper.stream().map(AiQuestion::getId).toList());
        if (paper.isEmpty() || saved.size() != paper.size()) throw new IllegalStateException("Incomplete process interview");
        var allFeedback = feedbacks.findByAiAnswer_IdIn(saved.stream().map(AiAnswer::getId).toList());
        var evaluated = new ArrayList<>(allFeedback);
        Set<Long> scored = allFeedback.stream().map(f -> f.getAiAnswer().getId()).collect(java.util.stream.Collectors.toSet());
        for (var answer : saved) if (!scored.contains(answer.getId())) {
            if (answer.getAnswerText() != null && !answer.getAnswerText().isBlank()) throw new IllegalStateException("Missing process evaluations");
            var zero = AiFeedback.builder().aiAnswer(answer).score(BigDecimal.ZERO).feedbackText("Chưa trả lời: 0 điểm.")
                    .strengths("Chưa có bằng chứng đạt.").weaknesses("Chưa trả lời.").build();
            evaluated.add(zero); feedbacks.save(zero);
        }
        var policy = InterviewPolicies.config(interview).policy();
        var groups = evaluated.stream().collect(java.util.stream.Collectors.groupingBy(f ->
                InterviewProcessSettings.competency(f.getAiAnswer().getAiQuestion().getProcessRun().getProcessKey())));
        var report = mapper.createObjectNode(); report.put("schemaVersion", 2);
        var competencies = report.putObject("competencies"); var effectiveWeights = report.putObject("weights"); var skillReport = report.putObject("skills");
        for (String skill : policy.selectedSkills()) {
            var tested = evaluated.stream().filter(f -> {
                var question = f.getAiAnswer().getAiQuestion();
                if (question.getRubricJson() == null) return false;
                for (var target : InterviewPolicies.tree(question.getRubricJson()).path("skills")) if (skill.equals(target.asText())) return true;
                return false;
            }).toList();
            var row = skillReport.putObject(skill);
            row.put("evidenceCount", tested.stream().filter(f -> f.getAiAnswer().getAnswerText() != null && !f.getAiAnswer().getAnswerText().isBlank()).count());
            row.set("questionIds", mapper.valueToTree(tested.stream().map(f -> f.getAiAnswer().getAiQuestion().getId()).toList()));
            if (tested.isEmpty()) row.putNull("score"); else row.put("score", tested.stream().map(AiFeedback::getScore).reduce(BigDecimal.ZERO, BigDecimal::add)
                    .divide(BigDecimal.valueOf(tested.size()), 2, RoundingMode.HALF_UP));
        }
        Set<String> enabledGroups = policy.processes().stream().filter(com.smarthire.tenant.aiInterview.dto.request.InterviewPolicy.Process::enabled)
                .map(process -> InterviewProcessSettings.competency(process.key())).collect(java.util.stream.Collectors.toSet());
        int totalWeight = enabledGroups.stream().mapToInt(key -> policy.weights().getOrDefault(key, 0)).sum();
        if (totalWeight <= 0) throw new IllegalStateException("No enabled competency has a positive weight");
        BigDecimal total = BigDecimal.ZERO;
        for (var key : enabledGroups) {
            var evidence = groups.getOrDefault(key, List.of());
            int configuredMain = policy.processes().stream().filter(process -> process.enabled() && InterviewProcessSettings.competency(process.key()).equals(key))
                    .mapToInt(process -> InterviewProcessSettings.questionCount(process.config())).sum();
            long generatedMain = paper.stream().filter(q -> q.getProcessRun() != null && InterviewProcessSettings.competency(q.getProcessRun().getProcessKey()).equals(key)
                    && !"FOLLOW_UP".equals(q.getQuestionRole())).count();
            long missingMain = Math.max(0, configuredMain - generatedMain);
            BigDecimal average = evidence.isEmpty() ? BigDecimal.ZERO : evidence.stream().map(AiFeedback::getScore).reduce(BigDecimal.ZERO, BigDecimal::add)
                    .divide(BigDecimal.valueOf(evidence.size() + missingMain), 2, RoundingMode.HALF_UP);
            int weight = policy.weights().getOrDefault(key, 0);
            competencies.put(key, average); effectiveWeights.put(key, BigDecimal.valueOf(weight * 100L)
                    .divide(BigDecimal.valueOf(totalWeight), 2, RoundingMode.HALF_UP));
            total = total.add(average.multiply(BigDecimal.valueOf(weight)));
        }
        BigDecimal score = total.divide(BigDecimal.valueOf(totalWeight), 2, RoundingMode.HALF_UP);
        long unaskedMain = Math.max(0, policy.processes().stream().filter(com.smarthire.tenant.aiInterview.dto.request.InterviewPolicy.Process::enabled)
                .mapToInt(process -> InterviewProcessSettings.questionCount(process.config())).sum()
                - paper.stream().filter(q -> !"FOLLOW_UP".equals(q.getQuestionRole())).count());
        var contentCriteria = report.putObject("communicationCriteria");
        for (String key : List.of("TECHNICAL_KNOWLEDGE", "PROBLEM_SOLVING", "REASONING", "COMMUNICATION")) {
            var values = evaluated.stream().filter(f -> f.getEvaluationJson() != null)
                    .map(f -> InterviewPolicies.tree(f.getEvaluationJson()).path("criteria").path(key)).filter(com.fasterxml.jackson.databind.JsonNode::isNumber).toList();
            if (!values.isEmpty()) contentCriteria.put(key, values.stream().map(com.fasterxml.jackson.databind.JsonNode::decimalValue)
                    .reduce(BigDecimal.ZERO, BigDecimal::add).divide(BigDecimal.valueOf(evaluated.size() + unaskedMain), 2, RoundingMode.HALF_UP));
        }
        report.put("overallScore", score);
        interview.setReportJson(report.toString());
        finish(interview, score);
    }


    private void generatePlanned(AiInterview interview) {
        if (!questions.findByAiInterview_IdOrderByQuestionOrderAscIdAsc(interview.getId()).isEmpty())
            throw new IllegalStateException("Questions already exist");
        var config = InterviewPolicies.config(interview);
        var data = interview.getContextSnapshotJson() == null ? context(interview.getApplication())
                : (ObjectNode) InterviewPolicies.tree(interview.getContextSnapshotJson());
        var policy = config.policy();
        if (policy.stages().isEmpty()) {
            var names = new ArrayList<String>();
            data.path("jobSkills").forEach(skill -> names.add(skill.path("name").asText()));
            var weights = policy.weights();
            var active = InterviewPolicies.COMPETENCIES.stream().filter(k -> weights.get(k) > 0).toList();
            policy = new com.smarthire.tenant.aiInterview.dto.request.InterviewPolicy(policy.durationMinutes(), policy.maxAttempts(),
                    policy.miniAssessmentEnabled() && !names.isEmpty(), policy.miniQuestionCount(), policy.miniWeight(), 1,
                    policy.weights(), names, List.of(new com.smarthire.tenant.aiInterview.dto.request.InterviewPolicy.Stage(
                            "Năng lực và kỹ năng theo Job", config.questionCount(), active, names)));
            config = new com.smarthire.tenant.aiInterview.dto.request.AiInterviewConfigRequest(config.enabled(), config.passingScore(),
                    config.questionCount(), config.availableUntil(), policy);
            interview.setConfigSnapshotJson(InterviewPolicies.json(config));
        }
        interview.setContextSnapshotJson(data.toString());
        var plan = InterviewRubric.plan(policy);
        List<AiQuestion> generated = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        // All MCQs share one provider call; open questions are batched independently.
        for (String kind : List.of("OPEN", "MCQ")) {
            var slots = plan.stream().filter(n -> kind.equals(n.path("kind").asText())).toList();
            for (int from = 0; from < slots.size(); from += QUESTION_BATCH) {
                var chunk = slots.subList(from, Math.min(from + QUESTION_BATCH, slots.size()));
                var request = data.deepCopy();
                request.set("slots", mapper.valueToTree(chunk));
                request.set("alreadyAskedQuestions", mapper.valueToTree(generated.stream().map(AiQuestion::getQuestionText).toList()));
                var output = ai.generate("Generate one Vietnamese job interview question for every supplied slot. Respect its stage, skills and competencies. "
                        + "Return {\"questions\":[{\"slot\":0,\"questionText\":\"...\",\"options\":[\"...\",\"...\",\"...\",\"...\"],\"correctOption\":0,\"explanation\":\"...\","
                        + "\"referenceAnswer\":\"...\",\"keyPoints\":[{\"point\":\"...\",\"target\":\"...\"}]}]}. "
                        + "For OPEN omit options/correctOption/explanation and give the answer key, the slot being its rubric: " + REFERENCE_FORMAT + " "
                        + "For MCQ give four distinct options, exactly one correctOption index 0-3 and explanation, and omit referenceAnswer/keyPoints. "
                        + "Do not embed answers in the question. Never repeat existing questions.", request).path("questions");
                if (!output.isArray() || output.size() != chunk.size()) throw new IllegalStateException("Invalid planned question count");
                Map<Integer, ObjectNode> expected = new HashMap<>();
                chunk.forEach(slot -> expected.put(slot.path("slot").asInt(), slot));
                for (var row : output) {
                    if (!row.path("slot").isIntegralNumber()) throw new IllegalStateException("Invalid question slot");
                    var slot = expected.remove(row.path("slot").asInt());
                    if (slot == null) throw new IllegalStateException("Duplicate or unknown question slot");
                    String text = requiredText(row, "questionText", 10000);
                    if (!seen.add(text.trim().toLowerCase(Locale.ROOT))) throw new IllegalStateException("Duplicate question");
                    var question = AiQuestion.builder().aiInterview(interview).questionText(text).questionType(kind)
                            .questionOrder(slot.path("slot").asInt()).rubricJson(slot.toString()).build();
                    if (kind.equals("MCQ")) {
                        var options = row.path("options");
                        if (!options.isArray() || options.size() != 4 || !row.path("correctOption").isIntegralNumber()
                                || row.path("correctOption").asInt() < 0 || row.path("correctOption").asInt() > 3)
                            throw new IllegalStateException("Invalid MCQ answer key");
                        Set<String> unique = new HashSet<>();
                        for (var option : options) if (!option.isTextual() || option.asText().isBlank() || option.asText().length() > 2000
                                || !unique.add(option.asText().trim().toLowerCase(Locale.ROOT))) throw new IllegalStateException("Invalid MCQ options");
                        question.setOptionsJson(options.toString()); question.setCorrectOption(row.path("correctOption").asInt());
                        question.setExplanation(requiredText(row, "explanation", 10000));
                    } else question.setRubricJson(InterviewRubric.withReference(slot.toString(), row));
                    generated.add(question);
                }
            }
        }
        generated.sort(Comparator.comparingInt(AiQuestion::getQuestionOrder));
        questions.saveAll(generated);
        interview.setStatus(AiInterviewStatus.QUESTIONS_READY);
        activity.record(interview, "QUESTIONS_GENERATED", generated.size() + " planned questions saved");
        notify(interview, "AI_INTERVIEW_READY", "AI Interview đã sẵn sàng", "Lộ trình phỏng vấn đã sẵn sàng. Bạn có thể bắt đầu.", false);
    }

    private void evaluatePlanned(AiInterview interview) {
        var paper = questions.findByAiInterview_IdOrderByQuestionOrderAscIdAsc(interview.getId());
        var saved = answers.findByAiQuestion_IdIn(paper.stream().map(AiQuestion::getId).toList());
        if (paper.isEmpty() || saved.size() != paper.size()) throw new IllegalStateException("Incomplete submitted paper");
        List<AiFeedback> validated = new ArrayList<>();
        List<AiAnswer> open = new ArrayList<>();
        for (var answer : saved) {
            var question = answer.getAiQuestion();
            if (answer.getAnswerText() == null || answer.getAnswerText().isBlank() || question.getCorrectOption() != null) {
                boolean blank = answer.getAnswerText() == null || answer.getAnswerText().isBlank();
                int score = !blank && question.getCorrectOption() != null && answer.getAnswerText().equals(question.getCorrectOption().toString()) ? 100 : 0;
                var feedback = AiFeedback.builder().aiAnswer(answer).score(BigDecimal.valueOf(score))
                        .feedbackText(blank ? "Chưa trả lời: 0 điểm." : question.getExplanation())
                        .strengths(score == 100 ? "Chọn đúng đáp án." : "Chưa có bằng chứng đạt.")
                        .weaknesses(score == 100 ? "Không có." : "Cần kiểm chứng thêm kỹ năng của câu hỏi.")
                        .evaluationJson(InterviewRubric.fixedEvaluation(question, score)).build();
                validated.add(feedback);
            } else open.add(answer);
        }
        var data = (ObjectNode) InterviewPolicies.tree(interview.getContextSnapshotJson());
        ensureReferences(interview, open, data);
        for (int from = 0; from < open.size(); from += EVALUATION_BATCH) {
            var chunk = open.subList(from, Math.min(from + EVALUATION_BATCH, open.size()));
            validated.addAll(grade(ai.generate(EVALUATE_INSTRUCTION, gradingRequest(data, chunk)).path("evaluations"), chunk));
        }
        var report = InterviewRubric.report(InterviewPolicies.config(interview).policy(), validated);
        feedbacks.saveAll(validated);
        interview.setReportJson(report.toString());
        finish(interview, report.path("overallScore").decimalValue());
    }

    /** Answer keys are written without seeing candidate answers and reused on every later scoring retry. */
    private void ensureReferences(AiInterview interview, List<AiAnswer> open, ObjectNode context) {
        var missing = open.stream().map(AiAnswer::getAiQuestion).filter(q -> !InterviewRubric.hasReference(q)).toList();
        for (int from = 0; from < missing.size(); from += QUESTION_BATCH) {
            var chunk = missing.subList(from, Math.min(from + QUESTION_BATCH, missing.size()));
            var request = context.deepCopy();
            var rows = request.putArray("questions");
            for (var question : chunk) {
                var item = rows.addObject().put("questionId", question.getId()).put("question", question.getQuestionText());
                if (question.getRubricJson() != null) item.set("rubric", InterviewPolicies.tree(question.getRubricJson()));
            }
            var output = ai.generate(REFERENCE_INSTRUCTION, request).path("references");
            if (!output.isArray() || output.size() != chunk.size()) throw new IllegalStateException("Invalid reference answer count");
            Map<Long, AiQuestion> byId = new HashMap<>();
            chunk.forEach(question -> byId.put(question.getId(), question));
            Map<AiQuestion, String> keys = new HashMap<>();
            for (var row : output) {
                var question = byId.remove(row.path("questionId").asLong());
                if (question == null) throw new IllegalStateException("Duplicate or unknown reference answer");
                keys.put(question, InterviewRubric.withReference(question.getRubricJson(), row));
            }
            keys.forEach(AiQuestion::setRubricJson);
            questions.saveAll(chunk);
            activity.record(interview, "REFERENCE_ANSWERS_GENERATED", chunk.size() + " reference answers saved");
        }
    }

    private ObjectNode gradingRequest(ObjectNode context, List<AiAnswer> chunk) {
        var request = context.deepCopy();
        // CV claims are not evidence that a candidate answered this interview question correctly.
        request.remove("candidateEvidence");
        var payload = request.putArray("answers");
        for (var answer : chunk) payload.addObject().put("answerId", answer.getId())
                .put("question", answer.getAiQuestion().getQuestionText()).put("answer", answer.getAnswerText())
                .set("rubric", InterviewPolicies.tree(answer.getAiQuestion().getRubricJson()));
        return request;
    }

    List<AiFeedback> grade(JsonNode output, List<AiAnswer> saved) {
        if (!output.isArray() || output.size() != saved.size()) throw new IllegalStateException("Invalid evaluation count");
        Map<Long, AiAnswer> byId = new HashMap<>();
        saved.forEach(answer -> byId.put(answer.getId(), answer));
        List<AiFeedback> result = new ArrayList<>();
        for (JsonNode row : output) {
            if (!row.path("answerId").isIntegralNumber()) throw new IllegalStateException("Invalid evaluation");
            var answer = byId.remove(row.path("answerId").longValue());
            if (answer == null) throw new IllegalStateException("Invalid evaluation");
            var evaluation = InterviewRubric.referenceEvaluation(row, answer.getAiQuestion(), answer.getAnswerText());
            var feedback = feedbacks.findByAiAnswer_Id(answer.getId()).orElseGet(() -> AiFeedback.builder().aiAnswer(answer).build());
            feedback.setScore(evaluation.path("score").decimalValue());
            feedback.setFeedbackText(requiredText(row, "feedback", 10000));
            feedback.setStrengths(requiredText(row, "strengths", 10000));
            feedback.setWeaknesses(requiredText(row, "weaknesses", 10000));
            feedback.setEvaluationJson(evaluation.toString());
            result.add(feedback);
        }
        return result;
    }

    private String requiredText(JsonNode row, String key, int max) {
        var value = row.path(key);
        if (!value.isTextual() || value.asText().isBlank() || value.asText().length() > max) throw new IllegalStateException("Invalid AI text");
        return value.asText();
    }

    void finish(AiInterview interview, BigDecimal score) {
        boolean passed = score.compareTo(interview.getPassingScoreSnapshot()) >= 0;
        interview.setOverallScore(score);
        interview.setStatus(passed ? AiInterviewStatus.PASSED : AiInterviewStatus.FAILED);
        activity.record(interview, passed ? "PASSED" : "FAILED",
                "Score " + score + "/100; passing score " + interview.getPassingScoreSnapshot());
        var application = interview.getApplication();
        ApplicationStatus previous = application.getStatus();
        boolean retry = !passed && InterviewPolicies.canRetry(interview, java.time.Instant.now());
        ApplicationStatus next = passed ? ApplicationStatus.ASSESSMENT : retry ? ApplicationStatus.INTERVIEW : ApplicationStatus.FAILED;
        var row = new ApplicationStatusHistory();
        row.setApplication(application); row.setFromStatus(previous.name()); row.setToStatus(next.name());
        row.setNote("AI Interview " + interview.getStatus() + ": " + score + "/100; passing score " + interview.getPassingScoreSnapshot());
        history.save(row);
        application.setStatus(next);
        if (passed) stages.findByJob_IdOrderBySortOrderAsc(application.getJob().getId()).stream()
                .filter(stage -> "ASSESSMENT".equalsIgnoreCase(stage.getStageCode()))
                .findFirst()
                .ifPresent(application::setStage);
        activity.record(interview, "APPLICATION_STATUS_CHANGED", previous + " -> " + next + "; stage history saved");
        boolean assessmentReady = passed && !tests.findByJob_IdAndStatusOrderByIdDesc(application.getJob().getId(), TestStatus.PUBLISHED).isEmpty();
        if (passed) {
            activity.record(interview, "ASSESSMENT_UNLOCKED", assessmentReady
                    ? "Published assessment available to candidate" : "Assessment round opened; no published test yet");
        }
        String body = "Kết quả AI Interview cho vị trí " + application.getJob().getTitle() + ": " + score + "/100. "
                + (passed ? assessmentReady ? "Bạn đã vượt qua AI Interview. Assessment đã sẵn sàng."
                        : "Bạn đã vượt qua AI Interview. Vòng Assessment đã được mở; nhà tuyển dụng đang chuẩn bị đề."
                        : retry ? "Bạn chưa đạt ngưỡng " + interview.getPassingScoreSnapshot() + "/100. Bạn còn lượt làm lại trước hạn."
                        : "Bạn chưa đạt ngưỡng " + interview.getPassingScoreSnapshot() + "/100. Hồ sơ kết thúc ở vòng AI Interview.");
        notify(interview, passed ? "AI_INTERVIEW_PASSED" : "AI_INTERVIEW_FAILED", "Kết quả AI Interview", body, true);
    }

    /** A failed attempt keeps the application open only while a retry is still allowed. */
    @Transactional
    public void closeExhaustedRetries() {
        var now = java.time.Instant.now();
        for (var interview : interviews.findByStatusAndApplication_StatusOrderByIdAsc(AiInterviewStatus.FAILED, ApplicationStatus.INTERVIEW)) {
            var application = interview.getApplication();
            if (interview.getConfigSnapshotJson() == null || application.getArchivedAt() != null || application.getWithdrawnAt() != null
                    || InterviewPolicies.canRetry(interview, now)) continue;
            var latest = interviews.findByApplication_IdOrderByIdDesc(application.getId());
            if (latest.isEmpty() || !latest.get(0).getId().equals(interview.getId())) continue;
            var row = new ApplicationStatusHistory();
            row.setApplication(application); row.setFromStatus(ApplicationStatus.INTERVIEW.name()); row.setToStatus(ApplicationStatus.FAILED.name());
            row.setNote("AI Interview retry window closed; latest score " + interview.getOverallScore() + "/100");
            history.save(row);
            application.setStatus(ApplicationStatus.FAILED);
            activity.record(interview, "APPLICATION_STATUS_CHANGED", "INTERVIEW -> FAILED; retry window closed");
            notify(interview, "AI_INTERVIEW_FAILED", "Kết quả AI Interview", "Hạn làm lại AI Interview cho vị trí "
                    + application.getJob().getTitle() + " đã kết thúc. Hồ sơ kết thúc ở vòng AI Interview.", true);
        }
    }

    private void notify(AiInterview interview, String type, String title, String body, boolean email) {
        var app = interview.getApplication();
        String path = type.equals("AI_INTERVIEW_PASSED") ? "/candidate/assessments" : "/candidate/interviews/" + interview.getId();
        notifications.save(Notification.builder().user(app.getCandidate()).type(type).title(title).body(body)
                .payloadJson("{\"path\":\"" + path + "\",\"applicationId\":" + app.getId() + "}").build());
        activity.record(interview, "NOTIFICATION_SENT", type);
        if (email) {
            emails.save(EmailOutbox.builder().purpose("AI_INTERVIEW_RESULT").toEmail(app.getCandidate().getEmail()).subject(title).body(body).build());
            activity.record(interview, "EMAIL_QUEUED", "AI_INTERVIEW_RESULT");
        }
    }
}
