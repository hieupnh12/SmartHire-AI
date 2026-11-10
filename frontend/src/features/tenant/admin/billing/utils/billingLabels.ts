export function formatPlanDisplayName(name?: string | null): string {
  const raw = (name || "").trim();
  if (!raw) return "Gói Khởi Đầu";

  const cleaned = raw
    .replace(/\s*\((?:Starter|Professional|Enterprise(?:\s+Scale)?|Custom|Fallback)\)\s*/gi, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  switch (cleaned.toUpperCase()) {
    case "STARTER":
      return "Gói Khởi Đầu";
    case "PROFESSIONAL":
      return "Gói Chuyên Nghiệp";
    case "ENTERPRISE":
    case "ENTERPRISE SCALE":
      return "Gói Doanh Nghiệp";
    default:
      return cleaned || raw;
  }
}

export function formatSubscriptionStatusLabel(status?: string | null): string {
  switch ((status || "").toUpperCase()) {
    case "ACTIVE":
      return "Đang hoạt động";
    case "FALLBACK_STARTER":
      return "Gói mặc định";
    case "PAST_DUE":
      return "Quá hạn (Đang ân hạn)";
    case "SUSPENDED":
      return "Đang tạm khóa";
    case "EXPIRED":
      return "Đã hết hạn";
    case "PENDING":
      return "Chờ thanh toán";
    case "CANCELED":
    case "CANCELLED":
      return "Đã hủy";
    default:
      return status || "Đang hoạt động";
  }
}

export function formatInvoiceStatusLabel(status?: string | null): string {
  switch ((status || "").toUpperCase()) {
    case "PAID":
      return "Đã thanh toán";
    case "PENDING":
      return "Chờ thanh toán";
    case "CANCELLED":
    case "CANCELED":
      return "Đã hủy";
    case "OVERDUE":
      return "Quá hạn";
    default:
      return status || "—";
  }
}

export function formatInvoiceTypeLabel(invoiceType?: string | null): string {
  switch ((invoiceType || "").toUpperCase()) {
    case "UPGRADE":
      return "Nâng cấp gói";
    case "RENEWAL":
      return "Gia hạn gói";
    case "B2B_CONTRACT":
      return "Hợp đồng doanh nghiệp";
    case "SUBSCRIPTION":
    default:
      return "Thuê bao gói dịch vụ";
  }
}

export function formatPaymentGatewayLabel(gateway?: string | null): string {
  switch ((gateway || "").toUpperCase()) {
    case "BANK_TRANSFER":
      return "Chuyển khoản";
    case "PRORATION_CREDIT":
      return "Bù trừ từ gói cũ";
    case "SEPAY":
      return "VietQR (SePay)";
    case "VNPAY":
      return "VNPay";
    case "PAYPAL":
      return "PayPal";
    default:
      return gateway || "—";
  }
}

const FEATURE_TRANSLATIONS: Record<string, string> = {
  "AI CV Screening": "Sàng lọc hồ sơ CV bằng AI",
  "Standard MCQ Tests": "Bài kiểm tra trắc nghiệm tiêu chuẩn",
  "Career Site": "Trang tuyển dụng riêng",
  "Email Support": "Hỗ trợ qua email",
  "Code Sandbox Automated Grading": "Chấm bài lập trình tự động",
  "Voice AI Interview": "Phỏng vấn AI giọng nói",
  "Priority Support": "Hỗ trợ ưu tiên",
  "Unlimited Jobs": "Không giới hạn tin tuyển dụng",
  "Dedicated Database Engine": "Cơ sở dữ liệu riêng biệt",
  "SSO Integration (Google/Microsoft)": "Đăng nhập một lần SSO (Google/Microsoft)",
  "Custom Grading Weights": "Tùy chỉnh trọng số chấm điểm",
  "SLA 99.99%": "Cam kết vận hành ổn định 99,99%",
  "24/7 Dedicated Support": "Hỗ trợ chuyên biệt 24/7",
};

export function translatePlanFeatureLabel(feature: string): string {
  const trimmed = feature.trim();
  if (!trimmed) return "";

  const exact = FEATURE_TRANSLATIONS[trimmed];
  if (exact) return exact;

  const voiceMatch = /^Voice AI Interview\s*\((\d+)\s*h\)$/i.exec(trimmed);
  if (voiceMatch) {
    return `Phỏng vấn AI giọng nói (${voiceMatch[1]} giờ)`;
  }

  return trimmed;
}
