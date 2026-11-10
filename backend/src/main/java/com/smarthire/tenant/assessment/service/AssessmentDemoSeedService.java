package com.smarthire.tenant.assessment.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.smarthire.domain.enums.TestStatus;
import com.smarthire.domain.tenant.entity.CodingProblem;
import com.smarthire.domain.tenant.entity.Job;
import com.smarthire.domain.tenant.entity.JobTest;
import com.smarthire.domain.tenant.entity.Option;
import com.smarthire.domain.tenant.entity.Question;
import com.smarthire.domain.tenant.entity.TestCase;
import com.smarthire.domain.tenant.repository.CodingProblemRepository;
import com.smarthire.domain.tenant.repository.JobTestRepository;
import com.smarthire.domain.tenant.repository.OptionRepository;
import com.smarthire.domain.tenant.repository.QuestionRepository;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Ensures each job has one fixed published demo paper for UI / flow testing after CV pass. */
@Service
public class AssessmentDemoSeedService {
    public static final String DEMO_TITLE = "[Demo UI] Bài kiểm tra kỹ thuật";

    private final JobTestRepository tests;
    private final QuestionRepository questions;
    private final OptionRepository options;
    private final CodingProblemRepository codingProblems;
    private final ObjectMapper json;

    public AssessmentDemoSeedService(JobTestRepository tests, QuestionRepository questions, OptionRepository options,
            CodingProblemRepository codingProblems, ObjectMapper json) {
        this.tests = tests;
        this.questions = questions;
        this.options = options;
        this.codingProblems = codingProblems;
        this.json = json;
    }

    @Transactional
    public JobTest ensurePublishedDemo(Job job) {
        JobTest test = tests.findByJob_IdAndStatusOrderByIdDesc(job.getId(), TestStatus.PUBLISHED).stream()
                .filter(t -> DEMO_TITLE.equals(t.getTitle()))
                .findFirst()
                .orElseGet(() -> createDemo(job));
        if (!test.isAutoGradingEnabled()) {
            test.setAutoGradingEnabled(true);
            test = tests.save(test);
        }
        updateDemoCodingStarter(test);
        return test;
    }

    private void updateDemoCodingStarter(JobTest test) {
        if (test == null || test.getId() == null) return;
        try {
            var list = codingProblems.findByTest_Id(test.getId());
            for (CodingProblem problem : list) {
                ObjectNode starter = json.createObjectNode();
                starter.put("python", "def solve(n):\n    # Code mẫu: tính tổng các số từ 1 đến n\n    return n * (n + 1) // 2\n");
                starter.put("javascript", "function solve(n) {\n  // Code mẫu: tính tổng các số từ 1 đến n\n  return (n * (n + 1)) / 2;\n}\n");
                starter.put("java", "public class Solution {\n    // Code mẫu: tính tổng các số từ 1 đến n\n    public static int solve(int n) {\n        return n * (n + 1) / 2;\n    }\n}\n");
                problem.setStarterCodeJson(starter);

                ObjectNode harness = json.createObjectNode();
                harness.put("python", "{{SOURCE}}\nprint(solve(int(input().strip())))\n");
                harness.put("javascript", "{{SOURCE}}\nconst fs=require('fs'); const n=Number(fs.readFileSync(0,'utf8').trim()); console.log(solve(n));\n");
                harness.put("java", "import java.util.Scanner;\n{{SOURCE}}\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.nextInt();\n        System.out.println(Solution.solve(n));\n    }\n}\n");
                problem.setHarnessJson(harness);
                codingProblems.save(problem);
            }
        } catch (Exception ignored) {}
    }

    private JobTest createDemo(Job job) {
        JobTest test = new JobTest();
        test.setJob(job);
        test.setTitle(DEMO_TITLE);
        test.setDescription("Đề demo cố định để xem UI Quizizz → HackerRank và luồng dữ liệu sau lọc CV.");
        test.setDurationMinutes(45);
        test.setObjectiveDurationMinutes(20);
        test.setPassingScore(new BigDecimal("50.00"));
        test.setStatus(TestStatus.PUBLISHED);
        test.setAutoGradingEnabled(true);
        test.setCreatedBy(job.getCreatedBy());
        test = tests.save(test);

        Question mcq = question(test, "MCQ", "Trong Spring Boot, annotation nào đánh dấu một class là REST controller?", 10, 0);
        questions.save(mcq);
        options.saveAll(List.of(
                option(mcq, "@RestController", true),
                option(mcq, "@Entity", false),
                option(mcq, "@Repository", false),
                option(mcq, "@Configuration", false)));

        Question essay = question(test, "ESSAY",
                "Giải thích ngắn gọn sự khác nhau giữa authentication và authorization trong hệ thống web. Nêu một ví dụ thực tế.",
                20, 1);
        ObjectNode rubric = json.createObjectNode();
        rubric.put("referenceAnswer", "Authentication xác thực danh tính; authorization quyết định quyền truy cập tài nguyên.");
        rubric.put("category", "ESSAY_CONCEPTUAL");
        rubric.set("criteria", json.createArrayNode()
                .add(json.createObjectNode().put("description", "Định nghĩa rõ hai khái niệm").put("weight", 50))
                .add(json.createObjectNode().put("description", "Có ví dụ thực tế").put("weight", 50)));
        essay.setRubricJson(rubric);
        questions.save(essay);

        Question coding = question(test, "CODING",
                "Viết hàm `solve(n)` trả về tổng các số từ 1 đến n (n ≥ 1).", 30, 2);
        coding = questions.save(coding);
        ObjectNode starter = json.createObjectNode();
        starter.put("python", "def solve(n):\n    # Code mẫu: tính tổng các số từ 1 đến n\n    return n * (n + 1) // 2\n");
        starter.put("javascript", "function solve(n) {\n  // Code mẫu: tính tổng các số từ 1 đến n\n  return (n * (n + 1)) / 2;\n}\n");
        starter.put("java", "public class Solution {\n    // Code mẫu: tính tổng các số từ 1 đến n\n    public static int solve(int n) {\n        return n * (n + 1) / 2;\n    }\n}\n");
        ObjectNode harness = json.createObjectNode();
        harness.put("python", "{{SOURCE}}\nprint(solve(int(input().strip())))\n");
        harness.put("javascript", "{{SOURCE}}\nconst fs=require('fs'); const n=Number(fs.readFileSync(0,'utf8').trim()); console.log(solve(n));\n");
        harness.put("java", "import java.util.Scanner;\n{{SOURCE}}\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.nextInt();\n        System.out.println(Solution.solve(n));\n    }\n}\n");
        CodingProblem problem = CodingProblem.builder()
                .test(test)
                .question(coding)
                .category("CODING_ALGORITHM")
                .title("Tổng dãy số")
                .prompt(coding.getQuestionText())
                .timeLimitMs(2000)
                .memoryMb(256)
                .starterCodeJson(starter)
                .harnessJson(harness)
                .build();
        problem.getTestCases().add(TestCase.builder().codingProblem(problem).inputData("3").expectedOutput("6").sample(true)
                .weight(BigDecimal.ZERO).build());
        problem.getTestCases().add(TestCase.builder().codingProblem(problem).inputData("10").expectedOutput("55").sample(false)
                .weight(new BigDecimal("100")).build());
        codingProblems.save(problem);
        coding.setCodingProblem(problem);
        questions.save(coding);
        return test;
    }

    private static Question question(JobTest test, String type, String text, int points, int order) {
        Question question = new Question();
        question.setTest(test);
        question.setQuestionType(type);
        question.setQuestionText(text);
        question.setPoints(points);
        question.setQuestionOrder(order);
        question.setDifficulty("Easy");
        question.setSkill("Demo");
        return question;
    }

    private static Option option(Question question, String text, boolean correct) {
        Option option = new Option();
        option.setQuestion(question);
        option.setOptionText(text);
        option.setCorrect(correct);
        return option;
    }
}
