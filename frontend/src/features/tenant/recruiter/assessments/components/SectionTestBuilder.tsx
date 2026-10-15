import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";
import { questionBankApi } from "@/api/tenant/questionBankApi";
import type { Question, QuestionRequest } from "@/api/types/assessment";
import { queryKeys } from "@/lib/query-keys";
import { Button } from "@/components/ux/Button";
import { AssessmentError, assessmentInput } from "@/components/ux/assessmentUi";
import { AssessmentQuestionCard } from "./AssessmentQuestionCard";

export function SectionTestBuilder({ questions, durationMinutes, objectiveDurationMinutes, locked, busy, onEdit, onRemove, onAdd, onReorder }: {
  questions: Question[]; durationMinutes: number; objectiveDurationMinutes?: number | null; locked: boolean; busy: boolean;
  onEdit: (question: Question) => void; onRemove: (question: Question) => void; onAdd: (question: QuestionRequest) => void; onReorder: (ids: number[]) => void;
}) {
  const [picker, setPicker] = useState<"QUIZ" | "ESSAY" | "CODING" | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const bank = useQuery({ queryKey: [...queryKeys.assessments.all(), "section-picker", picker, search, page],
    queryFn: ({ signal }) => questionBankApi.list({ page, size: 10, questionType: picker ?? "QUIZ", query: search || undefined }, signal), enabled: !!picker });
  const objective = questions.filter(question => ["MCQ", "MULTIPLE_CHOICE"].includes(question.questionType));
  const subjective = questions.filter(question => !["MCQ", "MULTIPLE_CHOICE"].includes(question.questionType));
  const points = (items: Question[]) => items.reduce((sum, question) => sum + question.points, 0);
  const total = points(questions);
  const move = (items: Question[], index: number, offset: number) => {
    const next = [...items];
    [next[index], next[index + offset]] = [next[index + offset], next[index]];
    onReorder((items === objective ? [...next, ...subjective] : [...objective, ...next]).map(question => question.id));
  };
  const open = (type: "QUIZ" | "ESSAY" | "CODING") => { setPicker(type); setPage(0); setSearch(""); };
  return <div className="space-y-5">
    <div className="rounded-xl bg-[var(--color-primary-subtle)] p-4 text-sm" role="status">{durationMinutes} phút · {total} điểm · Trắc nghiệm {total ? Math.round(points(objective) / total * 100) : 0}% · Tự luận & Code {total ? Math.round(points(subjective) / total * 100) : 0}%</div>
    {[objective, subjective].map((items, section) => <section key={section} className="space-y-4 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-4">
      <h3 className="font-semibold">{section === 0 ? "PHẦN 1: TRẮC NGHIỆM KIẾN THỨC CỐT LÕI" : "PHẦN 2: TỰ LUẬN & THỬ THÁCH LẬP TRÌNH"}</h3>
      <p className="text-sm text-[var(--color-on-surface-variant)]">{items.length} câu · {points(items)} điểm · {objectiveDurationMinutes ? `${section === 0 ? objectiveDurationMinutes : durationMinutes - objectiveDurationMinutes} phút` : "Dùng thời gian chung"}</p>
      {items.length === 0 && <p className="text-sm">Chưa có câu hỏi trong phần này.</p>}
      {items.map((question, index) => <AssessmentQuestionCard key={question.id} question={question} index={index} actions={locked ? undefined : <div className="flex flex-wrap gap-1">
        <Button variant="ghost" disabled={busy || index === 0} aria-label={`Đưa câu ${index + 1} lên`} onClick={() => move(items, index, -1)}><ArrowUp className="size-4" aria-hidden="true" /></Button>
        <Button variant="ghost" disabled={busy || index === items.length - 1} aria-label={`Đưa câu ${index + 1} xuống`} onClick={() => move(items, index, 1)}><ArrowDown className="size-4" aria-hidden="true" /></Button>
        <Button variant="ghost" disabled={busy} aria-label={`Sửa câu ${index + 1}`} onClick={() => onEdit(question)}><Pencil className="size-4" aria-hidden="true" /></Button>
        <Button variant="ghost" disabled={busy} aria-label={`Xóa câu ${index + 1}`} onClick={() => onRemove(question)}><Trash2 className="size-4" aria-hidden="true" /></Button>
      </div>} />)}
      {!locked && <div className="flex flex-wrap gap-2"><Button variant="secondary" disabled={busy || questions.length >= 100} onClick={() => open(section === 0 ? "QUIZ" : "ESSAY")}><Plus className="size-4" aria-hidden="true" />{section === 0 ? "Thêm từ ngân hàng trắc nghiệm" : "Thêm từ ngân hàng tự luận"}</Button>{section === 1 && <Button variant="secondary" disabled={busy || questions.length >= 100} onClick={() => open("CODING")}>Thêm từ ngân hàng Code</Button>}</div>}
    </section>)}
    {picker && !locked && <section className="space-y-3 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-4" aria-label="Chọn câu từ ngân hàng">
      <div className="flex items-center justify-between gap-2"><h3 className="font-semibold">Ngân hàng {picker === "QUIZ" ? "trắc nghiệm" : picker === "ESSAY" ? "tự luận" : "Code"}</h3><Button variant="ghost" onClick={() => setPicker(null)}>Đóng</Button></div>
      <label className="block text-sm">Tìm câu hỏi<input className={assessmentInput} value={search} onChange={event => { setSearch(event.target.value); setPage(0); }} /></label>
      <AssessmentError error={bank.error} retry={() => void bank.refetch()} />
      {bank.isPending && <p role="status">Đang tải ngân hàng…</p>}
      {bank.data?.items.filter(item => !item.archived).map(item => <div key={item.question.id} className="flex items-start justify-between gap-3 rounded-lg bg-[var(--color-surface-container-low)] p-3"><div className="min-w-0"><p className="line-clamp-3 whitespace-pre-wrap text-sm">{item.question.questionText}</p><p className="text-xs">{item.question.points} điểm · {item.question.skill || "Chưa gắn kỹ năng"}</p></div><Button disabled={busy || questions.length >= 100} onClick={() => {
        const question = item.question;
        onAdd({ ...question, questionType: question.questionType as QuestionRequest["questionType"], questionOrder: Math.max(-1, ...questions.map(row => row.questionOrder)) + 1,
          options: question.options.map(({ optionText, correct }) => ({ optionText, correct })) });
      }}>Thêm</Button></div>)}
      {bank.data?.items.length === 0 && <p className="text-sm">Không tìm thấy câu hỏi.</p>}
      <div className="flex items-center justify-between"><Button variant="secondary" disabled={page === 0 || bank.isFetching} onClick={() => setPage(page - 1)}>Trang trước</Button><span className="text-sm">Trang {page + 1}</span><Button variant="secondary" disabled={bank.isFetching || !bank.data || (page + 1) * 10 >= bank.data.total} onClick={() => setPage(page + 1)}>Trang sau</Button></div>
    </section>}
  </div>;
}
