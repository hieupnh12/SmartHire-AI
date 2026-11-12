package com.smarthire.tenant.job.controller;

import com.smarthire.common.api.ApiResponse;
import com.smarthire.tenant.job.dto.SavedJobModels.SavedJobView;
import com.smarthire.tenant.job.service.SavedJobService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import java.util.List;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/candidate/saved-jobs")
@Tag(name = "Saved Jobs")
public class SavedJobController {

    private final SavedJobService savedJobs;

    public SavedJobController(SavedJobService savedJobs) {
        this.savedJobs = savedJobs;
    }

    @GetMapping
    @Operation(summary = "List jobs saved by the signed-in candidate")
    public ApiResponse<List<SavedJobView>> list() {
        return ApiResponse.ok(savedJobs.list());
    }

    @GetMapping("/ids")
    @Operation(summary = "List saved job IDs for the signed-in candidate")
    public ApiResponse<List<Long>> ids() {
        return ApiResponse.ok(savedJobs.listIds());
    }

    @PostMapping("/{jobId}")
    @Operation(summary = "Save (bookmark) a published job")
    public ApiResponse<SavedJobView> save(@PathVariable long jobId) {
        return ApiResponse.ok("Đã lưu việc làm", savedJobs.save(jobId));
    }

    @DeleteMapping("/{jobId}")
    @Operation(summary = "Remove a job from saved list")
    public ApiResponse<Void> remove(@PathVariable long jobId) {
        savedJobs.remove(jobId);
        return ApiResponse.ok("Đã bỏ lưu việc làm", null);
    }
}

