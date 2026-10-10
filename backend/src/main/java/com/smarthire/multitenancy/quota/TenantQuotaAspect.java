package com.smarthire.multitenancy.quota;

import com.smarthire.common.api.ApiResponse;
import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.JobStatus;
import com.smarthire.domain.tenant.repository.AiAnswerRecordingRepository;
import com.smarthire.domain.tenant.repository.CvRepository;
import com.smarthire.domain.tenant.repository.InterviewMessageRepository;
import com.smarthire.domain.tenant.repository.JobRepository;
import com.smarthire.multitenancy.context.TenantContext;
import com.smarthire.tenant.aiInterview.dto.request.ProctorEventRequest;
import com.smarthire.tenant.aiInterview.dto.request.UpsertAiAnswerRequest;
import com.smarthire.tenant.aiInterview.dto.response.AiInterviewResponse;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.lang.reflect.Method;
import java.time.Duration;
import java.time.Instant;
import java.util.List;

@Aspect
@Component
@RequiredArgsConstructor
@Slf4j
public class TenantQuotaAspect {

    private final TenantQuotaRedisService quotaRedisService;
    private final JobRepository jobRepository;
    private final CvRepository cvRepository;
    private final InterviewMessageRepository interviewMessageRepository;
    private final AiAnswerRecordingRepository aiAnswerRecordingRepository;

    @Before("@annotation(com.smarthire.multitenancy.quota.RequireFeature)")
    public void checkFeature(JoinPoint joinPoint) {
        String tenantCode = TenantContext.getCurrentTenant();
        if (tenantCode == null || tenantCode.isBlank()) {
            return;
        }

        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        Method method = signature.getMethod();
        RequireFeature annotation = method.getAnnotation(RequireFeature.class);

        String feature = annotation.value();
        boolean hasFeature = quotaRedisService.hasFeature(tenantCode, feature);
        if (!hasFeature) {
            log.warn("Tenant {} attempted to access feature {} without active subscription", tenantCode, feature);
            throw new BusinessException(
                    "Gói dịch vụ hiện tại của bạn không bao gồm tính năng: " + feature,
                    HttpStatus.PAYMENT_REQUIRED,
                    "FEATURE_NOT_INCLUDED"
            );
        }
    }

    @Before("@annotation(com.smarthire.multitenancy.quota.RequireMeteredQuota)")
    public void reserveMeteredQuota(JoinPoint joinPoint) {
        String tenantCode = TenantContext.getCurrentTenant();
        if (tenantCode == null || tenantCode.isBlank()) {
            return;
        }

        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        Method method = signature.getMethod();
        RequireMeteredQuota annotation = method.getAnnotation(RequireMeteredQuota.class);

        QuotaType type = annotation.type();
        int count = annotation.count();

        if (count <= 0) {
            quotaRedisService.requireQuotaAvailable(tenantCode, type);
        } else {
            quotaRedisService.checkAndReserveQuota(tenantCode, type, count);
        }
    }

    @Before("@annotation(com.smarthire.multitenancy.quota.RequireCapacityQuota)")
    public void checkCapacityQuota(JoinPoint joinPoint) {
        String tenantCode = TenantContext.getCurrentTenant();
        if (tenantCode == null || tenantCode.isBlank()) {
            return;
        }

        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        Method method = signature.getMethod();
        RequireCapacityQuota annotation = method.getAnnotation(RequireCapacityQuota.class);

        QuotaType type = annotation.type();
        String methodName = method.getName();
        long currentActiveCount = switch (type) {
            case ACTIVE_JOBS -> {
                if ("publish".equals(methodName)) {
                    yield jobRepository.countByStatusAndDeletedAtIsNull(JobStatus.PUBLISHED);
                }
                yield jobRepository.countByStatusInAndDeletedAtIsNull(
                        List.of(JobStatus.DRAFT, JobStatus.PUBLISHED, JobStatus.PAUSED));
            }
            default -> 0L;
        };

        quotaRedisService.checkCapacity(tenantCode, type, currentActiveCount, 1L);
    }

    /**
     * Enforce max_storage_gb on all tenant file uploads (CVs, avatars, audio recordings, landing page images).
     */
    @Before(
            "execution(* com.smarthire.tenant.cv.controller.CvController.upload*(..)) || " +
            "execution(* com.smarthire.tenant.aiInterview.controller.AiInterviewController.audioAnswer(..)) || " +
            "execution(* com.smarthire.tenant.aiInterview.controller.InterviewConversationController.recording(long, long, org.springframework.web.multipart.MultipartFile)) || " +
            "execution(* com.smarthire.tenant.landing.controller.TenantLandingPageController.uploadImage(..))"
    )
    public void checkStorageQuotaOnUpload(JoinPoint joinPoint) {
        String tenantCode = TenantContext.getCurrentTenant();
        if (tenantCode == null || tenantCode.isBlank()) {
            return;
        }

        long incomingBytes = 0L;
        for (Object arg : joinPoint.getArgs()) {
            if (arg instanceof MultipartFile file && !file.isEmpty()) {
                incomingBytes += file.getSize();
            }
        }

        long currentBytes = calculateTotalTenantStorageBytes();
        quotaRedisService.requireAndRecordStorage(tenantCode, currentBytes, incomingBytes);
    }

    /**
     * Enforce video_retention_days > 0 before storing interview audio/video recordings.
     */
    @Before(
            "execution(* com.smarthire.tenant.aiInterview.controller.AiInterviewController.audioAnswer(..)) || " +
            "execution(* com.smarthire.tenant.aiInterview.controller.InterviewConversationController.recording(long, long, org.springframework.web.multipart.MultipartFile))"
    )
    public void checkVideoRetentionBeforeUpload() {
        String tenantCode = TenantContext.getCurrentTenant();
        if (tenantCode == null || tenantCode.isBlank()) {
            return;
        }
        quotaRedisService.requireVideoRetentionEnabled(tenantCode);
    }

    /**
     * Enforce video_retention_days when recruiter reads an AI answer recording.
     */
    @Before(
            "execution(* com.smarthire.tenant.aiInterview.controller.AiInterviewController.recordingInfo(long, long)) || " +
            "execution(* com.smarthire.tenant.aiInterview.controller.AiInterviewController.audio(long, long))"
    )
    public void checkAnswerRecordingRetention(JoinPoint joinPoint) {
        String tenantCode = TenantContext.getCurrentTenant();
        if (tenantCode == null || tenantCode.isBlank()) {
            return;
        }
        Object[] args = joinPoint.getArgs();
        if (args.length >= 2 && args[1] instanceof Long answerId) {
            aiAnswerRecordingRepository.findByAiAnswer_Id(answerId).ifPresent(rec -> {
                if (quotaRedisService.isRecordingExpired(tenantCode, rec.getCreatedAt())) {
                    long retentionDays = quotaRedisService.getVideoRetentionDays(tenantCode);
                    throw new BusinessException(
                            String.format("Bản ghi phỏng vấn đã quá thời hạn lưu trữ theo gói dịch vụ (%d ngày). Vui lòng nâng cấp gói để tăng thời hạn lưu trữ.", retentionDays),
                            HttpStatus.PAYMENT_REQUIRED,
                            "RECORDING_RETENTION_EXPIRED"
                    );
                }
            });
        }
    }

    /**
     * Enforce video_retention_days when reading a conversation turn recording.
     */
    @Before("execution(* com.smarthire.tenant.aiInterview.controller.InterviewConversationController.recording(long, long))")
    public void checkConversationRecordingRetention(JoinPoint joinPoint) {
        String tenantCode = TenantContext.getCurrentTenant();
        if (tenantCode == null || tenantCode.isBlank()) {
            return;
        }
        Object[] args = joinPoint.getArgs();
        if (args.length >= 2 && args[1] instanceof Long messageId) {
            interviewMessageRepository.findById(messageId).ifPresent(msg -> {
                if (quotaRedisService.isRecordingExpired(tenantCode, msg.getCreatedAt())) {
                    long retentionDays = quotaRedisService.getVideoRetentionDays(tenantCode);
                    throw new BusinessException(
                            String.format("Bản ghi phỏng vấn đã quá thời hạn lưu trữ theo gói dịch vụ (%d ngày). Vui lòng nâng cấp gói để tăng thời hạn lưu trữ.", retentionDays),
                            HttpStatus.PAYMENT_REQUIRED,
                            "RECORDING_RETENTION_EXPIRED"
                    );
                }
            });
        }
    }

    /**
     * Meter AI voice seconds on per-question audio answer submission.
     */
    @AfterReturning("execution(* com.smarthire.tenant.aiInterview.controller.AiInterviewController.audioAnswer(..))")
    public void recordAudioAnswerVoiceSeconds(JoinPoint joinPoint) {
        String tenantCode = TenantContext.getCurrentTenant();
        if (tenantCode == null || tenantCode.isBlank()) {
            return;
        }
        long seconds = 15L;
        for (Object arg : joinPoint.getArgs()) {
            if (arg instanceof UpsertAiAnswerRequest answer) {
                if (answer.speechMetrics() != null && answer.speechMetrics().durationMs() > 0) {
                    seconds = Math.max(1L, answer.speechMetrics().durationMs() / 1000L);
                } else if (answer.answerDuration() != null && answer.answerDuration() > 0) {
                    seconds = answer.answerDuration();
                }
                break;
            }
        }
        quotaRedisService.recordConsumedQuota(tenantCode, QuotaType.AI_VOICE_SECONDS, seconds);
    }

    /**
     * Meter AI voice seconds on conversational turn.
     */
    @Before("execution(* com.smarthire.tenant.aiInterview.controller.InterviewConversationController.turn(..))")
    public void recordConversationTurnSeconds() {
        String tenantCode = TenantContext.getCurrentTenant();
        if (tenantCode == null || tenantCode.isBlank()) {
            return;
        }
        quotaRedisService.recordConsumedQuota(tenantCode, QuotaType.AI_VOICE_SECONDS, 20L);
    }

    /**
     * Meter AI interview session duration when completed (for non-conversational/standard sessions).
     */
    @AfterReturning(
            pointcut = "execution(* com.smarthire.tenant.aiInterview.controller.AiInterviewController.complete(..))",
            returning = "result"
    )
    public void recordCompletedAiInterviewSeconds(Object result) {
        String tenantCode = TenantContext.getCurrentTenant();
        if (tenantCode == null || tenantCode.isBlank()) {
            return;
        }
        if (result instanceof ApiResponse<?> apiResp && apiResp.data() instanceof AiInterviewResponse resp) {
            if (!resp.conversational() && !resp.voiceEnabled()) {
                Instant start = resp.startedAt();
                Instant end = resp.completedAt() != null ? resp.completedAt() : Instant.now();
                long elapsed = start != null ? Duration.between(start, end).getSeconds() : 60L;
                long clamped = Math.max(15L, Math.min(elapsed, 7200L));
                quotaRedisService.recordConsumedQuota(tenantCode, QuotaType.AI_VOICE_SECONDS, clamped);
            }
        }
    }

    /**
     * Meter proctoring seconds on proctor event heartbeat/report.
     */
    @AfterReturning("execution(* com.smarthire.tenant.aiInterview.controller.AiInterviewController.proctorEvent(..))")
    public void recordProctoringSeconds(JoinPoint joinPoint) {
        String tenantCode = TenantContext.getCurrentTenant();
        if (tenantCode == null || tenantCode.isBlank()) {
            return;
        }
        long seconds = 5L;
        for (Object arg : joinPoint.getArgs()) {
            if (arg instanceof ProctorEventRequest req) {
                if (req.durationSeconds() != null && req.durationSeconds() > 0) {
                    seconds = req.durationSeconds();
                } else if ("HEARTBEAT".equalsIgnoreCase(req.event())) {
                    seconds = 20L;
                }
                break;
            }
        }
        quotaRedisService.recordConsumedQuota(tenantCode, QuotaType.PROCTORING_SECONDS, seconds);
    }

    /**
     * Sync active jobs count into tenant_usage_daily after job lifecycle mutations.
     */
    @AfterReturning(
            "execution(* com.smarthire.tenant.job.controller.JobController.create*(..)) || " +
            "execution(* com.smarthire.tenant.job.controller.JobController.clone*(..)) || " +
            "execution(* com.smarthire.tenant.job.controller.JobController.publish(..)) || " +
            "execution(* com.smarthire.tenant.job.controller.JobController.unpublish(..)) || " +
            "execution(* com.smarthire.tenant.job.controller.JobController.pause(..)) || " +
            "execution(* com.smarthire.tenant.job.controller.JobController.close(..)) || " +
            "execution(* com.smarthire.tenant.job.controller.JobController.reopen(..)) || " +
            "execution(* com.smarthire.tenant.job.controller.JobController.delete(..))"
    )
    public void syncActiveJobsCount() {
        String tenantCode = TenantContext.getCurrentTenant();
        if (tenantCode == null || tenantCode.isBlank()) {
            return;
        }
        try {
            long activeCount = jobRepository.countByStatusInAndDeletedAtIsNull(
                    List.of(JobStatus.DRAFT, JobStatus.PUBLISHED, JobStatus.PAUSED));
            quotaRedisService.syncActiveJobsCount(tenantCode, activeCount);
        } catch (Exception e) {
            log.debug("Could not sync active jobs count for tenant {}: {}", tenantCode, e.getMessage());
        }
    }

    public long calculateTotalTenantStorageBytes() {
        long cvBytes = 0L;
        long msgAudioBytes = 0L;
        long ansAudioBytes = 0L;
        try {
            cvBytes = cvRepository.sumTotalFileSize();
            msgAudioBytes = interviewMessageRepository.sumTotalRecordingSize();
            ansAudioBytes = aiAnswerRecordingRepository.sumTotalRecordingSize();
        } catch (Exception e) {
            log.debug("Failed to calculate total tenant storage bytes: {}", e.getMessage());
        }
        return cvBytes + msgAudioBytes + ansAudioBytes;
    }
}
