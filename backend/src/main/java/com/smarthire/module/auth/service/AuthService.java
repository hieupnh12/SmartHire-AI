package com.smarthire.module.auth.service;

import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    public Map<String, String> health() {
        return Map.of("module", "auth", "status", "scaffold");
    }
}
