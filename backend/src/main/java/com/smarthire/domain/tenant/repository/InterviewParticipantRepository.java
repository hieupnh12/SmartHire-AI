package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.InterviewParticipant;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InterviewParticipantRepository extends JpaRepository<InterviewParticipant, InterviewParticipant.InterviewParticipantId> {
}
