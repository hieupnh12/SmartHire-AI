package com.smarthire.module.practice.service;

import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class PracticeService {

    public Map<String, String> health() {
        return Map.of("module", "practice", "status", "scaffold");
    }
}
