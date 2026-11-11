package com.smarthire.tenant.cv.github;

import com.smarthire.tenant.cv.github.GithubApiClient.CommitItem;
import com.smarthire.tenant.cv.github.GithubApiClient.RepoSnapshot;
import com.smarthire.tenant.cv.github.GithubApiClient.UserProfile;
import java.text.Normalizer;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Set;

/** Deterministic (0-LLM-token) authorship, commit-effort, and anti-spoofing audit per repository. */
public final class GithubAuthenticityAnalyzer {
    public record CandidateIdentity(
            String fullName,
            String email,
            Set<String> declaredHandles) {}

    public record RepoAuthenticity(
            String fullName,
            String verdict,
            String trustLevel,
            int trustScore,
            boolean shouldSkipAi,
            String skipReason,
            boolean fork,
            String parentFullName,
            int aheadByParent,
            int sampledCommits,
            int applicantCommits,
            int applicantCommitRatio,
            int distinctAuthors,
            int activeDays,
            String ownerLogin,
            String ownerCreatedAt,
            int ownerPublicRepos,
            long duplicateCvCount,
            List<String> signals) {}

    private static final Set<String> BOT_LOGINS = Set.of("dependabot", "dependabot[bot]", "renovate[bot]", "github-actions[bot]");

    private GithubAuthenticityAnalyzer() {}

    public static RepoAuthenticity assess(
            RepoSnapshot repo,
            UserProfile ownerProfile,
            List<CommitItem> commits,
            int aheadByParent,
            long duplicateCvCount,
            CandidateIdentity candidate) {
        String ownerLower = normLogin(repo.owner());
        boolean declaredOwner = candidate != null && candidate.declaredHandles() != null
                && !ownerLower.isEmpty() && candidate.declaredHandles().contains(ownerLower);
        boolean ownerMatchesCandidate = declaredOwner || ownerProfileMatchesCandidate(ownerProfile, ownerLower, candidate);

        int sampled = commits == null ? 0 : commits.size();
        int applicantMatched = 0;
        Set<String> authors = new LinkedHashSet<>();
        Set<String> activeDates = new LinkedHashSet<>();
        int genericMsgCount = 0;

        if (commits != null) {
            for (CommitItem c : commits) {
                String login = normLogin(c.authorLogin());
                if (BOT_LOGINS.contains(login)) continue;
                String authorKey = !login.isEmpty() ? login : normName(c.authorName());
                if (!authorKey.isEmpty()) authors.add(authorKey);
                if (c.committedAt() != null && c.committedAt().length() >= 10) {
                    activeDates.add(c.committedAt().substring(0, 10));
                }
                if (matchesCandidate(c, ownerLower, ownerMatchesCandidate, candidate)) {
                    applicantMatched++;
                }
                if (isGenericMessage(c.message())) genericMsgCount++;
            }
        }

        int ratio = sampled > 0 ? Math.round((applicantMatched * 100.0f) / sampled) : (declaredOwner ? 100 : 0);
        boolean singleCommitDump = sampled > 0 && sampled <= 2 && activeDates.size() <= 1 && repo.sizeKb() >= 15;
        boolean forkUnmodified = repo.fork() && aheadByParent <= 0 && !repo.parentFullName().isBlank();
        boolean thirdPartyUnverified = sampled > 0 && applicantMatched == 0 && !ownerMatchesCandidate;
        boolean mostlyGeneric = sampled >= 3 && genericMsgCount >= (sampled * 4 / 5);

        List<String> signals = new ArrayList<>();
        int score = 75;
        String verdict;
        boolean shouldSkipAi = false;
        String skipReason = "";

        if (forkUnmodified) {
            verdict = "FORK_UNMODIFIED";
            score = 10;
            shouldSkipAi = true;
            skipReason = "Repository được fork từ " + repo.parentFullName() + " nhưng không có commit đóng góp mới.";
            signals.add("Fork nguyên bản từ " + repo.parentFullName() + " (0 commit khác biệt với repo gốc).");
        } else if (thirdPartyUnverified) {
            verdict = "THIRD_PARTY_REPO";
            score = 15;
            shouldSkipAi = true;
            skipReason = "Owner GitHub (" + repo.owner() + ") khác hồ sơ CV và mẫu " + sampled + " commit không khớp tên/email ứng viên.";
            signals.add("Tác giả repo (" + repo.owner() + ") không trùng với tài khoản hay email/tên trong CV.");
            signals.add("Không ghi nhận commit khớp ứng viên trong " + sampled + " commit gần nhất.");
        } else if (repo.sizeKb() <= 1 && sampled <= 1 && repo.sizeKb() > 0) {
            verdict = "LOW_EFFORT_STUB";
            score = 25;
            signals.add("Repository kích thước rất nhỏ (" + repo.sizeKb() + " KB, " + sampled + " commit).");
        } else if (authors.size() >= 2) {
            verdict = "TEAM_COLLABORATION";
            score = Math.max(30, Math.min(92, 40 + (ratio / 2)));
            signals.add("Dự án nhóm (" + authors.size() + " contributors) — " + applicantMatched + "/" + sampled + " commits (~" + ratio + "%) khớp tác giả/owner.");
            if (applicantMatched == 0 && sampled > 0) {
                score = 25;
                signals.add("Cảnh báo: không tìm thấy commit nào mang tên/email/handle của ứng viên trong mẫu gần đây.");
            }
        } else if (singleCommitDump) {
            verdict = "SINGLE_COMMIT_DUMP";
            score = 35;
            signals.add("Toàn bộ mã nguồn (" + repo.sizeKb() + " KB) chỉ được đẩy lên trong " + sampled + " commit cùng 1 ngày — nên hỏi sâu để xác minh không phải tải source mẫu về upload lại.");
        } else {
            verdict = "VERIFIED_AUTHOR";
            score = 82;
            if (sampled > 0) {
                signals.add("Lịch sử phát triển thực tế: " + sampled + " commit gần đây trải qua " + Math.max(1, activeDates.size()) + " ngày hoạt động.");
            }
            if (repo.fork() && aheadByParent > 0) {
                score -= 10;
                signals.add("Repository là bản fork có thêm " + aheadByParent + " commit chỉnh sửa so với " + repo.parentFullName() + ".");
            }
        }

        if (sampled == 0) {
            signals.add("Không đọc được mẫu lịch sử commit (có thể chưa stub/giới hạn API hoặc repo trống).");
        }
        if (mostlyGeneric) {
            score = Math.max(20, score - 12);
            signals.add("Đa số commit message chung chung (" + genericMsgCount + "/" + sampled + ").");
        }
        if (duplicateCvCount > 0) {
            score = Math.max(15, score - 20);
            signals.add("Cảnh báo trùng lặp: có " + duplicateCvCount + " hồ sơ khác trong cùng vị trí nộp trùng repository này.");
        }
        if (ownerProfile != null && ownerProfile.publicRepos() > 0) {
            String year = ownerProfile.createdAt() != null && ownerProfile.createdAt().length() >= 4
                    ? ownerProfile.createdAt().substring(0, 4) : "";
            if (!year.isEmpty()) {
                signals.add("Tài khoản GitHub @" + ownerProfile.login() + " hoạt động từ năm " + year
                        + " (" + ownerProfile.publicRepos() + " public repos).");
            }
        }

        score = Math.max(0, Math.min(100, score));
        String trustLevel = trustLevelOf(verdict, score, duplicateCvCount);

        return new RepoAuthenticity(
                repo.fullName(),
                verdict,
                trustLevel,
                score,
                shouldSkipAi,
                skipReason,
                repo.fork(),
                repo.parentFullName(),
                aheadByParent,
                sampled,
                applicantMatched,
                ratio,
                authors.size(),
                activeDates.size(),
                ownerProfile != null && !ownerProfile.login().isBlank() ? ownerProfile.login() : repo.owner(),
                ownerProfile == null ? "" : ownerProfile.createdAt(),
                ownerProfile == null ? 0 : ownerProfile.publicRepos(),
                duplicateCvCount,
                List.copyOf(signals));
    }

    public static String overallTrustLevel(List<RepoAuthenticity> items) {
        if (items == null || items.isEmpty()) return "LOW";
        boolean anyWarning = items.stream().anyMatch(i -> "WARNING".equals(i.trustLevel()));
        if (anyWarning && items.stream().noneMatch(i -> "HIGH".equals(i.trustLevel()))) return "WARNING";
        int best = items.stream().mapToInt(RepoAuthenticity::trustScore).max().orElse(0);
        if (best >= 75) return "HIGH";
        if (best >= 50) return "MEDIUM";
        if (best >= 30) return "LOW";
        return "WARNING";
    }

    public static int overallTrustScore(List<RepoAuthenticity> items) {
        if (items == null || items.isEmpty()) return 0;
        return (int) Math.round(items.stream().mapToInt(RepoAuthenticity::trustScore).average().orElse(0.0));
    }

    private static String trustLevelOf(String verdict, int score, long duplicateCvCount) {
        if ("FORK_UNMODIFIED".equals(verdict) || "THIRD_PARTY_REPO".equals(verdict) || duplicateCvCount > 0) {
            return "WARNING";
        }
        if (score >= 75) return "HIGH";
        if (score >= 50) return "MEDIUM";
        return "LOW";
    }

    private static boolean ownerProfileMatchesCandidate(
            UserProfile ownerProfile,
            String ownerLower,
            CandidateIdentity candidate) {
        if (candidate == null) return false;
        String cvEmail = normEmail(candidate.email());
        String cvName = normName(candidate.fullName());
        if (candidate.declaredHandles() != null && !ownerLower.isEmpty() && candidate.declaredHandles().contains(ownerLower)) {
            return true;
        }
        if (ownerProfile != null) {
            String profileEmail = normEmail(ownerProfile.email());
            if (!cvEmail.isEmpty() && cvEmail.equals(profileEmail)) return true;
            String profileName = normName(ownerProfile.name());
            if (!cvName.isEmpty() && !profileName.isEmpty() && namesRoughlyMatch(cvName, profileName)) {
                return true;
            }
        }
        return false;
    }

    private static boolean matchesCandidate(
            CommitItem commit,
            String ownerLower,
            boolean ownerMatchesCandidate,
            CandidateIdentity candidate) {
        String login = normLogin(commit.authorLogin());
        String commitEmail = normEmail(commit.authorEmail());
        String commitName = normName(commit.authorName());

        if (candidate != null) {
            String cvEmail = normEmail(candidate.email());
            if (!cvEmail.isEmpty() && cvEmail.equals(commitEmail)) return true;
            if (!cvEmail.isEmpty() && commitEmail.contains("+") && commitEmail.endsWith("@users.noreply.github.com")) {
                String local = cvEmail.substring(0, cvEmail.indexOf('@'));
                if (!local.isEmpty() && commitEmail.contains("+" + local + "@")) return true;
            }
            if (candidate.declaredHandles() != null && !login.isEmpty() && candidate.declaredHandles().contains(login)) {
                return true;
            }
            String cvName = normName(candidate.fullName());
            if (!cvName.isEmpty() && !commitName.isEmpty() && namesRoughlyMatch(cvName, commitName)) {
                return true;
            }
        }
        return ownerMatchesCandidate && !ownerLower.isEmpty() && ownerLower.equals(login);
    }

    private static boolean namesRoughlyMatch(String a, String b) {
        if (a.equals(b) || a.contains(b) || b.contains(a)) return true;
        String[] partsA = a.split(" ");
        String[] partsB = b.split(" ");
        int overlap = 0;
        for (String pa : partsA) {
            if (pa.length() < 2) continue;
            for (String pb : partsB) {
                if (pa.equals(pb)) {
                    overlap++;
                    break;
                }
            }
        }
        return overlap >= 2;
    }

    private static boolean isGenericMessage(String msg) {
        if (msg == null) return true;
        String lower = msg.trim().toLowerCase(Locale.ROOT);
        if (lower.length() <= 6) return true;
        return lower.equals("initial commit") || lower.equals("first commit") || lower.equals("update")
                || lower.equals("fix") || lower.equals("add files via upload") || lower.startsWith("update ");
    }

    private static String normLogin(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private static String normEmail(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private static String normName(String value) {
        if (value == null || value.isBlank()) return "";
        String nfd = Normalizer.normalize(value, Normalizer.Form.NFD);
        String stripped = nfd.replaceAll("\\p{M}+", "")
                .replace('đ', 'd').replace('Đ', 'D')
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9\\s]", " ")
                .replaceAll("\\s+", " ")
                .trim();
        return stripped;
    }
}
