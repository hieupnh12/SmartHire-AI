import { AlertTriangle, BriefcaseBusiness, CheckCircle2, ChevronDown, CircleHelp, GraduationCap, Lightbulb, MessageCircleQuestion, MinusCircle, Sparkles, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { MatchBreakdown, RequirementMatch, RequirementStatus, SkillView } from "@/api/types/cv";

const MATCH_TYPE_LABEL: Record<string, string> = {
  BOTH: "Danh mục và ngữ nghĩa",
  TAXONOMY: "Danh mục kỹ năng",
  SEMANTIC: "Ngữ nghĩa",
};

const SOURCE_LABEL: Record<string, string> = {
  hybrid: "Kết hợp",
  heuristic: "Quy tắc",
};

const MODEL_LABEL: Record<string, string> = {
  "heuristic-screen": "Sàng lọc quy tắc",
  "hybrid-v1": "Sàng lọc kết hợp",
  "heuristic-v1": "Trích xuất quy tắc",
};

function screeningCopy(value: string) {
  const missing = /^No (.+) experience found in the CV\.$/.exec(value);
  if (missing) return `Không thấy ${missing[1]} trong CV.`;
  const exact = /^Normalized CV skill matches (.+)\.$/.exec(value);
  if (exact) return `Kỹ năng trên CV khớp với ${exact[1]}.`;
  const normalized = value
    .replace("Job chưa có skill yêu cầu để sàng lọc.", "Tin tuyển dụng chưa có kỹ năng yêu cầu để sàng lọc.")
    .replace(" skill yêu cầu", " kỹ năng yêu cầu")
    .replace("không thiếu skill bắt buộc", "không thiếu kỹ năng bắt buộc")
    .replace("; thiếu: ", "; thiếu kỹ năng bắt buộc: ")
    .replace(/ Điểm hybrid \(taxonomy \+ Jaccard \+ semantic\), không phải điểm Matching sau assessment\/interview\./, "");
  return normalized.replace(/thiếu kỹ năng bắt buộc:\s*\[([^\]]+)\]/g, (_all, inner: string) => {
    const cleaned = inner
      .split(",")
      .map((s) => s.trim().replace(/^"(.*)"$/, "$1"))
      .filter(Boolean)
      .join(", ");
    return `thiếu kỹ năng bắt buộc: ${cleaned}`;
  });
}

const STATUS_META: Record<RequirementStatus, { label: string; tone: string; icon: typeof CheckCircle2 }> = {
  MATCH: { label: "Khớp", tone: "bg-emerald-50 text-emerald-700", icon: CheckCircle2 },
  PARTIAL: { label: "Một phần", tone: "bg-amber-50 text-amber-700", icon: MinusCircle },
  MISSING: { label: "Thiếu", tone: "bg-red-50 text-red-700", icon: XCircle },
  UNKNOWN: { label: "Không rõ", tone: "bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)]", icon: CircleHelp },
};

function summarizeList(items: string[], maxVisible: number) {
  if (items.length <= maxVisible) return items.join(", ");
  return `${items.slice(0, maxVisible).join(", ")} và ${items.length - maxVisible} mục khác`;
}

function asArray(value: unknown): Array<Record<string, unknown>> {
  return Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object") : [];
}

function firstString(obj: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const val = obj[key];
    if (typeof val === "string" && val.trim()) return val.trim();
  }
  return "";
}

function localVerdict(breakdown: MatchBreakdown) {
  const matched = (breakdown.matched ?? []).length;
  const partial = (breakdown.partialMatches ?? []).length;
  const missing = (breakdown.missing ?? []).length;
  const total = matched + partial + missing;
  const reqMissing = breakdown.requiredMissing ?? [];
  const summary = total > 0 ? `Đối chiếu ${matched}/${total} kỹ năng theo yêu cầu công việc` : "Đã hoàn tất đối chiếu tiêu chí công việc trên CV";
  if (reqMissing.length > 0) {
    return `${summary}; còn thiếu kỹ năng bắt buộc: ${summarizeList(reqMissing, 6)}.`;
  }
  if (breakdown.passed) {
    return `${summary}; hồ sơ đáp ứng các điều kiện sàng lọc cơ bản.`;
  }
  return `${summary}; mức độ phù hợp hiện chưa đạt ngưỡng chuẩn của vị trí.`;
}

function localStrengths(
  breakdown: MatchBreakdown,
  extraction?: Record<string, unknown> | null,
  skills?: SkillView[],
) {
  const bullets: string[] = [];
  const push = (text: string) => {
    const cleaned = text.trim();
    if (cleaned && !bullets.includes(cleaned) && bullets.length < 4) bullets.push(cleaned);
  };

  const matched = (breakdown.matched ?? []).map((item) => item.requirement).filter(Boolean);
  const partial = (breakdown.partialMatches ?? []).map((item) => item.requirement).filter(Boolean);
  if (matched.length > 0) {
    push(`Đáp ứng các kỹ năng chuyên môn theo yêu cầu công việc: ${summarizeList(matched, 5)}.`);
  } else if (partial.length > 0) {
    push(`Có nền tảng kiến thức liên quan tới một số kỹ năng của vị trí: ${summarizeList(partial, 4)}.`);
  }

  const roles = asArray(extraction?.experience)
    .map((row) => {
      const title = firstString(row, ["title", "role", "position"]);
      const company = firstString(row, ["company", "organization"]);
      if (title && company) return `${title} tại ${company}`;
      return title || company;
    })
    .filter(Boolean)
    .slice(0, 2);
  const years = breakdown.experienceAnalysis?.candidateYears;
  if (years != null && years > 0 && roles.length > 0) {
    push(`Tích lũy khoảng ${years} năm kinh nghiệm thực tế (từng đảm nhiệm ${roles.join(", ")}).`);
  } else if (years != null && years > 0) {
    push(`Ghi nhận khoảng ${years} năm kinh nghiệm làm việc trong hồ sơ.`);
  } else if (roles.length > 0) {
    push(`Có kinh nghiệm thực tế ở vị trí ${roles.join(", ")}.`);
  }

  const projects = asArray(extraction?.projects)
    .map((row) => firstString(row, ["name", "title"]))
    .filter(Boolean)
    .slice(0, 2);
  if (projects.length > 0) {
    push(`Đã tham gia triển khai dự án thực tế: ${projects.join(", ")}.`);
  }

  const eduRows = asArray(extraction?.education);
  const degree = (eduRows[0] ? firstString(eduRows[0], ["degree", "level", "major", "name"]) : "") || (breakdown.educationAnalysis?.candidateLevel ?? "");
  const school = eduRows[0] ? firstString(eduRows[0], ["school", "institution", "university"]) : "";
  if (degree && school) {
    push(`Nền tảng học vấn: ${degree} (${school}).`);
  } else if (degree) {
    push(`Trình độ học vấn ghi nhận trên CV: ${degree}.`);
  } else if (school) {
    push(`Từng theo học tại ${school}.`);
  }

  const certs = asArray(extraction?.certifications)
    .map((row) => firstString(row, ["name", "title"]))
    .filter(Boolean)
    .slice(0, 2);
  if (certs.length > 0) {
    push(`Sở hữu chứng chỉ chuyên môn bổ trợ: ${certs.join(", ")}.`);
  }

  if (bullets.length < 2 && skills && skills.length > 0) {
    const cvSkills = Array.from(new Set(skills.map((s) => s.skillName?.trim()).filter(Boolean)));
    if (cvSkills.length > 0) {
      push(`Sở hữu nhóm kỹ năng ghi nhận trên hồ sơ gồm: ${summarizeList(cvSkills, 5)}.`);
    }
  }
  if (bullets.length < 2) {
    push("Hồ sơ đã hoàn tất bóc tách cấu trúc và đối chiếu trực tiếp với bộ tiêu chí của vị trí.");
  }
  if (bullets.length < 2) {
    push("Có thông tin cơ sở để đánh giá thêm sự phù hợp và tiềm năng phát triển từ file CV gốc.");
  }
  return bullets;
}

function localRisks(breakdown: MatchBreakdown) {
  const bullets: string[] = [];
  const push = (text: string) => {
    const cleaned = text.trim();
    if (cleaned && !bullets.includes(cleaned) && bullets.length < 4) bullets.push(cleaned);
  };

  const reqMissing = breakdown.requiredMissing ?? [];
  if (reqMissing.length > 0) {
    push(`Thiếu kỹ năng bắt buộc theo yêu cầu vị trí: ${summarizeList(reqMissing, 6)}.`);
  }

  const exp = breakdown.experienceAnalysis;
  if (exp?.requiredYears != null && exp.requiredYears > 0) {
    if (exp.candidateYears == null) {
      push(`CV chưa thể hiện rõ số năm kinh nghiệm thực tế để đối chiếu mức tối thiểu (${exp.requiredYears} năm).`);
    } else if (exp.candidateYears < exp.requiredYears) {
      push(`Kinh nghiệm ghi nhận (${exp.candidateYears} năm) chưa đáp ứng ngưỡng tối thiểu (${exp.requiredYears} năm) của vị trí.`);
    }
  }

  const partial = (breakdown.partialMatches ?? []).map((item) => item.requirement).filter(Boolean);
  const optionalMissing = (breakdown.missing ?? [])
    .filter((item) => !item.mandatory && item.requirement)
    .map((item) => item.requirement);
  if (partial.length > 0) {
    push(`Cần kiểm chứng chiều sâu thực tế đối với các kỹ năng khớp một phần: ${summarizeList(partial, 5)}.`);
  } else if (optionalMissing.length > 0) {
    push(`Chưa có minh chứng rõ ràng với một số kỹ năng cộng thêm trong JD: ${summarizeList(optionalMissing, 5)}.`);
  }

  const edu = breakdown.educationAnalysis;
  if (edu?.requiredLevel && edu.match === false) {
    push(`Thông tin học vấn trên CV chưa thể hiện rõ hoặc chưa đạt chuẩn yêu cầu (${edu.requiredLevel}).`);
  }

  if (bullets.length < 2) {
    push("Cần xác minh mức độ đóng góp cá nhân và quy mô thực tế của các dự án nêu trên CV.");
  }
  if (bullets.length < 2) {
    push("Nên kiểm chứng khả năng áp dụng thực chiến qua câu hỏi tình huống kỹ thuật hoặc bài kiểm tra chuyên môn.");
  }
  return bullets;
}

function localAdvice(breakdown: MatchBreakdown) {
  const missing = breakdown.requiredMissing ?? [];
  const partial = (breakdown.partialMatches ?? []).map((item) => item.requirement).filter(Boolean);
  const matched = (breakdown.matched ?? []).map((item) => item.requirement).filter(Boolean);
  const exp = breakdown.experienceAnalysis;
  const parts: string[] = [];
  if (missing.length > 0) {
    parts.push(`Cần làm rõ hoặc kiểm tra thêm các kỹ năng bắt buộc còn thiếu: ${missing.join(", ")}.`);
  }
  if (partial.length > 0) {
    parts.push(`Các kỹ năng khớp một phần (${partial.join(", ")}) nên được hỏi sâu tình huống thực tế ở vòng phỏng vấn.`);
  }
  if (exp?.requiredYears != null && exp.candidateYears != null && exp.candidateYears < exp.requiredYears) {
    parts.push(`Kinh nghiệm hiện tại (${exp.candidateYears} năm) thấp hơn mức yêu cầu (${exp.requiredYears} năm), cần đánh giá thêm độ phức tạp dự án đã làm.`);
  }
  if (breakdown.passed) {
    const focus = matched.length > 0 ? ` tập trung vào ${matched.slice(0, 4).join(", ")}` : "";
    parts.push(`Hồ sơ đạt sàng lọc. Nên chuyển sang phỏng vấn AI và kiểm tra mức độ làm việc thực tế${focus}.`);
  } else if (missing.length > 0) {
    parts.push("Chưa nên cho qua vòng CV cho đến khi xác nhận được các kỹ năng bắt buộc còn thiếu.");
  } else if (breakdown.passed === false) {
    parts.push("Hồ sơ chưa đạt ngưỡng. Chỉ nên cân nhắc nếu ứng viên có dự án nổi bật bù đắp cho phần điểm còn thiếu.");
  }
  return parts.join(" ");
}

export function formatScreeningScore(value: number | null | undefined) {
  if (value == null) return "—";
  return Number(value).toLocaleString("vi-VN", { maximumFractionDigits: 2 });
}

export function ScreeningScoreCard({
  score,
  modelVersion,
  breakdown,
}: {
  score: number;
  modelVersion?: string | null;
  breakdown: MatchBreakdown | null | undefined;
}) {
  const passed = breakdown?.passed === true;
  const threshold = breakdown?.passThreshold;
  const pct = Math.min(Math.max(Number(score ?? 0), 0), 100);
  const missingRequired = breakdown?.requiredMissing ?? [];
  const reason = passed
    ? "Đạt chuẩn CV → chuyển sang vòng phỏng vấn AI."
    : missingRequired.length > 0
      ? `Thiếu kỹ năng bắt buộc: ${missingRequired.join(", ")}.`
      : threshold != null && Number(score) < threshold
        ? `Điểm thấp hơn ngưỡng ${formatScreeningScore(threshold)}.`
        : "Chưa đạt điều kiện sàng lọc.";

  return (
    <div className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Điểm sàng lọc CV</p>
          <p className="mt-1 text-4xl font-bold tracking-tight tabular-nums">
            {formatScreeningScore(score)}
            <span className="text-base font-normal text-[var(--color-on-surface-variant)]"> /100</span>
          </p>
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1.5 self-start rounded-full px-3 py-1 text-xs font-semibold",
            passed ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700",
          )}
        >
          {passed ? <CheckCircle2 className="size-4" aria-hidden="true" /> : <XCircle className="size-4" aria-hidden="true" />}
          {passed ? "Đạt" : "Chưa đạt"}
        </span>
      </div>

      <div className="relative mt-4 h-2.5 w-full overflow-visible rounded-full bg-[var(--color-surface-container-high)]">
        <div className="h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${pct}%` }} />
        {threshold != null && (
          <div
            className="absolute -top-1 h-[18px] w-0.5 -translate-x-1/2 rounded-full bg-[var(--color-on-surface)]"
            style={{ left: `${Math.min(Math.max(threshold, 0), 100)}%` }}
            title={`Ngưỡng ${formatScreeningScore(threshold)}`}
            aria-hidden="true"
          />
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--color-on-surface-variant)]">
        <span>{reason}</span>
        {threshold != null && <span className="tabular-nums">Ngưỡng đạt: {formatScreeningScore(threshold)}</span>}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {modelVersion && <MetaChip>{MODEL_LABEL[modelVersion] ?? modelVersion}</MetaChip>}
        {breakdown?.source && <MetaChip>{SOURCE_LABEL[breakdown.source] ?? breakdown.source}</MetaChip>}
        {breakdown?.jaccardSimilarity != null && <MetaChip>Trùng khớp kỹ năng {formatScreeningScore(breakdown.jaccardSimilarity)}</MetaChip>}
      </div>
    </div>
  );
}

export function ScreeningAiPanel({
  breakdown,
  extraction,
  skills,
}: {
  breakdown: MatchBreakdown | null | undefined;
  extraction?: Record<string, unknown> | null;
  skills?: SkillView[];
}) {
  if (!breakdown) return null;
  const verdictText = breakdown.verdict?.trim() ? screeningCopy(breakdown.verdict.trim()) : localVerdict(breakdown);
  const serverStrengths = (breakdown.strengths ?? []).map((item) => item.trim()).filter(Boolean);
  const serverRisks = (breakdown.risks ?? []).map((item) => item.trim()).filter(Boolean);
  const strengths = serverStrengths.length > 0 ? serverStrengths : localStrengths(breakdown, extraction, skills);
  const risks = serverRisks.length > 0 ? serverRisks : localRisks(breakdown);
  const deepAi = breakdown.decisionSource !== "formula" && serverStrengths.length > 0 && serverRisks.length > 0;

  return (
    <div className="space-y-4">
      <div className="space-y-3 rounded-2xl bg-[var(--color-primary-subtle)] p-4 sm:p-5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
            Nhận xét của AI
          </div>
          <span className="rounded-full bg-white/80 px-2.5 py-0.5 text-[11px] font-medium text-[var(--color-primary)]">
            {deepAi ? "Đánh giá chuyên sâu" : "Đánh giá tổng hợp"}
          </span>
        </div>
        <p className="text-sm leading-relaxed text-[var(--color-on-surface)]">{verdictText}</p>

        <div className="grid gap-3 border-t border-[var(--color-primary)]/15 pt-3 sm:grid-cols-2">
          <div className="space-y-1.5">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
              <CheckCircle2 className="size-3.5 shrink-0 text-emerald-600" aria-hidden="true" />
              Điểm mạnh nổi bật
            </p>
            <ul className="space-y-1 text-xs leading-relaxed text-[var(--color-on-surface)]">
              {strengths.map((item, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-emerald-600" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-1.5">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
              <AlertTriangle className="size-3.5 shrink-0 text-amber-600" aria-hidden="true" />
              Rủi ro / Cần kiểm chứng
            </p>
            <ul className="space-y-1 text-xs leading-relaxed text-[var(--color-on-surface)]">
              {risks.map((item, idx) => (
                <li key={idx} className="flex items-start gap-1.5">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber-600" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
      <AdviceBlock breakdown={breakdown} />
    </div>
  );
}

export function ScreeningBreakdown({
  score,
  modelVersion,
  breakdown,
  wide = false,
  extraction,
  skills,
}: {
  score: number;
  modelVersion?: string | null;
  breakdown: MatchBreakdown | null | undefined;
  wide?: boolean;
  extraction?: Record<string, unknown> | null;
  skills?: SkillView[];
}) {
  if (!breakdown && score == null) return null;
  const pair = wide ? "grid items-start gap-5 lg:grid-cols-2" : "space-y-5";
  return (
    <div className="space-y-5">
      <div className={pair}>
        <ScreeningScoreCard score={score} modelVersion={modelVersion} breakdown={breakdown} />
        <ScreeningAiPanel breakdown={breakdown} extraction={extraction} skills={skills} />
      </div>

      <ComponentBars breakdown={breakdown} />
      <FitTiles breakdown={breakdown} />

      <RequirementGroups
        wide={wide}
        groups={[
          { title: "Khớp yêu cầu", items: breakdown?.matched },
          { title: "Khớp một phần", items: breakdown?.partialMatches },
          { title: "Thiếu so với yêu cầu", items: breakdown?.missing },
        ]}
      />
    </div>
  );
}

function AdviceBlock({ breakdown }: { breakdown: MatchBreakdown }) {
  const stored = breakdown.advice?.trim() ?? "";
  const text = stored ? screeningCopy(stored) : localAdvice(breakdown);
  const questions = breakdown.interviewQuestions ?? [];
  if (!text && questions.length === 0) return null;
  return (
    <div className="space-y-3 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-4">
      <div className="flex items-center gap-2 text-sm font-semibold">
        <Lightbulb className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
        {stored ? "Lời khuyên của AI" : "Gợi ý xử lý"}
      </div>
      {text && <p className="text-sm leading-relaxed text-[var(--color-on-surface)]">{text}</p>}
      {questions.length > 0 && (
        <div className="space-y-1.5 border-t border-[var(--color-border-default)]/70 pt-3">
          <p className="flex items-center gap-1.5 text-xs font-semibold text-[var(--color-on-surface-variant)]">
            <MessageCircleQuestion className="size-3.5 text-[var(--color-primary)]" aria-hidden="true" />
            Gợi ý câu hỏi phỏng vấn kiểm chứng
          </p>
          <ol className="list-decimal space-y-1 pl-4 text-xs leading-relaxed text-[var(--color-on-surface)]">
            {questions.map((q, idx) => (
              <li key={idx}>{q}</li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

function MetaChip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full bg-[var(--color-surface-container-low)] px-2.5 py-0.5 text-[11px] font-medium text-[var(--color-on-surface-variant)]">
      {children}
    </span>
  );
}

export function ComponentBars({ breakdown }: { breakdown: MatchBreakdown | null | undefined }) {
  if (!breakdown?.components || !breakdown.weights) return null;
  const rows = [
    ["Kỹ năng bắt buộc", breakdown.components.required, breakdown.weights.required],
    ["Kỹ năng tùy chọn", breakdown.components.preferred, breakdown.weights.preferred],
    ["Độ trùng khớp kỹ năng", breakdown.components.jaccard, breakdown.weights.jaccard],
    ["Kinh nghiệm", breakdown.components.experience, breakdown.weights.experience],
    ["Học vấn", breakdown.components.education, breakdown.weights.education],
    ["Ngữ nghĩa", breakdown.components.semantic, breakdown.weights.semantic],
  ] as const;
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Thành phần điểm</h3>
      <ul className="space-y-3">
        {rows.map(([label, value, weight]) => {
          const active = Boolean(weight);
          const pct = Math.min(Math.max(Number(value ?? 0), 0), 100);
          return (
            <li key={label} className={cn("grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1.5", !active && "opacity-60")}>
              <span className="text-sm">{label}</span>
              <span className="flex items-center gap-2 text-xs tabular-nums">
                <span className="font-semibold">{value == null ? "—" : formatScreeningScore(value)}</span>
                <span className="rounded-full bg-[var(--color-surface-container-low)] px-2 py-0.5 text-[var(--color-on-surface-variant)]">
                  {active ? `${weight}%` : "Không tính"}
                </span>
              </span>
              <div className="col-span-2 h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-container)]">
                <div className="h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${value == null ? 0 : pct}%` }} />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function FitTiles({ breakdown }: { breakdown: MatchBreakdown | null | undefined }) {
  const experience = breakdown?.experienceAnalysis;
  const education = breakdown?.educationAnalysis;
  const showExperience = experience && (experience.requiredYears != null || experience.candidateYears != null);
  const showEducation = education && (education.requiredLevel != null || education.candidateLevel != null);
  if (!showExperience && !showEducation) return null;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {showExperience && (
        <FitTile
          icon={BriefcaseBusiness}
          label="Kinh nghiệm"
          value={`${experience.candidateYears ?? "—"} năm`}
          requirement={experience.requiredYears == null ? "Không yêu cầu" : `Yêu cầu ${experience.requiredYears} năm`}
          match={experience.match}
        />
      )}
      {showEducation && (
        <FitTile
          icon={GraduationCap}
          label="Học vấn"
          value={education.candidateLevel ?? "—"}
          requirement={education.requiredLevel ?? "Không yêu cầu"}
          match={education.match}
        />
      )}
    </div>
  );
}

function FitTile({ icon: Icon, label, value, requirement, match }: {
  icon: typeof GraduationCap;
  label: string;
  value: string;
  requirement: string;
  match?: boolean;
}) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-[var(--color-surface-container-low)] p-4">
      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[var(--color-surface-card)] text-[var(--color-primary)]">
        <Icon className="size-4" aria-hidden="true" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-[var(--color-on-surface-variant)]">{label}</p>
        <p className="truncate text-sm font-semibold">{value}</p>
        <p className="text-xs text-[var(--color-on-surface-variant)]">{requirement}</p>
      </div>
      <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", match ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>
        {match ? <CheckCircle2 className="size-3.5" aria-hidden="true" /> : <XCircle className="size-3.5" aria-hidden="true" />}
        {match ? "Đạt" : "Chưa đạt"}
      </span>
    </div>
  );
}

export function RequirementGroups({ wide, groups }: { wide: boolean; groups: Array<{ title: string; items?: RequirementMatch[] }> }) {
  const visible = groups.filter((group) => group.items && group.items.length > 0);
  if (visible.length === 0) return null;
  const columns = !wide || visible.length === 1
    ? "grid-cols-1"
    : visible.length === 2
      ? "lg:grid-cols-2"
      : "lg:grid-cols-3";
  return (
    <div className={cn("grid items-start gap-4", columns)}>
      {visible.map((group) => (
        <RequirementList key={group.title} title={group.title} items={group.items ?? []} />
      ))}
    </div>
  );
}

function RequirementList({ title, items }: { title: string; items: RequirementMatch[] }) {
  return (
    <details className="group rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)]">
      <summary className="cursor-pointer list-none px-4 py-3 [&::-webkit-details-marker]:hidden">
        <span className="flex items-center justify-between gap-3">
          <span className="text-sm font-semibold">
            {title} <span className="font-normal text-[var(--color-on-surface-variant)]">· {items.length}</span>
          </span>
          <span className="inline-flex shrink-0 items-center gap-1 text-xs font-medium text-[var(--color-on-surface-variant)]">
            <span className="group-open:hidden">Xem chi tiết</span>
            <span className="hidden group-open:inline">Thu gọn</span>
            <ChevronDown className="size-4 transition-transform group-open:rotate-180" aria-hidden="true" />
          </span>
        </span>
        <span className="mt-3 flex flex-wrap gap-1.5 group-open:hidden">
          {items.map((item) => (
            <span key={`${item.requirement}-${item.status}`} className="rounded-full bg-[var(--color-surface-container-low)] px-2.5 py-1 text-xs font-medium">
              {item.requirement}
            </span>
          ))}
        </span>
      </summary>
      <ul className="max-h-72 divide-y divide-[var(--color-surface-container-low)] overflow-y-auto overscroll-contain border-t border-[var(--color-border-default)]">
        {items.map((item) => {
          const meta = STATUS_META[item.status] ?? STATUS_META.UNKNOWN;
          const Icon = meta.icon;
          return (
            <li key={`${item.requirement}-${item.status}`} className="space-y-1 px-4 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-medium">{item.requirement}</span>
                <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", meta.tone)}>
                  <Icon className="size-3.5" aria-hidden="true" />
                  {meta.label}
                </span>
                {item.mandatory && (
                  <span className="rounded-full bg-[var(--color-primary-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-primary-hover)]">Bắt buộc</span>
                )}
                {item.matchType && item.matchType !== "NONE" && (
                  <span className="text-[11px] text-[var(--color-on-surface-variant)]">{MATCH_TYPE_LABEL[item.matchType] ?? item.matchType}</span>
                )}
              </div>
              {item.evidence && <p className="text-xs leading-relaxed text-[var(--color-on-surface-variant)]">“{screeningCopy(item.evidence)}”</p>}
              {item.explanation && <p className="text-xs leading-relaxed text-[var(--color-on-surface-variant)]">{screeningCopy(item.explanation)}</p>}
            </li>
          );
        })}
      </ul>
    </details>
  );
}
