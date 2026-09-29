import { COMPETENCY_LABELS, type AiInterviewReport, type AiQuestion, type CompetencyKey } from "@/api/types/aiInterview";

function parse(json: string | null | undefined): AiInterviewReport | null {
  if (!json) return null;
  try { return JSON.parse(json) as AiInterviewReport; } catch { return null; }
}

export function AiInterviewReportView({ reportJson, questions }: { reportJson: string | null | undefined; questions: AiQuestion[] }) {
  const report = parse(reportJson);
  if (!report) return null;
  const questionNumber = new Map(questions.map((q, index) => [q.id, index + 1]));
  return <section className="space-y-4 rounded-2xl border border-[var(--color-border-default)] p-4" aria-labelledby="ai-report-title">
    <div className="flex flex-wrap items-baseline justify-between gap-2">
      <h3 id="ai-report-title" className="font-semibold">Báo cáo AI Interview</h3>
      <p className="text-sm">Điểm tổng <strong className="text-lg">{report.overallScore}/100</strong>{report.miniAssessmentScore != null ? ` · Mini Assessment ${report.miniAssessmentScore}/100` : ""}</p>
    </div>
    <div className="space-y-2">
      <h4 className="text-sm font-medium">Điểm theo nhóm năng lực</h4>
      <ul className="space-y-2">{(Object.entries(report.competencies) as [CompetencyKey, number][]).map(([key, score]) => <li key={key} className="space-y-1 text-sm">
        <div className="flex justify-between gap-3"><span>{COMPETENCY_LABELS[key] ?? key}{report.weights?.[key] != null ? ` (${report.weights[key]}%)` : ""}</span><span className="font-semibold tabular-nums">{score}/100</span></div>
        <div className="h-2 rounded-full bg-[var(--color-surface-container)]" aria-hidden="true"><div className="h-2 rounded-full bg-brand-primary" style={{ width: `${Math.min(100, Math.max(0, score))}%` }} /></div>
      </li>)}</ul>
    </div>
    {Object.keys(report.skills).length > 0 && <div className="space-y-2">
      <h4 className="text-sm font-medium">Điểm theo Job Skill <span className="font-normal text-[var(--color-on-surface-variant)]">(tham khảo, không cộng vào điểm tổng)</span></h4>
      <ul className="divide-y divide-[var(--color-border-default)] text-sm">{Object.entries(report.skills).map(([skill, entry]) => {
        const evidence = (entry.questionIds ?? []).map(id => questionNumber.get(id)).filter((n): n is number => n != null);
        return <li key={skill} className="flex flex-wrap items-start justify-between gap-2 py-2">
          <div className="min-w-0"><p className="font-medium">{skill}</p>
            <p className="text-xs text-[var(--color-on-surface-variant)]">{evidence.length ? `Bằng chứng: câu ${evidence.join(", ")}` : "Không có câu hỏi kiểm tra"}{entry.miniAssessmentTested ? " · có Mini Assessment" : " · chưa được kiểm tra bằng trắc nghiệm"}</p></div>
          <span className="shrink-0 font-semibold tabular-nums">{entry.score == null ? "Chưa đủ dữ liệu" : `${entry.score}/100`}</span>
        </li>;
      })}</ul>
    </div>}
  </section>;
}
