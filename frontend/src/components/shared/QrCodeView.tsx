import { useState } from "react";
import { QrCode, RefreshCw } from "lucide-react";

interface QrCodeViewProps {
  value: string;
  size?: number;
  logoUrl?: string | null;
  logoText?: string;
  label?: string;
  className?: string;
}

export function QrCodeView({
  value,
  size = 160,
  logoUrl,
  logoText,
  label = "Mã QR",
  className = "",
}: QrCodeViewProps) {
  const [hasError, setHasError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Use reliable public QR service with fallback
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=${size * 2}x${size * 2}&margin=8&data=${encodeURIComponent(
    value
  )}`;

  const handleReload = () => {
    setHasError(false);
    setIsLoading(true);
  };

  return (
    <div
      className={`relative inline-flex flex-col items-center justify-center rounded-2xl bg-white p-2.5 shadow-xs border border-slate-200/80 ${className}`}
      style={{ width: size + 20, minHeight: size + 20 }}
    >
      {/* Loading Skeleton */}
      {isLoading && !hasError && (
        <div
          className="absolute inset-2.5 flex items-center justify-center rounded-xl bg-slate-50 animate-pulse"
          style={{ width: size, height: size }}
        >
          <QrCode className="size-8 text-slate-300 animate-spin" />
        </div>
      )}

      {/* Primary QR Image */}
      {!hasError ? (
        <img
          src={qrUrl}
          alt={label}
          width={size}
          height={size}
          className={`rounded-xl object-contain transition-opacity duration-300 ${
            isLoading ? "opacity-0" : "opacity-100"
          }`}
          onLoad={() => setIsLoading(false)}
          onError={() => {
            setIsLoading(false);
            setHasError(true);
          }}
        />
      ) : (
        /* Fallback Vector QR pattern when offline or image load fails */
        <div
          className="relative flex flex-col items-center justify-center rounded-xl bg-slate-900 p-3 text-white"
          style={{ width: size, height: size }}
        >
          <svg
            viewBox="0 0 100 100"
            className="w-full h-full text-white fill-current opacity-90"
            aria-hidden="true"
          >
            {/* Top-left position pattern */}
            <rect x="10" y="10" width="28" height="28" rx="4" fill="currentColor" />
            <rect x="16" y="16" width="16" height="16" rx="2" fill="#0f172a" />
            <rect x="20" y="20" width="8" height="8" rx="1" fill="currentColor" />

            {/* Top-right position pattern */}
            <rect x="62" y="10" width="28" height="28" rx="4" fill="currentColor" />
            <rect x="68" y="16" width="16" height="16" rx="2" fill="#0f172a" />
            <rect x="72" y="20" width="8" height="8" rx="1" fill="currentColor" />

            {/* Bottom-left position pattern */}
            <rect x="10" y="62" width="28" height="28" rx="4" fill="currentColor" />
            <rect x="16" y="68" width="16" height="16" rx="2" fill="#0f172a" />
            <rect x="20" y="72" width="8" height="8" rx="1" fill="currentColor" />

            {/* Simulated QR modules */}
            <circle cx="48" cy="18" r="3" fill="currentColor" />
            <circle cx="54" cy="28" r="2.5" fill="currentColor" />
            <circle cx="48" cy="38" r="3" fill="currentColor" />
            <circle cx="20" cy="48" r="2.5" fill="currentColor" />
            <circle cx="34" cy="48" r="3" fill="currentColor" />
            <circle cx="48" cy="54" r="2.5" fill="currentColor" />
            <circle cx="62" cy="48" r="3" fill="currentColor" />
            <circle cx="80" cy="48" r="2.5" fill="currentColor" />
            <circle cx="48" cy="72" r="3" fill="currentColor" />
            <circle cx="58" cy="80" r="2.5" fill="currentColor" />
            <circle cx="76" cy="68" r="3" fill="currentColor" />
            <circle cx="82" cy="82" r="2.5" fill="currentColor" />
          </svg>
          <button
            type="button"
            onClick={handleReload}
            className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 rounded-xl text-xs text-white opacity-0 hover:opacity-100 transition-opacity"
            title="Thử tải lại"
          >
            <RefreshCw className="size-4 mb-1 animate-spin" />
            <span>Tải lại</span>
          </button>
        </div>
      )}

      {/* Center Logo Overlay */}
      {!isLoading && (logoUrl || logoText) && (
        <div
          className="absolute inset-0 m-auto flex items-center justify-center rounded-lg bg-white p-1 shadow-md border border-slate-200"
          style={{ width: Math.max(28, size * 0.22), height: Math.max(28, size * 0.22) }}
        >
          {logoUrl ? (
            <img src={logoUrl} alt="" className="size-full object-contain rounded" />
          ) : (
            <span className="text-[11px] font-bold text-slate-800 uppercase">
              {logoText?.slice(0, 2) || "SH"}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
