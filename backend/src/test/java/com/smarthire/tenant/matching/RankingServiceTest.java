package com.smarthire.tenant.matching;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.tenant.entity.*;
import com.smarthire.domain.tenant.repository.RankingDataRepository;
import com.smarthire.multitenancy.context.TenantContext;
import com.smarthire.tenant.matching.dto.RankingModels.*;
import com.smarthire.tenant.matching.service.*;
import java.util.*;
import org.junit.jupiter.api.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class RankingServiceTest {
    private final RankingDataRepository data = mock(RankingDataRepository.class);
    private final ObjectMapper mapper = new ObjectMapper();
    private final SkillScoringService skills = new SkillScoringService();
    private final RankingService service = new RankingService(data, new RankingCalculator(), skills, new ExperienceScoringService(mapper, skills), mapper);
    @BeforeEach void login() {
        TenantContext.setCurrentTenant("acme");
        var auth = new UsernamePasswordAuthenticationToken("recruiter@example.test", null, List.of(new SimpleGrantedAuthority("ROLE_RECRUITER")));
        auth.setDetails("acme"); SecurityContextHolder.getContext().setAuthentication(auth);
    }
    @AfterEach void cleanup() { TenantContext.clear(); SecurityContextHolder.clearContext(); }
    @Test void deniesMissingOrMismatchedTenantBeforeAnyQuery() {
        TenantContext.clear();
        assertThatThrownBy(() -> service.board(1)).isInstanceOf(BusinessException.class);
        TenantContext.setCurrentTenant("other");
        assertThatThrownBy(() -> service.board(1)).isInstanceOf(BusinessException.class);
        verifyNoInteractions(data);
    }
    @Test void deniesCandidateAndOtherRecruitersJob() {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("candidate", null, List.of(new SimpleGrantedAuthority("ROLE_CANDIDATE"))));
        assertThatThrownBy(() -> service.jobs()).isInstanceOf(BusinessException.class); verifyNoInteractions(data);
        login(); Job job = job(); job.getCreatedBy().setEmail("other@example.test"); when(data.job(1, false)).thenReturn(job);
        assertThatThrownBy(() -> service.board(1)).isInstanceOf(BusinessException.class);
        verify(data, never()).applications(anyLong());
    }
    @Test void allowsHrToListOwnJobs() {
        var auth = new UsernamePasswordAuthenticationToken("hr@example.test", null, List.of(new SimpleGrantedAuthority("ROLE_HR")));
        auth.setDetails("acme");
        SecurityContextHolder.getContext().setAuthentication(auth);
        when(data.jobs("hr@example.test")).thenReturn(List.of());
        assertThat(service.jobs()).isEmpty();
    }
    @Test void returnsEmptyBoardWithUnsavedDefaults() {
        when(data.job(1, false)).thenReturn(job());
        var board = service.board(1);
        assertThat(board.rows()).isEmpty(); assertThat(board.config().weights()).isEqualTo(new Weights(35, 15, 30, 20));
        assertThat(board.config().revision()).isZero();
        var page = service.page(1, 0, 20, "", "ACTIVE", "ALL", null, "score");
        assertThat(page.rows()).isEmpty();
        assertThat(page.summary().totalCandidates()).isZero();
        assertThat(page.page().totalPages()).isZero();
    }
    @Test void rejectsStaleConfigurationAndForeignSource() {
        Job job = job(); when(data.job(1, true)).thenReturn(job);
        assertThatThrownBy(() -> service.configure(1, new Config(new Weights(0, 0, 60, 40), Map.of("other", 100), 0, 7)))
                .isInstanceOf(BusinessException.class).hasMessageContaining("Configuration changed");
        Application app = new Application(); app.setId(2L); app.setJob(job);
        when(data.application(2)).thenReturn(app); when(data.job(1, false)).thenReturn(job);
        assertThatThrownBy(() -> service.select(2, new Selection(999L, null, null))).isInstanceOf(IllegalArgumentException.class);
        verify(data, never()).save(any());
    }
    @Test void multipleSourcesRequireExplicitSelection() throws Exception {
        Job job = job(); when(data.job(1, false)).thenReturn(job);
        Application app = new Application(); app.setId(2L); app.setJob(job); app.setCandidate(job.getCreatedBy());
        when(data.applications(1)).thenReturn(List.of(app));
        Cv first = new Cv(); first.setId(10L); Cv second = new Cv(); second.setId(11L);
        when(data.cvs(2)).thenReturn(List.of(first, second));
        RankingConfig config = new RankingConfig(); config.setConfigJson(mapper.writeValueAsString(new Config(new Weights(35,15,30,20),Map.of("other",100),24,1)));
        when(data.config(1)).thenReturn(config);
        var row = service.board(1).rows().getFirst();
        assertThat(row.result().components().getFirst().state()).isEqualTo("SELECT_SOURCE");
        assertThat(row.result().score()).isNull(); verify(data, never()).skills(anyLong());
    }
    private Job job() {
        User recruiter = new User(); recruiter.setEmail("recruiter@example.test"); recruiter.setFullName("Recruiter");
        Job job = new Job(); job.setId(1L); job.setTitle("Backend"); job.setCreatedBy(recruiter); return job;
    }
}
