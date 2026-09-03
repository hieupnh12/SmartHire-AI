package com.smarthire.tenant.interview.service;

import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class InterviewService {

    public Map<String, String> health() {
        return Map.of("module", "interview", "status", "scaffold");
    }
}

