package com.smarthire.tenant.assessment.dto.response;

import com.smarthire.domain.enums.ApplicationStatus;

public record SendAssessmentResponse(long testId, long applicationId, ApplicationStatus applicationStatus, boolean emailSent) {}
