package com.smarthire.domain.enums;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class UserRoleTest {

    @Test
    void customCodesAreRecruiterStaff() {
        assertTrue(UserRole.isRecruiterStaff("CV_SCREENING"));
        assertTrue(UserRole.isRecruiterStaff("HR"));
        assertFalse(UserRole.isRecruiterStaff("TENANT_ADMIN"));
        assertFalse(UserRole.isRecruiterStaff("CANDIDATE"));
        assertEquals("RECRUITER", UserRole.workspaceOf("CV_SCREENING"));
        assertEquals("ADMIN", UserRole.workspaceOf("ADMIN"));
    }
}
