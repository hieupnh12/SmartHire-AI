package com.smarthire.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Data
@Component
@ConfigurationProperties(prefix = "smarthire.platform")
public class PlatformProperties {

    private Legal legal = new Legal();
    private Payment payment = new Payment();

    @Data
    public static class Legal {
        private String companyName = "CÔNG TY CỔ PHẦN CÔNG NGHỆ SMARTHIRE VIỆT NAM";
        private String taxCode = "0110888999";
        private String address = "Tầng 13, Tòa nhà FPT, Trường Đại học FPT Đà Nẵng, Khu đô thị Công nghệ FPT, Phường Hòa Hải, Quận Ngũ Hành Sơn, TP. Đà Nẵng";
        private String city = "Đà Nẵng";
        private String disputeCourt = "Tòa án nhân dân có thẩm quyền tại Thành phố Đà Nẵng";
        private String representative = "Phan Nhật Hưng";
        private String position = "Tổng Giám Đốc";
        private String hotline = "0988.888.888";
        private String supportEmail = "support@smarthire.top";
        private String legalEmail = "support@smarthire.top";
        private String salesEmail = "support@smarthire.top";
        private String privacyEmail = "privacy@smarthire.top";
        private String termsVersion = "v2026.10";
        private String termsEffectiveDate = "15/06/2026";
        private String privacyLawLabel = "Luật Bảo vệ dữ liệu cá nhân 2025 & Nghị định số 356/2025/NĐ-CP";
        private String privacyPolicyCode = "PRIVACY_POLICY_2025";
    }

    @Data
    public static class Payment {
        private Bank bank = new Bank();

        @Data
        public static class Bank {
            private String shortCode = "TPBank";
            private String name = "Ngân hàng TMCP Tiên Phong (TPBank)";
            private String branch = "Chi nhánh Đà Nẵng";
            private String accountNumber = "07744348801";
            private String accountName = "NGUYEN NHAT SINH";
            private String vietqrTemplate = "compact2";

            public String buildVietQrUrl(BigDecimal amountVnd, String transferSyntax) {
                BigDecimal safeAmount = amountVnd != null ? amountVnd : BigDecimal.ZERO;
                String safeSyntax = transferSyntax != null ? transferSyntax : "";
                String safeAccountName = accountName != null ? accountName : "";
                String encodedSyntax = URLEncoder.encode(safeSyntax, StandardCharsets.UTF_8);
                String encodedAccount = URLEncoder.encode(safeAccountName, StandardCharsets.UTF_8);
                return "https://img.vietqr.io/image/"
                        + shortCode + "-" + accountNumber + "-" + vietqrTemplate + ".png"
                        + "?amount=" + safeAmount.toBigInteger()
                        + "&addInfo=" + encodedSyntax
                        + "&accountName=" + encodedAccount;
            }
        }
    }
}
