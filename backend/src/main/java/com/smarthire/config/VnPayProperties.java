package com.smarthire.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "vnpay")
public class VnPayProperties {
    private String tmnCode = "2QXUI4J4";
    private String hashSecret = "RAZVGKACBGOPJDeskMBGBD051UWAGCL4";
    private String payUrl = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";
    private String returnUrl = "http://localhost:5173/checkout/vnpay-return";
    private String version = "2.1.0";
    private String command = "pay";
}
