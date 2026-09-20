package com.smarthire.tenant.auth.service;

import com.smarthire.tenant.auth.dto.GooglePayload;

public interface GoogleTokenVerifierService {
    GooglePayload verifyToken(String idToken);
}
