import type { CSSProperties } from "react";
import type { CvBuilderTheme, CvFontKey, CvFontSize, CvLineHeight } from "@/api/types/cv";
import { defaultCvTheme } from "../utils/createDefaultCv";

export const cvFonts: Record<CvFontKey, { label: string; family: string }> = {
  modern: { label: "Hiện đại", family: '"Inter", "Segoe UI", Roboto, Arial, sans-serif' },
  classic: { label: "Cổ điển", family: 'Georgia, "Times New Roman", serif' },
  compact: { label: "Gọn gàng", family: 'Arial, "Helvetica Neue", Helvetica, sans-serif' },
  tahoma: { label: "Tahoma", family: 'Tahoma, Verdana, "Segoe UI", sans-serif' },
};

export const cvFontSizes: Record<CvFontSize, { label: string; px: number }> = {
  sm: { label: "Nhỏ", px: 12 },
  md: { label: "Vừa", px: 13 },
  lg: { label: "Lớn", px: 14 },
};

export const cvLineHeights: Record<CvLineHeight, { label: string; value: number }> = {
  tight: { label: "Hẹp", value: 1.4 },
  normal: { label: "Vừa", value: 1.6 },
  relaxed: { label: "Rộng", value: 1.8 },
};

export const cvColorPresets = ["#2563eb", "#0d9488", "#16a34a", "#ea580c", "#dc2626", "#db2777", "#7c3aed", "#334155"];

/** Inline style for the CV page; overriding --color-primary re-tints every accent inside the canvas. */
export function cvThemeStyle(theme: CvBuilderTheme | undefined): CSSProperties {
  const value = { ...defaultCvTheme, ...theme };
  return {
    fontSize: cvFontSizes[value.fontSize].px,
    lineHeight: cvLineHeights[value.lineHeight].value,
    ...(value.font ? { fontFamily: cvFonts[value.font].family } : {}),
    ...(value.color ? { "--color-primary": value.color } : {}),
  } as CSSProperties;
}
