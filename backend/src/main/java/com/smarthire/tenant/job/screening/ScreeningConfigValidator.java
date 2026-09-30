package com.smarthire.tenant.job.screening;

import com.smarthire.common.exception.BusinessException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

@Component
public class ScreeningConfigValidator {
    private static final BigDecimal HUNDRED = new BigDecimal("100");

    public void requireCvWeights(BigDecimal skill, BigDecimal preferred, BigDecimal experience,
            BigDecimal education, BigDecimal jaccard, BigDecimal semantic, BigDecimal passThreshold) {
        requireWeights("CV screening", List.of(skill, preferred, experience, education, jaccard, semantic));
        requireThreshold("CV pass threshold", passThreshold);
    }

    public void requireGateWeights(BigDecimal cv, BigDecimal interview, BigDecimal assessment, BigDecimal passThreshold) {
        requireWeights("Gate screening", List.of(cv, interview, assessment));
        requireThreshold("Gate pass threshold", passThreshold);
    }

    private void requireWeights(String label, List<BigDecimal> weights) {
        BigDecimal sum = BigDecimal.ZERO;
        for (BigDecimal weight : weights) {
            if (weight == null) {
                throw new BusinessException(label + " weights are required", HttpStatus.BAD_REQUEST, "SCREENING_WEIGHT_REQUIRED");
            }
            if (weight.signum() < 0) {
                throw new BusinessException(label + " weights cannot be negative", HttpStatus.BAD_REQUEST, "SCREENING_WEIGHT_NEGATIVE");
            }
            sum = sum.add(weight);
        }
        if (sum.setScale(2, RoundingMode.HALF_UP).compareTo(HUNDRED) != 0) {
            throw new BusinessException(label + " weights must total 100%", HttpStatus.BAD_REQUEST, "SCREENING_WEIGHT_SUM");
        }
    }

    private void requireThreshold(String label, BigDecimal threshold) {
        if (threshold == null) {
            throw new BusinessException(label + " is required", HttpStatus.BAD_REQUEST, "SCREENING_THRESHOLD_REQUIRED");
        }
        if (threshold.signum() < 0 || threshold.compareTo(HUNDRED) > 0) {
            throw new BusinessException(label + " must be between 0 and 100", HttpStatus.BAD_REQUEST, "SCREENING_THRESHOLD_RANGE");
        }
    }
}
