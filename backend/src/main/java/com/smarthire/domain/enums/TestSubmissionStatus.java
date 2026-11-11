package com.smarthire.domain.enums;

public enum TestSubmissionStatus {
    NOT_STARTED,
    IN_PROGRESS,
    SUBMITTED,
    PENDING,
    GRADING,
    COMPLETED,
    GRADED,
    FAILED,
    EXPIRED;

    public boolean isFinished() {
        return this == COMPLETED || this == GRADED;
    }

    public boolean isGrading() {
        return this == GRADING;
    }

    public boolean isPendingOrSubmitted() {
        return this == SUBMITTED || this == PENDING;
    }
}
