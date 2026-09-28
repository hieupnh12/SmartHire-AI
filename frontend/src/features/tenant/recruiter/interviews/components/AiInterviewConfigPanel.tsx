import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { aiInterviewApi } from "@/api/tenant/aiInterviewApi";
import type { AiInterviewConfig } from "@/api/types/aiInterview";
import { Button } from "@/components/ux/Button";
import { AssessmentError, FieldError, assessmentInput } from "@/components/ux/assessmentUi";
import { queryKeys } from "@/lib/query-keys";

const schema = z.object({
  enabled: z.boolean(),
  passingScore: z.coerce.number().min(0).max(100),
  questionCount: z.coerce.number().int().min(5, "Số câu hỏi cố định là 5").max(5, "Số câu hỏi cố định là 5"),
  availableUntil: z.string().refine(value => !value || Number.isFinite(new Date(value).getTime()), "Thời gian không hợp lệ"),
});
type Values = z.infer<typeof schema>;

export function AiInterviewConfigPanel({ jobId }: { jobId: number }) {
  const config = useQuery({ queryKey: ["ai-interview-config", jobId], queryFn: () => aiInterviewApi.config(jobId) });
  return <section id="ai-interview-config" className="space-y-4 rounded-2xl border border-[var(--color-border-default)] bg-surface-card p-6">
    <h2 className="text-lg font-semibold">Cấu hình AI Interview của Job</h2>
    <AssessmentError error={config.error} retry={() => void config.refetch()} />
    {config.isPending && <p role="status">Đang tải cấu hình…</p>}
    {config.data && <ConfigForm key={jobId} jobId={jobId} config={config.data} />}
  </section>;
}

function ConfigForm({ jobId, config }: { jobId: number; config: AiInterviewConfig }) {
  const client = useQueryClient();
  const localDate = config.availableUntil ? new Date(config.availableUntil) : null;
  const defaultDate = localDate ? new Date(localDate.getTime() - localDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16) : "";
  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { ...config, availableUntil: defaultDate } });
  const save = useMutation({
    mutationFn: (values: Values) => aiInterviewApi.saveConfig(jobId, { ...values, availableUntil: values.availableUntil ? new Date(values.availableUntil).toISOString() : null }),
    onSuccess: (_, values) => {
      reset(values);
      void client.invalidateQueries({ queryKey: ["ai-interview-config", jobId] });
      void client.invalidateQueries({ queryKey: queryKeys.aiInterviews.byJob(jobId) });
    },
  });
  return <form className="space-y-4" onSubmit={handleSubmit(values => save.mutate(values))}>
    <label className="flex min-h-11 items-center gap-3 text-sm"><input type="checkbox" {...register("enabled")} disabled={save.isPending} />Cho phép AI Interview và tự tạo lời mời khi CV đạt</label>
    <div className="grid gap-4 sm:grid-cols-3">
      <label className="space-y-2 text-sm"><span>Ngưỡng đạt (/100)</span><input className={assessmentInput} type="number" min={0} max={100} step="0.01" {...register("passingScore")} /><FieldError message={errors.passingScore?.message} /></label>
      <label className="space-y-2 text-sm"><span>Số câu hỏi (5)</span><input className={assessmentInput} type="number" min={5} max={5} {...register("questionCount")} /><FieldError message={errors.questionCount?.message} /></label>
      <label className="space-y-2 text-sm"><span>Khả dụng đến (không bắt buộc)</span><input className={assessmentInput} type="datetime-local" {...register("availableUntil")} /><FieldError message={errors.availableUntil?.message} /></label>
    </div>
    <p className="text-sm text-[var(--color-on-surface-variant)]">AI sinh câu hỏi từ JD, yêu cầu và kỹ năng. Ngưỡng đạt được lưu khi ứng viên bắt đầu phiên.</p>
    <AssessmentError error={save.error} />
    {save.isSuccess && !isDirty && <p role="status">Đã lưu cấu hình.</p>}
    <Button type="submit" disabled={!isDirty || save.isPending}>{save.isPending ? "Đang lưu…" : "Lưu cấu hình"}</Button>
  </form>;
}
