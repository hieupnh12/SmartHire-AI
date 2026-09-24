package com.smarthire.multitenancy.quota;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Indicates that the annotated method consumes a metered quota.
 * Quota is reserved atomically in Redis. If overage is allowed, the request will pass
 * but the overage will be tracked for pay-as-you-go billing.
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface RequireMeteredQuota {
    QuotaType type();
    int count() default 1;
}
