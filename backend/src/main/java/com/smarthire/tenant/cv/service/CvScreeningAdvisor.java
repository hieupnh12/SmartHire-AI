package com.smarthire.tenant.cv.service;

import com.fasterxml.jackson.databind.JsonNode;
import java.util.Optional;

/** Turns the computed screening breakdown into a pass/fail decision. */
public interface CvScreeningAdvisor {
    Optional<Decision> decide(JsonNode breakdown, boolean formulaPassed);

    record Decision(boolean passed, String verdict) {}
}
