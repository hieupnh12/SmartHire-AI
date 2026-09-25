package com.smarthire.tenant.job.service;

import com.smarthire.domain.enums.CvStatus;
import com.smarthire.domain.tenant.entity.Cv;
import com.smarthire.domain.tenant.entity.Job;
import com.smarthire.domain.tenant.repository.CvRepository;
import com.smarthire.messaging.JobPublisher;
import com.smarthire.tenant.cv.service.CvPipelineService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class JobCloseScreeningService {
    private static final Logger log = LoggerFactory.getLogger(JobCloseScreeningService.class);

    private final CvRepository cvs;
    private final JobPublisher publisher;
    private final CvPipelineService pipeline;

    public JobCloseScreeningService(CvRepository cvs, JobPublisher publisher, CvPipelineService pipeline) {
        this.cvs = cvs;
        this.publisher = publisher;
        this.pipeline = pipeline;
    }

    public void enqueueUnscreened(Job job) {
        if (job == null || job.getId() == null) return;
        for (Cv cv : cvs.findByJob_IdOrderByIdDesc(job.getId())) {
            if (cv.getStatus() == CvStatus.ANALYZED) continue;
            try {
                publisher.publishParse(cv.getId());
            } catch (Exception ex) {
                log.warn("Queue unavailable, screening CV {} inline after job close", cv.getId());
                try {
                    pipeline.processInline(cv.getId());
                } catch (Exception inline) {
                    log.error("Auto-screen failed for CV {} after job {} closed", cv.getId(), job.getId(), inline);
                }
            }
        }
    }
}
