package com.smarthire.domain.master.repository;

import com.smarthire.domain.master.entity.AiModelConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface AiModelConfigRepository extends JpaRepository<AiModelConfig, Long> {
    Optional<AiModelConfig> findByTaskType(String taskType);
}
