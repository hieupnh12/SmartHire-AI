package com.smarthire.tenant.auth.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class AccountProfileModels {
    private AccountProfileModels() {
    }

    public record AccountProfileResponse(
            Long id,
            String email,
            String fullName,
            String role,
            String phone,
            String headline,
            String bio,
            String avatarUrl,
            boolean hasPassword) {
    }

    public record UpdateAccountProfileRequest(
            @NotBlank(message = "Họ tên không được để trống")
            @Size(max = 255, message = "Họ tên tối đa 255 ký tự")
            String fullName,
            @Size(max = 32, message = "Số điện thoại tối đa 32 ký tự")
            @Pattern(regexp = "^$|^[+0-9 ()-]{8,32}$", message = "Số điện thoại không hợp lệ")
            String phone,
            @Size(max = 255, message = "Tiêu đề hồ sơ tối đa 255 ký tự")
            String headline,
            @Size(max = 2000, message = "Giới thiệu tối đa 2000 ký tự")
            String bio) {
    }
}
