package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.CvSkill;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CvSkillRepository extends JpaRepository<CvSkill, Long> {
    List<CvSkill> findByCv_Id(Long cvId);
    void deleteByCv_Id(Long cvId);
}
