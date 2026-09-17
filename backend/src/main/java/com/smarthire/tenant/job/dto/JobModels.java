package com.smarthire.tenant.job.dto;

import com.smarthire.tenant.cv.dto.CvModels.JobSkillItem;
import com.smarthire.tenant.cv.dto.CvModels.JobSkillView;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public final class JobModels {
    private JobModels() {}

    public record JobUpsertRequest(
            @NotBlank String title,
            String description,
            String responsibilities,
            String benefits,
            String location,
            String employmentType,
            String workMode,
            String department,
            Integer headcount,
            LocalDate deadline,
            BigDecimal salaryMin,
            BigDecimal salaryMax,
            String salaryCurrency,
            Boolean salaryVisible,
            BigDecimal minYearsExperience,
            String educationLevel,
            @Valid List<JobSkillItem> skills,
            @Valid List<StageItem> stages) {}

    public record StageItem(
            @NotBlank String name,
            int sortOrder,
            boolean terminal) {}

    public record StageView(long id, String name, int sortOrder, boolean terminal) {}

    public record StagesRequest(@NotEmpty @Valid List<StageItem> stages) {}

    public record JobListItem(
            long id,
            String title,
            String status,
            String location,
            String employmentType,
            String workMode,
            String department,
            LocalDate deadline,
            int headcount,
            long applicationCount,
            Instant publishedAt,
            Instant updatedAt) {}

    public record JobPage(List<JobListItem> items, long total, int page, int size) {}

    public record JobDetail(
            long id,
            String title,
            String description,
            String responsibilities,
            String benefits,
            String location,
            String employmentType,
            String workMode,
            String department,
            Integer headcount,
            LocalDate deadline,
            BigDecimal salaryMin,
            BigDecimal salaryMax,
            String salaryCurrency,
            boolean salaryVisible,
            BigDecimal minYearsExperience,
            String educationLevel,
            String status,
            String ownerName,
            Instant publishedAt,
            Instant pausedAt,
            Instant closedAt,
            Instant createdAt,
            Instant updatedAt,
            long applicationCount,
            boolean acceptingApplications,
            List<JobSkillView> skills,
            List<StageView> stages) {}

    public record PublicJob(
            long id,
            String title,
            String description,
            String responsibilities,
            String benefits,
            String location,
            String employmentType,
            String workMode,
            String department,
            LocalDate deadline,
            String salary,
            BigDecimal minYearsExperience,
            String educationLevel,
            List<String> skills,
            boolean acceptingApplications) {}

    public record ApplicationView(
            long id,
            long jobId,
            long candidateId,
            String candidateName,
            Long stageId,
            String status,
            String source,
            Instant createdAt) {}
}
