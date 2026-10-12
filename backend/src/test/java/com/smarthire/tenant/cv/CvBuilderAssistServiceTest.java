package com.smarthire.tenant.cv;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.common.exception.BusinessException;
import com.smarthire.common.redis.RedisService;
import com.smarthire.domain.enums.JobStatus;
import com.smarthire.domain.tenant.entity.Candidate;
import com.smarthire.domain.tenant.entity.Job;
import com.smarthire.domain.tenant.entity.JobSkill;
import com.smarthire.domain.tenant.entity.Skill;
import com.smarthire.domain.tenant.repository.JobRepository;
import com.smarthire.domain.tenant.repository.JobSkillRepository;
import com.smarthire.tenant.cv.ai.GeminiCvAiClient;
import com.smarthire.tenant.cv.dto.CvModels.BuilderItem;
import com.smarthire.tenant.cv.dto.CvModels.BuilderPersonalInfo;
import com.smarthire.tenant.cv.dto.CvModels.BuilderSection;
import com.smarthire.tenant.cv.dto.CvModels.BuilderSkillHit;
import com.smarthire.tenant.cv.dto.CvModels.CvBuilderData;
import com.smarthire.tenant.cv.dto.CvModels.CvWritingRequest;
import com.smarthire.tenant.cv.service.CvAccess;
import com.smarthire.tenant.cv.service.CvBuilderAssistService;
import com.smarthire.tenant.matching.service.SkillScoringService;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CvBuilderAssistServiceTest {
    @Mock GeminiCvAiClient ai;
    @Mock CvAccess access;
    @Mock RedisService redis;
    @Mock JobRepository jobs;
    @Mock JobSkillRepository jobSkills;

    CvBuilderAssistService service;

    @BeforeEach
    void setUp() {
        service = new CvBuilderAssistService(ai, access, redis, jobs, jobSkills, new SkillScoringService(), new ObjectMapper());
    }

    @Test
    void jobMatchCountsListedSkillsAndTextMentions() {
        candidate();
        Job job = job(JobStatus.PUBLISHED);
        when(jobs.findById(5L)).thenReturn(Optional.of(job));
        when(jobSkills.findByJob_IdOrderByIdAsc(5L)).thenReturn(List.of(
                requirement("React", true, "2"),
                requirement("Spring Boot", true, "1"),
                requirement("Kubernetes", false, "1")));
        CvBuilderData data = data(List.of(
                new BuilderSection("s1", "skills", "Kỹ năng", true, List.of(item("ReactJS", ""))),
                new BuilderSection("s2", "experience", "Kinh nghiệm", true,
                        List.of(item("Backend Developer", "<ul><li>Xây dựng API bằng <b>Spring Boot</b></li></ul>"))),
                new BuilderSection("s3", "projects", "Dự án", false, List.of(item("Kubernetes", "")))));

        var result = service.jobMatch(5L, data);

        assertThat(result.score()).isEqualTo(75);
        assertThat(result.matched()).extracting(BuilderSkillHit::name).containsExactly("React", "Spring Boot");
        assertThat(result.missing()).containsExactly(new BuilderSkillHit("Kubernetes", false));
    }

    @Test
    void jobMatchRejectsUnpublishedJob() {
        candidate();
        when(jobs.findById(5L)).thenReturn(Optional.of(job(JobStatus.DRAFT)));

        assertThatThrownBy(() -> service.jobMatch(5L, data(List.of())))
                .isInstanceOf(BusinessException.class)
                .extracting("code").isEqualTo("JOB_NOT_FOUND");
    }

    @Test
    void suggestFailsWhenAiNotConfigured() {
        candidate();
        when(ai.configured()).thenReturn(false);

        assertThatThrownBy(() -> service.suggest(request()))
                .isInstanceOf(BusinessException.class)
                .extracting("code").isEqualTo("CV_AI_UNAVAILABLE");
    }

    @Test
    void suggestReturnsAtMostThreeSuggestions() throws Exception {
        candidate();
        when(ai.configured()).thenReturn(true);
        when(redis.increment(anyString(), any())).thenReturn(1L);
        when(ai.completeJson(anyString(), anyString()))
                .thenReturn("{\"suggestions\":[\"A\",\" \",\"B\",\"C\",\"D\"]}");

        assertThat(service.suggest(request()).suggestions()).containsExactly("A", "B", "C");
    }

    @Test
    void suggestIsRateLimited() {
        candidate();
        when(ai.configured()).thenReturn(true);
        when(redis.increment(anyString(), any())).thenReturn(31L);

        assertThatThrownBy(() -> service.suggest(request()))
                .isInstanceOf(BusinessException.class)
                .extracting("code").isEqualTo("CV_AI_RATE_LIMITED");
    }

    private void candidate() {
        Candidate actor = new Candidate();
        actor.setId(3L);
        when(access.candidate()).thenReturn(true);
        when(access.candidateActor()).thenReturn(actor);
    }

    private static Job job(JobStatus status) {
        Job job = new Job();
        job.setId(5L);
        job.setTitle("Fullstack Developer");
        job.setStatus(status);
        return job;
    }

    private static JobSkill requirement(String name, boolean required, String weight) {
        Skill skill = new Skill();
        skill.setName(name);
        JobSkill jobSkill = new JobSkill();
        jobSkill.setSkill(skill);
        jobSkill.setRequired(required);
        jobSkill.setWeight(new BigDecimal(weight));
        return jobSkill;
    }

    private static BuilderItem item(String title, String description) {
        return new BuilderItem("i-" + title, title, "", "", description, 0, null);
    }

    private static CvBuilderData data(List<BuilderSection> sections) {
        return new CvBuilderData("cascade", null, null, "vi",
                new BuilderPersonalInfo("Nguyễn Văn A", "", "", "", "", "", "", "", "", "", null, null, null), sections);
    }

    private static CvWritingRequest request() {
        return new CvWritingRequest("summary", "vi", "Backend Developer", "", "", "", "");
    }
}
