package com.smarthire.tenant.cv.github;

import com.smarthire.tenant.cv.github.GithubUrls.GithubRef;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/** Reads GitHub URLs from builder contact data and CV text. Does not fetch them. */
public final class GithubUrlExtractor {
    private static final Pattern URL = Pattern.compile(
            "(?<![A-Za-z0-9.])(?:https?://)?(?:www\\.)?github\\.com/[A-Za-z0-9][A-Za-z0-9./_-]{0,200}",
            Pattern.CASE_INSENSITIVE);

    public record Found(List<GithubRef> refs, List<String> rejected) {}

    private GithubUrlExtractor() {}

    public static Found extract(String builderData, String rawText, String extractionJson) {
        Set<String> seen = new LinkedHashSet<>();
        List<GithubRef> refs = new ArrayList<>();
        List<String> rejected = new ArrayList<>();
        addExplicit(builderGithub(builderData), seen, refs, rejected);
        addText(builderData, seen, refs);
        addText(extractionJson, seen, refs);
        addText(rawText, seen, refs);
        refs.sort((a, b) -> Boolean.compare(a.kind() != GithubUrls.Kind.REPOSITORY, b.kind() != GithubUrls.Kind.REPOSITORY));
        return new Found(List.copyOf(refs), List.copyOf(rejected));
    }

    private static void addExplicit(String raw, Set<String> seen, List<GithubRef> refs, List<String> rejected) {
        if (raw == null || raw.isBlank()) return;
        var parsed = GithubUrls.parse(raw);
        if (parsed.isEmpty()) {
            rejected.add(trim(raw));
            return;
        }
        if (seen.add(parsed.get().canonical())) refs.add(parsed.get());
    }

    private static void addText(String text, Set<String> seen, List<GithubRef> refs) {
        if (text == null || text.isBlank()) return;
        Matcher matcher = URL.matcher(text);
        while (matcher.find()) {
            GithubUrls.parse(matcher.group()).ifPresent(ref -> {
                if (seen.add(ref.canonical())) refs.add(ref);
            });
        }
    }

    private static String builderGithub(String builderData) {
        if (builderData == null || !builderData.contains("\"github\"")) return "";
        int key = builderData.indexOf("\"github\"");
        int colon = builderData.indexOf(':', key);
        if (colon < 0) return "";
        int start = builderData.indexOf('"', colon + 1);
        if (start < 0) return "";
        int end = builderData.indexOf('"', start + 1);
        if (end < 0) return "";
        return builderData.substring(start + 1, end);
    }

    private static String trim(String raw) {
        String value = raw.trim();
        return value.length() <= 200 ? value : value.substring(0, 200);
    }
}
