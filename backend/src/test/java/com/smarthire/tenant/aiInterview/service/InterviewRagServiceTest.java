package com.smarthire.tenant.aiInterview.service;

import static org.junit.jupiter.api.Assertions.*;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

class InterviewRagServiceTest {

    @Test
    @DisplayName("cosineSimilarity returns 1.0 for identical vectors")
    void testCosineSimilarityIdentical() {
        float[] v1 = new float[]{1.0f, 2.0f, 3.0f};
        float[] v2 = new float[]{1.0f, 2.0f, 3.0f};
        double sim = InterviewRagService.cosineSimilarity(v1, v2);
        assertEquals(1.0, sim, 0.0001);
    }

    @Test
    @DisplayName("cosineSimilarity returns 0.0 for orthogonal vectors")
    void testCosineSimilarityOrthogonal() {
        float[] v1 = new float[]{1.0f, 0.0f};
        float[] v2 = new float[]{0.0f, 1.0f};
        double sim = InterviewRagService.cosineSimilarity(v1, v2);
        assertEquals(0.0, sim, 0.0001);
    }

    @Test
    @DisplayName("cosineSimilarity handles threshold 0.65 correctly")
    void testThresholdCheck() {
        float[] v1 = new float[]{0.8f, 0.6f};
        float[] v2 = new float[]{0.7f, 0.714f};
        double sim = InterviewRagService.cosineSimilarity(v1, v2);
        assertTrue(sim >= InterviewRagService.DEFAULT_SIMILARITY_THRESHOLD, "Similarity should exceed 0.65 threshold");
    }

    @Test
    @DisplayName("cosineSimilarity safely handles empty or null vectors")
    void testCosineSimilarityEdgeCases() {
        assertEquals(0.0, InterviewRagService.cosineSimilarity(null, new float[]{1.0f}));
        assertEquals(0.0, InterviewRagService.cosineSimilarity(new float[0], new float[0]));
        assertEquals(0.0, InterviewRagService.cosineSimilarity(new float[]{1.0f}, new float[]{1.0f, 2.0f}));
    }
}

