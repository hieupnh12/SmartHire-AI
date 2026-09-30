package com.smarthire.master.admin.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.experimental.FieldDefaults;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
public class CreatePlatformUserRequest {

    @NotBlank(message = "Email cannot be blank")
    @Email(message = "Invalid email format")
    String email;

    @NotBlank(message = "Password cannot be blank")
    String password;

    @NotBlank(message = "Full name cannot be blank")
    String fullName;

    @Builder.Default
    String role = "WORKSPACE_ADMIN";
}
