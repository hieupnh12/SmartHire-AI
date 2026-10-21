package com.smarthire.tenant.cv.github;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Test;

class RestGithubApiClientTest {
    private final ObjectMapper mapper = new ObjectMapper();

    @Test
    void retries429ThenReadsRepository() {
        FakeHttp http = new FakeHttp();
        http.script.add(new GithubHttp.Response(429, "rate", null, 0));
        http.script.add(new GithubHttp.Response(200, "{\"full_name\":\"octo/demo\",\"private\":false,\"default_branch\":\"main\"}", null, 0));
        http.script.add(new GithubHttp.Response(200, "{\"commit\":{\"sha\":\"abc\"}}", null, 0));
        var client = client(http, 2);
        var repo = client.repository("octo", "demo");
        assertThat(repo.fullName()).isEqualTo("octo/demo");
        assertThat(http.paths).hasSize(3);
    }

    @Test
    void doesNotRetryForbiddenAndRefusesRedirects() {
        FakeHttp forbidden = new FakeHttp();
        forbidden.script.add(new GithubHttp.Response(403, "nope", null, 0));
        assertThatThrownBy(() -> client(forbidden, 2).repository("octo", "demo"))
                .isInstanceOf(GithubApiException.class)
                .extracting(ex -> ((GithubApiException) ex).code())
                .isEqualTo("GITHUB_403");
        assertThat(forbidden.paths).hasSize(1);

        FakeHttp redirect = new FakeHttp();
        redirect.script.add(new GithubHttp.Response(302, "", "http://127.0.0.1/secret", 0));
        assertThatThrownBy(() -> client(redirect, 2).repository("octo", "demo"))
                .isInstanceOf(GithubApiException.class)
                .extracting(ex -> ((GithubApiException) ex).code())
                .isEqualTo("GITHUB_REDIRECT");
        assertThat(redirect.paths).hasSize(1);
    }

    @Test
    void maps404AndRetriesTimeout() {
        FakeHttp missing = new FakeHttp();
        missing.script.add(new GithubHttp.Response(404, "{}", null, 0));
        assertThatThrownBy(() -> client(missing, 2).repository("octo", "missing"))
                .extracting(ex -> ((GithubApiException) ex).status()).isEqualTo(404);

        FakeHttp timeout = new FakeHttp();
        timeout.fail = new GithubApiException(0, "GITHUB_TIMEOUT", "timeout");
        assertThatThrownBy(() -> client(timeout, 1).repository("octo", "demo"))
                .extracting(ex -> ((GithubApiException) ex).code()).isEqualTo("GITHUB_TIMEOUT");
        assertThat(timeout.calls).isEqualTo(2);
    }

    @Test
    void rejectsPathsThatLeaveGithub() {
        assertThatThrownBy(() -> JdkGithubHttp.endpoint("http://127.0.0.1/latest"))
                .isInstanceOf(GithubApiException.class);
        assertThatThrownBy(() -> JdkGithubHttp.endpoint("//evil.com/repos"))
                .isInstanceOf(GithubApiException.class);
        assertThatThrownBy(() -> RestGithubApiClient.seg("../secret"))
                .isInstanceOf(GithubApiException.class);
        assertThat(JdkGithubHttp.endpoint("/repos/octo/demo").getHost()).isEqualTo("api.github.com");
    }

    private RestGithubApiClient client(FakeHttp http, int retries) {
        return new RestGithubApiClient(http, mapper, retries, 1000, millis -> { });
    }

    private static final class FakeHttp implements GithubHttp {
        private final List<Response> script = new ArrayList<>();
        private final List<String> paths = new ArrayList<>();
        private int cursor;
        private int calls;
        private GithubApiException fail;

        @Override
        public Response get(String pathAndQuery, String accept) {
            calls++;
            paths.add(pathAndQuery);
            if (fail != null) throw fail;
            return script.get(cursor++);
        }
    }
}
