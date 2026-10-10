package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.InterviewMessage;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InterviewMessageRepository extends JpaRepository<InterviewMessage, Long> {
    List<InterviewMessage> findBySession_IdOrderBySequenceNoAsc(Long sessionId);

    @org.springframework.data.jpa.repository.Query("select coalesce(sum(m.recordingSize), 0) from InterviewMessage m where m.recordingSize is not null")
    long sumTotalRecordingSize();
}
