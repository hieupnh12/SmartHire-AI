package com.smarthire.module.notification.service;

import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class NotificationService {

    public Map<String, String> health() {
        return Map.of("module", "notification", "status", "scaffold");
    }
}
