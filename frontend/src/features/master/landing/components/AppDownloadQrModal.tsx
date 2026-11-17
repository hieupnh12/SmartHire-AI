import { useState, useRef, useEffect } from "react";
import {
  Smartphone,
  QrCode,
  Download,
  Copy,
  Check,
  X,
} from "lucide-react";

export const APK_DOWNLOAD_URL = "https://smarthire.top/smarthire.apk";
export const LOCAL_APK_PATH = "/smarthire.apk";
export const QR_IMAGE_PATH = "/app-qr.png";

// ----------------------------------------------------------------------
// HEADER POPOVER BUTTON (Same behavior as MobileAppHeaderButton on tenant se36)
// ----------------------------------------------------------------------

interface AppDownloadHeaderButtonProps {
  className?: string;
}

export function AppDownloadHeaderButton({ className = "" }: AppDownloadHeaderButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<number | null>(null);

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
    }, 250);
  };

  const handleCopyLink = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(APK_DOWNLOAD_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

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
      {/* Trigger Button in Header */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        title="Quét mã QR tải ứng dụng Android (.APK)"
        className={`flex min-h-10 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg border px-3 text-[13.5px] font-semibold shadow-2xs transition-all active:scale-95 ${
          isOpen
            ? "border-emerald-300 bg-emerald-100 text-emerald-800 ring-2 ring-emerald-500/20"
            : "border-emerald-200 bg-emerald-50/80 text-emerald-700 hover:border-emerald-300 hover:bg-emerald-100 hover:text-emerald-800"
        }`}
      >
        <QrCode className="w-4 h-4 text-emerald-600" />
        <span>Tải App</span>
      </button>

      {/* Popover Card (anchored under button) */}
      {isOpen && (
        <div
          role="dialog"
          aria-label="Tải ứng dụng SmartHire Android"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-[310px] max-w-[calc(100vw-32px)] rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_20px_50px_rgba(15,23,42,0.18)] transition-all animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white font-bold text-sm shadow-xs">
                <Smartphone className="size-4.5" />
              </div>
              <div>
                <h3 className="min-w-0 text-[14.5px] font-bold text-slate-900 leading-snug">
                  SmartHire Android App
                </h3>
                <span className="text-[11px] font-medium text-emerald-600">Bản phát hành chính thức (.APK)</span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="shrink-0 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
              aria-label="Đóng"
            >
              <X className="size-4" />
            </button>
          </div>

          {/* QR Code Presentation */}
          <div className="my-3.5 flex flex-col items-center justify-center">
            <div className="relative rounded-2xl bg-slate-50 p-3 border border-slate-200/80 shadow-inner flex flex-col items-center">
              <img
                src={QR_IMAGE_PATH}
                alt="QR Code Tải SmartHire App"
                className="w-44 h-44 rounded-xl object-contain bg-white p-1"
                onError={(e) => {
                  // Fallback to QR server API if local static file fails
                  (e.target as HTMLImageElement).src = `https://api.qrserver.com/v1/create-qr-code/?size=350x350&margin=8&data=${encodeURIComponent(
                    APK_DOWNLOAD_URL
                  )}`;
                }}
              />
              <span className="mt-2 text-[10.5px] font-semibold text-slate-500 uppercase tracking-wider">
                Quét mã để tải về điện thoại
              </span>
            </div>
            <p className="mt-2 text-center text-xs text-slate-500 leading-relaxed">
              Mở camera hoặc ứng dụng quét mã QR trên điện thoại Android để tải ngay.
            </p>
          </div>

          {/* Direct Download Button */}
          <div className="space-y-2 pt-1 border-t border-slate-100">
            <a
              href={LOCAL_APK_PATH}
              download="SmartHire.apk"
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700 active:scale-95 transition-all"
            >
              <Download className="size-4" />
              <span>Tải trực tiếp file APK (72MB)</span>
            </a>

            <button
              type="button"
              onClick={handleCopyLink}
              className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
              <span>{copied ? "Đã sao chép link tải!" : "Sao chép đường dẫn tải"}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// FULL MODAL DIALOG (Opens from Hero banner, Footer, or Mobile Menu)
// ----------------------------------------------------------------------

interface AppDownloadModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AppDownloadModal({ isOpen, onClose }: AppDownloadModalProps) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(APK_DOWNLOAD_URL);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="app-download-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-xs animate-in fade-in"
      onClick={onClose}
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
          aria-label="Đóng"
        >
          <X className="size-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3">
          <div className="grid size-12 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-2xs">
            <Smartphone className="size-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-emerald-600">
                Ứng dụng di động
              </span>
              <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                Android APK
              </span>
            </div>
            <h2 id="app-download-title" className="text-xl font-bold text-slate-900">
              Tải SmartHire App
            </h2>
          </div>
        </div>

        {/* QR Code Presentation Box */}
        <div className="mt-5 flex flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100/70 p-5 border border-slate-200/80">
          <div className="rounded-2xl bg-white p-3 border border-slate-200 shadow-md">
            <img
              src={QR_IMAGE_PATH}
              alt="Mã QR tải SmartHire App"
              className="w-48 h-48 rounded-xl object-contain bg-white"
              onError={(e) => {
                (e.target as HTMLImageElement).src = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&margin=8&data=${encodeURIComponent(
                  APK_DOWNLOAD_URL
                )}`;
              }}
            />
          </div>
          <span className="mt-3 text-xs font-semibold text-slate-600">
            Quét mã bằng camera điện thoại để tải xuống
          </span>
          <span className="text-[11px] text-slate-400">
            Đường dẫn: smarthire.top/smarthire.apk
          </span>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 space-y-2.5">
          <a
            href={LOCAL_APK_PATH}
            download="SmartHire.apk"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-bold text-white shadow-md hover:bg-emerald-700 active:scale-98 transition-all"
          >
            <Download className="size-4.5" />
            <span>Tải trực tiếp file APK (72MB)</span>
          </a>

          <button
            type="button"
            onClick={handleCopyLink}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
            <span>{copied ? "Đã sao chép liên kết tải!" : "Sao chép liên kết tải"}</span>
          </button>
        </div>

        {/* 3 Step Instruction Guide */}
        <div className="mt-5 space-y-2 text-xs text-slate-600 bg-slate-50/80 p-3.5 rounded-2xl border border-slate-100">
          <div className="flex items-start gap-2">
            <span className="grid size-4.5 shrink-0 place-items-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700">
              1
            </span>
            <span>Mở Camera hoặc Zalo/ứng dụng quét mã QR trên điện thoại Android.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="grid size-4.5 shrink-0 place-items-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700">
              2
            </span>
            <span>Quét mã QR ở trên để bắt đầu tải file <strong>smarthire.apk</strong>.</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="grid size-4.5 shrink-0 place-items-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700">
              3
            </span>
            <span>Mở file vừa tải và chọn <strong>"Cho phép cài đặt"</strong> để hoàn tất.</span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="mt-5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 transition-colors"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
