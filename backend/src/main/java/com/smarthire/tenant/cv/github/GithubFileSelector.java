package com.smarthire.tenant.cv.github;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/** Picks JD-related source files from a Git tree without calling a model. */
public final class GithubFileSelector {
    public record TreeFile(String path, String sha, long size) {}

    public record Signals(List<String> required, List<String> optional, String title, String description) {}

    public record SelectedFile(String path, String sha, long size, int score, boolean manifest) {}

    public record Selection(List<SelectedFile> files, int skipped, boolean truncatedInput) {}

    private static final Set<String> SKIP_DIRS = Set.of(
            "node_modules", "target", "build", "dist", ".git", "vendor", "coverage", "__pycache__",
            ".next", "out", "bin", "obj", ".gradle", ".idea", ".mvn", "venv", ".venv", "site-packages",
            "third_party", "third-party", "generated", "gen", "pods");
    private static final Set<String> SKIP_EXT = Set.of(
            "png", "jpg", "jpeg", "gif", "webp", "ico", "svg", "mp4", "mov", "zip", "jar", "class",
            "woff", "woff2", "ttf", "eot", "pdf", "map", "exe", "dll", "so", "dylib", "wasm", "parquet",
            "sqlite", "db", "lock");
    private static final Set<String> SOURCE = Set.of(
            "java", "kt", "kts", "scala", "groovy", "py", "js", "jsx", "ts", "tsx", "mjs", "cjs", "go",
            "rs", "cs", "php", "rb", "sql", "c", "h", "cpp", "hpp", "cc", "swift", "ex", "exs", "clj",
            "dart", "vue", "svelte");

    private GithubFileSelector() {}

    public static Selection select(Signals signals, List<TreeFile> tree, int maxFiles, int maxFileBytes, int maxTotalBytes) {
        List<String> tokens = tokens(signals);
        Set<String> languages = languages(tokens);
        List<SelectedFile> ranked = new ArrayList<>();
        int skipped = 0;
        for (TreeFile file : tree) {
            if (file == null || file.path() == null || excluded(file.path()) || file.size() > maxFileBytes) {
                skipped++;
                continue;
            }
            int score = score(file.path(), tokens, languages);
            String ext = ext(name(file.path().toLowerCase(Locale.ROOT)));
            boolean languageMatch = !languages.isEmpty() && languages.contains(ext);
            if (score < 5 && !(languageMatch && score >= 3)) {
                skipped++;
                continue;
            }
            ranked.add(new SelectedFile(file.path(), file.sha(), Math.max(file.size(), 1), score, manifest(file.path())));
        }
        ranked.sort(Comparator.comparingInt(SelectedFile::score).reversed().thenComparing(SelectedFile::path));
        List<SelectedFile> chosen = new ArrayList<>();
        long bytes = 0;
        for (SelectedFile file : ranked) {
            if (chosen.size() >= maxFiles || bytes + file.size() > maxTotalBytes) {
                skipped++;
                continue;
            }
            if (file.manifest() && chosen.stream().anyMatch(SelectedFile::manifest)) {
                skipped++;
                continue;
            }
            chosen.add(file);
            bytes += file.size();
        }
        boolean evidence = chosen.stream().anyMatch(file -> !file.manifest());
        if (!evidence) chosen = List.of();
        return new Selection(chosen, skipped, false);
    }

    public static boolean excluded(String path) {
        String lower = path.toLowerCase(Locale.ROOT).replace('\\', '/');
        if (lower.contains("..")) return true;
        for (String part : lower.split("/")) {
            if (SKIP_DIRS.contains(part)) return true;
        }
        String name = name(lower);
        if (name.endsWith(".min.js") || name.endsWith(".min.css") || name.contains(".generated.")) return true;
        if (name.equals("package-lock.json") || name.equals("yarn.lock") || name.equals("pnpm-lock.yaml")
                || name.equals("cargo.lock") || name.equals("composer.lock") || name.equals("go.sum")) {
            return true;
        }
        String ext = ext(name);
        return SKIP_EXT.contains(ext);
    }

    public static boolean manifest(String path) {
        String name = name(path.toLowerCase(Locale.ROOT));
        return name.equals("pom.xml") || name.equals("build.gradle") || name.equals("build.gradle.kts")
                || name.equals("package.json") || name.equals("go.mod") || name.equals("requirements.txt")
                || name.equals("pyproject.toml") || name.equals("cargo.toml") || name.equals("composer.json")
                || name.equals("gemfile") || name.endsWith(".csproj");
    }

    public static boolean sourceFile(String path) {
        return SOURCE.contains(ext(name(path.toLowerCase(Locale.ROOT))));
    }

    static int score(String path, List<String> tokens, Set<String> languages) {
        String lower = path.toLowerCase(Locale.ROOT);
        String file = name(lower);
        int score = 0;
        for (String token : tokens) {
            if (token.length() < 2) continue;
            if (file.contains(token)) score += 8;
            else if (lower.contains("/" + token) || lower.contains(token + "/") || lower.contains(token)) score += 5;
        }
        String ext = ext(file);
        if (!languages.isEmpty() && languages.contains(ext)) score += 3;
        else if (languages.isEmpty() && SOURCE.contains(ext)) score += 1;
        if (languages.contains("java") && (file.equals("pom.xml") || file.startsWith("build.gradle"))) score += 6;
        if (languages.contains("py") && (file.equals("requirements.txt") || file.equals("pyproject.toml"))) score += 6;
        if ((languages.contains("js") || languages.contains("ts") || languages.contains("tsx")) && file.equals("package.json")) score += 6;
        if (languages.contains("go") && file.equals("go.mod")) score += 6;
        if (languages.contains("rs") && file.equals("cargo.toml")) score += 6;
        if (languages.contains("php") && file.equals("composer.json")) score += 6;
        if (languages.contains("rb") && file.equals("gemfile")) score += 6;
        if (languages.contains("cs") && file.endsWith(".csproj")) score += 6;
        if (lower.contains("/test/") || lower.contains("/tests/") || file.contains("test") || file.contains("spec")) {
            score += tokens.contains("test") ? 4 : 1;
        }
        return score;
    }

    public static List<String> tokens(Signals signals) {
        StringBuilder raw = new StringBuilder();
        if (signals.required() != null) signals.required().forEach(name -> raw.append(' ').append(name));
        if (signals.optional() != null) signals.optional().forEach(name -> raw.append(' ').append(name));
        raw.append(' ').append(signals.title() == null ? "" : signals.title());
        raw.append(' ').append(signals.description() == null ? "" : signals.description());
        List<String> tokens = new ArrayList<>();
        for (String part : raw.toString().toLowerCase(Locale.ROOT).split("[^a-z0-9+#]+")) {
            if ((part.length() >= 3 || part.equals("go")) && !tokens.contains(part)) tokens.add(part);
        }
        return tokens;
    }

    private static Set<String> languages(List<String> tokens) {
        java.util.LinkedHashSet<String> extensions = new java.util.LinkedHashSet<>();
        for (String token : tokens) {
            switch (token) {
                case "java", "spring" -> extensions.add("java");
                case "kotlin" -> { extensions.add("kt"); extensions.add("kts"); }
                case "python", "django", "fastapi" -> extensions.add("py");
                case "javascript", "node" -> { extensions.add("js"); extensions.add("jsx"); extensions.add("mjs"); }
                case "typescript" -> { extensions.add("ts"); extensions.add("tsx"); }
                case "react" -> { extensions.add("jsx"); extensions.add("tsx"); extensions.add("js"); extensions.add("ts"); }
                case "golang" -> extensions.add("go");
                case "go" -> extensions.add("go");
                case "rust" -> extensions.add("rs");
                case "csharp", "dotnet" -> extensions.add("cs");
                case "php", "laravel" -> extensions.add("php");
                case "ruby", "rails" -> extensions.add("rb");
                case "sql" -> extensions.add("sql");
                case "swift" -> extensions.add("swift");
                default -> { }
            }
        }
        return extensions;
    }

    private static String name(String path) {
        int slash = path.lastIndexOf('/');
        return slash < 0 ? path : path.substring(slash + 1);
    }

    private static String ext(String name) {
        int dot = name.lastIndexOf('.');
        return dot < 0 ? "" : name.substring(dot + 1);
    }
}
