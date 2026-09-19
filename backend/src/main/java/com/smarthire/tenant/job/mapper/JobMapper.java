package com.smarthire.tenant.job.mapper;

import com.smarthire.domain.tenant.entity.Application;
import com.smarthire.domain.tenant.entity.Job;
import com.smarthire.domain.tenant.entity.JobSkill;
import com.smarthire.domain.tenant.entity.RecruitmentStage;
import com.smarthire.tenant.cv.dto.CvModels.JobOption;
import com.smarthire.tenant.cv.dto.CvModels.JobSkillView;
import com.smarthire.tenant.job.dto.JobModels.ApplicationView;
import com.smarthire.tenant.job.dto.JobModels.JobDetail;
import com.smarthire.tenant.job.dto.JobModels.JobListItem;
import com.smarthire.tenant.job.dto.JobModels.PublicJob;
import com.smarthire.tenant.job.dto.JobModels.StageView;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import org.springframework.stereotype.Component;

@Component
public class JobMapper {
    public JobOption option(Job job) {
        return new JobOption(job.getId(), job.getTitle(), job.getStatus().name());
    }

    public JobListItem listItem(Job job, long applications) {
        return new JobListItem(
                job.getId(),
                job.getTitle(),
                job.getStatus().name(),
                job.getLocation(),
                job.getEmploymentType(),
                job.getWorkMode(),
                job.getDepartment(),
                job.getDeadline(),
                job.getHeadcount() == null ? 0 : job.getHeadcount(),
                applications,
                job.getPublishedAt(),
                job.getUpdatedAt());
    }

    public JobDetail detail(Job job, List<JobSkillView> skills, List<StageView> stages, long applications) {
        return new JobDetail(
                job.getId(),
                job.getTitle(),
                job.getDescription(),
                job.getResponsibilities(),
                job.getBenefits(),
                job.getLocation(),
                job.getEmploymentType(),
                job.getWorkMode(),
                job.getDepartment(),
                job.getHeadcount(),
                job.getDeadline(),
                job.getSalaryMin(),
                job.getSalaryMax(),
                job.getSalaryCurrency(),
                job.isSalaryVisible(),
                job.getMinYearsExperience(),
                job.getEducationLevel(),
                job.getStatus().name(),
                ownerName(job),
                job.getPublishedAt(),
                job.getPausedAt(),
                job.getClosedAt(),
                job.getCreatedAt(),
                job.getUpdatedAt(),
                applications,
                accepting(job),
                skills,
                stages);
    }

    public PublicJob publicJob(Job job, List<JobSkill> skills) {
        String salary = job.isSalaryVisible() ? salaryText(job) : null;
        return new PublicJob(
                job.getId(),
                job.getTitle(),
                job.getDescription(),
                job.getResponsibilities(),
                job.getBenefits(),
                job.getLocation(),
                job.getEmploymentType(),
                job.getWorkMode(),
                job.getDepartment(),
                job.getDeadline(),
                salary,
                job.getMinYearsExperience(),
                job.getEducationLevel(),
                skills.stream().map(row -> row.getSkill().getName()).toList(),
                accepting(job));
    }

    public StageView stage(RecruitmentStage stage) {
        return new StageView(stage.getId(), stage.getName(), stage.getSortOrder(), stage.isTerminal());
    }

    public JobSkillView skill(JobSkill row) {
        if (row.getSkill() == null || row.getSkill().getId() == null) {
            return new JobSkillView(0L, "", null, row.isRequired(), row.getWeight(), row.getMinLevel());
        }
        return new JobSkillView(
                row.getSkill().getId(),
                row.getSkill().getName(),
                row.getSkill().getCategory(),
                row.isRequired(),
                row.getWeight(),
                row.getMinLevel());
    }

    public ApplicationView application(Application application) {
        return new ApplicationView(
                application.getId(),
                application.getJob().getId(),
                application.getCandidate().getId(),
                application.getCandidate().getFullName(),
                application.getStage() == null ? null : application.getStage().getId(),
                application.getStatus().name(),
                application.getSource(),
                application.getCreatedAt());
    }

    public boolean accepting(Job job) {
        return job.getDeletedAt() == null
                && job.getStatus() == com.smarthire.domain.enums.JobStatus.PUBLISHED
                && (job.getDeadline() == null || !job.getDeadline().isBefore(LocalDate.now()));
    }

    private static String ownerName(Job job) {
        try {
            return job.getCreatedBy() == null ? null : job.getCreatedBy().getFullName();
        } catch (RuntimeException ex) {
            return null;
        }
    }

    private static String salaryText(Job job) {
        if (job.getSalaryMin() == null && job.getSalaryMax() == null) return null;
        String currency = job.getSalaryCurrency() == null || job.getSalaryCurrency().isBlank() ? "VND" : job.getSalaryCurrency();
        return formatMoney(job.getSalaryMin()) + " - " + formatMoney(job.getSalaryMax()) + " " + currency;
    }

    private static String formatMoney(BigDecimal value) {
        return value == null ? "?" : value.stripTrailingZeros().toPlainString();
    }
}
