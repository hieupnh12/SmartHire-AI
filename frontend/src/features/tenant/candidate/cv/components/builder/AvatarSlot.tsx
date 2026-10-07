import { Crop, ImagePlus, Loader2, Trash2 } from "lucide-react";
import type { CvAvatarCrop } from "@/api/types/cv";
import { useAvatarUpload } from "../../hooks/useAvatarUpload";
import { avatarImageStyle, type AvatarFrame } from "../../constants/cvAvatar";
import { AvatarCropDialog } from "./AvatarCropDialog";
import { useCvReadOnly } from "./CvReadOnlyContext";

const overlayButton = "grid size-8 place-items-center rounded-full bg-white/90 hover:bg-white";

/**
 * Photo frame sized/shaped by `frame` (template default or the candidate's override). `initials` layouts always
 * reserve the area; `optional` layouts only show it once a photo exists (an "add photo" button is shown while
 * editing, never printed). `className` only carries decoration (border, background, text).
 */
export function AvatarSlot({ url, avatarCrop, name, frame, className, mode }: {
  url: string | undefined;
  avatarCrop: CvAvatarCrop | null | undefined;
  name: string;
  frame: AvatarFrame;
  className: string;
  /** `box`: rectangular photo frame with a "paste your photo" placeholder (enterprise layout). */
  mode: "initials" | "optional" | "box";
}) {
  const readOnly = useCvReadOnly();
  const { inputRef, pending, error, remove, adjust, crop, inputProps } = useAvatarUpload();

  if (!url && mode !== "initials" && readOnly) return null;

  const size = { width: `${frame.widthMm}mm`, height: `${frame.heightMm}mm` };
  const picker = <input {...inputProps} />;
  const dialog = crop && <AvatarCropDialog {...crop} />;

  if (!url && mode === "box") {
    return (
      <div className="cv-print-hidden shrink-0">
        {picker}{dialog}
        <button type="button" onClick={() => inputRef.current?.click()} disabled={pending} style={size} className={`grid place-items-center border border-slate-800 px-2 text-center text-[11px] italic text-slate-600 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] ${className}`}>
          {pending ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : "(Paste your photo here)"}
        </button>
        {error && <p role="alert" className="mt-1 max-w-32 text-[10px] text-red-600">{error}</p>}
      </div>
    );
  }

  if (!url && mode === "optional") {
    return (
      <div className="cv-print-hidden shrink-0">
        {picker}{dialog}
        <button type="button" onClick={() => inputRef.current?.click()} disabled={pending} style={size} className={`grid place-items-center border-2 border-dashed border-slate-300 text-[11px] font-semibold text-slate-400 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] ${frame.radius}`}>
          {pending ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <span className="flex flex-col items-center gap-0.5"><ImagePlus className="size-5" aria-hidden="true" />Thêm ảnh</span>}
        </button>
        {error && <p role="alert" className="mt-1 max-w-24 text-[10px] text-red-600">{error}</p>}
      </div>
    );
  }

  return (
    <div style={size} className={`group/avatar relative shrink-0 overflow-hidden ${mode === "box" ? "border border-slate-800" : ""} ${frame.radius} ${className}`}>
      {url
        ? <img src={url} alt={name || "Ảnh đại diện"} style={avatarCrop ? avatarImageStyle(avatarCrop, frame) : undefined} className={avatarCrop ? "" : "size-full object-cover"} />
        : <span className="grid size-full place-items-center font-bold">{initials(name)}</span>}
      {!readOnly && (
        <div className={`cv-print-hidden absolute inset-0 flex flex-wrap content-center items-center justify-center gap-1 bg-slate-900/55 transition-opacity ${pending ? "opacity-100" : "opacity-0 group-focus-within/avatar:opacity-100 group-hover/avatar:opacity-100"}`}>
          {picker}{dialog}
          {pending ? <Loader2 className="size-5 animate-spin text-white" aria-hidden="true" /> : (
            <>
              <button type="button" title="Đổi ảnh" aria-label="Đổi ảnh đại diện" onClick={() => inputRef.current?.click()} className={`${overlayButton} text-slate-700`}><ImagePlus className="size-4" aria-hidden="true" /></button>
              {url && <button type="button" title="Căn chỉnh ảnh" aria-label="Căn chỉnh ảnh đại diện" onClick={adjust} className={`${overlayButton} text-slate-700`}><Crop className="size-4" aria-hidden="true" /></button>}
              {url && <button type="button" title="Xóa ảnh" aria-label="Xóa ảnh đại diện" onClick={remove} className={`${overlayButton} text-red-600`}><Trash2 className="size-4" aria-hidden="true" /></button>}
            </>
          )}
        </div>
      )}
      {error && !crop && <p role="alert" className="cv-print-hidden absolute inset-x-0 bottom-0 bg-red-600 px-1 text-center text-[9px] text-white">{error}</p>}
    </div>
  );
}

/** Company logo in the enterprise layout header; keeps the image's aspect ratio. Hidden when printed empty. */
export function LogoSlot({ url }: { url: string | undefined }) {
  const readOnly = useCvReadOnly();
  const { inputRef, pending, error, remove, inputProps } = useAvatarUpload("logoUrl");

  if (!url && readOnly) return null;

  return (
    <div className={`group/logo relative shrink-0 ${url ? "" : "cv-print-hidden"}`}>
      <input {...inputProps} />
      {url ? (
        <img src={url} alt="Logo công ty" className="h-[23mm] max-w-[45mm] object-contain" />
      ) : (
        <button type="button" onClick={() => inputRef.current?.click()} disabled={pending} className="grid h-[23mm] w-[30mm] place-items-center rounded border-2 border-dashed border-slate-300 text-[11px] font-semibold text-slate-400 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]">
          {pending ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : <span className="flex flex-col items-center gap-0.5"><ImagePlus className="size-5" aria-hidden="true" />Logo công ty</span>}
        </button>
      )}
      {url && !readOnly && (
        <div className={`cv-print-hidden absolute inset-0 flex items-center justify-center gap-1 bg-slate-900/45 transition-opacity ${pending ? "opacity-100" : "opacity-0 group-focus-within/logo:opacity-100 group-hover/logo:opacity-100"}`}>
          {pending ? <Loader2 className="size-5 animate-spin text-white" aria-hidden="true" /> : (
            <>
              <button type="button" title="Đổi logo" aria-label="Đổi logo công ty" onClick={() => inputRef.current?.click()} className="grid size-8 place-items-center rounded-full bg-white/90 text-slate-700 hover:bg-white"><ImagePlus className="size-4" aria-hidden="true" /></button>
              <button type="button" title="Xóa logo" aria-label="Xóa logo công ty" onClick={remove} className="grid size-8 place-items-center rounded-full bg-white/90 text-red-600 hover:bg-white"><Trash2 className="size-4" aria-hidden="true" /></button>
            </>
          )}
        </div>
      )}
      {error && <p role="alert" className="cv-print-hidden mt-1 max-w-40 text-[10px] text-red-600">{error}</p>}
    </div>
  );
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "CV";
  return (parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2)).toUpperCase();
}
