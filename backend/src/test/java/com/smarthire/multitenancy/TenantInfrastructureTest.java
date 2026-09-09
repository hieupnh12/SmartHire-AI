package com.smarthire.multitenancy;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.master.entity.TenantInfo;
import com.smarthire.master.tenant.dto.TenantResponse;
import com.smarthire.messaging.TenantJobExecutor;
import com.smarthire.multitenancy.context.TenantContext;
import com.smarthire.multitenancy.datasource.*;
import com.smarthire.multitenancy.service.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.*;
import org.springframework.amqp.AmqpRejectAndDontRequeueException;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import java.util.Base64;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class TenantInfrastructureTest {
    @AfterEach void cleanup() { TenantContext.clear(); }

    @Test void credentialsAreRandomizedAuthenticatedAndBoundToTenant() {
        var service = new TenantCredentialService(Base64.getEncoder().encodeToString(new byte[32]));
        String encrypted = service.encrypt("alpha", "private-password");
        assertThat(encrypted).doesNotContain("private-password").isNotEqualTo(service.encrypt("alpha", "private-password"));
        assertThat(service.decrypt("alpha", encrypted)).isEqualTo("private-password");
        assertThatThrownBy(() -> service.decrypt("beta", encrypted)).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> service.decrypt("alpha", "plaintext")).isInstanceOf(IllegalStateException.class);
    }

    @Test void responsesAndEntitySerializationNeverContainDatabasePassword() throws Exception {
        TenantInfo tenant = new TenantInfo(); tenant.setDbPassword("private-password");
        var mapper = new ObjectMapper().findAndRegisterModules();
        assertThat(mapper.writeValueAsString(TenantResponse.from(tenant))).doesNotContain("dbPassword", "private-password", "dbUrl", "dbUsername");
        assertThat(mapper.writeValueAsString(tenant)).doesNotContain("dbPassword", "private-password");
    }

    @Test void workersScopeAndClearTenantEvenWhenTaskFails() {
        var registry = mock(TenantRegistryService.class);
        TenantInfo tenant = new TenantInfo(); tenant.setCode("alpha");
        when(registry.requireActive("alpha")).thenReturn(tenant);
        var executor = new TenantJobExecutor(registry);
        TenantContext.setCurrentTenant("previous");
        assertThatThrownBy(() -> executor.execute("alpha", () -> {
            assertThat(TenantContext.getCurrentTenant()).isEqualTo("alpha");
            throw new IllegalStateException("worker failed");
        })).isInstanceOf(IllegalStateException.class);
        assertThat(TenantContext.getCurrentTenant()).isNull();
        when(registry.requireActive(null)).thenThrow(new BusinessException("Missing", HttpStatus.BAD_REQUEST, "TENANT_REQUIRED"));
        assertThatThrownBy(() -> executor.execute(null, () -> fail("Task must not execute")))
                .isInstanceOf(AmqpRejectAndDontRequeueException.class);
        assertThat(TenantContext.getCurrentTenant()).isNull();
    }

    @Test void providerRejectsUnknownTenantBeforeOpeningAnyPool() {
        var registry = mock(TenantRegistryService.class);
        @SuppressWarnings("unchecked")
        ObjectProvider<TenantRegistryService> lookup = mock(ObjectProvider.class);
        when(lookup.getObject()).thenReturn(registry);
        when(registry.requireActive("unknown")).thenThrow(new BusinessException("Unknown", HttpStatus.NOT_FOUND, "TENANT_NOT_FOUND"));
        var factory = mock(TenantDataSourceFactory.class);
        var provider = new DynamicMultiTenantConnectionProvider(lookup, factory, 2);
        assertThatThrownBy(() -> provider.getConnection("unknown")).isInstanceOf(BusinessException.class);
        assertThatThrownBy(provider::getAnyConnection).isInstanceOf(java.sql.SQLException.class);
        verifyNoInteractions(factory);
    }
    @Test void publisherAttachesValidatedTenantHeader() {
        var registry = mock(TenantRegistryService.class);
        var tenant = new TenantInfo(); tenant.setCode("alpha");
        when(registry.requireActive("alpha")).thenReturn(tenant);
        var rabbit = mock(org.springframework.amqp.rabbit.core.RabbitTemplate.class);
        var publisher = new com.smarthire.messaging.JobPublisher(rabbit, registry, "cv.analysis");
        TenantContext.setCurrentTenant("alpha");
        publisher.publishCvAnalysis("{}");
        var captor = org.mockito.ArgumentCaptor.forClass(org.springframework.amqp.core.MessagePostProcessor.class);
        verify(rabbit).convertAndSend(eq("cv.analysis"), eq(com.smarthire.config.RabbitMqConfig.RK), eq("{}"), captor.capture());
        var message = new org.springframework.amqp.core.Message(new byte[0], new org.springframework.amqp.core.MessageProperties());
        assertThat(captor.getValue().postProcessMessage(message).getMessageProperties().getHeaders())
                .containsEntry("X-Tenant-ID", "alpha");
    }

}
