package com.smarthire.domain.tenant.entity;

import com.smarthire.domain.enums.CvStatus;
import jakarta.persistence.*;
import java.time.Instant;
import lombok.*;
import lombok.experimental.FieldDefaults;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "cvs")
public class Cv extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "job_id") Job job;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "candidate_id", nullable = false) Candidate candidate;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "application_id") Application application;

    @Column(name = "is_application_copy", nullable = false) boolean applicationCopy;

    @Column(name = "original_filename", nullable = false) String originalFilename;

    @Column(name = "file_url", nullable = false, length = 512) String fileUrl;

    @Column(name = "mime_type", length = 128) String mimeType;

    @Column(name = "file_size") Long fileSize;

    @Column(name = "checksum_sha256", length = 64) String checksumSha256;

    @Column(name = "storage_key", length = 512) String storageKey;

    @Column(name = "retain_until") Instant retainUntil;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 32) CvStatus status = CvStatus.UPLOADED;

    @Column(name = "error_code", length = 64) String errorCode;

    @Column(name = "error_message", length = 512) String errorMessage;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "builder_data", columnDefinition = "json") String builderData;

    @Column(name = "share_token", length = 64, unique = true) String shareToken;

    public void mark(CvStatus next) {
        this.status = next;
        this.errorCode = null;
        this.errorMessage = null;
    }

    public void fail(String code, String message) {
        this.status = CvStatus.FAILED;
        this.errorCode = code;
        this.errorMessage = message == null ? null : message.substring(0, Math.min(message.length(), 512));
    }
}
