import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Save } from "lucide-react";
import type { JobTest, TestRequest } from "@/api/types/assessment";
import { Button } from "@/components/ux/Button";
import { assessmentInput as input, FieldError } from "@/components/ux/assessmentUi";

const schema = z.object({
  title: z.string().trim().min(1, "Nhập tên đề.").max(255, "Tối đa 255 ký tự."),
  jobId: z.number().int().positive("Chọn vị trí tuyển dụng."),
  description: z.string().max(10000, "Tối đa 10.000 ký tự."),
  durationMinutes: z.number().int("Nhập số phút nguyên.").min(1, "Tối thiểu 1 phút.").max(2147483647),
  passingScore: z.string().refine(v => v === "" || /^\d{1,8}(\.\d{1,2})?$/.test(v), "Nhập điểm không âm, tối đa 2 số thập phân."),
});
type Form = z.infer<typeof schema>;

export function TestForm({ test, jobs, lockedJobId, busy, onSave, onDirty }: {
  test?: JobTest; jobs: { id: number; title: string }[]; lockedJobId?: number; busy: boolean;
  onSave: (request: TestRequest) => Promise<void>; onDirty: (dirty: boolean) => void;
}) {
  const { register, handleSubmit, reset, formState: { errors, isDirty } } = useForm<Form>({
    resolver: zodResolver(schema), defaultValues: { title: test?.title ?? "", jobId: test?.jobId ?? lockedJobId ?? 0,
      description: test?.description ?? "", durationMinutes: test?.durationMinutes ?? 30,
      passingScore: test?.passingScore == null ? "" : String(test.passingScore) },
  });
  useEffect(() => { onDirty(isDirty); }, [isDirty, onDirty]);
  return <form className="space-y-4" onSubmit={handleSubmit(async values => {
    try {
      await onSave({ ...values, description: values.description || null, passingScore: values.passingScore === "" ? null : Number(values.passingScore) });
      reset(values);
    } catch { /* Keep input values; the page displays the mutation error. */ }
  })} noValidate>
    <fieldset disabled={busy} className="space-y-4">
      <label className="block space-y-1 text-sm">Tên đề <input className={input} {...register("title")} aria-invalid={!!errors.title} /><FieldError message={errors.title?.message} /></label>
      {lockedJobId ? <div className="rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] px-3 py-2 text-sm"><span className="text-[var(--color-on-surface-variant)]">Vị trí tuyển dụng: </span><strong>{jobs.find((job) => job.id === lockedJobId)?.title ?? `Job #${lockedJobId}`}</strong><input type="hidden" {...register("jobId", { valueAsNumber: true })} /></div> : <label className="block space-y-1 text-sm">Vị trí tuyển dụng
        <select className={input} {...register("jobId", { valueAsNumber: true })} disabled={!!test || busy} aria-invalid={!!errors.jobId}>
          <option value={0}>Chọn vị trí</option>
          {test && !jobs.some(j => j.id === test.jobId) && <option value={test.jobId}>Job #{test.jobId}</option>}
          {jobs.map(job => <option key={job.id} value={job.id}>{job.title}</option>)}
        </select><FieldError message={errors.jobId?.message} />
      </label>}
      <label className="block space-y-1 text-sm">Mô tả <textarea className={input} rows={3} {...register("description")} /><FieldError message={errors.description?.message} /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block space-y-1 text-sm">Thời lượng (phút)<input type="number" min={1} step={1} className={input} {...register("durationMinutes", { valueAsNumber: true })} /><FieldError message={errors.durationMinutes?.message} /></label>
        <label className="block space-y-1 text-sm">Điểm đạt (không bắt buộc)<input type="number" min={0} step="0.01" className={input} {...register("passingScore")} /><FieldError message={errors.passingScore?.message} /></label>
      </div>
      <Button type="submit" disabled={busy || (!!test && !isDirty)}><Save className="size-4" aria-hidden="true" />{busy ? "Đang lưu…" : test ? "Lưu thay đổi" : "Tạo đề nháp"}</Button>
    </fieldset>
  </form>;
}
