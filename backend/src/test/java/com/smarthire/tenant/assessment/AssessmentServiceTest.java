package com.smarthire.tenant.assessment;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.enums.TestStatus;
import com.smarthire.domain.tenant.entity.Job;
import com.smarthire.domain.tenant.entity.JobTest;
import com.smarthire.domain.tenant.repository.JobRepository;
import com.smarthire.domain.tenant.repository.JobTestRepository;
import com.smarthire.domain.tenant.repository.UserRepository;
import com.smarthire.multitenancy.context.TenantContext;
import com.smarthire.tenant.assessment.controller.AssessmentController;
import com.smarthire.tenant.assessment.dto.request.JobTestRequest;
import com.smarthire.tenant.assessment.mapper.AssessmentMapper;
import com.smarthire.tenant.assessment.service.AssessmentService;
import com.smarthire.tenant.cv.service.CvAccess;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class AssessmentServiceTest {
    @Mock JobTestRepository tests;
    @Mock JobRepository jobs;
    @Mock CvAccess access;
    AssessmentService service;
    JobTest draft;
    JobTestRequest request = new JobTestRequest(1L, " Java basics ", "Description", 30, new BigDecimal("5"));

    @BeforeEach
    void setUp() {
        service = new AssessmentService(tests, jobs, access, new AssessmentMapper());
        Job job = new Job();
        job.setId(1L);
        draft = new JobTest();
        draft.setId(2L);
        draft.setJob(job);
        draft.setStatus(TestStatus.DRAFT);
    }

    @AfterEach
    void cleanup() {
        SecurityContextHolder.clearContext();
        TenantContext.clear();
    }

    @Test
    void createDraft() {
        when(access.staff()).thenReturn(true);
        when(jobs.findById(1L)).thenReturn(Optional.of(draft.getJob()));
        when(tests.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        var result = service.create(request);
        assertThat(result.title()).isEqualTo("Java basics");
        assertThat(result.status()).isEqualTo(TestStatus.DRAFT);
        assertThat(result.jobId()).isEqualTo(1L);
        verify(access).requireJob(draft.getJob());
    }

    @Test
    void updateDraft() {
        when(access.staff()).thenReturn(true);
        when(tests.findLockedById(2L)).thenReturn(Optional.of(draft));
        when(tests.save(draft)).thenReturn(draft);
        assertThat(service.update(2L, request).durationMinutes()).isEqualTo(30);
    }

    @Test
    void publishedTestCannotBeEdited() {
        when(access.staff()).thenReturn(true);
        draft.setStatus(TestStatus.PUBLISHED);
        when(tests.findLockedById(2L)).thenReturn(Optional.of(draft));
        assertThatThrownBy(() -> service.update(2L, request)).isInstanceOf(BusinessException.class)
                .hasMessageContaining("Only draft");
        verify(tests, never()).save(any());
    }

    @Test
    void jobCannotBeChanged() {
        when(access.staff()).thenReturn(true);
        when(tests.findLockedById(2L)).thenReturn(Optional.of(draft));
        var changed = new JobTestRequest(9L, "Test", null, 30, null);
        assertThatThrownBy(() -> service.update(2L, changed)).hasMessageContaining("cannot be changed");
        verify(tests, never()).save(any());
    }

    @Test
    void missingJobReturnsNotFound() {
        when(access.staff()).thenReturn(true);
        when(jobs.findById(1L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.create(request)).isInstanceOfSatisfying(BusinessException.class,
                ex -> assertThat(ex.getStatus().value()).isEqualTo(404));
    }

    @Test
    void listIsPaginated() {
        when(access.staff()).thenReturn(true);
        when(tests.findAll(any(Pageable.class))).thenReturn(new PageImpl<>(List.of(draft)));
        var result = service.list(-1, 500);
        assertThat(result.page()).isZero();
        assertThat(result.size()).isEqualTo(50);
        assertThat(result.items()).hasSize(1);
    }

    @Test
    void realCandidateRoleCannotManageTests() {
        authenticate("tenant_a", "tenant_a", "ROLE_CANDIDATE");
        service = new AssessmentService(tests, jobs, new CvAccess(mock(UserRepository.class)), new AssessmentMapper());
        assertThatThrownBy(() -> service.create(request)).hasMessage("Staff access required");
        assertThatThrownBy(() -> service.update(2L, request)).hasMessage("Staff access required");
        assertThatThrownBy(() -> service.list(0, 20)).hasMessage("Staff access required");
        assertThatThrownBy(() -> service.get(2L)).hasMessage("Staff access required");
        verifyNoInteractions(tests, jobs);
    }

    @Test
    void mismatchedTenantIsRejectedBeforeQueries() {
        authenticate("tenant_a", "tenant_b", "ROLE_RECRUITER");
        service = new AssessmentService(tests, jobs, new CvAccess(mock(UserRepository.class)), new AssessmentMapper());
        assertThatThrownBy(() -> service.create(request)).hasMessage("Tenant access required");
        verifyNoInteractions(tests, jobs);
    }

    @Test
    void controllerRejectsInvalidRequestBeforeService() throws Exception {
        AssessmentService mockService = mock(AssessmentService.class);
        MockMvcBuilders.standaloneSetup(new AssessmentController(mockService)).build()
                .perform(post("/api/v1/assessments").contentType(MediaType.APPLICATION_JSON)
                        .content("{\"jobId\":0,\"title\":\" \",\"durationMinutes\":0,\"passingScore\":-1}"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(mockService);
    }

    private void authenticate(String tenant, String tokenTenant, String role) {
        TenantContext.setCurrentTenant(tenant);
        var auth = new UsernamePasswordAuthenticationToken("user@example.test", "unused",
                List.of(new SimpleGrantedAuthority(role)));
        auth.setDetails(tokenTenant);
        SecurityContextHolder.getContext().setAuthentication(auth);
    }
}
