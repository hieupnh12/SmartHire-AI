package com.smarthire.tenant.cv.github;

import java.util.List;
import java.util.Locale;
import java.util.Set;

/** Decides whether a new commit can reuse a cached skill result. */
public final class GithubIncrementalPlan {
    public enum Mode { REUSE, PARTIAL, FULL }

    private static final Set<String> ARCHITECTURE = Set.of(
            "pom.xml", "build.gradle", "build.gradle.kts", "package.json", "go.mod", "cargo.toml",
            "composer.json", "gemfile", "requirements.txt", "pyproject.toml", "dockerfile");

    private GithubIncrementalPlan() {}

    public static Mode decide(List<String> previousPaths, List<String> changedPaths) {
        if (changedPaths == null) return Mode.FULL;
        if (changedPaths.isEmpty()) return Mode.REUSE;
        if (changedPaths.stream().anyMatch(GithubIncrementalPlan::architecture)) return Mode.FULL;
        boolean relevant = changedPaths.stream().anyMatch(path ->
                (previousPaths != null && previousPaths.contains(path))
                        || (GithubFileSelector.sourceFile(path) && !GithubFileSelector.excluded(path)));
        return relevant ? Mode.PARTIAL : Mode.REUSE;
    }

    public static boolean architecture(String path) {
        if (path == null) return false;
        String lower = path.toLowerCase(Locale.ROOT).replace('\\', '/');
        String name = lower.substring(lower.lastIndexOf('/') + 1);
        if (ARCHITECTURE.contains(name) || name.endsWith(".csproj")) return true;
        if (name.startsWith("application.") && (name.endsWith(".yml") || name.endsWith(".yaml") || name.endsWith(".properties"))) {
            return true;
        }
        return name.contains("security") || name.endsWith("application.java") || name.endsWith("config.java");
    }
}
