import { muted } from "@/features/tenant/recruiter/matching/components/rankingUi";
import type { MatchBreakdown, RequirementMatch } from "@/api/types/cv";

const chip = "rounded-full px-2.5 py-0.5 text-xs font-medium";

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
  return (
    <div className="space-y-3">
      <p className="text-sm font-semibold">Đánh giá hybrid so với yêu cầu job</p>
      <p className="font-mono text-2xl">{score}</p>
      <p className={muted}>
        {breakdown?.passed ? "Đạt chuẩn CV → chuyển phỏng vấn AI" : "Chưa đạt ngưỡng sàng lọc"}
        {breakdown?.passThreshold != null ? ` (ngưỡng ${breakdown.passThreshold})` : ""}
      </p>
      <p className={muted}>
        {modelVersion}
        {breakdown?.source ? ` · ${breakdown.source}` : ""}
        {breakdown?.jaccardSimilarity != null ? ` · Jaccard ${breakdown.jaccardSimilarity}` : ""}
      </p>
      {breakdown?.verdict && <p className="text-sm">{breakdown.verdict}</p>}
      <ComponentTable breakdown={breakdown} />
      <ExperienceLine analysis={breakdown?.experienceAnalysis} />
      <RequirementList title="Khớp JD" items={breakdown?.matched} tone="match" />
      <RequirementList title="Khớp một phần" items={breakdown?.partialMatches} tone="partial" />
      <RequirementList title="Thiếu so với JD" items={breakdown?.missing} tone="missing" />
    </div>
  );
}

function ComponentTable({ breakdown }: { breakdown: MatchBreakdown | null | undefined }) {
  if (!breakdown?.components || !breakdown.weights) return null;
  const rows = [
    ["Required skills", breakdown.components.required, breakdown.weights.required],
    ["Preferred skills", breakdown.components.preferred, breakdown.weights.preferred],
    ["Jaccard", breakdown.components.jaccard, breakdown.weights.jaccard],
    ["Experience", breakdown.components.experience, breakdown.weights.experience],
    ["Semantic", breakdown.components.semantic, breakdown.weights.semantic],
  ] as const;
  return (
    <dl className="grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-1 text-sm">
      {rows.map(([label, value, weight]) => (
        <div key={label} className="contents">
          <dt className={muted}>{label}</dt>
          <dd className="font-mono">{value == null ? "—" : value}</dd>
          <dd className={muted}>{weight ? `${weight}%` : "0%"}</dd>
        </div>
      ))}
    </dl>
  );
}

function ExperienceLine({ analysis }: { analysis: MatchBreakdown["experienceAnalysis"] }) {
  if (!analysis || (analysis.requiredYears == null && analysis.candidateYears == null)) return null;
  return (
    <p className="text-sm">
      Kinh nghiệm: {analysis.candidateYears ?? "—"} / {analysis.requiredYears ?? "không yêu cầu"} năm
      {analysis.match ? " · đạt" : " · chưa đạt"}
    </p>
  );
}

function RequirementList({ title, items, tone }: { title: string; items?: RequirementMatch[]; tone: "match" | "partial" | "missing" }) {
  if (!items || items.length === 0) return null;
  const toneClass = tone === "match"
    ? "bg-emerald-50 text-emerald-800"
    : tone === "partial"
      ? "bg-amber-50 text-amber-800"
      : "bg-rose-50 text-rose-800";
  return (
    <div className="space-y-2">
      <p className="text-sm font-semibold">{title}</p>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={`${item.requirement}-${item.status}`} className="text-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-medium">{item.requirement}</span>
              <span className={`${chip} ${toneClass}`}>{item.status}</span>
              {item.matchType && item.matchType !== "NONE" && <span className={muted}>{item.matchType}</span>}
              {item.mandatory && <span className={muted}>bắt buộc</span>}
            </div>
            {item.evidence && <p className={muted}>{item.evidence}</p>}
            {item.explanation && <p className={muted}>{item.explanation}</p>}
          </li>
        ))}
      </ul>
    </div>
  );
}
