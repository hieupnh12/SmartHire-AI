package com.smarthire.tenant.job.screening;

import com.smarthire.common.exception.BusinessException;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class ScreeningConfigValidatorTest {
    private final ScreeningConfigValidator validator = new ScreeningConfigValidator();

    @Test
    void acceptsCvWeightsThatTotalOneHundred() {
        assertThatCode(() -> validator.requireCvWeights(
                d("40"), d("8"), d("12"), d("0"), d("15"), d("25"), d("60")))
                .doesNotThrowAnyException();
    }

    @Test
    void rejectsCvWeightsThatDoNotTotalOneHundred() {
        assertThatThrownBy(() -> validator.requireCvWeights(
                d("30"), d("25"), d("10"), d("10"), d("15"), d("20"), d("60")))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("100%");
    }

    @Test
    void rejectsNegativeCvWeight() {
        assertThatThrownBy(() -> validator.requireCvWeights(
                d("50"), d("-10"), d("20"), d("10"), d("15"), d("15"), d("60")))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("negative");
    }

    @Test
    void acceptsGateWeightsThatTotalOneHundred() {
        assertThatCode(() -> validator.requireGateWeights(d("40"), d("35"), d("25"), d("70")))
                .doesNotThrowAnyException();
    }

    @Test
    void rejectsGateWeightsThatDoNotTotalOneHundred() {
        assertThatThrownBy(() -> validator.requireGateWeights(d("40"), d("35"), d("20"), d("70")))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("100%");
    }

    @Test
    void rejectsThresholdOutsideZeroToOneHundred() {
        assertThatThrownBy(() -> validator.requireGateWeights(d("40"), d("35"), d("25"), d("120")))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("0 and 100");
    }

    private static BigDecimal d(String value) {
        return new BigDecimal(value);
    }
}
