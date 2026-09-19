package com.smarthire.tenant.job.controller;

import com.smarthire.common.api.ApiResponse;
import com.smarthire.tenant.job.dto.JobModels.PublicJob;
import com.smarthire.tenant.job.service.JobService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/public/jobs")
@Tag(name = "Public Jobs")
public class PublicJobController {
    private final JobService jobs;

    public PublicJobController(JobService jobs) {
        this.jobs = jobs;
    }

    @GetMapping
    @Operation(summary = "List published jobs for the tenant career page")
    public ApiResponse<List<PublicJob>> list(@RequestParam(required = false) String q) {
        return ApiResponse.ok(jobs.publicList(q));
    }

    @GetMapping("/{id}")
    @Operation(summary = "Public job detail")
    public ApiResponse<PublicJob> get(@PathVariable long id) {
        return ApiResponse.ok(jobs.publicGet(id));
    }
}
