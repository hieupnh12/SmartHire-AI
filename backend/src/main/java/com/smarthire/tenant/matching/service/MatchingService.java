package com.smarthire.tenant.matching.service;

import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class MatchingService {

    public Map<String, String> health() {
        return Map.of("module", "matching", "status", "scaffold");
    }
}

