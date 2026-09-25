package com.smarthire.tenant.job.screening;

import com.smarthire.domain.tenant.entity.Job;
import com.smarthire.domain.tenant.entity.JobScreeningConfig;
import com.smarthire.domain.tenant.repository.JobScreeningConfigRepository;
import com.smarthire.tenant.job.dto.JobModels.CvScreeningConfigView;
import com.smarthire.tenant.job.dto.JobModels.GateScreeningConfigView;
import java.math.BigDecimal;
import org.springframework.stereotype.Service;

@Service
public class JobScreeningConfigService {
    /** Snapshot of the previous hardcoded CV formula so old jobs and omitted create payloads keep working. */
    public static final BigDecimal LEGACY_SKILL = new BigDecimal("40.00");
    public static final BigDecimal LEGACY_PREFERRED = new BigDecimal("8.00");
    public static final BigDecimal LEGACY_EXPERIENCE = new BigDecimal("12.00");
    public static final BigDecimal LEGACY_EDUCATION = BigDecimal.ZERO.setScale(2);
    public static final BigDecimal LEGACY_JACCARD = new BigDecimal("15.00");
    public static final BigDecimal LEGACY_SEMANTIC = new BigDecimal("25.00");
    public static final BigDecimal LEGACY_CV_THRESHOLD = new BigDecimal("60.00");
    public static final BigDecimal LEGACY_GATE_CV = new BigDecimal("40.00");
    public static final BigDecimal LEGACY_GATE_INTERVIEW = new BigDecimal("35.00");
    public static final BigDecimal LEGACY_GATE_ASSESSMENT = new BigDecimal("25.00");
    public static final BigDecimal LEGACY_GATE_THRESHOLD = new BigDecimal("70.00");

    private final JobScreeningConfigRepository configs;
    private final ScreeningConfigValidator validator;

    public JobScreeningConfigService(JobScreeningConfigRepository configs, ScreeningConfigValidator validator) {
        this.configs = configs;
        this.validator = validator;
    }

    public JobScreeningConfig require(long jobId) {
        return configs.findById(jobId).orElseGet(() -> save(jobId, snapshot()));
    }

    public JobScreeningConfig saveForJob(Job job, CvScreeningConfigView cv, GateScreeningConfigView gate) {
        JobScreeningConfig existing = configs.findById(job.getId()).orElse(null);
        JobScreeningConfig next = existing == null ? snapshot() : existing;
        if (cv != null) {
            validator.requireCvWeights(
                    cv.skillWeight(), cv.preferredWeight(), cv.experienceWeight(),
                    cv.educationWeight(), cv.jaccardWeight(), cv.semanticWeight(), cv.passThreshold());
            next.setCvSkillWeight(cv.skillWeight());
            next.setCvPreferredWeight(cv.preferredWeight());
            next.setCvExperienceWeight(cv.experienceWeight());
            next.setCvEducationWeight(cv.educationWeight());
            next.setCvJaccardWeight(cv.jaccardWeight());
            next.setCvSemanticWeight(cv.semanticWeight());
            next.setCvPassThreshold(cv.passThreshold());
        }
        if (gate != null) {
            validator.requireGateWeights(gate.cvWeight(), gate.aiInterviewWeight(), gate.assessmentWeight(), gate.passThreshold());
            next.setGateCvWeight(gate.cvWeight());
            next.setGateInterviewWeight(gate.aiInterviewWeight());
            next.setGateAssessmentWeight(gate.assessmentWeight());
            next.setGatePassThreshold(gate.passThreshold());
        }
        return save(job.getId(), next);
    }

    public JobScreeningConfig copyTo(Job target, JobScreeningConfig source) {
        return save(target.getId(), source == null ? snapshot() : copy(source));
    }

    private JobScreeningConfig save(Long jobId, JobScreeningConfig config) {
        if (jobId == null) {
            throw new IllegalStateException("Job must be persisted before saving screening config");
        }
        config.setJobId(jobId);
        return configs.save(config);
    }

    public static JobScreeningConfig snapshot() {
        JobScreeningConfig config = new JobScreeningConfig();
        config.setCvSkillWeight(LEGACY_SKILL);
        config.setCvPreferredWeight(LEGACY_PREFERRED);
        config.setCvExperienceWeight(LEGACY_EXPERIENCE);
        config.setCvEducationWeight(LEGACY_EDUCATION);
        config.setCvJaccardWeight(LEGACY_JACCARD);
        config.setCvSemanticWeight(LEGACY_SEMANTIC);
        config.setCvPassThreshold(LEGACY_CV_THRESHOLD);
        config.setGateCvWeight(LEGACY_GATE_CV);
        config.setGateInterviewWeight(LEGACY_GATE_INTERVIEW);
        config.setGateAssessmentWeight(LEGACY_GATE_ASSESSMENT);
        config.setGatePassThreshold(LEGACY_GATE_THRESHOLD);
        return config;
    }

    private static JobScreeningConfig copy(JobScreeningConfig source) {
        JobScreeningConfig config = snapshot();
        config.setCvSkillWeight(source.getCvSkillWeight());
        config.setCvPreferredWeight(source.getCvPreferredWeight());
        config.setCvExperienceWeight(source.getCvExperienceWeight());
        config.setCvEducationWeight(source.getCvEducationWeight());
        config.setCvJaccardWeight(source.getCvJaccardWeight());
        config.setCvSemanticWeight(source.getCvSemanticWeight());
        config.setCvPassThreshold(source.getCvPassThreshold());
        config.setGateCvWeight(source.getGateCvWeight());
        config.setGateInterviewWeight(source.getGateInterviewWeight());
        config.setGateAssessmentWeight(source.getGateAssessmentWeight());
        config.setGatePassThreshold(source.getGatePassThreshold());
        return config;
    }
}
