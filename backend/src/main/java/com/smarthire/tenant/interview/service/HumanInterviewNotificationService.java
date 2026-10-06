package com.smarthire.tenant.interview.service;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.domain.tenant.entity.*;
import com.smarthire.domain.tenant.repository.*;
import com.smarthire.tenant.interview.dto.HumanInterviewModels.*;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
@Service
@RequiredArgsConstructor
public class HumanInterviewNotificationService {
    public static final String PURPOSE="HUMAN_INTERVIEW";
    public record EmailContent(String text,String calendar) {}
    private final EmailOutboxRepository outbox;
    private final NotificationRepository notifications;
    private final UserRepository users;
    private final ObjectMapper json;
    public EmailPreview preview(InterviewView r) {
        String time=DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy").withZone(ZoneId.of("Asia/Bangkok")).format(r.start());
        String heading=switch(r.configuration().emailTemplate()) { case "EXECUTIVE" -> "Executive interview invitation"; case "EXPRESS" -> "Interview appointment"; default -> "Interview invitation"; };
        boolean cancelled=r.status().equals("CANCELLED");
        if (cancelled) heading="Interview cancelled";
        return new EmailPreview("SmartHire - "+heading+" - "+r.jobTitle(),"Xin chào / Hello "+r.candidateName()+",\n\n"+
            (cancelled ? "Lịch phỏng vấn đã hủy / Your interview has been cancelled.\n" : "Bạn được mời phỏng vấn trực tiếp / You are invited to a human interview.\n")+r.jobTitle()+"\n"+time+" (GMT+07)\n"+
            (r.mode().equals("ONLINE")?r.meetingUrl():r.location())+"\n\n"+Objects.toString(r.configuration().notes(),"")+(cancelled ? "\n\nSmartHire" : "\n\nVui lòng xác nhận trong mục Lịch phỏng vấn / Please RSVP in your interview schedule.\nSmartHire"));
    }
    public void invite(InterviewView r,User candidate) { enqueue(r,candidate,"HUMAN_INTERVIEW_INVITATION","Lời mời phỏng vấn trực tiếp"); }
    public void remind(InterviewView r,User candidate) { enqueue(r,candidate,"HUMAN_INTERVIEW_REMINDER","Nhắc lịch phỏng vấn trực tiếp"); }
    public void cancel(InterviewView r,User candidate) { enqueue(r,candidate,"HUMAN_INTERVIEW_CANCELLED","Lịch phỏng vấn đã hủy"); }
    public void requestChange(InterviewView r) {
        for(var p:r.participants()) notifications.save(Notification.builder().user(users.getReferenceById(p.userId())).type("HUMAN_INTERVIEW_RESCHEDULE").title("Ứng viên yêu cầu đổi lịch").body(r.configuration().rescheduleReason()).payloadJson("{\"interviewId\":"+r.id()+"}").build());
    }
    private void enqueue(InterviewView r,User candidate,String type,String title) {
        var recipients=new LinkedHashMap<Long,User>(); recipients.put(candidate.getId(),candidate);
        for(var p:r.participants()) recipients.put(p.userId(),users.getReferenceById(p.userId()));
        var preview=preview(r);
        for(var user:recipients.values()) {
            String path=user.getId().equals(candidate.getId())?"/schedules":"/recruiter/jobs/"+r.jobId()+"/interviews";
            notifications.save(Notification.builder().user(user).type(type).title(title).body(r.jobTitle()).payloadJson("{\"interviewId\":"+r.id()+",\"path\":\""+path+"\"}").build());
            try {
                String body=json.writeValueAsString(new EmailContent(title+"\n\n"+preview.body(),r.configuration().attachCalendar()?HumanInterviewCalendar.export(List.of(r)):null));
                outbox.save(EmailOutbox.builder().toEmail(user.getEmail()).subject(title+" - "+r.jobTitle()).body(body).purpose(PURPOSE).build());
            } catch(Exception ex) { throw new IllegalStateException("Cannot queue interview email",ex); }
        }
    }
}
