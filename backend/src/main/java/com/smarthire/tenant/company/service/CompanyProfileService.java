package com.smarthire.tenant.company.service;

import com.smarthire.tenant.company.dto.CompanyProfileResponse;
import com.smarthire.tenant.company.dto.UpdateCompanyProfileRequest;

public interface CompanyProfileService {

    CompanyProfileResponse getProfile();

    CompanyProfileResponse updateProfile(UpdateCompanyProfileRequest request);
}
