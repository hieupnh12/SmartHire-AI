package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.Option;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface OptionRepository extends JpaRepository<Option, Long> {
    List<Option> findByQuestion_IdOrderByIdAsc(Long questionId);
    Optional<Option> findByIdAndQuestion_Id(Long id, Long questionId);
}
