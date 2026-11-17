import { useState, useRef, useEffect } from "react";
import {
  Smartphone,
  Apple,
  QrCode,
  Download,
  Copy,
  Check,
  X,
  ExternalLink,
  ShieldCheck,
  Laptop,
} from "lucide-react";

export const APK_DOWNLOAD_URL = "https://smarthire.top/smarthire.apk";
export const LOCAL_APK_PATH = "/smarthire.apk";
export const QR_IMAGE_PATH = "/app-qr.png";

// iOS URLs
export const IOS_DOWNLOAD_URL = "https://smarthire.top/smarthire.ipa";
export const LOCAL_IPA_PATH = "/smarthire.ipa";
export const IOS_TESTFLIGHT_URL = "https://testflight.apple.com/join/smarthire";

export type AppPlatform = "android" | "ios";

// Helper to generate dynamic QR code via reliable free API
function getQrCodeUrl(targetUrl: string, size = 350) {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&margin=8&data=${encodeURIComponent(
    targetUrl
  )}`;
}

// ----------------------------------------------------------------------
// HEADER POPOVER BUTTON (Placed in top navigation bar)
// ----------------------------------------------------------------------

interface AppDownloadHeaderButtonProps {
  className?: string;
}

export function AppDownloadHeaderButton({ className = "" }: AppDownloadHeaderButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [platform, setPlatform] = useState<AppPlatform>("android");
  const [copied, setCopied] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const closeTimerRef = useRef<number | null>(null);

  const currentDownloadUrl = platform === "android" ? APK_DOWNLOAD_URL : IOS_DOWNLOAD_URL;
  const currentLocalPath = platform === "android" ? LOCAL_APK_PATH : LOCAL_IPA_PATH;
  const currentFileName = platform === "android" ? "SmartHire.apk" : "SmartHire.ipa";

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
    }, 280);
  };

  const handleCopyLink = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(currentDownloadUrl);
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
        title="Quét mã QR tải ứng dụng SmartHire (Android & iOS)"
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
          aria-label="Tải ứng dụng SmartHire"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-[330px] max-w-[calc(100vw-32px)] rounded-2xl border border-slate-200/90 bg-white p-5 shadow-[0_20px_50px_rgba(15,23,42,0.18)] transition-all animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`grid size-9 shrink-0 place-items-center rounded-xl text-white font-bold text-sm shadow-xs transition-colors ${
                  platform === "android" ? "bg-emerald-600" : "bg-slate-900"
                }`}
              >
                {platform === "android" ? (
                  <Smartphone className="size-4.5" />
                ) : (
                  <Apple className="size-4.5" />
                )}
              </div>
              <div>
                <h3 className="min-w-0 text-[14.5px] font-bold text-slate-900 leading-snug">
                  SmartHire Mobile App
                </h3>
                <span className="text-[11px] font-medium text-emerald-600">
                  {platform === "android" ? "Bản phát hành Android (.APK)" : "Bản phát hành Apple iOS (.IPA)"}
                </span>
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

          {/* Platform Segmented Tabs */}
          <div className="mt-3.5 grid grid-cols-2 p-1 bg-slate-100 rounded-xl border border-slate-200/70 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setPlatform("android")}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg transition-all ${
                platform === "android"
                  ? "bg-white text-emerald-700 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Smartphone className="size-3.5" />
              <span>Android (.APK)</span>
            </button>
            <button
              type="button"
              onClick={() => setPlatform("ios")}
              className={`flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg transition-all ${
                platform === "ios"
                  ? "bg-white text-slate-900 shadow-xs font-bold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Apple className="size-3.5" />
              <span>iOS (iPhone)</span>
            </button>
          </div>

          {/* QR Code Presentation */}
          <div className="my-3 flex flex-col items-center justify-center">
            <div className="relative rounded-2xl bg-slate-50 p-2.5 border border-slate-200/80 shadow-inner flex flex-col items-center">
              <img
                key={platform}
                src={platform === "android" ? QR_IMAGE_PATH : getQrCodeUrl(IOS_DOWNLOAD_URL, 350)}
                alt={`QR Code Tải SmartHire ${platform === "android" ? "Android" : "iOS"}`}
                className="w-40 h-40 rounded-xl object-contain bg-white p-1"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = getQrCodeUrl(currentDownloadUrl, 350);
                }}
              />
              <span className="mt-1.5 text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                Quét mã để tải về điện thoại
              </span>
            </div>
            <p className="mt-2 text-center text-xs text-slate-500 leading-relaxed">
              {platform === "android"
                ? "Mở camera hoặc Zalo trên điện thoại Android để quét tải file APK."
                : "Mở Camera trên iPhone / iPad để quét liên kết tải file IPA."}
            </p>
          </div>

          {/* Direct Download Buttons */}
          <div className="space-y-2 pt-2 border-t border-slate-100">
            <a
              href={currentLocalPath}
              download={currentFileName}
              className={`flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold text-white shadow-sm transition-all active:scale-95 ${
                platform === "android"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-slate-900 hover:bg-slate-800"
              }`}
            >
              <Download className="size-4" />
              <span>
                {platform === "android" ? "Tải trực tiếp file APK (72MB)" : "Tải file IPA (.ipa)"}
              </span>
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
  initialPlatform?: AppPlatform;
}

export function AppDownloadModal({
  isOpen,
  onClose,
  initialPlatform = "android",
}: AppDownloadModalProps) {
  const [platform, setPlatform] = useState<AppPlatform>(initialPlatform);
  const [copied, setCopied] = useState(false);
  const [iosMethod, setIosMethod] = useState<"sideload" | "testflight">("sideload");

  useEffect(() => {
    if (initialPlatform) {
      setPlatform(initialPlatform);
    }
  }, [initialPlatform, isOpen]);

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

  const currentDownloadUrl = platform === "android" ? APK_DOWNLOAD_URL : IOS_DOWNLOAD_URL;
  const currentLocalPath = platform === "android" ? LOCAL_APK_PATH : LOCAL_IPA_PATH;
  const currentFileName = platform === "android" ? "SmartHire.apk" : "SmartHire.ipa";

  const handleCopyLink = () => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(currentDownloadUrl);
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
        className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150 sm:p-7"
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
          <div
            className={`grid size-12 place-items-center rounded-2xl shadow-2xs transition-colors ${
              platform === "android" ? "bg-emerald-50 text-emerald-600" : "bg-slate-900 text-white"
            }`}
          >
            {platform === "android" ? (
              <Smartphone className="size-6" />
            ) : (
              <Apple className="size-6" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Ứng dụng di động
              </span>
              <span
                className={`rounded px-2 py-0.5 text-[10px] font-bold ${
                  platform === "android"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-slate-100 text-slate-800 border border-slate-200"
                }`}
              >
                {platform === "android" ? "Android (.APK)" : "Apple iOS (.IPA)"}
              </span>
            </div>
            <h2 id="app-download-title" className="text-xl font-bold text-slate-900">
              Tải SmartHire Mobile App
            </h2>
          </div>
        </div>

        {/* Platform Selection Tabs */}
        <div className="mt-5 grid grid-cols-2 p-1.5 bg-slate-100 rounded-2xl border border-slate-200">
          <button
            type="button"
            onClick={() => setPlatform("android")}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              platform === "android"
                ? "bg-white text-emerald-700 shadow-sm border border-emerald-100"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Smartphone className="size-4" />
            <span>Android (.APK)</span>
          </button>
          <button
            type="button"
            onClick={() => setPlatform("ios")}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition-all ${
              platform === "ios"
                ? "bg-white text-slate-900 shadow-sm border border-slate-200"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Apple className="size-4" />
            <span>iOS (iPhone / iPad)</span>
          </button>
        </div>

        {/* QR Code Presentation Box */}
        <div className="mt-4 flex flex-col items-center justify-center rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100/70 p-4 sm:p-5 border border-slate-200/80">
          <div className="rounded-2xl bg-white p-3 border border-slate-200 shadow-md">
            <img
              key={platform}
              src={platform === "android" ? QR_IMAGE_PATH : getQrCodeUrl(IOS_DOWNLOAD_URL, 400)}
              alt={`Mã QR tải SmartHire ${platform === "android" ? "Android" : "iOS"}`}
              className="w-44 h-44 sm:w-48 sm:h-48 rounded-xl object-contain bg-white"
              onError={(e) => {
                (e.target as HTMLImageElement).src = getQrCodeUrl(currentDownloadUrl, 400);
              }}
            />
          </div>
          <span className="mt-3 text-xs font-semibold text-slate-600 text-center">
            {platform === "android"
              ? "Quét mã bằng Camera điện thoại hoặc Zalo để tải APK"
              : "Quét mã bằng Camera iPhone để tải file IPA"}
          </span>
          <span className="text-[11px] text-slate-400 mt-0.5 break-all text-center">
            Đường dẫn: {currentDownloadUrl.replace(/^https?:\/\//, "")}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="mt-4 space-y-2.5">
          <a
            href={currentLocalPath}
            download={currentFileName}
            className={`flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white shadow-md transition-all active:scale-98 ${
              platform === "android"
                ? "bg-emerald-600 hover:bg-emerald-700"
                : "bg-slate-900 hover:bg-slate-800"
            }`}
          >
            <Download className="size-4.5" />
            <span>
              {platform === "android"
                ? "Tải trực tiếp file APK (72MB)"
                : "Tải trực tiếp file IPA (.ipa)"}
            </span>
          </a>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex-1 flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              {copied ? <Check className="size-4 text-emerald-600" /> : <Copy className="size-4" />}
              <span>{copied ? "Đã sao chép liên kết!" : "Sao chép link tải"}</span>
            </button>

            {platform === "ios" && (
              <a
                href={IOS_TESTFLIGHT_URL}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors"
              >
                <ExternalLink className="size-3.5" />
                <span>TestFlight</span>
              </a>
            )}
          </div>
        </div>

        {/* Platform Specific Instruction Guide */}
        {platform === "android" ? (
          <div className="mt-5 space-y-2.5 text-xs text-slate-600 bg-slate-50/80 p-3.5 sm:p-4 rounded-2xl border border-slate-200/80">
            <div className="font-semibold text-slate-900 flex items-center gap-1.5 mb-1">
              <ShieldCheck className="size-4 text-emerald-600" />
              <span>Hướng dẫn cài đặt Android:</span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700">
                1
              </span>
              <span>
                Mở <strong>Camera</strong> hoặc Zalo/trình duyệt quét mã QR phía trên để tải file.
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700">
                2
              </span>
              <span>
                Nhấn <strong>"Vẫn tải xuống"</strong> nếu trình duyệt hiển thị cảnh báo tệp APK.
              </span>
            </div>
            <div className="flex items-start gap-2.5">
              <span className="grid size-5 shrink-0 place-items-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700">
                3
              </span>
              <span>
                Mở tệp <strong>smarthire.apk</strong> vừa tải, chọn <strong>"Cài đặt"</strong> (hoặc bật <em>Cho phép cài đặt từ nguồn này</em> nếu được hỏi).
              </span>
            </div>
          </div>
        ) : (
          <div className="mt-5 space-y-3 text-xs text-slate-600 bg-slate-50/90 p-4 rounded-2xl border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-200/70 pb-2">
              <div className="font-semibold text-slate-900 flex items-center gap-1.5">
                <Laptop className="size-4 text-slate-700" />
                <span>Hướng dẫn cài đặt trên iOS (iPhone/iPad):</span>
              </div>
            </div>

            {/* Sub-selector for iOS install method */}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIosMethod("sideload")}
                className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition-all ${
                  iosMethod === "sideload"
                    ? "bg-white text-slate-900 border-slate-300 shadow-2xs font-bold"
                    : "bg-slate-100/70 text-slate-500 border-transparent hover:text-slate-800"
                }`}
              >
                Cách 1: Qua Sideloadly / AltStore (Khuyên dùng)
              </button>
              <button
                type="button"
                onClick={() => setIosMethod("testflight")}
                className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition-all ${
                  iosMethod === "testflight"
                    ? "bg-white text-blue-700 border-blue-200 shadow-2xs font-bold"
                    : "bg-slate-100/70 text-slate-500 border-transparent hover:text-slate-800"
                }`}
              >
                Cách 2: Qua Apple TestFlight
              </button>
            </div>

            {iosMethod === "sideload" ? (
              <div className="space-y-2 pt-1 text-[11.5px] leading-relaxed">
                <div className="flex items-start gap-2">
                  <span className="grid size-4.5 shrink-0 place-items-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-800">
                    1
                  </span>
                  <span>
                    Bấm <strong>"Tải trực tiếp file IPA"</strong> ở trên về máy tính (Windows hoặc Mac).
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="grid size-4.5 shrink-0 place-items-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-800">
                    2
                  </span>
                  <span>
                    Cài phần mềm miễn phí{" "}
                    <a
                      href="https://sideloadly.io/"
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 underline font-semibold"
                    >
                      Sideloadly
                    </a>{" "}
                    hoặc AltStore trên máy tính, cắm iPhone bằng cáp USB.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="grid size-4.5 shrink-0 place-items-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-800">
                    3
                  </span>
                  <span>
                    Kéo file <strong>SmartHire.ipa</strong> vào Sideloadly, nhập Apple ID của bạn và nhấn <strong>Start</strong> để nạp vào iPhone.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="grid size-4.5 shrink-0 place-items-center rounded-full bg-slate-200 text-[10px] font-bold text-slate-800">
                    4
                  </span>
                  <span>
                    Trên iPhone: Vào <em>Cài đặt &gt; Cài đặt chung &gt; Quản lý VPN &amp; Thiết bị</em> &gt; chọn Apple ID của bạn và nhấn <strong>"Tin cậy" (Trust)</strong> để mở ứng dụng.
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-2 pt-1 text-[11.5px] leading-relaxed">
                <div className="flex items-start gap-2">
                  <span className="grid size-4.5 shrink-0 place-items-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">
                    1
                  </span>
                  <span>
                    Cài ứng dụng <strong>Apple TestFlight</strong> miễn phí từ App Store trên iPhone.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="grid size-4.5 shrink-0 place-items-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">
                    2
                  </span>
                  <span>
                    Mở đường link TestFlight của SmartHire hoặc quét mã QR ở trên để tham gia nhóm thử nghiệm.
                  </span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="grid size-4.5 shrink-0 place-items-center rounded-full bg-blue-100 text-[10px] font-bold text-blue-700">
                    3
                  </span>
                  <span>
                    Nhấn <strong>"Cài đặt" (Install)</strong> trong TestFlight để tự động cài app lên thiết bị.
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

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
