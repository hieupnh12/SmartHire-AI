import { t as globalT, type TranslateFn } from "@/i18n";

export function formatPlanDisplayName(
  name?: string | null,
  translate: TranslateFn = globalT,
): string {
  const raw = (name || "").trim();
  if (!raw) return translate("tenantAdmin.billing.plans.starter");

  const cleaned = raw
    .replace(/\s*\((?:Starter|Professional|Enterprise(?:\s+Scale)?|Custom|Fallback)\)\s*/gi, " ")
    .replace(/\s{2,}/g, " ")
    .trim();

  const upper = raw.toUpperCase();
  if (upper.includes("STARTER") || upper.includes("KHỞI ĐẦU") || upper.includes("スターター")) {
    return translate("tenantAdmin.billing.plans.starter");
  }
  if (upper.includes("PROFESSIONAL") || upper.includes("CHUYÊN NGHIỆP") || upper.includes("プロフェッショナル")) {
    return translate("tenantAdmin.billing.plans.professional");
  }
  if (upper.includes("ENTERPRISE") || upper.includes("DOANH NGHIỆP") || upper.includes("エンタープライズ")) {
    return translate("tenantAdmin.billing.plans.enterprise");
  }

  return cleaned || raw;
}

export function formatSubscriptionStatusLabel(
  status?: string | null,
  translate: TranslateFn = globalT,
): string {
  switch ((status || "").toUpperCase()) {
    case "ACTIVE":
      return translate("tenantAdmin.billing.subscriptionStatuses.ACTIVE");
    case "FALLBACK_STARTER":
      return translate("tenantAdmin.billing.subscriptionStatuses.FALLBACK_STARTER");
    case "PAST_DUE":
      return translate("tenantAdmin.billing.subscriptionStatuses.PAST_DUE");
    case "SUSPENDED":
      return translate("tenantAdmin.billing.subscriptionStatuses.SUSPENDED");
    case "EXPIRED":
      return translate("tenantAdmin.billing.subscriptionStatuses.EXPIRED");
    case "PENDING":
      return translate("tenantAdmin.billing.subscriptionStatuses.PENDING");
    case "CANCELED":
    case "CANCELLED":
      return translate("tenantAdmin.billing.subscriptionStatuses.CANCELLED");
    default:
      return status || translate("tenantAdmin.billing.subscriptionStatuses.ACTIVE");
  }
}

export function formatInvoiceStatusLabel(
  status?: string | null,
  translate: TranslateFn = globalT,
): string {
  switch ((status || "").toUpperCase()) {
    case "PAID":
      return translate("tenantAdmin.billing.invoiceStatuses.PAID");
    case "PENDING":
      return translate("tenantAdmin.billing.invoiceStatuses.PENDING");
    case "CANCELLED":
    case "CANCELED":
      return translate("tenantAdmin.billing.invoiceStatuses.CANCELLED");
    case "OVERDUE":
      return translate("tenantAdmin.billing.invoiceStatuses.OVERDUE");
    default:
      return status || "—";
  }
}

export function formatInvoiceTypeLabel(
  invoiceType?: string | null,
  translate: TranslateFn = globalT,
): string {
  switch ((invoiceType || "").toUpperCase()) {
    case "UPGRADE":
      return translate("tenantAdmin.billing.invoiceTypes.UPGRADE");
    case "RENEWAL":
      return translate("tenantAdmin.billing.invoiceTypes.RENEWAL");
    case "B2B_CONTRACT":
      return translate("tenantAdmin.billing.invoiceTypes.B2B_CONTRACT");
    case "SUBSCRIPTION":
    default:
      return translate("tenantAdmin.billing.invoiceTypes.SUBSCRIPTION");
  }
}

export function formatPaymentGatewayLabel(
  gateway?: string | null,
  translate: TranslateFn = globalT,
): string {
  switch ((gateway || "").toUpperCase()) {
    case "BANK_TRANSFER":
      return translate("tenantAdmin.billing.gateways.BANK_TRANSFER");
    case "PRORATION_CREDIT":
      return translate("tenantAdmin.billing.gateways.PRORATION_CREDIT");
    case "SEPAY":
      return translate("tenantAdmin.billing.gateways.SEPAY");
    case "VNPAY":
      return translate("tenantAdmin.billing.gateways.VNPAY");
    case "PAYPAL":
      return translate("tenantAdmin.billing.gateways.PAYPAL");
    default:
      return gateway || "—";
  }
}

const FEATURE_TRANSLATION_KEYS: Record<string, string> = {
  "AI CV Screening": "tenantAdmin.billing.features.aiCvScreening",
  "Standard MCQ Tests": "tenantAdmin.billing.features.standardMcqTests",
  "Career Site": "tenantAdmin.billing.features.careerSite",
  "Email Support": "tenantAdmin.billing.features.emailSupport",
  "Code Sandbox Automated Grading": "tenantAdmin.billing.features.codeSandboxAutomatedGrading",
  "Voice AI Interview": "tenantAdmin.billing.features.voiceAiInterview",
  "Priority Support": "tenantAdmin.billing.features.prioritySupport",
  "Unlimited Jobs": "tenantAdmin.billing.features.unlimitedJobs",
  "Dedicated Database Engine": "tenantAdmin.billing.features.dedicatedDatabaseEngine",
  "SSO Integration (Google/Microsoft)": "tenantAdmin.billing.features.ssoIntegration",
  "Custom Grading Weights": "tenantAdmin.billing.features.customGradingWeights",
  "SLA 99.99%": "tenantAdmin.billing.features.sla",
  "24/7 Dedicated Support": "tenantAdmin.billing.features.dedicatedSupport247",
};

export function translatePlanFeatureLabel(
  feature: string,
  translate: TranslateFn = globalT,
): string {
  const trimmed = feature.trim();
  if (!trimmed) return "";

  const exactKey = FEATURE_TRANSLATION_KEYS[trimmed];
  if (exactKey) return translate(exactKey);

  const voiceMatch = /^Voice AI Interview\s*\((\d+)\s*h\)$/i.exec(trimmed);
  if (voiceMatch) {
    return translate("tenantAdmin.billing.features.voiceAiInterviewHours", {
      hours: voiceMatch[1],
    });
  }

  return trimmed;
}
