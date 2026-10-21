package com.smarthire.messaging;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

import com.smarthire.tenant.cv.github.GithubAnalysisService;
import org.junit.jupiter.api.Test;

class GithubAnalysisWorkerTest {
    @Test
    void runsInsideTheMessageTenantAndSwallowsAnalysisFailures() {
        TenantJobExecutor executor = mock(TenantJobExecutor.class);
        GithubAnalysisService analysis = mock(GithubAnalysisService.class);
        doAnswer(invocation -> {
            invocation.getArgument(1, Runnable.class).run();
            return null;
        }).when(executor).execute(eq("acme"), any());
        doThrow(new IllegalStateException("boom")).when(analysis).analyze(4L);

        new GithubAnalysisWorker(executor, analysis).onMessage(new CvJobPayload(4L), "acme");

        verify(executor).execute(eq("acme"), any());
        verify(analysis).analyze(4L);
    }
}
