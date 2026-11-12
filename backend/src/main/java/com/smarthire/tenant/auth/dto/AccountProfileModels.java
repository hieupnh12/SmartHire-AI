package com.smarthire.tenant.auth.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public final class AccountProfileModels {
    private AccountProfileModels() {
    }

    public record ProfileLinks(
            @Size(max = 512, message = "Liên kết GitHub tối đa 512 ký tự")
            String github,
            @Size(max = 512, message = "Liên kết LinkedIn tối đa 512 ký tự")
            String linkedin,
            @Size(max = 512, message = "Liên kết Portfolio tối đa 512 ký tự")
            String portfolio,
            @Size(max = 512, message = "Liên kết Website tối đa 512 ký tự")
            String website) {
        public static ProfileLinks empty() {
            return new ProfileLinks(null, null, null, null);
        }
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
            boolean hasPassword,
            ProfileLinks links) {
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
            String bio,
            @Valid
            ProfileLinks links) {
    }
}
