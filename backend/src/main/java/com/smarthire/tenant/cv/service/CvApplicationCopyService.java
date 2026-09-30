package com.smarthire.tenant.cv.service;

import com.smarthire.common.exception.BusinessException;
import com.smarthire.common.storage.FileStorageService;
import com.smarthire.domain.enums.CvStatus;
import com.smarthire.domain.tenant.entity.Application;
import com.smarthire.domain.tenant.entity.Cv;
import com.smarthire.domain.tenant.entity.Job;
import com.smarthire.domain.tenant.repository.CvRepository;
import com.smarthire.multitenancy.context.TenantContext;
import com.smarthire.multitenancy.service.TenantRegistryService;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

/** Each application screens its own CV row, so applying to another job never moves an earlier application's CV. */
@Service
public class CvApplicationCopyService {
    private static final Logger log = LoggerFactory.getLogger(CvApplicationCopyService.class);
    private final CvRepository cvs;
    private final FileStorageService storage;
    private final TenantRegistryService tenants;

    public CvApplicationCopyService(CvRepository cvs, FileStorageService storage, TenantRegistryService tenants) {
        this.cvs = cvs;
        this.storage = storage;
        this.tenants = tenants;
    }

    public Cv copyFor(Cv source, Job job, Application application) {
        byte[] bytes;
        try {
            bytes = storage.read(source.getStorageKey());
        } catch (Exception ex) {
            log.error("Cannot read CV file {} for application copy", source.getId(), ex);
            throw new BusinessException("Cannot read CV file", HttpStatus.NOT_FOUND, "CV_FILE_MISSING");
        }
        Cv copy = new Cv();
        copy.setUser(source.getUser());
        copy.setJob(job);
        copy.setApplication(application);
        copy.setApplicationCopy(true);
        copy.setOriginalFilename(source.getOriginalFilename());
        copy.setMimeType(source.getMimeType());
        copy.setFileSize(source.getFileSize());
        copy.setChecksumSha256(source.getChecksumSha256());
        copy.setStatus(CvStatus.UPLOADED);
        copy.setFileUrl("pending");
        copy.setRetainUntil(Instant.now().plus(730, ChronoUnit.DAYS));
        cvs.save(copy);
        try {
            var stored = storage.store(tenants.requireActive(TenantContext.getCurrentTenant()).getSubdomain(),
                    String.valueOf(copy.getId()), copy.getOriginalFilename(), bytes);
            copy.setStorageKey(stored.storageKey());
            copy.setFileUrl(stored.url());
        } catch (Exception ex) {
            log.error("Cannot store CV copy for application {}", application.getId(), ex);
            throw new BusinessException("Failed to store CV", HttpStatus.INTERNAL_SERVER_ERROR, "CV_STORE_FAILED");
        }
        return cvs.save(copy);
    }
}
