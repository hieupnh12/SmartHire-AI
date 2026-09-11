package com.smarthire.messaging;

import com.smarthire.multitenancy.context.TenantContext;
import com.smarthire.multitenancy.service.TenantRegistryService;
import org.springframework.amqp.AmqpRejectAndDontRequeueException;
import org.springframework.stereotype.Component;

@Component
public class TenantJobExecutor {
    private final TenantRegistryService registry;
    public TenantJobExecutor(TenantRegistryService registry) { this.registry = registry; }

    public void execute(String identifier, Runnable task) {
        TenantContext.clear();
        try {
            String code;
            try {
                code = registry.requireActive(identifier).getCode();
            } catch (com.smarthire.common.exception.BusinessException ex) {
                throw new AmqpRejectAndDontRequeueException("Missing or inactive job tenant");
            }
            TenantContext.setCurrentTenant(code);
            task.run();
        } finally {
            TenantContext.clear();
        }
    }
}
