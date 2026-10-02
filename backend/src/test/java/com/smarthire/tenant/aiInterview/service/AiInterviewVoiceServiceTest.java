package com.smarthire.tenant.aiInterview.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.common.storage.FileStorageService;
import com.smarthire.domain.enums.AiInterviewStatus;
import com.smarthire.domain.tenant.entity.*;
import com.smarthire.domain.tenant.repository.*;
import com.smarthire.multitenancy.context.TenantContext;
import com.smarthire.tenant.aiInterview.dto.request.*;
import com.smarthire.tenant.aiInterview.dto.response.AiAnswerResponse;
import com.smarthire.tenant.cv.service.CvAccess;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.mock.web.MockMultipartFile;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class AiInterviewVoiceServiceTest {
    final AiInterviewRepository interviews = mock(AiInterviewRepository.class);
    final AiAnswerRepository answers = mock(AiAnswerRepository.class);
    final AiInterviewConsentRepository consents = mock(AiInterviewConsentRepository.class);
    final AiAnswerRecordingRepository recordings = mock(AiAnswerRecordingRepository.class);
    final CvAccess access = mock(CvAccess.class); final FileStorageService storage = mock(FileStorageService.class);
    final AiInterviewService sessions = mock(AiInterviewService.class);
    final AiInterviewVoiceService service = new AiInterviewVoiceService(interviews, answers, consents, recordings, access, storage, sessions);
    AiInterview interview; AiAnswer answer;
    final UpsertAiAnswerRequest request = new UpsertAiAnswerRequest("My solution", 5, null, new SpeechMetrics(5000, 4000, 1000, 1, 500L));
    final MockMultipartFile file = new MockMultipartFile("file", "audio.webm", "audio/webm", new byte[]{0x1a,0x45,(byte)0xdf,(byte)0xa3,0,0,0,0,0,0,0,0});
    @BeforeEach void setup() {
        TenantContext.setCurrentTenant("tenant_a");
        var user = new User(); user.setId(9L); var job = new Job(); var application = new Application(); application.setJob(job); application.setCandidate(user);
        interview = AiInterview.builder().id(1L).application(application).startedAt(java.time.Instant.now()).status(AiInterviewStatus.IN_PROGRESS).build();
        InterviewPolicies.snapshot(interview);
        answer = AiAnswer.builder().id(10L).aiQuestion(AiQuestion.builder().id(20L).aiInterview(interview).build()).build();
        when(interviews.findById(1L)).thenReturn(Optional.of(interview));
        when(access.candidate()).thenReturn(true); when(access.actor()).thenReturn(user);
    }
    @AfterEach void cleanup() { TenantContext.clear(); }
    @Test void uploadsPrivateAudioAndStoresTranscriptForTheOwnedAnswer() throws Exception {
        when(consents.findByAiInterview_Id(1L)).thenReturn(Optional.of(AiInterviewConsent.builder().accepted(true).build()));
        when(storage.storeInterviewAudio(eq("tenant_a"), any(), eq("webm"))).thenReturn("interview_tenant_a_test");
        when(sessions.upsertAnswer(1L,20L,request)).thenReturn(new AiAnswerResponse(10L,20L,"My solution",5,null,null));
        when(answers.findById(10L)).thenReturn(Optional.of(answer));
        service.submitAudio(1L,20L,file,request);
        verify(recordings).saveAndFlush(argThat(r -> r.getStorageKey().equals("interview_tenant_a_test") && r.getTranscriptRaw().equals("My solution")));
    }
    @Test void missingConsentDoesNotUploadOrGrade() {
        assertThatThrownBy(() -> service.submitAudio(1L,20L,file,request)).isInstanceOf(BusinessException.class);
        verifyNoInteractions(storage,sessions,recordings);
    }
    @Test void removesUploadedAudioIfAnswerSubmissionFails() throws Exception {
        when(consents.findByAiInterview_Id(1L)).thenReturn(Optional.of(AiInterviewConsent.builder().accepted(true).build()));
        when(storage.storeInterviewAudio(eq("tenant_a"), any(), eq("webm"))).thenReturn("interview_tenant_a_test");
        when(sessions.upsertAnswer(1L,20L,request)).thenThrow(new IllegalStateException("provider unavailable"));
        assertThatThrownBy(() -> service.submitAudio(1L,20L,file,request)).isInstanceOf(IllegalStateException.class);
        verify(storage).deleteInterviewAudio("interview_tenant_a_test"); verifyNoInteractions(recordings);
    }
    @Test void recruiterCannotReadARecordingFromAnotherInterview() {
        interview.setCompletedAt(java.time.Instant.now()); when(access.staff()).thenReturn(true);
        var other = AiInterview.builder().id(2L).build();
        when(recordings.findByAiAnswer_Id(10L)).thenReturn(Optional.of(AiAnswerRecording.builder().aiAnswer(AiAnswer.builder().aiQuestion(AiQuestion.builder().aiInterview(other).build()).build()).build()));
        assertThatThrownBy(() -> service.audio(1L,10L)).isInstanceOf(BusinessException.class);
        verify(access).requireJob(interview.getApplication().getJob()); verifyNoInteractions(storage);
    }
}
