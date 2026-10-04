package com.smarthire.tenant.assessment;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smarthire.common.exception.BusinessException;
import com.smarthire.common.exception.GlobalExceptionHandler;
import com.smarthire.domain.enums.*;
import com.smarthire.domain.tenant.entity.*;
import com.smarthire.domain.tenant.repository.*;
import com.smarthire.multitenancy.context.TenantContext;
import com.smarthire.tenant.assessment.controller.*;
import com.smarthire.tenant.assessment.dto.request.*;
import com.smarthire.tenant.assessment.dto.response.*;
import com.smarthire.tenant.assessment.mapper.AssessmentMapper;
import com.smarthire.tenant.assessment.service.*;
import com.smarthire.tenant.cv.service.CvAccess;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;
import javax.sql.DataSource;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.*;
import org.springframework.data.jpa.repository.config.EnableJpaRepositories;
import org.springframework.http.MediaType;
import org.springframework.jdbc.datasource.DriverManagerDataSource;
import org.springframework.orm.jpa.*;
import org.springframework.orm.jpa.vendor.HibernateJpaVendorAdapter;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.context.junit.jupiter.SpringJUnitConfig;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.transaction.support.TransactionTemplate;
import static org.assertj.core.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringJUnitConfig(AssessmentFlowTest.Config.class)
class AssessmentFlowTest {
    @Configuration
    @EnableTransactionManagement
    @EnableJpaRepositories(basePackages = "com.smarthire.domain.tenant.repository")
    @Import({AssessmentService.class, QuestionService.class, QuestionBankService.class, AssessmentGenerationService.class, SubmissionService.class, AssessmentMapper.class})
    static class Config {
        @Bean ObjectMapper objectMapper() { return new ObjectMapper(); }
        @Bean CvAccess cvAccess(UserRepository users, JobAssignmentRepository assignments) {
            return new CvAccess(users, assignments);
        }
        @Bean DataSource dataSource() {
            String mysql = System.getenv("ASSESSMENT_TEST_JDBC_URL");
            if (mysql != null) {
                var uri = java.net.URI.create(mysql.substring(5));
                if (!"mysql".equals(uri.getScheme()) || !uri.getPath().matches("/smarthire_tenant_assessment_verify_[a-z0-9_]+")) {
                    throw new IllegalArgumentException("MySQL assessment tests require a dedicated verification database");
                }
                return new DriverManagerDataSource(mysql, System.getenv("ASSESSMENT_TEST_USER"), System.getenv("ASSESSMENT_TEST_PASSWORD"));
            }
            return new DriverManagerDataSource("jdbc:h2:mem:assessment;MODE=MySQL;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=10000", "sa", "");
        }
        @Bean LocalContainerEntityManagerFactoryBean entityManagerFactory(DataSource dataSource) {
            var factory = new LocalContainerEntityManagerFactoryBean();
            factory.setDataSource(dataSource);
            factory.setPackagesToScan("com.smarthire.domain.tenant.entity");
            factory.setJpaVendorAdapter(new HibernateJpaVendorAdapter());
            // Real MySQL tests must exercise Flyway's schema, never create it via Hibernate.
            factory.setJpaPropertyMap(Map.of("hibernate.hbm2ddl.auto",
                    System.getenv("ASSESSMENT_TEST_JDBC_URL") == null ? "create-drop" : "none"));
            return factory;
        }
        @Bean PlatformTransactionManager transactionManager(jakarta.persistence.EntityManagerFactory factory) {
            return new JpaTransactionManager(factory);
        }
    }

    @PersistenceContext EntityManager em;
    @Autowired AssessmentService assessments;
    @Autowired QuestionService questions;
    @Autowired QuestionBankService bank;
    @Autowired AssessmentGenerationService generation;
    @Autowired SubmissionService submissions;
    @Autowired PlatformTransactionManager transactionManager;
    TransactionTemplate tx;
    MockMvc mvc;
    long jobId;
    long applicationId;
    long candidateId;
    String recruiterEmail;
    String candidateEmail;
    String otherEmail;

    @BeforeEach
    void setup() {
        tx = new TransactionTemplate(transactionManager);
        String suffix = UUID.randomUUID().toString();
        recruiterEmail = "staff-" + suffix + "@example.test";
        candidateEmail = "candidate-" + suffix + "@example.test";
        otherEmail = "other-" + suffix + "@example.test";
        tx.executeWithoutResult(status -> {
            User recruiter = user(recruiterEmail, "RECRUITER");
            User candidate = user(candidateEmail, "CANDIDATE");
            user(otherEmail, "CANDIDATE");
            Job job = new Job();
            job.setTitle("Java job"); job.setDescription("Java"); job.setCreatedBy(recruiter);
            em.persist(job);
            Application application = new Application();
            application.setJob(job); application.setCandidate(candidate); application.setStatus(ApplicationStatus.ASSESSMENT);
            em.persist(application); em.flush();
            AiInterview passedInterview = new AiInterview();
            passedInterview.setApplication(application);
            passedInterview.setStatus(AiInterviewStatus.PASSED);
            em.persist(passedInterview);
            jobId = job.getId(); applicationId = application.getId(); candidateId = candidate.getId();
        });
        login(recruiterEmail, "RECRUITER");
        mvc = MockMvcBuilders.standaloneSetup(new QuestionController(questions), new QuestionBankController(bank), new AssessmentGenerationController(generation), new SubmissionController(submissions))
                .setControllerAdvice(new GlobalExceptionHandler()).build();
    }

    @AfterEach
    void cleanup() { TenantContext.clear(); SecurityContextHolder.clearContext(); }

    private AssessmentConfigRequest generationConfig(boolean automatic) {
        String skillName = "Skill-" + jobId;
        tx.executeWithoutResult(status -> {
            Skill skill = new Skill(); skill.setName(skillName); em.persist(skill);
            JobSkill link = new JobSkill(); link.setJob(em.find(Job.class, jobId)); link.setSkill(skill);
            em.persist(link);
        });
        bank.create(List.of(new BankQuestionRequest(new QuestionRequest("Bank source " + jobId, 3, 0,
                "Easy", skillName, "Explanation", List.of(new QuestionRequest.OptionRequest("Yes", true),
                new QuestionRequest.OptionRequest("No", false)), QuestionType.MCQ), null)));
        return new AssessmentConfigRequest(30, 70, automatic, List.of(
                new AssessmentConfigRequest.Section(skillName, QuestionType.MCQ, "Easy", 1, 10)));
    }

    @Test
    void missingConfigurationIsSuccessfulAndBothGenerationPathsUseSavedExerciseStructure() throws Exception {
        mvc.perform(get("/api/v1/assessments/jobs/" + jobId + "/configuration"))
                .andExpect(status().isOk()).andExpect(jsonPath("$.success").value(true));
        assertThat(generation.config(jobId)).isNull();
        generationConfig(false);
        String skill = "Skill-" + jobId;
        bank.create(List.of(new BankQuestionRequest(new QuestionRequest("Second source " + jobId, 1, 0,
                "Easy", skill, null, List.of(new QuestionRequest.OptionRequest("Yes", true),
                new QuestionRequest.OptionRequest("No", false)), QuestionType.MCQ), null)));
        var config = new AssessmentConfigRequest(17, 60, true, List.of(
                new AssessmentConfigRequest.Section(skill, QuestionType.MCQ, "Easy", 2, 3)));
        generation.saveConfig(jobId, config);
        var draft = generation.generate(jobId);
        assertThat(generation.generateForApplication(applicationId)).isTrue();
        var assigned = tx.execute(status -> em.createQuery("select t from JobTest t where t.assignedApplication.id = :id", JobTest.class)
                .setParameter("id", applicationId).getSingleResult());
        assertThat(draft.durationMinutes()).isEqualTo(17);
        assertThat(assigned.getDurationMinutes()).isEqualTo(17);
        assertThat(draft.passingScore()).isEqualByComparingTo("3.60");
        assertThat(assigned.getPassingScore()).isEqualByComparingTo("3.60");
        var manualQuestions = questions.list(draft.id());
        var assignedQuestions = questions.list(assigned.getId());
        assertThat(manualQuestions).hasSize(2);
        assertThat(assignedQuestions).hasSize(2);
        assertThat(assignedQuestions).allSatisfy(question -> {
            assertThat(question.skill()).isEqualTo(skill);
            assertThat(question.difficulty()).isEqualTo("Easy");
            assertThat(question.questionType()).isEqualTo("MCQ");
            assertThat(question.points()).isEqualTo(3);
        });
        assertThat(assignedQuestions).extracting(QuestionResponse::questionText)
                .containsExactlyInAnyOrderElementsOf(manualQuestions.stream().map(QuestionResponse::questionText).toList());
    }

    @Test
    void automaticallyGeneratesAssignedPaperOnceAndNotifiesOnlyItsCandidate() {
        var config = generationConfig(true);
        generation.saveConfig(jobId, config);
        assertThat(generation.pending()).contains(applicationId);
        assertThat(generation.generateForApplication(applicationId)).isTrue();
        assertThat(generation.generateForApplication(applicationId)).isFalse();
        long testId = tx.execute(status -> {
            var test = em.createQuery("select t from JobTest t where t.assignedApplication.id = :id", JobTest.class)
                    .setParameter("id", applicationId).getSingleResult();
            assertThat(test.getStatus()).isEqualTo(TestStatus.PUBLISHED);
            assertThat(test.getPassingScore()).isEqualByComparingTo("7.00");
            assertThat(test.getTitle()).contains("Java job", "HS " + applicationId);
            assertThat(em.createQuery("select count(n) from Notification n where n.user.id = :id and n.type = 'ASSESSMENT_INVITATION'", Long.class)
                    .setParameter("id", candidateId).getSingleResult()).isEqualTo(1);
            return test.getId();
        });
        assertThat(questions.list(testId)).hasSize(1);
        assertThat(questions.list(testId).getFirst().options()).hasSize(2);
        login(candidateEmail, "CANDIDATE");
        assertThat(submissions.available(applicationId)).extracting(AvailableAssessmentResponse::id).contains(testId);
        long otherApplication = tx.execute(status -> {
            var other = em.createQuery("select u from User u where u.email = :email", User.class).setParameter("email", otherEmail).getSingleResult();
            Application app = new Application(); app.setJob(em.find(Job.class, jobId)); app.setCandidate(other); app.setStatus(ApplicationStatus.ASSESSMENT); em.persist(app);
            var interview = new AiInterview(); interview.setApplication(app); interview.setStatus(AiInterviewStatus.PASSED); em.persist(interview);
            em.flush(); return app.getId();
        });
        login(otherEmail, "CANDIDATE");
        assertThat(submissions.available(otherApplication)).extracting(AvailableAssessmentResponse::id).doesNotContain(testId);
        assertThatThrownBy(() -> submissions.start(testId, new StartSubmissionRequest(otherApplication))).isInstanceOf(BusinessException.class);
    }

    @Test
    void generationCreatesDraftAndRejectsMissingPoolWithoutPartialTest() throws Exception {
        var config = generationConfig(false);
        generation.saveConfig(jobId, config);
        var created = generation.generate(jobId);
        assertThat(created.status()).isEqualTo(TestStatus.DRAFT);
        assertThat(questions.list(created.id())).hasSize(1);
        assertThat(generation.generateForApplication(applicationId)).isFalse();
        var insufficient = new AssessmentConfigRequest(30, 70, false, List.of(
                new AssessmentConfigRequest.Section("Skill-" + jobId, QuestionType.MCQ, "Easy", 2, 5)));
        generation.saveConfig(jobId, insufficient);
        Long before = tx.execute(status -> em.createQuery("select count(t) from JobTest t", Long.class).getSingleResult());
        assertThatThrownBy(() -> generation.generate(jobId)).isInstanceOf(BusinessException.class).hasMessageContaining("Not enough questions");
        Long after = tx.execute(status -> em.createQuery("select count(t) from JobTest t", Long.class).getSingleResult());
        assertThat(after).isEqualTo(before);
        mvc.perform(put("/api/v1/assessments/jobs/" + jobId + "/configuration").contentType(MediaType.APPLICATION_JSON)
                .content("{\"durationMinutes\":0,\"passingPercent\":101,\"autoAssign\":false,\"sections\":[]}"))
                .andExpect(status().isBadRequest());
        login(candidateEmail, "CANDIDATE");
        mvc.perform(get("/api/v1/assessments/jobs/" + jobId + "/configuration")).andExpect(status().isForbidden());
    }

    @Test
    void automationSkipsFailedWithdrawnAndChangedSkills() {
        var config = generationConfig(true);
        generation.saveConfig(jobId, config);
        tx.executeWithoutResult(status -> em.createQuery("update AiInterview i set i.status = :state where i.application.id = :id")
                .setParameter("state", AiInterviewStatus.FAILED).setParameter("id", applicationId).executeUpdate());
        assertThat(generation.generateForApplication(applicationId)).isFalse();
        tx.executeWithoutResult(status -> {
            em.createQuery("update AiInterview i set i.status = :state where i.application.id = :id")
                    .setParameter("state", AiInterviewStatus.PASSED).setParameter("id", applicationId).executeUpdate();
            em.find(Application.class, applicationId).setWithdrawnAt(Instant.now());
        });
        assertThat(generation.generateForApplication(applicationId)).isFalse();
        tx.executeWithoutResult(status -> {
            em.find(Application.class, applicationId).setWithdrawnAt(null);
            em.createQuery("delete from JobSkill s where s.job.id = :id").setParameter("id", jobId).executeUpdate();
        });
        assertThatThrownBy(() -> generation.generateForApplication(applicationId)).isInstanceOf(BusinessException.class).hasMessageContaining("Skill does not belong");
    }

    @Test
    void simultaneousAutomaticDeliveriesCreateOnePaperAndOneNotification() throws Exception {
        generation.saveConfig(jobId, generationConfig(true));
        try (var executor = Executors.newFixedThreadPool(2)) {
            var gate = new CountDownLatch(2);
            Callable<Boolean> action = () -> {
                TenantContext.setCurrentTenant("assessment_tenant");
                try {
                    gate.countDown();
                    if (!gate.await(5, TimeUnit.SECONDS)) throw new IllegalStateException("Timeout");
                    return generation.generateForApplication(applicationId);
                } finally { TenantContext.clear(); }
            };
            var first = executor.submit(action); var second = executor.submit(action);
            assertThat(List.of(first.get(15, TimeUnit.SECONDS), second.get(15, TimeUnit.SECONDS)))
                    .containsExactlyInAnyOrder(true, false);
        }
        var status = generation.status(jobId);
        assertThat(status.generated()).isEqualTo(1);
        assertThat(status.pending()).isZero();
        assertThat(status.bankReady()).isTrue();
    }

    @Test
    void bankCreatesStandaloneQuestionsAndPreservesMetadataAndSkillLinks() {
        var authoring = new ObjectMapper().createObjectNode().put("kind", "TU_LUAN_CODE")
                .put("sample", "Reference solution").put("snippet", "class Queue {}");
        var input = new QuestionRequest("Implement a queue", 10, 0, "Hard", "Java", "Explanation",
                List.of(), QuestionType.ESSAY);
        var created = bank.create(List.of(new BankQuestionRequest(input, authoring))).getFirst();
        assertThat(created.testId()).isNull();
        assertThat(created.question().questionType()).isEqualTo("ESSAY");
        assertThat(bank.get(created.question().id()).authoringMetadata().get("sample").asText()).isEqualTo("Reference solution");
        tx.executeWithoutResult(status -> {
            var stored = em.find(Question.class, created.question().id());
            assertThat(stored.getTest()).isNull();
            assertThat(em.createQuery("select count(q) from QuestionSkill q where q.questionId = :id", Long.class)
                    .setParameter("id", stored.getId()).getSingleResult()).isEqualTo(1);
        });
        bank.archive(List.of(created.question().id()), true);
        assertThat(bank.get(created.question().id()).archived()).isTrue();
        bank.archive(List.of(created.question().id()), false);
        assertThat(bank.get(created.question().id()).archived()).isFalse();
    }

    @Test
    void bankUpdatesStandaloneAndCannotModifyPublishedAssessmentQuestions() {
        var created = bank.create(List.of(new BankQuestionRequest(question("Bank question", 5, 0), null))).getFirst();
        bank.update(created.question().id(), new BankQuestionRequest(question("Updated bank question", 3, 0), null));
        assertThat(bank.get(created.question().id()).question().questionText()).isEqualTo("Updated bank question");
        long testId = draft();
        var attached = questions.create(testId, question("Frozen question", 5, 0));
        questions.publish(testId);
        assertThat(bank.list(0, 100).items()).anyMatch(item -> item.question().id().equals(attached.id()) && item.testId().equals(testId));
        assertThatThrownBy(() -> bank.update(attached.id(), new BankQuestionRequest(question("Changed", 5, 0), null)))
                .isInstanceOf(BusinessException.class).hasMessageContaining("original draft test");
        assertThatThrownBy(() -> bank.archive(List.of(created.question().id(), attached.id()), true)).isInstanceOf(BusinessException.class);
        assertThat(bank.get(created.question().id()).archived()).isFalse();
        assertThat(questions.list(testId).getFirst().questionText()).isEqualTo("Frozen question");
    }

    @Test
    void bankHttpCreatesUpdatesAndArchivesWithoutCreatingAssessment() throws Exception {
        long before = tx.execute(status -> em.createQuery("select count(t) from JobTest t", Long.class).getSingleResult());
        ObjectMapper json = new ObjectMapper();
        String body = json.writeValueAsString(new BankQuestionRequest(question("HTTP bank question", 5, 0), null));
        var result = mvc.perform(post("/api/v1/question-bank/create_questions").contentType(MediaType.APPLICATION_JSON)
                .content("{\"questions\":[" + body + "]}")).andExpect(status().isCreated()).andReturn();
        long id = json.readTree(result.getResponse().getContentAsString()).path("data").get(0).path("question").path("id").asLong();
        mvc.perform(get("/api/v1/question-bank/get_question/{id}", id)).andExpect(status().isOk())
                .andExpect(jsonPath("$.data.question.questionText").value("HTTP bank question"));
        mvc.perform(put("/api/v1/question-bank/update_question/{id}", id).contentType(MediaType.APPLICATION_JSON)
                .content(json.writeValueAsString(new BankQuestionRequest(question("HTTP updated", 3, 0), null))))
                .andExpect(status().isOk()).andExpect(jsonPath("$.data.question.questionText").value("HTTP updated"));
        mvc.perform(put("/api/v1/question-bank/archive_questions").contentType(MediaType.APPLICATION_JSON)
                .content("{\"questionIds\":[" + id + "],\"archived\":true}")).andExpect(status().isOk());
        assertThat(bank.get(id).archived()).isTrue();
        Long after = tx.execute(status -> em.createQuery("select count(t) from JobTest t", Long.class).getSingleResult());
        assertThat(after).isEqualTo(before);
        mvc.perform(get("/api/v1/question-bank/get_question/9223372036854775807")).andExpect(status().isNotFound());
    }

    @Test
    void bankRejectsInvalidBatchCandidatesAndMismatchedTenants() throws Exception {
        long before = bank.list(0, 1).total();
        var invalid = new QuestionRequest("Invalid", 5, 0, "Easy", "Java", null,
                List.of(new QuestionRequest.OptionRequest("A", false), new QuestionRequest.OptionRequest("B", false)));
        assertThatThrownBy(() -> bank.create(List.of(new BankQuestionRequest(question("Valid", 5, 0), null),
                new BankQuestionRequest(invalid, null)))).isInstanceOf(BusinessException.class);
        assertThat(bank.list(0, 1).total()).isEqualTo(before);
        mvc.perform(post("/api/v1/question-bank/create_questions").contentType(MediaType.APPLICATION_JSON)
                .content("{\"questions\":[]}")).andExpect(status().isBadRequest());
        login(candidateEmail, "CANDIDATE");
        mvc.perform(get("/api/v1/question-bank/list_questions")).andExpect(status().isForbidden());
        login(recruiterEmail, "RECRUITER");
        TenantContext.setCurrentTenant("different-tenant");
        mvc.perform(get("/api/v1/question-bank/list_questions")).andExpect(status().isForbidden());
    }

    @Test
    void completeFlowSavesOnceGradesAndNeverLeaksCorrectOptions() throws Exception {
        long testId = draft();
        var first = questions.create(testId, question("One", 5, 0));
        var second = questions.create(testId, question("Two", 3, 1));
        questions.publish(testId);
        login(candidateEmail, "CANDIDATE");
        var started = submissions.start(testId, new StartSubmissionRequest(applicationId));
        assertThat(started.remainingSeconds()).isBetween(1798L, 1800L);
        assertThat(submissions.start(testId, new StartSubmissionRequest(applicationId)).id()).isEqualTo(started.id());
        var saved = submissions.save(started.id(), save(first.id(), first.options().getFirst().id()));
        submissions.save(started.id(), save(first.id(), first.options().getFirst().id()));
        assertThat(saved.answers()).hasSize(1);
        var json = new ObjectMapper().findAndRegisterModules().valueToTree(saved);
        assertThat(json.findValues("correct")).isEmpty();
        assertThat(json.findValues("isCorrect")).isEmpty();
        assertThat(json.findValues("answerText")).isEmpty();
        var result = submissions.submit(started.id());
        assertThat(result.score()).isEqualByComparingTo("5");
        assertThat(result.totalPoints()).isEqualTo(8);
        assertThat(result.passed()).isTrue();
        assertThat(result.status()).isEqualTo(TestSubmissionStatus.GRADED);
        assertThat(submissions.submit(started.id()).submittedAt()).isEqualTo(result.submittedAt());
        assertThat(submissions.start(testId, new StartSubmissionRequest(applicationId)).id()).isEqualTo(started.id());
        assertThatThrownBy(() -> submissions.save(started.id(), save(second.id(), second.options().getFirst().id())))
                .hasMessage("Submission is closed");
        tx.executeWithoutResult(status -> assertThat(em.createQuery("select count(a) from Answer a where a.submission.id = :id", Long.class)
                .setParameter("id", started.id()).getSingleResult()).isEqualTo(1));
        login(recruiterEmail, "RECRUITER");
        assertThat(submissions.staffResult(started.id()).score()).isEqualByComparingTo("5");
    }

    @Test
    void draftOptionsCanBeReplacedDeletedButPublishedPaperIsFrozen() {
        long id = draft();
        var initial = questions.create(id, question("Original", 5, 0));
        var changed = questions.update(id, initial.id(), question("Changed", 5, 0));
        assertThat(changed.options().getFirst().id()).isNotEqualTo(initial.options().getFirst().id());
        questions.delete(id, changed.id());
        assertThat(questions.list(id)).isEmpty();
        assertThatThrownBy(() -> questions.publish(id)).hasMessageContaining("1 to 100");
        questions.create(id, question("Final", 5, 0));
        questions.publish(id);
        assertThatThrownBy(() -> questions.create(id, question("New", 1, 1))).hasMessageContaining("Only draft");
        assertThatThrownBy(() -> assessments.update(id, request())).hasMessageContaining("Only draft");
    }

    @Test
    void validatesCorrectOptionAndPassingThreshold() {
        long id = draft();
        var bad = new QuestionRequest("Bad", 5, 0, null, null, null, List.of(
                new QuestionRequest.OptionRequest("A", true), new QuestionRequest.OptionRequest("B", true)));
        assertThatThrownBy(() -> questions.create(id, bad)).hasMessageContaining("Exactly one");
        questions.create(id, question("Low points", 1, 0));
        assertThatThrownBy(() -> questions.publish(id)).hasMessageContaining("Passing score");
    }

    @Test
    void candidatesCannotAuthorOrReadOthersSubmissions() throws Exception {
        long id = published();
        login(candidateEmail, "CANDIDATE");
        var started = submissions.start(id, new StartSubmissionRequest(applicationId));
        assertThatThrownBy(() -> questions.list(id)).hasMessage("Staff access required");
        assertThatThrownBy(() -> questions.create(id, question("Bad", 1, 0))).hasMessage("Staff access required");
        login(otherEmail, "CANDIDATE");
        assertThatThrownBy(() -> submissions.start(id, new StartSubmissionRequest(applicationId))).hasMessageContaining("not found");
        mvc.perform(get("/api/v1/submissions/{id}/get_submission", started.id())).andExpect(status().isNotFound());
        mvc.perform(post("/api/v1/submissions/{id}/submit_test", started.id())).andExpect(status().isNotFound());
        mvc.perform(post("/api/v1/submissions/{id}/save_answers", started.id()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"answers\":[{\"questionId\":1,\"selectedOptionId\":null}]}"))
                .andExpect(status().isNotFound());
        assertThatThrownBy(() -> submissions.staffResult(started.id())).hasMessage("Staff access required");
        login(recruiterEmail, "RECRUITER");
        assertThatThrownBy(() -> submissions.submit(started.id())).hasMessage("Candidate access required");
        TenantContext.setCurrentTenant("another_tenant");
        assertThatThrownBy(() -> questions.list(id)).hasMessage("Tenant access required");
    }

    @Test
    void rejectsForeignQuestionsOptionsAndRollsBackWholeBatch() {
        long id = draft();
        var first = questions.create(id, question("One", 5, 0));
        var second = questions.create(id, question("Two", 5, 1));
        questions.publish(id);
        long otherTest = draft();
        var foreign = questions.create(otherTest, question("Foreign", 5, 0));
        login(candidateEmail, "CANDIDATE");
        long submission = submissions.start(id, new StartSubmissionRequest(applicationId)).id();
        submissions.save(submission, save(first.id(), first.options().getFirst().id()));
        var bad = new SaveAnswersRequest(List.of(
                new SaveAnswersRequest.AnswerInput(first.id(), first.options().getLast().id()),
                new SaveAnswersRequest.AnswerInput(second.id(), first.options().getFirst().id())));
        assertThatThrownBy(() -> submissions.save(submission, bad)).hasMessageContaining("Option does not belong");
        assertThat(submissions.get(submission).answers().getFirst().selectedOptionId()).isEqualTo(first.options().getFirst().id());
        assertThatThrownBy(() -> submissions.save(submission, save(foreign.id(), foreign.options().getFirst().id())))
                .hasMessageContaining("Question does not belong");
        var duplicate = new SaveAnswersRequest(List.of(new SaveAnswersRequest.AnswerInput(first.id(), null),
                new SaveAnswersRequest.AnswerInput(first.id(), null)));
        assertThatThrownBy(() -> submissions.save(submission, duplicate)).hasMessageContaining("Duplicate");
        submissions.save(submission, save(first.id(), null));
        assertThat(submissions.submit(submission).score()).isEqualByComparingTo("0");
    }

    @Test
    void lateSaveCommitsExpirationButRejectsPayload() {
        long id = published();
        var question = questions.list(id).getFirst();
        login(candidateEmail, "CANDIDATE");
        long submission = submissions.start(id, new StartSubmissionRequest(applicationId)).id();
        submissions.save(submission, save(question.id(), question.options().getFirst().id()));
        tx.executeWithoutResult(status -> em.find(Submission.class, submission).setStartedAt(Instant.now().minusSeconds(1900)));
        assertThatThrownBy(() -> submissions.save(submission, save(question.id(), question.options().getLast().id())))
                .isInstanceOf(SubmissionExpiredException.class);
        tx.executeWithoutResult(status -> {
            Submission stored = em.find(Submission.class, submission);
            assertThat(stored.getStatus()).isEqualTo(TestSubmissionStatus.EXPIRED);
            assertThat(stored.getScore()).isEqualByComparingTo("5");
        });
        assertThat(submissions.submit(submission).remainingSeconds()).isZero();
    }

    @Test
    void draftOrIneligibleApplicationCannotStart() {
        long id = draft();
        login(candidateEmail, "CANDIDATE");
        assertThatThrownBy(() -> submissions.start(id, new StartSubmissionRequest(applicationId)))
                .hasMessage("Test is not available");
        login(recruiterEmail, "RECRUITER");
        questions.create(id, question("One", 5, 0)); questions.publish(id);
        tx.executeWithoutResult(status -> em.find(Application.class, applicationId).setStatus(ApplicationStatus.NEW));
        login(candidateEmail, "CANDIDATE");
        assertThatThrownBy(() -> submissions.start(id, new StartSubmissionRequest(applicationId)))
                .hasMessageContaining("not eligible");
    }

    @Test
    void candidateDiscoveryOnlyListsPublishedTestsForOwnedApplication() {
        long testId = published();
        draft();
        login(candidateEmail, "CANDIDATE");
        assertThat(submissions.available(applicationId)).hasSize(1);
        assertThat(submissions.available(applicationId).getFirst().id()).isEqualTo(testId);
        long submissionId = submissions.start(testId, new StartSubmissionRequest(applicationId)).id();
        assertThat(submissions.available(applicationId).getFirst().submissionId()).isEqualTo(submissionId);
        login(otherEmail, "CANDIDATE");
        assertThatThrownBy(() -> submissions.available(applicationId)).hasMessageContaining("not found");
    }

    @Test
    void httpValidationRejectsNestedInvalidOptionsAndEmptyAnswers() throws Exception {
        long id = draft();
        mvc.perform(post("/api/v1/assessments/{id}/create_question", id).contentType(MediaType.APPLICATION_JSON)
                .content("{\"questionText\":\"Question\",\"points\":1,\"questionOrder\":0,\"options\":[null,null]}"))
                .andExpect(status().isBadRequest());
        mvc.perform(post("/api/v1/submissions/1/save_answers").contentType(MediaType.APPLICATION_JSON)
                .content("{\"answers\":[]}")).andExpect(status().isBadRequest());
    }

    @Test
    void simultaneousStartAndSubmitAreIdempotent() throws Exception {
        long testId = published();
        var question = questions.list(testId).getFirst();
        var started = parallel(() -> submissions.start(testId, new StartSubmissionRequest(applicationId)));
        assertThat(started.getFirst().id()).isEqualTo(started.getLast().id());
        long id = started.getFirst().id();
        parallel(() -> submissions.save(id, save(question.id(), question.options().getFirst().id())));
        var results = parallel(() -> submissions.submit(id));
        assertThat(results.getFirst().submittedAt()).isEqualTo(results.getLast().submittedAt());
        assertThat(results.getFirst().score()).isEqualByComparingTo("5");
        tx.executeWithoutResult(status -> assertThat(em.createQuery("select count(a) from Answer a where a.submission.id = :id", Long.class)
                .setParameter("id", id).getSingleResult()).isEqualTo(1));
        tx.executeWithoutResult(status -> assertThat(em.createQuery("select count(s) from Submission s where s.test.id = :id", Long.class)
                .setParameter("id", testId).getSingleResult()).isEqualTo(1));
    }

    @Test
    void activatesExistingNotStartedSubmissionWithoutCreatingAnother() {
        long testId = published();
        long id = tx.execute(status -> {
            Submission submission = new Submission();
            submission.setTest(em.find(JobTest.class, testId));
            submission.setApplication(em.find(Application.class, applicationId));
            submission.setCandidate(em.find(User.class, candidateId));
            em.persist(submission); em.flush(); return submission.getId();
        });
        login(candidateEmail, "CANDIDATE");
        var result = submissions.start(testId, new StartSubmissionRequest(applicationId));
        assertThat(result.id()).isEqualTo(id);
        assertThat(result.status()).isEqualTo(TestSubmissionStatus.IN_PROGRESS);
        assertThat(result.startedAt()).isNotNull();
    }

    @Test
    void getFinalizesExpiredSubmissionWithoutClientSubmit() {
        long id = published();
        login(candidateEmail, "CANDIDATE");
        long submissionId = submissions.start(id, new StartSubmissionRequest(applicationId)).id();
        tx.executeWithoutResult(status -> em.find(Submission.class, submissionId).setStartedAt(Instant.now().minusSeconds(1900)));
        var result = submissions.get(submissionId);
        assertThat(result.status()).isEqualTo(TestSubmissionStatus.EXPIRED);
        assertThat(result.score()).isEqualByComparingTo("0");
        assertThat(result.submittedAt()).isEqualTo(result.expiresAt());
    }

    @Test
    void sameCandidateCannotUseApplicationForDifferentJob() {
        long id = published();
        long foreignApplication = tx.execute(status -> {
            Job job = new Job(); job.setTitle("Other"); job.setDescription("Other");
            job.setCreatedBy(em.find(Job.class, jobId).getCreatedBy()); em.persist(job);
            Application app = new Application(); app.setJob(job); app.setCandidate(em.find(User.class, candidateId));
            app.setStatus(ApplicationStatus.ASSESSMENT); em.persist(app); em.flush(); return app.getId();
        });
        login(candidateEmail, "CANDIDATE");
        assertThatThrownBy(() -> submissions.start(id, new StartSubmissionRequest(foreignApplication))).hasMessageContaining("not found");
    }

    @Test
    void multipleChoicePersistsSelectionsAndRequiresExactCorrectSet() {
        long id = draft();
        var q = questions.create(id, multiQuestion());
        questions.publish(id);
        login(candidateEmail, "CANDIDATE");
        long submission = submissions.start(id, new StartSubmissionRequest(applicationId)).id();
        var correct = q.options().stream().filter(QuestionResponse.OptionResponse::correct).map(QuestionResponse.OptionResponse::id).toList();
        submissions.save(submission, multiSave(q.id(), List.of(correct.getFirst())));
        submissions.save(submission, multiSave(q.id(), correct));
        assertThat(submissions.get(submission).answers().getFirst().selectedOptionIds()).containsExactlyElementsOf(correct);
        submissions.save(submission, multiSave(q.id(), List.of()));
        assertThat(submissions.get(submission).answers().getFirst().selectedOptionIds()).isEmpty();
        submissions.save(submission, multiSave(q.id(), correct));
        assertThatThrownBy(() -> submissions.save(submission, multiSave(q.id(), List.of(correct.getFirst(), correct.getFirst()))))
                .hasMessageContaining("duplicate");
        assertThatThrownBy(() -> submissions.save(submission, multiSave(q.id(), List.of(Long.MAX_VALUE))))
                .hasMessageContaining("Option does not belong");
        assertThat(submissions.submit(submission).score()).isEqualByComparingTo("5");

        login(recruiterEmail, "RECRUITER");
        long partialTest = draft();
        var partial = questions.create(partialTest, multiQuestion());
        questions.publish(partialTest);
        login(candidateEmail, "CANDIDATE");
        long partialSubmission = submissions.start(partialTest, new StartSubmissionRequest(applicationId)).id();
        submissions.save(partialSubmission, multiSave(partial.id(), List.of(partial.options().getFirst().id())));
        assertThat(submissions.submit(partialSubmission).score()).isEqualByComparingTo("0");
    }

    @Test
    void essayAndMixedPaperPersistTextAndWaitForReviewIncludingExpiration() throws Exception {
        long id = draft();
        var essay = questions.create(id, new QuestionRequest("Explain", 5, 0, null, null, "Staff rubric",
                List.of(), QuestionType.ESSAY));
        var mcq = questions.create(id, question("Choice", 5, 1));
        questions.publish(id);
        login(candidateEmail, "CANDIDATE");
        long submission = submissions.start(id, new StartSubmissionRequest(applicationId)).id();
        mvc.perform(post("/api/v1/submissions/{id}/save_answers", submission).contentType(MediaType.APPLICATION_JSON)
                .content("{\"answers\":[{\"questionId\":" + essay.id() + ",\"answerText\":\"My reasoning\"}]}"))
                .andExpect(status().isOk());
        assertThat(submissions.get(submission).answers().getFirst().answerText()).isEqualTo("My reasoning");
        assertThatThrownBy(() -> submissions.save(submission, save(essay.id(), mcq.options().getFirst().id())))
                .hasMessageContaining("Essay answers cannot select");
        submissions.save(submission, save(mcq.id(), mcq.options().getFirst().id()));
        var result = submissions.submit(submission);
        assertThat(result.status()).isEqualTo(TestSubmissionStatus.SUBMITTED);
        assertThat(result.score()).isNull();
        assertThat(result.passed()).isNull();
        assertThat(submissions.submit(submission).submittedAt()).isEqualTo(result.submittedAt());
        assertThatThrownBy(() -> submissions.save(submission, new SaveAnswersRequest(List.of(
                new SaveAnswersRequest.AnswerInput(essay.id(), null, null, "Changed")))))
                .hasMessage("Submission is closed");
        tx.executeWithoutResult(status -> {
            var stored = em.find(Submission.class, submission);
            stored.setStatus(TestSubmissionStatus.IN_PROGRESS);
            stored.setStartedAt(Instant.now().minusSeconds(1900));
        });
        var expired = submissions.get(submission);
        assertThat(expired.status()).isEqualTo(TestSubmissionStatus.EXPIRED);
        assertThat(expired.score()).isNull();
        assertThat(expired.answers().getFirst().answerText()).isEqualTo("My reasoning");
    }

    @Test
    void validatesTypeSpecificAuthoringAndRejectsUnknownTypesOverHttp() throws Exception {
        long id = draft();
        assertThatThrownBy(() -> questions.create(id, new QuestionRequest("Bad", 5, 0, null, null, null,
                multiQuestion().options(), QuestionType.ESSAY))).hasMessageContaining("must not have options");
        assertThatThrownBy(() -> questions.create(id, new QuestionRequest("Bad", 5, 0, null, null, null,
                question("Q", 5, 0).options(), QuestionType.MULTIPLE_CHOICE))).hasMessageContaining("at least two");
        mvc.perform(post("/api/v1/assessments/{id}/create_question", id).contentType(MediaType.APPLICATION_JSON)
                .content("{\"questionText\":\"Explain\",\"points\":5,\"questionOrder\":0,\"questionType\":\"ESSAY\"}"))
                .andExpect(status().isCreated());
        mvc.perform(post("/api/v1/assessments/{id}/create_question", id).contentType(MediaType.APPLICATION_JSON)
                .content("{\"questionText\":\"Bad\",\"points\":5,\"questionOrder\":0,\"questionType\":\"UNKNOWN\"}"))
                .andExpect(status().isBadRequest());
    }

    private QuestionRequest multiQuestion() {
        return new QuestionRequest("Choose both", 5, 0, null, null, null, List.of(
                new QuestionRequest.OptionRequest("A", true), new QuestionRequest.OptionRequest("B", true),
                new QuestionRequest.OptionRequest("C", false)), QuestionType.MULTIPLE_CHOICE);
    }

    private SaveAnswersRequest multiSave(Long questionId, List<Long> ids) {
        return new SaveAnswersRequest(List.of(new SaveAnswersRequest.AnswerInput(questionId, null, ids, null)));
    }

    private List<SubmissionResponse> parallel(Callable<SubmissionResponse> action) throws Exception {
        try (var executor = Executors.newFixedThreadPool(2)) {
            var gate = new CountDownLatch(2);
            Callable<SubmissionResponse> task = () -> {
                login(candidateEmail, "CANDIDATE");
                try { gate.countDown(); if (!gate.await(5, TimeUnit.SECONDS)) throw new IllegalStateException("Timeout"); return action.call(); }
                finally { cleanup(); }
            };
            var first = executor.submit(task); var second = executor.submit(task);
            return List.of(first.get(15, TimeUnit.SECONDS), second.get(15, TimeUnit.SECONDS));
        }
    }

    private User user(String email, String role) {
        User user = new User(); user.setEmail(email); user.setFullName("Test user"); user.setRole(role); em.persist(user); return user;
    }
    private void login(String email, String role) {
        TenantContext.setCurrentTenant("assessment_tenant");
        var authentication = new UsernamePasswordAuthenticationToken(email, null, List.of(new SimpleGrantedAuthority("ROLE_" + role)));
        authentication.setDetails("assessment_tenant"); SecurityContextHolder.getContext().setAuthentication(authentication);
    }
    private JobTestRequest request() { return new JobTestRequest(jobId, "Java", null, 30, BigDecimal.valueOf(5)); }
    private long draft() { return assessments.create(request()).id(); }
    private long published() { long id = draft(); questions.create(id, question("One", 5, 0)); questions.publish(id); return id; }
    private QuestionRequest question(String text, int points, int order) {
        return new QuestionRequest(text, points, order, "Easy", "Java", null,
                List.of(new QuestionRequest.OptionRequest("Correct", true),
                new QuestionRequest.OptionRequest("Incorrect", false)));
    }
    private SaveAnswersRequest save(Long questionId, Long optionId) {
        return new SaveAnswersRequest(List.of(new SaveAnswersRequest.AnswerInput(questionId, optionId)));
    }
}
