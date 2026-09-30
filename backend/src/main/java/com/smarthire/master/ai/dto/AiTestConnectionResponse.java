package com.smarthire.master.ai.dto;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AiTestConnectionResponse {
    Boolean success;
    String message;
    Long latencyMs;
    String modelVersion;
}
