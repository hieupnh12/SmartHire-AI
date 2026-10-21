package com.smarthire.tenant.cv.github;

import com.smarthire.tenant.cv.ai.GeminiCvAiClient;
import org.springframework.stereotype.Component;

/** Uses the configured model chain. Falls back to the CV parsing chain inside the client. */
@Component
public class GeminiGithubCodeAdvisor implements GithubCodeAdvisor {
    static final String TASK = "GITHUB_ANALYSIS";
    private final GeminiCvAiClient ai;

    public GeminiGithubCodeAdvisor(GeminiCvAiClient ai) {
        this.ai = ai;
    }

    @Override
    public String modelKey() {
        return ai.modelLabel(TASK);
    }

    @Override
    public Advice advise(String system, String user) {
        try {
            GeminiCvAiClient.AiJsonCompletion completion = ai.completeForTask(TASK, system, user);
            String model = (completion.provider() == null ? "" : completion.provider()) + ":" + completion.model();
            return new Advice(completion.json(), completion.promptTokens(), completion.completionTokens(), model);
        } catch (RuntimeException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new IllegalStateException(ex.getMessage(), ex);
        }
    }
}
