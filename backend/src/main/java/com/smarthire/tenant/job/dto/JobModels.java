package com.smarthire.tenant.job.dto;

import com.smarthire.tenant.cv.dto.CvModels.JobSkillItem;
import com.smarthire.tenant.cv.dto.CvModels.JobSkillView;
import com.smarthire.domain.enums.ScreeningMode;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import java.math.BigDecimal;
import java.time.Instant;
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
            ScreeningMode screeningMode,
            Integer headcount,
            String deadline,
            BigDecimal salaryMin,
            BigDecimal salaryMax,
            String salaryCurrency,
            Boolean salaryVisible,
            BigDecimal minYearsExperience,
            String educationLevel,
            @Valid List<JobSkillItem> skills,
            @Valid List<StageItem> stages,
            @Valid CvScreeningConfigView cvScreening,
            @Valid GateScreeningConfigView gateScreening) {}

    public record CvScreeningConfigView(
            BigDecimal skillWeight,
            BigDecimal preferredWeight,
            BigDecimal experienceWeight,
            BigDecimal educationWeight,
            BigDecimal jaccardWeight,
            BigDecimal semanticWeight,
            BigDecimal passThreshold) {}

    public record GateScreeningConfigView(
            BigDecimal cvWeight,
            BigDecimal aiInterviewWeight,
            BigDecimal assessmentWeight,
            BigDecimal passThreshold) {}

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
            ScreeningMode screeningMode,
            Instant deadline,
            int headcount,
            long applicationCount,
            FunnelSummary funnel,
            Instant publishedAt,
            Instant updatedAt) {}

    public record FunnelSummary(long screened, long shortlisted, long testing, long interviewing, long filled) {}

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
            ScreeningMode screeningMode,
            Integer headcount,
            Instant deadline,
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
            List<StageView> stages,
            CvScreeningConfigView cvScreening,
            GateScreeningConfigView gateScreening) {}

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
            Instant deadline,
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
