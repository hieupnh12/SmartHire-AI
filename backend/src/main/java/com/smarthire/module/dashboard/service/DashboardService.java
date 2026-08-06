package com.smarthire.module.dashboard.service;

import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class DashboardService {

    public Map<String, String> health() {
        return Map.of("module", "dashboard", "status", "scaffold");
    }
}
