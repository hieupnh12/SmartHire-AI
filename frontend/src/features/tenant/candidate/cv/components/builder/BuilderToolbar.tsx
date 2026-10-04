import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  ArrowLeft, Circle, ClipboardCheck, Crop, Download, ImagePlus, LayoutTemplate, Lightbulb, Loader2, Palette, Plus,
  RectangleHorizontal, RectangleVertical, Redo2, Save, Square, Squircle, Target, Trash2, Type, Undo2, UserRound, ZoomIn, ZoomOut,
} from "lucide-react";
import type { CvAvatarShape, CvAvatarStyle, CvBuilderTheme, CvLanguage, CvSectionType } from "@/api/types/cv";
import { useAvatarUpload } from "../../hooks/useAvatarUpload";
import { AVATAR_SIZE_MAX_MM, AVATAR_SIZE_MIN_MM, avatarShapes, resolveAvatarFrame } from "../../constants/cvAvatar";
import { AvatarCropDialog } from "./AvatarCropDialog";
import { cvSectionLabels, cvSectionTypes } from "../../utils/createDefaultCv";
import { ColorPanel, FontPanel } from "./ThemePanel";
import { TemplatePickerDialog } from "./TemplatePickerDialog";
import { scoreTone } from "./CvReviewPanel";

export const ZOOM_MIN = 50;
export const ZOOM_MAX = 150;
const ZOOM_STEP = 10;

const pillClass = "inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-40";
const idleClass = "text-slate-700 hover:bg-slate-100 hover:text-[var(--color-primary)]";
const activeClass = "bg-[color-mix(in_srgb,var(--color-primary)_12%,white)] text-[var(--color-primary)]";

function Divider() {
  return <span className="mx-0.5 hidden h-6 w-px bg-slate-200 sm:block" aria-hidden="true" />;
}

function IconButton({ label, icon: Icon, onClick, disabled }: { label: string; icon: LucideIcon; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" title={label} aria-label={label} onClick={onClick} disabled={disabled} className={`${pillClass} ${idleClass} px-2`}>
      <Icon className="size-4" aria-hidden="true" />
    </button>
  );
}

function ToolbarPopover({ label, icon: Icon, width = "w-72", children }: { label: string; icon: LucideIcon; width?: string; children: (close: () => void) => ReactNode }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    // Dialogs opened from a popover are portaled to <body>; interacting with them must not close the popover.
    const dialogOpen = () => !!document.querySelector("[data-keep-popover]");
    const onPointer = (event: MouseEvent) => {
      if (!rootRef.current?.contains(event.target as Node) && !dialogOpen()) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !dialogOpen()) setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button type="button" aria-expanded={open} aria-haspopup="dialog" title={label} onClick={() => setOpen((value) => !value)} className={`${pillClass} ${open ? activeClass : idleClass}`}>
        <Icon className="size-4" aria-hidden="true" /><span className="hidden lg:inline">{label}</span>
      </button>
      {open && (
        <div role="dialog" aria-label={label} className={`absolute left-0 top-full z-50 mt-3 max-h-[70vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-xl ${width}`}>
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

const shapeIcons: Record<CvAvatarShape, LucideIcon> = {
  circle: Circle,
  rounded: Squircle,
  square: Square,
  portrait: RectangleVertical,
  landscape: RectangleHorizontal,
};

function AvatarPanel({ avatarUrl, templateId, theme, onTheme }: {
  avatarUrl: string | undefined;
  templateId: string;
  theme: CvBuilderTheme | undefined;
  onTheme: (patch: Partial<CvBuilderTheme>) => void;
}) {
  const { pending, error, pick, adjust, remove, crop, inputProps } = useAvatarUpload();
  const frame = resolveAvatarFrame(templateId, theme);
  const setAvatar = (patch: CvAvatarStyle) => onTheme({ avatar: { ...theme?.avatar, ...patch } });
  return (
    <div className="space-y-3">
      <input {...inputProps} />
      {crop && <AvatarCropDialog {...crop} />}
      <div className="flex items-center gap-3">
        <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-slate-100 text-slate-400">
          {pending ? <Loader2 className="size-5 animate-spin" aria-hidden="true" /> : avatarUrl ? <img src={avatarUrl} alt="Ảnh hồ sơ" className="size-full object-cover" /> : <UserRound className="size-7" aria-hidden="true" />}
        </div>
        <p className="text-xs leading-relaxed text-slate-500">JPG, PNG hoặc WebP. Sau khi chọn ảnh, kéo/thu phóng để căn khuôn mặt vào khung.</p>
      </div>
      <div className="flex gap-2">
        <button type="button" onClick={pick} disabled={pending} className={`${pillClass} flex-1 justify-center bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]`}>
          <ImagePlus className="size-4" aria-hidden="true" />{avatarUrl ? "Đổi ảnh" : "Tải ảnh lên"}
        </button>
        {avatarUrl && (
          <button type="button" title="Căn chỉnh ảnh" aria-label="Căn chỉnh ảnh" onClick={adjust} disabled={pending} className={`${pillClass} border border-slate-200 text-slate-700 hover:bg-slate-50`}>
            <Crop className="size-4" aria-hidden="true" />
          </button>
        )}
        {avatarUrl && (
          <button type="button" onClick={remove} disabled={pending} className={`${pillClass} border border-slate-200 text-red-600 hover:bg-red-50`}>
            <Trash2 className="size-4" aria-hidden="true" />Xóa
          </button>
        )}
      </div>
      {error && !crop && <p role="alert" className="text-xs text-red-600">{error}</p>}
      {frame.locked ? (
        <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">Mẫu này dùng khung ảnh cố định 128×151 px theo file Word mẫu; bạn vẫn có thể căn chỉnh ảnh trong khung.</p>
      ) : (
        <div className="space-y-3 border-t border-slate-100 pt-3">
          <div>
            <p className="mb-1.5 text-xs font-semibold text-slate-600">Hình dạng khung</p>
            <div role="group" aria-label="Hình dạng khung ảnh" className="flex gap-1">
              {(Object.keys(avatarShapes) as CvAvatarShape[]).map((shape) => {
                const Icon = shapeIcons[shape];
                return (
                  <button key={shape} type="button" title={avatarShapes[shape].label} aria-label={avatarShapes[shape].label} aria-pressed={frame.shape === shape} onClick={() => setAvatar({ shape })} className={`grid size-9 place-items-center rounded-lg border ${frame.shape === shape ? "border-[var(--color-primary)] text-[var(--color-primary)]" : "border-slate-200 text-slate-500 hover:text-slate-800"}`}>
                    <Icon className="size-4" aria-hidden="true" />
                  </button>
                );
              })}
            </div>
          </div>
          <label className="block">
            <span className="mb-1.5 flex justify-between text-xs font-semibold text-slate-600">Kích thước<span className="tabular-nums text-slate-500">{Math.round(frame.widthMm)} mm</span></span>
            <input type="range" min={AVATAR_SIZE_MIN_MM} max={AVATAR_SIZE_MAX_MM} step={1} value={Math.round(frame.widthMm)} onChange={(event) => setAvatar({ sizeMm: Number(event.target.value) })} className="w-full accent-[var(--color-primary)]" />
          </label>
          {theme?.avatar && (
            <button type="button" onClick={() => onTheme({ avatar: undefined })} className="text-xs font-semibold text-[var(--color-primary)] hover:underline">Về mặc định của mẫu</button>
          )}
        </div>
      )}
    </div>
  );
}

/** MyCV-style floating control bar of the CV Builder, sticky above the A4 workspace. */
export function BuilderToolbar({
  templateId, theme, language, avatarUrl, zoom, editing, saving, downloading, canUndo, canRedo, reviewOpen, reviewScore,
  onLanguage, onTemplate, onTheme, onAddSection, onZoom, onUndo, onRedo, onDownload, onJobMatch, onTips, onReview, onSave,
}: {
  templateId: string;
  theme: CvBuilderTheme | undefined;
  language: CvLanguage;
  avatarUrl: string | undefined;
  zoom: number;
  editing: boolean;
  saving: boolean;
  downloading: boolean;
  canUndo: boolean;
  canRedo: boolean;
  reviewOpen: boolean;
  reviewScore: number;
  onLanguage: (language: CvLanguage) => void;
  onTemplate: (templateId: string) => void;
  onTheme: (patch: Partial<CvBuilderTheme>) => void;
  onAddSection: (type: CvSectionType) => void;
  onZoom: (zoom: number) => void;
  onUndo: () => void;
  onRedo: () => void;
  onDownload: () => void;
  onJobMatch: () => void;
  onTips: () => void;
  onReview: () => void;
  onSave: () => void;
}) {
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const setZoom = (value: number) => onZoom(Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, value)));

  return (
    <div className="cv-print-hidden sticky top-20 z-40 flex justify-center">
      <div role="toolbar" aria-label="Công cụ tạo CV" className="flex max-w-full flex-wrap items-center justify-center gap-1 rounded-3xl border border-slate-200 bg-white/95 px-2 py-1.5 shadow-lg backdrop-blur xl:rounded-full">
        <Link to="/cv-templates" title="Quay lại Mẫu CV" aria-label="Quay lại trang Mẫu CV" className={`${pillClass} ${idleClass} px-2`}>
          <ArrowLeft className="size-4" aria-hidden="true" />
        </Link>
        <Divider />

        <ToolbarPopover label="Phông chữ" icon={Type}>{() => <FontPanel theme={theme} onChange={onTheme} />}</ToolbarPopover>
        <ToolbarPopover label="Màu sắc" icon={Palette} width="w-64">{() => <ColorPanel theme={theme} onChange={onTheme} />}</ToolbarPopover>
        <button type="button" title="Mẫu CV" onClick={() => setTemplatesOpen(true)} className={`${pillClass} ${templatesOpen ? activeClass : idleClass}`}>
          <LayoutTemplate className="size-4" aria-hidden="true" /><span className="hidden lg:inline">Mẫu CV</span>
        </button>
        <ToolbarPopover label="Ảnh hồ sơ" icon={UserRound}>{() => <AvatarPanel avatarUrl={avatarUrl} templateId={templateId} theme={theme} onTheme={onTheme} />}</ToolbarPopover>
        <ToolbarPopover label="Thêm mục" icon={Plus} width="w-56">
          {(close) => (
            <ul className="space-y-0.5">
              {cvSectionTypes.map((type) => (
                <li key={type}>
                  <button type="button" onClick={() => { onAddSection(type); close(); }} className="w-full rounded-lg px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50 hover:text-[var(--color-primary)]">{cvSectionLabels[type]}</button>
                </li>
              ))}
            </ul>
          )}
        </ToolbarPopover>
        <div role="group" aria-label="Ngôn ngữ CV" className="flex rounded-full bg-slate-100 p-0.5">
          {(["vi", "en"] as const).map((key) => (
            <button
              key={key}
              type="button"
              aria-pressed={language === key}
              title={key === "vi" ? "Tiêu đề mục tiếng Việt" : "English section titles"}
              onClick={() => onLanguage(key)}
              className={`min-h-8 rounded-full px-2.5 text-xs font-bold transition-colors ${language === key ? "bg-white text-[var(--color-primary)] shadow-sm" : "text-slate-500 hover:text-slate-800"}`}
            >
              {key.toUpperCase()}
            </button>
          ))}
        </div>
        <Divider />

        <IconButton label="Hoàn tác (Ctrl+Z)" icon={Undo2} disabled={!canUndo} onClick={onUndo} />
        <IconButton label="Làm lại (Ctrl+Y)" icon={Redo2} disabled={!canRedo} onClick={onRedo} />
        <Divider />

        <IconButton label="Thu nhỏ" icon={ZoomOut} disabled={zoom <= ZOOM_MIN} onClick={() => setZoom(zoom - ZOOM_STEP)} />
        <button type="button" title="Về 100%" onClick={() => setZoom(100)} className="min-h-9 w-12 rounded-full text-xs font-bold tabular-nums text-slate-600 hover:bg-slate-100">{zoom}%</button>
        <IconButton label="Phóng to" icon={ZoomIn} disabled={zoom >= ZOOM_MAX} onClick={() => setZoom(zoom + ZOOM_STEP)} />
        <Divider />

        <IconButton label="Mẹo viết CV" icon={Lightbulb} onClick={onTips} />
        <button type="button" title="Đánh giá CV" aria-pressed={reviewOpen} onClick={onReview} className={`${pillClass} ${reviewOpen ? activeClass : idleClass} px-2.5`}>
          <ClipboardCheck className="size-4" aria-hidden="true" />
          <span className={`text-xs font-bold ${scoreTone(reviewScore)}`}>{reviewScore}</span>
        </button>
        <IconButton label="Chấm theo tin tuyển dụng" icon={Target} onClick={onJobMatch} />
        <Divider />

        <button type="button" onClick={onSave} disabled={saving} className={`${pillClass} border border-slate-200 text-slate-700 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]`}>
          {saving ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Save className="size-4" aria-hidden="true" />}
          {editing ? "Cập nhật" : "Lưu CV"}
        </button>
        <button type="button" onClick={onDownload} disabled={downloading} className={`${pillClass} bg-[var(--color-primary)] px-4 text-white shadow-sm hover:bg-[var(--color-primary-hover)]`}>
          {downloading ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Download className="size-4" aria-hidden="true" />}
          {downloading ? "Đang tạo PDF…" : "Tải xuống PDF"}
        </button>
      </div>
      {templatesOpen && <TemplatePickerDialog templateId={templateId} onSelect={onTemplate} onClose={() => setTemplatesOpen(false)} />}
    </div>
  );
}
