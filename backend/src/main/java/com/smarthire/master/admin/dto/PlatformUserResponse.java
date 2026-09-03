package com.smarthire.master.admin.dto;

import com.smarthire.domain.master.entity.PlatformUser;
import java.time.LocalDateTime;

public class PlatformUserResponse {
    private Long id;
    private String email;
    private String fullName;
    private String role;
    private String status;
    private LocalDateTime createdAt;

    public PlatformUserResponse() {}

    public PlatformUserResponse(Long id, String email, String fullName, String role, String status, LocalDateTime createdAt) {
        this.id = id;
        this.email = email;
        this.fullName = fullName;
        this.role = role;
        this.status = status;
        this.createdAt = createdAt;
    }

    public static PlatformUserResponse fromEntity(PlatformUser user) {
        return new PlatformUserResponse(
                user.getId(),
                user.getEmail(),
                user.getFullName(),
                user.getRole(),
                user.getStatus(),
                user.getCreatedAt()
        );
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getFullName() { return fullName; }
    public void setFullName(String fullName) { this.fullName = fullName; }
    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }
}
