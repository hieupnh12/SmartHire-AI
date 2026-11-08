import { CheckCircle2, AlertTriangle, FileCheck2 } from "lucide-react";
import { AVAILABLE_INTERVIEW_PROCESS } from "../utils/interviewProcessSettings";
import { COMPETENCY_LABELS, type AiInterviewReport, type AiQuestion, type CompetencyKey } from "@/api/types/aiInterview";

function parse(json: string | null | undefined): AiInterviewReport | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as AiInterviewReport;
  } catch {
    return null;
  }
}

export function AiInterviewReportView({ reportJson, questions }: { reportJson: string | null | undefined; questions: AiQuestion[] }) {
  const report = parse(reportJson);
  if (!report) return null;

  const visibleSkills = Object.entries(report.skills).filter(([, entry]) =>
    entry.questionIds?.some((id) => questions.some((question) => question.id === id))
  );
  const questionNumber = new Map(questions.map((q, index) => [q.id, index + 1]));

  return (
    <section className="space-y-5 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900 sm:p-6" aria-labelledby="ai-report-title">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-[#0066FF] border border-blue-100 dark:bg-blue-950 dark:text-blue-300 shadow-2xs">
            <FileCheck2 className="size-4.5" aria-hidden="true" />
          </div>
          <div>
            <h3 id="ai-report-title" className="text-base font-bold text-slate-900 dark:text-slate-100">
              Báo cáo đánh giá AI Interview
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Tổng hợp điểm năng lực, phản hồi chi tiết và bằng chứng trích xuất từ câu trả lời.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-full bg-blue-50 border border-blue-200/60 px-3 py-1 text-xs font-semibold text-[#0066FF] dark:bg-blue-950 dark:text-blue-300">
            Điểm tổng: <strong className="text-sm font-extrabold">{report.overallScore}/100</strong>
          </span>
        </div>
      </div>

      {/* Criteria Breakdown */}
      {report.evaluationMode !== "POST_SESSION" && report.communicationCriteria && Object.keys(report.communicationCriteria).length > 0 && (
        <div className="space-y-2.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Tiêu chí nội dung trong Communication
          </h4>
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {Object.entries(report.communicationCriteria).map(([key, score]) => (
              <li
                key={key}
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/70 bg-slate-50/60 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/40"
              >
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  {{
                    TECHNICAL_KNOWLEDGE: "Kiến thức chuyên môn",
                    PROBLEM_SOLVING: "Giải quyết vấn đề",
                    REASONING: "Lập luận",
                    COMMUNICATION: "Kỹ năng giao tiếp",
                  }[key] ?? key}
                </span>
                <span className="rounded-md bg-white border border-slate-200 px-2 py-0.5 font-bold text-[#0066FF] dark:border-slate-700 dark:bg-slate-900 dark:text-blue-300">
                  {score}/100
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Competencies Progress Bars */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
          Điểm theo nhóm năng lực
        </h4>
        <ul className="space-y-2.5">
          {(Object.entries(report.competencies) as [CompetencyKey, number][])
            .filter(([key]) => key === AVAILABLE_INTERVIEW_PROCESS)
            .map(([key, score]) => (
              <li key={key} className="space-y-1.5 rounded-xl border border-slate-200/70 bg-slate-50/40 p-3 dark:border-slate-800 dark:bg-slate-800/40 text-xs">
                <div className="flex justify-between gap-3 font-semibold text-slate-800 dark:text-slate-200">
                  <span>
                    {COMPETENCY_LABELS[key] ?? key}
                    {report.weights?.[key] != null && <span className="text-slate-400 font-normal"> ({report.weights[key]}%)</span>}
                  </span>
                  <span className="tabular-nums font-bold text-[#0066FF]">{score}/100</span>
                </div>
                <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700" aria-hidden="true">
                  <div
                    className="h-full rounded-full bg-[#0066FF] transition-all duration-500"
                    style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                  />
                </div>
              </li>
            ))}
        </ul>
      </div>

      {/* Post Session Summary & Detailed Analysis */}
      {report.evaluationMode === "POST_SESSION" && (
        <div className="space-y-3 text-xs">
          {report.summary && (
            <div className="rounded-xl border border-slate-200/70 bg-slate-50/60 p-4 text-slate-700 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
              <strong className="block text-slate-900 dark:text-slate-100 mb-1">Tóm tắt đánh giá:</strong>
              {report.summary}
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {report.strengths && (
              <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/50 p-3.5 text-emerald-900 dark:border-emerald-900/50 dark:bg-emerald-950/30 dark:text-emerald-200">
                <strong className="flex items-center gap-1.5 text-xs font-bold mb-1">
                  <CheckCircle2 className="size-3.5 text-emerald-600" />
                  Điểm mạnh
                </strong>
                <p className="leading-relaxed">{report.strengths}</p>
              </div>
            )}
            {report.weaknesses && (
              <div className="rounded-xl border border-amber-200/70 bg-amber-50/50 p-3.5 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
                <strong className="flex items-center gap-1.5 text-xs font-bold mb-1">
                  <AlertTriangle className="size-3.5 text-amber-600" />
                  Cần cải thiện
                </strong>
                <p className="leading-relaxed">{report.weaknesses}</p>
              </div>
            )}
          </div>

          {report.communicationCriteria && Object.keys(report.communicationCriteria).length > 0 && (
            <dl className="grid gap-3 sm:grid-cols-2 pt-2">
              {Object.entries(report.communicationCriteria).map(([criterion, score]) => (
                <div key={criterion} className="rounded-xl border border-slate-200/70 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                  <dt className="flex items-center justify-between font-semibold text-slate-800 dark:text-slate-200 mb-1">
                    <span>
                      {{
                        TECHNICAL_KNOWLEDGE: "Kiến thức chuyên môn",
                        PROBLEM_SOLVING: "Giải quyết vấn đề",
                        REASONING: "Lập luận",
                        COMMUNICATION: "Kỹ năng giao tiếp",
                      }[criterion] ?? criterion}
                      {report.criterionWeights?.[criterion] != null && (
                        <span className="text-slate-400 font-normal"> ({report.criterionWeights[criterion]}%)</span>
                      )}
                    </span>
                    <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[#0066FF] font-bold">{score}/100</span>
                  </dt>
                  {(report.criteriaEvidence?.[criterion] ?? []).map((evidence, index) => (
                    <dd key={index} className="mt-1.5 whitespace-pre-wrap text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed italic border-t border-slate-100 dark:border-slate-800 pt-1">
                      Tin #{evidence.messageId}: “{evidence.quote}”
                    </dd>
                  ))}
                </div>
              ))}
            </dl>
          )}
        </div>
      )}

      {/* Skills Evidence Breakdown */}
      {visibleSkills.length > 0 && (
        <div className="space-y-2.5">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
            Điểm theo Job Skill <span className="font-normal normal-case text-slate-400">(tham khảo, không cộng vào điểm tổng)</span>
          </h4>
          <ul className="rounded-xl border border-slate-200/70 divide-y divide-slate-100 bg-white text-xs dark:border-slate-800 dark:divide-slate-800 dark:bg-slate-900 overflow-hidden shadow-2xs">
            {visibleSkills.map(([skill, entry]) => {
              const evidence = (entry.questionIds ?? []).map((id) => questionNumber.get(id)).filter((n): n is number => n != null);
              return (
                <li key={skill} className="flex flex-wrap items-center justify-between gap-2 p-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                  <div className="min-w-0">
                    <p className="font-semibold text-slate-800 dark:text-slate-200">{skill}</p>
                    <p className="text-[11px] text-slate-400">
                      {evidence.length ? `Bằng chứng: câu ${evidence.join(", ")}` : "Không có câu hỏi kiểm tra"}
                    </p>
                  </div>
                  <span className="shrink-0 font-bold tabular-nums text-slate-700 dark:text-slate-300">
                    {entry.score == null ? "Chưa đủ dữ liệu" : `${entry.score}/100`}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </section>
  );
}
