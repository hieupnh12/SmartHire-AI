const DEMO_MARKER = "[Demo UI]";

export function isDemoAssessmentTitle(title?: string | null): boolean {
  return (title ?? "").includes(DEMO_MARKER);
}

/**
 * Display title for an assessment invitation/paper.
 * - Demo papers keep their demo name.
 * - Legacy "Assessment — Job — HS — timestamp" titles are shortened.
 * - Otherwise use the test title (not the job title of every card).
 */
export function shortAssessmentTitle(jobTitle?: string | null, testTitle?: string | null): string {
  const raw = (testTitle ?? "").trim();
  if (!raw) return cleanJobTitle(jobTitle) || "Bài đánh giá";

  if (isDemoAssessmentTitle(raw)) {
    return raw;
  }

  const legacy =
    /^Assessment\s*[—–-]/i.test(raw) ||
    /\s*[—–-]\s*HS\s*\d+/i.test(raw) ||
    /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(raw);

  if (legacy) {
    let title = raw
      .replace(/^Assessment\s*[—–-]\s*/i, "")
      .replace(/\s*[—–-]\s*HS\s*\d+/gi, "")
      .replace(/\s*[—–-]\s*\d{4}-\d{2}-\d{2}T\d{2}:\d{2}.*$/i, "")
      .trim();
    title = cleanJobTitle(title) || title;
    return title || cleanJobTitle(jobTitle) || raw;
  }

  return cleanJobTitle(raw) || raw;
}

function cleanJobTitle(value?: string | null): string {
  if (!value?.trim()) return "";
  return value.trim().replace(/\s*\([^)]*\)\s*$/, "").trim();
}
