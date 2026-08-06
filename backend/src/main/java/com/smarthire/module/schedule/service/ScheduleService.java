package com.smarthire.module.schedule.service;

import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class ScheduleService {

    public Map<String, String> health() {
        return Map.of("module", "schedule", "status", "scaffold");
    }
}
