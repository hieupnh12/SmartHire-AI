package com.smarthire.common.api;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertTrue;

class ApiResponseTest {

    @Test
    void ok_setsSuccessTrue() {
        var response = ApiResponse.ok("ping");
        assertTrue(response.success());
    }
}
