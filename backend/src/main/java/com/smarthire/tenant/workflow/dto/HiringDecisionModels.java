package com.smarthire.tenant.workflow.dto;

import com.smarthire.domain.enums.HiringDecisionType;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.Instant;

public final class HiringDecisionModels {
    private HiringDecisionModels() {}

    public record DecisionRequest(@NotNull HiringDecisionType decision, @Size(max = 2000) String reason) {}

    public record DecisionView(long id, long applicationId, HiringDecisionType decision, String reason,
                               Long decidedBy, String decidedByName, Instant createdAt) {}

    public record OfferResponseRequest(@NotNull Boolean accept, @Size(max = 255) String reason) {}
}
