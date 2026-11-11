package com.smarthire.tenant.cv.github;

import static org.assertj.core.api.Assertions.assertThat;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.List;
import org.junit.jupiter.api.Test;

class GithubStackExtractorTest {
    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void extractsMatchedDependenciesFromPomXmlWithoutSendingRawXml() {
        String pom = """
                <project>
                  <dependencies>
                    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-web</artifactId></dependency>
                    <dependency><groupId>org.springframework.boot</groupId><artifactId>spring-boot-starter-data-redis</artifactId></dependency>
                    <dependency><groupId>org.projectlombok</groupId><artifactId>lombok</artifactId></dependency>
                  </dependencies>
                </project>
                """;
        List<String> stack = GithubStackExtractor.extract(mapper, "pom.xml", pom, List.of("spring", "redis", "java"));
        assertThat(stack).contains("spring-boot-starter-web", "spring-boot-starter-data-redis");
    }

    @Test
    void extractsRelevantDependenciesFromPackageJson() {
        String pkg = """
                {"dependencies":{"react":"^19.0.0","zustand":"^5.0.0","left-pad":"^1.0.0"},"devDependencies":{"vitest":"^3.0.0"}}
                """;
        List<String> stack = GithubStackExtractor.extract(mapper, "frontend/package.json", pkg, List.of("react", "typescript"));
        assertThat(stack).contains("react", "zustand");
    }
}

