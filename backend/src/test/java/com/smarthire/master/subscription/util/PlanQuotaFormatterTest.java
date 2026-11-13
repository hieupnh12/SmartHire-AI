package com.smarthire.master.subscription.util;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class PlanQuotaFormatterTest {

    @Test
    void formatLimit_handlesNullAndNegativeAsUnlimited() {
        assertThat(PlanQuotaFormatter.formatLimit(null, "tin", false)).isEqualTo("Không giới hạn");
        assertThat(PlanQuotaFormatter.formatLimit(-1, "CV", true)).isEqualTo("Không giới hạn");
        assertThat(PlanQuotaFormatter.formatLimit(-5, "giờ", true)).isEqualTo("Không giới hạn");
    }

    @Test
    void formatLimit_handlesZeroAsUnsupported() {
        assertThat(PlanQuotaFormatter.formatLimit(0, "tin", false)).isEqualTo("Không hỗ trợ");
        assertThat(PlanQuotaFormatter.formatLimit(0, "giờ", true)).isEqualTo("Không hỗ trợ");
        assertThat(PlanQuotaFormatter.formatLimit(0, "GB", false)).isEqualTo("Không hỗ trợ");
    }

    @Test
    void formatLimit_formatsPositiveValuesWithVietnameseSeparatorsAndMonthlySuffix() {
        assertThat(PlanQuotaFormatter.formatLimit(25, "tin", false)).isEqualTo("25 tin");
        assertThat(PlanQuotaFormatter.formatLimit(2500, "CV", true)).isEqualTo("2.500 CV/tháng");
        assertThat(PlanQuotaFormatter.formatLimit(120, "giờ", true)).isEqualTo("120 giờ/tháng");
        assertThat(PlanQuotaFormatter.formatLimit(1000, "GB", false)).isEqualTo("1.000 GB");
    }
}
