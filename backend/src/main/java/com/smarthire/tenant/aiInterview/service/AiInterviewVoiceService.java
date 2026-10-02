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
    private final com.smarthire.common.storage.FileStorageService storage;
    private final AiInterviewService sessions;
    private final AiInterviewRepository interviews; private final AiAnswerRepository answers;
    private final AiInterviewConsentRepository consents; private final AiAnswerRecordingRepository recordings; private final CvAccess access;
    public AiInterviewVoiceService(AiInterviewRepository interviews, AiAnswerRepository answers, AiInterviewConsentRepository consents,
            AiAnswerRecordingRepository recordings, CvAccess access, com.smarthire.common.storage.FileStorageService storage, AiInterviewService sessions) {
        this.storage = storage; this.sessions = sessions;
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
    public com.smarthire.tenant.aiInterview.dto.response.AiAnswerResponse submitAudio(long id, long questionId,
            org.springframework.web.multipart.MultipartFile file,
            com.smarthire.tenant.aiInterview.dto.request.UpsertAiAnswerRequest request) {
        var interview = candidateInterview(id); requireVoice(interview);
        InterviewPolicies.requireCommunicationOnly(interview);
        if (!InterviewPolicies.config(interview).policy().voice().recordAudio())
            throw new BusinessException("Recording is disabled", HttpStatus.CONFLICT, "AI_VOICE_DISABLED");
        if (!consents.findByAiInterview_Id(id).map(c -> c.isAccepted()).orElse(false))
            throw new BusinessException("Voice consent is required", HttpStatus.CONFLICT, "AI_VOICE_CONSENT_REQUIRED");
        if (interview.getStatus() != com.smarthire.domain.enums.AiInterviewStatus.IN_PROGRESS || interview.getCompletedAt() != null)
            throw new BusinessException("Interview is not in progress", HttpStatus.CONFLICT, "AI_INTERVIEW_BAD_STATUS");
        if (file.isEmpty() || file.getSize() > 9 * 1024 * 1024 || request.answerText() == null || request.answerText().isBlank())
            throw new BusinessException("Audio must be at most 9 MB and include a transcript", HttpStatus.BAD_REQUEST, "AI_VOICE_BAD_FILE");
        String mime = file.getContentType() == null ? "" : file.getContentType().split(";")[0];
        String extension = switch (mime) { case "audio/webm" -> "webm"; case "audio/ogg" -> "ogg"; case "audio/mp4" -> "mp4"; default -> null; };
        if (extension == null) throw new BusinessException("Unsupported audio format", HttpStatus.BAD_REQUEST, "AI_VOICE_BAD_FILE");
        String key = null;
        try {
            byte[] content = file.getBytes();
            boolean validHeader = content.length >= 12 && switch (extension) {
                case "webm" -> content[0] == 0x1a && content[1] == 0x45 && (content[2] & 0xff) == 0xdf && (content[3] & 0xff) == 0xa3;
                case "ogg" -> content[0] == 'O' && content[1] == 'g' && content[2] == 'g' && content[3] == 'S';
                default -> content[4] == 'f' && content[5] == 't' && content[6] == 'y' && content[7] == 'p';
            };
            if (!validHeader) throw new BusinessException("Invalid audio content", HttpStatus.BAD_REQUEST, "AI_VOICE_BAD_FILE");
            key = storage.storeInterviewAudio(com.smarthire.multitenancy.context.TenantContext.getCurrentTenant(), content, extension);
            final String uploadedKey = key;
            if (org.springframework.transaction.support.TransactionSynchronizationManager.isSynchronizationActive())
                org.springframework.transaction.support.TransactionSynchronizationManager.registerSynchronization(new org.springframework.transaction.support.TransactionSynchronization() {
                    @Override public void afterCompletion(int status) { if (status != STATUS_COMMITTED) cleanup(uploadedKey); }
                });
            var result = sessions.upsertAnswer(id, questionId, request);
            var answer = answers.findById(result.id()).orElseThrow();
            var recording = AiAnswerRecording.builder().aiAnswer(answer).storageKey(key).mimeType(mime).sizeBytes(file.getSize())
                    .durationSeconds(request.speechMetrics() == null ? request.answerDuration() : (int) (request.speechMetrics().durationMs() / 1000))
                    .transcriptRaw(request.answerText()).sttProvider("browser-speech-recognition")
                    .status(AiAnswerRecordingStatus.TRANSCRIBED).build();
            recordings.saveAndFlush(recording);
            return result;
        } catch (java.io.IOException ex) {
            cleanup(key);
            throw new BusinessException("Cannot store the recording. Your answer has not been submitted; retry.", HttpStatus.SERVICE_UNAVAILABLE, "AI_VOICE_STORAGE");
        } catch (RuntimeException ex) { cleanup(key); throw ex; }
    }
    public void saveRecording(long id, long answerId, AiVoiceRecordingRequest request) {
        candidateInterview(id);
        throw new BusinessException("Upload audio with its transcript using the audio-answer endpoint", HttpStatus.BAD_REQUEST, "AI_VOICE_UPLOAD_REQUIRED");
    }
    public record RecordingInfo(Long answerId, Integer durationSeconds, String transcript, String mimeType) {}
    @Transactional(readOnly = true)
    public RecordingInfo recordingInfo(long id, long answerId) {
        staffInterview(id); var row = recordings.findByAiAnswer_Id(answerId).filter(r -> r.getAiAnswer().getAiQuestion().getAiInterview().getId().equals(id));
        return row.map(r -> new RecordingInfo(answerId, r.getDurationSeconds(), r.getTranscriptRaw(), r.getMimeType())).orElse(null);
    }
    public record AudioFile(byte[] content, String mimeType) {}
    @Transactional(readOnly = true)
    public AudioFile audio(long id, long answerId) {
        staffInterview(id);
        var row = recordings.findByAiAnswer_Id(answerId).filter(r -> r.getAiAnswer().getAiQuestion().getAiInterview().getId().equals(id))
                .orElseThrow(() -> new BusinessException("Recording not found", HttpStatus.NOT_FOUND, "AI_VOICE_NOT_FOUND"));
        try { return new AudioFile(storage.readInterviewAudio(row.getStorageKey()), row.getMimeType()); }
        catch (java.io.IOException ex) { throw new BusinessException("Cannot load recording", HttpStatus.SERVICE_UNAVAILABLE, "AI_VOICE_STORAGE"); }
    }
    private void staffInterview(long id) {
        if (!access.staff()) throw new BusinessException("Recruiter access required", HttpStatus.FORBIDDEN, "AI_INTERVIEW_FORBIDDEN");
        access.actor();
        var interview = interviews.findById(id).orElseThrow(() -> new BusinessException("Interview not found", HttpStatus.NOT_FOUND, "AI_INTERVIEW_NOT_FOUND"));
        access.requireJob(interview.getApplication().getJob());
        if (interview.getCompletedAt() == null) throw new BusinessException("Recordings are available after completion", HttpStatus.CONFLICT, "AI_VOICE_NOT_COMPLETE");
    }
    private void cleanup(String key) {
        if (key == null) return;
        try { storage.deleteInterviewAudio(key); } catch (java.io.IOException ignored) { /* Preserve the original error. */ }
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
