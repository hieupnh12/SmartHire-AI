package com.smarthire.master.ai.dto;

import java.time.LocalDateTime;
import lombok.*;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class AiProviderKeyDto {
    Long id;
    String provider;
    String keyAlias;
    String maskedKey;
    String apiKey; // Plaintext when writing / editing, null when reading
    String endpointUrl;
    String status;
    Boolean isDefault;
    LocalDateTime lastTestedAt;
    LocalDateTime createdAt;
}
