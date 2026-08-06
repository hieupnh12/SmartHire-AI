package com.smarthire.domain.repository;

import com.smarthire.domain.entity.ProctorEvent;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ProctorEventRepository extends JpaRepository<ProctorEvent, Long> {
}
