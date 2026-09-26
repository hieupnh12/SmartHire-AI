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

    public AiInterviewService(
            AiInterviewRepository interviews,
            AiQuestionRepository questions,
            AiAnswerRepository answers,
            AiFeedbackRepository feedbacks,
            ApplicationRepository applications,
            RecruitmentStageRepository stages,
            AiInterviewMapper mapper,
            CvAccess access) {
        this.interviews = interviews;
        this.questions = questions;
        this.answers = answers;
        this.feedbacks = feedbacks;
        this.applications = applications;
        this.stages = stages;
        this.mapper = mapper;
        this.access = access;
    }

    @Transactional
    public AiInterviewResponse create(CreateAiInterviewRequest request) {
        requireStaff();
        Application application = applications.findById(request.applicationId())
                .orElseThrow(() -> new BusinessException("Application not found", HttpStatus.NOT_FOUND, "APPLICATION_NOT_FOUND"));
        RecruitmentStage stage = resolveStage(request.workflowStageId(), application);

        AiInterview interview = AiInterview.builder()
                .application(application)
                .workflowStage(stage)
                .status(AiInterviewStatus.CREATED)
                .build();
        return mapper.toResponse(interviews.save(interview));
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
        AiInterview interview = load(id);
        if (request.workflowStageId() != null) {
            interview.setWorkflowStage(resolveStage(request.workflowStageId(), interview.getApplication()));
        }
        if (request.status() != null) {
            interview.setStatus(request.status());
        }
        if (request.startedAt() != null) {
            interview.setStartedAt(request.startedAt());
        }
        if (request.completedAt() != null) {
            interview.setCompletedAt(request.completedAt());
        }
        if (request.overallScore() != null) {
            interview.setOverallScore(request.overallScore());
        }
        return mapper.toResponse(interviews.save(interview), loadQuestionResponses(id));
    }

    @Transactional
    public void delete(long id) {
        requireStaff();
        AiInterview interview = load(id);
        feedbacks.deleteByAiAnswer_AiQuestion_AiInterview_Id(id);
        answers.deleteByAiQuestion_AiInterview_Id(id);
        questions.deleteByAiInterview_Id(id);
        interviews.delete(interview);
    }

    @Transactional
    public AiQuestionResponse addQuestion(long interviewId, AiQuestionRequest request) {
        requireStaff();
        AiInterview interview = load(interviewId);
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
        AiQuestion question = loadQuestion(interviewId, questionId);
        answers.findByAiQuestion_Id(questionId).ifPresent(answer -> {
            feedbacks.findByAiAnswer_Id(answer.getId()).ifPresent(feedbacks::delete);
            answers.delete(answer);
        });
        questions.delete(question);
    }

    @Transactional
    public AiAnswerResponse upsertAnswer(long interviewId, long questionId, UpsertAiAnswerRequest request) {
        AiInterview interview = loadAccessible(interviewId);
        AiQuestion question = loadQuestion(interviewId, questionId);
        if (!access.staff()) {
            requireCandidateOwns(interview);
        }

        AiAnswer answer = answers.findByAiQuestion_Id(questionId).orElseGet(() ->
                AiAnswer.builder().aiQuestion(question).build());
        answer.setAnswerText(request.answerText());
        answer.setAnswerDuration(request.answerDuration());
        answer.setAnsweredAt(request.answeredAt() != null ? request.answeredAt() : Instant.now());
        AiAnswer saved = answers.save(answer);
        AiFeedback feedback = feedbacks.findByAiAnswer_Id(saved.getId()).orElse(null);
        return mapper.toAnswer(saved, feedback);
    }

    @Transactional
    public AiFeedbackResponse upsertFeedback(long interviewId, long answerId, UpsertAiFeedbackRequest request) {
        requireStaff();
        AiAnswer answer = answers.findById(answerId)
                .orElseThrow(() -> new BusinessException("Answer not found", HttpStatus.NOT_FOUND, "AI_ANSWER_NOT_FOUND"));
        if (answer.getAiQuestion() == null
                || answer.getAiQuestion().getAiInterview() == null
                || !answer.getAiQuestion().getAiInterview().getId().equals(interviewId)) {
            throw new BusinessException("Answer not found", HttpStatus.NOT_FOUND, "AI_ANSWER_NOT_FOUND");
        }

        AiFeedback feedback = feedbacks.findByAiAnswer_Id(answerId).orElseGet(() ->
                AiFeedback.builder().aiAnswer(answer).build());
        feedback.setScore(request.score());
        feedback.setFeedbackText(request.feedbackText());
        feedback.setStrengths(request.strengths());
        feedback.setWeaknesses(request.weaknesses());
        return mapper.toFeedback(feedbacks.save(feedback));
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
