package com.smarthire.multitenancy.quota;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.multitenancy.context.TenantContext;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.Aspect;
import org.aspectj.lang.annotation.Before;
import org.aspectj.lang.reflect.MethodSignature;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.lang.reflect.Method;

@Aspect
@Component
@RequiredArgsConstructor
@Slf4j
public class TenantQuotaAspect {

    private final TenantQuotaRedisService quotaRedisService;

    @Before("@annotation(com.smarthire.multitenancy.quota.RequireFeature)")
    public void checkFeature(JoinPoint joinPoint) {
        String tenantCode = TenantContext.getCurrentTenant();
        if (tenantCode == null) {
            return; // or throw exception, but TenantWebInterceptor should have handled this
        }

        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        Method method = signature.getMethod();
        RequireFeature annotation = method.getAnnotation(RequireFeature.class);

        String feature = annotation.value();
        
        boolean hasFeature = quotaRedisService.hasFeature(tenantCode, feature);
        if (!hasFeature) {
            log.warn("Tenant {} attempted to access feature {} without active subscription", tenantCode, feature);
            throw new BusinessException(
                "Your subscription plan does not include the feature: " + feature,
                HttpStatus.FORBIDDEN,
                "FEATURE_NOT_INCLUDED"
            );
        }
    }

    @Before("@annotation(com.smarthire.multitenancy.quota.RequireMeteredQuota)")
    public void reserveMeteredQuota(JoinPoint joinPoint) {
        String tenantCode = TenantContext.getCurrentTenant();
        if (tenantCode == null) {
            return;
        }

        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        Method method = signature.getMethod();
        RequireMeteredQuota annotation = method.getAnnotation(RequireMeteredQuota.class);

        QuotaType type = annotation.type();
        int count = annotation.count();

        // Phase 1: Reserve the quota atomically in Redis.
        // We allow overage (Pay-as-you-go), so we do NOT block the request if it exceeds the limit.
        // The Billing system will read the usage at the end of the month.
        long currentUsage = quotaRedisService.reserveQuota(tenantCode, type, count);
        
        // Optional: Check if over limit just to log a warning
        long limit = quotaRedisService.getCapacityLimit(tenantCode, type, Integer.MAX_VALUE);
        if (currentUsage > limit) {
            log.warn("Tenant {} has exceeded {} quota. Limit: {}, Current Usage: {}", tenantCode, type, limit, currentUsage);
            // We do NOT throw BusinessException here because of Pay-as-you-go policy.
        }
    }

    @Before("@annotation(com.smarthire.multitenancy.quota.RequireCapacityQuota)")
    public void checkCapacityQuota(JoinPoint joinPoint) {
        String tenantCode = TenantContext.getCurrentTenant();
        if (tenantCode == null) {
            return;
        }

        MethodSignature signature = (MethodSignature) joinPoint.getSignature();
        Method method = signature.getMethod();
        RequireCapacityQuota annotation = method.getAnnotation(RequireCapacityQuota.class);

        QuotaType type = annotation.type();
        int defaultMax = annotation.defaultMax();

        long limit = quotaRedisService.getCapacityLimit(tenantCode, type, defaultMax);
        
        // In a full implementation, we would execute a COUNT query against the specific repository here
        // depending on the QuotaType (e.g., if type == ACTIVE_JOBS, query jobRepository.countActiveJobs()).
        // For demonstration, we assume an abstract count retrieval.
        long currentActiveCount = 0; // TODO: Replace with actual query based on QuotaType
        
        if (currentActiveCount >= limit) {
            log.warn("Tenant {} reached capacity for {}. Limit: {}", tenantCode, type, limit);
            throw new BusinessException(
                "Capacity limit reached for " + type + ". Please upgrade your subscription plan.",
                HttpStatus.PAYMENT_REQUIRED,
                "CAPACITY_LIMIT_REACHED"
            );
        }
    }
}
