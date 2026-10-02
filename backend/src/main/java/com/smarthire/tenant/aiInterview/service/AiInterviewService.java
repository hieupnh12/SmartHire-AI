package com.smarthire.tenant.aiInterview.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.AiInterviewStatus;
import com.smarthire.domain.tenant.entity.AiAnswer;
import com.smarthire.domain.tenant.entity.AiFeedback;
import com.smarthire.domain.tenant.entity.AiInterview;
import com.smarthire.domain.tenant.entity.AiQuestion;
import com.smarthire.domain.tenant.entity.Application;
import com.smarthire.domain.tenant.entity.RecruitmentStage;
import com.smarthire.domain.tenant.entity.User;
import com.smarthire.domain.tenant.repository.AiAnswerRepository;
import com.smarthire.domain.tenant.repository.AiFeedbackRepository;
import com.smarthire.domain.tenant.repository.AiInterviewLogRepository;
import com.smarthire.domain.tenant.repository.AiInterviewRepository;
import com.smarthire.domain.tenant.repository.AiQuestionRepository;
import com.smarthire.domain.tenant.repository.ApplicationRepository;
import com.smarthire.domain.tenant.repository.RecruitmentStageRepository;
import com.smarthire.tenant.aiInterview.dto.request.AiQuestionRequest;
import com.smarthire.tenant.aiInterview.dto.request.CreateAiInterviewRequest;
import com.smarthire.tenant.aiInterview.dto.request.UpdateAiInterviewRequest;
import com.smarthire.tenant.aiInterview.dto.request.UpsertAiAnswerRequest;
import com.smarthire.tenant.aiInterview.dto.request.UpsertAiFeedbackRequest;
import com.smarthire.tenant.aiInterview.dto.request.ProctorEventRequest;
import com.smarthire.tenant.aiInterview.dto.response.AiAnswerResponse;
import com.smarthire.tenant.aiInterview.dto.response.AiFeedbackResponse;
import com.smarthire.tenant.aiInterview.dto.response.AiInterviewLogResponse;
import com.smarthire.tenant.aiInterview.dto.response.AiInterviewPage;
import com.smarthire.tenant.aiInterview.dto.response.AiInterviewResponse;
import com.smarthire.tenant.aiInterview.dto.response.AiQuestionResponse;
import com.smarthire.tenant.aiInterview.mapper.AiInterviewMapper;
import com.smarthire.tenant.cv.service.CvAccess;
import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AiInterviewService {

    private final AiInterviewRepository interviews;
    private final AiQuestionRepository questions;
    private final AiAnswerRepository answers;
    private final AiFeedbackRepository feedbacks;
    private final ApplicationRepository applications;
    private final RecruitmentStageRepository stages;
    private final AiInterviewMapper mapper;
    private final CvAccess access;
    private final AiInterviewInvitationService invitations;
    private final AiInterviewActivityLog activity;
    private final AiInterviewLogRepository logs;
    private final AiInterviewProcessEngine processEngine;
    private final com.smarthire.domain.tenant.repository.AiInterviewProcessRunRepository processRuns;
    private final com.smarthire.domain.tenant.repository.AiInterviewConsentRepository consents;

    public AiInterviewService(
            AiInterviewRepository interviews,
            AiQuestionRepository questions,
            AiAnswerRepository answers,
            AiFeedbackRepository feedbacks,
            ApplicationRepository applications,
            RecruitmentStageRepository stages,
            AiInterviewMapper mapper,
            CvAccess access, AiInterviewInvitationService invitations,
            AiInterviewActivityLog activity, AiInterviewLogRepository logs, AiInterviewProcessEngine processEngine,
            com.smarthire.domain.tenant.repository.AiInterviewProcessRunRepository processRuns,
            com.smarthire.domain.tenant.repository.AiInterviewConsentRepository consents) {
        this.interviews = interviews;
        this.questions = questions;
        this.answers = answers;
        this.feedbacks = feedbacks;
        this.applications = applications;
        this.stages = stages;
        this.mapper = mapper;
        this.access = access;
        this.invitations = invitations;
        this.activity = activity;
        this.logs = logs; this.processEngine = processEngine; this.processRuns = processRuns; this.consents = consents;
    }

    /**
     * Candidate asks to begin the AI Interview round of an application. Creates the next allowed attempt
     * (questions are generated asynchronously) or starts it once questions are ready.
     */
    @Transactional
    public AiInterviewResponse requestStart(long applicationId) {
        User actor = access.actor();
        if (!access.candidate()) {
            throw new BusinessException("Candidate access required", HttpStatus.FORBIDDEN, "AI_INTERVIEW_FORBIDDEN");
        }
        Application application = applications.findById(applicationId)
                .filter(a -> a.getCandidate() != null && a.getCandidate().getId().equals(actor.getId()))
                .orElseThrow(() -> new BusinessException("Application not found", HttpStatus.NOT_FOUND, "APPLICATION_NOT_FOUND"));
        var existing = interviews.findByApplication_IdOrderByIdDesc(applicationId);
        if (!existing.isEmpty() && isFinished(existing.get(0).getStatus())) {
            if (InterviewPolicies.canRetry(existing.get(0), Instant.now())) {
                return mapper.toResponse(invitations.openNextAttempt(applicationId));
            }
            throw new BusinessException("AI interview attempt already completed", HttpStatus.CONFLICT, "AI_INTERVIEW_ALREADY_COMPLETED");
        }
        if (existing.isEmpty()) {
            AiInterviewEligibility.require(application);
            return mapper.toResponse(invitations.invite(applicationId, null));
        }
        AiInterview current = existing.get(0);
        requireActiveApplication(current);
        return switch (current.getStatus()) {
            case QUESTIONS_READY -> start(current.getId());
            case IN_PROGRESS -> start(current.getId());
            case CREATED, ERROR -> requeueGeneration(current.getId());
            default -> mapper.toResponse(current);
        };
    }

    @Transactional(readOnly = true)
    public List<AiInterviewLogResponse> logs(long id) {
        requireStaff();
        load(id);
        return logs.findByAiInterview_IdOrderByIdAsc(id).stream().map(mapper::toLog).toList();
    }

    private static boolean isFinished(AiInterviewStatus status) {
        return status == AiInterviewStatus.PASSED || status == AiInterviewStatus.FAILED || status == AiInterviewStatus.SCORED;
    }

    /** Re-queues generation only for attempts that never received questions; otherwise returns the current state. */
    private AiInterviewResponse requeueGeneration(long id) {
        AiInterview interview = loadAccessibleForUpdate(id);
        boolean untouched = interview.getStartedAt() == null && interview.getCompletedAt() == null
                && questions.findByAiInterview_IdOrderByQuestionOrderAscIdAsc(id).isEmpty();
        if ((interview.getStatus() == AiInterviewStatus.CREATED || interview.getStatus() == AiInterviewStatus.ERROR) && untouched) {
            interview.setErrorMessage(null);
            interview.setStatus(AiInterviewStatus.GENERATING);
            activity.record(interview, "GENERATION_QUEUED", "Requested by candidate");
        }
        return mapper.toResponse(interview);
    }

    @Transactional
    public AiInterviewResponse create(CreateAiInterviewRequest request) {
        requireStaff();
        Application application = applications.findById(request.applicationId())
                .orElseThrow(() -> new BusinessException("Application not found", HttpStatus.NOT_FOUND, "APPLICATION_NOT_FOUND"));
        RecruitmentStage stage = resolveStage(request.workflowStageId(), application);

        return mapper.toResponse(invitations.invite(application.getId(), stage));
    }

    @Transactional(readOnly = true)
    public List<AiInterviewResponse> mine() {
        User actor = access.actor();
        if (!access.candidate()) {
            throw new BusinessException("Candidate access required", HttpStatus.FORBIDDEN, "AI_INTERVIEW_FORBIDDEN");
        }
        return interviews.findByApplication_Candidate_IdOrderByIdDesc(actor.getId()).stream()
                .map(mapper::toResponse).toList();
    }

    @Transactional
    public AiInterviewResponse start(long id) {
        AiInterview interview = loadAccessibleForUpdate(id);
        requireCandidateOwns(interview);
        requireActiveApplication(interview);
        if (interview.getStatus() == AiInterviewStatus.IN_PROGRESS) {
            if (InterviewPolicies.expired(interview)) return submitExpired(interview);
            return mapper.toResponse(interview, loadQuestionResponses(interview));
        }
        if (interview.getStatus() != AiInterviewStatus.QUESTIONS_READY
                || questions.findByAiInterview_IdOrderByQuestionOrderAscIdAsc(id).isEmpty()) {
            throw new BusinessException("Interview questions are not ready", HttpStatus.CONFLICT, "AI_INTERVIEW_NOT_READY");
        }
        if (InterviewPolicies.voiceEnabled(interview) && !consents.findByAiInterview_Id(id).map(c -> c.isAccepted()).orElse(false)) {
            throw new BusinessException("Voice recording consent is required before starting", HttpStatus.CONFLICT, "AI_VOICE_CONSENT_REQUIRED");
        }
        var now = Instant.now();
        if (interview.getConfigSnapshotJson() != null) {
            var config = InterviewPolicies.config(interview);
            if (config.availableFrom() != null && now.isBefore(config.availableFrom())) {
                throw new BusinessException("AI interview is not available yet", HttpStatus.CONFLICT,
                        "AI_INTERVIEW_NOT_STARTED");
            }
            if (config.availableUntil() != null && !now.isBefore(config.availableUntil())) {
                throw new BusinessException("AI interview is not available for this job", HttpStatus.CONFLICT, "AI_INTERVIEW_UNAVAILABLE");
            }
            interview.setPassingScoreSnapshot(config.passingScore());
            var end = now.plus(Duration.ofMinutes(config.policy().durationMinutes()));
            if (config.availableUntil() != null && config.availableUntil().isBefore(end)) end = config.availableUntil();
            interview.setExpiresAt(end);
        } else {
            interview.setPassingScoreSnapshot(interview.getApplication().getJob().getAiInterviewPassingScore());
        }
        interview.setStatus(AiInterviewStatus.IN_PROGRESS);
        interview.setStartedAt(now);
        processEngine.start(interview);
        var responses = loadQuestionResponses(interview);
        activity.record(interview, "STARTED", responses.size() + " questions; passing score "
                + interview.getPassingScoreSnapshot());
        return mapper.toResponse(interview, responses);
    }

    @Transactional
    public AiInterviewResponse complete(long id) {
        AiInterview interview = loadAccessibleForUpdate(id);
        requireCandidateOwns(interview);
        requireActiveApplication(interview);
        if (interview.getCompletedAt() != null) return mapper.toResponse(interview, loadQuestionResponses(interview));
        if (interview.getStatus() != AiInterviewStatus.IN_PROGRESS) {
            throw new BusinessException("Interview is not in progress", HttpStatus.CONFLICT, "AI_INTERVIEW_BAD_STATUS");
        }
        if (InterviewPolicies.expired(interview)) return submitExpired(interview);
        boolean allowBlank = interview.getConfigSnapshotJson() != null;
        ensureAnswers(interview, allowBlank);
        markSubmitted(interview);
        var responses = loadQuestionResponses(interview);
        return mapper.toResponse(interview, responses);
    }

    @Transactional
    public void recordProctorEvent(long id, ProctorEventRequest request) {
        AiInterview interview = loadAccessibleForUpdate(id);
        requireCandidateOwns(interview);
        if (interview.getStatus() != AiInterviewStatus.IN_PROGRESS) {
            throw new BusinessException("Interview is not in progress", HttpStatus.CONFLICT, "AI_INTERVIEW_NOT_ACTIVE");
        }
        String detail = request.detail() == null ? "browser event" : request.detail();
        if (request.durationSeconds() != null) detail += "; durationSeconds=" + request.durationSeconds();
        activity.record(interview, "PROCTOR_" + request.event(), detail);
    }

    @Transactional
    public void expireDue() {
        for (var row : interviews.findTop50ByStatusAndExpiresAtLessThanEqualOrderByIdAsc(AiInterviewStatus.IN_PROGRESS, Instant.now())) {
            var interview = interviews.findByIdForUpdate(row.getId()).orElse(null);
            if (interview == null || interview.getStatus() != AiInterviewStatus.IN_PROGRESS || !InterviewPolicies.expired(interview)) continue;
            ensureAnswers(interview, true);
            markSubmitted(interview);
        }
    }

    private AiInterviewResponse submitExpired(AiInterview interview) {
        ensureAnswers(interview, true);
        markSubmitted(interview);
        return mapper.toResponse(interview, loadQuestionResponses(interview));
    }

    private void ensureAnswers(AiInterview interview, boolean allowBlank) {
        var paper = questions.findByAiInterview_IdOrderByQuestionOrderAscIdAsc(interview.getId());
        var ids = paper.stream().map(AiQuestion::getId).toList();
        var saved = ids.isEmpty() ? java.util.List.<AiAnswer>of() : answers.findByAiQuestion_IdIn(ids);
        var byQuestion = saved.stream().collect(java.util.stream.Collectors.toMap(a -> a.getAiQuestion().getId(), java.util.function.Function.identity(), (a, b) -> a));
        boolean missing = paper.isEmpty() || paper.stream().anyMatch(q -> {
            var answer = byQuestion.get(q.getId());
            return answer == null || answer.getAnswerText() == null || answer.getAnswerText().isBlank();
        });
        if (missing && !allowBlank) {
            throw new BusinessException("Answer all questions before submitting", HttpStatus.CONFLICT, "AI_INTERVIEW_INCOMPLETE");
        }
        if (!allowBlank) return;
        for (var question : paper) {
            if (byQuestion.containsKey(question.getId())) continue;
            answers.save(AiAnswer.builder().aiQuestion(question).answerText("").answeredAt(Instant.now()).build());
        }
    }

    private void markSubmitted(AiInterview interview) {
        if (interview.getCompletedAt() != null || interview.getStatus() != AiInterviewStatus.IN_PROGRESS) return;
        interview.setCompletedAt(Instant.now());
        interview.setStatus(AiInterviewStatus.SCORING);
        activity.record(interview, "SUBMITTED", "Answers submitted; evaluation queued");
    }

    private void requireActiveApplication(AiInterview interview) {
        InterviewPolicies.requireCommunicationOnly(interview);
        if (interview.getConfigSnapshotJson() == null) AiInterviewEligibility.require(interview.getApplication());
        else AiInterviewEligibility.requireExisting(interview);
        var application = interview.getApplication();
        if (application.getStatus() != com.smarthire.domain.enums.ApplicationStatus.INTERVIEW
                || application.getArchivedAt() != null || application.getWithdrawnAt() != null) {
            throw new BusinessException("Application is no longer in the interview round", HttpStatus.CONFLICT, "AI_INTERVIEW_NOT_ELIGIBLE");
        }
    }

    @Transactional(readOnly = true)
    public AiInterviewPage list(Long applicationId, AiInterviewStatus status, int page, int size) {
        requireStaff();
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 50);
        var pageable = PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "id"));

        Page<AiInterview> result;
        if (applicationId != null && status != null) {
            result = interviews.findByApplication_IdAndStatus(applicationId, status, pageable);
        } else if (applicationId != null) {
            result = interviews.findByApplication_Id(applicationId, pageable);
        } else if (status != null) {
            result = interviews.findByStatus(status, pageable);
        } else {
            result = interviews.findAll(pageable);
        }

        List<AiInterviewResponse> items = result.getContent().stream()
                .map(mapper::toResponse)
                .toList();
        return new AiInterviewPage(items, result.getTotalElements(), safePage, safeSize);
    }

    @Transactional
    public AiInterviewResponse get(long id) {
        AiInterview interview = loadAccessible(id);
        if (interview.getStatus() == AiInterviewStatus.IN_PROGRESS && InterviewPolicies.expired(interview)) {
            interview = loadAccessibleForUpdate(id);
            if (interview.getStatus() == AiInterviewStatus.IN_PROGRESS && InterviewPolicies.expired(interview)) {
                ensureAnswers(interview, true);
                markSubmitted(interview);
            }
        }
        return mapper.toResponse(interview, loadQuestionResponses(interview));
    }

    @Transactional
    public AiInterviewResponse update(long id, UpdateAiInterviewRequest request) {
        requireStaff();
        AiInterview interview = loadAccessibleForUpdate(id);
        requireEditable(interview);
        if (request.overallScore() != null || request.startedAt() != null || request.completedAt() != null
                || request.status() != null) {
            throw new BusinessException("Interview outcomes are computed by the system", HttpStatus.CONFLICT, "AI_INTERVIEW_SYSTEM_MANAGED");
        }
        if (request.workflowStageId() != null) {
            interview.setWorkflowStage(resolveStage(request.workflowStageId(), interview.getApplication()));
        }
        activity.record(interview, "UPDATED_BY_STAFF", "Stage " + request.workflowStageId() + ", status " + request.status());
        return mapper.toResponse(interviews.save(interview), loadQuestionResponses(interview));
    }

    @Transactional
    public void delete(long id) {
        requireStaff();
        AiInterview interview = loadAccessibleForUpdate(id);
        requireEditable(interview);
        feedbacks.deleteByAiAnswer_AiQuestion_AiInterview_Id(id);
        answers.deleteByAiQuestion_AiInterview_Id(id);
        questions.deleteByAiInterview_Id(id);
        interviews.delete(interview);
    }

    @Transactional
    public AiQuestionResponse addQuestion(long interviewId, AiQuestionRequest request) {
        requireStaff();
        AiInterview interview = loadAccessibleForUpdate(interviewId);
        requireEditable(interview);
        requireUnplanned(interview);
        AiQuestion question = AiQuestion.builder()
                .aiInterview(interview)
                .questionText(request.questionText().trim())
                .questionType(request.questionType().trim().toUpperCase())
                .questionOrder(request.questionOrder())
                .build();
        AiQuestion saved = questions.save(question);
        syncQuestionStatus(interview);
        activity.record(interview, "QUESTION_ADDED", "Question " + saved.getId() + " at order " + saved.getQuestionOrder());
        return mapper.toQuestion(saved, null, null);
    }

    @Transactional
    public AiQuestionResponse updateQuestion(long interviewId, long questionId, AiQuestionRequest request) {
        requireStaff();
        AiInterview interview = loadAccessibleForUpdate(interviewId);
        requireEditable(interview);
        AiQuestion question = loadQuestion(interviewId, questionId);
        if (question.getRubricJson() != null) {
            // Planned slots keep their rubric, order and answer key; only open-question wording may change.
            if (question.getCorrectOption() != null || !question.getQuestionType().equalsIgnoreCase(request.questionType().trim())
                    || question.getQuestionOrder() != request.questionOrder()) {
                throw new BusinessException("Only the wording of planned open questions can be edited", HttpStatus.CONFLICT, "AI_INTERVIEW_PLANNED");
            }
            if (!question.getQuestionText().equals(request.questionText().trim())) {
                question.setRubricJson(InterviewRubric.withoutReference(question.getRubricJson()));
            }
            question.setQuestionText(request.questionText().trim());
        } else {
            question.setQuestionText(request.questionText().trim());
            question.setQuestionType(request.questionType().trim().toUpperCase());
            question.setQuestionOrder(request.questionOrder());
        }
        syncQuestionStatus(interview);
        activity.record(interview, "QUESTION_UPDATED", "Question " + questionId);
        AiAnswer answer = answers.findByAiQuestion_Id(questionId).orElse(null);
        AiFeedback feedback = answer == null ? null : feedbacks.findByAiAnswer_Id(answer.getId()).orElse(null);
        return mapper.toQuestion(questions.save(question), answer, feedback);
    }

    @Transactional
    public void deleteQuestion(long interviewId, long questionId) {
        requireStaff();
        AiInterview interview = loadAccessibleForUpdate(interviewId);
        requireEditable(interview);
        requireUnplanned(interview);
        AiQuestion question = loadQuestion(interviewId, questionId);
        answers.findByAiQuestion_Id(questionId).ifPresent(answer -> {
            feedbacks.findByAiAnswer_Id(answer.getId()).ifPresent(feedbacks::delete);
            answers.delete(answer);
        });
        questions.delete(question);
        syncQuestionStatus(interview);
        activity.record(interview, "QUESTION_DELETED", "Question " + questionId);
    }

    // Expiration submits the saved paper before returning a conflict for the late answer.
    @Transactional(noRollbackFor = BusinessException.class)
    public AiAnswerResponse upsertAnswer(long interviewId, long questionId, UpsertAiAnswerRequest request) {
        AiInterview interview = loadAccessibleForUpdate(interviewId);
        requireCandidateOwns(interview);
        AiQuestion question = loadQuestion(interviewId, questionId);
        if (!access.staff()) {
            requireCandidateOwns(interview);
            requireActiveApplication(interview);
            if (interview.getStatus() == AiInterviewStatus.IN_PROGRESS && InterviewPolicies.expired(interview)) {
                ensureAnswers(interview, true);
                markSubmitted(interview);
                throw new BusinessException("Interview time is over", HttpStatus.CONFLICT, "AI_INTERVIEW_EXPIRED");
            }
            if (interview.getStatus() != AiInterviewStatus.IN_PROGRESS || interview.getCompletedAt() != null) {
                throw new BusinessException("Interview is not in progress", HttpStatus.CONFLICT, "AI_INTERVIEW_BAD_STATUS");
            }
            if (request.answerText() == null || request.answerText().isBlank()) {
                throw new BusinessException("Answer is required", HttpStatus.BAD_REQUEST, "AI_ANSWER_REQUIRED");
            }
            if (InterviewChoiceAnswers.isV2Choice(question)) InterviewChoiceAnswers.parse(question, request.answerText());
            else if (question.getCorrectOption() != null && !request.answerText().matches("[0-3]")) {
                throw new BusinessException("Choose one of the four options", HttpStatus.BAD_REQUEST, "AI_ANSWER_BAD_OPTION");
            }
        }

        if (InterviewPolicies.isV2(interview) && question.getProcessRun() != null) {
            var next = questions.findByProcessRun_IdOrderBySequenceNoAscIdAsc(question.getProcessRun().getId()).stream()
                    .filter(q -> answers.findByAiQuestion_Id(q.getId()).isEmpty()).findFirst();
            if (next.isPresent() && !next.get().getId().equals(questionId))
                throw new BusinessException("Trả lời câu hiện tại trước khi chuyển câu tiếp theo.", HttpStatus.CONFLICT, "AI_INTERVIEW_QUESTION_ORDER");
        }
        AiAnswer answer = answers.findByAiQuestion_Id(questionId).orElseGet(() ->
                AiAnswer.builder().aiQuestion(question).build());
        answer.setAnswerText(request.answerText());
        answer.setAnswerDuration(request.answerDuration());
        answer.setAnsweredAt(access.staff() && request.answeredAt() != null ? request.answeredAt() : Instant.now());
        AiAnswer saved = answers.save(answer);
        processEngine.answerSaved(interview, question, saved, request.speechMetrics());
        activity.record(interview, "ANSWER_SAVED", "Question order " + question.getQuestionOrder()
                + ", duration " + saved.getAnswerDuration() + "s");
        AiFeedback feedback = feedbacks.findByAiAnswer_Id(saved.getId()).orElse(null);
        return mapper.toAnswer(saved, !access.staff() && InterviewPolicies.isV2(interview) ? null : feedback);
    }

    @Transactional
    public AiFeedbackResponse upsertFeedback(long interviewId, long answerId, UpsertAiFeedbackRequest request) {
        requireStaff();
        throw new BusinessException("Feedback is generated by AI evaluation", HttpStatus.CONFLICT, "AI_FEEDBACK_SYSTEM_MANAGED");
    }

    private List<AiQuestionResponse> loadQuestionResponses(AiInterview interview) {
        long interviewId = interview.getId();
        // Candidates must not read the paper before the timer starts.
        if (!access.staff() && interview.getStartedAt() == null) return List.of();
        boolean completed = interview.getStatus() == AiInterviewStatus.PASSED
                || interview.getStatus() == AiInterviewStatus.FAILED || interview.getStatus() == AiInterviewStatus.SCORED;
        boolean revealCorrect = access.staff() && completed;
        boolean revealExplanation = access.staff() && completed;
        if (!access.staff() && completed && InterviewPolicies.isV2(interview)) {
            var review = InterviewPolicies.config(interview).policy().review();
            revealCorrect = review != null && review.showCorrectAnswer();
            revealExplanation = review != null && review.showExplanationAfterInterview();
        }
        List<AiQuestion> questionList = questions.findByAiInterview_IdOrderByQuestionOrderAscIdAsc(interviewId);
        if (!access.staff() && !completed && InterviewPolicies.isV2(interview)) {
            questionList = questionList.stream().filter(q -> q.getProcessRun() != null
                    && (q.getProcessRun().getStatus() == com.smarthire.domain.enums.AiInterviewProcessStatus.IN_PROGRESS
                    || q.getProcessRun().getStatus() == com.smarthire.domain.enums.AiInterviewProcessStatus.COMPLETED)).toList();
        }
        if (questionList.isEmpty()) {
            return List.of();
        }
        List<Long> questionIds = questionList.stream().map(AiQuestion::getId).toList();
        Map<Long, AiAnswer> answersByQuestion = answers.findByAiQuestion_IdIn(questionIds).stream()
                .collect(Collectors.toMap(a -> a.getAiQuestion().getId(), Function.identity(), (a, b) -> a, HashMap::new));
        List<Long> answerIds = answersByQuestion.values().stream().map(AiAnswer::getId).toList();
        Map<Long, AiFeedback> feedbackByAnswer = answerIds.isEmpty()
                ? Map.of()
                : feedbacks.findByAiAnswer_IdIn(answerIds).stream()
                        .collect(Collectors.toMap(f -> f.getAiAnswer().getId(), Function.identity(), (a, b) -> a, HashMap::new));
        if (!access.staff() && !completed && InterviewPolicies.isV2(interview)) feedbackByAnswer = Map.of();
        if (!access.staff() && completed && InterviewPolicies.isV2(interview)) {
            var review = InterviewPolicies.config(interview).policy().review();
            var feedbackMap = feedbackByAnswer;
            return questionList.stream().map(q -> {
                var answer = answersByQuestion.get(q.getId()); var feedback = answer == null ? null : feedbackMap.get(answer.getId());
                var config = q.getProcessRun() == null ? Map.<String, Object>of() : InterviewProcessSettings.config(
                        InterviewPolicies.read(q.getProcessRun().getConfigSnapshotJson(), com.smarthire.tenant.aiInterview.dto.request.InterviewPolicy.Process.class));
                return mapper.toQuestion(q, answer, feedback, InterviewProcessSettings.bool(config, "showCorrectAnswer", review != null && review.showCorrectAnswer()),
                        InterviewProcessSettings.bool(config, "showExplanationAfterInterview", review != null && review.showExplanationAfterInterview()));
            }).toList();
        }
        return mapper.toQuestions(questionList, answersByQuestion, feedbackByAnswer, revealCorrect, revealExplanation);
    }

    private RecruitmentStage resolveStage(Long workflowStageId, Application application) {
        if (workflowStageId == null) {
            return null;
        }
        RecruitmentStage stage = stages.findById(workflowStageId)
                .orElseThrow(() -> new BusinessException("Workflow stage not found", HttpStatus.NOT_FOUND, "STAGE_NOT_FOUND"));
        if (application.getJob() == null || stage.getJob() == null
                || !stage.getJob().getId().equals(application.getJob().getId())) {
            throw new BusinessException(
                    "Workflow stage does not belong to the application job",
                    HttpStatus.BAD_REQUEST,
                    "STAGE_JOB_MISMATCH");
        }
        return stage;
    }

    private AiInterview load(long id) {
        return interviews.findById(id)
                .orElseThrow(() -> new BusinessException("AI interview not found", HttpStatus.NOT_FOUND, "AI_INTERVIEW_NOT_FOUND"));
    }

    private AiInterview loadAccessible(long id) {
        AiInterview interview = load(id);
        if (access.staff()) {
            return interview;
        }
        requireCandidateOwns(interview);
        return interview;
    }

    private AiInterview loadAccessibleForUpdate(long id) {
        access.actor();
        AiInterview interview = interviews.findByIdForUpdate(id)
                .orElseThrow(() -> new BusinessException("AI interview not found", HttpStatus.NOT_FOUND, "AI_INTERVIEW_NOT_FOUND"));
        if (!access.staff()) requireCandidateOwns(interview);
        return interview;
    }

    private void requireEditable(AiInterview interview) {
        if (interview.getStartedAt() != null || interview.getStatus() != AiInterviewStatus.CREATED
                && interview.getStatus() != AiInterviewStatus.QUESTIONS_READY && interview.getStatus() != AiInterviewStatus.ERROR) {
            throw new BusinessException("Interview content is locked", HttpStatus.CONFLICT, "AI_INTERVIEW_LOCKED");
        }
    }

    private void requireUnplanned(AiInterview interview) {
        InterviewPolicies.requireCommunicationOnly(interview);
        if (interview.getConfigSnapshotJson() != null) {
            throw new BusinessException("Planned interview questions follow the job roadmap", HttpStatus.CONFLICT, "AI_INTERVIEW_PLANNED");
        }
    }

    private void syncQuestionStatus(AiInterview interview) {
        long count = questions.countByAiInterview_Id(interview.getId());
        int required;
        if (interview.getConfigSnapshotJson() != null) {
            var policy = InterviewPolicies.config(interview).policy();
            required = policy.stages() == null || policy.stages().isEmpty()
                    ? InterviewPolicies.config(interview).questionCount()
                    : InterviewRubric.plan(policy).size();
        } else {
            required = Math.clamp(interview.getApplication().getJob().getAiInterviewQuestionCount(),
                    AiInterviewEvaluationService.MIN_QUESTIONS, AiInterviewEvaluationService.MAX_QUESTIONS);
        }
        AiInterviewStatus next = count >= required ? AiInterviewStatus.QUESTIONS_READY : AiInterviewStatus.CREATED;
        if (interview.getStatus() != next) {
            interview.setStatus(next);
            interview.setErrorMessage(null);
            activity.record(interview, "QUESTION_STATUS_UPDATED", count + "/" + required + " questions; " + next);
        }
    }

    @Transactional
    public AiInterviewResponse generate(long id) {
        requireStaff();
        var interview = loadAccessibleForUpdate(id);
        requireActiveApplication(interview);
        if (interview.getStatus() == AiInterviewStatus.GENERATING) return mapper.toResponse(interview);
        requireEditable(interview);
        var draft = questions.findByAiInterview_IdOrderByQuestionOrderAscIdAsc(id);
        if (!draft.isEmpty() && (!InterviewPolicies.isV2(interview)
                || !answers.findByAiQuestion_IdIn(draft.stream().map(AiQuestion::getId).toList()).isEmpty())) {
            throw new BusinessException("Only unanswered process drafts can be regenerated", HttpStatus.CONFLICT, "AI_QUESTIONS_EXIST");
        }
        interview.setErrorMessage(null);
        interview.setStatus(AiInterviewStatus.GENERATING);
        activity.record(interview, "GENERATION_QUEUED", "Requested by staff");
        return mapper.toResponse(interview);
    }

    @Transactional
    public AiInterviewResponse retryScore(long id) {
        requireStaff();
        var interview = loadAccessibleForUpdate(id);
        requireActiveApplication(interview);
        if (interview.getStatus() == AiInterviewStatus.SCORING) return mapper.toResponse(interview);
        if (interview.getStatus() != AiInterviewStatus.ERROR || interview.getCompletedAt() == null) {
            throw new BusinessException("Only failed evaluations can be retried", HttpStatus.CONFLICT, "AI_INTERVIEW_BAD_STATUS");
        }
        interview.setStatus(AiInterviewStatus.SCORING);
        interview.setErrorMessage(null);
        activity.record(interview, "EVALUATION_QUEUED", "Retry requested by staff");
        return mapper.toResponse(interview);
    }

    private AiQuestion loadQuestion(long interviewId, long questionId) {
        return questions.findByIdAndAiInterview_Id(questionId, interviewId)
                .orElseThrow(() -> new BusinessException("Question not found", HttpStatus.NOT_FOUND, "AI_QUESTION_NOT_FOUND"));
    }

    private void requireCandidateOwns(AiInterview interview) {
        User actor = access.actor();
        if (!access.candidate()) {
            throw new BusinessException("Access denied", HttpStatus.FORBIDDEN, "AI_INTERVIEW_FORBIDDEN");
        }
        Application app = interview.getApplication();
        if (app == null || app.getCandidate() == null || !app.getCandidate().getId().equals(actor.getId())) {
            throw new BusinessException("AI interview not found", HttpStatus.NOT_FOUND, "AI_INTERVIEW_NOT_FOUND");
        }
    }

    private void requireStaff() {
        access.actor();
        if (!access.staff()) {
            throw new BusinessException("Recruiter access required", HttpStatus.FORBIDDEN, "AI_INTERVIEW_FORBIDDEN");
        }
    }
}
