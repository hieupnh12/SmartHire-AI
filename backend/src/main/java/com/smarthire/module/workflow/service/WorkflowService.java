package com.smarthire.module.workflow.service;

import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class WorkflowService {

    public Map<String, String> health() {
        return Map.of("module", "workflow", "status", "scaffold");
    }
}
