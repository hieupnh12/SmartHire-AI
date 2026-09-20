package com.smarthire.common.exception;

import com.smarthire.common.api.ApiResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
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

    @ExceptionHandler(BusinessException.class)
    public ResponseEntity<ApiResponse<Void>> handleBusiness(BusinessException ex) {
        log.warn("Business exception [{}]: {}", ex.getCode(), ex.getMessage(), ex);
        return ResponseEntity.status(ex.getStatus())
                .body(ApiResponse.error(ex.getMessage(), ex.getCode()));
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
    public ResponseEntity<ApiResponse<Void>> handleGeneric(Exception ex) {
        // JPA may wrap connection-provider domain failures while opening a transaction.
        Throwable cause = ex.getCause();
        while (cause != null && cause != cause.getCause()) {
            if (cause instanceof BusinessException business) return handleBusiness(business);
            cause = cause.getCause();
        }
        Throwable root = ex;
        while (root.getCause() != null && root.getCause() != root) {
            root = root.getCause();
        }
        log.error("Unhandled exception {}: {}", ex.getClass().getName(), ex.getMessage(), ex);
        String detail = root.getClass().getSimpleName() + ": " + String.valueOf(root.getMessage());
        if (detail.length() > 400) detail = detail.substring(0, 400);
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body(ApiResponse.error(detail, "INTERNAL_ERROR"));
    }
}

