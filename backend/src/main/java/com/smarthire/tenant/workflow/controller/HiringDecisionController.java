package com.smarthire.tenant.workflow.controller;

import com.smarthire.common.api.ApiResponse;
import com.smarthire.tenant.applicant.dto.ApplicantModels.ApplicationDetail;
import com.smarthire.tenant.workflow.dto.HiringDecisionModels.DecisionRequest;
import com.smarthire.tenant.workflow.dto.HiringDecisionModels.DecisionView;
import com.smarthire.tenant.workflow.dto.HiringDecisionModels.OfferResponseRequest;
import com.smarthire.tenant.workflow.service.HiringDecisionService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/applications/{id}")
@Tag(name = "Hiring Decision")
public class HiringDecisionController {
    private final HiringDecisionService service;

    public HiringDecisionController(HiringDecisionService service) {
        this.service = service;
    }

    @PostMapping("/decisions")
    @Operation(summary = "Record a hiring decision",
            description = "Job owner or company admin only. HIRE (from HUMAN_INTERVIEW or OFFER) moves the application to OFFER"
                    + " and notifies the candidate; REJECT closes it as REJECTED; HOLD only records the decision. REJECT/HOLD"
                    + " require a reason. Closed, hired or archived applications return 409 APPLICATION_CLOSED.")
    public ApiResponse<DecisionView> decide(@PathVariable long id, @Valid @RequestBody DecisionRequest body) {
        return ApiResponse.ok(service.decide(id, body));
    }

    @GetMapping("/decisions")
    @Operation(summary = "Hiring decision history (newest first)")
    public ApiResponse<List<DecisionView>> list(@PathVariable long id) {
        return ApiResponse.ok(service.list(id));
    }

    @PostMapping("/offer-response")
    @Operation(summary = "Candidate accepts or declines an offer",
            description = "Owning candidate only, application must be OFFER (else 409 APPLICATION_NO_OFFER). accept=true moves to"
                    + " HIRED; accept=false closes it as WITHDRAWN with the optional reason. The job owner and assignee are notified.")
    public ApiResponse<ApplicationDetail> respond(@PathVariable long id, @Valid @RequestBody OfferResponseRequest body) {
        return ApiResponse.ok(service.respondToOffer(id, body.accept(), body.reason()));
    }
}
