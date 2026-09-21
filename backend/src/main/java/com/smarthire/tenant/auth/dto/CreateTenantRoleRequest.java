package com.smarthire.tenant.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.util.List;
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
public class CreateTenantRoleRequest {

    @NotBlank(message = "Role name is required")
    @Size(max = 128, message = "Role name must be at most 128 characters")
    private String name;

    private List<String> features;
}
