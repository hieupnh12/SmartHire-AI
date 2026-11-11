import { useState, useRef, useEffect } from "react";
import {
  Smartphone,
  QrCode,
  X,
  Copy,
  Check,
  ShieldCheck,
  RefreshCw,
} from "lucide-react";
import { QrCodeView } from "@/components/shared/QrCodeView";
import { useT } from "@/i18n";
import { toast } from "@/stores/toastStore";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";

interface MobileAppHeaderButtonProps {
  tenantName?: string;
  tenantCode?: string;
  tenantId?: string;
  logoUrl?: string | null;
  primaryColor?: string;
  className?: string;
}

export function MobileAppHeaderButton({
  tenantName = "SmartHire",
  tenantCode = "acme",
  tenantId,
  logoUrl,
  primaryColor = "#2563eb",
  className = "",
}: MobileAppHeaderButtonProps) {
  const t = useT();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<number | null>(null);

  const resolvedTenantId = tenantId || tenantCode || "acme";

  // Web fallback URL
  const appDownloadUrl = typeof window !== "undefined"
    ? `${window.location.origin}/career?tenantId=${encodeURIComponent(resolvedTenantId)}&tenant=${encodeURIComponent(resolvedTenantId)}&source=mobile_app_qr`
    : `https://smarthire.ai/career?tenantId=${resolvedTenantId}`;

  // Structured JSON payload specifically formatted for mobile app scanning
  const mobileAppPayload = JSON.stringify({
    type: "TENANT_ACCESS",
    tenantId: resolvedTenantId,
    tenantCode: resolvedTenantId,
    tenantName,
    action: "SELECT_TENANT",
    url: appDownloadUrl,
    deepLink: `smarthire://tenant?tenantId=${encodeURIComponent(resolvedTenantId)}`,
  });

  const handleMouseEnter = () => {
    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current);
      closeTimerRef.current = null;
    }
    setIsOpen(true);
  };

  const handleMouseLeave = () => {
    closeTimerRef.current = window.setTimeout(() => {
      setIsOpen(false);
    }, 240);
  };

  // Close when clicking outside
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [isOpen]);

  return (
    <div
      ref={containerRef}
      className={`relative inline-block ${className}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-label={t("candidate.core.mobileApp.header.triggerAria")}
        title={t("candidate.core.mobileApp.header.triggerTitle")}
        className={`grid size-10 place-items-center rounded-xl border transition-all duration-150 active:scale-95 ${isOpen
          ? "border-[var(--color-primary)] bg-[var(--color-primary-subtle)] text-[var(--color-primary)] ring-2 ring-[var(--color-primary)]/20 shadow-xs"
          : "border-slate-200 bg-white text-slate-700 hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-subtle)]/50 hover:text-[var(--color-primary)] shadow-2xs"
          }`}
      >
        <QrCode className="size-5" aria-hidden="true" />
      </button>

      {/* Popover Card */}
      {isOpen && (
        <div
          role="dialog"
          aria-label={t("candidate.core.mobileApp.header.dialogAria", { tenantName })}
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-[300px] max-w-[calc(100vw-32px)] rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_20px_50px_rgba(15,23,42,0.18)] transition-all animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className="grid size-9 shrink-0 place-items-center rounded-xl text-white font-bold text-sm shadow-xs"
                style={{ backgroundColor: primaryColor }}
              >
                {logoUrl ? (
                  <img src={logoUrl} alt="" className="size-full object-contain rounded-xl p-0.5" />
                ) : (
                  <Smartphone className="size-4.5" />
                )}
              </div>
              <h3 className="min-w-0 text-[15px] font-semibold text-slate-900 leading-snug">
                {t("candidate.core.mobileApp.header.heading")}
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              aria-label={t("common.close")}
            >
              <X className="size-4" />
            </button>
          </div>

          {/* QR Code Presentation */}
          <div className="my-3.5 flex flex-col items-center justify-center">
            <div className="relative rounded-2xl bg-slate-50 p-3 border border-slate-100 shadow-inner">
              <QrCodeView
                value={mobileAppPayload}
                size={160}
                logoUrl={logoUrl}
                logoText={tenantName}
                label={t("candidate.core.mobileApp.header.qrLabel", { tenantName })}
              />
            </div>
            <p className="mt-3 text-center text-xs text-slate-500">
              {t("candidate.core.mobileApp.header.subtitle")}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// MODAL: FAST LOGIN / MOBILE APP SYNC
// ----------------------------------------------------------------------

interface MobileAppSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantCode?: string;
  tenantId?: string;
  tenantName?: string;
}

export function MobileAppSyncModal({
  isOpen,
  onClose,
  tenantCode = "acme",
  tenantId,
  tenantName = "SmartHire",
}: MobileAppSyncModalProps) {
  const t = useT();
  const user = useAuthStore((state) => state.user);
  const resolvedTenantId = tenantId || tenantCode || "acme";
  const [syncCode, setSyncCode] = useState(() =>
    Math.floor(100000 + Math.random() * 900000).toString()
  );
  const [countdown, setCountdown] = useState(300); // 5 minutes
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Regenerate code when timer expires
          setSyncCode(Math.floor(100000 + Math.random() * 900000).toString());
          return 300;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  if (!isOpen) return null;

  const minutes = Math.floor(countdown / 60);
  const seconds = countdown % 60;
  const timerText = `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`;

  // Deep link payload for mobile app instant login with explicit tenantId
  const syncPayload = JSON.stringify({
    action: "FAST_LOGIN_SYNC",
    tenantId: resolvedTenantId,
    tenantCode: resolvedTenantId,
    tenant: resolvedTenantId,
    tenantName,
    email: user?.email || "candidate@smarthire.ai",
    code: syncCode,
    timestamp: Date.now(),
  });

  const handleRefresh = () => {
    setSyncCode(Math.floor(100000 + Math.random() * 900000).toString());
    setCountdown(300);
    toast.info(t("candidate.core.mobileApp.sync.codeRefreshed"));
  };

  const handleCopyCode = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(syncCode);
      setCopiedCode(true);
      toast.success(t("candidate.core.mobileApp.sync.codeCopiedToast", { code: syncCode }));
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const [validBefore, validAfter] = t("candidate.core.mobileApp.sync.codeValidFor", { timer: "\0" }).split("\0");
  const [step2Before, step2After] = t("candidate.core.mobileApp.sync.step2", { tenantId: "\0" }).split("\0");

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="sync-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in"
    >
      <div
        className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150 sm:p-7"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-5 top-5 grid size-8 place-items-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          aria-label={t("common.close")}
        >
          <X className="size-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-2xl bg-blue-50 text-blue-600 shadow-2xs">
            <Smartphone className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-blue-600">
                {t("candidate.core.mobileApp.sync.eyebrow")}
              </span>
              <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-800">
                {t("candidate.core.mobileApp.tenantLabel", { tenantId: resolvedTenantId })}
              </span>
            </div>
            <h2 id="sync-modal-title" className="text-xl font-bold text-slate-900">
              {t("candidate.core.mobileApp.sync.title")}
            </h2>
          </div>
        </div>

        {/* Dynamic QR Code */}
        <div className="mt-5 flex flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100/70 p-5 border border-slate-200/80">
          <QrCodeView
            value={syncPayload}
            size={170}
            logoText="SH"
            label={t("candidate.core.mobileApp.sync.qrLabel")}
          />

          {/* Sync code & Countdown */}
          <div className="mt-4 flex w-full items-center justify-between rounded-xl bg-white px-4 py-2.5 border border-slate-200 shadow-2xs">
            <div>
              <span className="block text-[11px] font-medium text-slate-500">
                {t("candidate.core.mobileApp.sync.codeLabel")}
              </span>
              <span className="font-mono text-xl font-bold tracking-widest text-blue-700">
                {syncCode.slice(0, 3)} {syncCode.slice(3)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleCopyCode}
                className="flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                title={t("candidate.core.mobileApp.sync.copyCodeTitle")}
              >
                {copiedCode ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                <span>{copiedCode ? t("candidate.core.mobileApp.sync.copied") : t("candidate.core.mobileApp.sync.copyCode")}</span>
              </button>
              <button
                type="button"
                onClick={handleRefresh}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                title={t("candidate.core.mobileApp.sync.refreshCodeTitle")}
              >
                <RefreshCw className="size-4" />
              </button>
            </div>
          </div>

          <p className="mt-2 text-[11px] text-slate-500">
            {validBefore}
            <strong className="font-semibold text-slate-700">{timerText}</strong>
            {validAfter}
          </p>
        </div>

        {/* Steps */}
        <div className="mt-5 space-y-2 text-xs text-slate-600">
          <div className="flex items-start gap-2.5">
            <span className="grid size-5 shrink-0 place-items-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-700">
              1
            </span>
            <span>{t("candidate.core.mobileApp.sync.step1")}</span>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="grid size-5 shrink-0 place-items-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-700">
              2
            </span>
            <span>
              {step2Before}
              <strong className="text-slate-800">{resolvedTenantId}</strong>
              {step2After}
            </span>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="grid size-5 shrink-0 place-items-center rounded-full bg-blue-100 text-[11px] font-bold text-blue-700">
              3
            </span>
            <span>{t("candidate.core.mobileApp.sync.step3")}</span>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition-colors"
          >
            {t("common.close")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// CARD: MOBILE APP SYNC (For Candidate Profile & My Applications)
// ----------------------------------------------------------------------

interface MobileAppSyncCardProps {
  tenantName?: string;
  tenantCode?: string;
  tenantId?: string;
  variant?: "full" | "compact";
  className?: string;
}

export function MobileAppSyncCard({
  tenantName = "SmartHire",
  tenantCode = "acme",
  tenantId,
  variant = "full",
  className = "",
}: MobileAppSyncCardProps) {
  const t = useT();
  const [modalOpen, setModalOpen] = useState(false);
  const resolvedTenantId = tenantId || tenantCode || "acme";

  if (variant === "compact") {
    return (
      <>
        <div
          className={`flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 rounded-2xl border border-blue-200/70 bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-white p-4 shadow-xs ${className}`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="grid size-10 shrink-0 place-items-center rounded-xl bg-blue-600 text-white shadow-xs">
              <Smartphone className="size-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-sm text-slate-900 truncate">
                  {t("candidate.core.mobileApp.card.title")}
                </h3>
                <span className="hidden sm:inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                  {t("candidate.core.mobileApp.tenantLabel", { tenantId: resolvedTenantId })}
                </span>
              </div>
              <p className="text-xs text-slate-600 mt-0.5 truncate">
                {t("candidate.core.mobileApp.card.compactDesc")}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-2xs hover:bg-blue-700 active:scale-95 transition-all"
          >
            <QrCode className="size-4" />
            <span>{t("candidate.core.mobileApp.card.cta")}</span>
          </button>
        </div>

        <MobileAppSyncModal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          tenantCode={resolvedTenantId}
          tenantId={resolvedTenantId}
          tenantName={tenantName}
        />
      </>
    );
  }

  return (
    <>
      <section
        className={`rounded-2xl border border-[var(--color-border-default)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-6 ${className}`}
        aria-labelledby="mobile-sync-card-title"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-[var(--color-primary-subtle)] text-[var(--color-primary)]">
              <Smartphone className="size-6" aria-hidden="true" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 id="mobile-sync-card-title" className="text-base font-semibold text-slate-900">
                  {t("candidate.core.mobileApp.card.title")}
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 border border-blue-200">
                  {t("candidate.core.mobileApp.tenantLabel", { tenantId: resolvedTenantId })}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 border border-emerald-200">
                  <ShieldCheck className="size-3.5" />
                  {t("candidate.core.mobileApp.card.readyBadge")}
                </span>
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1.5">
                  <Check className="size-3.5 text-blue-600" />
                  {t("candidate.core.mobileApp.card.benefitOneTap")}
                </span>
                <span className="flex items-center gap-1.5">
                  <Check className="size-3.5 text-blue-600" />
                  {t("candidate.core.mobileApp.card.benefitAutoTenant")}
                </span>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 flex-col sm:items-end gap-2">
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 text-sm font-semibold text-white shadow-xs hover:bg-[var(--color-primary-hover)] active:scale-95 transition-all"
            >
              <QrCode className="size-4" />
              <span>{t("candidate.core.mobileApp.card.cta")}</span>
            </button>
            <span className="text-[11px] text-slate-400">{t("candidate.core.mobileApp.card.platforms")}</span>
          </div>
        </div>
      </section>

      <MobileAppSyncModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        tenantCode={resolvedTenantId}
        tenantId={resolvedTenantId}
        tenantName={tenantName}
      />
    </>
  );
}
