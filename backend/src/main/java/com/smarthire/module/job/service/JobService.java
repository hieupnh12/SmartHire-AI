package com.smarthire.module.job.service;

import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class JobService {

    public Map<String, String> health() {
        return Map.of("module", "job", "status", "scaffold");
    }
}
