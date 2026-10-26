package com.smarthire.tenant.company.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;
import java.util.Map;

public final class CompanyDirectoryModels {
    private CompanyDirectoryModels() {}

    public record CompanyDirectoryResponse(
            List<String> departments,
            List<String> locations,
            Map<String, List<String>> locationDepartments,
            Map<String, Long> locationJobCounts,
            Map<String, Long> departmentJobCounts) {

        public CompanyDirectoryResponse(List<String> departments, List<String> locations) {
            this(departments, locations, Map.of(), Map.of(), Map.of());
        }

        public CompanyDirectoryResponse(List<String> departments, List<String> locations, Map<String, List<String>> locationDepartments) {
            this(departments, locations, locationDepartments, Map.of(), Map.of());
        }
    }

    public record UpdateCompanyDirectoryRequest(
            @NotNull List<@Size(min = 1, max = 128) String> departments,
            @NotNull List<@Size(min = 1, max = 255) String> locations,
            Map<String, List<String>> locationDepartments) {

        public UpdateCompanyDirectoryRequest(List<String> departments, List<String> locations) {
            this(departments, locations, Map.of());
        }
    }
}
