package com.smarthire.master.billing.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@JsonIgnoreProperties(ignoreUnknown = true)
public class SePayWebhookPayload {
    private Long id;                  // ID giao dịch trên SePay (dùng làm khóa chống trùng lặp)
    private String gateway;           // Tên ngân hàng (ví dụ: TPBank, Vietcombank, MBBank)
    private String transactionDate;   // Định dạng YYYY-MM-DD HH:mm:ss
    private String accountNumber;     // Số tài khoản ngân hàng
    private String subAccount;        // Tài khoản ảo (VA) nếu có
    private String code;              // Mã thanh toán trích xuất từ nội dung (ví dụ: DH123456)
    private String content;           // Nội dung chuyển khoản gốc từ ngân hàng
    private String transferType;      // "in" (tiền vào) hoặc "out" (tiền ra)
    private String description;       // Mô tả chi tiết từ ngân hàng
    private BigDecimal transferAmount;// Số tiền giao dịch VNĐ (luôn dương)
    private BigDecimal accumulated;   // Số dư lũy kế sau giao dịch
    private String referenceCode;     // Mã tham chiếu / mã giao dịch ngân hàng
}
