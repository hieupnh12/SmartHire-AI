import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Bot, LoaderCircle, Sparkles, X } from "lucide-react";
import { aiInterviewApi } from "@/api/tenant/aiInterviewApi";
import type { AiInterview } from "@/api/types/aiInterview";
import type { ApplicationSummary } from "@/api/types/applicant";
import { AssessmentError, FieldError } from "@/components/ux/assessmentUi";
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-in fade-in-50 duration-200"
      role="presentation"
      onClick={onClose}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-ai-interview-title"
        className="relative w-full max-w-lg space-y-5 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900"
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleSubmit((values) => create.mutate(values))}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 flex size-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
          aria-label="Đóng"
        >
          <X className="size-4" aria-hidden="true" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)] border border-[var(--color-primary)]/25 shadow-2xs">
            <Sparkles className="size-5" aria-hidden="true" />
          </div>
          <div>
            <h2 id="create-ai-interview-title" className="text-base font-bold text-slate-900 dark:text-slate-100">
              Tạo phiên Phỏng vấn AI
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              SmartHire AI Interview Generator
            </p>
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed rounded-xl border border-slate-200/70 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-800/40">
          Hệ thống sẽ tạo phiên Communication theo cấu hình của Job. AI chuẩn bị câu hỏi và tiêu chí đánh giá cho ứng viên hoàn thành vòng phỏng vấn.
        </p>

        <label className="block space-y-1.5">
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            Chọn đơn ứng tuyển <span className="text-rose-500">*</span>
          </span>
          <select
            className="mt-1 h-9.5 w-full rounded-xl border border-slate-300 bg-white px-3 text-xs font-medium text-slate-900 transition-all focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white cursor-pointer"
            {...register("applicationId")}
            disabled={create.isPending}
          >
            <option value={0}>— Chọn ứng viên —</option>
            {eligible.map((a) => (
              <option key={a.id} value={a.id}>
                {a.candidateName} · Đơn #{a.id}{existingApplicationIds.has(a.id) ? " · (đã có phiên)" : ""}
              </option>
            ))}
          </select>
          <FieldError message={errors.applicationId?.message} />
        </label>

        {eligible.length === 0 && (
          <p className="text-xs text-amber-600 dark:text-amber-400 font-medium">
            Vị trí này chưa có đơn ứng tuyển hợp lệ ở trạng thái sẵn sàng phỏng vấn.
          </p>
        )}

        <AssessmentError error={create.error} />

        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            disabled={create.isPending}
            className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50/60 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:border-slate-300 transition-all cursor-pointer dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200"
          >
            Huỷ
          </button>
          <button
            type="submit"
            disabled={create.isPending || eligible.length === 0}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-4 text-xs font-semibold text-white shadow-xs hover:bg-[var(--color-primary-hover)] transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {create.isPending ? (
              <>
                <LoaderCircle className="size-3.5 animate-spin" aria-hidden="true" />
                <span>Đang tạo phiên…</span>
              </>
            ) : (
              <>
                <Bot className="size-3.5" aria-hidden="true" />
                <span>Tạo phiên</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
