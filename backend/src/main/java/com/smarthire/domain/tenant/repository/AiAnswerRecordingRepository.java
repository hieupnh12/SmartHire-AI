package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.AiAnswerRecording;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AiAnswerRecordingRepository extends JpaRepository<AiAnswerRecording, Long> {
    Optional<AiAnswerRecording> findByAiAnswer_Id(Long answerId);
}
