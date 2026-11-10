package com.smarthire.tenant.matching.service;

import com.smarthire.messaging.JobPublisher;
import java.util.LinkedHashSet;
import java.util.Set;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

/** Queues a ranking snapshot rebuild once the score-changing transaction has committed. */
@Component
public class RankingRecomputeTrigger {
    private static final Logger log = LoggerFactory.getLogger(RankingRecomputeTrigger.class);
    private final JobPublisher publisher;

    public RankingRecomputeTrigger(JobPublisher publisher) {
        this.publisher = publisher;
    }

    public void request(Long jobId) {
        if (jobId == null) return;
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            publish(jobId);
            return;
        }
        @SuppressWarnings("unchecked")
        Set<Long> pending = (Set<Long>) TransactionSynchronizationManager.getResource(this);
        if (pending == null) {
            Set<Long> jobs = new LinkedHashSet<>();
            TransactionSynchronizationManager.bindResource(this, jobs);
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void afterCommit() { jobs.forEach(RankingRecomputeTrigger.this::publish); }
                @Override public void afterCompletion(int status) { TransactionSynchronizationManager.unbindResourceIfPossible(RankingRecomputeTrigger.this); }
            });
            pending = jobs;
        }
        pending.add(jobId);
    }

    // Ranking is a derived view; a broker outage must not fail the scoring transaction.
    private void publish(long jobId) {
        try {
            publisher.publishRankingRecompute(jobId);
        } catch (RuntimeException ex) {
            log.warn("Ranking recompute was not queued for job {}: {}", jobId, ex.toString());
        }
    }
}
