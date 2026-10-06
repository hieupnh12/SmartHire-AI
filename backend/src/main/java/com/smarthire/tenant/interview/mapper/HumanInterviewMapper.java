package com.smarthire.tenant.interview.mapper;
import com.smarthire.domain.tenant.entity.*;
import com.smarthire.tenant.interview.dto.HumanInterviewModels.*;
import java.util.List;
import org.springframework.stereotype.Component;
@Component
public class HumanInterviewMapper {
    public ParticipantView participant(InterviewParticipant p) {
        return new ParticipantView(p.getUserId(), p.getUser().getFullName(), p.getUser().getEmail(), p.getParticipantRole());
    }
    public EvaluationView evaluation(InterviewEvaluation e) {
        return new EvaluationView(e.getId(), e.getEvaluator().getId(), e.getEvaluator().getFullName(), e.getTechnicalScore(),
            e.getCommunicationScore(), e.getCultureScore(), e.getOverallScore(), e.getComments(), e.getRecommendation(), e.getCreatedAt());
    }
    public InterviewView view(Interview i, InterviewSchedule s, Configuration c, List<ParticipantView> panel, List<EvaluationView> scores) {
        var a = i.getApplication();
        return new InterviewView(i.getId(), a.getId(), a.getJob().getId(), a.getJob().getTitle(), a.getCandidate().getId(),
            a.getCandidate().getFullName(), a.getCandidate().getEmail(), i.getInterviewType().substring(6), i.getMode(),
            s.getStatus().name(), s.getScheduledStart(), s.getScheduledEnd(), s.getMeetingUrl(), s.getLocation(), c, panel, scores);
    }
}
