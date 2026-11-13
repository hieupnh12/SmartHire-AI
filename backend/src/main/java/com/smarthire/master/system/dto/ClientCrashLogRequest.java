package com.smarthire.master.system.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClientCrashLogRequest {

    private String tenantCode;

    private String action;

    private String message;

    private String pageUrl;

    private String stackTrace;

    private String userAgent;

    private Map<String, Object> metadata;
}
