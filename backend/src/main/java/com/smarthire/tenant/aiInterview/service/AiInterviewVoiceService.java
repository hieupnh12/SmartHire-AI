package com.smarthire.tenant.aiInterview.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.AiAnswerRecordingStatus;
import com.smarthire.domain.tenant.entity.AiAnswerRecording;
import com.smarthire.domain.tenant.repository.AiAnswerRecordingRepository;
import com.smarthire.domain.tenant.repository.AiAnswerRepository;
import com.smarthire.domain.tenant.repository.AiInterviewConsentRepository;
import com.smarthire.domain.tenant.repository.AiInterviewRepository;
import com.smarthire.tenant.aiInterview.dto.request.AiInterviewConsentRequest;
import com.smarthire.tenant.aiInterview.dto.request.AiVoiceRecordingRequest;
import com.smarthire.tenant.cv.service.CvAccess;
import java.time.Instant;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AiInterviewVoiceService {
    private final AiInterviewRepository interviews; private final AiAnswerRepository answers;
    private final AiInterviewConsentRepository consents; private final AiAnswerRecordingRepository recordings; private final CvAccess access;
    public AiInterviewVoiceService(AiInterviewRepository interviews, AiAnswerRepository answers, AiInterviewConsentRepository consents,
            AiAnswerRecordingRepository recordings, CvAccess access) {
        this.interviews = interviews; this.answers = answers; this.consents = consents; this.recordings = recordings; this.access = access;
    }
    @Transactional
    public void consent(long interviewId, AiInterviewConsentRequest request) {
        var interview = candidateInterview(interviewId);
        requireVoice(interview);
        var candidate = access.actor();
        var consent = consents.findByAiInterview_Id(interviewId).orElseGet(() -> com.smarthire.domain.tenant.entity.AiInterviewConsent.builder()
                .aiInterview(interview).candidate(candidate).build());
        consent.setAccepted(Boolean.TRUE.equals(request.accepted())); consent.setPolicyVersion(request.policyVersion().trim());
        consent.setUserAgent(request.userAgent()); consent.setConsentedAt(Instant.now()); consents.save(consent);
    }
    @Transactional
    public void saveRecording(long interviewId, long answerId, AiVoiceRecordingRequest request) {
        var interview = candidateInterview(interviewId); requireVoice(interview);
        var consent = consents.findByAiInterview_Id(interviewId).orElseThrow(() -> new BusinessException("Voice consent is required", HttpStatus.CONFLICT, "AI_VOICE_CONSENT_REQUIRED"));
        if (!consent.isAccepted()) throw new BusinessException("Voice consent is required", HttpStatus.CONFLICT, "AI_VOICE_CONSENT_REQUIRED");
        var answer = answers.findById(answerId).filter(a -> a.getAiQuestion().getAiInterview().getId().equals(interviewId))
                .orElseThrow(() -> new BusinessException("Answer not found", HttpStatus.NOT_FOUND, "AI_ANSWER_NOT_FOUND"));
        var recording = recordings.findByAiAnswer_Id(answerId).orElseGet(() -> AiAnswerRecording.builder().aiAnswer(answer).build());
        recording.setStorageKey(request.storageKey().trim()); recording.setMimeType(request.mimeType().trim()); recording.setSizeBytes(request.sizeBytes());
        recording.setDurationSeconds(request.durationSeconds()); recording.setTranscriptRaw(request.transcript()); recording.setTranscriptConfidence(request.transcriptConfidence());
        recording.setSttProvider(request.sttProvider()); recording.setStartedAt(request.startedAt()); recording.setEndedAt(request.endedAt());
        recording.setStatus(request.transcript() == null || request.transcript().isBlank() ? AiAnswerRecordingStatus.STORED : AiAnswerRecordingStatus.TRANSCRIBED);
        recordings.save(recording);
    }
    private com.smarthire.domain.tenant.entity.AiInterview candidateInterview(long id) {
        if (!access.candidate()) throw new BusinessException("Candidate access required", HttpStatus.FORBIDDEN, "AI_INTERVIEW_FORBIDDEN");
        var actor = access.actor();
        return interviews.findById(id).filter(i -> i.getApplication().getCandidate().getId().equals(actor.getId()))
                .orElseThrow(() -> new BusinessException("AI interview not found", HttpStatus.NOT_FOUND, "AI_INTERVIEW_NOT_FOUND"));
    }
    private void requireVoice(com.smarthire.domain.tenant.entity.AiInterview interview) {
        if (!InterviewPolicies.voiceEnabled(interview)) throw new BusinessException("Voice mode is not enabled", HttpStatus.CONFLICT, "AI_VOICE_DISABLED");
    }
}
