package com.smarthire.tenant.company.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.util.List;

public final class CompanyDirectoryModels {
    private CompanyDirectoryModels() {}

    public record CompanyDirectoryResponse(List<String> departments, List<String> locations) {}

    public record UpdateCompanyDirectoryRequest(
            @NotNull List<@Size(min = 1, max = 128) String> departments,
            @NotNull List<@Size(min = 1, max = 255) String> locations) {}
}
