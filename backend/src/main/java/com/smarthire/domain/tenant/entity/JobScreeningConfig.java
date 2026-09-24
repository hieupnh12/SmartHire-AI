package com.smarthire.domain.tenant.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;

@Entity
@Table(name = "job_screening_configs")
public class JobScreeningConfig {

    @Id
    @Column(name = "job_id")
    private Long jobId;

    @Column(name = "cv_skill_weight", nullable = false, precision = 5, scale = 2)
    private BigDecimal cvSkillWeight;

    @Column(name = "cv_preferred_weight", nullable = false, precision = 5, scale = 2)
    private BigDecimal cvPreferredWeight;

    @Column(name = "cv_experience_weight", nullable = false, precision = 5, scale = 2)
    private BigDecimal cvExperienceWeight;

    @Column(name = "cv_education_weight", nullable = false, precision = 5, scale = 2)
    private BigDecimal cvEducationWeight;

    @Column(name = "cv_jaccard_weight", nullable = false, precision = 5, scale = 2)
    private BigDecimal cvJaccardWeight;

    @Column(name = "cv_semantic_weight", nullable = false, precision = 5, scale = 2)
    private BigDecimal cvSemanticWeight;

    @Column(name = "cv_pass_threshold", nullable = false, precision = 5, scale = 2)
    private BigDecimal cvPassThreshold;

    @Column(name = "gate_cv_weight", nullable = false, precision = 5, scale = 2)
    private BigDecimal gateCvWeight;

    @Column(name = "gate_interview_weight", nullable = false, precision = 5, scale = 2)
    private BigDecimal gateInterviewWeight;

    @Column(name = "gate_assessment_weight", nullable = false, precision = 5, scale = 2)
    private BigDecimal gateAssessmentWeight;

    @Column(name = "gate_pass_threshold", nullable = false, precision = 5, scale = 2)
    private BigDecimal gatePassThreshold;

    public Long getJobId() { return jobId; }
    public void setJobId(Long jobId) { this.jobId = jobId; }
    public BigDecimal getCvSkillWeight() { return cvSkillWeight; }
    public void setCvSkillWeight(BigDecimal cvSkillWeight) { this.cvSkillWeight = cvSkillWeight; }
    public BigDecimal getCvPreferredWeight() { return cvPreferredWeight; }
    public void setCvPreferredWeight(BigDecimal cvPreferredWeight) { this.cvPreferredWeight = cvPreferredWeight; }
    public BigDecimal getCvExperienceWeight() { return cvExperienceWeight; }
    public void setCvExperienceWeight(BigDecimal cvExperienceWeight) { this.cvExperienceWeight = cvExperienceWeight; }
    public BigDecimal getCvEducationWeight() { return cvEducationWeight; }
    public void setCvEducationWeight(BigDecimal cvEducationWeight) { this.cvEducationWeight = cvEducationWeight; }
    public BigDecimal getCvJaccardWeight() { return cvJaccardWeight; }
    public void setCvJaccardWeight(BigDecimal cvJaccardWeight) { this.cvJaccardWeight = cvJaccardWeight; }
    public BigDecimal getCvSemanticWeight() { return cvSemanticWeight; }
    public void setCvSemanticWeight(BigDecimal cvSemanticWeight) { this.cvSemanticWeight = cvSemanticWeight; }
    public BigDecimal getCvPassThreshold() { return cvPassThreshold; }
    public void setCvPassThreshold(BigDecimal cvPassThreshold) { this.cvPassThreshold = cvPassThreshold; }
    public BigDecimal getGateCvWeight() { return gateCvWeight; }
    public void setGateCvWeight(BigDecimal gateCvWeight) { this.gateCvWeight = gateCvWeight; }
    public BigDecimal getGateInterviewWeight() { return gateInterviewWeight; }
    public void setGateInterviewWeight(BigDecimal gateInterviewWeight) { this.gateInterviewWeight = gateInterviewWeight; }
    public BigDecimal getGateAssessmentWeight() { return gateAssessmentWeight; }
    public void setGateAssessmentWeight(BigDecimal gateAssessmentWeight) { this.gateAssessmentWeight = gateAssessmentWeight; }
    public BigDecimal getGatePassThreshold() { return gatePassThreshold; }
    public void setGatePassThreshold(BigDecimal gatePassThreshold) { this.gatePassThreshold = gatePassThreshold; }
}
