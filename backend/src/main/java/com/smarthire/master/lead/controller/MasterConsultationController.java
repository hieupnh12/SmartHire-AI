package com.smarthire.master.lead.controller;

import com.smarthire.common.api.ApiResponse;
import com.smarthire.master.lead.dto.ConsultationResponse;
import com.smarthire.master.lead.dto.CreateConsultationRequest;
import com.smarthire.master.lead.dto.UpdateConsultationStatusRequest;
import com.smarthire.master.lead.service.ConsultationRequestService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/master/consultations")
@RequiredArgsConstructor
@Tag(name = "Master Enterprise Consultation & Demo Requests", description = "Public demo/quote requests & Admin lead management")
public class MasterConsultationController {

    private final ConsultationRequestService consultationRequestService;

    @PostMapping
    @Operation(summary = "Submit Enterprise Demo or Quote Request", description = "Public endpoint for enterprise leads to register interest or book a demo.")
    public ResponseEntity<ApiResponse<ConsultationResponse>> createRequest(@Valid @RequestBody CreateConsultationRequest request) {
        ConsultationResponse response = consultationRequestService.createRequest(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok("Yêu cầu tư vấn/demo đã được ghi nhận thành công", response));
    }

    @GetMapping
    @PreAuthorize("hasRole('WORKSPACE_ADMIN')")
    @Operation(summary = "List all Consultation & Demo Requests", description = "Returns all enterprise requests filtered by status.")
    public ResponseEntity<ApiResponse<List<ConsultationResponse>>> getAllRequests(
            @RequestParam(required = false, defaultValue = "ALL") String status) {
        List<ConsultationResponse> list = consultationRequestService.getAllRequests(status);
        return ResponseEntity.ok(ApiResponse.ok("Danh sách yêu cầu tư vấn", list));
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('WORKSPACE_ADMIN')")
    @Operation(summary = "Get Consultation Request Details", description = "Returns detail for a single request.")
    public ResponseEntity<ApiResponse<ConsultationResponse>> getRequestById(@PathVariable Long id) {
        ConsultationResponse response = consultationRequestService.getRequestById(id);
        return ResponseEntity.ok(ApiResponse.ok("Chi tiết yêu cầu tư vấn", response));
    }

    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('WORKSPACE_ADMIN')")
    @Operation(summary = "Update Request Status", description = "Updates status to CONTACTED, PROVISIONED, or REJECTED.")
    public ResponseEntity<ApiResponse<ConsultationResponse>> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateConsultationStatusRequest request) {
        ConsultationResponse response = consultationRequestService.updateStatus(id, request);
        return ResponseEntity.ok(ApiResponse.ok("Cập nhật trạng thái thành công", response));
    }
}
