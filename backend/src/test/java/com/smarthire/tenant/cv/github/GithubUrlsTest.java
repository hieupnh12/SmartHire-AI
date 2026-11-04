package com.smarthire.tenant.cv.github;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class GithubUrlsTest {
    @Test
    void acceptsProfileAndRepositoryAndNormalizesTreeUrl() {
        assertThat(GithubUrls.parse("https://github.com/octo").orElseThrow().kind()).isEqualTo(GithubUrls.Kind.PROFILE);
        var repo = GithubUrls.parse("https://github.com/octo/demo/tree/main/src").orElseThrow();
        assertThat(repo.canonical()).isEqualTo("https://github.com/octo/demo");
        assertThat(GithubUrls.parse("github.com/octo/demo.git").orElseThrow().repo()).isEqualTo("demo");
    }

    @Test
    void rejectsSsrfAndNonGithubHosts() {
        assertThat(GithubUrls.parse("https://127.0.0.1/admin")).isEmpty();
        assertThat(GithubUrls.parse("https://169.254.169.254/latest")).isEmpty();
        assertThat(GithubUrls.parse("http://localhost/github.com/octo/demo")).isEmpty();
        assertThat(GithubUrls.parse("https://github.com.evil.com/octo/demo")).isEmpty();
        assertThat(GithubUrls.parse("https://evil.example/octo/demo")).isEmpty();
        assertThat(GithubUrls.parse("https://user:pass@github.com/octo/demo")).isEmpty();
        assertThat(GithubUrls.parse("https://gist.github.com/octo/demo")).isEmpty();
        assertThat(GithubUrls.parse("https://raw.githubusercontent.com/octo/demo/main/pom.xml")).isEmpty();
        assertThat(GithubUrls.parse("https://github.com/settings")).isEmpty();
    }
}
