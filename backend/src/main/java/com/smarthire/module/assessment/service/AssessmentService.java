package com.smarthire.module.assessment.service;

import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class AssessmentService {

    public Map<String, String> health() {
        return Map.of("module", "assessment", "status", "scaffold");
    }
}
