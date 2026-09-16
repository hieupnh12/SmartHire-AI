package com.smarthire.tenant.auth.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GooglePayload {
    private String email;
    private String name;
    private String pictureUrl;
    private String sub;
    private boolean emailVerified;
}

