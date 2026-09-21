package com.smarthire.master.ai.dto;

import java.math.BigDecimal;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AiModelConfigDto {
    Long id;
    String taskType;
    String taskName;
    String provider;
    String modelName;
    BigDecimal temperature;
    Integer maxTokens;
    Integer timeoutSeconds;
    String failoverProvider;
    String failoverModel;
    Boolean isActive;
}
