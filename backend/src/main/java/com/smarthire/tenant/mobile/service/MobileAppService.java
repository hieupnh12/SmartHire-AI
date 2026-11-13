package com.smarthire.tenant.mobile.service;

import com.smarthire.domain.tenant.entity.Candidate;
import com.smarthire.tenant.applicant.dto.ApplicantModels.ApplicationSummary;
import com.smarthire.tenant.applicant.service.ApplicantService;
import com.smarthire.tenant.cv.service.CvAccess;
import com.smarthire.tenant.interview.dto.HumanInterviewModels.InterviewView;
import com.smarthire.tenant.interview.service.InterviewService;
import com.smarthire.tenant.mobile.dto.DeviceTokenRequest;
import com.smarthire.tenant.mobile.dto.MobileConfigResponse;
import com.smarthire.tenant.mobile.dto.MobileDashboardResponse;
import com.smarthire.tenant.mobile.dto.MobileDashboardResponse.NextInterviewItem;
import com.smarthire.tenant.mobile.dto.MobileDashboardResponse.RecentApplicationItem;
import com.smarthire.tenant.notification.dto.NotificationView;
import com.smarthire.tenant.notification.service.NotificationService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

@Service
public class MobileAppService {

    private static final Logger log = LoggerFactory.getLogger(MobileAppService.class);

    private final CvAccess access;
    private final ApplicantService applicantService;
    private final InterviewService interviewService;
    private final NotificationService notificationService;

    public MobileAppService(CvAccess access,
                            ApplicantService applicantService,
                            InterviewService interviewService,
                            NotificationService notificationService) {
        this.access = access;
        this.applicantService = applicantService;
        this.interviewService = interviewService;
        this.notificationService = notificationService;
    }

    public MobileConfigResponse getConfig() {
        return new MobileConfigResponse(
                "1.0.0",
                "1.0.1",
                false,
                "https://smarthire.top/download/app",
                false,
                Map.of(
                        "aiInterview", true,
                        "technicalAssessments", true,
                        "jobs", true,
                        "qrCheckin", true
                ),
                Instant.now()
        );
    }

    public MobileDashboardResponse getDashboard() {
        Candidate candidate = access.candidateActor();

        List<ApplicationSummary> applications = applicantService.mine();
        long totalApps = applications.size();
        long activeApps = applications.stream()
                .filter(app -> !"WITHDRAWN".equalsIgnoreCase(app.status())
                        && !"REJECTED".equalsIgnoreCase(app.status())
                        && !"HIRED".equalsIgnoreCase(app.status())
                        && !"CLOSED".equalsIgnoreCase(app.status()))
                .count();

        RecentApplicationItem recentApp = applications.isEmpty() ? null :
                new RecentApplicationItem(
                        applications.get(0).id(),
                        applications.get(0).jobId(),
                        applications.get(0).jobTitle(),
                        applications.get(0).status(),
                        applications.get(0).createdAt()
                );

        List<InterviewView> interviews = interviewService.mine();
        Instant now = Instant.now();
        List<InterviewView> upcoming = interviews.stream()
                .filter(i -> i.start() != null && i.start().isAfter(now))
                .filter(i -> !"CANCELLED".equalsIgnoreCase(i.status()) && !"DONE".equalsIgnoreCase(i.status()))
                .sorted(Comparator.comparing(InterviewView::start))
                .toList();

        long upcomingCount = upcoming.size();
        NextInterviewItem nextInterview = upcoming.isEmpty() ? null :
                new NextInterviewItem(
                        upcoming.get(0).id(),
                        upcoming.get(0).jobTitle() + " - " + upcoming.get(0).round(),
                        upcoming.get(0).mode(),
                        upcoming.get(0).status(),
                        upcoming.get(0).start(),
                        upcoming.get(0).end(),
                        upcoming.get(0).meetingUrl()
                );

        List<NotificationView> notifications = notificationService.mine(0, null);
        long unreadNotifs = notifications.stream()
                .filter(n -> n.readAt() == null)
                .count();

        return new MobileDashboardResponse(
                candidate.getFullName() != null ? candidate.getFullName() : candidate.getEmail(),
                candidate.getEmail(),
                totalApps,
                activeApps,
                upcomingCount,
                0L,
                unreadNotifs,
                nextInterview,
                recentApp
        );
    }

    public Map<String, Object> registerDeviceToken(DeviceTokenRequest request) {
        Candidate candidate = access.candidateActor();
        log.info("Registered mobile FCM device token for candidate {}: platform={}, model={}, version={}",
                candidate.getEmail(), request.platform(), request.deviceModel(), request.appVersion());

        return Map.of(
                "registered", true,
                "candidateEmail", candidate.getEmail(),
                "registeredAt", Instant.now().toString()
        );
    }
}
