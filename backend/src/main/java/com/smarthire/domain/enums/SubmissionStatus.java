package com.smarthire.domain.enums;

public enum SubmissionStatus {
    QUEUED,
    RUNNING,
    PASSED,
    /** Some but not all hidden tests passed. */
    PARTIAL,
    FAILED,
    ERROR;
}
