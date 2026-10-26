import { useState } from "react";
import { Code2, Play, CheckCircle2 } from "lucide-react";
import type { Question } from "@/api/types/assessment";
import { Button } from "@/components/ux/Button";
import { assessmentInput, FieldError } from "@/components/ux/assessmentUi";

export function CodingPreviewPanel({ question, source, onSourceChange, submitted, review = false, approved, onApprove }: {
  question: Question; source: string; onSourceChange: (value: string) => void; submitted: boolean;
  review?: boolean; approved: number | null; onApprove: (value: number) => void;
}) {
  const [samplesShown, setSamplesShown] = useState(false);
  const suggested = Number((question.points * (0.9 + 0.1 * 0.85)).toFixed(2));
  const [score, setScore] = useState(String(suggested));
  const valid = /^\d+(\.\d{1,2})?$/.test(score) && Number(score) <= question.points;
  return <section className="min-w-0 space-y-4 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-5 shadow-sm sm:p-6">
    <div className="flex flex-wrap items-center justify-between gap-3"><span className="inline-flex items-center gap-2 rounded-full bg-[var(--color-primary-soft)] px-3 py-1 text-xs font-semibold text-[var(--color-primary)]"><Code2 className="size-4" aria-hidden="true" />CÂU 4 · CODING · JavaScript</span><strong className="text-sm text-[var(--color-primary)]">{question.points} điểm</strong></div>
    <h3 className="text-lg font-semibold">{review ? "Kết quả Sandbox & AI Review Code" : "Bài toán: Chuẩn hóa email duy nhất"}</h3>
    <p className="whitespace-pre-wrap text-sm leading-6 text-[var(--color-on-surface-variant)]">{question.questionText}</p>
    <p className="text-xs">Giới hạn: {question.coding?.timeLimitMs} ms · {question.coding?.memoryMb} MB</p>
    <label className="block overflow-hidden rounded-xl border border-[var(--color-border-default)] text-sm"><span className="flex flex-wrap items-center justify-between gap-2 bg-[var(--color-surface-container)] px-4 py-3 font-medium"><span>Mã nguồn · solution.js</span><span className="text-xs">JavaScript · UTF-8</span></span><textarea rows={9} maxLength={10000} className={`${assessmentInput} preview-code-source min-h-64 rounded-none border-0 !bg-[var(--color-on-surface)] p-4 font-mono text-xs leading-6 !text-[var(--color-on-primary)]`} value={source} disabled={submitted || review} onChange={event => { onSourceChange(event.target.value); setSamplesShown(false); }} /></label>
    <div className="space-y-3"><h4 className="text-sm font-semibold">{review ? "Automated Test Cases · Sample & Hidden" : "Sample Test Cases · Công khai"}</h4>{question.coding?.testCases.filter(test => test.sample || review).map((test, index) => <div key={index} className="rounded-lg bg-[var(--color-surface-container-low)] p-3 text-sm"><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><p className="font-semibold">{test.sample ? "Sample" : "Hidden"} test {index + 1}</p>{(review || samplesShown) && <span className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-primary)]"><CheckCircle2 className="size-3.5" aria-hidden="true" />Passed · minh họa</span>}</div><pre className="overflow-x-auto whitespace-pre-wrap">Input: {test.input}{"\n"}Output mong đợi: {test.expectedOutput}{(review || samplesShown) && `\nOutput (demo): ${test.expectedOutput}`}</pre></div>)}</div>
    {!review && <><Button variant="secondary" disabled={submitted || !source.trim()} onClick={() => setSamplesShown(true)}><Play className="size-4" aria-hidden="true" />Xem kết quả chạy mẫu minh họa</Button>{samplesShown && <p role="status" className="text-sm">Ví dụ lời giải mẫu: 2/2 sample tests đạt. Đây là kết quả dựng sẵn, không thực thi mã bạn nhập.</p>}</>}
    {review && <><p className="text-sm">Kết quả minh họa cố định: hidden tests đạt 100%; AI review 85/100 (10%). Sample không tính điểm. Code rõ ràng, giữ thứ tự; có thể tối ưu để tránh tạo mảng trung gian.</p><p className="font-semibold">Đề xuất: {question.points} × (90% × 100% + 10% × 85%) = {suggested}/{question.points}</p><div className="flex flex-wrap items-end gap-3"><Button onClick={() => onApprove(suggested)}>Duyệt điểm code mẫu</Button><label className="text-sm">Điểm điều chỉnh<input type="number" min={0} max={question.points} step="0.01" className={assessmentInput} value={score} onChange={event => setScore(event.target.value)} /></label><Button variant="secondary" disabled={!valid} onClick={() => onApprove(Number(score))}>Lưu điểm code</Button></div>{!valid && <FieldError message={`Nhập điểm từ 0 đến ${question.points}, tối đa 2 chữ số thập phân.`} />}<p role="status" className="text-sm">{approved == null ? "Code đang chờ duyệt" : `Code đã duyệt: ${approved}/${question.points} điểm`}</p></>}
  </section>;
}
