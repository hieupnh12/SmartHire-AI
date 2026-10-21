package com.smarthire.tenant.cv.github;

import static org.assertj.core.api.Assertions.assertThat;

import com.smarthire.tenant.cv.github.GithubFileSelector.Signals;
import com.smarthire.tenant.cv.github.GithubFileSelector.TreeFile;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class GithubFileSelectorTest {
    @Test
    void skipsGeneratedTreesAndCapsFilesForAJavaJob() {
        List<TreeFile> tree = new ArrayList<>();
        for (int i = 0; i < 400; i++) tree.add(new TreeFile("node_modules/pkg/file" + i + ".js", "a", 20));
        tree.add(new TreeFile("target/app.class", "b", 20));
        tree.add(new TreeFile("src/main/java/UserController.java", "c", 400));
        tree.add(new TreeFile("pom.xml", "d", 200));
        tree.add(new TreeFile("README.md", "e", 100));
        var selection = GithubFileSelector.select(new Signals(List.of("Java", "Spring Boot"), List.of(), "Backend", "REST API"),
                tree, 8, 12_000, 48_000);
        assertThat(selection.files()).allMatch(file -> !file.path().contains("node_modules") && !file.path().contains("target"));
        assertThat(selection.files()).extracting(file -> file.path()).contains("src/main/java/UserController.java");
        assertThat(selection.files()).hasSizeLessThanOrEqualTo(8);
    }

    @Test
    void prefersPythonFilesForAPythonJob() {
        var selection = GithubFileSelector.select(new Signals(List.of("Django"), List.of("Python"), "Backend", ""),
                List.of(new TreeFile("src/App.java", "a", 100), new TreeFile("app/views.py", "b", 100)),
                1, 12_000, 48_000);
        assertThat(selection.files()).extracting(file -> file.path()).containsExactly("app/views.py");
    }

    @Test
    void stopsWhenByteBudgetIsSpent() {
        var selection = GithubFileSelector.select(new Signals(List.of("Java"), List.of(), "", ""),
                List.of(new TreeFile("src/A.java", "a", 80), new TreeFile("src/B.java", "b", 80), new TreeFile("src/C.java", "c", 80)),
                8, 100, 100);
        assertThat(selection.files()).hasSize(1);
        assertThat(selection.files().get(0).size()).isLessThanOrEqualTo(100);
    }
}
