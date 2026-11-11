package com.smarthire.tenant.cv.github;

import static org.assertj.core.api.Assertions.assertThat;

import com.smarthire.tenant.cv.github.GithubApiClient.CommitItem;
import com.smarthire.tenant.cv.github.GithubApiClient.RepoSnapshot;
import com.smarthire.tenant.cv.github.GithubApiClient.UserProfile;
import com.smarthire.tenant.cv.github.GithubAuthenticityAnalyzer.CandidateIdentity;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;

class GithubAuthenticityAnalyzerTest {
    @Test
    void unmodifiedForkSkipsLlmAndFlagsWarning() {
        RepoSnapshot fork = new RepoSnapshot(
                "cand/ecommerce", "cand", "ecommerce", "Shop", "main", "sha1", "Java",
                "https://github.com/cand/ecommerce", true, false, false,
                "2026-10-01T00:00:00Z", "2026-10-01T00:00:00Z", 500, 0, 0, "upstream/ecommerce");
        var report = GithubAuthenticityAnalyzer.assess(
                fork, null, List.of(), 0, 0, new CandidateIdentity("Nguyen An", "an@example.com", Set.of("cand")));

        assertThat(report.verdict()).isEqualTo("FORK_UNMODIFIED");
        assertThat(report.trustLevel()).isEqualTo("WARNING");
        assertThat(report.shouldSkipAi()).isTrue();
    }

    @Test
    void thirdPartyRepoWithoutCandidateCommitsSkipsAi() {
        RepoSnapshot repo = new RepoSnapshot(
                "stranger/bank-core", "stranger", "bank-core", "Core", "main", "sha1", "Java",
                "https://github.com/stranger/bank-core", false, false, false,
                "2025-01-01T00:00:00Z", "2025-06-01T00:00:00Z", 200, 12, 3, "");
        List<CommitItem> commits = List.of(
                new CommitItem("1", "stranger", "Tran Binh", "binh@other.com", "2025-06-01T10:00:00Z", "feat: add auth"),
                new CommitItem("2", "stranger", "Tran Binh", "binh@other.com", "2025-05-20T10:00:00Z", "feat: add db"));
        var report = GithubAuthenticityAnalyzer.assess(
                repo, new UserProfile("stranger", "Tran Binh", "", "2022-01-01T00:00:00Z", 10, 2),
                commits, 1, 0, new CandidateIdentity("Le Phuc Tien", "tien@gmail.com", Set.of("tienlp")));

        assertThat(report.verdict()).isEqualTo("THIRD_PARTY_REPO");
        assertThat(report.shouldSkipAi()).isTrue();
        assertThat(report.trustLevel()).isEqualTo("WARNING");
    }

    @Test
    void activeMultiDayMatchingCommitsProduceHighTrust() {
        RepoSnapshot repo = new RepoSnapshot(
                "tienlp/smarthire", "tienlp", "smarthire", "Backend", "main", "sha1", "Java",
                "https://github.com/tienlp/smarthire", false, false, false,
                "2026-01-01T00:00:00Z", "2026-03-01T00:00:00Z", 1200, 4, 1, "");
        List<CommitItem> commits = List.of(
                new CommitItem("1", "tienlp", "Le Phuc Tien", "tien@gmail.com", "2026-01-10T10:00:00Z", "feat: jwt auth flow"),
                new CommitItem("2", "tienlp", "Le Phuc Tien", "tien@gmail.com", "2026-02-02T10:00:00Z", "feat: rabbitmq consumer"));
        var report = GithubAuthenticityAnalyzer.assess(
                repo, new UserProfile("tienlp", "Le Phuc Tien", "", "2021-03-01T00:00:00Z", 18, 5),
                commits, 1, 0, new CandidateIdentity("Lê Phúc Tiến", "tien@gmail.com", Set.of("tienlp")));

        assertThat(report.verdict()).isEqualTo("VERIFIED_AUTHOR");
        assertThat(report.trustLevel()).isEqualTo("HIGH");
        assertThat(report.shouldSkipAi()).isFalse();
        assertThat(report.applicantCommits()).isEqualTo(2);
        assertThat(report.activeDays()).isEqualTo(2);
    }

    @Test
    void duplicateRepoInSameJobDowngradesTrustToWarning() {
        RepoSnapshot repo = new RepoSnapshot(
                "team/capstone", "team", "capstone", "App", "main", "sha1", "Java",
                "https://github.com/team/capstone", false, false, false);
        List<CommitItem> commits = List.of(
                new CommitItem("1", "teama", "Nguyen Van A", "a@fpt.edu.vn", "2026-01-10T10:00:00Z", "feat: api"),
                new CommitItem("2", "teamb", "Le Phuc Tien", "tien@fpt.edu.vn", "2026-01-12T10:00:00Z", "feat: service"));
        var report = GithubAuthenticityAnalyzer.assess(
                repo, null, commits, 1, 2, new CandidateIdentity("Lê Phúc Tiến", "tien@fpt.edu.vn", Set.of()));

        assertThat(report.verdict()).isEqualTo("TEAM_COLLABORATION");
        assertThat(report.duplicateCvCount()).isEqualTo(2);
        assertThat(report.trustLevel()).isEqualTo("WARNING");
        assertThat(report.applicantCommits()).isEqualTo(1);
        assertThat(report.applicantCommitRatio()).isEqualTo(50);
    }
}

