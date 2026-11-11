package com.smarthire.tenant.cv.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.smarthire.domain.tenant.entity.CvAnalysis;
import com.smarthire.domain.tenant.entity.CvSkill;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Deterministic fallback that guarantees CV screening insights always include concrete strengths
 * and risks even when the AI advisor is unavailable or returns partial output.
 */
final class CvScreeningInsightFallback {
    private static final int MAX_BULLETS = 4;

    private CvScreeningInsightFallback() {}

    static List<String> ensureStrengths(
            List<String> existing,
            JsonNode breakdown,
            JsonNode candidateProfile,
            List<CvSkill> candidateSkills,
            CvAnalysis analysis) {
        List<String> normalized = normalize(existing);
        if (!normalized.isEmpty()) return normalized;

        Set<String> bullets = new LinkedHashSet<>();
        List<String> matched = requirementNames(breakdown.path("matched"), false);
        if (!matched.isEmpty()) {
            addBullet(bullets, "Đáp ứng các kỹ năng chuyên môn theo yêu cầu công việc: " + summarize(matched, 5) + ".");
        } else {
            List<String> partial = requirementNames(breakdown.path("partialMatches"), false);
            if (!partial.isEmpty()) {
                addBullet(bullets, "Có nền tảng kiến thức liên quan tới một số kỹ năng của vị trí: " + summarize(partial, 4) + ".");
            }
        }

        addExperienceStrength(bullets, candidateProfile.path("experience"), analysis);
        addProjectStrength(bullets, candidateProfile.path("projects"));
        addEducationStrength(bullets, candidateProfile.path("education"), breakdown.path("educationAnalysis"));
        addCertificationStrength(bullets, candidateProfile.path("certifications"), candidateProfile.path("languages"));

        if (bullets.size() < 2) {
            List<String> cvSkillNames = extractSkillNames(candidateSkills);
            if (!cvSkillNames.isEmpty()) {
                addBullet(bullets, "Sở hữu nhóm kỹ năng ghi nhận trên hồ sơ gồm: " + summarize(cvSkillNames, 5) + ".");
            }
        }
        if (bullets.size() < 2) {
            addBullet(bullets, "Hồ sơ đã hoàn tất bóc tách cấu trúc và đối chiếu trực tiếp với bộ tiêu chí của vị trí.");
        }
        if (bullets.size() < 2) {
            addBullet(bullets, "Có thông tin cơ sở để đánh giá thêm sự phù hợp và tiềm năng phát triển từ file CV gốc.");
        }
        return List.copyOf(bullets);
    }

    static List<String> ensureRisks(
            List<String> existing,
            JsonNode breakdown,
            String jobTitle,
            BigDecimal score,
            BigDecimal passThreshold,
            boolean formulaPassed) {
        List<String> normalized = normalize(existing);
        if (!normalized.isEmpty()) return normalized;

        Set<String> bullets = new LinkedHashSet<>();
        List<String> requiredMissing = stringValues(breakdown.path("requiredMissing"));
        if (!requiredMissing.isEmpty()) {
            addBullet(bullets, "Thiếu kỹ năng bắt buộc theo yêu cầu vị trí: " + summarize(requiredMissing, 6) + ".");
        }

        JsonNode exp = breakdown.path("experienceAnalysis");
        BigDecimal reqYears = decimalOrNull(exp.path("requiredYears"));
        BigDecimal candYears = decimalOrNull(exp.path("candidateYears"));
        if (reqYears != null && reqYears.signum() > 0 && (candYears == null || candYears.compareTo(reqYears) < 0)) {
            if (candYears == null) {
                addBullet(bullets, "CV chưa thể hiện rõ số năm kinh nghiệm thực tế để đối chiếu mức tối thiểu (" + formatNumber(reqYears) + " năm).");
            } else {
                addBullet(bullets, "Kinh nghiệm ghi nhận (" + formatNumber(candYears) + " năm) chưa đáp ứng ngưỡng tối thiểu (" + formatNumber(reqYears) + " năm) của vị trí.");
            }
        }

        List<String> partial = requirementNames(breakdown.path("partialMatches"), false);
        if (!partial.isEmpty()) {
            addBullet(bullets, "Cần kiểm chứng chiều sâu thực tế đối với các kỹ năng khớp một phần: " + summarize(partial, 5) + ".");
        } else {
            List<String> optionalMissing = requirementNames(breakdown.path("missing"), true);
            if (!optionalMissing.isEmpty()) {
                addBullet(bullets, "Chưa có minh chứng rõ ràng với một số kỹ năng cộng thêm trong JD: " + summarize(optionalMissing, 5) + ".");
            }
        }

        JsonNode edu = breakdown.path("educationAnalysis");
        String requiredEdu = edu.path("requiredLevel").asText("").trim();
        if (!requiredEdu.isBlank() && !edu.path("match").asBoolean(true)) {
            addBullet(bullets, "Thông tin học vấn trên CV chưa thể hiện rõ hoặc chưa đạt chuẩn yêu cầu (" + requiredEdu + ").");
        }

        if (!formulaPassed && requiredMissing.isEmpty() && score != null && passThreshold != null && score.compareTo(passThreshold) < 0) {
            String target = jobTitle == null || jobTitle.isBlank() ? "vị trí ứng tuyển" : jobTitle.trim();
            addBullet(bullets, "Mức độ đáp ứng tổng thể hiện chưa đạt ngưỡng sàng lọc cho vị trí " + target + ".");
        }

        if (bullets.size() < 2) {
            addBullet(bullets, "Cần xác minh mức độ đóng góp cá nhân và quy mô thực tế của các dự án nêu trên CV.");
        }
        if (bullets.size() < 2) {
            addBullet(bullets, "Nên kiểm chứng khả năng áp dụng thực chiến qua câu hỏi tình huống kỹ thuật hoặc bài đánh giá chuyên môn.");
        }
        return List.copyOf(bullets);
    }

    private static void addExperienceStrength(Set<String> bullets, JsonNode experience, CvAnalysis analysis) {
        List<String> roles = new ArrayList<>();
        if (experience.isArray()) {
            for (JsonNode row : experience) {
                String title = firstText(row, "title", "role", "position");
                String company = firstText(row, "company", "organization");
                if (title.isBlank() && company.isBlank()) continue;
                String roleText = !title.isBlank() && !company.isBlank()
                        ? title + " tại " + company
                        : (!title.isBlank() ? title : company);
                if (!roles.contains(roleText)) roles.add(roleText);
                if (roles.size() >= 2) break;
            }
        }
        BigDecimal years = analysis == null ? null : analysis.getYearsExperience();
        boolean hasPositiveYears = years != null && years.signum() > 0;
        if (hasPositiveYears && !roles.isEmpty()) {
            addBullet(bullets, "Tích lũy khoảng " + formatNumber(years) + " năm kinh nghiệm thực tế (từng đảm nhiệm " + String.join(", ", roles) + ").");
        } else if (hasPositiveYears) {
            addBullet(bullets, "Ghi nhận khoảng " + formatNumber(years) + " năm kinh nghiệm làm việc trong hồ sơ.");
        } else if (!roles.isEmpty()) {
            addBullet(bullets, "Có kinh nghiệm làm việc thực tế ở vị trí " + String.join(", ", roles) + ".");
        }
    }

    private static void addProjectStrength(Set<String> bullets, JsonNode projects) {
        if (!projects.isArray() || projects.isEmpty()) return;
        List<String> names = new ArrayList<>();
        for (JsonNode project : projects) {
            String name = firstText(project, "name", "title");
            if (!name.isBlank() && !names.contains(name)) names.add(name);
            if (names.size() >= 2) break;
        }
        if (!names.isEmpty()) {
            addBullet(bullets, "Đã tham gia triển khai dự án thực tế: " + String.join(", ", names) + ".");
        }
    }

    private static void addEducationStrength(Set<String> bullets, JsonNode education, JsonNode educationAnalysis) {
        String degree = "";
        String school = "";
        if (education.isArray() && !education.isEmpty()) {
            JsonNode first = education.get(0);
            degree = firstText(first, "degree", "level", "major", "name");
            school = firstText(first, "school", "institution", "university");
        }
        if (degree.isBlank()) {
            degree = educationAnalysis.path("candidateLevel").asText("").trim();
        }
        if (!degree.isBlank() && !school.isBlank()) {
            addBullet(bullets, "Nền tảng học vấn: " + degree + " (" + school + ").");
        } else if (!degree.isBlank()) {
            addBullet(bullets, "Trình độ học vấn ghi nhận trên CV: " + degree + ".");
        } else if (!school.isBlank()) {
            addBullet(bullets, "Từng theo học tại " + school + ".");
        }
    }

    private static void addCertificationStrength(Set<String> bullets, JsonNode certifications, JsonNode languages) {
        List<String> certs = new ArrayList<>();
        if (certifications.isArray()) {
            for (JsonNode cert : certifications) {
                String name = firstText(cert, "name", "title");
                if (!name.isBlank() && !certs.contains(name)) certs.add(name);
                if (certs.size() >= 2) break;
            }
        }
        if (!certs.isEmpty()) {
            addBullet(bullets, "Sở hữu chứng chỉ chuyên môn bổ trợ: " + String.join(", ", certs) + ".");
            return;
        }
        if (languages.isArray() && !languages.isEmpty()) {
            List<String> langs = new ArrayList<>();
            for (JsonNode lang : languages) {
                String name = firstText(lang, "name", "language");
                if (!name.isBlank() && !langs.contains(name)) langs.add(name);
                if (langs.size() >= 2) break;
            }
            if (!langs.isEmpty()) {
                addBullet(bullets, "Có năng lực ngoại ngữ hỗ trợ công việc: " + String.join(", ", langs) + ".");
            }
        }
    }

    private static List<String> normalize(List<String> items) {
        if (items == null || items.isEmpty()) return List.of();
        List<String> out = new ArrayList<>();
        for (String item : items) {
            if (item == null) continue;
            String trimmed = item.trim();
            if (!trimmed.isBlank() && !out.contains(trimmed)) {
                out.add(trimmed);
                if (out.size() >= MAX_BULLETS) break;
            }
        }
        return List.copyOf(out);
    }

    private static void addBullet(Set<String> bullets, String text) {
        if (bullets.size() < MAX_BULLETS && text != null && !text.isBlank()) {
            bullets.add(text.trim());
        }
    }

    private static List<String> requirementNames(JsonNode array, boolean optionalOnly) {
        if (!array.isArray()) return List.of();
        List<String> names = new ArrayList<>();
        for (JsonNode item : array) {
            if (optionalOnly && item.path("mandatory").asBoolean(false)) continue;
            String req = firstText(item, "requirement", "required");
            if (!req.isBlank() && !names.contains(req)) names.add(req);
        }
        return names;
    }

    private static List<String> extractSkillNames(List<CvSkill> skills) {
        if (skills == null || skills.isEmpty()) return List.of();
        List<String> names = new ArrayList<>();
        for (CvSkill skill : skills) {
            String name = skill.getSkillName();
            if (name == null || name.isBlank()) {
                name = skill.getSkill() == null ? "" : skill.getSkill().getName();
            }
            if (name != null && !name.isBlank() && !names.contains(name.trim())) {
                names.add(name.trim());
            }
        }
        return names;
    }

    private static List<String> stringValues(JsonNode array) {
        if (!array.isArray()) return List.of();
        List<String> out = new ArrayList<>();
        for (JsonNode item : array) {
            String value = item.asText("").trim();
            if (!value.isBlank() && !out.contains(value)) out.add(value);
        }
        return out;
    }

    private static String summarize(List<String> items, int maxVisible) {
        if (items.size() <= maxVisible) return String.join(", ", items);
        return String.join(", ", items.subList(0, maxVisible)) + " và " + (items.size() - maxVisible) + " mục khác";
    }

    private static String firstText(JsonNode node, String... fields) {
        if (node == null || node.isMissingNode()) return "";
        for (String field : fields) {
            JsonNode value = node.path(field);
            if (value.isTextual()) {
                String text = value.asText("").trim();
                if (!text.isBlank()) return text;
            }
        }
        return "";
    }

    private static BigDecimal decimalOrNull(JsonNode node) {
        return node != null && node.isNumber() ? node.decimalValue() : null;
    }

    private static String formatNumber(BigDecimal value) {
        return value.stripTrailingZeros().toPlainString();
    }
}

