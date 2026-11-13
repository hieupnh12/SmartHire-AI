import type { CvBuilderData, CvBuilderItem, CvBuilderSection, CvLanguage, CvSectionType } from "@/api/types/cv";
import type { UserProfile } from "@/features/tenant/auth/types";
import { t as globalT, useI18nStore, type Locale, type TranslateFn } from "@/i18n";
import { candidateCvVi } from "@/i18n/locales/vi/candidateCv";
import { candidateCvEn } from "@/i18n/locales/en/candidateCv";
import { cvTemplates } from "@/features/tenant/candidate/shared/constants/cvTemplates";
import {
  createItem,
  createSection,
  cvDocByLanguage,
  cvSectionLabelsByLanguage,
  defaultCvTheme,
} from "./cvDocPrimitives";
import { createEnterpriseSampleCv } from "./enterpriseSampleCv";

export { createItem, createSection, cvDocByLanguage, cvSectionLabelsByLanguage, defaultCvTheme };

export const cvSectionTypes: readonly CvSectionType[] = [
  "experience",
  "education",
  "projects",
  "skills",
  "languages",
  "certifications",
  "awards",
  "activities",
  "interests",
  "references",
  "custom",
];

export function getCvSectionLabel(type: CvSectionType, t: TranslateFn = globalT): string {
  return t(`candidate.cv.sections.${type}`);
}

/** Fixed headings printed on the CV itself (not editable section titles). */
export const cvFixedHeadings: Record<CvLanguage, { summary: string; contact: string; details: string; page: string; professionalSummary: string }> = {
  vi: candidateCvVi.doc.fixedHeadings,
  en: candidateCvEn.doc.fixedHeadings,
};

/**
 * Running page footer text. The enterprise (table) layout copies the classic outsourcing CV:
 * centered "{name}'s CV - Confidential" with a bare page number; other layouts use "{name} – CV" + "Trang i / N".
 */
export function cvFooter(cv: CvBuilderData) {
  const language = cv.language ?? "vi";
  const doc = cvDocByLanguage[language];
  const name = cv.personalInfo.fullName.trim() || "CV";
  const pageLabel = doc.fixedHeadings.page;
  if (cvTemplates.find((item) => item.id === cv.templateId)?.layout === "table") {
    return {
      text: doc.footer.confidential.replace("{name}", name),
      centered: true,
      pageLabel,
    };
  }
  return {
    text: doc.footer.standard.replace("{name}", name),
    centered: false,
    pageLabel,
  };
}

/** Section types whose items can carry a 1..5 level rating. */
export const ratedSectionTypes = new Set<CvSectionType>(["skills", "languages"]);

/** Short, list-like sections placed in the narrow column of two-column layouts. */
export const sideSectionTypes = new Set<CvSectionType>(["skills", "education", "languages", "certifications", "interests", "references"]);

export const resolveTemplateId = (value: string | null | undefined) =>
  cvTemplates.some((item) => item.id === value) ? value! : cvTemplates[0].id;

const sample = (type: CvSectionType, language: CvLanguage, item: Omit<CvBuilderItem, "id">): CvBuilderSection => ({
  ...createSection(type, language),
  items: [{ id: crypto.randomUUID(), ...item }],
});

export function createDefaultCv(
  templateId: string | null,
  user: UserProfile | null,
  t: TranslateFn = globalT,
  locale: Locale = useI18nStore.getState().locale,
): CvBuilderData {
  const resolvedId = resolveTemplateId(templateId);
  if (cvTemplates.find((item) => item.id === resolvedId)?.layout === "table") return createEnterpriseSampleCv(resolvedId, user);
  const cvLanguage: CvLanguage = locale === "vi" ? "vi" : "en";
  return {
    templateId: resolvedId,
    accentColor: null,
    theme: defaultCvTheme,
    language: cvLanguage,
    personalInfo: {
      fullName: user?.fullName ?? "",
      title: user?.headline ?? "",
      email: user?.email ?? "",
      phone: user?.phone ?? "",
      address: "",
      website: "",
      summary: "",
      avatarUrl: "",
      github: "",
      linkedin: "",
    },
    sections: [
      sample("experience", cvLanguage, {
        title: t("candidate.cv.defaultCv.sampleCompany"),
        subtitle: t("candidate.cv.defaultCv.sampleRole"),
        date: t("candidate.cv.defaultCv.sampleExperienceDate"),
        description: `<ul><li>${t("candidate.cv.defaultCv.sampleExperienceDesc")}</li></ul>`,
      }),
      sample("projects", cvLanguage, {
        title: t("candidate.cv.defaultCv.sampleProject"),
        subtitle: t("candidate.cv.defaultCv.sampleProjectRole"),
        date: "2024",
        description: "",
      }),
      sample("education", cvLanguage, {
        title: t("candidate.cv.defaultCv.sampleSchool"),
        subtitle: t("candidate.cv.defaultCv.sampleMajor"),
        date: "2019 - 2023",
        description: "",
      }),
      {
        ...createSection("skills", cvLanguage),
        items: [
          { id: crypto.randomUUID(), title: "Backend", subtitle: "", date: "", description: "Java, Spring Boot, MySQL", level: 5 },
          { id: crypto.randomUUID(), title: "Frontend", subtitle: "", date: "", description: "React, TypeScript, TailwindCSS", level: 3 },
        ],
      },
      sample("languages", cvLanguage, {
        title: t("candidate.cv.defaultCv.sampleLanguage"),
        subtitle: t("candidate.cv.defaultCv.sampleLanguageLevel"),
        date: "",
        description: "",
        level: 3,
      }),
    ],
  };
}

export function isCvBuilderData(value: unknown): value is CvBuilderData {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<CvBuilderData>;
  return typeof data.templateId === "string" && !!data.personalInfo && Array.isArray(data.sections);
}
