import type { CvBuilderItem, CvBuilderSection, CvBuilderTheme, CvLanguage, CvSectionType } from "@/api/types/cv";
import { candidateCvEn } from "@/i18n/locales/en/candidateCv";
import { candidateCvVi } from "@/i18n/locales/vi/candidateCv";

export const cvDocByLanguage = {
  vi: candidateCvVi.doc,
  en: candidateCvEn.doc,
} as const;

export const cvSectionLabelsByLanguage: Record<CvLanguage, Record<CvSectionType, string>> = {
  vi: candidateCvVi.doc.sections,
  en: candidateCvEn.doc.sections,
};

export const defaultCvTheme: CvBuilderTheme = { color: null, font: null, fontSize: "md", lineHeight: "normal" };

export function createItem(): CvBuilderItem {
  return { id: crypto.randomUUID(), title: "", subtitle: "", date: "", description: "" };
}

export function createSection(type: CvSectionType, language: CvLanguage = "vi"): CvBuilderSection {
  return { id: crypto.randomUUID(), type, title: cvSectionLabelsByLanguage[language][type], visible: true, items: [createItem()] };
}

