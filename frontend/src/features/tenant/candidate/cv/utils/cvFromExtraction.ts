import type { CvBuilderData, CvBuilderItem, CvBuilderSection, CvDetail, CvSectionType } from "@/api/types/cv";
import type { UserProfile } from "@/features/tenant/auth/types";
import { createDefaultCv, createSection } from "./createDefaultCv";

type Row = Record<string, unknown>;

const MAX_SKILLS = 30;

const asRows = (value: unknown): Row[] =>
  Array.isArray(value)
    ? value.map((entry) => (typeof entry === "string" ? { name: entry } : entry && typeof entry === "object" ? (entry as Row) : {}))
    : [];

function pick(row: Row, ...keys: string[]) {
  for (const key of keys) {
    const value = row[key];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
}

const clip = (value: string, max: number) => (value.length > max ? value.slice(0, max) : value);

const escapeHtml = (value: string) =>
  value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const isoMonth = (value: string) => {
  const match = /^(\d{4})-(\d{2})/.exec(value);
  return match ? `${match[2]}/${match[1]}` : value;
};

function dateRange(row: Row) {
  const start = isoMonth(pick(row, "startDate", "start", "from"));
  const current = row.current === true || /^(present|current|now)$/i.test(pick(row, "endDate"));
  const end = current ? "Hiện tại" : isoMonth(pick(row, "endDate", "end", "to"));
  if (start && end) return `${start} - ${end}`;
  return start || end || pick(row, "date", "year");
}

function item(title: string, subtitle: string, date: string, description: string): CvBuilderItem {
  return {
    id: crypto.randomUUID(),
    title: clip(title, 200),
    subtitle: clip(subtitle, 200),
    date: clip(date, 80),
    description: description ? clip(`<p>${escapeHtml(description)}</p>`, 5000) : "",
    level: 0,
  };
}

function section(type: CvSectionType, items: CvBuilderItem[]): CvBuilderSection[] {
  const filled = items.filter((entry) => entry.title || entry.subtitle || entry.description).slice(0, 50);
  return filled.length ? [{ ...createSection(type), items: filled }] : [];
}

/** Builds an editable CV from the AI extraction of an uploaded CV. Missing fields stay empty. */
export function cvFromExtraction(detail: CvDetail, user: UserProfile | null): CvBuilderData {
  const extraction = (detail.extraction ?? {}) as Row;
  const contact = (extraction.contact && typeof extraction.contact === "object" ? extraction.contact : {}) as Row;
  const base = createDefaultCv(null, user);

  const skillNames = detail.skills.length
    ? detail.skills.map((skill) => skill.canonicalName || skill.skillName)
    : asRows(extraction.skills).map((row) => pick(row, "name"));
  const uniqueSkills = [...new Set(skillNames.filter(Boolean))].slice(0, MAX_SKILLS);

  return {
    ...base,
    personalInfo: {
      ...base.personalInfo,
      fullName: clip(pick(contact, "name") || base.personalInfo.fullName, 120),
      email: clip(pick(contact, "email") || base.personalInfo.email, 160),
      phone: clip(pick(contact, "phone") || base.personalInfo.phone, 40),
    },
    sections: [
      ...section("experience", asRows(extraction.experience).map((row) =>
        item(pick(row, "company", "organization", "employer") || pick(row, "title", "position", "role"),
          pick(row, "company", "organization", "employer") ? pick(row, "title", "position", "role") : "",
          dateRange(row), pick(row, "description", "evidence")))),
      ...section("projects", asRows(extraction.projects).map((row) =>
        item(pick(row, "name", "title"), pick(row, "role"), dateRange(row), pick(row, "description")))),
      ...section("education", asRows(extraction.education).map((row) =>
        item(pick(row, "school", "institution", "university") || pick(row, "degree", "name"),
          pick(row, "school", "institution", "university") ? pick(row, "degree", "major", "field") : pick(row, "major", "field"),
          dateRange(row), ""))),
      ...section("skills", uniqueSkills.map((name) => item(name, "", "", ""))),
      ...section("languages", asRows(extraction.languages).map((row) => item(pick(row, "name", "language"), pick(row, "level"), "", ""))),
      ...section("certifications", asRows(extraction.certifications).map((row) =>
        item(pick(row, "name", "title"), pick(row, "issuer", "organization"), pick(row, "date", "year"), ""))),
    ],
  };
}
