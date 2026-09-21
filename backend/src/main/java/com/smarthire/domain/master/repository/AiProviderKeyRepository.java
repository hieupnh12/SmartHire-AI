package com.smarthire.domain.master.repository;

import com.smarthire.domain.master.entity.AiProviderKey;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AiProviderKeyRepository extends JpaRepository<AiProviderKey, Long> {
    List<AiProviderKey> findByProvider(String provider);
    Optional<AiProviderKey> findFirstByProviderAndStatus(String provider, String status);
    Optional<AiProviderKey> findFirstByProviderAndIsDefaultTrue(String provider);
}
