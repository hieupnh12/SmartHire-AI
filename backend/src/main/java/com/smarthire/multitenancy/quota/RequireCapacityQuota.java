package com.smarthire.multitenancy.quota;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

/**
 * Indicates that the annotated method creates an entity subject to a capacity limit
 * (e.g., maximum active jobs). 
 * Checked by counting active records in the Tenant Database.
 */
@Target(ElementType.METHOD)
@Retention(RetentionPolicy.RUNTIME)
public @interface RequireCapacityQuota {
    QuotaType type();
    int defaultMax() default Integer.MAX_VALUE;
}
