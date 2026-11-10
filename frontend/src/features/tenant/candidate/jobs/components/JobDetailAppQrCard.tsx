import { useState } from "react";
import {
  Smartphone,
  Copy,
  Check,
  Sparkles,
  Bell,
  Building2,
  Globe,
  QrCode,
} from "lucide-react";
import { QrCodeView } from "@/components/shared/QrCodeView";
import { toast } from "@/stores/toastStore";
import { getTenantIdFromWindow } from "@/lib/tenant";

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
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedTenantId, setCopiedTenantId] = useState(false);
  const [qrMode, setQrMode] = useState<"app" | "web">("app");

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
          ? "Đã sao chép dữ liệu JSON chứa Tenant ID & Job ID!"
          : "Đã sao chép liên kết vị trí tuyển dụng!"
      );
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const handleCopyTenantId = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(resolvedTenantId);
      setCopiedTenantId(true);
      toast.success(`Đã sao chép Tenant ID: "${resolvedTenantId}"`);
      setTimeout(() => setCopiedTenantId(false), 2000);
    }
  };

  return (
    <section
      className={`rounded-2xl border border-[var(--color-border-default)] bg-gradient-to-b from-white via-white to-slate-50/60 p-5 shadow-sm ${className}`}
      aria-labelledby="app-qr-box-title"
    >
      {/* Header Badge & Title */}
      <div className="flex items-start gap-3">
        <span
          className="grid size-10 shrink-0 place-items-center rounded-xl"
          style={{ backgroundColor: `${primaryColor}15`, color: primaryColor }}
        >
          <Smartphone className="size-5" aria-hidden="true" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700 border border-blue-200/60">
              <Sparkles className="size-3 text-amber-500" />
              Tiện ích ứng viên
            </span>
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200/60">
              App Mobile
            </span>
          </div>
          <h3
            id="app-qr-box-title"
            className="mt-1 text-sm font-semibold text-slate-900 leading-snug"
          >
            Ứng tuyển hoặc theo dõi trạng thái qua App
          </h3>
        </div>
      </div>

      <p className="mt-2 text-xs leading-5 text-slate-600">
        Quét mã QR bằng App Mobile SmartHire để tự động kết nối doanh nghiệp và nộp hồ sơ.
      </p>

      {/* Mode Switcher Tabs */}
      <div className="mt-3 flex items-center justify-center">
        <div className="inline-flex rounded-lg bg-slate-100 p-0.5 text-xs font-medium text-slate-600">
          <button
            type="button"
            onClick={() => setQrMode("app")}
            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs transition-colors ${
              qrMode === "app"
                ? "bg-white text-blue-700 font-semibold shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <QrCode className="size-3" />
            <span>App Mobile (JSON)</span>
          </button>
          <button
            type="button"
            onClick={() => setQrMode("web")}
            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs transition-colors ${
              qrMode === "web"
                ? "bg-white text-blue-700 font-semibold shadow-2xs"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Globe className="size-3" />
            <span>Link Web</span>
          </button>
        </div>
      </div>

      {/* QR Code Presentation */}
      <div className="my-3 flex flex-col items-center justify-center">
        <div className="relative rounded-2xl bg-white p-2.5 border border-slate-200/90 shadow-2xs">
          <QrCodeView
            value={activeQrValue}
            size={142}
            logoUrl={logoUrl}
            logoText={tenantName}
            label={`QR ứng tuyển vị trí ${jobTitle}`}
          />
        </div>
        <p className="mt-1.5 text-[11px] font-medium text-slate-500">
          {qrMode === "app"
            ? "Mã QR chứa Tenant ID và Job ID cho App di động"
            : "Hỗ trợ quét nhanh mở trực tiếp bằng trình duyệt"}
        </p>
      </div>

      {/* Tenant ID Badge with One-click Copy */}
      <div className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50/70 px-3 py-1.5 text-xs">
        <div className="flex items-center gap-1.5 min-w-0">
          <Building2 className="size-3.5 shrink-0 text-blue-600" />
          <span className="text-slate-500 text-[11px]">Tenant:</span>
          <span className="font-mono font-semibold text-blue-700 truncate max-w-[90px]">
            {resolvedTenantId}
          </span>
          <span className="text-slate-300">•</span>
          <span className="text-slate-500 text-[11px]">Job:</span>
          <span className="font-mono font-semibold text-slate-700">#{jobId}</span>
        </div>
        <button
          type="button"
          onClick={handleCopyTenantId}
          className="ml-2 shrink-0 inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800"
        >
          {copiedTenantId ? (
            <>
              <Check className="size-3 text-emerald-600" />
              <span className="text-emerald-700">Đã chép</span>
            </>
          ) : (
            <>
              <Copy className="size-3" />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Feature bullets */}
      <div className="mt-3 space-y-1.5 rounded-xl bg-slate-50 p-2.5 text-[11px] text-slate-600 border border-slate-100">
        <div className="flex items-center gap-2">
          <span className="size-1.5 rounded-full bg-[var(--color-primary)]" />
          <span>Nộp CV & phỏng vấn AI ngay trên điện thoại</span>
        </div>
        <div className="flex items-center gap-2">
          <Bell className="size-3 text-blue-500" />
          <span>Nhận kết quả và nhắc lịch phỏng vấn 24/7</span>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-3 flex items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
          <span className="font-semibold text-slate-700">iOS</span>
          <span>•</span>
          <span className="font-semibold text-slate-700">Android</span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--color-primary)] hover:underline"
        >
          {copiedLink ? (
            <>
              <Check className="size-3 text-emerald-600" />
              <span>Đã sao chép</span>
            </>
          ) : (
            <>
              <Copy className="size-3" />
              <span>{qrMode === "app" ? "Sao chép JSON" : "Sao chép link"}</span>
            </>
          )}
        </button>
      </div>
    </section>
  );
}
