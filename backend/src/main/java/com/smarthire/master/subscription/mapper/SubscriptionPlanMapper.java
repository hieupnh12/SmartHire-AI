package com.smarthire.master.subscription.mapper;

import com.smarthire.domain.master.entity.SubscriptionPlan;
import com.smarthire.master.subscription.dto.CreateSubscriptionPlanRequest;
import com.smarthire.master.subscription.dto.SubscriptionPlanResponse;
import com.smarthire.master.subscription.dto.UpdateSubscriptionPlanRequest;
import org.mapstruct.Mapper;
import org.mapstruct.MappingTarget;
import org.mapstruct.ReportingPolicy;

@Mapper(componentModel = "spring", unmappedTargetPolicy = ReportingPolicy.IGNORE)
public interface SubscriptionPlanMapper {
    SubscriptionPlan toEntity(CreateSubscriptionPlanRequest request);
    SubscriptionPlanResponse toResponse(SubscriptionPlan entity);
    void updateEntity(UpdateSubscriptionPlanRequest request, @MappingTarget SubscriptionPlan entity);
}
