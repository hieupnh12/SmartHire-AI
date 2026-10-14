package com.smarthire.tenant.company.controller;

import com.smarthire.common.api.ApiResponse;
import com.smarthire.tenant.company.dto.CompanyEmailSettingResponse;
import com.smarthire.tenant.company.dto.SaveCompanyEmailSettingRequest;
import com.smarthire.tenant.company.dto.TestEmailConnectionRequest;
import com.smarthire.tenant.company.service.CompanyEmailSettingService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/tenant/company/mail-settings")
@RequiredArgsConstructor
@Tag(name = "Tenant Company Mail Settings", description = "Company Gmail/SMTP settings for the current Enterprise Tenant")
public class CompanyMailSettingController {

    private final CompanyEmailSettingService emailSettingService;

    @GetMapping
    @Operation(summary = "Get Company Email Settings", description = "Returns active email settings (without password) for current tenant.")
    public ResponseEntity<ApiResponse<CompanyEmailSettingResponse>> getSettings() {
        return ResponseEntity.ok(ApiResponse.ok(emailSettingService.getSettings()));
    }

    @PutMapping
    @Operation(summary = "Save Company Email Settings", description = "Saves Gmail and App Password for current tenant.")
    public ResponseEntity<ApiResponse<CompanyEmailSettingResponse>> saveSettings(
            @Valid @RequestBody SaveCompanyEmailSettingRequest request) {
        CompanyEmailSettingResponse response = emailSettingService.saveSettings(request);
        return ResponseEntity.ok(ApiResponse.ok("Cấu hình Gmail công ty đã được cập nhật thành công", response));
    }

    @PostMapping("/test")
    @Operation(summary = "Test Email Connection", description = "Tests Gmail SMTP authentication and sends a verification email to test recipient.")
    public ResponseEntity<ApiResponse<String>> testConnection(
            @Valid @RequestBody TestEmailConnectionRequest request) {
        emailSettingService.testConnection(request);
        return ResponseEntity.ok(ApiResponse.ok("Đã gửi email thử nghiệm thành công! Vui lòng kiểm tra hộp thư đến."));
    }
}
