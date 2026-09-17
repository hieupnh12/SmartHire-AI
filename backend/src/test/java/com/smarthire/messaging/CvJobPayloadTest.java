package com.smarthire.messaging;

import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class CvJobPayloadTest {
    @Test
    void readsIdFromJson() {
        assertThat(CvJobPayload.cvIdFrom("{\"cvId\":42}")).isEqualTo(42L);
        assertThat(new CvJobPayload(7).cvId()).isEqualTo(7L);
    }
}
