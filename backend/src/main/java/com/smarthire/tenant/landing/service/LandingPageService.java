package com.smarthire.tenant.landing.service;

import com.smarthire.tenant.landing.dto.LandingPageConfigDto;
import com.smarthire.tenant.landing.dto.LandingPageResponse;
import com.smarthire.tenant.landing.dto.UpdateLandingPageRequest;

public interface LandingPageService {

    LandingPageConfigDto getPublicLandingConfig();

    LandingPageResponse getAdminLandingPage();

    LandingPageResponse updateLandingPage(UpdateLandingPageRequest request);

    LandingPageResponse resetToDefault();
}
