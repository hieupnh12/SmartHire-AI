import { BriefcaseBusiness, CheckCircle2, CircleHelp, GraduationCap, MinusCircle, Sparkles, XCircle } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { MatchBreakdown, RequirementMatch, RequirementStatus } from "@/api/types/cv";

const STATUS_META: Record<RequirementStatus, { label: string; tone: string; icon: typeof CheckCircle2 }> = {
  MATCH: { label: "Khớp", tone: "bg-emerald-50 text-emerald-700", icon: CheckCircle2 },
  PARTIAL: { label: "Một phần", tone: "bg-amber-50 text-amber-700", icon: MinusCircle },
  MISSING: { label: "Thiếu", tone: "bg-red-50 text-red-700", icon: XCircle },
  UNKNOWN: { label: "Không rõ", tone: "bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)]", icon: CircleHelp },
};

function formatScore(value: number | null | undefined) {
  if (value == null) return "—";
  return Number(value).toLocaleString("vi-VN", { maximumFractionDigits: 2 });
}

export function ScreeningBreakdown({
  score,
  modelVersion,
  breakdown,
}: {
  score: number;
  modelVersion?: string | null;
  breakdown: MatchBreakdown | null | undefined;
}) {
  if (!breakdown && score == null) return null;
  const passed = breakdown?.passed === true;
  const threshold = breakdown?.passThreshold;
  const pct = Math.min(Math.max(Number(score ?? 0), 0), 100);
  const missingRequired = breakdown?.requiredMissing ?? [];
  const reason = passed
    ? "Đạt chuẩn CV → chuyển sang vòng phỏng vấn AI."
    : missingRequired.length > 0
      ? `Thiếu kỹ năng bắt buộc: ${missingRequired.join(", ")}.`
      : threshold != null && Number(score) < threshold
        ? `Điểm thấp hơn ngưỡng ${formatScore(threshold)}.`
        : "Chưa đạt điều kiện sàng lọc.";

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Điểm sàng lọc CV</p>
            <p className="mt-1 text-4xl font-bold tracking-tight tabular-nums">
              {formatScore(score)}
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
              title={`Ngưỡng ${formatScore(threshold)}`}
              aria-hidden="true"
            />
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--color-on-surface-variant)]">
          <span>{reason}</span>
          {threshold != null && <span className="tabular-nums">Ngưỡng đạt: {formatScore(threshold)}</span>}
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {modelVersion && <MetaChip>{modelVersion}</MetaChip>}
          {breakdown?.source && <MetaChip>{breakdown.source}</MetaChip>}
          {breakdown?.jaccardSimilarity != null && <MetaChip>Jaccard {formatScore(breakdown.jaccardSimilarity)}</MetaChip>}
        </div>
      </div>

      {breakdown?.verdict && (
        <div className="rounded-2xl bg-[var(--color-primary-subtle)] p-4">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
            Nhận xét của AI
          </div>
          <p className="mt-2 text-sm leading-relaxed text-[var(--color-on-surface)]">{breakdown.verdict}</p>
        </div>
      )}

      <ComponentBars breakdown={breakdown} />

      <FitTiles breakdown={breakdown} />

      <RequirementList title="Khớp yêu cầu" items={breakdown?.matched} />
      <RequirementList title="Khớp một phần" items={breakdown?.partialMatches} />
      <RequirementList title="Thiếu so với yêu cầu" items={breakdown?.missing} />
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

function ComponentBars({ breakdown }: { breakdown: MatchBreakdown | null | undefined }) {
  if (!breakdown?.components || !breakdown.weights) return null;
  const rows = [
    ["Kỹ năng bắt buộc", breakdown.components.required, breakdown.weights.required],
    ["Kỹ năng tùy chọn", breakdown.components.preferred, breakdown.weights.preferred],
    ["Jaccard", breakdown.components.jaccard, breakdown.weights.jaccard],
    ["Kinh nghiệm", breakdown.components.experience, breakdown.weights.experience],
    ["Học vấn", breakdown.components.education, breakdown.weights.education],
    ["Ngữ nghĩa (Gemini)", breakdown.components.semantic, breakdown.weights.semantic],
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
                <span className="font-semibold">{value == null ? "—" : formatScore(value)}</span>
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

function FitTiles({ breakdown }: { breakdown: MatchBreakdown | null | undefined }) {
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

function RequirementList({ title, items }: { title: string; items?: RequirementMatch[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">{title} <span className="font-normal text-[var(--color-on-surface-variant)]">· {items.length}</span></h3>
      <ul className="divide-y divide-[var(--color-surface-container-low)] rounded-2xl border border-[var(--color-border-default)]">
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
                  <span className="text-[11px] text-[var(--color-on-surface-variant)]">{item.matchType}</span>
                )}
              </div>
              {item.evidence && <p className="text-xs leading-relaxed text-[var(--color-on-surface-variant)]">“{item.evidence}”</p>}
              {item.explanation && <p className="text-xs leading-relaxed text-[var(--color-on-surface-variant)]">{item.explanation}</p>}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
