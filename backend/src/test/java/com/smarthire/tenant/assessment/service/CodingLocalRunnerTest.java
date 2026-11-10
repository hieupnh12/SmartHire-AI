package com.smarthire.tenant.assessment.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.smarthire.domain.tenant.entity.CodingProblem;
import com.smarthire.domain.tenant.entity.JobTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class CodingLocalRunnerTest {
    private CodingLocalRunner runner;
    private final ObjectMapper json = new ObjectMapper();

    @BeforeEach
    void setUp() {
        runner = new CodingLocalRunner();
    }

    @Test
    void runsJavaCorrectSolutionSuccessfully() {
        CodingProblem problem = new CodingProblem();
        ObjectNode harness = json.createObjectNode();
        harness.put("java", "import java.util.Scanner;\n{{SOURCE}}\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.nextInt();\n        System.out.println(Solution.solve(n));\n    }\n}\n");
        problem.setHarnessJson(harness);

        String solution = "public class Solution { public static int solve(int n) { return n * (n + 1) / 2; } }";
        JsonNode result = runner.run(problem, "java", solution, "5", "15");

        assertThat(result).isNotNull();
        assertThat(result.path("status").path("id").asInt()).isEqualTo(3);
        assertThat(result.path("status").path("description").asText()).isEqualTo("Accepted");
        assertThat(result.path("stdout").asText().trim()).isEqualTo("15");
    }

    @Test
    void rejectsJavaWrongAnswer() {
        CodingProblem problem = new CodingProblem();
        ObjectNode harness = json.createObjectNode();
        harness.put("java", "import java.util.Scanner;\n{{SOURCE}}\npublic class Main {\n    public static void main(String[] args) {\n        Scanner sc = new Scanner(System.in);\n        int n = sc.nextInt();\n        System.out.println(Solution.solve(n));\n    }\n}\n");
        problem.setHarnessJson(harness);

        // Candidate just returned null or wrong number
        String solution = "public class Solution { public static int solve(int n) { return 0; } }";
        JsonNode result = runner.run(problem, "java", solution, "5", "15");

        assertThat(result).isNotNull();
        assertThat(result.path("status").path("id").asInt()).isEqualTo(4);
        assertThat(result.path("status").path("description").asText()).isEqualTo("Wrong Answer");
        assertThat(result.path("stdout").asText().trim()).isEqualTo("0");
    }

    @Test
    void catchesJavaCompilationError() {
        CodingProblem problem = new CodingProblem();
        ObjectNode harness = json.createObjectNode();
        harness.put("java", "import java.util.Scanner;\n{{SOURCE}}\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println(\"test\");\n    }\n}\n");
        problem.setHarnessJson(harness);

        // Broken syntax like the one in user screenshot
        String solution = "public class Solution { public, double amount) { } }";
        JsonNode result = runner.run(problem, "java", solution, "5", "15");

        assertThat(result).isNotNull();
        assertThat(result.path("status").path("id").asInt()).isEqualTo(6);
        assertThat(result.path("status").path("description").asText()).isEqualTo("Compilation Error");
        assertThat(result.path("stderr").asText()).contains("error");
    }

    @Test
    void demoProblemEvaluationFailsWhenLogicMissing() {
        CodingProblem problem = new CodingProblem();
        JobTest demoTest = new JobTest();
        demoTest.setTitle("[Demo UI] Bài kiểm tra kỹ thuật");
        problem.setTest(demoTest);
        problem.setTitle("Tổng dãy số");
        problem.setPrompt("Viết hàm solve(n) trả về tổng từ 1 đến n");

        // Code has return null, should NOT pass
        String solution = "def solve(n):\n    return None\n";
        JsonNode result = runner.run(problem, "python", solution, "5", "15");

        // Even in python if runner executes or demo fallback evaluates, it should be Wrong Answer
        assertThat(result.path("status").path("id").asInt()).isNotEqualTo(3);
    }
}

