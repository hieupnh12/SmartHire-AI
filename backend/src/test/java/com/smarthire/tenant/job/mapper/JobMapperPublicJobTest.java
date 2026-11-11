package com.smarthire.tenant.job.mapper;

import com.smarthire.domain.enums.JobStatus;
import com.smarthire.domain.tenant.entity.Job;
import com.smarthire.domain.tenant.entity.JobSkill;
import com.smarthire.domain.tenant.entity.Skill;
import com.smarthire.tenant.job.dto.JobModels.PublicJob;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class JobMapperPublicJobTest {

    private final JobMapper mapper = new JobMapper();

    @Test
    void publicJob_HidesSalaryFieldsWhenSalaryVisibleIsFalse() {
        Job job = baseJob();
        job.setSalaryVisible(false);
        job.setSalaryMin(new BigDecimal("25000000"));
        job.setSalaryMax(new BigDecimal("40000000"));
        job.setSalaryCurrency("VND");

        PublicJob dto = mapper.publicJob(job, List.of());

        assertThat(dto.salary()).isNull();
        assertThat(dto.salaryMin()).isNull();
        assertThat(dto.salaryMax()).isNull();
        assertThat(dto.salaryCurrency()).isNull();
        assertThat(dto.publishedAt()).isEqualTo(Instant.parse("2026-11-01T00:00:00Z"));
        assertThat(dto.updatedAt()).isEqualTo(Instant.parse("2026-11-05T00:00:00Z"));
    }

    @Test
    void publicJob_ExposesSalaryAndDatesWhenSalaryVisibleIsTrue() {
        Job job = baseJob();
        job.setSalaryVisible(true);
        job.setSalaryMin(new BigDecimal("25000000"));
        job.setSalaryMax(new BigDecimal("40000000"));
        job.setSalaryCurrency("VND");

        Skill skill = new Skill();
        skill.setName("Java");
        JobSkill jobSkill = new JobSkill();
        jobSkill.setSkill(skill);

        PublicJob dto = mapper.publicJob(job, List.of(jobSkill));

        assertThat(dto.salary()).isEqualTo("25000000 - 40000000 VND");
        assertThat(dto.salaryMin()).isEqualByComparingTo("25000000");
        assertThat(dto.salaryMax()).isEqualByComparingTo("40000000");
        assertThat(dto.salaryCurrency()).isEqualTo("VND");
        assertThat(dto.skills()).containsExactly("Java");
    }

    private static Job baseJob() {
        Job job = new Job();
        job.setId(10L);
        job.setTitle("Senior Backend Engineer");
        job.setDescription("Build scalable services");
        job.setStatus(JobStatus.PUBLISHED);
        job.setPublishedAt(Instant.parse("2026-11-01T00:00:00Z"));
        job.setUpdatedAt(Instant.parse("2026-11-05T00:00:00Z"));
        job.setDeadline(Instant.now().plusSeconds(86_400));
        return job;
    }
}

