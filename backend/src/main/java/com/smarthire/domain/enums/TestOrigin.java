package com.smarthire.domain.enums;

/** Who composed the paper. Separate from {@link TestStatus}. */
public enum TestOrigin {
    /** Recruiter wrote or imported the paper. */
    AUTHORED,
    /** Drawn from the question bank by the assessment generator. */
    GENERATED
}
