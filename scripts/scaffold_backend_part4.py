#!/usr/bin/env python3
"""Part 4: interview/practice/notify entities + repositories + module packages."""
from pathlib import Path

BASE = Path(r"E:\Project\SmartHire-AI\backend\src\main\java\com\smarthire")

def write(rel: str, content: str):
    path = BASE / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content.strip() + "\n", encoding="utf-8")
    print(rel)

write("domain/entity/Interview.java", """
package com.smarthire.domain.entity;

import com.smarthire.domain.enums.InterviewStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "interviews")
public class Interview extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "job_id", nullable = false)
    private Job job;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "candidate_id", nullable = false)
    private User candidate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cv_id")
    private Cv cv;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private InterviewStatus status = InterviewStatus.CREATED;

    public Job getJob() { return job; }
    public void setJob(Job job) { this.job = job; }
    public User getCandidate() { return candidate; }
    public void setCandidate(User candidate) { this.candidate = candidate; }
    public Cv getCv() { return cv; }
    public void setCv(Cv cv) { this.cv = cv; }
    public InterviewStatus getStatus() { return status; }
    public void setStatus(InterviewStatus status) { this.status = status; }
}
""")

write("domain/entity/InterviewQuestion.java", """
package com.smarthire.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "interview_questions")
public class InterviewQuestion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "interview_id", nullable = false)
    private Interview interview;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(name = "question_text", nullable = false, columnDefinition = "TEXT")
    private String questionText;

    @Column(length = 128)
    private String competency;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() { createdAt = Instant.now(); }

    public Long getId() { return id; }
    public Interview getInterview() { return interview; }
    public void setInterview(Interview interview) { this.interview = interview; }
    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(int sortOrder) { this.sortOrder = sortOrder; }
    public String getQuestionText() { return questionText; }
    public void setQuestionText(String questionText) { this.questionText = questionText; }
    public String getCompetency() { return competency; }
    public void setCompetency(String competency) { this.competency = competency; }
    public Instant getCreatedAt() { return createdAt; }
}
""")

write("domain/entity/InterviewAnswer.java", """
package com.smarthire.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "interview_answers")
public class InterviewAnswer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "question_id", nullable = false, unique = true)
    private InterviewQuestion question;

    @Column(name = "audio_url", length = 512)
    private String audioUrl;

    @Column(columnDefinition = "TEXT")
    private String transcript;

    @Column(nullable = false, length = 32)
    private String status = "RECORDED";

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() { createdAt = Instant.now(); }

    public Long getId() { return id; }
    public InterviewQuestion getQuestion() { return question; }
    public void setQuestion(InterviewQuestion question) { this.question = question; }
    public String getAudioUrl() { return audioUrl; }
    public void setAudioUrl(String audioUrl) { this.audioUrl = audioUrl; }
    public String getTranscript() { return transcript; }
    public void setTranscript(String transcript) { this.transcript = transcript; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public Instant getCreatedAt() { return createdAt; }
}
""")

write("domain/entity/InterviewAnswerAnalysis.java", """
package com.smarthire.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "interview_answer_analyses")
public class InterviewAnswerAnalysis {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "answer_id", nullable = false, unique = true)
    private InterviewAnswer answer;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "analysis_json", nullable = false, columnDefinition = "json")
    private String analysisJson;

    @Column(name = "model_version", length = 64)
    private String modelVersion;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() { createdAt = Instant.now(); }

    public Long getId() { return id; }
    public InterviewAnswer getAnswer() { return answer; }
    public void setAnswer(InterviewAnswer answer) { this.answer = answer; }
    public String getAnalysisJson() { return analysisJson; }
    public void setAnalysisJson(String analysisJson) { this.analysisJson = analysisJson; }
    public String getModelVersion() { return modelVersion; }
    public void setModelVersion(String modelVersion) { this.modelVersion = modelVersion; }
    public Instant getCreatedAt() { return createdAt; }
}
""")

write("domain/entity/InterviewScore.java", """
package com.smarthire.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "interview_scores")
public class InterviewScore {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "interview_id", nullable = false, unique = true)
    private Interview interview;

    @Column(name = "overall_score", nullable = false, precision = 5, scale = 2)
    private BigDecimal overallScore;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "breakdown_json", columnDefinition = "json")
    private String breakdownJson;

    @Column(columnDefinition = "TEXT")
    private String feedback;

    @Column(name = "model_version", length = 64)
    private String modelVersion;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() { createdAt = Instant.now(); }

    public Long getId() { return id; }
    public Interview getInterview() { return interview; }
    public void setInterview(Interview interview) { this.interview = interview; }
    public BigDecimal getOverallScore() { return overallScore; }
    public void setOverallScore(BigDecimal overallScore) { this.overallScore = overallScore; }
    public String getBreakdownJson() { return breakdownJson; }
    public void setBreakdownJson(String breakdownJson) { this.breakdownJson = breakdownJson; }
    public String getFeedback() { return feedback; }
    public void setFeedback(String feedback) { this.feedback = feedback; }
    public String getModelVersion() { return modelVersion; }
    public void setModelVersion(String modelVersion) { this.modelVersion = modelVersion; }
    public Instant getCreatedAt() { return createdAt; }
}
""")

write("domain/entity/InterviewFeedback.java", """
package com.smarthire.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "interview_feedbacks")
public class InterviewFeedback {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "interview_id", nullable = false, unique = true)
    private Interview interview;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "shared_with_candidate", nullable = false)
    private boolean sharedWithCandidate;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() { createdAt = Instant.now(); }

    public Long getId() { return id; }
    public Interview getInterview() { return interview; }
    public void setInterview(Interview interview) { this.interview = interview; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public boolean isSharedWithCandidate() { return sharedWithCandidate; }
    public void setSharedWithCandidate(boolean sharedWithCandidate) { this.sharedWithCandidate = sharedWithCandidate; }
    public Instant getCreatedAt() { return createdAt; }
}
""")

write("domain/entity/InterviewSchedule.java", """
package com.smarthire.domain.entity;

import com.smarthire.domain.enums.ScheduleStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "interview_schedules")
public class InterviewSchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "application_id", nullable = false)
    private Application application;

    @Column(name = "interview_id")
    private Long interviewId;

    @Column(name = "starts_at", nullable = false)
    private Instant startsAt;

    @Column(name = "ends_at", nullable = false)
    private Instant endsAt;

    @Column(nullable = false, length = 64)
    private String timezone = "UTC";

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private ScheduleStatus status = ScheduleStatus.PROPOSED;

    @Column(name = "location_or_url", length = 512)
    private String locationOrUrl;

    @Column(name = "created_by", nullable = false)
    private Long createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() { createdAt = Instant.now(); }

    public Long getId() { return id; }
    public Application getApplication() { return application; }
    public void setApplication(Application application) { this.application = application; }
    public Long getInterviewId() { return interviewId; }
    public void setInterviewId(Long interviewId) { this.interviewId = interviewId; }
    public Instant getStartsAt() { return startsAt; }
    public void setStartsAt(Instant startsAt) { this.startsAt = startsAt; }
    public Instant getEndsAt() { return endsAt; }
    public void setEndsAt(Instant endsAt) { this.endsAt = endsAt; }
    public String getTimezone() { return timezone; }
    public void setTimezone(String timezone) { this.timezone = timezone; }
    public ScheduleStatus getStatus() { return status; }
    public void setStatus(ScheduleStatus status) { this.status = status; }
    public String getLocationOrUrl() { return locationOrUrl; }
    public void setLocationOrUrl(String locationOrUrl) { this.locationOrUrl = locationOrUrl; }
    public Long getCreatedBy() { return createdBy; }
    public void setCreatedBy(Long createdBy) { this.createdBy = createdBy; }
    public Instant getCreatedAt() { return createdAt; }
}
""")

write("domain/entity/Notification.java", """
package com.smarthire.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Entity
@Table(name = "notifications")
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(nullable = false, length = 64)
    private String type;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String body;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "payload_json", columnDefinition = "json")
    private String payloadJson;

    @Column(name = "read_at")
    private Instant readAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() { createdAt = Instant.now(); }

    public Long getId() { return id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getBody() { return body; }
    public void setBody(String body) { this.body = body; }
    public String getPayloadJson() { return payloadJson; }
    public void setPayloadJson(String payloadJson) { this.payloadJson = payloadJson; }
    public Instant getReadAt() { return readAt; }
    public void setReadAt(Instant readAt) { this.readAt = readAt; }
    public Instant getCreatedAt() { return createdAt; }
}
""")

write("domain/entity/EmailOutbox.java", """
package com.smarthire.domain.entity;

import com.smarthire.domain.enums.NotificationStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "email_outbox")
public class EmailOutbox {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "to_email", nullable = false)
    private String toEmail;

    @Column(nullable = false)
    private String subject;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String body;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private NotificationStatus status = NotificationStatus.PENDING;

    @Column(nullable = false)
    private int attempts;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "sent_at")
    private Instant sentAt;

    @PrePersist
    void onCreate() { createdAt = Instant.now(); }

    public Long getId() { return id; }
    public String getToEmail() { return toEmail; }
    public void setToEmail(String toEmail) { this.toEmail = toEmail; }
    public String getSubject() { return subject; }
    public void setSubject(String subject) { this.subject = subject; }
    public String getBody() { return body; }
    public void setBody(String body) { this.body = body; }
    public NotificationStatus getStatus() { return status; }
    public void setStatus(NotificationStatus status) { this.status = status; }
    public int getAttempts() { return attempts; }
    public void setAttempts(int attempts) { this.attempts = attempts; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getSentAt() { return sentAt; }
    public void setSentAt(Instant sentAt) { this.sentAt = sentAt; }
}
""")

write("domain/entity/PracticeSession.java", """
package com.smarthire.domain.entity;

import com.smarthire.domain.enums.PracticeStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "practice_sessions")
public class PracticeSession {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "candidate_id", nullable = false)
    private User candidate;

    private String topic;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private PracticeStatus status = PracticeStatus.CREATED;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() { createdAt = Instant.now(); }

    public Long getId() { return id; }
    public User getCandidate() { return candidate; }
    public void setCandidate(User candidate) { this.candidate = candidate; }
    public String getTopic() { return topic; }
    public void setTopic(String topic) { this.topic = topic; }
    public PracticeStatus getStatus() { return status; }
    public void setStatus(PracticeStatus status) { this.status = status; }
    public Instant getCreatedAt() { return createdAt; }
}
""")

write("domain/entity/PracticeAnswer.java", """
package com.smarthire.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "practice_answers")
public class PracticeAnswer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false)
    private PracticeSession session;

    @Column(name = "question_text", nullable = false, columnDefinition = "TEXT")
    private String questionText;

    @Column(name = "answer_text", columnDefinition = "TEXT")
    private String answerText;

    @Column(name = "audio_url", length = 512)
    private String audioUrl;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() { createdAt = Instant.now(); }

    public Long getId() { return id; }
    public PracticeSession getSession() { return session; }
    public void setSession(PracticeSession session) { this.session = session; }
    public String getQuestionText() { return questionText; }
    public void setQuestionText(String questionText) { this.questionText = questionText; }
    public String getAnswerText() { return answerText; }
    public void setAnswerText(String answerText) { this.answerText = answerText; }
    public String getAudioUrl() { return audioUrl; }
    public void setAudioUrl(String audioUrl) { this.audioUrl = audioUrl; }
    public Instant getCreatedAt() { return createdAt; }
}
""")

write("domain/entity/PracticeFeedback.java", """
package com.smarthire.domain.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "practice_feedbacks")
public class PracticeFeedback {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "session_id", nullable = false, unique = true)
    private PracticeSession session;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(precision = 5, scale = 2)
    private BigDecimal score;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() { createdAt = Instant.now(); }

    public Long getId() { return id; }
    public PracticeSession getSession() { return session; }
    public void setSession(PracticeSession session) { this.session = session; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public BigDecimal getScore() { return score; }
    public void setScore(BigDecimal score) { this.score = score; }
    public Instant getCreatedAt() { return createdAt; }
}
""")

print("interview/practice/notify entities ok")

# ---------- Repositories ----------
repos = [
    ("User", "User"),
    ("OauthAccount", "OauthAccount"),
    ("UserProfile", "UserProfile"),
    ("Job", "Job"),
    ("Skill", "Skill"),
    ("JobSkill", "JobSkill"),
    ("RecruitmentStage", "RecruitmentStage"),
    ("Application", "Application"),
    ("ApplicationStatusHistory", "ApplicationStatusHistory"),
    ("HiringDecision", "HiringDecision"),
    ("Cv", "Cv"),
    ("CvDocument", "CvDocument"),
    ("CvExtraction", "CvExtraction"),
    ("CvAnalysis", "CvAnalysis"),
    ("CvSkill", "CvSkill"),
    ("MatchScore", "MatchScore"),
    ("OverallScore", "OverallScore"),
    ("CandidateRanking", "CandidateRanking"),
    ("Recommendation", "Recommendation"),
    ("Assessment", "Assessment"),
    ("Question", "Question"),
    ("QuestionOption", "QuestionOption"),
    ("CodingProblem", "CodingProblem"),
    ("TestCase", "TestCase"),
    ("Attempt", "Attempt"),
    ("AttemptAnswer", "AttemptAnswer"),
    ("CodingSubmission", "CodingSubmission"),
    ("AttemptScore", "AttemptScore"),
    ("ProctorEvent", "ProctorEvent"),
    ("ProctorReport", "ProctorReport"),
    ("Interview", "Interview"),
    ("InterviewQuestion", "InterviewQuestion"),
    ("InterviewAnswer", "InterviewAnswer"),
    ("InterviewAnswerAnalysis", "InterviewAnswerAnalysis"),
    ("InterviewScore", "InterviewScore"),
    ("InterviewFeedback", "InterviewFeedback"),
    ("InterviewSchedule", "InterviewSchedule"),
    ("Notification", "Notification"),
    ("EmailOutbox", "EmailOutbox"),
    ("PracticeSession", "PracticeSession"),
    ("PracticeAnswer", "PracticeAnswer"),
    ("PracticeFeedback", "PracticeFeedback"),
]

for entity, name in repos:
    write(f"domain/repository/{name}Repository.java", f"""
package com.smarthire.domain.repository;

import com.smarthire.domain.entity.{entity};
import org.springframework.data.jpa.repository.JpaRepository;

public interface {name}Repository extends JpaRepository<{entity}, Long> {{
}}
""")

# Extra useful query methods
write("domain/repository/UserRepository.java", """
package com.smarthire.domain.repository;

import com.smarthire.domain.entity.User;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmailIgnoreCase(String email);
    boolean existsByEmailIgnoreCase(String email);
}
""")

# ---------- Modules ----------
MODULES = [
    ("auth", "Auth", "/api/v1/auth", "Authentication"),
    ("job", "Job", "/api/v1/jobs", "Job Recruitment"),
    ("applicant", "Applicant", "/api/v1/applications", "Applicant Management"),
    ("cv", "Cv", "/api/v1/cvs", "CV Screening"),
    ("matching", "Matching", "/api/v1/rankings", "Matching & Ranking"),
    ("assessment", "Assessment", "/api/v1/assessments", "Technical Assessment"),
    ("interview", "Interview", "/api/v1/interviews", "AI Interview"),
    ("practice", "Practice", "/api/v1/practice", "Practice Interview"),
    ("workflow", "Workflow", "/api/v1/workflow", "Recruitment Workflow"),
    ("schedule", "Schedule", "/api/v1/schedules", "Interview Scheduling"),
    ("notification", "Notification", "/api/v1/notifications", "Notifications"),
    ("dashboard", "Dashboard", "/api/v1/dashboard", "Analytics Dashboard"),
]

for pkg, class_prefix, path, tag in MODULES:
    # controller
    write(f"module/{pkg}/controller/{class_prefix}Controller.java", f"""
package com.smarthire.module.{pkg}.controller;

import com.smarthire.common.api.ApiResponse;
import com.smarthire.module.{pkg}.service.{class_prefix}Service;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.Map;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("{path}")
@Tag(name = "{tag}")
public class {class_prefix}Controller {{

    private final {class_prefix}Service {pkg}Service;

    public {class_prefix}Controller({class_prefix}Service {pkg}Service) {{
        this.{pkg}Service = {pkg}Service;
    }}

    @GetMapping("/health")
    @Operation(summary = "{tag} module scaffold health")
    public ResponseEntity<ApiResponse<Map<String, String>>> health() {{
        return ResponseEntity.ok(ApiResponse.ok({pkg}Service.health()));
    }}
}}
""")
    write(f"module/{pkg}/service/{class_prefix}Service.java", f"""
package com.smarthire.module.{pkg}.service;

import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class {class_prefix}Service {{

    public Map<String, String> health() {{
        return Map.of("module", "{pkg}", "status", "scaffold");
    }}
}}
""")
    write(f"module/{pkg}/mapper/{class_prefix}Mapper.java", f"""
package com.smarthire.module.{pkg}.mapper;

import org.springframework.stereotype.Component;

/**
 * Map entities &lt;-&gt; DTOs for {pkg} module.
 * Prefer MapStruct when mapping grows.
 */
@Component
public class {class_prefix}Mapper {{
}}
""")
    # dto placeholders
    write(f"module/{pkg}/dto/request/.gitkeep", "")
    write(f"module/{pkg}/dto/response/.gitkeep", "")

# messaging + security placeholders
write("messaging/package-info.java", """
/**
 * RabbitMQ producers and consumers for async AI, grading, and email flows.
 */
package com.smarthire.messaging;
""")

write("security/package-info.java", """
/**
 * JWT filters, UserDetails, and RBAC helpers.
 */
package com.smarthire.security;
""")

# Replace AuthController - already exists with different content; overwrite with consistent structure
# Auth was at /api/v1/auth already - good

print("modules + repos scaffolded")
