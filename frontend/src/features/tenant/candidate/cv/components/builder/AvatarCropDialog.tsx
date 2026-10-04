import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import Cropper, { type Area } from "react-easy-crop";
import { Loader2, ZoomIn, ZoomOut } from "lucide-react";
import type { CvAvatarCrop } from "@/api/types/cv";
import { DetailDialog } from "@/components/ux/DetailDialog";
import { cropToAreaPercentages } from "../../constants/cvAvatar";

const MAX_ZOOM = 3;

/** Lets the candidate drag/zoom the face inside the current template's frame; nothing is cut from the file. */
export function AvatarCropDialog({ src, ratio, round, initial, saving, error, onCancel, onConfirm }: {
  src: string;
  /** Frame width / height. */
  ratio: number;
  round: boolean;
  initial: CvAvatarCrop | null | undefined;
  saving: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: (crop: CvAvatarCrop) => void;
}) {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const area = useRef<Area | null>(null);
  const aspect = useRef(initial?.aspect ?? 1);

  const confirm = () => {
    const current = area.current;
    if (!current) return;
    const imageAspect = aspect.current;
    const coverW = ratio < imageAspect ? (ratio / imageAspect) * 100 : 100;
    onConfirm({
      x: (current.x + current.width / 2) / 100,
      y: (current.y + current.height / 2) / 100,
      zoom: Math.min(MAX_ZOOM, Math.max(1, coverW / current.width)),
      aspect: imageAspect,
    });
  };

  return createPortal(
    <div className="cv-print-hidden" data-keep-popover>
      <DetailDialog open title="Căn chỉnh ảnh hồ sơ" onClose={onCancel}>
        <div className="relative h-72 overflow-hidden rounded-xl bg-slate-900">
          <Cropper
            image={src}
            crop={position}
            zoom={zoom}
            aspect={ratio}
            maxZoom={MAX_ZOOM}
            cropShape={round ? "round" : "rect"}
            showGrid={!round}
            initialCroppedAreaPercentages={initial ? cropToAreaPercentages(initial, ratio) : undefined}
            onCropChange={setPosition}
            onZoomChange={setZoom}
            onCropComplete={(croppedArea) => { area.current = croppedArea; }}
            onMediaLoaded={(media) => { aspect.current = media.naturalWidth / media.naturalHeight; }}
          />
        </div>
        <label className="mt-4 flex items-center gap-3 text-sm text-slate-600">
          <ZoomOut className="size-4 shrink-0" aria-hidden="true" />
          <input type="range" min={1} max={MAX_ZOOM} step={0.01} value={zoom} onChange={(event) => setZoom(Number(event.target.value))} aria-label="Thu phóng ảnh" className="w-full accent-[var(--color-primary)]" />
          <ZoomIn className="size-4 shrink-0" aria-hidden="true" />
        </label>
        <p className="mt-2 text-xs text-slate-500">Kéo ảnh để đưa khuôn mặt vào giữa khung. Đổi mẫu CV hay hình dạng khung sau này vẫn giữ đúng vị trí đã căn.</p>
        {error && <p role="alert" className="mt-2 text-sm text-red-600">{error}</p>}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} disabled={saving} className="min-h-10 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50">Hủy</button>
          <button type="button" onClick={confirm} disabled={saving} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-60">
            {saving && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}Lưu ảnh
          </button>
        </div>
      </DetailDialog>
    </div>,
    document.body,
  );
}
