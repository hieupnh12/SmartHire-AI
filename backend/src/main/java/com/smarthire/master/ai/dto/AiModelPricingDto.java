package com.smarthire.master.ai.dto;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiModelPricingDto {
    private Long id;
    private String provider;
    private String modelName;
    private BigDecimal inputPricePer1mTokens;
    private BigDecimal outputPricePer1mTokens;
    private Boolean isActive;
    private LocalDateTime updatedAt;
}
