package com.smarthire.tenant.job.dto;

import jakarta.validation.constraints.Size;
import java.time.Instant;

public final class JobAlertModels {
    private JobAlertModels() {
    }

    public record JobAlertView(
            long id,
            String keyword,
            String department,
            String location,
            String workMode,
            String employmentType,
            boolean webEnabled,
            boolean emailEnabled,
            boolean active,
            Instant createdAt,
            Instant updatedAt) {
    }

    public record SaveJobAlertRequest(
            @Size(max = 255, message = "Từ khoá tối đa 255 ký tự")
            String keyword,
            @Size(max = 128, message = "Phòng ban tối đa 128 ký tự")
            String department,
            @Size(max = 255, message = "Địa điểm tối đa 255 ký tự")
            String location,
            @Size(max = 32, message = "Hình thức làm việc tối đa 32 ký tự")
            String workMode,
            @Size(max = 32, message = "Loại hình công việc tối đa 32 ký tự")
            String employmentType,
            Boolean webEnabled,
            Boolean emailEnabled,
            Boolean active) {
    }
}

