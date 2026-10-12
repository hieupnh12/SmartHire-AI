package com.smarthire.tenant.interview;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.*;
import com.smarthire.domain.tenant.entity.*;
import com.smarthire.domain.tenant.repository.*;
import com.smarthire.tenant.cv.service.CvAccess;
import com.smarthire.tenant.job.service.JobAccess;
import com.smarthire.tenant.interview.dto.HumanInterviewModels.*;
import com.smarthire.tenant.interview.mapper.HumanInterviewMapper;
import com.smarthire.tenant.interview.service.*;
import com.smarthire.multitenancy.context.TenantContext;
import java.time.Instant;
import java.util.*;
import java.nio.charset.StandardCharsets;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.*;
import org.mockito.junit.jupiter.MockitoExtension;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.*;
@ExtendWith(MockitoExtension.class)
class HumanInterviewServiceTest {
    @Mock InterviewRepository interviews; @Mock InterviewScheduleRepository schedules;
    @Mock InterviewParticipantRepository participants; @Mock InterviewEvaluationRepository evaluations;
    @Mock ApplicationRepository applications; @Mock JobRepository jobs; @Mock UserRepository users;
    @Mock AiInterviewRepository aiInterviews;
    @Mock CvAccess access; @Mock JobAccess jobAccess; @Mock HumanInterviewNotificationService notifications;
    InterviewService service; Candidate candidate; Job job; Interview interview; InterviewSchedule slot;
    @BeforeEach void setup() {
        service=new InterviewService(interviews,schedules,participants,evaluations,applications,aiInterviews,jobs,users,access,jobAccess,new HumanInterviewMapper(),new ObjectMapper().findAndRegisterModules(),notifications);
        candidate=new Candidate();candidate.setId(2L);candidate.setFullName("Candidate");candidate.setEmail("candidate@example.test");
        job=new Job();job.setId(3L);job.setTitle("Engineer");
        var application=new Application();application.setId(4L);application.setCandidate(candidate);application.setJob(job);
        interview=new Interview();interview.setId(5L);application.setCandidate(candidate);interview.setApplication(application);interview.setInterviewType("HUMAN_TECHNICAL");interview.setMode("ONLINE");
        slot=new InterviewSchedule();slot.setInterview(interview);slot.setStatus(ScheduleStatus.PROPOSED);slot.setScheduledStart(Instant.now().plusSeconds(3600));slot.setScheduledEnd(Instant.now().plusSeconds(7200));
    }
    @Test void candidateConfirmsOwnSchedule() {
        when(access.candidate()).thenReturn(true);when(access.candidateActor()).thenReturn(candidate);
        when(interviews.findLockedById(5L)).thenReturn(Optional.of(interview));when(schedules.findFirstByInterview_IdOrderByIdDesc(5L)).thenReturn(Optional.of(slot));
        assertEquals("CONFIRMED",service.confirm(5).status());assertEquals(ScheduleStatus.CONFIRMED,slot.getStatus());
        verifyNoInteractions(evaluations);
    }
    @Test void otherCandidateCannotReadInterview() {
        var other=new Candidate();other.setId(99L);when(access.candidate()).thenReturn(true);when(access.candidateActor()).thenReturn(other);
        when(interviews.findLockedById(5L)).thenReturn(Optional.of(interview));
        assertEquals("INTERVIEW_NOT_FOUND",assertThrows(BusinessException.class,()->service.get(5)).getCode());verifyNoInteractions(schedules);
    }
    @Test void candidateCannotSeeDraft() {
        when(access.candidate()).thenReturn(true);when(access.candidateActor()).thenReturn(candidate);slot.setStatus(ScheduleStatus.DRAFT);
        when(interviews.findLockedById(5L)).thenReturn(Optional.of(interview));when(schedules.findFirstByInterview_IdOrderByIdDesc(5L)).thenReturn(Optional.of(slot));
        assertThrows(BusinessException.class,()->service.get(5));
    }
    @Test void rescheduleRequestPreservesBookedSlot() {
        when(access.candidate()).thenReturn(true);when(access.candidateActor()).thenReturn(candidate);
        when(interviews.findLockedById(5L)).thenReturn(Optional.of(interview));when(schedules.findFirstByInterview_IdOrderByIdDesc(5L)).thenReturn(Optional.of(slot));
        Instant booked=slot.getScheduledStart(), proposed=booked.plusSeconds(86400);
        var result=service.requestReschedule(5,new RescheduleRequest(proposed,proposed.plusSeconds(3600),"Unavailable"));
        assertEquals(booked,result.start());assertEquals(proposed,result.configuration().requestedStart());assertEquals("RESCHEDULE_REQUESTED",result.status());verify(notifications).requestChange(any());
    }
    @Test void saveRejectsOverlappingInterviewerBeforeWriting() {
        when(jobs.findById(3L)).thenReturn(Optional.of(job));
        var app=interview.getApplication();app.setStatus(ApplicationStatus.NEW);when(applications.findByIdAndJob_Id(4L,3L)).thenReturn(Optional.of(app));
        when(aiInterviews.existsByApplication_IdAndStatus(4L,AiInterviewStatus.PASSED)).thenReturn(true);
        candidate.setStatus(UserStatus.ACTIVE);var staff=new User();staff.setId(6L);staff.setRole("RECRUITER");staff.setStatus(UserStatus.ACTIVE);
        when(users.findLockedById(6L)).thenReturn(Optional.of(staff));
        when(schedules.conflicts(anyCollection(),anyCollection(),any(),any(),isNull(),anyList())).thenReturn(List.of(slot));
        var request=new SaveRequest(3,4,"TECHNICAL","ONLINE",slot.getScheduledStart(),slot.getScheduledEnd(),"https://meet.example.test/room",null,"GOOGLE_MEET","TECHNICAL","STANDARD","",true,false,false,List.of(new ParticipantInput(6L,"LEAD")));
        assertEquals("INTERVIEW_CONFLICT",assertThrows(BusinessException.class,()->service.save(null,request)).getCode());verify(interviews,never()).saveAndFlush(any());verifyNoInteractions(notifications);
    }
    @Test void jobEditAuthorizationIsRequiredForSave() {
        when(jobs.findById(3L)).thenReturn(Optional.of(job));doThrow(new BusinessException("Denied",org.springframework.http.HttpStatus.FORBIDDEN,"JOB_FORBIDDEN")).when(jobAccess).requireEditJob(3L);
        var request=new SaveRequest(3,4,"TECHNICAL","OFFLINE",slot.getScheduledStart(),slot.getScheduledEnd(),null,"Office","OFFICE","GENERAL","STANDARD","",false,false,true,List.of(new ParticipantInput(6L,"LEAD")));
        assertThrows(BusinessException.class,()->service.save(null,request));verifyNoInteractions(applications);
    }
    @Test void candidateOptionsOnlyIncludePassedAiInterviewForThisApplication() {
        when(jobs.findById(3L)).thenReturn(Optional.of(job));
        var passed=interview.getApplication();
        var notPassed=new Application();notPassed.setId(7L);notPassed.setJob(job);notPassed.setCandidate(candidate);
        var rejected=new Application();rejected.setId(8L);rejected.setStatus(ApplicationStatus.REJECTED);
        when(applications.findByJob_IdOrderByIdDesc(3L)).thenReturn(List.of(passed,notPassed,rejected));
        when(aiInterviews.existsByApplication_IdAndStatus(4L,AiInterviewStatus.PASSED)).thenReturn(true);
        var result=service.options(3);
        assertEquals(List.of(4L),result.candidates().stream().map(CandidateOption::applicationId).toList());
        verify(aiInterviews).existsByApplication_IdAndStatus(7L,AiInterviewStatus.PASSED);
        verify(aiInterviews,never()).existsByApplication_IdAndStatus(eq(8L),any());
    }
    @Test void rejectsSchedulingAndDraftForApplicationWithoutPassedAiInterview() {
        when(jobs.findById(3L)).thenReturn(Optional.of(job));
        when(applications.findByIdAndJob_Id(4L,3L)).thenReturn(Optional.of(interview.getApplication()));
        for (boolean draft:List.of(false,true)) {
            var request=new SaveRequest(3,4,"TECHNICAL","OFFLINE",slot.getScheduledStart(),slot.getScheduledEnd(),null,"Office","OFFICE","GENERAL","STANDARD","",false,false,draft,List.of(new ParticipantInput(6L,"LEAD")));
            assertEquals("AI_INTERVIEW_NOT_PASSED",assertThrows(BusinessException.class,()->service.save(null,request)).getCode());
        }
        verifyNoInteractions(interviews,participants,users,notifications);
    }
    @Test void createsPublishedScheduleAndQueuesInvitation() {
        when(jobs.findById(3L)).thenReturn(Optional.of(job));
        when(applications.findByIdAndJob_Id(4L,3L)).thenReturn(Optional.of(interview.getApplication()));
        when(aiInterviews.existsByApplication_IdAndStatus(4L,AiInterviewStatus.PASSED)).thenReturn(true);
        candidate.setStatus(UserStatus.ACTIVE);
        var staff=new User();staff.setId(6L);staff.setRole("RECRUITER");staff.setStatus(UserStatus.ACTIVE);
        when(users.findLockedById(6L)).thenReturn(Optional.of(staff));
        when(interviews.saveAndFlush(any())).thenAnswer(call->{ Interview i=call.getArgument(0);i.setId(5L);return i; });
        when(schedules.save(any())).thenAnswer(call->{ slot=call.getArgument(0);return slot; });
        when(schedules.findFirstByInterview_IdOrderByIdDesc(5L)).thenAnswer(call->Optional.of(slot));
        var request=new SaveRequest(3,4,"TECHNICAL","ONLINE",slot.getScheduledStart(),slot.getScheduledEnd(),"https://meet.example.test/room",null,"GOOGLE_MEET","TECHNICAL","STANDARD","Portfolio",true,false,false,List.of(new ParticipantInput(6L,"LEAD")));
        var result=service.save(null,request);
        assertEquals("PROPOSED",result.status());assertEquals("TECHNICAL",result.round());assertEquals("Portfolio",result.configuration().notes());
        verify(participants).save(argThat(p->p.getUserId().equals(6L) && p.getParticipantRole().equals("LEAD")));
        verify(notifications).invite(any(),eq(candidate));
    }
    @Test void calendarUsesTenantUidEscapesAndFoldsUtf8() {
        var config=new Configuration("GENERAL","OFFICE","STANDARD","Multiline\nnotes, semicolon; " + "Ứng viên ".repeat(30),true,null,null,null);
        var row=new InterviewView(5,4,3,"Engineer",2,"Candidate","mail@example.test","TECHNICAL","OFFLINE","CANCELLED",slot.getScheduledStart(),slot.getScheduledEnd(),null,"Office",config,List.of(),List.of());
        TenantContext.setCurrentTenant("tenant-test");
        try { String ics=HumanInterviewCalendar.export(List.of(row));assertTrue(ics.contains("UID:human-tenant-test-5@smarthire"));assertTrue(ics.contains("STATUS:CANCELLED"));assertTrue(ics.contains("Multiline\\nnotes\\, semicolon\\;"));for(String line:ics.split("\r\n"))assertTrue(line.getBytes(StandardCharsets.UTF_8).length<=75); }
        finally {TenantContext.clear();}
    }
}
