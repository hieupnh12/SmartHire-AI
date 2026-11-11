package com.smarthire.tenant.analytics.recruiter.mapper;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.sql.Timestamp;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Date;
import java.util.Locale;
import org.springframework.stereotype.Component;

@Component
public class RecruiterAnalyticsMapper {
    public long number(Object value) {
        return value == null ? 0 : ((Number) value).longValue();
    }

    public String text(Object value) {
        return value == null ? null : value.toString();
    }

    public BigDecimal decimal(Object value) {
        if (value == null) return null;
        return value instanceof BigDecimal decimal
                ? decimal.setScale(1, RoundingMode.HALF_UP)
                : BigDecimal.valueOf(((Number) value).doubleValue()).setScale(1, RoundingMode.HALF_UP);
    }

    public Instant instant(Object value) {
        if (value == null) return null;
        if (value instanceof Instant instant) return instant;
        if (value instanceof Timestamp ts) return ts.toInstant();
        if (value instanceof LocalDateTime ldt) return ldt.toInstant(ZoneOffset.UTC);
        if (value instanceof Date date) return date.toInstant();
        return Instant.parse(value.toString());
    }

    public BigDecimal percent(long numerator, long denominator) {
        if (denominator == 0) return BigDecimal.ZERO.setScale(1);
        return BigDecimal.valueOf(numerator * 100.0 / denominator).setScale(1, RoundingMode.HALF_UP);
    }

    public String sourceLabel(String code) {
        return switch (code) {
            case "REFERRAL" -> "Referral";
            case "LINKEDIN" -> "LinkedIn";
            case "CAREER", "CAREER_SITE" -> "Career site";
            case "PORTAL" -> "Candidate portal";
            case "MANUAL" -> "Manual";
            case "JOB_BOARD", "JOB_BOARDS" -> "Job boards";
            default -> code.toLowerCase(Locale.ROOT).replace('_', ' ');
        };
    }
}
