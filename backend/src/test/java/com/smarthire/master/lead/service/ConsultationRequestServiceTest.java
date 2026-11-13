package com.smarthire.master.lead.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.master.entity.ConsultationRequest;
import com.smarthire.domain.master.repository.ConsultationRequestRepository;
import com.smarthire.domain.master.repository.SubscriptionPlanRepository;
import com.smarthire.master.lead.dto.ConsultationResponse;
import com.smarthire.master.lead.dto.CreateConsultationRequest;
import com.smarthire.master.lead.dto.UpdateConsultationStatusRequest;
import com.smarthire.master.notification.service.MasterNotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ConsultationRequestServiceTest {

    @Mock
    private ConsultationRequestRepository repository;

    @Mock
    private SubscriptionPlanRepository subscriptionPlanRepository;

    @Mock
    private MasterNotificationService masterNotificationService;

    private ConsultationRequestService service;

    @BeforeEach
    void setUp() {
        service = new ConsultationRequestService(repository, subscriptionPlanRepository, masterNotificationService);
    }

    @Test
    void createRequest_AcceptsPersonalEmailDomainsAndNormalizes() {
        CreateConsultationRequest req = CreateConsultationRequest.builder()
                .companyName("  Cong ty ABC  ")
                .contactName("  Nguyen Van A  ")
                .jobTitle("HR Manager")
                .workEmail("  Founder.Demo@Gmail.COM  ")
                .phoneNumber("0912345678")
                .companySize("100-500")
                .requestType("CONTRACT_QUOTE")
                .planTier("Enterprise")
                .build();

        when(repository.save(any(ConsultationRequest.class))).thenAnswer(inv -> {
            ConsultationRequest entity = inv.getArgument(0);
            entity.setId(101L);
            return entity;
        });

        ConsultationResponse res = service.createRequest(req);

        ArgumentCaptor<ConsultationRequest> captor = ArgumentCaptor.forClass(ConsultationRequest.class);
        verify(repository).save(captor.capture());
        verify(masterNotificationService).sendConsultationReceived(captor.getValue());

        assertThat(res.getId()).isEqualTo(101L);
        assertThat(res.getCompanyName()).isEqualTo("Cong ty ABC");
        assertThat(res.getContactName()).isEqualTo("Nguyen Van A");
        assertThat(res.getWorkEmail()).isEqualTo("founder.demo@gmail.com");
        assertThat(res.getRequestType()).isEqualTo("CONTRACT_QUOTE");
        assertThat(res.getStatus()).isEqualTo("PENDING");
    }

    @Test
    void createRequest_AcceptsPreviouslyBlockedFreeDomains() {
        when(repository.save(any(ConsultationRequest.class))).thenAnswer(inv -> {
            ConsultationRequest entity = inv.getArgument(0);
            entity.setId(202L);
            return entity;
        });

        for (String email : List.of("hr@yahoo.com", "founder@outlook.com", "recruiter@icloud.com")) {
            CreateConsultationRequest req = CreateConsultationRequest.builder()
                    .companyName("Demo Corp")
                    .contactName("Tran B")
                    .workEmail(email)
                    .build();

            ConsultationResponse res = service.createRequest(req);
            assertThat(res.getWorkEmail()).isEqualTo(email);
            assertThat(res.getRequestType()).isEqualTo("DEMO");
        }
    }

    @Test
    void createRequest_SucceedsEvenWhenNotificationDispatchFails() {
        CreateConsultationRequest req = CreateConsultationRequest.builder()
                .companyName("Startup X")
                .contactName("Le C")
                .workEmail("ceo@gmail.com")
                .build();

        when(repository.save(any(ConsultationRequest.class))).thenAnswer(inv -> {
            ConsultationRequest entity = inv.getArgument(0);
            entity.setId(303L);
            return entity;
        });
        doThrow(new RuntimeException("SMTP temporarily unavailable"))
                .when(masterNotificationService).sendConsultationReceived(any(ConsultationRequest.class));

        ConsultationResponse res = service.createRequest(req);

        assertThat(res.getId()).isEqualTo(303L);
        assertThat(res.getWorkEmail()).isEqualTo("ceo@gmail.com");
        assertThat(res.getStatus()).isEqualTo("PENDING");
    }

    @Test
    void updateStatus_ThrowsBusinessExceptionForInvalidStatus() {
        UpdateConsultationStatusRequest req = new UpdateConsultationStatusRequest("UNKNOWN_STATUS", null);

        assertThatThrownBy(() -> service.updateStatus(1L, req))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> {
                    BusinessException be = (BusinessException) ex;
                    assertThat(be.getCode()).isEqualTo("INVALID_STATUS");
                    assertThat(be.getStatus()).isEqualTo(HttpStatus.BAD_REQUEST);
                });

        verify(repository, never()).findById(any());
    }

    @Test
    void sendQuotation_PersistsProposedCodeSubdomainAndPlanAndSendsEmail() {
        var plan = com.smarthire.domain.master.entity.SubscriptionPlan.builder()
                .id(2L)
                .name("Gói Chuyên Nghiệp (Professional)")
                .build();
        ConsultationRequest existingLead = ConsultationRequest.builder()
                .id(12L)
                .companyName("Công ty Cổ phần Công nghệ VietCloud")
                .contactName("Nguyễn Minh Khôi")
                .workEmail("de180169nguyennhatsinh@gmail.com")
                .status("PENDING")
                .build();

        when(subscriptionPlanRepository.findById(2L)).thenReturn(java.util.Optional.of(plan));
        when(repository.findById(12L)).thenReturn(java.util.Optional.of(existingLead));
        when(repository.save(any(ConsultationRequest.class))).thenAnswer(inv -> inv.getArgument(0));

        var req = com.smarthire.master.lead.dto.SendQuotationRequest.builder()
                .consultationRequestId(12L)
                .companyName("Công ty Cổ phần Công nghệ VietCloud")
                .contactName("Nguyễn Minh Khôi")
                .recipientEmail("de180169nguyennhatsinh@gmail.com")
                .phoneNumber("0905123456")
                .planId(2L)
                .totalQuote(java.math.BigDecimal.valueOf(36_000_000))
                .proposedCode("  VietCloud-VN  ")
                .proposedSubdomain("  vietcloud  ")
                .build();

        ConsultationResponse res = service.sendQuotation(req);

        assertThat(res.getStatus()).isEqualTo("QUOTED");
        assertThat(res.getQuotedPlanId()).isEqualTo(2L);
        assertThat(res.getProposedCode()).isEqualTo("vietcloud-vn");
        assertThat(res.getProposedSubdomain()).isEqualTo("vietcloud");
        verify(masterNotificationService).sendQuotationProposal(req, plan);
    }

    @Test
    void sendQuotation_ThrowsWhenPlanNotFound() {
        when(subscriptionPlanRepository.findById(999L)).thenReturn(java.util.Optional.empty());

        var req = com.smarthire.master.lead.dto.SendQuotationRequest.builder()
                .companyName("VietCloud")
                .contactName("Khoi")
                .recipientEmail("de180169nguyennhatsinh@gmail.com")
                .planId(999L)
                .totalQuote(java.math.BigDecimal.TEN)
                .build();

        assertThatThrownBy(() -> service.sendQuotation(req))
                .isInstanceOf(BusinessException.class)
                .satisfies(ex -> {
                    BusinessException be = (BusinessException) ex;
                    assertThat(be.getCode()).isEqualTo("PLAN_NOT_FOUND");
                    assertThat(be.getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
                });

        verify(masterNotificationService, never()).sendQuotationProposal(any(), any());
    }
}
