import { useState } from "react";
import {
  Smartphone,
  Copy,
  Check,
  Sparkles,
  Globe,
  QrCode,
} from "lucide-react";
import { QrCodeView } from "@/components/shared/QrCodeView";
import { useT } from "@/i18n";
import { toast } from "@/stores/toastStore";
import { getTenantIdFromWindow } from "@/lib/tenant";
import { AppDownloadModal } from "@/features/tenant/candidate/shared/components/AppDownloadModal";

interface JobDetailAppQrCardProps {
  jobId: string | number;
  jobTitle: string;
  tenantId?: string;
  tenantName?: string;
  primaryColor?: string;
  logoUrl?: string | null;
  className?: string;
}

export function JobDetailAppQrCard({
  jobId,
  jobTitle,
  tenantId,
  tenantName = "SmartHire",
  primaryColor = "#2563eb",
  logoUrl,
  className = "",
}: JobDetailAppQrCardProps) {
  const t = useT();
  const [copiedLink, setCopiedLink] = useState(false);
  const [qrMode, setQrMode] = useState<"app" | "web">("app");
  const [downloadModalOpen, setDownloadModalOpen] = useState(false);

  const resolvedTenantId = tenantId || getTenantIdFromWindow() || "acme";

  const jobUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/jobs/${jobId}?tenantId=${encodeURIComponent(resolvedTenantId)}&source=qr_sidebar`
      : `https://smarthire.ai/jobs/${jobId}?tenantId=${encodeURIComponent(resolvedTenantId)}`;

  // Structured JSON payload specifically containing tenantId and jobId for mobile app scanning
  const mobileAppPayload = JSON.stringify({
    type: "JOB_DETAIL",
    tenantId: resolvedTenantId,
    tenantCode: resolvedTenantId,
    jobId: String(jobId),
    jobTitle,
    tenantName,
    action: "OPEN_JOB",
    url: jobUrl,
    deepLink: `smarthire://job?tenantId=${encodeURIComponent(resolvedTenantId)}&jobId=${encodeURIComponent(String(jobId))}`,
  });

  const activeQrValue = qrMode === "app" ? mobileAppPayload : jobUrl;

  const handleCopy = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(activeQrValue);
      setCopiedLink(true);
      toast.success(
        qrMode === "app"
          ? t("candidate.core.jobQr.toastCopiedJson")
          : t("candidate.core.jobQr.toastCopiedLink")
      );
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <section
      className={`rounded-2xl border border-[var(--color-border-default)] bg-white p-5 shadow-xs ${className}`}
      aria-labelledby="app-qr-box-title"
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <span
          className="grid size-9 shrink-0 place-items-center rounded-xl"
          style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
        >
          <Smartphone className="size-4.5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200/60">
              <Sparkles className="size-3 text-amber-500" />
              {t("candidate.core.jobQr.badgeMobileApp")}
            </span>
          </div>
          <h3
            id="app-qr-box-title"
            className="mt-1 text-sm font-semibold text-slate-900 leading-snug"
          >
            {t("candidate.core.jobQr.title")}
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-slate-500">
            {t("candidate.core.jobQr.description")}
          </p>
        </div>
      </div>

      {/* Mode Switcher Tabs */}
      <div className="mt-3.5 flex justify-center">
        <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium text-slate-600">
          <button
            type="button"
            onClick={() => setQrMode("app")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs transition-colors ${
              qrMode === "app"
                ? "bg-white text-slate-900 font-semibold shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <QrCode className="size-3 text-slate-500" />
            <span>{t("candidate.core.jobQr.tabApp")}</span>
          </button>
          <button
            type="button"
            onClick={() => setQrMode("web")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs transition-colors ${
              qrMode === "web"
                ? "bg-white text-slate-900 font-semibold shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Globe className="size-3 text-slate-500" />
            <span>{t("candidate.core.jobQr.tabWeb")}</span>
          </button>
        </div>
      </div>

      {/* QR Code Presentation */}
      <div className="my-3 flex flex-col items-center justify-center">
        <QrCodeView
          value={activeQrValue}
          size={132}
          logoUrl={logoUrl}
          logoText={tenantName}
          label={t("candidate.core.jobQr.qrLabel", { jobTitle })}
        />
        <p className="mt-1.5 text-center text-[11px] font-medium text-slate-500">
          {qrMode === "app"
            ? t("candidate.core.jobQr.hintApp")
            : t("candidate.core.jobQr.hintWeb")}
        </p>
      </div>

      {/* Feature highlights */}
      <div className="space-y-1.5 border-t border-slate-100 pt-3 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <span className="size-1.5 shrink-0 rounded-full bg-[var(--color-primary)]" />
          <span className="truncate">{t("candidate.core.jobQr.bullet1")}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="size-1.5 shrink-0 rounded-full bg-blue-500" />
          <span className="truncate">{t("candidate.core.jobQr.bullet2")}</span>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5 text-xs">
        <span className="text-[11px] text-slate-500">
          {t("candidate.core.jobQr.supportedPlatforms")}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--color-primary)] hover:underline"
        >
          {copiedLink ? (
            <>
              <Check className="size-3 text-emerald-600" />
              <span className="text-emerald-700">{t("candidate.core.jobQr.copied")}</span>
            </>
          ) : (
            <>
              <Copy className="size-3" />
              <span>{qrMode === "app" ? t("candidate.core.jobQr.copyJson") : t("candidate.core.jobQr.copyLink")}</span>
            </>
          )}
        </button>
      </div>

      {/* App Download Prompt */}
      <div className="mt-2.5 pt-2 border-t border-slate-100 text-center">
        <button
          type="button"
          onClick={() => setDownloadModalOpen(true)}
          className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 hover:underline"
        >
          <Smartphone className="size-3 text-emerald-600" />
          <span>Chưa cài app? Tải SmartHire APK / iOS tại đây</span>
        </button>
      </div>

      <AppDownloadModal
        isOpen={downloadModalOpen}
        onClose={() => setDownloadModalOpen(false)}
        tenantName={tenantName}
      />
    </section>
  );
}
