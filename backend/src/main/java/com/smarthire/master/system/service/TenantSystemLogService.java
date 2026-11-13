package com.smarthire.master.system.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.domain.master.entity.TenantSystemLog;
import com.smarthire.domain.master.repository.TenantSystemLogRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.support.TransactionTemplate;

import java.io.PrintWriter;
import java.io.StringWriter;
import java.util.Map;
import java.util.concurrent.CompletableFuture;

@Service
@Slf4j
public class TenantSystemLogService {

    private final TenantSystemLogRepository logRepository;
    private final ObjectMapper objectMapper;
    private TransactionTemplate transactionTemplate;

    public TenantSystemLogService(
            TenantSystemLogRepository logRepository,
            ObjectMapper objectMapper) {
        this.logRepository = logRepository;
        this.objectMapper = objectMapper;
    }

    @Autowired(required = false)
    public void setMasterTransactionManager(
            @Qualifier("masterTransactionManager") PlatformTransactionManager masterTransactionManager) {
        if (masterTransactionManager != null) {
            this.transactionTemplate = new TransactionTemplate(masterTransactionManager);
        }
    }

    /**
     * Records a system error log asynchronously for a tenant.
     */
    public void logHttpError(
            String tenantCode,
            String action,
            String message,
            String endpoint,
            String method,
            Integer statusCode,
            String ipAddress,
            String traceId,
            Throwable ex,
            Map<String, Object> extraMeta) {
        CompletableFuture.runAsync(() -> {
            try {
                String stackTrace = extractStackTrace(ex);
                String metaJson = serializeMetadata(extraMeta);

                TenantSystemLog systemLog = TenantSystemLog.builder()
                        .tenantCode(normalizeTenant(tenantCode))
                        .level("ERROR")
                        .category("HTTP_API")
                        .action(action != null ? action : "HTTP_ERROR")
                        .message(message != null ? truncate(message, 2000) : "Internal Server Error")
                        .endpoint(endpoint)
                        .method(method)
                        .statusCode(statusCode)
                        .ipAddress(ipAddress)
                        .traceId(traceId)
                        .stackTrace(stackTrace)
                        .metadataJson(metaJson)
                        .build();

                saveLogInternal(systemLog);
            } catch (Exception e) {
                log.warn("Failed to persist TenantSystemLog HTTP error: {}", e.getMessage());
            }
        });
    }

    /**
     * Records a worker / async job error log asynchronously for a tenant.
     */
    public void logWorkerError(
            String tenantCode,
            String workerName,
            String message,
            String traceId,
            Throwable ex) {
        CompletableFuture.runAsync(() -> {
            try {
                String stackTrace = extractStackTrace(ex);

                TenantSystemLog systemLog = TenantSystemLog.builder()
                        .tenantCode(normalizeTenant(tenantCode))
                        .level("ERROR")
                        .category("ASYNC_WORKER")
                        .action(workerName != null ? workerName : "WORKER_ERROR")
                        .message(message != null ? truncate(message, 2000) : "Worker execution failed")
                        .traceId(traceId)
                        .stackTrace(stackTrace)
                        .build();

                saveLogInternal(systemLog);
            } catch (Exception e) {
                log.warn("Failed to persist TenantSystemLog worker error: {}", e.getMessage());
            }
        });
    }

    /**
     * Records a general system event or warning for a tenant.
     */
    public void logSystemEvent(
            String tenantCode,
            String level,
            String category,
            String action,
            String message,
            Map<String, Object> metadata) {
        CompletableFuture.runAsync(() -> {
            try {
                String metaJson = serializeMetadata(metadata);

                TenantSystemLog systemLog = TenantSystemLog.builder()
                        .tenantCode(normalizeTenant(tenantCode))
                        .level(level != null ? level : "INFO")
                        .category(category != null ? category : "APPLICATION")
                        .action(action != null ? action : "SYSTEM_EVENT")
                        .message(message != null ? truncate(message, 2000) : "")
                        .metadataJson(metaJson)
                        .build();

                saveLogInternal(systemLog);
            } catch (Exception e) {
                log.warn("Failed to persist TenantSystemLog event: {}", e.getMessage());
            }
        });
    }

    /**
     * Records a frontend client-side crash/error log asynchronously.
     */
    public void logClientError(
            String tenantCode,
            String action,
            String message,
            String pageUrl,
            String userAgent,
            String ipAddress,
            String traceId,
            String stackTrace,
            Map<String, Object> extraMeta) {
        CompletableFuture.runAsync(() -> {
            try {
                String metaJson = serializeMetadata(extraMeta);

                TenantSystemLog systemLog = TenantSystemLog.builder()
                        .tenantCode(normalizeTenant(tenantCode))
                        .level("ERROR")
                        .category("FRONTEND_UI")
                        .action(action != null ? action : "REACT_CRASH")
                        .message(message != null ? truncate(message, 2000) : "Frontend Unhandled Exception")
                        .endpoint(pageUrl != null ? truncate(pageUrl, 255) : null)
                        .method("CLIENT")
                        .statusCode(500)
                        .ipAddress(ipAddress)
                        .traceId(traceId)
                        .stackTrace(stackTrace != null ? truncate(stackTrace, 5000) : null)
                        .metadataJson(metaJson)
                        .build();

                saveLogInternal(systemLog);
            } catch (Exception e) {
                log.warn("Failed to persist TenantSystemLog client crash error: {}", e.getMessage());
            }
        });
    }

    private void saveLogInternal(TenantSystemLog systemLog) {
        if (transactionTemplate != null) {
            transactionTemplate.execute(status -> logRepository.save(systemLog));
        } else {
            logRepository.save(systemLog);
        }
    }

    private String normalizeTenant(String tenantCode) {
        if (tenantCode == null || tenantCode.isBlank()) {
            return "SYSTEM";
        }
        return tenantCode.trim();
    }

    private String extractStackTrace(Throwable ex) {
        if (ex == null) return null;
        StringWriter sw = new StringWriter();
        PrintWriter pw = new PrintWriter(sw);
        ex.printStackTrace(pw);
        String full = sw.toString();
        // Truncate to reasonable length (e.g. 5000 chars) for database storage
        return full.length() > 5000 ? full.substring(0, 5000) : full;
    }

    private String serializeMetadata(Map<String, Object> metadata) {
        if (metadata == null || metadata.isEmpty()) return null;
        try {
            return objectMapper.writeValueAsString(metadata);
        } catch (Exception e) {
            return null;
        }
    }

    private String truncate(String text, int maxLength) {
        if (text == null) return null;
        return text.length() > maxLength ? text.substring(0, maxLength) : text;
    }
}
