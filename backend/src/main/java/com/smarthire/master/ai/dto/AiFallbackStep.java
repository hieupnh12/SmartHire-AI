package com.smarthire.master.ai.dto;

import java.math.BigDecimal;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AiFallbackStep {
    String provider;
    String model;
    Integer timeoutSeconds;
    BigDecimal temperature;
}
