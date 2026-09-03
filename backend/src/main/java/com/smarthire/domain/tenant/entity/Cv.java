package com.smarthire.domain.tenant.entity;

import com.smarthire.domain.enums.CvStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "cvs")
public class Cv extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "job_id", nullable = false)
    private Job job;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id")
    private Application application;

    @Column(name = "original_filename", nullable = false)
    private String originalFilename;

    @Column(name = "file_url", nullable = false, length = 512)
    private String fileUrl;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32)
    private CvStatus status = CvStatus.UPLOADED;

    public Job getJob() { return job; }
    public void setJob(Job job) { this.job = job; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public Application getApplication() { return application; }
    public void setApplication(Application application) { this.application = application; }
    public String getOriginalFilename() { return originalFilename; }
    public void setOriginalFilename(String originalFilename) { this.originalFilename = originalFilename; }
    public String getFileUrl() { return fileUrl; }
    public void setFileUrl(String fileUrl) { this.fileUrl = fileUrl; }
    public CvStatus getStatus() { return status; }
    public void setStatus(CvStatus status) { this.status = status; }
}

