import type { CSSProperties } from "react";
import type { CvBuilderTheme, CvFontKey, CvFontSize, CvLineHeight } from "@/api/types/cv";
import { t as globalT, type TranslateFn } from "@/i18n";
import { defaultCvTheme } from "../utils/createDefaultCv";

export const cvFonts: Record<CvFontKey, { family: string }> = {
  modern: { family: '"Inter", "Segoe UI", Roboto, Arial, sans-serif' },
  classic: { family: 'Georgia, "Times New Roman", serif' },
  compact: { family: 'Arial, "Helvetica Neue", Helvetica, sans-serif' },
  tahoma: { family: 'Tahoma, Verdana, "Segoe UI", sans-serif' },
};

export const cvFontSizes: Record<CvFontSize, { px: number }> = {
  sm: { px: 12 },
  md: { px: 13 },
  lg: { px: 14 },
};

export const cvLineHeights: Record<CvLineHeight, { value: number }> = {
  tight: { value: 1.4 },
  normal: { value: 1.6 },
  relaxed: { value: 1.8 },
};

export function getCvFontLabel(key: CvFontKey, t: TranslateFn = globalT): string {
  return t(`candidate.cv.theme.fonts.${key}`);
}

export function getCvFontSizeLabel(key: CvFontSize, t: TranslateFn = globalT): string {
  return t(`candidate.cv.theme.fontSizes.${key}`);
}

export function getCvLineHeightLabel(key: CvLineHeight, t: TranslateFn = globalT): string {
  return t(`candidate.cv.theme.lineHeights.${key}`);
}

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
