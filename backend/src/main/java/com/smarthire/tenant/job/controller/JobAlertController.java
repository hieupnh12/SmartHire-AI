package com.smarthire.tenant.job.controller;

import com.smarthire.common.api.ApiResponse;
import com.smarthire.tenant.job.dto.JobAlertModels.JobAlertView;
import com.smarthire.tenant.job.dto.JobAlertModels.SaveJobAlertRequest;
import com.smarthire.tenant.job.service.JobAlertService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/candidate/job-alerts")
@Tag(name = "Job Alerts")
public class JobAlertController {

    private final JobAlertService alerts;

    public JobAlertController(JobAlertService alerts) {
        this.alerts = alerts;
    }

    @GetMapping
    @Operation(summary = "List new-job alert subscriptions for the signed-in candidate")
    public ApiResponse<List<JobAlertView>> list() {
        return ApiResponse.ok(alerts.list());
    }

    @PostMapping
    @Operation(summary = "Create a new-job alert subscription")
    public ApiResponse<JobAlertView> create(@Valid @RequestBody SaveJobAlertRequest request) {
        return ApiResponse.ok("Đã đăng ký nhận thông báo việc làm mới", alerts.create(request));
    }

    @PutMapping("/{id}")
    @Operation(summary = "Update a job alert subscription")
    public ApiResponse<JobAlertView> update(
            @PathVariable long id,
            @Valid @RequestBody SaveJobAlertRequest request) {
        return ApiResponse.ok("Đã cập nhật thông báo việc làm", alerts.update(id, request));
    }

    @DeleteMapping("/{id}")
    @Operation(summary = "Delete a job alert subscription")
    public ApiResponse<Void> delete(@PathVariable long id) {
        alerts.delete(id);
        return ApiResponse.ok("Đã huỷ đăng ký thông báo việc làm", null);
    }
}

