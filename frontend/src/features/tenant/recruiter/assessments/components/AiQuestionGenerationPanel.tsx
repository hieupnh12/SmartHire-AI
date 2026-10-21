import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Sparkles } from "lucide-react";
import { questionBankApi } from "@/api/tenant/questionBankApi";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { getTenantIdFromWindow } from "@/lib/tenant";
import { Button } from "@/components/ux/Button";
import { DetailDialog } from "@/components/ux/DetailDialog";
import { AssessmentError, assessmentInput, FieldError } from "@/components/ux/assessmentUi";
import { questionBankLocalKeys } from "../utils/generalQuestionDraft";
import { generatedBankQuestion } from "../utils/generatedBankQuestion";

const schema = z.object({
  skill: z.string().trim().min(1, "Nhập kỹ năng hoặc chủ đề.").max(128),
  questionType: z.enum(["MCQ", "MULTIPLE_CHOICE", "ESSAY", "CODING"]),
  difficulty: z.enum(["Easy", "Medium", "Hard"]), count: z.number().int().min(1).max(5),
  language: z.enum(["java", "python", "javascript", "sql"]), instructions: z.string().max(2000),
});
type Values = z.infer<typeof schema>;

export function AiQuestionGenerationPanel() {
  const [open, setOpen] = useState(false);
  const [id, setId] = useState<string | null>(null);
  const [reviewError, setReviewError] = useState<Error | null>(null);
  const navigate = useNavigate();
  const userId = useAuthStore(state => state.user?.id);
  const tenant = getTenantIdFromWindow() ?? "acme";
  const { register, watch, handleSubmit, formState: { errors } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: {
    skill: "", questionType: "MCQ", difficulty: "Medium", count: 1, language: "java", instructions: "",
  } });
  const start = useMutation({ mutationFn: questionBankApi.generate, onSuccess: result => setId(result.id) });
  const result = useQuery({ queryKey: ["assessment-bank-generation", tenant, userId, id],
    queryFn: () => questionBankApi.generationStatus(id!), enabled: !!id,
    refetchInterval: query => query.state.data?.status === "READY" || query.state.data?.status === "FAILED" || query.state.error ? false : 2000,
    retry: false,
  });
  const busy = start.isPending || (!!id && !result.isError && (!result.data || ["PENDING", "RUNNING"].includes(result.data.status)));
  const coding = watch("questionType") === "CODING";
  return <>
    <Button type="button" variant="secondary" onClick={() => setOpen(true)} aria-haspopup="dialog"><Sparkles className="size-4" aria-hidden="true" />Đề xuất bằng AI<span className="rounded bg-[var(--color-primary-subtle)] px-1.5 py-0.5 text-[10px] text-[var(--color-primary)]">GENAI</span></Button>
    <DetailDialog open={open} title="Đề xuất câu hỏi bằng AI" onClose={() => setOpen(false)}>
    <section className="space-y-4" aria-label="Tạo câu hỏi bằng AI">
      <div><h2 className="font-semibold">Tạo bản nháp câu hỏi bằng AI</h2><p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">Chọn yêu cầu để tạo câu hỏi. Bạn sẽ kiểm tra và chỉnh sửa trước khi lưu vào ngân hàng.</p></div>
      <form noValidate className="space-y-3" onSubmit={handleSubmit(values => { setId(null); setReviewError(null); start.mutate(values); })}>
        <fieldset disabled={busy} className="space-y-3">
          <label className="block text-sm">Kỹ năng / Chủ đề<input className={assessmentInput} {...register("skill")} placeholder="Ví dụ: Java Collections, SQL JOIN" /><FieldError message={errors.skill?.message} /></label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm">Loại câu hỏi<select className={assessmentInput} {...register("questionType")}><option value="MCQ">Trắc nghiệm đơn</option><option value="MULTIPLE_CHOICE">Nhiều đáp án</option><option value="ESSAY">Tự luận lý thuyết</option><option value="CODING">Bài lập trình</option></select></label>
            <label className="text-sm">Độ khó<select className={assessmentInput} {...register("difficulty")}><option value="Easy">Dễ</option><option value="Medium">Trung bình</option><option value="Hard">Khó</option></select></label>
            <label className="text-sm">Số câu (1–5)<input type="number" min={1} max={5} className={assessmentInput} {...register("count", { valueAsNumber: true })} /><FieldError message={errors.count?.message} /></label>
            {coding && <label className="text-sm">Ngôn ngữ lập trình<select className={assessmentInput} {...register("language")}><option value="java">Java</option><option value="python">Python</option><option value="javascript">JavaScript</option><option value="sql">SQL</option></select></label>}
          </div>
          <label className="block text-sm">Yêu cầu bổ sung<textarea rows={3} className={assessmentInput} {...register("instructions")} /><FieldError message={errors.instructions?.message} /></label>
          <Button type="submit" disabled={busy}>{busy ? "AI đang tạo câu hỏi…" : "Tạo bản nháp"}</Button>
        </fieldset>
      </form>
      <AssessmentError error={start.error ?? result.error ?? reviewError} retry={result.isError ? () => void result.refetch() : undefined} />
      {busy && <p role="status" className="text-sm text-[var(--color-on-surface-variant)]">Yêu cầu đang được xử lý. Tạo nhiều câu có thể mất vài phút.</p>}
      {result.data?.status === "FAILED" && <p role="alert" className="text-sm text-[var(--color-error)]">{result.data.error}</p>}
      {result.data?.status === "READY" && <div className="space-y-3">
        <p role="status" className="text-sm">Đã tạo {result.data.questions.length} câu. Với câu code, cần kiểm tra lời giải và testcase trước khi sử dụng.</p>
        <ol className="list-inside list-decimal space-y-2 text-sm">{result.data.questions.map((question, index) => <li key={index}>{question.questionText.slice(0, 160)}</li>)}</ol>
        <Button type="button" onClick={() => {
          const draftResult = result.data;
          if (!draftResult || draftResult.status !== "READY") return;
          try {
            const draft = questionBankLocalKeys(tenant, userId).draft;
            sessionStorage.setItem(`${draft}:ai:${id}`, JSON.stringify(draftResult.questions.map(generatedBankQuestion)));
            navigate(`/recruiter/question-bank/new?generation=${id}`);
          } catch { setReviewError(new Error("Không thể mở bản nháp. Kiểm tra quyền lưu trữ trình duyệt rồi thử lại.")); }
        }}>Mở bản nháp để kiểm tra & lưu</Button>
      </div>}
    </section>
    </DetailDialog>
  </>;
}
