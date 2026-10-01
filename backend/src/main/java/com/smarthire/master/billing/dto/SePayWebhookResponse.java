package com.smarthire.master.billing.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SePayWebhookResponse {
    private boolean success;

    public static SePayWebhookResponse ok() {
        return new SePayWebhookResponse(true);
    }
}
