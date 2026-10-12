package com.smarthire.tenant.interview.service;
import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.domain.enums.NotificationCategory;
import com.smarthire.domain.tenant.entity.*;
import com.smarthire.domain.tenant.repository.*;
import com.smarthire.multitenancy.service.TenantPublicUrlService;
import com.smarthire.tenant.interview.dto.HumanInterviewModels.*;
import com.smarthire.tenant.notification.service.NotificationPreferenceService;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
@Service
public class HumanInterviewNotificationService {
    public static final String PURPOSE="HUMAN_INTERVIEW";
    @JsonIgnoreProperties(ignoreUnknown = true)
    public record EmailContent(String text, String calendar, String replyToEmail, String replyToName) {
        public EmailContent(String text, String calendar) {
            this(text, calendar, null, null);
        }
    }
    private final EmailOutboxRepository outbox;
    private final NotificationRepository notifications;
    private final UserRepository users;
    private final ObjectMapper json;
    private final NotificationPreferenceService preferences;
    private final ObjectProvider<TenantPublicUrlService> publicUrls;

    public HumanInterviewNotificationService(
            EmailOutboxRepository outbox,
            NotificationRepository notifications,
            UserRepository users,
            ObjectMapper json,
            NotificationPreferenceService preferences) {
        this(outbox, notifications, users, json, preferences, null);
    }

    @Autowired
    public HumanInterviewNotificationService(
            EmailOutboxRepository outbox,
            NotificationRepository notifications,
            UserRepository users,
            ObjectMapper json,
            NotificationPreferenceService preferences,
            ObjectProvider<TenantPublicUrlService> publicUrls) {
        this.outbox = outbox;
        this.notifications = notifications;
        this.users = users;
        this.json = json;
        this.preferences = preferences;
        this.publicUrls = publicUrls;
    }

    public EmailPreview preview(InterviewView r) {
        String brand = brandName();
        String time=DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy").withZone(ZoneId.of("Asia/Bangkok")).format(r.start());
        String heading=switch(r.configuration().emailTemplate()) { case "EXECUTIVE" -> "Executive interview invitation"; case "EXPRESS" -> "Interview appointment"; default -> "Interview invitation"; };
        boolean cancelled=r.status().equals("CANCELLED");
        if (cancelled) heading="Interview cancelled";
        return new EmailPreview(brand+" - "+heading+" - "+r.jobTitle(),"Xin chào / Hello "+r.candidateName()+",\n\n"+
            (cancelled ? "Lịch phỏng vấn đã hủy / Your interview has been cancelled.\n" : "Bạn được mời phỏng vấn trực tiếp / You are invited to a human interview.\n")+r.jobTitle()+"\n"+time+" (GMT+07)\n"+
            (r.mode().equals("ONLINE")?r.meetingUrl():r.location())+"\n\n"+Objects.toString(r.configuration().notes(),"")+(cancelled ? "\n\n"+brand : "\n\nVui lòng xác nhận trong mục Lịch phỏng vấn / Please RSVP in your interview schedule.\n"+brand));
    }
    public void invite(InterviewView r,Candidate candidate) { enqueue(r,candidate,"HUMAN_INTERVIEW_INVITATION","Lời mời phỏng vấn trực tiếp"); }
    public void remind(InterviewView r,Candidate candidate) { enqueue(r,candidate,"HUMAN_INTERVIEW_REMINDER","Nhắc lịch phỏng vấn trực tiếp"); }
    public void cancel(InterviewView r,Candidate candidate) { enqueue(r,candidate,"HUMAN_INTERVIEW_CANCELLED","Lịch phỏng vấn đã hủy"); }
    public void requestChange(InterviewView r) {
        for(var p:r.participants()) if(!preferences.webOff(users.getReferenceById(p.userId()),NotificationCategory.HUMAN_INTERVIEW)) notifications.save(Notification.builder().user(users.getReferenceById(p.userId())).type("HUMAN_INTERVIEW_RESCHEDULE").title("Ứng viên yêu cầu đổi lịch").body(r.configuration().rescheduleReason()).payloadJson("{\"interviewId\":"+r.id()+"}").build());
    }
    private void enqueue(InterviewView r,Candidate candidate,String type,String title) {
        var recipients=new LinkedHashMap<Long,User>();
        for(var p:r.participants()) recipients.put(p.userId(),users.getReferenceById(p.userId()));
        User replyUser = resolveReplyToUser(r, recipients);
        String replyToEmail = replyUser != null ? replyUser.getEmail() : null;
        String replyToName = replyUser != null ? replyUser.getFullName() : null;
        var preview=preview(r);
        String body;
        try {
            body=json.writeValueAsString(new EmailContent(
                    title+"\n\n"+preview.body(),
                    r.configuration().attachCalendar()?HumanInterviewCalendar.export(List.of(r)):null,
                    replyToEmail,
                    replyToName));
        } catch(Exception ex) { throw new IllegalStateException("Cannot queue interview email",ex); }
        if (candidate != null) {
            String candidatePath="/schedules";
            if(!preferences.webOff(candidate,NotificationCategory.HUMAN_INTERVIEW)) {
                notifications.save(Notification.builder().candidate(candidate).type(type).title(title).body(r.jobTitle()).payloadJson("{\"interviewId\":"+r.id()+",\"path\":\""+candidatePath+"\"}").build());
            }
            if(!preferences.emailOff(candidate,NotificationCategory.HUMAN_INTERVIEW)) {
                outbox.save(EmailOutbox.builder().toEmail(candidate.getEmail()).subject(title+" - "+r.jobTitle()).body(body).purpose(PURPOSE).build());
            }
        }
        for(var user:recipients.values()) {
            String path="/recruiter/jobs/"+r.jobId()+"/interviews";
            if(!preferences.webOff(user,NotificationCategory.HUMAN_INTERVIEW)) notifications.save(Notification.builder().user(user).type(type).title(title).body(r.jobTitle()).payloadJson("{\"interviewId\":"+r.id()+",\"path\":\""+path+"\"}").build());
            if(preferences.emailOff(user,NotificationCategory.HUMAN_INTERVIEW)) continue;
            outbox.save(EmailOutbox.builder().toEmail(user.getEmail()).subject(title+" - "+r.jobTitle()).body(body).purpose(PURPOSE).build());
        }
    }

    private String brandName() {
        if (publicUrls == null) {
            return "SmartHire";
        }
        try {
            return TenantPublicUrlService.brandOrDefault(publicUrls.getIfAvailable());
        } catch (Exception ignored) {
            return "SmartHire";
        }
    }

    private static User resolveReplyToUser(InterviewView r, Map<Long, User> recipients) {
        try {
            if (r.participants() != null) {
                for (var p : r.participants()) {
                    if ("LEAD".equalsIgnoreCase(p.role())) {
                        User lead = recipients.get(p.userId());
                        if (lead != null && StringUtils.hasText(lead.getEmail())) {
                            return lead;
                        }
                    }
                }
            }
            for (User u : recipients.values()) {
                if (u != null && StringUtils.hasText(u.getEmail())) {
                    return u;
                }
            }
        } catch (Exception ignored) {
            // Ignore proxy errors
        }
        return null;
    }
}
