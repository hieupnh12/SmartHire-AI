package com.smarthire.tenant.cv.github;

import com.smarthire.tenant.cv.github.GithubEvidenceReport.SkillNeed;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Comparator;
import java.util.List;

final class GithubFingerprints {
    private GithubFingerprints() {}

    static String of(String strategy, String prompt, String model, List<SkillNeed> skills) {
        StringBuilder raw = new StringBuilder();
        raw.append(strategy).append('\n').append(prompt).append('\n').append(model).append('\n');
        skills.stream()
                .sorted(Comparator.comparing(skill -> skill.name().toLowerCase()))
                .forEach(skill -> raw.append(skill.required() ? "R:" : "O:").append(skill.name().trim().toLowerCase()).append('\n'));
        try {
            byte[] hash = MessageDigest.getInstance("SHA-256").digest(raw.toString().getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder();
            for (byte item : hash) hex.append(String.format("%02x", item));
            return hex.toString();
        } catch (Exception ex) {
            return Integer.toHexString(raw.toString().hashCode());
        }
    }
}
