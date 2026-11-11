package com.smarthire.tenant.cv.github;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Extracts declared dependencies deterministically from manifest files so raw XML/JSON need not consume LLM tokens. */
final class GithubStackExtractor {
    private static final Pattern XML_ARTIFACT = Pattern.compile("<artifactId>\\s*([^<\\s]+)\\s*</artifactId>");
    private static final Pattern QUOTE_DEP = Pattern.compile("[\"']([a-zA-Z0-9_.-]+(?::[a-zA-Z0-9_.-]+)?)[\"']");
    private static final Pattern REQ_LINE = Pattern.compile("^([A-Za-z0-9_.-]+)(?:[=<>~!\\[]|$)");
    private static final Pattern GO_MOD = Pattern.compile("^\\s*(?:require\\s+)?([a-zA-Z0-9.-]+/[^\\s]+)\\s+v[0-9]");

    private static final List<String> KNOWN_TECH = List.of(
            "spring", "hibernate", "jpa", "security", "jwt", "oauth", "mysql", "postgres", "postgresql",
            "mongodb", "redis", "rabbitmq", "kafka", "elasticsearch", "docker", "kubernetes", "grpc",
            "graphql", "websocket", "junit", "mockito", "testcontainers", "react", "next", "vite",
            "typescript", "tailwind", "zustand", "tanstack", "redux", "axios", "express", "nestjs",
            "fastapi", "django", "flask", "sqlalchemy", "pydantic", "pytest", "gin", "fiber", "gorm");

    private GithubStackExtractor() {}

    static List<String> extract(ObjectMapper mapper, String path, String content, List<String> jdTokens) {
        if (path == null || content == null || content.isBlank()) return List.of();
        String lower = path.toLowerCase(Locale.ROOT);
        Set<String> rawDeps = new LinkedHashSet<>();
        if (lower.endsWith("package.json")) {
            readPackageJson(mapper, content, rawDeps);
        } else if (lower.endsWith("pom.xml")) {
            Matcher m = XML_ARTIFACT.matcher(content);
            while (m.find() && rawDeps.size() < 80) rawDeps.add(m.group(1).toLowerCase(Locale.ROOT));
        } else if (lower.endsWith("build.gradle") || lower.endsWith("build.gradle.kts")) {
            Matcher m = QUOTE_DEP.matcher(content);
            while (m.find() && rawDeps.size() < 80) rawDeps.add(m.group(1).toLowerCase(Locale.ROOT));
        } else if (lower.endsWith("requirements.txt") || lower.endsWith("pyproject.toml")) {
            for (String line : content.split("\n")) {
                String clean = line.trim();
                if (clean.isEmpty() || clean.startsWith("#")) continue;
                Matcher m = REQ_LINE.matcher(clean);
                if (m.find() && rawDeps.size() < 80) rawDeps.add(m.group(1).toLowerCase(Locale.ROOT));
            }
        } else if (lower.endsWith("go.mod")) {
            for (String line : content.split("\n")) {
                Matcher m = GO_MOD.matcher(line);
                if (m.find() && rawDeps.size() < 80) rawDeps.add(m.group(1).toLowerCase(Locale.ROOT));
            }
        }

        if (rawDeps.isEmpty()) return List.of();
        List<String> matched = new ArrayList<>();
        Set<String> seen = new LinkedHashSet<>();
        for (String dep : rawDeps) {
            if (isRelevant(dep, jdTokens) && seen.add(dep)) {
                matched.add(dep);
                if (matched.size() >= 25) break;
            }
        }
        if (matched.size() < 10) {
            for (String dep : rawDeps) {
                if (seen.add(dep)) {
                    matched.add(dep);
                    if (matched.size() >= 15) break;
                }
            }
        }
        return matched;
    }

    private static void readPackageJson(ObjectMapper mapper, String content, Set<String> out) {
        try {
            JsonNode root = mapper.readTree(content);
            addKeys(root.path("dependencies"), out);
            addKeys(root.path("devDependencies"), out);
        } catch (Exception ignored) {
            // Fall back cleanly if package.json is partial/capped.
        }
    }

    private static void addKeys(JsonNode obj, Set<String> out) {
        if (!obj.isObject()) return;
        obj.fieldNames().forEachRemaining(name -> {
            if (out.size() < 80) out.add(name.toLowerCase(Locale.ROOT));
        });
    }

    private static boolean isRelevant(String dep, List<String> jdTokens) {
        if (jdTokens != null) {
            for (String token : jdTokens) {
                if (token.length() >= 3 && dep.contains(token)) return true;
            }
        }
        for (String tech : KNOWN_TECH) {
            if (dep.contains(tech)) return true;
        }
        return false;
    }
}

