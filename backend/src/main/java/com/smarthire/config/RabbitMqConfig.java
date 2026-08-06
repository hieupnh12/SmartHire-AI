package com.smarthire.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.Queue;
import org.springframework.amqp.core.QueueBuilder;
import org.springframework.amqp.core.TopicExchange;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Request Queue + Worker Pool topology.
 * API publishes → exchange → durable queue → {@code @RabbitListener} workers
 * (concurrency from spring.rabbitmq.listener.simple.*).
 */
@Configuration
public class RabbitMqConfig {

    public static final String RK = "event";

    @Bean
    public MessageConverter jacksonMessageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    // --- Exchanges ---

    @Bean
    public TopicExchange cvParseExchange(@Value("${app.rabbitmq.exchanges.cv-parse}") String name) {
        return new TopicExchange(name, true, false);
    }

    @Bean
    public TopicExchange cvExtractExchange(@Value("${app.rabbitmq.exchanges.cv-extract}") String name) {
        return new TopicExchange(name, true, false);
    }

    @Bean
    public TopicExchange cvAnalysisExchange(@Value("${app.rabbitmq.exchanges.cv-analysis}") String name) {
        return new TopicExchange(name, true, false);
    }

    @Bean
    public TopicExchange cvMatchingExchange(@Value("${app.rabbitmq.exchanges.cv-matching}") String name) {
        return new TopicExchange(name, true, false);
    }

    @Bean
    public TopicExchange interviewQuestionsExchange(
            @Value("${app.rabbitmq.exchanges.interview-questions}") String name) {
        return new TopicExchange(name, true, false);
    }

    @Bean
    public TopicExchange interviewSttExchange(@Value("${app.rabbitmq.exchanges.interview-stt}") String name) {
        return new TopicExchange(name, true, false);
    }

    @Bean
    public TopicExchange interviewNlpExchange(@Value("${app.rabbitmq.exchanges.interview-nlp}") String name) {
        return new TopicExchange(name, true, false);
    }

    @Bean
    public TopicExchange interviewScoreExchange(
            @Value("${app.rabbitmq.exchanges.interview-score}") String name) {
        return new TopicExchange(name, true, false);
    }

    @Bean
    public TopicExchange assessmentCodeGradeExchange(
            @Value("${app.rabbitmq.exchanges.assessment-code-grade}") String name) {
        return new TopicExchange(name, true, false);
    }

    @Bean
    public TopicExchange practiceFeedbackExchange(
            @Value("${app.rabbitmq.exchanges.practice-feedback}") String name) {
        return new TopicExchange(name, true, false);
    }

    @Bean
    public TopicExchange notifyEmailExchange(@Value("${app.rabbitmq.exchanges.notify-email}") String name) {
        return new TopicExchange(name, true, false);
    }

    @Bean
    public TopicExchange authEmailOtpExchange(
            @Value("${app.rabbitmq.exchanges.auth-email-otp}") String name) {
        return new TopicExchange(name, true, false);
    }

    @Bean
    public TopicExchange jobEventsExchange(@Value("${app.rabbitmq.exchanges.job-events}") String name) {
        return new TopicExchange(name, true, false);
    }

    // --- Queues (durable) ---

    @Bean
    public Queue cvAnalysisQueue(@Value("${app.rabbitmq.queues.cv-analysis}") String name) {
        return QueueBuilder.durable(name).build();
    }

    @Bean
    public Queue cvParseQueue(@Value("${app.rabbitmq.queues.cv-parse}") String name) {
        return QueueBuilder.durable(name).build();
    }

    @Bean
    public Queue cvExtractQueue(@Value("${app.rabbitmq.queues.cv-extract}") String name) {
        return QueueBuilder.durable(name).build();
    }

    @Bean
    public Queue cvMatchingQueue(@Value("${app.rabbitmq.queues.cv-matching}") String name) {
        return QueueBuilder.durable(name).build();
    }

    @Bean
    public Queue interviewQuestionsQueue(
            @Value("${app.rabbitmq.queues.interview-questions}") String name) {
        return QueueBuilder.durable(name).build();
    }

    @Bean
    public Queue interviewSttQueue(@Value("${app.rabbitmq.queues.interview-stt}") String name) {
        return QueueBuilder.durable(name).build();
    }

    @Bean
    public Queue interviewNlpQueue(@Value("${app.rabbitmq.queues.interview-nlp}") String name) {
        return QueueBuilder.durable(name).build();
    }

    @Bean
    public Queue interviewScoreQueue(@Value("${app.rabbitmq.queues.interview-score}") String name) {
        return QueueBuilder.durable(name).build();
    }

    @Bean
    public Queue assessmentCodeGradeQueue(
            @Value("${app.rabbitmq.queues.assessment-code-grade}") String name) {
        return QueueBuilder.durable(name).build();
    }

    @Bean
    public Queue practiceFeedbackQueue(
            @Value("${app.rabbitmq.queues.practice-feedback}") String name) {
        return QueueBuilder.durable(name).build();
    }

    @Bean
    public Queue notifyEmailQueue(@Value("${app.rabbitmq.queues.notify-email}") String name) {
        return QueueBuilder.durable(name).build();
    }

    @Bean
    public Queue authEmailOtpQueue(@Value("${app.rabbitmq.queues.auth-email-otp}") String name) {
        return QueueBuilder.durable(name).build();
    }

    @Bean
    public Queue jobEventsQueue(@Value("${app.rabbitmq.queues.job-events}") String name) {
        return QueueBuilder.durable(name).build();
    }

    // --- Bindings ---

    @Bean
    public Binding cvAnalysisBinding(Queue cvAnalysisQueue, TopicExchange cvAnalysisExchange) {
        return BindingBuilder.bind(cvAnalysisQueue).to(cvAnalysisExchange).with(RK);
    }

    @Bean
    public Binding cvParseBinding(Queue cvParseQueue, TopicExchange cvParseExchange) {
        return BindingBuilder.bind(cvParseQueue).to(cvParseExchange).with(RK);
    }

    @Bean
    public Binding cvExtractBinding(Queue cvExtractQueue, TopicExchange cvExtractExchange) {
        return BindingBuilder.bind(cvExtractQueue).to(cvExtractExchange).with(RK);
    }

    @Bean
    public Binding cvMatchingBinding(Queue cvMatchingQueue, TopicExchange cvMatchingExchange) {
        return BindingBuilder.bind(cvMatchingQueue).to(cvMatchingExchange).with(RK);
    }

    @Bean
    public Binding interviewQuestionsBinding(
            Queue interviewQuestionsQueue, TopicExchange interviewQuestionsExchange) {
        return BindingBuilder.bind(interviewQuestionsQueue).to(interviewQuestionsExchange).with(RK);
    }

    @Bean
    public Binding interviewSttBinding(Queue interviewSttQueue, TopicExchange interviewSttExchange) {
        return BindingBuilder.bind(interviewSttQueue).to(interviewSttExchange).with(RK);
    }

    @Bean
    public Binding interviewNlpBinding(Queue interviewNlpQueue, TopicExchange interviewNlpExchange) {
        return BindingBuilder.bind(interviewNlpQueue).to(interviewNlpExchange).with(RK);
    }

    @Bean
    public Binding interviewScoreBinding(
            Queue interviewScoreQueue, TopicExchange interviewScoreExchange) {
        return BindingBuilder.bind(interviewScoreQueue).to(interviewScoreExchange).with(RK);
    }

    @Bean
    public Binding assessmentCodeGradeBinding(
            Queue assessmentCodeGradeQueue, TopicExchange assessmentCodeGradeExchange) {
        return BindingBuilder.bind(assessmentCodeGradeQueue).to(assessmentCodeGradeExchange).with(RK);
    }

    @Bean
    public Binding practiceFeedbackBinding(
            Queue practiceFeedbackQueue, TopicExchange practiceFeedbackExchange) {
        return BindingBuilder.bind(practiceFeedbackQueue).to(practiceFeedbackExchange).with(RK);
    }

    @Bean
    public Binding notifyEmailBinding(Queue notifyEmailQueue, TopicExchange notifyEmailExchange) {
        return BindingBuilder.bind(notifyEmailQueue).to(notifyEmailExchange).with(RK);
    }

    @Bean
    public Binding authEmailOtpBinding(Queue authEmailOtpQueue, TopicExchange authEmailOtpExchange) {
        return BindingBuilder.bind(authEmailOtpQueue).to(authEmailOtpExchange).with(RK);
    }

    @Bean
    public Binding jobEventsBinding(Queue jobEventsQueue, TopicExchange jobEventsExchange) {
        return BindingBuilder.bind(jobEventsQueue).to(jobEventsExchange).with(RK);
    }
}
