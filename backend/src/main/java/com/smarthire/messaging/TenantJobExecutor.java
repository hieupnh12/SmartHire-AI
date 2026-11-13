package com.smarthire.messaging;

import com.smarthire.master.system.service.TenantSystemLogService;
import com.smarthire.multitenancy.context.TenantContext;
import com.smarthire.multitenancy.service.TenantRegistryService;
import org.slf4j.MDC;
import org.springframework.amqp.AmqpRejectAndDontRequeueException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
public class TenantJobExecutor {
    private final TenantRegistryService registry;
    private TenantSystemLogService systemLogService;

    public TenantJobExecutor(TenantRegistryService registry) {
        this.registry = registry;
    }

    @Autowired(required = false)
    public void setSystemLogService(TenantSystemLogService systemLogService) {
        this.systemLogService = systemLogService;
    }

    public void execute(String identifier, Runnable task) {
        TenantContext.clear();
        MDC.clear();
        String code;
        String traceId = UUID.randomUUID().toString().replace("-", "").substring(0, 12);
        try {
            try {
                code = registry.requireActive(identifier).getCode();
            } catch (com.smarthire.common.exception.BusinessException ex) {
                throw new AmqpRejectAndDontRequeueException("Missing or inactive job tenant");
            }
            TenantContext.setCurrentTenant(code);
            MDC.put("tenantId", code);
            MDC.put("traceId", traceId);

            try {
                task.run();
            } catch (RuntimeException ex) {
                if (systemLogService != null) {
                    systemLogService.logWorkerError(code, task.getClass().getSimpleName(), ex.getMessage(), traceId, ex);
                }
                throw ex;
            }
        } finally {
            TenantContext.clear();
            MDC.clear();
        }
    }
}
