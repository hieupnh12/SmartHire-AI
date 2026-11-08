package com.smarthire.tenant.workflow.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.ApplicationStatus;
import com.smarthire.domain.enums.HiringDecisionType;
import com.smarthire.domain.enums.NotificationCategory;
import com.smarthire.domain.tenant.entity.Application;
import com.smarthire.domain.tenant.entity.EmailOutbox;
import com.smarthire.domain.tenant.entity.HiringDecision;
import com.smarthire.domain.tenant.entity.Notification;
import com.smarthire.domain.tenant.entity.User;
import com.smarthire.domain.tenant.repository.ApplicationRepository;
import com.smarthire.domain.tenant.repository.EmailOutboxRepository;
import com.smarthire.domain.tenant.repository.HiringDecisionRepository;
import com.smarthire.domain.tenant.repository.NotificationRepository;
import com.smarthire.domain.tenant.repository.UserRepository;
import com.smarthire.tenant.applicant.dto.ApplicantModels.ApplicationDetail;
import com.smarthire.tenant.applicant.service.ApplicantService;
import com.smarthire.tenant.applicant.service.ApplicationClosureService;
import com.smarthire.tenant.cv.service.CvAccess;
import com.smarthire.tenant.notification.service.NotificationPreferenceService;
import com.smarthire.tenant.workflow.dto.HiringDecisionModels.DecisionRequest;
import com.smarthire.tenant.workflow.dto.HiringDecisionModels.DecisionView;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** WF-03: formal hiring decisions by the job owner and the candidate's answer to an offer. */
@Service
public class HiringDecisionService {
    private static final String EMAIL_PURPOSE = ApplicationClosureService.EMAIL_PURPOSE;
    private static final Set<ApplicationStatus> HIRE_FROM = Set.of(ApplicationStatus.HUMAN_INTERVIEW, ApplicationStatus.OFFER);

    private final ApplicationRepository applications;
    private final HiringDecisionRepository decisions;
    private final UserRepository users;
    private final ApplicantService applicants;
    private final CvAccess access;
    private final NotificationRepository notifications;
    private final EmailOutboxRepository emails;
    private final NotificationPreferenceService preferences;

    public HiringDecisionService(ApplicationRepository applications, HiringDecisionRepository decisions,
            UserRepository users, ApplicantService applicants, CvAccess access, NotificationRepository notifications,
            EmailOutboxRepository emails, NotificationPreferenceService preferences) {
        this.applications = applications;
        this.decisions = decisions;
        this.users = users;
        this.applicants = applicants;
        this.access = access;
        this.notifications = notifications;
        this.emails = emails;
        this.preferences = preferences;
    }

    @Transactional
    public DecisionView decide(long applicationId, DecisionRequest request) {
        Application application = staffApplication(applicationId, true);
        access.requirePrimaryRecruiter(application.getJob());
        if (application.getArchivedAt() != null || application.getStatus() == ApplicationStatus.HIRED
                || ApplicationClosureService.closed(application.getStatus())) {
            throw new BusinessException("Application is closed", HttpStatus.CONFLICT, "APPLICATION_CLOSED");
        }
        String reason = request.reason() == null || request.reason().isBlank() ? null : request.reason().trim();
        HiringDecisionType type = request.decision();
        if (type != HiringDecisionType.HIRE && reason == null) {
            throw new BusinessException("A reason is required", HttpStatus.BAD_REQUEST, "DECISION_REASON_REQUIRED");
        }
        switch (type) {
            case HIRE -> {
                if (!HIRE_FROM.contains(application.getStatus())) {
                    throw new BusinessException("Candidate must reach the human interview round before an offer",
                            HttpStatus.CONFLICT, "DECISION_NOT_ALLOWED");
                }
                if (application.getStatus() != ApplicationStatus.OFFER) {
                    applicants.changeStatus(applicationId, ApplicationStatus.OFFER.name(),
                            reason == null ? "Hiring decision: offer extended" : reason);
                }
                notifyOffer(application);
            }
            case REJECT -> applicants.changeStatus(applicationId, ApplicationStatus.REJECTED.name(), reason);
            case HOLD -> { }
        }
        User actor = access.actor();
        HiringDecision saved = decisions.save(HiringDecision.builder()
                .application(application).decision(type).reason(reason).decidedBy(actor.getId()).build());
        return view(saved, Map.of(actor.getId(), actor));
    }

    @Transactional(readOnly = true)
    public List<DecisionView> list(long applicationId) {
        staffApplication(applicationId, false);
        List<HiringDecision> rows = decisions.findByApplication_IdOrderByIdDesc(applicationId);
        Map<Long, User> deciders = users.findAllById(rows.stream().map(HiringDecision::getDecidedBy).distinct().toList())
                .stream().collect(Collectors.toMap(User::getId, Function.identity()));
        return rows.stream().map(row -> view(row, deciders)).toList();
    }

    @Transactional
    public ApplicationDetail respondToOffer(long applicationId, boolean accept, String reason) {
        ApplicationDetail detail = applicants.respondToOffer(applicationId, accept, reason);
        Application application = applications.findById(applicationId).orElseThrow();
        notifyRecruiters(application, accept);
        return detail;
    }

    private Application staffApplication(long id, boolean lock) {
        if (!access.staff()) {
            throw new BusinessException("Recruiter access required", HttpStatus.FORBIDDEN, "APPLICATION_FORBIDDEN");
        }
        Application application = (lock ? applications.findByIdForUpdate(id) : applications.findById(id))
                .orElseThrow(() -> new BusinessException("Application not found", HttpStatus.NOT_FOUND,
                        "APPLICATION_NOT_FOUND"));
        access.requireJob(application.getJob());
        return application;
    }

    private void notifyOffer(Application application) {
        var candidate = application.getCandidate();
        String title = "Bạn nhận được offer: " + application.getJob().getTitle();
        String body = "Chúc mừng! Nhà tuyển dụng đã gửi offer cho vị trí " + application.getJob().getTitle()
                + ". Vui lòng vào trang Đơn ứng tuyển để chấp nhận hoặc từ chối.";
        if (!preferences.webOff(candidate, NotificationCategory.APPLICATION)) {
            notifications.save(Notification.builder().candidate(candidate).type("APPLICATION_OFFER").title(title).body(body)
                    .payloadJson(payload("/applications/" + application.getId(), application.getId())).build());
        }
        if (!preferences.emailOff(candidate, NotificationCategory.APPLICATION)) {
            emails.save(EmailOutbox.builder().purpose(EMAIL_PURPOSE).toEmail(candidate.getEmail()).subject(title).body(body).build());
        }
    }

    private void notifyRecruiters(Application application, boolean accepted) {
        Map<Long, User> recipients = new LinkedHashMap<>();
        if (application.getJob().getCreatedBy() != null) recipients.put(application.getJob().getCreatedBy().getId(), application.getJob().getCreatedBy());
        if (application.getAssignee() != null) recipients.put(application.getAssignee().getId(), application.getAssignee());
        String title = (accepted ? "Ứng viên đã chấp nhận offer: " : "Ứng viên đã từ chối offer: ") + application.getJob().getTitle();
        String body = application.getCandidate().getFullName() + (accepted
                ? " đã chấp nhận offer và được chuyển sang trạng thái Đã tuyển."
                : " đã từ chối offer." + (application.getWithdrawReason() == null ? "" : " Lý do: " + application.getWithdrawReason()));
        String path = "/recruiter/jobs/" + application.getJob().getId() + "/applicants";
        for (User user : recipients.values()) {
            if (!preferences.webOff(user, NotificationCategory.APPLICATION)) {
                notifications.save(Notification.builder().user(user).type(accepted ? "OFFER_ACCEPTED" : "OFFER_DECLINED")
                        .title(title).body(body).payloadJson(payload(path, application.getId())).build());
            }
            if (!preferences.emailOff(user, NotificationCategory.APPLICATION)) {
                emails.save(EmailOutbox.builder().purpose(EMAIL_PURPOSE).toEmail(user.getEmail()).subject(title).body(body).build());
            }
        }
    }

    private static String payload(String path, long applicationId) {
        return "{\"path\":\"" + path + "\",\"applicationId\":" + applicationId + "}";
    }

    private static DecisionView view(HiringDecision row, Map<Long, User> deciders) {
        User decider = deciders.get(row.getDecidedBy());
        return new DecisionView(row.getId(), row.getApplication().getId(), row.getDecision(), row.getReason(),
                row.getDecidedBy(), decider == null ? null : decider.getFullName(), row.getCreatedAt());
    }
}
