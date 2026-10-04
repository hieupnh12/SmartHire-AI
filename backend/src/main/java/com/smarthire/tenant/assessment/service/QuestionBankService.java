package com.smarthire.tenant.assessment.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.smarthire.common.exception.BusinessException;
import com.smarthire.domain.tenant.entity.Option;
import com.smarthire.domain.tenant.entity.Question;
import com.smarthire.domain.tenant.entity.QuestionSkill;
import com.smarthire.domain.tenant.entity.Skill;
import com.smarthire.domain.tenant.repository.OptionRepository;
import com.smarthire.domain.tenant.repository.QuestionRepository;
import com.smarthire.domain.tenant.repository.QuestionSkillRepository;
import com.smarthire.domain.tenant.repository.SkillRepository;
import com.smarthire.tenant.assessment.dto.request.BankQuestionRequest;
import com.smarthire.tenant.assessment.dto.response.BankQuestionPage;
import com.smarthire.tenant.assessment.dto.response.BankQuestionResponse;
import com.smarthire.tenant.assessment.mapper.AssessmentMapper;
import com.smarthire.tenant.cv.service.CvAccess;
import java.util.List;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Service
public class QuestionBankService {
    private final QuestionRepository questions;
    private final OptionRepository options;
    private final SkillRepository skills;
    private final QuestionSkillRepository questionSkills;
    private final CvAccess access;
    private final AssessmentMapper mapper;

    public QuestionBankService(QuestionRepository questions, OptionRepository options, SkillRepository skills,
            QuestionSkillRepository questionSkills, CvAccess access, AssessmentMapper mapper) {
        this.questions = questions;
        this.options = options;
        this.skills = skills;
        this.questionSkills = questionSkills;
        this.access = access;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public BankQuestionPage list(int page, int size) {
        staff();
        var result = questions.findAll(PageRequest.of(Math.max(0, page), Math.max(1, Math.min(100, size)),
                Sort.by(Sort.Direction.DESC, "id")));
        return new BankQuestionPage(result.getContent().stream().map(this::response).toList(),
                result.getTotalElements(), result.getNumber(), result.getSize());
    }

    @Transactional(readOnly = true)
    public BankQuestionResponse get(long id) {
        staff();
        return response(questions.findById(id).orElseThrow(this::notFound));
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public List<BankQuestionResponse> create(List<BankQuestionRequest> requests) {
        staff();
        // Validate the complete batch before writing; any later failure rolls back every row.
        requests.forEach(this::validate);
        return requests.stream().map(request -> {
            Question question = new Question();
            QuestionService.apply(question, request.question());
            question.setAuthoringMetadata(metadata(request.authoringMetadata()));
            questions.save(question);
            replaceOptions(question, request);
            syncSkill(question);
            return response(question);
        }).toList();
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public BankQuestionResponse update(long id, BankQuestionRequest request) {
        staff();
        Question question = standalone(id);
        validate(request);
        QuestionService.apply(question, request.question());
        question.setAuthoringMetadata(metadata(request.authoringMetadata()));
        questions.save(question);
        replaceOptions(question, request);
        syncSkill(question);
        return response(question);
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void archive(List<Long> ids, boolean archived) {
        staff();
        var locked = ids.stream().distinct().sorted().map(this::standalone).toList();
        locked.forEach(question -> question.setBankArchived(archived));
    }

    private void staff() {
        // CvAccess verifies the JWT tenant against TenantContext before any repository access.
        if (!access.staff()) throw new BusinessException("Staff access required", HttpStatus.FORBIDDEN, "ASSESSMENT_FORBIDDEN");
        access.actor();
    }

    private Question standalone(long id) {
        Question question = questions.findLockedById(id).orElseThrow(this::notFound);
        if (question.getTest() != null) {
            throw new BusinessException("Edit assessment questions in their original draft test",
                    HttpStatus.CONFLICT, "BANK_QUESTION_IN_TEST");
        }
        return question;
    }

    private void validate(BankQuestionRequest request) {
        QuestionService.validateOptions(request.question());
        String skill = request.question().skill();
        if (skill == null || skill.isBlank() || skill.trim().length() > 128) {
            throw invalid("Skill is required and must contain at most 128 characters");
        }
        if (request.question().difficulty() == null || request.question().difficulty().isBlank()) {
            throw invalid("Difficulty is required");
        }
        // Reuse canonical difficulty and type checks from assessment authoring.
        QuestionService.apply(new Question(), request.question());
        metadata(request.authoringMetadata());
    }

    private JsonNode metadata(JsonNode node) {
        if (node == null || node.isNull()) return null;
        if (!node.isObject() || node.toString().length() > 100000) throw invalid("Invalid authoring metadata");
        var fields = node.fields();
        while (fields.hasNext()) {
            var field = fields.next();
            if ("rubric".equals(field.getKey())) {
                if (!field.getValue().isArray() || field.getValue().size() > 3) throw invalid("Invalid rubric metadata");
                for (JsonNode item : field.getValue()) {
                    if (!item.isObject() || !item.path("level").isTextual()
                            || !List.of("excellent", "pass", "fail").contains(item.path("level").asText())
                            || !item.path("text").isTextual() || item.path("text").asText().length() > 10000) {
                        throw invalid("Invalid rubric metadata");
                    }
                }
            } else if (!field.getValue().isTextual() || field.getValue().asText().length() > 10000) {
                throw invalid("Authoring metadata fields must be text with at most 10000 characters");
            }
        }
        return node.deepCopy();
    }

    private void replaceOptions(Question question, BankQuestionRequest request) {
        options.deleteAll(options.findByQuestion_IdOrderByIdAsc(question.getId()));
        options.flush();
        options.saveAll(request.question().options().stream().map(input -> {
            Option option = new Option();
            option.setQuestion(question);
            option.setOptionText(input.optionText().trim());
            option.setCorrect(input.correct());
            return option;
        }).toList());
    }

    private void syncSkill(Question question) {
        Skill skill = skills.findByNameIgnoreCase(question.getSkill()).orElseGet(() -> {
            Skill created = new Skill();
            created.setName(question.getSkill());
            return skills.save(created);
        });
        questionSkills.deleteByQuestionId(question.getId());
        questionSkills.flush();
        QuestionSkill link = new QuestionSkill();
        link.setQuestionId(question.getId());
        link.setSkillId(skill.getId());
        questionSkills.save(link);
    }

    private BankQuestionResponse response(Question question) {
        var test = question.getTest();
        var job = test == null ? null : test.getJob();
        return new BankQuestionResponse(mapper.question(question, options.findByQuestion_IdOrderByIdAsc(question.getId())),
                test == null ? null : test.getId(), test == null ? null : test.getTitle(),
                test == null ? null : test.getStatus().name(), job == null ? null : job.getId(),
                job == null ? null : job.getTitle(), question.isBankArchived(), question.getAuthoringMetadata());
    }

    private BusinessException invalid(String message) {
        return new BusinessException(message, HttpStatus.BAD_REQUEST, "INVALID_BANK_QUESTION");
    }

    private BusinessException notFound() {
        return new BusinessException("Question not found", HttpStatus.NOT_FOUND, "BANK_QUESTION_NOT_FOUND");
    }
}
