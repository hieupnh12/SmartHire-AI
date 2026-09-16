package com.smarthire.tenant.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
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
@Schema(description = "Google OAuth login request containing Google ID token")
public class GoogleLoginRequest {

    @NotBlank(message = "Google ID Token is required")
    @Schema(description = "OpenID Connect ID Token issued by Google", example = "eyJhbGciOiJSUzI1NiIs...")
    private String idToken;
}

