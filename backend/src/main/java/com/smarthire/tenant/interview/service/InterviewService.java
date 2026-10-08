package com.smarthire.tenant.interview.service;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.*;
import com.smarthire.domain.tenant.entity.*;
import com.smarthire.domain.tenant.repository.*;
import com.smarthire.tenant.cv.service.CvAccess;
import com.smarthire.tenant.job.service.JobAccess;
import com.smarthire.tenant.interview.dto.HumanInterviewModels.*;
import com.smarthire.tenant.interview.mapper.HumanInterviewMapper;
import java.math.*;
import java.net.URI;
import java.time.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
@Service
@Transactional
public class InterviewService {
    private static final String PREFIX = "HUMAN_";
    private static final List<ScheduleStatus> ACTIVE = List.of(ScheduleStatus.PROPOSED, ScheduleStatus.CONFIRMED, ScheduleStatus.RESCHEDULE_REQUESTED);
    private final InterviewRepository interviews;
    private final InterviewScheduleRepository schedules;
    private final InterviewParticipantRepository participants;
    private final InterviewEvaluationRepository evaluations;
    private final ApplicationRepository applications;
    private final AiInterviewRepository aiInterviews;
    private final JobRepository jobs;
    private final UserRepository users;
    private final CandidateRepository candidates;
    private final CvAccess access;
    private final JobAccess jobAccess;
    private final HumanInterviewMapper mapper;
    private final ObjectMapper json;
    private final HumanInterviewNotificationService notifications;

    public InterviewService(
            InterviewRepository interviews,
            InterviewScheduleRepository schedules,
            InterviewParticipantRepository participants,
            InterviewEvaluationRepository evaluations,
            ApplicationRepository applications,
            AiInterviewRepository aiInterviews,
            JobRepository jobs,
            UserRepository users,
            CvAccess access,
            JobAccess jobAccess,
            HumanInterviewMapper mapper,
            ObjectMapper json,
            HumanInterviewNotificationService notifications) {
        this(interviews, schedules, participants, evaluations, applications, aiInterviews, jobs, users, null, access, jobAccess, mapper, json, notifications);
    }

    @Autowired
    public InterviewService(
            InterviewRepository interviews,
            InterviewScheduleRepository schedules,
            InterviewParticipantRepository participants,
            InterviewEvaluationRepository evaluations,
            ApplicationRepository applications,
            AiInterviewRepository aiInterviews,
            JobRepository jobs,
            UserRepository users,
            CandidateRepository candidates,
            CvAccess access,
            JobAccess jobAccess,
            HumanInterviewMapper mapper,
            ObjectMapper json,
            HumanInterviewNotificationService notifications) {
        this.interviews = interviews;
        this.schedules = schedules;
        this.participants = participants;
        this.evaluations = evaluations;
        this.applications = applications;
        this.aiInterviews = aiInterviews;
        this.jobs = jobs;
        this.users = users;
        this.candidates = candidates;
        this.access = access;
        this.jobAccess = jobAccess;
        this.mapper = mapper;
        this.json = json;
        this.notifications = notifications;
    }

    public Map<String,String> health() { return Map.of("module", "human-interview", "status", "ready"); }
    private void requireJob(long id, boolean write) {
        access.requireRecruiterWrite();
        var job = jobs.findById(id).orElseThrow(() -> missing("Job"));
        if (job.getDeletedAt() != null) throw missing("Job");
        if (write) jobAccess.requireEditJob(id); else jobAccess.requireViewJob(id);
    }
    private Interview load(long id, boolean write) {
        access.auth();
        var i = interviews.findLockedById(id).orElseThrow(() -> missing("Interview"));
        if (!i.getInterviewType().startsWith(PREFIX)) throw missing("Interview");
        if (access.candidate()) {
            if (!i.getApplication().getCandidate().getId().equals(access.candidateActor().getId())) throw missing("Interview");
        } else requireJob(i.getApplication().getJob().getId(), write);
        return i;
    }
    private InterviewSchedule schedule(Interview i) { return schedules.findFirstByInterview_IdOrderByIdDesc(i.getId()).orElseThrow(() -> missing("Schedule")); }
    private Configuration configuration(Interview i) {
        if (i.getConfigurationJson() == null) return new Configuration("GENERAL","OFFICE","STANDARD","",false,null,null,null);
        try { return json.readValue(i.getConfigurationJson(), Configuration.class); }
        catch (Exception ex) { throw new IllegalStateException("Invalid human interview configuration", ex); }
    }
    private void configure(Interview i, Configuration c) {
        try { i.setConfigurationJson(json.writeValueAsString(c)); }
        catch (Exception ex) { throw new IllegalStateException("Cannot save interview configuration", ex); }
    }
    private InterviewView view(Interview i) {
        return mapper.view(i, schedule(i), configuration(i), participants.findByInterviewIdOrderByUserId(i.getId()).stream().map(mapper::participant).toList(),
            access.candidate() ? List.of() : evaluations.findByInterview_IdOrderById(i.getId()).stream().map(mapper::evaluation).toList());
    }
    public InterviewView get(long id) {
        var i = load(id,false);
        if (access.candidate() && schedule(i).getStatus() == ScheduleStatus.DRAFT) throw missing("Interview");
        return view(i);
    }
    private List<InterviewView> all(long jobId) {
        requireJob(jobId,false);
        return interviews.findByApplication_Job_IdAndInterviewTypeStartingWithOrderByIdDesc(jobId,PREFIX).stream().map(this::view).toList();
    }
    public PageResult list(long jobId, String q, String round, String mode, String status, Instant from, Instant to, int page, int size) {
        if (page < 0 || size < 1 || size > 100) throw invalid("Invalid pagination");
        String search = q == null ? "" : q.trim().toLowerCase(Locale.ROOT);
        var rows = all(jobId).stream().filter(r ->
            (round == null || round.isBlank() || round.equals(r.round())) && (mode == null || mode.isBlank() || mode.equals(r.mode())) &&
            (status == null || status.isBlank() || status.equals(r.status())) && (from == null || !r.start().isBefore(from)) && (to == null || r.start().isBefore(to)) &&
            (r.candidateName()+" "+r.candidateEmail()+" "+r.jobTitle()+" "+r.participants().stream().map(ParticipantView::name).toList()).toLowerCase(Locale.ROOT).contains(search))
            .sorted(Comparator.comparing(InterviewView::start).reversed()).toList();
        long offset = (long)page*size;
        return new PageResult(offset >= rows.size() ? List.of() : rows.subList((int)offset,(int)Math.min(offset+size,rows.size())), rows.size(),page,size);
    }
    public Summary summary(long jobId, String timezone) {
        ZoneId zone;
        try { zone=ZoneId.of(timezone); } catch (Exception ex) { throw invalid("Invalid timezone"); }
        var today=LocalDate.now(zone); var month=YearMonth.from(today);
        var rows=all(jobId).stream().filter(r -> !List.of("DRAFT","CANCELLED").contains(r.status())).toList();
        var todays=rows.stream().filter(r -> r.start().atZone(zone).toLocalDate().equals(today)).toList();
        return new Summary(rows.stream().filter(r -> YearMonth.from(r.start().atZone(zone)).equals(month)).count(),
            rows.stream().filter(r -> YearMonth.from(r.start().atZone(zone)).equals(month.minusMonths(1))).count(),todays.size(),
            todays.stream().filter(r -> r.mode().equals("ONLINE")).count(),todays.stream().filter(r -> r.mode().equals("OFFLINE")).count(),
            rows.stream().filter(r -> r.status().equals("PROPOSED")).count(),rows.stream().filter(r -> r.end().isBefore(Instant.now())).mapToLong(r ->
                r.participants().stream().filter(p -> !p.role().equals("NOTE_TAKER") && r.evaluations().stream().noneMatch(e -> e.evaluatorId()==p.userId())).count()).sum());
    }
    public Options options(long jobId) {
        requireJob(jobId,false);
        return new Options(applications.findByJob_IdOrderByIdDesc(jobId).stream().filter(a -> a.getArchivedAt()==null && a.getWithdrawnAt()==null &&
            !List.of(ApplicationStatus.REJECTED,ApplicationStatus.HIRED,ApplicationStatus.WITHDRAWN).contains(a.getStatus()) &&
            aiInterviews.existsByApplication_IdAndStatus(a.getId(),AiInterviewStatus.PASSED))
            .map(a -> new CandidateOption(a.getId(),a.getCandidate().getId(),a.getCandidate().getFullName(),a.getCandidate().getEmail(),a.getJob().getTitle())).toList(),
            users.findAll().stream().filter(u -> u.getStatus()==UserStatus.ACTIVE && !UserRole.isCandidate(u.getRole()))
                .map(u -> new ParticipantView(u.getId(),u.getFullName(),u.getEmail(),"CO_INTERVIEWER")).toList(),
            List.of(new Choice("TECHNICAL","Vòng 1: Kỹ thuật Chuyên sâu"),new Choice("CULTURE","Vòng 2: Culture & Leadership Fit"),new Choice("EXECUTIVE","Vòng 3: Phỏng vấn Ban Giám Đốc")),
            List.of(new Choice("TECHNICAL","Kỹ thuật, Giao tiếp & Văn hóa"),new Choice("CULTURE","Culture & Leadership"),new Choice("GENERAL","SmartHire General")),
            List.of(new Choice("STANDARD","Thư mời song ngữ Việt - Anh"),new Choice("EXPRESS","Lịch hẹn nhanh"),new Choice("EXECUTIVE","Phỏng vấn Ban Giám đốc")),false,false);
    }
    public InterviewView save(Long id, SaveRequest r) {
        requireJob(r.jobId(),true); window(r.start(),r.end(),true);
        if (r.smsReminder()) throw new BusinessException("SMS/Zalo provider is not configured",HttpStatus.NOT_IMPLEMENTED,"INTERVIEW_SMS_UNAVAILABLE");
        if (r.mode().equals("ONLINE")) {
            if (r.meetingUrl()==null || r.meetingUrl().isBlank()) throw invalid("Enter a meeting URL; automatic meeting creation is not configured");
            try { var uri=URI.create(r.meetingUrl()); if (!List.of("http","https").contains(uri.getScheme()) || uri.getHost()==null) throw invalid("Invalid meeting URL"); }
            catch (IllegalArgumentException ex) { throw invalid("Invalid meeting URL"); }
            if (r.provider().equals("OFFICE")) throw invalid("Choose an online meeting provider");
        } else if (r.location()==null || r.location().isBlank()) throw invalid("Enter the interview location");
        var a=applications.findByIdAndJob_Id(r.applicationId(),r.jobId()).orElseThrow(() -> missing("Application"));
        if (a.getArchivedAt()!=null || a.getWithdrawnAt()!=null || List.of(ApplicationStatus.REJECTED,ApplicationStatus.WITHDRAWN,ApplicationStatus.HIRED).contains(a.getStatus())) throw invalid("Application is not eligible for scheduling");
        if (!aiInterviews.existsByApplication_IdAndStatus(a.getId(),AiInterviewStatus.PASSED))
            throw new BusinessException("Ứng viên phải vượt qua vòng AI Interview trước khi lên lịch phỏng vấn trực tiếp",HttpStatus.CONFLICT,"AI_INTERVIEW_NOT_PASSED");
        Interview i=id==null ? new Interview() : load(id,true);
        if (id!=null && (!i.getApplication().getJob().getId().equals(r.jobId()) || !i.getApplication().getId().equals(r.applicationId()))) throw invalid("Cannot change an existing interview application");
        if (id!=null && (List.of(ScheduleStatus.DONE,ScheduleStatus.CANCELLED).contains(schedule(i).getStatus()) || !evaluations.findByInterview_IdOrderById(id).isEmpty())) throw invalid("Interview is closed or evaluated");
        var ids=r.participants().stream().map(ParticipantInput::userId).toList();
        if (new HashSet<>(ids).size()!=ids.size()) throw invalid("Duplicate or invalid interviewer");
        if (r.participants().stream().filter(p -> p.role().equals("LEAD")).count()!=1) throw invalid("Exactly one lead interviewer is required");
        if (candidates != null) {
            var lockedCandidate=candidates.findLockedById(a.getCandidate().getId()).orElseThrow(() -> missing("Candidate"));
            if (lockedCandidate.getStatus()!=UserStatus.ACTIVE) throw invalid("Candidate must be active");
        }
        var panel=new HashMap<Long,User>(); var lockIds=new TreeSet<>(ids);
        for (long userId:lockIds) {
            var u=users.findLockedById(userId).orElseThrow(() -> missing("User"));
            if (u.getStatus()!=UserStatus.ACTIVE || UserRole.isCandidate(u.getRole())) throw invalid("Interviewer must be active staff");
            panel.put(userId,u);
        }
        var conflictRows = schedules.conflicts(lockIds, List.of(a.getCandidate().getId()), r.start(), r.end(), id, ACTIVE);
        if (!r.draft() && !conflictRows.isEmpty()) throw new BusinessException("Candidate or interviewer already has a meeting",HttpStatus.CONFLICT,"INTERVIEW_CONFLICT");
        i.setApplication(a); i.setInterviewType(PREFIX+r.round()); i.setMode(r.mode()); i.setStatus(r.draft()?InterviewStatus.CREATED:InterviewStatus.SCHEDULED);
        configure(i,new Configuration(r.rubric(),r.provider(),r.emailTemplate(),r.notes(),r.attachCalendar(),null,null,null)); interviews.saveAndFlush(i);
        var s=id==null ? new InterviewSchedule() : schedule(i); s.setInterview(i); s.setScheduledStart(r.start()); s.setScheduledEnd(r.end());
        s.setMeetingUrl(r.mode().equals("ONLINE")?r.meetingUrl().trim():null); s.setLocation(r.mode().equals("OFFLINE")?r.location().trim():null);
        s.setStatus(r.draft()?ScheduleStatus.DRAFT:ScheduleStatus.PROPOSED); schedules.save(s);
        var existingPanel=id==null ? List.<InterviewParticipant>of() : participants.findByInterviewIdOrderByUserId(i.getId());
        participants.deleteAll(existingPanel.stream().filter(p -> !ids.contains(p.getUserId())).toList());
        for (var p:r.participants()) {
            var member=existingPanel.stream().filter(old -> old.getUserId().equals(p.userId())).findFirst().orElseGet(() ->
                InterviewParticipant.builder().interviewId(i.getId()).interview(i).userId(p.userId()).user(panel.get(p.userId())).build());
            member.setParticipantRole(p.role()); participants.save(member);
        }
        participants.flush();
        if (!r.draft()) notifications.invite(view(i),a.getCandidate());
        return view(i);
    }
    public Availability availability(AvailabilityRequest r) {
        requireJob(r.jobId(),false); window(r.start(),r.end(),true);
        if (r.excludeId()!=null && load(r.excludeId(),false).getApplication().getJob().getId()!=r.jobId()) throw forbidden();
        var allowed=new HashSet<Long>(); var opts=options(r.jobId()); opts.interviewers().forEach(p -> allowed.add(p.userId())); opts.candidates().forEach(p -> allowed.add(p.candidateId()));
        if (!allowed.containsAll(r.userIds())) throw forbidden();
        var conflicts=schedules.conflicts(r.userIds(),r.start(),r.end(),r.excludeId(),ACTIVE).stream().map(s -> {
            var ids=new HashSet<Long>(); ids.add(s.getInterview().getApplication().getCandidate().getId());
            participants.findByInterviewIdOrderByUserId(s.getInterview().getId()).forEach(p -> ids.add(p.getUserId()));
            return new ConflictView(s.getInterview().getApplication().getJob().getId().equals(r.jobId()) ? s.getInterview().getId() : 0L,s.getScheduledStart(),s.getScheduledEnd(),r.userIds().stream().filter(ids::contains).toList());
        }).toList(); return new Availability(conflicts.isEmpty(),conflicts);
    }
    public List<InterviewView> mine() {
        if (!access.candidate()) throw forbidden();
        return interviews.findByApplication_Candidate_IdAndInterviewTypeStartingWithOrderByIdDesc(access.candidateActor().getId(),PREFIX).stream().filter(i -> schedule(i).getStatus()!=ScheduleStatus.DRAFT).map(this::view).toList();
    }
    public InterviewView confirm(long id) {
        if (!access.candidate()) throw forbidden(); var i=load(id,false); var s=schedule(i);
        if (!List.of(ScheduleStatus.PROPOSED,ScheduleStatus.CONFIRMED).contains(s.getStatus()) || !s.getScheduledStart().isAfter(Instant.now())) throw invalid("Schedule cannot be confirmed");
        s.setStatus(ScheduleStatus.CONFIRMED); return view(i);
    }
    public InterviewView requestReschedule(long id, RescheduleRequest r) {
        if (!access.candidate()) throw forbidden(); var i=load(id,false); var s=schedule(i); window(r.start(),r.end(),true);
        if (!ACTIVE.contains(s.getStatus()) || !s.getScheduledStart().isAfter(Instant.now())) throw invalid("Schedule cannot be changed");
        var c=configuration(i); configure(i,new Configuration(c.rubric(),c.provider(),c.emailTemplate(),c.notes(),c.attachCalendar(),r.reason(),r.start(),r.end()));
        s.setStatus(ScheduleStatus.RESCHEDULE_REQUESTED); notifications.requestChange(view(i)); return view(i);
    }
    public InterviewView cancel(long id) {
        var i=load(id,true); var s=schedule(i);
        if (s.getStatus()==ScheduleStatus.CANCELLED) return view(i);
        if (s.getStatus()==ScheduleStatus.DONE || i.getStatus()==InterviewStatus.EVALUATED) throw invalid("Completed interview cannot be cancelled");
        if (access.candidate() && s.getStatus()==ScheduleStatus.DRAFT) throw missing("Interview");
        s.setStatus(ScheduleStatus.CANCELLED); i.setStatus(InterviewStatus.CANCELLED); notifications.cancel(view(i),i.getApplication().getCandidate()); return view(i);
    }
    public InterviewView complete(long id) {
        var i=load(id,true); if (access.candidate()) throw forbidden(); var s=schedule(i);
        if (!ACTIVE.contains(s.getStatus()) || s.getScheduledEnd().isAfter(Instant.now())) throw invalid("Interview has not ended or is closed");
        s.setStatus(ScheduleStatus.DONE); i.setStatus(InterviewStatus.EVALUATED); return view(i);
    }
    public InterviewView evaluate(long id, EvaluationRequest r) {
        var i=load(id,false); if (access.candidate()) throw forbidden(); var s=schedule(i);
        if (List.of(ScheduleStatus.DRAFT,ScheduleStatus.CANCELLED).contains(s.getStatus()) || s.getScheduledEnd().isAfter(Instant.now())) throw invalid("Scorecard is available after the interview");
        var actor=access.actor();
        if (participants.findByInterviewIdOrderByUserId(id).stream().noneMatch(p -> p.getUserId().equals(actor.getId()) && !p.getParticipantRole().equals("NOTE_TAKER"))) throw forbidden();
        var e=evaluations.findFirstByInterview_IdAndEvaluator_Id(id,actor.getId()).orElseGet(InterviewEvaluation::new);
        e.setInterview(i); e.setEvaluator(actor); e.setTechnicalScore(r.technicalScore()); e.setCommunicationScore(r.communicationScore()); e.setCultureScore(r.cultureScore());
        e.setOverallScore(r.technicalScore().add(r.communicationScore()).add(r.cultureScore()).divide(BigDecimal.valueOf(3),2,RoundingMode.HALF_UP));
        e.setComments(r.comments()); e.setRecommendation(r.recommendation()); evaluations.saveAndFlush(e);
        s.setStatus(ScheduleStatus.DONE); i.setStatus(InterviewStatus.EVALUATED); return view(i);
    }
    public BulkResult bulk(BulkRequest r) {
        if (access.candidate()) throw forbidden(); var ids=new TreeSet<>(r.ids());
        for (long id:ids) load(id,true);
        if (r.action().equals("RESCHEDULE")) {
            for (long id:ids) {
                var slot=schedule(load(id,true));
                if (!ACTIVE.contains(slot.getStatus())) throw invalid("Only active interviews can be shifted");
                slot.setStatus(ScheduleStatus.DRAFT);
            }
            schedules.flush();
        }
        for (long id:ids) {
            if (r.action().equals("CANCEL")) cancel(id);
            else if (r.action().equals("REMIND")) remind(id);
            else {
                if (r.shiftMinutes()==null || r.shiftMinutes()==0) throw invalid("A nonzero time shift is required");
                var v=view(load(id,true)); var c=v.configuration();
                save(id,new SaveRequest(v.jobId(),v.applicationId(),v.round(),v.mode(),v.start().plusSeconds(r.shiftMinutes()*60L),v.end().plusSeconds(r.shiftMinutes()*60L),
                    v.meetingUrl(),v.location(),c.provider(),c.rubric(),c.emailTemplate(),c.notes(),c.attachCalendar(),false,false,
                    v.participants().stream().map(p -> new ParticipantInput(p.userId(),p.role())).toList()));
            }
        } return new BulkResult(ids.size());
    }
    public void remind(long id) {
        var i=load(id,true); if (access.candidate()) throw forbidden();
        if (!ACTIVE.contains(schedule(i).getStatus()) && schedule(i).getStatus()!=ScheduleStatus.DONE) throw invalid("Schedule is not published");
        notifications.remind(view(i),i.getApplication().getCandidate());
    }
    public EmailPreview emailPreview(long id) { return notifications.preview(get(id)); }
    public String calendar(long jobId) { return HumanInterviewCalendar.export(all(jobId)); }
    public String calendarById(long id) { return HumanInterviewCalendar.export(List.of(get(id))); }
    private static void window(Instant start, Instant end, boolean future) {
        if (start==null || end==null || !end.isAfter(start) || Duration.between(start,end).compareTo(Duration.ofMinutes(15))<0 || Duration.between(start,end).compareTo(Duration.ofMinutes(240))>0 || future && !start.isAfter(Instant.now())) throw invalid("Choose a future interview lasting 15-240 minutes");
    }
    private static BusinessException missing(String item) { return new BusinessException(item+" not found",HttpStatus.NOT_FOUND,"INTERVIEW_NOT_FOUND"); }
    private static BusinessException invalid(String message) { return new BusinessException(message,HttpStatus.BAD_REQUEST,"INTERVIEW_INVALID"); }
    private static BusinessException forbidden() { return new BusinessException("Interview access denied",HttpStatus.FORBIDDEN,"INTERVIEW_FORBIDDEN"); }
}
