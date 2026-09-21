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
public class TenantRoleResponse {
    private Long id;
    private String code;
    private String name;
    private String workspace;
    private boolean system;
    private boolean assignable;
    private List<String> features;
}
