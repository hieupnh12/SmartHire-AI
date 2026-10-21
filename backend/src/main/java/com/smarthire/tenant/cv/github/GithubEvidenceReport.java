package com.smarthire.tenant.cv.github;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.regex.Pattern;

/** Turns model JSON into skill evidence and refuses unsupported claims. */
public final class GithubEvidenceReport {
    private static final Pattern INJECTION = Pattern.compile(
            "(?i)ignore (all |any )?(previous |prior )?instructions|system prompt|reveal (the )?secret|you are now|developer mode");

    public record Evidence(String repository, String path, String observation) {}

    public record Skill(String name, boolean required, String status, String confidence, Integer quality,
                         List<Evidence> evidence, String limit) {}

    public record Report(List<Skill> skills, List<String> strengths, List<String> improvements,
                          List<String> unverified, String summary, String confidence) {}

    private GithubEvidenceReport() {}

    public static Report parse(ObjectMapper mapper, String json, List<SkillNeed> requested, Set<String> sourcePaths,
                               Set<String> manifestPaths) {
        JsonNode root;
        try {
            root = mapper.readTree(json == null ? "{}" : json);
        } catch (Exception ex) {
            return unverified(requested, "The model did not return JSON.");
        }
        Map<String, Skill> byName = new LinkedHashMap<>();
        for (JsonNode node : root.path("skills")) {
            String name = node.path("name").asText("").trim();
            if (name.isBlank()) continue;
            byName.put(norm(name), sanitize(node, sourcePaths, manifestPaths));
        }
        List<Skill> skills = new ArrayList<>();
        for (SkillNeed need : requested) {
            Skill found = byName.get(norm(need.name()));
            skills.add(found == null
                    ? new Skill(need.name(), need.required(), "UNVERIFIED", "LOW", null, List.of(), "No evidence in the selected files.")
                    : new Skill(need.name(), need.required(), found.status(), found.confidence(), found.quality(), found.evidence(), found.limit()));
        }
        return new Report(skills, texts(root.path("strengths")), texts(root.path("improvements")),
                texts(root.path("unverified")), root.path("summary").asText(""),
                confidence(root.path("confidence").asText("LOW")));
    }

    public static Report merge(Report previous, Report updated, Set<String> changedPaths) {
        if (previous == null) return updated;
        Map<String, Skill> kept = new LinkedHashMap<>();
        for (Skill skill : previous.skills()) kept.put(norm(skill.name()), skill);
        for (Skill skill : updated.skills()) {
            Skill prior = kept.get(norm(skill.name()));
            boolean priorTouched = prior != null && prior.evidence().stream().anyMatch(item -> changedPaths.contains(item.path()));
            boolean newlyShown = "VERIFIED".equals(skill.status()) || "PARTIAL".equals(skill.status());
            if (prior == null || priorTouched || newlyShown) kept.put(norm(skill.name()), skill);
        }
        return new Report(new ArrayList<>(kept.values()), updated.strengths(), updated.improvements(),
                updated.unverified(), updated.summary(), updated.confidence());
    }

    public static Report attribute(Report report, String repository) {
        List<Skill> skills = new ArrayList<>();
        for (Skill skill : report.skills()) {
            List<Evidence> evidence = skill.evidence().stream()
                    .map(item -> new Evidence(repository, item.path(), item.observation()))
                    .toList();
            skills.add(new Skill(skill.name(), skill.required(), skill.status(), skill.confidence(),
                    skill.quality(), evidence, skill.limit()));
        }
        return new Report(skills, report.strengths(), report.improvements(), report.unverified(),
                report.summary(), report.confidence());
    }

    public static Report readStored(ObjectMapper mapper, String json) {
        try {
            JsonNode root = mapper.readTree(json == null ? "{}" : json);
            List<SkillNeed> needs = new ArrayList<>();
            java.util.Set<String> paths = new java.util.LinkedHashSet<>();
            for (JsonNode skill : root.path("skills")) {
                needs.add(new SkillNeed(skill.path("name").asText(), skill.path("required").asBoolean(false)));
                for (JsonNode item : skill.path("evidence")) paths.add(item.path("path").asText());
            }
            return parse(mapper, json, needs, paths, java.util.Set.of());
        } catch (Exception ex) {
            return new Report(List.of(), List.of(), List.of(), List.of(), "", "LOW");
        }
    }

    public static BigDecimal score(List<Skill> skills) {
        int weight = 0;
        int total = 0;
        for (Skill skill : skills) {
            if (skill.quality() == null || skill.evidence().isEmpty()) continue;
            if (!"VERIFIED".equals(skill.status()) && !"PARTIAL".equals(skill.status())) continue;
            int itemWeight = skill.required() ? 2 : 1;
            total += skill.quality() * itemWeight;
            weight += itemWeight;
        }
        if (weight == 0) return null;
        return BigDecimal.valueOf(total).divide(BigDecimal.valueOf(weight), 2, RoundingMode.HALF_UP);
    }

    public static ObjectNode toJson(ObjectMapper mapper, Report report) {
        ObjectNode root = mapper.createObjectNode();
        root.put("summary", report.summary());
        root.put("confidence", report.confidence());
        root.set("strengths", strings(mapper, report.strengths()));
        root.set("improvements", strings(mapper, report.improvements()));
        root.set("unverified", strings(mapper, report.unverified()));
        ArrayNode skills = root.putArray("skills");
        for (Skill skill : report.skills()) {
            ObjectNode node = skills.addObject();
            node.put("name", skill.name());
            node.put("required", skill.required());
            node.put("status", skill.status());
            node.put("confidence", skill.confidence());
            if (skill.quality() == null) node.putNull("quality");
            else node.put("quality", skill.quality());
            node.put("limit", skill.limit() == null ? "" : skill.limit());
            ArrayNode evidence = node.putArray("evidence");
            for (Evidence item : skill.evidence()) {
                ObjectNode row = evidence.addObject();
                row.put("repository", item.repository() == null ? "" : item.repository());
                row.put("path", item.path());
                row.put("observation", item.observation());
            }
        }
        return root;
    }

    private static Skill sanitize(JsonNode node, Set<String> sourcePaths, Set<String> manifestPaths) {
        String status = node.path("status").asText("UNVERIFIED").trim().toUpperCase(Locale.ROOT);
        if (!status.equals("VERIFIED") && !status.equals("PARTIAL") && !status.equals("UNVERIFIED")) status = "UNVERIFIED";
        List<Evidence> evidence = new ArrayList<>();
        boolean source = false;
        for (JsonNode item : node.path("evidence")) {
            String path = item.path("path").asText("").trim();
            String observation = cap(item.path("observation").asText(""));
            if (path.isBlank() || observation.isBlank() || INJECTION.matcher(observation).find()) continue;
            if (!sourcePaths.contains(path) && !manifestPaths.contains(path)) continue;
            if (sourcePaths.contains(path)) source = true;
            evidence.add(new Evidence(item.path("repository").asText(""), path, observation));
        }
        Integer quality = node.path("quality").isNumber() ? Math.max(0, Math.min(100, node.path("quality").asInt())) : null;
        String limit = node.path("limit").asText("");
        if (!source) {
            status = "UNVERIFIED";
            quality = null;
            if (limit.isBlank()) limit = "Không có bằng chứng trong source code. Dependency hoặc README không chứng minh kỹ năng.";
        }
        if ("UNVERIFIED".equals(status)) quality = null;
        return new Skill(node.path("name").asText(""), false, status, confidence(node.path("confidence").asText("LOW")),
                quality, evidence, limit);
    }

    private static Report unverified(List<SkillNeed> requested, String limit) {
        List<Skill> skills = new ArrayList<>();
        for (SkillNeed need : requested) {
            skills.add(new Skill(need.name(), need.required(), "UNVERIFIED", "LOW", null, List.of(), limit));
        }
        return new Report(skills, List.of(), List.of(), List.of(), "", "LOW");
    }

    private static List<String> texts(JsonNode node) {
        List<String> values = new ArrayList<>();
        if (!node.isArray()) return values;
        for (JsonNode item : node) {
            String text = cap(item.asText(""));
            if (!text.isBlank() && !INJECTION.matcher(text).find()) values.add(text);
        }
        return values;
    }

    private static ArrayNode strings(ObjectMapper mapper, List<String> values) {
        ArrayNode array = mapper.createArrayNode();
        values.forEach(array::add);
        return array;
    }

    private static String confidence(String value) {
        String upper = value == null ? "LOW" : value.trim().toUpperCase(Locale.ROOT);
        return upper.equals("HIGH") || upper.equals("MEDIUM") ? upper : "LOW";
    }

    private static String norm(String value) {
        return value.toLowerCase(Locale.ROOT).replaceAll("\\s+", " ").trim();
    }

    private static String cap(String value) {
        String clean = value.replaceAll("[\\p{Cntrl}&&[^\n\t]]", "").trim();
        return clean.length() <= 400 ? clean : clean.substring(0, 400);
    }

    public record SkillNeed(String name, boolean required) {}
}
