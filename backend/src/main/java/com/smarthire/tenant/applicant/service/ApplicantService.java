package com.smarthire.tenant.applicant.service;

import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class ApplicantService {

    public Map<String, String> health() {
        return Map.of("module", "applicant", "status", "scaffold");
    }
}

