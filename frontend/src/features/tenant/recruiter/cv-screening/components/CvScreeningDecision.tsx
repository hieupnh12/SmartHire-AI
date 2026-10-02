import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, CheckCircle2, CircleDashed, UserCheck, XCircle } from "lucide-react";
import { applicantApi } from "@/api/tenant/applicantApi";
import { getApiErrorMessage } from "@/lib/axios";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/uiStore";
import { toast } from "@/stores/toastStore";
import { button, primary } from "@/features/tenant/recruiter/matching/components/rankingUi";

const DECISION = {
  PASSED: { label: "Đã qua vòng CV", icon: CheckCircle2, className: "bg-emerald-50 text-emerald-700" },
  FAILED: { label: "Không đạt vòng CV", icon: XCircle, className: "bg-red-50 text-red-700" },
  PENDING: { label: "Chưa quyết định", icon: CircleDashed, className: "bg-amber-50 text-amber-700" },
} as const;

/** CV-round decision. MANUAL jobs: recruiter passes/fails; AUTO jobs: read-only result decided by the system. */
export function CvScreeningDecision({ applicationId, onDecided }: { applicationId: number; onDecided?: () => void }) {
  const client = useQueryClient();
  const askConfirm = useUiStore((s) => s.askConfirm);
  const detail = useQuery({
    queryKey: queryKeys.applicants.detail(applicationId),
    queryFn: () => applicantApi.get(applicationId),
  });
  const decide = useMutation({
    mutationFn: (passed: boolean) => applicantApi.decideCvScreening(applicationId, passed),
    onSuccess: (_response, passed) => {
      void client.invalidateQueries({ queryKey: ["applicants"] });
      onDecided?.();
      toast.success(passed ? "Đã cho ứng viên qua vòng CV" : "Đã đánh dấu CV không đạt");
    },
  });

  const app = detail.data?.data;
  if (!app) return null;
  const manual = app.screeningMode !== "AUTO";
  const inCvRound = (app.status === "NEW" || app.status === "IN_REVIEW") && !app.archived && !app.withdrawnAt;
  const meta = DECISION[app.cvScreeningStatus ?? "PENDING"];
  const Icon = meta.icon;

  const confirmPass = () =>
    askConfirm({
      title: "Cho ứng viên qua vòng CV?",
      description: `${app.candidateName} sẽ chuyển sang vòng phỏng vấn AI và nhận email mời.`,
      confirmLabel: "Cho qua",
      onConfirm: async () => {
        await decide.mutateAsync(true);
      },
    });

  return (
    <div className="space-y-3 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
            {manual ? <UserCheck className="size-4" aria-hidden="true" /> : <Bot className="size-4" aria-hidden="true" />}
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold">Quyết định vòng CV</h3>
            <p className="text-xs text-[var(--color-on-surface-variant)]">
              {manual
                ? "Lọc thủ công: AI chỉ chấm điểm, recruiter quyết định cho qua vòng."
                : "Lọc tự động: hệ thống cho qua khi CV đạt ngưỡng và không thiếu kỹ năng bắt buộc."}
            </p>
          </div>
        </div>
        <span className={cn("inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold", meta.className)}>
          <Icon className="size-3.5" aria-hidden="true" />
          {meta.label}
        </span>
      </div>

      {manual && inCvRound && (
        <div className="flex flex-wrap gap-2">
          <button type="button" className={primary} disabled={decide.isPending} onClick={confirmPass}>
            <CheckCircle2 className="size-4" aria-hidden="true" />
            Cho qua vòng CV
          </button>
          {app.cvScreeningStatus !== "FAILED" && (
            <button
              type="button"
              className={cn(button, "hover:border-[var(--color-error)] hover:bg-[var(--color-error-container)] hover:text-[var(--color-on-error-container)]")}
              disabled={decide.isPending}
              onClick={() => decide.mutate(false)}
            >
              <XCircle className="size-4" aria-hidden="true" />
              Không đạt
            </button>
          )}
        </div>
      )}

      {decide.isError && (
        <p role="alert" className="rounded-xl bg-[var(--color-error-container)] p-3 text-sm text-[var(--color-on-error-container)]">
          {getApiErrorMessage(decide.error)}
        </p>
      )}
    </div>
  );
}
