package com.smarthire.tenant.auth.dto;

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
public class TenantRoleCatalogResponse {
    private List<String> features;
    private List<TenantRoleResponse> roles;
}
