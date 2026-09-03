package com.smarthire.domain.tenant.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.math.BigDecimal;

@Entity
@Table(name = "test_cases")
public class TestCase {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "coding_problem_id", nullable = false)
    private CodingProblem codingProblem;

    @Column(name = "input_data", nullable = false, columnDefinition = "TEXT")
    private String inputData;

    @Column(name = "expected_output", nullable = false, columnDefinition = "TEXT")
    private String expectedOutput;

    @Column(name = "is_sample", nullable = false)
    private boolean sample;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal weight = BigDecimal.ONE;

    public Long getId() { return id; }
    public CodingProblem getCodingProblem() { return codingProblem; }
    public void setCodingProblem(CodingProblem codingProblem) { this.codingProblem = codingProblem; }
    public String getInputData() { return inputData; }
    public void setInputData(String inputData) { this.inputData = inputData; }
    public String getExpectedOutput() { return expectedOutput; }
    public void setExpectedOutput(String expectedOutput) { this.expectedOutput = expectedOutput; }
    public boolean isSample() { return sample; }
    public void setSample(boolean sample) { this.sample = sample; }
    public BigDecimal getWeight() { return weight; }
    public void setWeight(BigDecimal weight) { this.weight = weight; }
}

