import type { CvBuilderData, CvBuilderItem, CvBuilderSection, CvSectionType } from "@/api/types/cv";
import { t as globalT, type TranslateFn } from "@/i18n";
import { candidateCvVi } from "@/i18n/locales/vi/candidateCv";
import { candidateCvEn } from "@/i18n/locales/en/candidateCv";
import { candidateCvJa } from "@/i18n/locales/ja/candidateCv";

export type ReviewTarget = { kind: "field" | "section" | "item"; id: string };

export type ReviewIssue = {
  id: string;
  level: "error" | "warning";
  message: string;
  target?: ReviewTarget;
};

export type CvReview = {
  score: number;
  issues: ReviewIssue[];
  /** Quantified results (numbers that are not years) across experience and project descriptions. */
  metrics: number;
  years: number | null;
  pageLimit: number;
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const CASUAL_EMAIL = /(cool|boy|girl|baby|cute|kute|love|hot|sexy|vip|angel|dragon|prince|xinh|dethuong|handsome|crazy|devil|lonely|honey|kiss|pinky|bad)/i;
const GITHUB = /^(https?:\/\/)?(www\.)?github\.com\/[A-Za-z0-9-]+(\/\S*)?$/i;
const LINKEDIN = /^(https?:\/\/)?([a-z]{2,3}\.)?linkedin\.com\/in\/[^\s/]+\/?$/i;
const PLACEHOLDER = /\[[^\]\n]{1,15}\]/;
const WEAK_START = /^(tham gia|làm|hỗ trợ|phụ trách|được giao|chịu trách nhiệm|helped|worked on|responsible for|participated|assisted)(?=[\s,.:]|$)/i;
const FIRST_PERSON_VI = /(^|[\s,.;])(tôi|mình)(?=[\s,.;]|$)/i;
const FIRST_PERSON_EN = /(^|\s)(I|I'm|My|my|me)(?=[\s,.;]|$)/;
const PRESENT = /hiện tại|nay|present|now|current|現在/i;

const sampleKeys = [
  "sampleCompany",
  "sampleRole",
  "sampleProject",
  "sampleProjectRole",
  "sampleSchool",
  "sampleExperienceDesc",
] as const;

const SAMPLE_TEXT = new Set(
  [candidateCvVi.defaultCv, candidateCvEn.defaultCv, candidateCvJa.defaultCv].flatMap((catalog) =>
    sampleKeys.map((key) => catalog[key].trim()),
  ),
);

const IMPACT_TYPES = new Set<CvSectionType>(["experience", "projects"]);
const ORDERED_TYPES = new Set<CvSectionType>(["experience", "projects", "education"]);

const decode = (value: string) =>
  value.replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, "\"").replace(/&#39;/g, "'").replace(/&amp;/g, "&");

/** Rich-text HTML → non-empty plain lines (one per list item / paragraph). */
export function textLines(html: string) {
  if (!html) return [];
  return decode(html.replace(/<li[^>]*>/gi, "\n").replace(/<br\s*\/?>|<\/(p|div|li)>/gi, "\n").replace(/<[^>]+>/g, ""))
    .split("\n").map((line) => line.trim()).filter(Boolean);
}

export function countMetrics(text: string) {
  return (text.match(/\d+(?:[.,]\d+)?/g) ?? []).filter((value) => !/^(19|20)\d{2}$/.test(value)).length;
}

type Month = number;

/** Date tokens (MM/YYYY, YYYY-MM, YYYY) in order, as year*12+month. */
function dateTokens(value: string): Month[] {
  const tokens: Month[] = [];
  const pattern = /(\d{1,2})\s*[/.]\s*(\d{4})|(\d{4})-(\d{1,2})(?!\d)|(\d{4})/g;
  for (const match of value.matchAll(pattern)) {
    if (match[1]) tokens.push(Number(match[2]) * 12 + Number(match[1]) - 1);
    else if (match[3]) tokens.push(Number(match[3]) * 12 + Number(match[4]) - 1);
    else tokens.push(Number(match[5]) * 12);
  }
  return tokens;
}

function dateFormat(value: string) {
  if (/\d{1,2}\/\d{4}/.test(value)) return "MM/YYYY";
  if (/\d{4}-\d{1,2}(?!\d)/.test(value)) return "YYYY-MM";
  if (/\d{1,2}[.-]\d{4}/.test(value)) return "MM-YYYY";
  return null;
}

function estimateYears(sections: CvBuilderSection[]): number | null {
  const now = new Date();
  const nowMonth = now.getFullYear() * 12 + now.getMonth();
  let start = Infinity;
  let end = -Infinity;
  for (const section of sections) {
    if (section.type !== "experience") continue;
    for (const item of section.items) {
      const tokens = dateTokens(item.date);
      if (!tokens.length) continue;
      start = Math.min(start, tokens[0]);
      end = Math.max(end, PRESENT.test(item.date) ? nowMonth : tokens[tokens.length - 1]);
    }
  }
  return Number.isFinite(start) ? Math.max(0, (end - start) / 12) : null;
}

const itemName = (item: CvBuilderItem, t: TranslateFn) => item.title.trim() || t("candidate.cv.reviewRules.untitledItem");

export function reviewCv(cv: CvBuilderData, pages: number, t: TranslateFn = globalT): CvReview {
  const issues: ReviewIssue[] = [];
  const add = (level: ReviewIssue["level"], id: string, message: string, target?: ReviewTarget) => issues.push({ id, level, message, target });
  const info = cv.personalInfo;
  const field = (id: string): ReviewTarget => ({ kind: "field", id });

  if (!info.fullName.trim()) add("error", "name", t("candidate.cv.reviewRules.nameMissing"), field("fullName"));

  const email = info.email.trim();
  if (!email) add("error", "email-missing", t("candidate.cv.reviewRules.emailMissing"), field("email"));
  else if (!EMAIL.test(email)) add("error", "email-invalid", t("candidate.cv.reviewRules.emailInvalid"), field("email"));
  else {
    const local = email.split("@")[0];
    if (/\d{3,}/.test(local) || CASUAL_EMAIL.test(local)) {
      add("warning", "email-casual", t("candidate.cv.reviewRules.emailCasual"), field("email"));
    }
  }
  if (!info.phone.trim()) add("warning", "phone", t("candidate.cv.reviewRules.phoneMissing"), field("phone"));

  const github = info.github?.trim() ?? "";
  const linkedin = info.linkedin?.trim() ?? "";
  const website = info.website.trim();
  if (github && !GITHUB.test(github)) add("warning", "github", t("candidate.cv.reviewRules.githubInvalid"), field("github"));
  if (linkedin && !LINKEDIN.test(linkedin)) add("warning", "linkedin", t("candidate.cv.reviewRules.linkedinInvalid"), field("linkedin"));
  if (website && !isUrl(website)) add("warning", "website", t("candidate.cv.reviewRules.websiteInvalid"), field("website"));
  if (!github && !linkedin && !website) add("warning", "links", t("candidate.cv.reviewRules.linksMissing"), field("github"));

  const summary = textLines(info.summary).join(" ");
  if (!summary) add("warning", "summary-missing", t("candidate.cv.reviewRules.summaryMissing"), field("summary"));
  else {
    const sentences = summary.split(/[.!?…]+(?:\s|$)/).filter((part) => part.trim()).length;
    if (sentences > 4) add("warning", "summary-long", t("candidate.cv.reviewRules.summaryLong", { count: sentences }), field("summary"));
    if (FIRST_PERSON_VI.test(summary) || FIRST_PERSON_EN.test(summary)) add("warning", "summary-person", t("candidate.cv.reviewRules.summaryFirstPerson"), field("summary"));
  }

  const visible = cv.sections.filter((section) => section.visible && section.items.some((item) => item.title || item.description));
  const has = (type: CvSectionType) => visible.some((section) => section.type === type);
  if (!has("experience") && !has("projects")) add("error", "no-experience", t("candidate.cv.reviewRules.noExperience"));
  if (!has("skills")) add("warning", "no-skills", t("candidate.cv.reviewRules.noSkills"));
  if (!has("education")) add("warning", "no-education", t("candidate.cv.reviewRules.noEducation"));

  let metrics = 0;
  const formats = new Set<string>();
  for (const section of visible) {
    const starts: number[] = [];
    for (const item of section.items) {
      const target: ReviewTarget = { kind: "item", id: item.id };
      const lines = textLines(item.description);
      const texts = [item.title, item.subtitle, item.date, ...lines];
      if (texts.some((text) => PLACEHOLDER.test(text))) add("error", `placeholder-${item.id}`, t("candidate.cv.reviewRules.placeholderFound", { item: itemName(item, t) }), target);
      if (texts.some((text) => SAMPLE_TEXT.has(text.trim()))) add("error", `sample-${item.id}`, t("candidate.cv.reviewRules.sampleFound", { item: itemName(item, t) }), target);
      const format = dateFormat(item.date);
      if (format) formats.add(format);
      const tokens = dateTokens(item.date);
      if (tokens.length) starts.push(tokens[0]);

      if (!IMPACT_TYPES.has(section.type)) continue;
      const found = countMetrics(lines.join(" "));
      metrics += found;
      if (!lines.length) add("warning", `empty-${item.id}`, t("candidate.cv.reviewRules.itemEmpty", { item: itemName(item, t) }), target);
      else if (lines.length === 1) add("warning", `short-${item.id}`, t("candidate.cv.reviewRules.itemShort", { item: itemName(item, t) }), target);
      else if (lines.length > 7) add("warning", `long-${item.id}`, t("candidate.cv.reviewRules.itemLong", { item: itemName(item, t), count: lines.length }), target);
      if (lines.length && found === 0) add("warning", `impact-${item.id}`, t("candidate.cv.reviewRules.itemNoMetrics", { item: itemName(item, t) }), target);
      if (lines.some((line) => WEAK_START.test(line))) add("warning", `weak-${item.id}`, t("candidate.cv.reviewRules.itemWeakStart", { item: itemName(item, t) }), target);
    }
    if (ORDERED_TYPES.has(section.type) && starts.some((start, index) => index > 0 && start > starts[index - 1])) {
      add("warning", `order-${section.id}`, t("candidate.cv.reviewRules.sectionOrder", { section: section.title }), { kind: "section", id: section.id });
    }
  }
  if (formats.size > 1) add("warning", "date-format", t("candidate.cv.reviewRules.dateFormatMismatch", { formats: [...formats].join(", ") }));

  const years = estimateYears(visible);
  const pageLimit = years !== null && years <= 2 ? 1 : 2;
  if (pages > pageLimit) {
    add(
      "warning",
      "pages",
      pageLimit === 1
        ? t("candidate.cv.reviewRules.pagesOneLimit", { pages })
        : t("candidate.cv.reviewRules.pagesTwoLimit", { pages }),
    );
  }
  const totalText = [summary, ...visible.flatMap((section) => section.items.flatMap((item) => [item.title, ...textLines(item.description)]))].join(" ");
  if (totalText.length < 500) add("warning", "too-short", t("candidate.cv.reviewRules.tooShort"));

  const errors = issues.filter((issue) => issue.level === "error").length;
  const warnings = issues.length - errors;
  return { score: Math.max(0, 100 - errors * 10 - warnings * 4), issues, metrics, years, pageLimit };
}

function isUrl(value: string) {
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return url.hostname.includes(".") && !/\s/.test(value);
  } catch {
    return false;
  }
}
