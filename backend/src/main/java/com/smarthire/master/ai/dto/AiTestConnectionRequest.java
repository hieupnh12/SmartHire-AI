package com.smarthire.master.ai.dto;

import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AiTestConnectionRequest {
    String provider; // GEMINI, OPENAI, etc.
    String apiKey;   // Optional if testing an existing saved key by keyId
    Long keyId;      // Optional ID of existing key
    String modelName;
    String endpointUrl;
}
