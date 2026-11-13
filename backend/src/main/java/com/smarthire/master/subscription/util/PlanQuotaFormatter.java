package com.smarthire.master.subscription.util;

import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.util.Locale;

/**
 * Shared human-readable quota formatter aligned with runtime quota enforcement
 * ({@code null} or {@code < 0} = Unlimited, {@code 0} = Unsupported / Disabled, {@code > 0} = metered limit).
 */
public final class PlanQuotaFormatter {

    private PlanQuotaFormatter() {
    }

    public static String formatLimit(Integer quota, String unit, boolean monthly) {
        if (quota == null || quota < 0) {
            return "Không giới hạn";
        }
        if (quota == 0) {
            return "Không hỗ trợ";
        }
        DecimalFormatSymbols symbols = new DecimalFormatSymbols(Locale.of("vi", "VN"));
        symbols.setGroupingSeparator('.');
        DecimalFormat df = new DecimalFormat("#,###", symbols);
        String formatted = df.format(quota);
        StringBuilder sb = new StringBuilder(formatted);
        if (unit != null && !unit.isBlank()) {
            sb.append(' ').append(unit.trim());
        }
        if (monthly) {
            sb.append("/tháng");
        }
        return sb.toString();
    }
}
