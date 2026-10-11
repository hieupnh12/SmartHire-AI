package com.smarthire.domain.master.repository;

import com.smarthire.domain.master.entity.AiModelPricing;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AiModelPricingRepository extends JpaRepository<AiModelPricing, Long> {
    Optional<AiModelPricing> findByProviderIgnoreCaseAndModelNameIgnoreCase(String provider, String modelName);
    List<AiModelPricing> findByIsActiveTrueOrderByProviderAscModelNameAsc();
    List<AiModelPricing> findAllByOrderByProviderAscModelNameAsc();
}
