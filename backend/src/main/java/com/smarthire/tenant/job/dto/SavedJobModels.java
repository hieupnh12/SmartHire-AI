package com.smarthire.tenant.job.dto;

import com.smarthire.tenant.job.dto.JobModels.PublicJob;
import java.time.Instant;

public final class SavedJobModels {
    private SavedJobModels() {
    }

    public record SavedJobView(
            long id,
            PublicJob job,
            Instant savedAt) {
    }
}

