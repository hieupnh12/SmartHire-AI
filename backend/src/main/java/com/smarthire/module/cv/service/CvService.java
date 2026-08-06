package com.smarthire.module.cv.service;

import java.util.Map;
import org.springframework.stereotype.Service;

@Service
public class CvService {

    public Map<String, String> health() {
        return Map.of("module", "cv", "status", "scaffold");
    }
}
