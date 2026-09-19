package com.smarthire.tenant.auth.dto;

import java.util.List;
import java.util.Map;
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
public class RolePermissionsResponse {
    private List<String> assignableRoles;
    private List<String> features;
    private Map<String, List<String>> grants;
}
