package com.smarthire.tenant.assessment.service;

import com.smarthire.common.exception.BusinessException;
import org.springframework.http.HttpStatus;

public class SubmissionExpiredException extends BusinessException {
    public SubmissionExpiredException() {
        super("Submission time has expired; saved answers were graded", HttpStatus.CONFLICT, "SUBMISSION_EXPIRED");
    }
}
