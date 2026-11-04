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
import com.smarthire.domain.enums.TestStatus;
import com.smarthire.tenant.assessment.dto.request.BankQuestionRequest;
import com.smarthire.tenant.assessment.dto.response.BankQuestionCounts;
import com.smarthire.tenant.assessment.dto.response.BankQuestionPage;
import com.smarthire.tenant.assessment.dto.response.BankQuestionResponse;
import com.smarthire.tenant.assessment.mapper.AssessmentMapper;
import com.smarthire.tenant.cv.service.CvAccess;
import java.util.List;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

import com.smarthire.domain.tenant.repository.JobSkillRepository;

@Service
public class QuestionBankService {
    private final QuestionRepository questions;
    private final OptionRepository options;
    private final SkillRepository skills;
    private final QuestionSkillRepository questionSkills;
    private final CvAccess access;
    private final AssessmentMapper mapper;
    private final JobSkillRepository jobSkills;

    @org.springframework.beans.factory.annotation.Autowired
    public QuestionBankService(QuestionRepository questions, OptionRepository options, SkillRepository skills,
            QuestionSkillRepository questionSkills, CvAccess access, AssessmentMapper mapper,
            @org.springframework.beans.factory.annotation.Autowired(required = false) JobSkillRepository jobSkills) {
        this.questions = questions;
        this.options = options;
        this.skills = skills;
        this.questionSkills = questionSkills;
        this.access = access;
        this.mapper = mapper;
        this.jobSkills = jobSkills;
    }

    public QuestionBankService(QuestionRepository questions, OptionRepository options, SkillRepository skills,
            QuestionSkillRepository questionSkills, CvAccess access, AssessmentMapper mapper) {
        this(questions, options, skills, questionSkills, access, mapper, null);
    }

    @Transactional(readOnly = true)
    public BankQuestionPage list(int page, int size) {
        return list(page, size, null, null, null, null, null, null, null, "latest", List.of(), null);
    }

    @Transactional(readOnly = true)
    public BankQuestionPage list(int page, int size, String collection, String query, String skill,
            String difficulty, String status, String questionType, String source, String sort, List<Long> favoriteIds) {
        return list(page, size, collection, query, skill, difficulty, status, questionType, source, sort, favoriteIds, null);
    }

    @Transactional(readOnly = true)
    public BankQuestionPage list(int page, int size, String collection, String query, String skill,
            String difficulty, String status, String questionType, String source, String sort, List<Long> favoriteIds, Long jobId) {
        staff();
        List<Long> safeFavoriteIds = favoriteIds == null ? List.of() : favoriteIds;
        var result = questions.findAll(filters(collection, query, skill, difficulty, status, questionType, source,
                        safeFavoriteIds, jobId),
                PageRequest.of(Math.max(0, page), Math.max(1, Math.min(100, size)), sorting(sort)));

        BankQuestionCounts counts;
        if (jobId == null) {
            counts = new BankQuestionCounts(questions.count(), safeFavoriteIds.isEmpty() ? 0 : questions.countByIdIn(safeFavoriteIds),
                    questions.countByTest_Status(TestStatus.PUBLISHED), questions.countByTest_Status(TestStatus.DRAFT),
                    questions.countByBankArchivedTrue());
        } else {
            Specification<Question> baseJobSpec = filters(null, null, null, null, null, null, null, safeFavoriteIds, jobId);
            long allCount = questions.count(baseJobSpec);
            long favCount = safeFavoriteIds.isEmpty() ? 0 : questions.count(baseJobSpec.and(filters("favorites", null, null, null, null, null, null, safeFavoriteIds, jobId)));
            long readyCount = questions.count(baseJobSpec.and(filters("ready", null, null, null, null, null, null, safeFavoriteIds, jobId)));
            long pendingCount = questions.count(baseJobSpec.and(filters("pending", null, null, null, null, null, null, safeFavoriteIds, jobId)));
            long archivedCount = questions.count(baseJobSpec.and(filters("archived", null, null, null, null, null, null, safeFavoriteIds, jobId)));
            counts = new BankQuestionCounts(allCount, favCount, readyCount, pendingCount, archivedCount);
        }

        List<String> distinctSkills = questions.findDistinctSkills();
        if (jobId != null && jobSkills != null) {
            List<String> jobSpecificSkills = jobSkills.findByJob_IdOrderByIdAsc(jobId).stream()
                    .map(js -> js.getSkill() != null ? js.getSkill().getName() : null)
                    .filter(name -> name != null && !name.isBlank())
                    .distinct()
                    .toList();
            var set = new java.util.LinkedHashSet<String>(jobSpecificSkills);
            set.addAll(distinctSkills);
            distinctSkills = new java.util.ArrayList<>(set);
        }

        return new BankQuestionPage(result.getContent().stream().map(this::response).toList(),
                result.getTotalElements(), result.getNumber(), result.getSize(), counts, distinctSkills);
    }

    private Specification<Question> filters(String collection, String query, String skill, String difficulty,
            String status, String questionType, String source, List<Long> favoriteIds, Long jobId) {
        return (root, criteria, cb) -> {
            var predicates = new java.util.ArrayList<jakarta.persistence.criteria.Predicate>();
            var test = root.join("test", jakarta.persistence.criteria.JoinType.LEFT);
            var job = test.join("job", jakarta.persistence.criteria.JoinType.LEFT);

            if (jobId != null) {
                var jobPredicateList = new java.util.ArrayList<jakarta.persistence.criteria.Predicate>();
                jobPredicateList.add(cb.equal(job.get("id"), jobId));

                List<String> jobSkillNames = List.of();
                if (jobSkills != null) {
                    jobSkillNames = jobSkills.findByJob_IdOrderByIdAsc(jobId).stream()
                            .map(js -> js.getSkill() != null ? js.getSkill().getName() : null)
                            .filter(name -> name != null && !name.isBlank())
                            .map(String::trim)
                            .map(String::toLowerCase)
                            .distinct()
                            .toList();
                }

                if (!jobSkillNames.isEmpty()) {
                    var notBankArchived = cb.or(cb.isNull(root.get("bankArchived")), cb.isFalse(root.get("bankArchived")));
                    var notTestArchived = cb.or(cb.isNull(test.get("status")), cb.notEqual(test.get("status"), TestStatus.ARCHIVED));
                    var skillMatch = cb.lower(root.get("skill")).in(jobSkillNames);
                    jobPredicateList.add(cb.and(notBankArchived, notTestArchived, skillMatch));
                }

                predicates.add(cb.or(jobPredicateList.toArray(jakarta.persistence.criteria.Predicate[]::new)));
            }

            if ("favorites".equalsIgnoreCase(collection)) {
                predicates.add(favoriteIds.isEmpty() ? cb.disjunction() : root.get("id").in(favoriteIds));
            } else if ("ready".equalsIgnoreCase(collection)) {
                predicates.add(cb.equal(test.get("status"), TestStatus.PUBLISHED));
            } else if ("pending".equalsIgnoreCase(collection)) {
                predicates.add(cb.or(cb.isNull(test.get("status")), cb.equal(test.get("status"), TestStatus.DRAFT)));
            } else if ("archived".equalsIgnoreCase(collection)) {
                predicates.add(cb.or(cb.isTrue(root.get("bankArchived")), cb.equal(test.get("status"), TestStatus.ARCHIVED)));
            }

            if (query != null && !query.isBlank()) {
                String trimmed = query.trim();
                String term = "%" + trimmed.toLowerCase() + "%";
                var queryPredicates = new java.util.ArrayList<jakarta.persistence.criteria.Predicate>();
                queryPredicates.add(cb.like(cb.lower(root.get("questionText")), term));
                queryPredicates.add(cb.like(cb.lower(root.get("skill")), term));
                queryPredicates.add(cb.like(cb.lower(test.get("title")), term));
                queryPredicates.add(cb.like(cb.lower(job.get("title")), term));

                String cleanNum = trimmed.replaceAll("(?i)^#?qb-?", "");
                try {
                    long idVal = Long.parseLong(cleanNum);
                    queryPredicates.add(cb.equal(root.get("id"), idVal));
                } catch (NumberFormatException ignored) {}

                predicates.add(cb.or(queryPredicates.toArray(jakarta.persistence.criteria.Predicate[]::new)));
            }

            if (skill != null && !skill.isBlank()) {
                predicates.add(cb.equal(cb.lower(root.get("skill")), skill.trim().toLowerCase()));
            }

            if (difficulty != null && !difficulty.isBlank()) {
                String diff = difficulty.trim();
                if ("Cơ bản".equalsIgnoreCase(diff) || "Easy".equalsIgnoreCase(diff)) {
                    predicates.add(cb.or(
                            cb.equal(cb.lower(root.get("difficulty")), "easy"),
                            cb.and(cb.isNull(root.get("difficulty")), cb.le(root.get("points"), 5))));
                } else if ("Vận dụng".equalsIgnoreCase(diff) || "Medium".equalsIgnoreCase(diff)) {
                    predicates.add(cb.or(
                            cb.equal(cb.lower(root.get("difficulty")), "medium"),
                            cb.and(cb.isNull(root.get("difficulty")), cb.gt(root.get("points"), 5), cb.le(root.get("points"), 15))));
                } else if ("Nâng cao".equalsIgnoreCase(diff) || "Hard".equalsIgnoreCase(diff)) {
                    predicates.add(cb.or(
                            cb.equal(cb.lower(root.get("difficulty")), "hard"),
                            cb.and(cb.isNull(root.get("difficulty")), cb.gt(root.get("points"), 15))));
                } else {
                    predicates.add(cb.equal(cb.lower(root.get("difficulty")), diff.toLowerCase()));
                }
            }

            if ("QUIZ".equals(questionType)) {
                predicates.add(root.get("questionType").in("MCQ", "MULTIPLE_CHOICE"));
            } else if (questionType != null && !questionType.isBlank()) {
                predicates.add(cb.equal(root.get("questionType"), questionType));
            }

            if ("ARCHIVED".equalsIgnoreCase(status)) {
                predicates.add(cb.or(cb.isTrue(root.get("bankArchived")), cb.equal(test.get("status"), TestStatus.ARCHIVED)));
            } else if ("DRAFT".equalsIgnoreCase(status)) {
                predicates.add(cb.or(cb.isNull(test.get("status")), cb.equal(test.get("status"), TestStatus.DRAFT)));
            } else if ("PUBLISHED".equalsIgnoreCase(status)) {
                predicates.add(cb.equal(test.get("status"), TestStatus.PUBLISHED));
            }

            if ("AI".equalsIgnoreCase(source)) {
                var meta = root.get("authoringMetadata").as(String.class);
                predicates.add(cb.or(
                        cb.like(cb.lower(meta), "%\"aigenerated\":true%"),
                        cb.like(cb.lower(meta), "%\"aigenerated\": true%"),
                        cb.like(cb.lower(meta), "%\"source\":\"ai\"%"),
                        cb.like(cb.lower(meta), "%\"source\": \"ai\"%")));
            }

            return cb.and(predicates.toArray(jakarta.persistence.criteria.Predicate[]::new));
        };
    }

    private Sort sorting(String sort) {
        if ("points".equalsIgnoreCase(sort)) {
            return Sort.by(Sort.Direction.DESC, "points").and(Sort.by(Sort.Direction.DESC, "id"));
        }
        if ("text".equalsIgnoreCase(sort)) {
            return Sort.by(Sort.Direction.ASC, "questionText").and(Sort.by(Sort.Direction.DESC, "id"));
        }
        return Sort.by(Sort.Direction.DESC, "id");
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
            JsonNode val = field.getValue();
            if ("rubric".equals(field.getKey())) {
                if (!val.isArray() || val.size() > 3) throw invalid("Invalid rubric metadata");
                for (JsonNode item : val) {
                    if (!item.isObject() || !item.path("level").isTextual()
                            || !List.of("excellent", "pass", "fail").contains(item.path("level").asText())
                            || !item.path("text").isTextual() || item.path("text").asText().length() > 10000) {
                        throw invalid("Invalid rubric metadata");
                    }
                }
            } else if ("similarQuestionIds".equals(field.getKey())) {
                if (!val.isArray() || val.size() > 100) throw invalid("Invalid similar question ids metadata");
                for (JsonNode item : val) {
                    if (!item.isIntegralNumber()) throw invalid("Invalid similar question id");
                }
            } else if (val.isBoolean() || val.isNumber() || val.isNull()) {
                // Primitive metadata values (e.g. aiGenerated: true) are allowed
            } else if (val.isTextual()) {
                if (val.asText().length() > 10000) {
                    throw invalid("Authoring metadata fields must be text with at most 10000 characters");
                }
            } else {
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
