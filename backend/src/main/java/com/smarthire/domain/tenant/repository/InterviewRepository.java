package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.Interview;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InterviewRepository extends JpaRepository<Interview, Long> {
    List<Interview> findByCv_Id(Long cvId);
}

