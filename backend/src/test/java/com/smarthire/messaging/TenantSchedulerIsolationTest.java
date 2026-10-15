package com.smarthire.messaging;

import com.smarthire.domain.master.entity.TenantInfo;
import com.smarthire.domain.master.repository.TenantInfoRepository;
import com.smarthire.multitenancy.context.TenantContext;
import com.smarthire.multitenancy.service.TenantRegistryService;
import com.smarthire.tenant.interview.service.HumanInterviewEmailService;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class TenantSchedulerIsolationTest {
    @AfterEach void cleanup() { TenantContext.clear(); }

    @Test void failingTenantDoesNotPreventNextTenantFromBeingScanned() {
        var tenants = mock(TenantInfoRepository.class);
        var registry = mock(TenantRegistryService.class);
        var emails = mock(HumanInterviewEmailService.class);
        var hllo = tenant("hllo"); var se36 = tenant("se36");
        when(tenants.findAll()).thenReturn(List.of(hllo, se36));
        when(registry.requireActive("hllo")).thenReturn(hllo);
        when(registry.requireActive("se36")).thenReturn(se36);
        var visited = new ArrayList<String>();
        when(emails.pending()).thenAnswer(invocation -> {
            String code = TenantContext.getCurrentTenant(); visited.add(code);
            if ("hllo".equals(code)) throw new IllegalStateException("Cannot decrypt tenant credentials");
            return List.of();
        });
        var worker = new HumanInterviewEmailWorker(tenants, new TenantJobExecutor(registry),
                emails, mock(RabbitTemplate.class));
        worker.dispatch();
        assertThat(visited).containsExactly("hllo", "se36");
        assertThat(TenantContext.getCurrentTenant()).isNull();
    }

    @Test void schedulerTenantDoesNotChangeConcurrentRequestTenant() throws Exception {
        var registry = mock(TenantRegistryService.class);
        when(registry.requireActive("hllo")).thenReturn(tenant("hllo"));
        var executor = new TenantJobExecutor(registry);
        TenantContext.setCurrentTenant("se36");
        try (var background = java.util.concurrent.Executors.newSingleThreadExecutor()) {
            var job = background.submit(() -> {
                assertThatThrownBy(() -> executor.execute("hllo", () -> {
                    assertThat(TenantContext.getCurrentTenant()).isEqualTo("hllo");
                    throw new IllegalStateException("Cannot decrypt tenant credentials");
                })).isInstanceOf(IllegalStateException.class);
                assertThat(TenantContext.getCurrentTenant()).isNull();
            });
            job.get(5, java.util.concurrent.TimeUnit.SECONDS);
        }
        assertThat(TenantContext.getCurrentTenant()).isEqualTo("se36");
    }

    private TenantInfo tenant(String code) {
        var tenant = new TenantInfo(); tenant.setCode(code); tenant.setStatus("ACTIVE"); return tenant;
    }
}
