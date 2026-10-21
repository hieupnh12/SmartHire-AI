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
            boolean archived) {}

    record TreeItem(String path, String sha, long size, String type) {}

    record TreePage(List<TreeItem> items, boolean truncated) {}

    record CompareResult(List<String> paths) {}

    RepoSnapshot repository(String owner, String repo);

    List<RepoSnapshot> listRepositories(String owner, int limit);

    String readme(String owner, String repo, String ref);

    TreePage tree(String owner, String repo, String sha);

    String fileText(String owner, String repo, String path, String ref);

    CompareResult compare(String owner, String repo, String base, String head);

    default void resetRequests() {}

    int requestsMade();
}
