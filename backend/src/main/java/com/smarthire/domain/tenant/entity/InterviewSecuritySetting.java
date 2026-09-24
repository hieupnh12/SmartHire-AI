package com.smarthire.domain.tenant.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.FieldDefaults;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE)
@Entity
@Table(name = "interview_security_settings")
public class InterviewSecuritySetting extends BaseEntity {

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "interview_id", nullable = false, unique = true)
    Interview interview;

    @Builder.Default
    @Column(name = "camera_required", nullable = false)
    boolean cameraRequired = false;

    @Builder.Default
    @Column(name = "microphone_required", nullable = false)
    boolean microphoneRequired = false;

    @Builder.Default
    @Column(name = "screen_share_required", nullable = false)
    boolean screenShareRequired = false;

    @Builder.Default
    @Column(name = "fullscreen_required", nullable = false)
    boolean fullscreenRequired = false;

    @Builder.Default
    @Column(name = "browser_restriction", nullable = false)
    boolean browserRestriction = false;
}
