package com.smarthire.tenant.cv.ai;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.stereotype.Component;

/** Deterministic extractor for tests and when Gemini is unset. */
@Component
public class HeuristicCvAiClient implements CvAiClient {
    public static final String MODEL = "heuristic-v1";
    public static final String PROMPT = "extract-v1";
    private static final Pattern EMAIL = Pattern.compile("[A-Z0-9._%+-]+@[A-Z0-9.-]+\\.[A-Z]{2,}", Pattern.CASE_INSENSITIVE);
    private static final Pattern PHONE = Pattern.compile("(?:\\+?\\d[\\d .()-]{7,}\\d)");
    private static final String MONTHS =
            "January|February|March|April|May|June|July|August|September|October|November|December|"
                    + "Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec";
    private static final Pattern ISO_RANGE = Pattern.compile(
            "(20\\d{2}-\\d{2})\\s*(?:to|-|–|until)\\s+(20\\d{2}-\\d{2}|present|current|now)", Pattern.CASE_INSENSITIVE);
    private static final Pattern MONTH_RANGE = Pattern.compile(
            "(?i)(" + MONTHS + ")\\s*,?\\s*(20\\d{2})\\s*(?:–|-|—|to|until)\\s*(?:(present|current|now)|("
                    + MONTHS + ")\\s*,?\\s*(20\\d{2}))");
    private static final Pattern DEGREE = Pattern.compile(
            "(?i)((?:Master|Bachelor) of (?:Science|Arts|Business Administration|Engineering|Economics)"
                    + "(?: in [A-Za-z][A-Za-z0-9&/ ]{1,80})?|MBA|Ph\\.?D\\.?)");
    private static final List<String> LEXICON = List.of(
            "JavaScript", "TypeScript", "Spring Boot", "React", "ReactJS", "Vue", "Angular",
            "Node.js", "NodeJS", "MySQL", "PostgreSQL", "Postgres", "Redis", "MongoDB", "Docker",
            "Kubernetes", "K8s", "REST API", "HTML", "CSS", "Python", "Java", "SQL", "Go");

    private final ObjectMapper mapper;

    public HeuristicCvAiClient(ObjectMapper mapper) {
        this.mapper = mapper;
    }

    @Override
    public String extractJson(String rawText, String jobContext) {
        return extractFromText(rawText);
    }

    public String extractJson(String rawText) {
        return extractFromText(rawText);
    }

    private String extractFromText(String rawText) {
        String text = rawText == null ? "" : rawText;
        ObjectNode root = mapper.createObjectNode();
        ObjectNode contact = root.putObject("contact");
        Matcher email = EMAIL.matcher(text);
        if (email.find()) contact.put("email", email.group());
        Matcher phone = PHONE.matcher(text);
        if (phone.find()) contact.put("phone", phone.group().trim());

        Set<String> found = new LinkedHashSet<>();
        for (String skill : LEXICON) {
            if (mentions(text, skill)) found.add(skill);
        }
        addSectionSkills(text, found);

        ArrayNode skillNodes = root.putArray("skills");
        for (String skill : found) {
            ObjectNode item = skillNodes.addObject();
            item.put("name", skill);
            item.put("confidence", 0.80);
        }

        ArrayNode experience = root.putArray("experience");
        Set<String> seenJobs = new LinkedHashSet<>();
        Matcher monthRange = MONTH_RANGE.matcher(text);
        while (monthRange.find()) {
            String start = iso(monthRange.group(1), monthRange.group(2));
            boolean current = monthRange.group(3) != null;
            String end = current ? "present" : iso(monthRange.group(4), monthRange.group(5));
            addJob(experience, seenJobs, start, end, current, found, snippet(text, monthRange.start(), monthRange.end()));
        }
        Matcher isoRange = ISO_RANGE.matcher(text);
        while (isoRange.find()) {
            String end = isoRange.group(2);
            boolean current = end.matches("(?i)present|current|now");
            addJob(experience, seenJobs, isoRange.group(1), end, current, found, snippet(text, isoRange.start(), isoRange.end()));
        }

        ArrayNode education = root.putArray("education");
        Set<String> seenDegrees = new LinkedHashSet<>();
        Matcher degree = DEGREE.matcher(text);
        while (degree.find()) {
            String name = degree.group(1).replaceAll("\\s+", " ").trim();
            if (!seenDegrees.add(name.toLowerCase(Locale.ROOT))) continue;
            ObjectNode row = education.addObject();
            row.put("degree", name);
        }

        root.putArray("projects");
        root.putArray("languages");
        root.putArray("certifications");
        return root.toString();
    }

    private void addJob(
            ArrayNode experience,
            Set<String> seenJobs,
            String start,
            String end,
            boolean current,
            Set<String> lexiconSkills,
            String evidence) {
        String key = start + "|" + (current ? "current" : end);
        if (!seenJobs.add(key)) return;
        ObjectNode job = experience.addObject();
        job.put("startDate", start);
        job.put("current", current);
        if (!current) job.put("endDate", end);
        ArrayNode jobSkills = job.putArray("skills");
        lexiconSkills.stream().filter(LEXICON::contains).forEach(jobSkills::add);
        job.put("evidence", evidence);
    }

    private static void addSectionSkills(String text, Set<String> found) {
        Matcher header = Pattern.compile("(?i)\\bskills\\b[:\\s]+").matcher(text);
        int start = -1;
        while (header.find()) start = header.end();
        if (start < 0) return;
        String chunk = text.substring(start, Math.min(text.length(), start + 1800));
        for (String part : chunk.split("[,;\\n|/]")) {
            String skill = part.replaceAll("(?i)^(consulting & strategy|analysis & research|project management|"
                    + "client engagement|technical proficiency)\\s*:\\s*", "").trim().replaceAll("\\s+", " ");
            if (skill.length() < 3 || skill.length() > 50) continue;
            if (!skill.matches("[A-Za-z][A-Za-z0-9+.#/&() \\-]+")) continue;
            found.add(skill);
            if (found.size() >= 30) return;
        }
    }

    private static boolean mentions(String text, String skill) {
        String lower = text.toLowerCase(Locale.ROOT);
        String needle = skill.toLowerCase(Locale.ROOT);
        if (skill.equalsIgnoreCase("Go")) return Pattern.compile("(?<![a-z])go(?![a-z-])").matcher(lower).find();
        if (skill.equalsIgnoreCase("Java")) return Pattern.compile("(?<![a-z])java(?!script)(?![a-z])").matcher(lower).find();
        return Pattern.compile("(?<![a-z0-9])" + Pattern.quote(needle) + "(?![a-z0-9])").matcher(lower).find();
    }

    private static String iso(String month, String year) {
        return year + "-" + String.format(Locale.ROOT, "%02d", monthNumber(month));
    }

    private static int monthNumber(String month) {
        return switch (month.toLowerCase(Locale.ROOT)) {
            case "january", "jan" -> 1;
            case "february", "feb" -> 2;
            case "march", "mar" -> 3;
            case "april", "apr" -> 4;
            case "may" -> 5;
            case "june", "jun" -> 6;
            case "july", "jul" -> 7;
            case "august", "aug" -> 8;
            case "september", "sep", "sept" -> 9;
            case "october", "oct" -> 10;
            case "november", "nov" -> 11;
            case "december", "dec" -> 12;
            default -> 1;
        };
    }

    private static String snippet(String text, int start, int end) {
        int from = Math.max(0, start - 80);
        int to = Math.min(text.length(), end + 80);
        return text.substring(from, to).replaceAll("\\s+", " ").trim();
    }

    @Override
    public String modelVersion() { return MODEL; }

    @Override
    public String promptVersion() { return PROMPT; }
}
