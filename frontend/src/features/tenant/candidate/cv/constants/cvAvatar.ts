import type { CSSProperties } from "react";
import type { CvAvatarCrop, CvAvatarShape, CvBuilderTheme } from "@/api/types/cv";
import { cvTemplates, type CvLayout } from "@/features/tenant/candidate/shared/constants/cvTemplates";

export const AVATAR_SIZE_MIN_MM = 20;
export const AVATAR_SIZE_MAX_MM = 45;

export const avatarShapes: Record<CvAvatarShape, { label: string; ratio: number; radius: string }> = {
  circle: { label: "Tròn", ratio: 1, radius: "rounded-full" },
  rounded: { label: "Vuông bo góc", ratio: 1, radius: "rounded-xl" },
  square: { label: "Vuông", ratio: 1, radius: "rounded-none" },
  portrait: { label: "Chữ nhật đứng 3:4", ratio: 3 / 4, radius: "rounded-md" },
  landscape: { label: "Chữ nhật ngang 4:3", ratio: 4 / 3, radius: "rounded-md" },
};

export type AvatarFrame = { shape: CvAvatarShape; widthMm: number; heightMm: number; radius: string; locked: boolean };

const PX_TO_MM = 25.4 / 96;

/** Template defaults (same sizes as before: 96px, 112px for sidebar). */
const layoutAvatar: Record<CvLayout, { shape: CvAvatarShape; sizeMm: number }> = {
  single: { shape: "circle", sizeMm: 96 * PX_TO_MM },
  split: { shape: "circle", sizeMm: 96 * PX_TO_MM },
  sidebar: { shape: "circle", sizeMm: 112 * PX_TO_MM },
  cards: { shape: "circle", sizeMm: 96 * PX_TO_MM },
  banner: { shape: "circle", sizeMm: 96 * PX_TO_MM },
  corporate: { shape: "circle", sizeMm: 96 * PX_TO_MM },
  table: { shape: "portrait", sizeMm: 128 * PX_TO_MM },
};

/** The enterprise Word template's photo box is fixed at 128×151px and cannot be restyled. */
const ENTERPRISE_FRAME: AvatarFrame = { shape: "portrait", widthMm: 128 * PX_TO_MM, heightMm: 151 * PX_TO_MM, radius: "rounded-none", locked: true };

/** Effective photo frame: template default overridden by `theme.avatar`. `sizeMm` is the width. */
export function resolveAvatarFrame(templateId: string, theme: CvBuilderTheme | undefined): AvatarFrame {
  const layout = cvTemplates.find((item) => item.id === templateId)?.layout ?? "single";
  if (layout === "table") return ENTERPRISE_FRAME;
  const base = layoutAvatar[layout];
  const shape = theme?.avatar?.shape ?? base.shape;
  const widthMm = theme?.avatar?.sizeMm ?? base.sizeMm;
  return { shape, widthMm, heightMm: widthMm / avatarShapes[shape].ratio, radius: avatarShapes[shape].radius, locked: false };
}

/** Positions the uncropped photo so the saved focus fills a frame of any aspect ratio (what react-easy-crop showed). */
export function avatarImageStyle(crop: CvAvatarCrop, frame: AvatarFrame): CSSProperties {
  const { widthMm: w, heightMm: h } = frame;
  const scale = Math.max(w / crop.aspect, h) * crop.zoom;
  const imageW = crop.aspect * scale;
  const imageH = scale;
  const left = Math.min(0, Math.max(w - imageW, w / 2 - crop.x * imageW));
  const top = Math.min(0, Math.max(h - imageH, h / 2 - crop.y * imageH));
  return { position: "absolute", maxWidth: "none", width: `${imageW}mm`, height: `${imageH}mm`, left: `${left}mm`, top: `${top}mm` };
}

/** react-easy-crop's initial area (percent of the image) for a saved crop shown in a frame of `ratio` (w/h). */
export function cropToAreaPercentages(crop: CvAvatarCrop, ratio: number) {
  const coverW = ratio < crop.aspect ? (ratio / crop.aspect) * 100 : 100;
  const coverH = ratio < crop.aspect ? 100 : (crop.aspect / ratio) * 100;
  const width = coverW / crop.zoom;
  const height = coverH / crop.zoom;
  const clamp = (value: number, size: number) => Math.min(100 - size, Math.max(0, value));
  return { width, height, x: clamp(crop.x * 100 - width / 2, width), y: clamp(crop.y * 100 - height / 2, height) };
}
