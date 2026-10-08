package com.smarthire.domain.tenant.repository;

import com.smarthire.domain.tenant.entity.Candidate;
import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CandidateRepository extends JpaRepository<Candidate, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select c from Candidate c where c.id = :id")
    Optional<Candidate> findLockedById(@Param("id") Long id);

    Optional<Candidate> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);
}
