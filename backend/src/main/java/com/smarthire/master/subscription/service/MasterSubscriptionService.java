package com.smarthire.master.subscription.service;

import com.smarthire.domain.master.entity.SubscriptionPlan;
import com.smarthire.domain.master.repository.SubscriptionPlanRepository;
import com.smarthire.master.subscription.dto.CreateSubscriptionPlanRequest;
import com.smarthire.master.subscription.dto.SubscriptionPlanResponse;
import com.smarthire.master.subscription.dto.UpdateSubscriptionPlanRequest;
import com.smarthire.master.subscription.mapper.SubscriptionPlanMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class MasterSubscriptionService {

    private final SubscriptionPlanRepository planRepository;
    private final SubscriptionPlanMapper planMapper;

    @Transactional(transactionManager = "masterTransactionManager", readOnly = true)
    public List<SubscriptionPlanResponse> getAllPlans() {
        return planRepository.findAll().stream()
                .map(planMapper::toResponse)
                .collect(Collectors.toList());
    }

    @Transactional("masterTransactionManager")
    public SubscriptionPlanResponse createPlan(CreateSubscriptionPlanRequest request) {
        if (planRepository.findByCode(request.getCode()).isPresent()) {
            throw new IllegalArgumentException("Plan code '" + request.getCode() + "' already exists.");
        }
        SubscriptionPlan plan = planMapper.toEntity(request);
        plan = planRepository.save(plan);
        return planMapper.toResponse(plan);
    }

    @Transactional("masterTransactionManager")
    public SubscriptionPlanResponse updatePlan(Long id, UpdateSubscriptionPlanRequest request) {
        SubscriptionPlan existing = planRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Subscription plan not found: " + id));
        
        planMapper.updateEntity(request, existing);
        existing = planRepository.save(existing);
        return planMapper.toResponse(existing);
    }

    @Transactional("masterTransactionManager")
    public SubscriptionPlanResponse updatePlanStatus(Long id, String status) {
        SubscriptionPlan existing = planRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Subscription plan not found: " + id));
        
        existing.setStatus(status.toUpperCase());
        existing = planRepository.save(existing);
        return planMapper.toResponse(existing);
    }
}
