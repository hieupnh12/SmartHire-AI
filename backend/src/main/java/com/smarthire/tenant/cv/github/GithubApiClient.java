package com.smarthire.tenant.cv.github;

import java.util.List;

public interface GithubApiClient {
    record RepoSnapshot(
            String fullName,
            String owner,
            String name,
            String description,
            String defaultBranch,
            String commitSha,
            String language,
            String htmlUrl,
            boolean fork,
            boolean privateRepo,
            boolean archived,
            String createdAt,
            String pushedAt,
            long sizeKb,
            int stars,
            int forksCount,
            String parentFullName) {
        public RepoSnapshot(
                String fullName,
                String owner,
                String name,
                String description,
                String defaultBranch,
                String commitSha,
                String language,
                String htmlUrl,
                boolean fork,
                boolean privateRepo,
                boolean archived) {
            this(fullName, owner, name, description, defaultBranch, commitSha, language, htmlUrl,
                    fork, privateRepo, archived, "", "", 0L, 0, 0, "");
        }
    }

    record UserProfile(
            String login,
            String name,
            String email,
            String createdAt,
            int publicRepos,
            int followers) {}

    record CommitItem(
            String sha,
            String authorLogin,
            String authorName,
            String authorEmail,
            String committedAt,
            String message) {}

    record TreeItem(String path, String sha, long size, String type) {}

    record TreePage(List<TreeItem> items, boolean truncated) {}

    record CompareResult(List<String> paths, int aheadBy) {
        public CompareResult(List<String> paths) {
            this(paths, paths != null && !paths.isEmpty() ? 1 : 0);
        }
    }

    RepoSnapshot repository(String owner, String repo);

    List<RepoSnapshot> listRepositories(String owner, int limit);

    default UserProfile userProfile(String owner) {
        return null;
    }

    default List<CommitItem> commits(String owner, String repo, String ref, int limit) {
        return List.of();
    }

    String readme(String owner, String repo, String ref);

    TreePage tree(String owner, String repo, String sha);

    String fileText(String owner, String repo, String path, String ref);

    CompareResult compare(String owner, String repo, String base, String head);

    default int forkAheadBy(String parentFullName, String forkOwner, String forkBranch) {
        return 1;
    }

    default void resetRequests() {}

    int requestsMade();
}
