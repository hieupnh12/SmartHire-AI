package com.smarthire.common.exception;

import com.smarthire.common.api.ApiResponse;
import com.smarthire.master.system.service.TenantSystemLogService;
import com.smarthire.multitenancy.context.TenantContext;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.slf4j.MDC;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.http.converter.HttpMessageNotReadableException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MultipartException;
import org.springframework.web.multipart.support.MissingServletRequestPartException;

import java.util.HashMap;
import java.util.Map;

@RestControllerAdvice
public class GlobalExceptionHandler {

    private static final Logger log = LoggerFactory.getLogger(GlobalExceptionHandler.class);

    private TenantSystemLogService systemLogService;

    @Autowired(required = false)
    public void setSystemLogService(TenantSystemLogService systemLogService) {
        this.systemLogService = systemLogService;
    }

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiResponse<Void>> handleBusiness(BusinessException ex, HttpServletRequest request) {
        log.warn("Business exception [{}]: {}", ex.getCode(), ex.getMessage(), ex);

        if (ex.getStatus() != null && ex.getStatus().is5xxServerError() && systemLogService != null && request != null) {
            String tenantCode = TenantContext.getCurrentTenant();
            String traceId = request.getAttribute("TRACE_ID") != null
                    ? String.valueOf(request.getAttribute("TRACE_ID"))
                    : MDC.get("traceId");
            systemLogService.logHttpError(
                    tenantCode,
                    ex.getCode() != null ? ex.getCode() : "SERVER_ERROR",
                    ex.getMessage(),
                    request.getRequestURI(),
                    request.getMethod(),
                    ex.getStatus().value(),
                    request.getRemoteAddr(),
                    traceId,
                    ex,
                    null
            );
        }

        return ResponseEntity.status(ex.getStatus())
                .body(ApiResponse.error(ex.getMessage(), ex.getCode()));
    }

    public ResponseEntity<ApiResponse<Void>> handleBusiness(BusinessException ex) {
        return handleBusiness(ex, null);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ApiResponse<Void>> handleValidation(MethodArgumentNotValidException ex) {
        Map<String, String> errors = new HashMap<>();
        for (FieldError fieldError : ex.getBindingResult().getFieldErrors()) {
            errors.put(fieldError.getField(), fieldError.getDefaultMessage());
        }
        return ResponseEntity.badRequest()
                .body(ApiResponse.validationError("Validation failed", errors));
    }

    @ExceptionHandler(HttpMessageNotReadableException.class)
    public ResponseEntity<ApiResponse<Void>> handleJsonParse(HttpMessageNotReadableException ex) {
        log.warn("Invalid request JSON");
        return ResponseEntity.badRequest()
                .body(ApiResponse.error("Invalid JSON body format or invalid character escape", "BAD_REQUEST"));
    }

    @ExceptionHandler({MultipartException.class, MissingServletRequestPartException.class})
    public ResponseEntity<ApiResponse<Void>> handleMultipart(Exception ex) {
        log.warn("Invalid multipart upload: {}", ex.getMessage());
        return ResponseEntity.badRequest()
                .body(ApiResponse.error("CV upload must be multipart/form-data with a file part", "CV_MULTIPART"));
    }

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<ApiResponse<Void>> handleIllegalArgument(IllegalArgumentException ex) {
        log.warn("Illegal argument: {}", ex.getMessage());
        return ResponseEntity.badRequest()
                .body(ApiResponse.error(ex.getMessage(), "BAD_REQUEST"));
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ApiResponse<Void>> handleGeneric(Exception ex, HttpServletRequest request) {
        // JPA may wrap connection-provider domain failures while opening a transaction.
        Throwable cause = ex.getCause();
        while (cause != null && cause != cause.getCause()) {
            if (cause instanceof BusinessException business) return handleBusiness(business, request);
            cause = cause.getCause();
        }
        log.error("Unhandled exception {}: {}", ex.getClass().getName(), ex.getMessage(), ex);

        if (systemLogService != null && request != null) {
            String tenantCode = TenantContext.getCurrentTenant();
            String traceId = request.getAttribute("TRACE_ID") != null
                    ? String.valueOf(request.getAttribute("TRACE_ID"))
                    : MDC.get("traceId");
            systemLogService.logHttpError(
                    tenantCode,
                    "UNHANDLED_EXCEPTION",
                    ex.getMessage() != null ? ex.getMessage() : ex.getClass().getSimpleName(),
                    request.getRequestURI(),
                    request.getMethod(),
                    HttpStatus.INTERNAL_SERVER_ERROR.value(),
                    request.getRemoteAddr(),
                    traceId,
                    ex,
                    Map.of("exceptionClass", ex.getClass().getName())
            );
        }

        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error("An internal error occurred. Please try again later.", "INTERNAL_ERROR"));
    }

    public ResponseEntity<ApiResponse<Void>> handleGeneric(Exception ex) {
        return handleGeneric(ex, null);
    }
}
