package com.smarthire.master.notification.service;

import com.smarthire.common.redis.RedisService;
import com.smarthire.domain.master.entity.SubscriptionPlan;
import com.smarthire.domain.master.entity.TenantInfo;
import com.smarthire.domain.master.entity.TenantSubscription;
import com.smarthire.domain.master.repository.SubscriptionPlanRepository;
import com.smarthire.domain.master.repository.TenantInfoRepository;
import com.smarthire.domain.master.repository.TenantSubscriptionRepository;
import com.smarthire.messaging.TenantJobExecutor;
import com.smarthire.tenant.notification.service.TenantAdminNotificationService;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

/**
 * Coordinates lifecycle alerts (7D / 3D / 1D before expiry, PAST_DUE, SUSPENDED)
 * across both Master Email (RabbitMQ) and Tenant Admin In-App Inbox (WebSocket-backed).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SubscriptionLifecycleNotificationService {

    private static final DateTimeFormatter DATE_VN = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final Duration CYCLE_DEDUP_TTL = Duration.ofDays(16);

    private final MasterNotificationService masterNotificationService;
    private final TenantInfoRepository tenantInfoRepository;
    private final SubscriptionPlanRepository planRepository;
    private final RedisService redisService;

    @Autowired(required = false)
    private TenantSubscriptionRepository subscriptionRepository;

    @Autowired(required = false)
    private TenantJobExecutor tenantJobExecutor;

    @Autowired(required = false)
    private TenantAdminNotificationService tenantAdminNotificationService;

    public void notifySubscriptionsByIds(List<Long> subscriptionIds) {
        if (subscriptionIds == null || subscriptionIds.isEmpty() || subscriptionRepository == null) {
            return;
        }
        for (Long subId : subscriptionIds) {
            if (subId == null) continue;
            try {
                subscriptionRepository.findById(subId).ifPresent(sub -> {
                    TenantInfo tenant = tenantInfoRepository.findById(sub.getTenantId()).orElse(null);
                    SubscriptionPlan plan = sub.getPlanId() != null
                            ? planRepository.findById(sub.getPlanId()).orElse(null)
                            : null;
                    notifyOverdueOrSuspended(sub, plan, tenant);
                });
            } catch (Exception ex) {
                log.warn("Failed dispatching lifecycle notification for subscription {}: {}", subId, ex.getMessage());
            }
        }
    }

    public boolean notifyUpcomingExpiry(TenantSubscription sub, SubscriptionPlan plan, TenantInfo tenant) {
        if (!isEligibleActiveTenant(sub, tenant) || sub.getEndsAt() == null) {
            return false;
        }
        String status = sub.getStatus() != null ? sub.getStatus().toUpperCase() : "";
        if (!"ACTIVE".equals(status) && !"TRIAL".equals(status)) {
            return false;
        }
        LocalDateTime now = LocalDateTime.now();
        if (!sub.getEndsAt().isAfter(now)) {
            return false;
        }

        long calendarDaysLeft = ChronoUnit.DAYS.between(now.toLocalDate(), sub.getEndsAt().toLocalDate());
        long hoursLeft = Math.max(0L, Duration.between(now, sub.getEndsAt()).toHours());
        if (calendarDaysLeft > 7) {
            return false;
        }

        String milestone;
        if (calendarDaysLeft <= 1 || hoursLeft <= 24) {
            milestone = "1D";
        } else if (calendarDaysLeft <= 3) {
            milestone = "3D";
        } else {
            milestone = "7D";
        }

        return dispatchLifecycleAlert(
                tenant,
                sub,
                plan,
                "SUBSCRIPTION_EXPIRY_" + milestone,
                milestone,
                Math.max(0L, calendarDaysLeft));
    }

    public boolean notifyOverdueOrSuspended(TenantSubscription sub, SubscriptionPlan plan, TenantInfo tenant) {
        if (!isEligibleActiveTenant(sub, tenant)) {
            return false;
        }
        String status = sub.getStatus() != null ? sub.getStatus().toUpperCase() : "";
        if ("PAST_DUE".equals(status)) {
            return dispatchLifecycleAlert(tenant, sub, plan, "SUBSCRIPTION_PAST_DUE", "PAST_DUE", 0L);
        }
        if ("SUSPENDED".equals(status)) {
            return dispatchLifecycleAlert(tenant, sub, plan, "SUBSCRIPTION_SUSPENDED", "SUSPENDED", 0L);
        }
        return false;
    }

    private boolean isEligibleActiveTenant(TenantSubscription sub, TenantInfo tenant) {
        return sub != null
                && tenant != null
                && !tenant.isDeleted()
                && "ACTIVE".equalsIgnoreCase(tenant.getStatus())
                && StringUtils.hasText(tenant.getCode());
    }

    private boolean dispatchLifecycleAlert(
            TenantInfo tenant,
            TenantSubscription sub,
            SubscriptionPlan plan,
            String notificationType,
            String milestone,
            long daysLeft) {
        String planName = StringUtils.hasText(sub.getPlanNameSnapshot())
                ? sub.getPlanNameSnapshot()
                : (plan != null && StringUtils.hasText(plan.getName()) ? plan.getName() : "Gói dịch vụ");
        String expiresAtStr = sub.getEndsAt() != null ? sub.getEndsAt().format(DATE_VN) : "—";
        String graceEndsAtStr = sub.getGracePeriodEndsAt() != null ? sub.getGracePeriodEndsAt().format(DATE_VN) : "";
        String cycleKey = sub.getEndsAt() != null ? sub.getEndsAt().toLocalDate().toString() : "no_end";

        boolean isUrgent = "1D".equals(milestone) || "PAST_DUE".equals(milestone) || "SUSPENDED".equals(milestone);
        String daysText = daysLeft == 0 ? "hết hạn trong hôm nay" : "còn " + daysLeft + " ngày";

        String subject;
        String badgeText;
        String headline;
        String daysRemainingLabel;
        String messageDetail;
        String ctaLabel;
        String bellTitle;
        String bellBody;

        if ("PAST_DUE".equals(milestone)) {
            subject = "SmartHire-AI - Gói dịch vụ [" + planName + "] đã quá hạn thanh toán";
            badgeText = "Quá hạn thanh toán (Ân hạn)";
            headline = "Gói dịch vụ đã hết hạn — Đang trong thời gian ân hạn";
            boolean isCycleRolloverOverdue = sub.getEndsAt() != null && sub.getEndsAt().isAfter(LocalDateTime.now().plusDays(1));
            String rolloverDateStr = sub.getStartsAt() != null ? sub.getStartsAt().format(DATE_VN) : "hôm nay";
            daysRemainingLabel = "Quá hạn — Ân hạn tới " + (StringUtils.hasText(graceEndsAtStr) ? graceEndsAtStr : "5 ngày");
            messageDetail = isCycleRolloverOverdue
                    ? "Gói " + planName + " của Quý doanh nghiệp đã bắt đầu chu kỳ mới từ ngày " + rolloverDateStr
                            + " và đang chờ thanh toán. Hệ thống vẫn duy trì quyền truy cập trong thời gian ân hạn. Vui lòng hoàn tất thanh toán để tránh bị tạm khóa các tính năng AI và đăng tin."
                    : "Gói " + planName + " của Quý doanh nghiệp đã hết hạn vào ngày " + expiresAtStr
                            + ". Hệ thống vẫn duy trì quyền truy cập trong thời gian ân hạn. Vui lòng hoàn tất thanh toán gia hạn để tránh bị tạm khóa các tính năng AI và đăng tin.";
            ctaLabel = "Thanh toán gia hạn ngay";
            bellTitle = "Gói dịch vụ quá hạn thanh toán";
            bellBody = (isCycleRolloverOverdue
                    ? "Gói " + planName + " đang chờ thanh toán chu kỳ mới từ " + rolloverDateStr
                    : "Gói " + planName + " đã hết hạn vào " + expiresAtStr)
                    + (StringUtils.hasText(graceEndsAtStr) ? " (ân hạn đến " + graceEndsAtStr + ")" : "")
                    + ". Vui lòng gia hạn ngay để tránh gián đoạn tuyển dụng.";
        } else if ("SUSPENDED".equals(milestone)) {
            subject = "SmartHire-AI - Gói dịch vụ [" + planName + "] đã bị tạm khóa do quá hạn";
            badgeText = "Tạm khóa gói dịch vụ";
            headline = "Gói dịch vụ đã tạm khóa sau thời gian ân hạn";
            daysRemainingLabel = "Đã tạm khóa (SUSPENDED)";
            messageDetail = "Thời gian ân hạn cho gói " + planName + " đã kết thúc. Các tính năng đăng tin mới, lọc CV AI và phỏng vấn AI hiện đang tạm khóa và sẽ tự động mở lại ngay sau khi Quý doanh nghiệp thanh toán gia hạn.";
            ctaLabel = "Gia hạn để mở khóa ngay";
            bellTitle = "Gói dịch vụ đang bị tạm khóa";
            bellBody = "Gói " + planName + " đã bị tạm khóa do quá hạn thanh toán sau thời gian ân hạn. Thanh toán gia hạn để khôi phục ngay lập tức.";
        } else {
            subject = "SmartHire-AI - Gói [" + planName + "] sắp hết hạn (" + daysText + ")";
            badgeText = "1D".equals(milestone) ? "Sắp hết hạn khẩn cấp" : "Nhắc gia hạn bản quyền";
            headline = daysLeft == 0
                    ? "Gói dịch vụ sẽ hết hạn trong hôm nay"
                    : "Gói dịch vụ sắp hết hạn sau " + daysLeft + " ngày";
            daysRemainingLabel = daysLeft == 0 ? "Hết hạn hôm nay (" + expiresAtStr + ")" : "Còn " + daysLeft + " ngày";
            if (sub.getNextPlanId() != null) {
                messageDetail = "Gói " + planName + " sẽ kết thúc vào ngày " + expiresAtStr + " (" + daysText
                        + ") và chuyển sang gói bạn đã lên lịch hạ cấp cuối chu kỳ. Bạn có thể kiểm tra hoặc hủy lịch nếu muốn giữ nguyên gói hiện tại.";
            } else {
                messageDetail = "Gói " + planName + " của Quý doanh nghiệp sẽ hết hạn vào ngày " + expiresAtStr + " (" + daysText
                        + "). Hãy gia hạn trước hạn để không gián đoạn quy trình tuyển dụng — toàn bộ số ngày còn lại sẽ được cộng dồn trọn vẹn.";
            }
            ctaLabel = "Kiểm tra & Gia hạn ngay";
            bellTitle = daysLeft == 0
                    ? "Gói dịch vụ hết hạn trong hôm nay"
                    : "Gói dịch vụ sắp hết hạn (còn " + daysLeft + " ngày)";
            bellBody = "Gói " + planName + " sẽ hết hạn vào " + expiresAtStr
                    + ". Nhấn để kiểm tra và gia hạn, ngày còn lại sẽ được cộng dồn.";
        }

        String autoRenewLabel = sub.isAutoRenew()
                ? "Đang bật — nhận nhắc gia hạn trước hạn"
                : "Đang tắt — cần gia hạn thủ công trước " + expiresAtStr;

        Map<String, Object> emailVars = new HashMap<>();
        emailVars.put("badgeText", badgeText);
        emailVars.put("isUrgent", isUrgent);
        emailVars.put("headline", headline);
        emailVars.put("planName", planName);
        emailVars.put("expiresAt", expiresAtStr);
        emailVars.put("daysRemainingLabel", daysRemainingLabel);
        emailVars.put("gracePeriodEndsAt", graceEndsAtStr);
        emailVars.put("autoRenewLabel", autoRenewLabel);
        emailVars.put("messageDetail", messageDetail);
        emailVars.put("ctaLabel", ctaLabel);

        String emailDedupKey = String.format("email_sent:sub_alert:%s:%d:%s:%s",
                tenant.getCode(), sub.getId(), cycleKey, notificationType);
        boolean emailDispatched = false;
        try {
            emailDispatched = masterNotificationService.sendSubscriptionLifecycleEmail(
                    tenant, notificationType, emailDedupKey, subject, emailVars);
        } catch (Exception ex) {
            log.warn("Failed dispatching {} email for tenant {}: {}", notificationType, tenant.getCode(), ex.getMessage());
        }

        boolean webDispatched = dispatchTenantAdminInbox(
                tenant, sub, cycleKey, notificationType, milestone, planName, expiresAtStr, daysLeft, bellTitle, bellBody);

        return emailDispatched || webDispatched;
    }

    private boolean dispatchTenantAdminInbox(
            TenantInfo tenant,
            TenantSubscription sub,
            String cycleKey,
            String notificationType,
            String milestone,
            String planName,
            String expiresAtStr,
            long daysLeft,
            String bellTitle,
            String bellBody) {
        if (tenantJobExecutor == null || tenantAdminNotificationService == null) {
            return false;
        }
        String webDedupKey = String.format("web_notif:sub_alert:%s:%d:%s:%s",
                tenant.getCode(), sub.getId(), cycleKey, notificationType);
        boolean acquiredRedis = false;
        try {
            acquiredRedis = redisService.setIfAbsent(webDedupKey, "1", CYCLE_DEDUP_TTL);
            if (!acquiredRedis) {
                return false;
            }
        } catch (Exception ex) {
            log.debug("Redis dedup unavailable for tenant admin bell {}: {}", tenant.getCode(), ex.getMessage());
        }

        Map<String, Object> payloadMap = new HashMap<>();
        payloadMap.put("path", "/internal/admin/billing");
        payloadMap.put("milestone", milestone);
        payloadMap.put("planName", planName);
        payloadMap.put("expiresAt", expiresAtStr);
        payloadMap.put("daysRemaining", daysLeft);

        try {
            Instant dbDedupCutoff = Instant.now().minus(6, ChronoUnit.DAYS);
            final int[] savedCount = {0};
            tenantJobExecutor.execute(tenant.getCode(), () -> {
                savedCount[0] = tenantAdminNotificationService.notifyCompanyAdmins(
                        notificationType, bellTitle, bellBody, payloadMap, dbDedupCutoff);
            });
            return savedCount[0] > 0;
        } catch (Exception ex) {
            if (acquiredRedis) {
                try {
                    redisService.delete(webDedupKey);
                } catch (Exception ignored) {
                    // Best-effort cleanup
                }
            }
            log.warn("Failed sending {} admin bell notification for tenant {}: {}",
                    notificationType, tenant.getCode(), ex.getMessage());
            return false;
        }
    }
}
