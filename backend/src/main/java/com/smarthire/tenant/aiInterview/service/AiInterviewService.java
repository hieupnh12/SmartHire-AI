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
import com.smarthire.domain.tenant.repository.AiInterviewRepository;
import com.smarthire.domain.tenant.repository.AiQuestionRepository;
import com.smarthire.domain.tenant.repository.ApplicationRepository;
import com.smarthire.domain.tenant.repository.RecruitmentStageRepository;
import com.smarthire.tenant.aiInterview.dto.request.AiQuestionRequest;
import com.smarthire.tenant.aiInterview.dto.request.CreateAiInterviewRequest;
import com.smarthire.tenant.aiInterview.dto.request.UpdateAiInterviewRequest;
import com.smarthire.tenant.aiInterview.dto.request.UpsertAiAnswerRequest;
import com.smarthire.tenant.aiInterview.dto.request.UpsertAiFeedbackRequest;
import com.smarthire.tenant.aiInterview.dto.response.AiAnswerResponse;
import com.smarthire.tenant.aiInterview.dto.response.AiFeedbackResponse;
import com.smarthire.tenant.aiInterview.dto.response.AiInterviewPage;
import com.smarthire.tenant.aiInterview.dto.response.AiInterviewResponse;
import com.smarthire.tenant.aiInterview.dto.response.AiQuestionResponse;
import com.smarthire.tenant.aiInterview.mapper.AiInterviewMapper;
import com.smarthire.tenant.cv.service.CvAccess;
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

    public AiInterviewService(
            AiInterviewRepository interviews,
            AiQuestionRepository questions,
            AiAnswerRepository answers,
            AiFeedbackRepository feedbacks,
            ApplicationRepository applications,
            RecruitmentStageRepository stages,
            AiInterviewMapper mapper,
            CvAccess access, AiInterviewInvitationService invitations) {
        this.interviews = interviews;
        this.questions = questions;
        this.answers = answers;
        this.feedbacks = feedbacks;
        this.applications = applications;
        this.stages = stages;
        this.mapper = mapper;
        this.access = access;
        this.invitations = invitations;
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
            return mapper.toResponse(interview, loadQuestionResponses(id));
        }
        if (interview.getStatus() != AiInterviewStatus.QUESTIONS_READY
                || questions.findByAiInterview_IdOrderByQuestionOrderAscIdAsc(id).isEmpty()) {
            throw new BusinessException("Interview questions are not ready", HttpStatus.CONFLICT, "AI_INTERVIEW_NOT_READY");
        }
        interview.setStatus(AiInterviewStatus.IN_PROGRESS);
        interview.setPassingScoreSnapshot(interview.getApplication().getJob().getAiInterviewPassingScore());
        interview.setStartedAt(Instant.now());
        return mapper.toResponse(interview, loadQuestionResponses(id));
    }

    @Transactional
    public AiInterviewResponse complete(long id) {
        AiInterview interview = loadAccessibleForUpdate(id);
        requireCandidateOwns(interview);
        requireActiveApplication(interview);
        if (interview.getCompletedAt() != null) return mapper.toResponse(interview, loadQuestionResponses(id));
        if (interview.getStatus() != AiInterviewStatus.IN_PROGRESS) {
            throw new BusinessException("Interview is not in progress", HttpStatus.CONFLICT, "AI_INTERVIEW_BAD_STATUS");
        }
        var responses = loadQuestionResponses(id);
        if (responses.isEmpty() || responses.stream().anyMatch(q -> q.answer() == null
                || q.answer().answerText() == null || q.answer().answerText().isBlank())) {
            throw new BusinessException("Answer all questions before submitting", HttpStatus.CONFLICT, "AI_INTERVIEW_INCOMPLETE");
        }
        interview.setCompletedAt(Instant.now());
        interview.setStatus(AiInterviewStatus.SCORING);
        return mapper.toResponse(interview, responses);
    }

    private void requireActiveApplication(AiInterview interview) {
        AiInterviewEligibility.require(interview.getApplication());
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

    @Transactional(readOnly = true)
    public AiInterviewResponse get(long id) {
        AiInterview interview = loadAccessible(id);
        return mapper.toResponse(interview, loadQuestionResponses(id));
    }

    @Transactional
    public AiInterviewResponse update(long id, UpdateAiInterviewRequest request) {
        requireStaff();
        AiInterview interview = loadAccessibleForUpdate(id);
        requireEditable(interview);
        if (request.overallScore() != null || request.startedAt() != null || request.completedAt() != null
                || request.status() != null && request.status() != AiInterviewStatus.QUESTIONS_READY) {
            throw new BusinessException("Interview outcomes are computed by the system", HttpStatus.CONFLICT, "AI_INTERVIEW_SYSTEM_MANAGED");
        }
        if (request.status() == AiInterviewStatus.QUESTIONS_READY
                && questions.findByAiInterview_IdOrderByQuestionOrderAscIdAsc(id).isEmpty()) {
            throw new BusinessException("Add questions before marking ready", HttpStatus.CONFLICT, "AI_INTERVIEW_NOT_READY");
        }
        if (request.workflowStageId() != null) {
            interview.setWorkflowStage(resolveStage(request.workflowStageId(), interview.getApplication()));
        }
        if (request.status() != null) {
            interview.setStatus(request.status());
        }
        return mapper.toResponse(interviews.save(interview), loadQuestionResponses(id));
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
        AiQuestion question = AiQuestion.builder()
                .aiInterview(interview)
                .questionText(request.questionText().trim())
                .questionType(request.questionType().trim().toUpperCase())
                .questionOrder(request.questionOrder())
                .build();
        return mapper.toQuestion(questions.save(question), null, null);
    }

    @Transactional
    public AiQuestionResponse updateQuestion(long interviewId, long questionId, AiQuestionRequest request) {
        requireStaff();
        requireEditable(loadAccessibleForUpdate(interviewId));
        AiQuestion question = loadQuestion(interviewId, questionId);
        question.setQuestionText(request.questionText().trim());
        question.setQuestionType(request.questionType().trim().toUpperCase());
        question.setQuestionOrder(request.questionOrder());
        AiAnswer answer = answers.findByAiQuestion_Id(questionId).orElse(null);
        AiFeedback feedback = answer == null ? null : feedbacks.findByAiAnswer_Id(answer.getId()).orElse(null);
        return mapper.toQuestion(questions.save(question), answer, feedback);
    }

    @Transactional
    public void deleteQuestion(long interviewId, long questionId) {
        requireStaff();
        requireEditable(loadAccessibleForUpdate(interviewId));
        AiQuestion question = loadQuestion(interviewId, questionId);
        answers.findByAiQuestion_Id(questionId).ifPresent(answer -> {
            feedbacks.findByAiAnswer_Id(answer.getId()).ifPresent(feedbacks::delete);
            answers.delete(answer);
        });
        questions.delete(question);
    }

    @Transactional
    public AiAnswerResponse upsertAnswer(long interviewId, long questionId, UpsertAiAnswerRequest request) {
        AiInterview interview = loadAccessibleForUpdate(interviewId);
        requireCandidateOwns(interview);
        AiQuestion question = loadQuestion(interviewId, questionId);
        if (!access.staff()) {
            requireCandidateOwns(interview);
            requireActiveApplication(interview);
            if (interview.getStatus() != AiInterviewStatus.IN_PROGRESS || interview.getCompletedAt() != null) {
                throw new BusinessException("Interview is not in progress", HttpStatus.CONFLICT, "AI_INTERVIEW_BAD_STATUS");
            }
            if (request.answerText() == null || request.answerText().isBlank()) {
                throw new BusinessException("Answer is required", HttpStatus.BAD_REQUEST, "AI_ANSWER_REQUIRED");
            }
        }

        AiAnswer answer = answers.findByAiQuestion_Id(questionId).orElseGet(() ->
                AiAnswer.builder().aiQuestion(question).build());
        answer.setAnswerText(request.answerText());
        answer.setAnswerDuration(request.answerDuration());
        answer.setAnsweredAt(access.staff() && request.answeredAt() != null ? request.answeredAt() : Instant.now());
        AiAnswer saved = answers.save(answer);
        AiFeedback feedback = feedbacks.findByAiAnswer_Id(saved.getId()).orElse(null);
        return mapper.toAnswer(saved, feedback);
    }

    @Transactional
    public AiFeedbackResponse upsertFeedback(long interviewId, long answerId, UpsertAiFeedbackRequest request) {
        requireStaff();
        throw new BusinessException("Feedback is generated by AI evaluation", HttpStatus.CONFLICT, "AI_FEEDBACK_SYSTEM_MANAGED");
    }

    private List<AiQuestionResponse> loadQuestionResponses(long interviewId) {
        List<AiQuestion> questionList = questions.findByAiInterview_IdOrderByQuestionOrderAscIdAsc(interviewId);
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
        return mapper.toQuestions(questionList, answersByQuestion, feedbackByAnswer);
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

    @Transactional
    public AiInterviewResponse generate(long id) {
        requireStaff();
        var interview = loadAccessibleForUpdate(id);
        requireActiveApplication(interview);
        if (interview.getStatus() == AiInterviewStatus.GENERATING) return mapper.toResponse(interview);
        requireEditable(interview);
        if (!questions.findByAiInterview_IdOrderByQuestionOrderAscIdAsc(id).isEmpty()) {
            throw new BusinessException("Remove draft questions before generating", HttpStatus.CONFLICT, "AI_QUESTIONS_EXIST");
        }
        interview.setErrorMessage(null);
        interview.setStatus(AiInterviewStatus.GENERATING);
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
