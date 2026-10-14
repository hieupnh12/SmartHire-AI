package com.smarthire.master.billing.event;

/**
 * Domain event published when a B2B or Self-Service Invoice is confirmed as PAID.
 * Consumed asynchronously after transaction commit to provision the dedicated
 * tenant MySQL database, run Flyway migrations, and send the workspace activation email.
 */
public record TenantPaymentSuccessEvent(
        Long invoiceId,
        String invoiceNumber,
        Long tenantId,
        Long subscriptionId
) {
}
