package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.Option;
import org.springframework.data.jpa.repository.JpaRepository;

public interface OptionRepository extends JpaRepository<Option, Long> {
}
