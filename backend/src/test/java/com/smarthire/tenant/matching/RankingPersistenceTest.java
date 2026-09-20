package com.smarthire.tenant.matching;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.domain.enums.*;
import com.smarthire.domain.tenant.entity.*;
import com.smarthire.domain.tenant.repository.RankingDataRepository;
import com.smarthire.multitenancy.context.TenantContext;
import com.smarthire.tenant.matching.dto.RankingModels.*;
import com.smarthire.tenant.matching.service.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.math.BigDecimal;
import java.util.*;
import javax.sql.DataSource;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.*;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.orm.jpa.*;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.*;
import static org.assertj.core.api.Assertions.*;

@SpringJUnitConfig(RankingPersistenceTest.TestConfig.class)
@Transactional
class RankingPersistenceTest {
    @Configuration @EnableTransactionManagement
    @Import({RankingDataRepository.class, RankingService.class, RankingCalculator.class, SkillScoringService.class, ExperienceScoringService.class})
    static class TestConfig {
        @Bean DataSource dataSource() { return new DriverManagerDataSource("jdbc:h2:mem:ranking;MODE=MySQL;DB_CLOSE_DELAY=-1", "sa", ""); }
        @Bean LocalContainerEntityManagerFactoryBean entityManagerFactory(DataSource ds) {
            var factory = new LocalContainerEntityManagerFactoryBean(); factory.setDataSource(ds);
            factory.setPackagesToScan("com.smarthire.domain.tenant"); factory.setJpaVendorAdapter(new HibernateJpaVendorAdapter());
            factory.setJpaPropertyMap(Map.of("hibernate.hbm2ddl.auto", "create-drop")); return factory;
        }
        @Bean PlatformTransactionManager transactionManager(jakarta.persistence.EntityManagerFactory emf) { return new JpaTransactionManager(emf); }
        @Bean ObjectMapper objectMapper() { return new ObjectMapper().findAndRegisterModules(); }
    }
    @PersistenceContext EntityManager em;
    @Autowired RankingService service;
    @BeforeEach void login() {
        TenantContext.setCurrentTenant("acme");
        var auth = new UsernamePasswordAuthenticationToken("recruiter@example.test", null, List.of(new SimpleGrantedAuthority("ROLE_RECRUITER")));
        auth.setDetails("acme"); SecurityContextHolder.getContext().setAuthentication(auth);
    }
    @AfterEach void cleanup() { TenantContext.clear(); SecurityContextHolder.clearContext(); }
    @Test void readsRealSourcesPersistsSnapshotsAndRecomputesIdempotently() {
        User recruiter = new User(); recruiter.setEmail("recruiter@example.test"); recruiter.setFullName("Recruiter"); recruiter.setRole(UserRole.RECRUITER); em.persist(recruiter);
        User candidate = new User(); candidate.setEmail("candidate@example.test"); candidate.setFullName("Candidate"); candidate.setRole(UserRole.CANDIDATE); em.persist(candidate);
        Job job = new Job(); job.setTitle("Backend"); job.setDescription("Java"); job.setCreatedBy(recruiter); em.persist(job);
        Application app = new Application(); app.setJob(job); app.setCandidate(candidate); em.persist(app);
        Skill skill = new Skill(); skill.setName("Java"); skill.setCategory("backend"); em.persist(skill);
        JobSkill requirement = new JobSkill(); requirement.setJob(job); requirement.setSkill(skill); em.persist(requirement);
        Cv cv = new Cv(); cv.setJob(job); cv.setUser(candidate); cv.setApplication(app); cv.setOriginalFilename("cv.pdf"); cv.setFileUrl("/private/cv.pdf"); cv.setStatus(CvStatus.ANALYZED); em.persist(cv);
        CvSkill extracted = new CvSkill(); extracted.setCv(cv); extracted.setSkillName("Java"); em.persist(extracted);
        CvExtraction extraction = new CvExtraction(); extraction.setCv(cv); extraction.setExtractionJson("""
                {"experience":[{"startDate":"2024-01","endDate":"2024-12","skills":["Java"],"evidence":"Java developer"}]}
                """); em.persist(extraction);
        com.smarthire.domain.tenant.entity.JobTest test = com.smarthire.domain.tenant.entity.JobTest.builder()
                .job(job).title("Java").durationMinutes(60).status(TestStatus.PUBLISHED).build();
        em.persist(test);
        Submission submission = Submission.builder().test(test).candidate(candidate).application(app)
                .status(TestSubmissionStatus.GRADED).score(new BigDecimal("85")).build();
        em.persist(submission);
        AiInterview aiInterview = AiInterview.builder().application(app).status(AiInterviewStatus.SCORED)
                .overallScore(new BigDecimal("81")).build();
        em.persist(aiInterview);
        em.flush();
        var board = service.configure(job.getId(), new Config(new Weights(35,15,30,20), Map.of("backend",100),24,0));
        assertThat(board.rows()).hasSize(1);
        assertThat(board.rows().getFirst().result().score()).isEqualByComparingTo("84.20");
        assertThat(board.rows().getFirst().rank()).isEqualTo(1);
        assertThat(service.sources(app.getId()).submissions()).hasSize(1);
        service.select(app.getId(), new Selection(cv.getId(), submission.getId(), aiInterview.getId()));
        service.recompute(job.getId()); em.flush(); em.clear();
        assertThat(em.createQuery("select count(r) from CandidateRanking r", Long.class).getSingleResult()).isEqualTo(1L);
        assertThat(em.createQuery("select count(s) from OverallScore s", Long.class).getSingleResult()).isEqualTo(1L);
        assertThat(service.overall(app.getId()).result().score()).isEqualByComparingTo("84.20");
        Submission updated = em.find(Submission.class, submission.getId());
        updated.setScore(BigDecimal.ZERO); em.flush();
        var fresh = service.board(job.getId()).rows().getFirst();
        assertThat(fresh.result().score()).isEqualByComparingTo("58.70");
        assertThat(fresh.result().complete()).isTrue();
        assertThat(em.createQuery("select s.overall from OverallScore s", BigDecimal.class).getSingleResult()).isEqualByComparingTo("84.20");
        var changed = service.configure(job.getId(), new Config(new Weights(100,0,0,0), Map.of("backend",100),0,1));
        assertThat(changed.rows().getFirst().result().score()).isEqualByComparingTo("100");
        assertThat(changed.config().revision()).isEqualTo(2);
        assertThatThrownBy(() -> service.configure(job.getId(), new Config(new Weights(35,15,30,20), Map.of("backend",100),24,0))).hasMessageContaining("Configuration changed");
    }
}
