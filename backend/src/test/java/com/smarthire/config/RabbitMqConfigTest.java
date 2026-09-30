package com.smarthire.config;

import static org.assertj.core.api.Assertions.assertThat;

import org.junit.jupiter.api.Test;

class RabbitMqConfigTest {

    @Test
    void declaresDurableAiInterviewEmailQueue() {
        var queue = new RabbitMqConfig().interviewEmailQueue("tenant.interview.email");

        assertThat(queue.getName()).isEqualTo("tenant.interview.email");
        assertThat(queue.isDurable()).isTrue();
        assertThat(queue.isExclusive()).isFalse();
        assertThat(queue.isAutoDelete()).isFalse();
    }
}
