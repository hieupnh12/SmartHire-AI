import type { CvBuilderData, CvBuilderItem, CvBuilderSection, CvBuilderTheme, CvLanguage, CvSectionType } from "@/api/types/cv";
import type { UserProfile } from "@/features/tenant/auth/types";
import { cvTemplates } from "@/features/tenant/candidate/shared/constants/cvTemplates";
import { createEnterpriseSampleCv } from "./enterpriseSampleCv";

export const cvSectionLabels: Record<CvSectionType, string> = {
  experience: "Kinh nghiệm làm việc",
  education: "Học vấn",
  projects: "Dự án",
  skills: "Kỹ năng",
  languages: "Ngoại ngữ",
  certifications: "Chứng chỉ",
  awards: "Giải thưởng",
  activities: "Hoạt động",
  interests: "Sở thích",
  references: "Người tham chiếu",
  custom: "Mục tùy chỉnh",
};

export const cvSectionLabelsByLanguage: Record<CvLanguage, Record<CvSectionType, string>> = {
  vi: cvSectionLabels,
  en: {
    experience: "Work Experience",
    education: "Education",
    projects: "Projects",
    skills: "Skills",
    languages: "Languages",
    certifications: "Certifications",
    awards: "Awards",
    activities: "Activities",
    interests: "Interests",
    references: "References",
    custom: "Custom Section",
  },
};

/** Fixed headings printed on the CV itself (not editable section titles). */
export const cvFixedHeadings: Record<CvLanguage, { summary: string; contact: string; details: string; page: string }> = {
  vi: { summary: "Giới thiệu", contact: "Liên hệ", details: "Thông tin cá nhân", page: "Trang" },
  en: { summary: "Summary", contact: "Contact", details: "Personal Details", page: "Page" },
};

/**
 * Running page footer text. The enterprise (table) layout copies the classic outsourcing CV:
 * centered "{name}'s CV - Confidential" with a bare page number; other layouts use "{name} – CV" + "Trang i / N".
 */
export function cvFooter(cv: CvBuilderData) {
  const language = cv.language ?? "vi";
  const name = cv.personalInfo.fullName.trim() || "CV";
  const pageLabel = cvFixedHeadings[language].page;
  if (cvTemplates.find((item) => item.id === cv.templateId)?.layout === "table") {
    return { text: language === "en" ? `${name}'s CV - Confidential` : `CV của ${name} - Bảo mật`, centered: true, pageLabel };
  }
  return { text: `${name} – CV`, centered: false, pageLabel };
}

export const cvSectionTypes = Object.keys(cvSectionLabels) as CvSectionType[];

/** Section types whose items can carry a 1..5 level rating. */
export const ratedSectionTypes = new Set<CvSectionType>(["skills", "languages"]);

/** Short, list-like sections placed in the narrow column of two-column layouts. */
export const sideSectionTypes = new Set<CvSectionType>(["skills", "education", "languages", "certifications", "interests", "references"]);

export const defaultCvTheme: CvBuilderTheme = { color: null, font: null, fontSize: "md", lineHeight: "normal" };

export const resolveTemplateId = (value: string | null | undefined) =>
  cvTemplates.some((item) => item.id === value) ? value! : cvTemplates[0].id;

export function createItem(): CvBuilderItem {
  return { id: crypto.randomUUID(), title: "", subtitle: "", date: "", description: "" };
}

export function createSection(type: CvSectionType, language: CvLanguage = "vi"): CvBuilderSection {
  return { id: crypto.randomUUID(), type, title: cvSectionLabelsByLanguage[language][type], visible: true, items: [createItem()] };
}

const sample = (type: CvSectionType, item: Omit<CvBuilderItem, "id">): CvBuilderSection => ({
  ...createSection(type),
  items: [{ id: crypto.randomUUID(), ...item }],
});

export function createDefaultCv(templateId: string | null, user: UserProfile | null): CvBuilderData {
  const resolvedId = resolveTemplateId(templateId);
  if (cvTemplates.find((item) => item.id === resolvedId)?.layout === "table") return createEnterpriseSampleCv(resolvedId, user);
  return {
    templateId: resolvedId,
    accentColor: null,
    theme: defaultCvTheme,
    language: "vi",
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
      sample("experience", { title: "Tên công ty", subtitle: "Vị trí công việc", date: "01/2023 - Hiện tại", description: "<ul><li>Mô tả công việc, thành tựu nổi bật</li></ul>" }),
      sample("projects", { title: "Tên dự án", subtitle: "Vai trò · Công nghệ sử dụng", date: "2024", description: "" }),
      sample("education", { title: "Tên trường", subtitle: "Chuyên ngành", date: "2019 - 2023", description: "" }),
      {
        ...createSection("skills"),
        items: [
          { id: crypto.randomUUID(), title: "Backend", subtitle: "", date: "", description: "Java, Spring Boot, MySQL", level: 5 },
          { id: crypto.randomUUID(), title: "Frontend", subtitle: "", date: "", description: "React, TypeScript, TailwindCSS", level: 3 },
        ],
      },
      sample("languages", { title: "Tiếng Anh", subtitle: "Đọc hiểu tài liệu chuyên ngành", date: "", description: "", level: 3 }),
    ],
  };
}

export function isCvBuilderData(value: unknown): value is CvBuilderData {
  if (!value || typeof value !== "object") return false;
  const data = value as Partial<CvBuilderData>;
  return typeof data.templateId === "string" && !!data.personalInfo && Array.isArray(data.sections);
}
