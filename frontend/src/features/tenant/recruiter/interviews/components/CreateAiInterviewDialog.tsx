import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoaderCircle, X } from "lucide-react";
import { aiInterviewApi } from "@/api/tenant/aiInterviewApi";
import type { AiInterview } from "@/api/types/aiInterview";
import type { ApplicationSummary } from "@/api/types/applicant";
import { Button } from "@/components/ux/Button";
import { AssessmentError, FieldError, assessmentInput } from "@/components/ux/assessmentUi";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "@/stores/toastStore";

const schema = z.object({
  applicationId: z.coerce.number().int().positive("Chọn đơn ứng tuyển"),
});
type FormValues = z.infer<typeof schema>;

type Props = {
  jobId: number;
  applicants: ApplicationSummary[];
  existingApplicationIds: Set<number>;
  onClose: () => void;
  onCreated: (interview: AiInterview) => void;
};

export function CreateAiInterviewDialog({ jobId, applicants, existingApplicationIds, onClose, onCreated }: Props) {
  const client = useQueryClient();
  const eligible = applicants.filter((a) => !a.archived && a.status !== "REJECTED" && a.status !== "WITHDRAWN");
  const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { applicationId: 0 },
  });
  const create = useMutation({
    mutationFn: (values: FormValues) => aiInterviewApi.create({ applicationId: values.applicationId }),
    onSuccess: (created) => {
      void client.invalidateQueries({ queryKey: queryKeys.aiInterviews.byJob(jobId) });
      toast.success("Đã tạo phiên phỏng vấn AI", `#AI-${created.id}`);
      onCreated(created);
    },
  });

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm" role="presentation" onClick={onClose}>
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-ai-interview-title"
        className="relative w-full max-w-lg space-y-4 rounded-[var(--radius-xl)] border border-[var(--color-border-default)] bg-surface-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit((values) => create.mutate(values))}
      >
        <button type="button" onClick={onClose} className="absolute right-4 top-4 grid size-9 place-items-center rounded-lg text-[var(--color-text-secondary)] hover:bg-surface-muted" aria-label="Đóng">
          <X className="size-4" aria-hidden="true" />
        </button>
        <h2 id="create-ai-interview-title" className="pr-8 text-xl font-semibold">Tạo phỏng vấn AI</h2>
        <p className="text-sm text-[var(--color-on-surface-variant)]">
          Tạo phiên cho một đơn ứng tuyển của vị trí này. Câu hỏi được thêm trong màn chi tiết sau khi tạo.
        </p>
        <label className="block space-y-1 text-sm">
          <span className="font-medium">Đơn ứng tuyển</span>
          <select className={assessmentInput} {...register("applicationId")} disabled={create.isPending}>
            <option value={0}>— Chọn ứng viên —</option>
            {eligible.map((a) => (
              <option key={a.id} value={a.id}>
                {a.candidateName} · Đơn #{a.id}{existingApplicationIds.has(a.id) ? " · đã có phiên" : ""}
              </option>
            ))}
          </select>
          <FieldError message={errors.applicationId?.message} />
        </label>
        {eligible.length === 0 && (
          <p className="text-sm text-[var(--color-on-surface-variant)]">Vị trí này chưa có đơn ứng tuyển hợp lệ.</p>
        )}
        <AssessmentError error={create.error} />
        <div className="flex justify-end gap-3 pt-2">
          <Button variant="secondary" onClick={onClose} disabled={create.isPending}>Huỷ</Button>
          <Button type="submit" disabled={create.isPending || eligible.length === 0}>
            {create.isPending && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
            Tạo phiên
          </Button>
        </div>
      </form>
    </div>
  );
}
