package com.smarthire.tenant.matching.service;

import static org.mockito.Mockito.*;

import com.smarthire.messaging.JobPublisher;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

class RankingRecomputeTriggerTest {
    private final JobPublisher publisher = mock(JobPublisher.class);
    private final RankingRecomputeTrigger trigger = new RankingRecomputeTrigger(publisher);

    @AfterEach
    void cleanup() {
        TransactionSynchronizationManager.unbindResourceIfPossible(trigger);
        if (TransactionSynchronizationManager.isSynchronizationActive())
            TransactionSynchronizationManager.clearSynchronization();
    }

    @Test
    void publishesOncePerJobAfterCommit() {
        TransactionSynchronizationManager.initSynchronization();
        trigger.request(7L);
        trigger.request(7L);
        trigger.request(8L);
        verifyNoInteractions(publisher);

        var syncs = TransactionSynchronizationManager.getSynchronizations();
        syncs.forEach(TransactionSynchronization::afterCommit);
        syncs.forEach(s -> s.afterCompletion(TransactionSynchronization.STATUS_COMMITTED));

        verify(publisher, times(1)).publishRankingRecompute(7L);
        verify(publisher, times(1)).publishRankingRecompute(8L);
    }

    @Test
    void skipsPublishOnRollback() {
        TransactionSynchronizationManager.initSynchronization();
        trigger.request(7L);
        TransactionSynchronizationManager.getSynchronizations()
                .forEach(s -> s.afterCompletion(TransactionSynchronization.STATUS_ROLLED_BACK));
        verifyNoInteractions(publisher);
    }

    @Test
    void publishesImmediatelyWithoutTransactionAndSwallowsBrokerErrors() {
        doThrow(new IllegalStateException("broker down")).when(publisher).publishRankingRecompute(9L);
        trigger.request(9L);
        trigger.request(null);
        verify(publisher).publishRankingRecompute(9L);
        verifyNoMoreInteractions(publisher);
    }
}
