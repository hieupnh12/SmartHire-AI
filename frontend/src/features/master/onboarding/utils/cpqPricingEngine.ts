/**
 * SmartHire-AI B2B CPQ (Configure, Price, Quote) Pricing Engine
 * 
 * Hỗ trợ 2 chế độ định giá chuẩn Enterprise:
 * 1. Mode Template: Mở rộng từ gói mẫu (Starter, Professional, Enterprise) + Phí Add-on vượt hạn mức - Chiết khấu.
 * 2. Mode From Scratch: Tự do may đo từ đầu = Phí nền tảng cố định + Định lượng tài nguyên + Tùy chọn Enterprise (SSO, Sandbox, Support 24/7) - Chiết khấu.
 */

export type CpqPricingMode = "TEMPLATE_ADDON" | "FROM_SCRATCH";

// Hạn mức và giá niêm yết của các gói mẫu tiêu chuẩn
export interface TemplatePlanSpec {
  code: string;
  name: string;
  priceYearly: number;
  baseJobs: number;
  baseCvParsesMonthly: number;
  baseAiHoursMonthly: number;
  baseStorageGb: number;
}

export const STANDARD_TEMPLATE_PLANS: Record<string, TemplatePlanSpec> = {
  STARTER: {
    code: "STARTER",
    name: "Gói Khởi Đầu (Starter)",
    priceYearly: 12_000_000,
    baseJobs: 5,
    baseCvParsesMonthly: 200,
    baseAiHoursMonthly: 5,
    baseStorageGb: 5,
  },
  PROFESSIONAL: {
    code: "PROFESSIONAL",
    name: "Gói Chuyên Nghiệp (Professional)",
    priceYearly: 36_000_000,
    baseJobs: 25,
    baseCvParsesMonthly: 2_500,
    baseAiHoursMonthly: 30,
    baseStorageGb: 25,
  },
  ENTERPRISE: {
    code: "ENTERPRISE",
    name: "Gói Doanh Nghiệp (Enterprise Scale)",
    priceYearly: 99_000_000,
    baseJobs: 100,
    baseCvParsesMonthly: 15_000,
    baseAiHoursMonthly: 150,
    baseStorageGb: 100,
  },
};

// Bảng đơn giá tài nguyên và tùy chọn nâng cao
export const CPQ_RATES = {
  // Mode 1: Đơn giá Add-ons khi mua thêm vượt gói gốc
  ADDON: {
    JOB_PRICE_YEARLY: 500_000,          // 500.000 đ / 1 job / năm
    CV_1K_PRICE_YEARLY: 1_000_000,       // 1.000.000 đ / 1.000 CVs / năm (1.000 đ/CV)
    AI_HOUR_PRICE_YEARLY: 200_000,       // 200.000 đ / 1 giờ phỏng vấn AI / năm
    STORAGE_10GB_PRICE_YEARLY: 250_000,  // 250.000 đ / 10 GB lưu trữ / năm (25.000 đ/GB)
  },

  // Mode 2: Đơn giá khi may đo từ đầu (From Scratch)
  SCRATCH: {
    PLATFORM_BASE_FEE: 10_000_000,      // Phí nền tảng cố định (Dedicated DB, HikariCP, SLA, Subdomain)
    JOB_PRICE_YEARLY: 400_000,          // 400.000 đ / job / năm
    CV_PRICE_YEARLY: 800,               // 800 đ / CV / năm
    AI_HOUR_PRICE_YEARLY: 200_000,      // 200.000 đ / giờ AI / năm
    STORAGE_GB_PRICE_YEARLY: 50_000,    // 50.000 đ / GB / năm
    SSO_SAML_FEE: 5_000_000,            // Tùy chọn SSO SAML / Azure AD (+5tr/năm)
    CODE_SANDBOX_FEE: 3_000_000,        // Tùy chọn Docker Sandbox chấm code (+3tr/năm)
    SUPPORT_24_7_FEE: 10_000_000,       // Tùy chọn Hỗ trợ 24/7 & SLA 99.99% (+10tr/năm)
  },

  // Chi phí giá vốn nội bộ tối thiểu (COGS) để tính Floor Price
  COGS: {
    DEDICATED_DB_YEARLY: 1_500_000,     // 1.500.000 đ / năm (MySQL DB + RAM HikariCP)
    CV_API_COST_PER_UNIT: 25,           // 25 đ / CV (~2.000 tokens Gemini)
    AI_VOICE_COST_PER_HOUR: 20_000,     // 20.000 đ / giờ AI (STT + LLM + TTS)
    STORAGE_COST_PER_GB: 6_000,         // 6.000 đ / GB / năm
    PROCTORING_COST_PER_HOUR: 3_000,    // 3.000 đ / giờ giám sát thi
    SAFE_MARGIN_MULTIPLIER: 1.5,        // Giá sàn an toàn tối thiểu = FloorPrice * 1.5 (Lãi gộp tối thiểu 50%)
  },
};

export interface TemplateAddonInputs {
  templateCode: "STARTER" | "PROFESSIONAL" | "ENTERPRISE";
  customJobs: number;
  customCvParsesMonthly: number;
  customAiHoursMonthly: number;
  customStorageGb: number;
  discountVnd: number;
}

export interface TemplateAddonResult {
  basePlanPrice: number;
  deltaJobs: number;
  deltaCv: number;
  deltaAiHours: number;
  deltaStorageGb: number;
  addonJobsFee: number;
  addonCvFee: number;
  addonAiFee: number;
  addonStorageFee: number;
  totalAddonFees: number;
  listPrice: number;            // Base + Addons
  discountVnd: number;
  totalQuoteVnd: number;        // ListPrice - Discount
  floorPriceVnd: number;        // Chi phí giá vốn tối thiểu
  safeFloorPriceVnd: number;    // Giá sàn an toàn (FloorPrice * 1.5)
  isBelowSafeFloor: boolean;    // Cảnh báo đỏ nếu bán dưới SafeFloor
  isBelowCost: boolean;         // Cảnh báo bán lỗ dưới giá vốn
  grossProfitVnd: number;
  marginPercent: number;
}

/**
 * Tính toán báo giá Mode 1: Dựa trên gói mẫu có sẵn + Phí Add-on
 */
export function calculateTemplateAddonQuote(inputs: TemplateAddonInputs): TemplateAddonResult {
  const template = STANDARD_TEMPLATE_PLANS[inputs.templateCode] || STANDARD_TEMPLATE_PLANS.PROFESSIONAL;

  const deltaJobs = Math.max(0, inputs.customJobs - template.baseJobs);
  const deltaCv = Math.max(0, inputs.customCvParsesMonthly - template.baseCvParsesMonthly);
  const deltaAiHours = Math.max(0, inputs.customAiHoursMonthly - template.baseAiHoursMonthly);
  const deltaStorageGb = Math.max(0, inputs.customStorageGb - template.baseStorageGb);

  const addonJobsFee = deltaJobs * CPQ_RATES.ADDON.JOB_PRICE_YEARLY;
  const addonCvFee = Math.round((deltaCv / 1_000) * CPQ_RATES.ADDON.CV_1K_PRICE_YEARLY);
  const addonAiFee = deltaAiHours * CPQ_RATES.ADDON.AI_HOUR_PRICE_YEARLY;
  const addonStorageFee = Math.round((deltaStorageGb / 10) * CPQ_RATES.ADDON.STORAGE_10GB_PRICE_YEARLY);

  const totalAddonFees = addonJobsFee + addonCvFee + addonAiFee + addonStorageFee;
  const listPrice = template.priceYearly + totalAddonFees;
  const discountVnd = Math.max(0, inputs.discountVnd || 0);
  const totalQuoteVnd = Math.max(0, listPrice - discountVnd);

  // Tính Floor Price (Chi phí giá vốn thực tế)
  const totalYearlyCv = inputs.customCvParsesMonthly * 12;
  const totalYearlyAiHours = inputs.customAiHoursMonthly * 12;
  const floorPriceVnd = Math.round(
    CPQ_RATES.COGS.DEDICATED_DB_YEARLY +
    totalYearlyCv * CPQ_RATES.COGS.CV_API_COST_PER_UNIT +
    totalYearlyAiHours * CPQ_RATES.COGS.AI_VOICE_COST_PER_HOUR +
    inputs.customStorageGb * CPQ_RATES.COGS.STORAGE_COST_PER_GB
  );

  const safeFloorPriceVnd = Math.round(floorPriceVnd * CPQ_RATES.COGS.SAFE_MARGIN_MULTIPLIER);
  const isBelowCost = totalQuoteVnd < floorPriceVnd;
  const isBelowSafeFloor = totalQuoteVnd < safeFloorPriceVnd;
  const grossProfitVnd = totalQuoteVnd - floorPriceVnd;
  const marginPercent = totalQuoteVnd > 0 ? (grossProfitVnd / totalQuoteVnd) * 100 : 0;

  return {
    basePlanPrice: template.priceYearly,
    deltaJobs,
    deltaCv,
    deltaAiHours,
    deltaStorageGb,
    addonJobsFee,
    addonCvFee,
    addonAiFee,
    addonStorageFee,
    totalAddonFees,
    listPrice,
    discountVnd,
    totalQuoteVnd,
    floorPriceVnd,
    safeFloorPriceVnd,
    isBelowSafeFloor,
    isBelowCost,
    grossProfitVnd,
    marginPercent,
  };
}

export interface ScratchCustomInputs {
  platformBaseFee?: number; // Mặc định 10.000.000đ
  jobsCount: number;
  yearlyCvCount: number;
  yearlyAiHours: number;
  storageGb: number;
  enableSso: boolean;
  enableCodeSandbox: boolean;
  enableSupport247: boolean;
  discountVnd: number;
}

export interface ScratchCustomResult {
  platformBaseFee: number;
  jobsFee: number;
  cvFee: number;
  aiFee: number;
  storageFee: number;
  ssoFee: number;
  codeSandboxFee: number;
  support247Fee: number;
  totalEnterpriseOptionsFee: number;
  listPrice: number;            // Suggested List Price
  discountVnd: number;
  totalQuoteVnd: number;
  floorPriceVnd: number;
  safeFloorPriceVnd: number;
  isBelowSafeFloor: boolean;
  isBelowCost: boolean;
  grossProfitVnd: number;
  marginPercent: number;
}

/**
 * Tính toán báo giá Mode 2: Tự do may đo từ đầu (Custom from Scratch)
 */
export function calculateScratchCustomQuote(inputs: ScratchCustomInputs): ScratchCustomResult {
  const platformBaseFee = inputs.platformBaseFee != null ? inputs.platformBaseFee : CPQ_RATES.SCRATCH.PLATFORM_BASE_FEE;

  const jobsFee = inputs.jobsCount * CPQ_RATES.SCRATCH.JOB_PRICE_YEARLY;
  const cvFee = inputs.yearlyCvCount * CPQ_RATES.SCRATCH.CV_PRICE_YEARLY;
  const aiFee = inputs.yearlyAiHours * CPQ_RATES.SCRATCH.AI_HOUR_PRICE_YEARLY;
  const storageFee = inputs.storageGb * CPQ_RATES.SCRATCH.STORAGE_GB_PRICE_YEARLY;

  const ssoFee = inputs.enableSso ? CPQ_RATES.SCRATCH.SSO_SAML_FEE : 0;
  const codeSandboxFee = inputs.enableCodeSandbox ? CPQ_RATES.SCRATCH.CODE_SANDBOX_FEE : 0;
  const support247Fee = inputs.enableSupport247 ? CPQ_RATES.SCRATCH.SUPPORT_24_7_FEE : 0;
  const totalEnterpriseOptionsFee = ssoFee + codeSandboxFee + support247Fee;

  const listPrice = platformBaseFee + jobsFee + cvFee + aiFee + storageFee + totalEnterpriseOptionsFee;
  const discountVnd = Math.max(0, inputs.discountVnd || 0);
  const totalQuoteVnd = Math.max(0, listPrice - discountVnd);

  // Tính Floor Price (Chi phí giá vốn thực tế)
  const floorPriceVnd = Math.round(
    CPQ_RATES.COGS.DEDICATED_DB_YEARLY +
    inputs.yearlyCvCount * CPQ_RATES.COGS.CV_API_COST_PER_UNIT +
    inputs.yearlyAiHours * CPQ_RATES.COGS.AI_VOICE_COST_PER_HOUR +
    inputs.storageGb * CPQ_RATES.COGS.STORAGE_COST_PER_GB
  );

  const safeFloorPriceVnd = Math.round(floorPriceVnd * CPQ_RATES.COGS.SAFE_MARGIN_MULTIPLIER);
  const isBelowCost = totalQuoteVnd < floorPriceVnd;
  const isBelowSafeFloor = totalQuoteVnd < safeFloorPriceVnd;
  const grossProfitVnd = totalQuoteVnd - floorPriceVnd;
  const marginPercent = totalQuoteVnd > 0 ? (grossProfitVnd / totalQuoteVnd) * 100 : 0;

  return {
    platformBaseFee,
    jobsFee,
    cvFee,
    aiFee,
    storageFee,
    ssoFee,
    codeSandboxFee,
    support247Fee,
    totalEnterpriseOptionsFee,
    listPrice,
    discountVnd,
    totalQuoteVnd,
    floorPriceVnd,
    safeFloorPriceVnd,
    isBelowSafeFloor,
    isBelowCost,
    grossProfitVnd,
    marginPercent,
  };
}
