import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Gavel, PauseCircle, Send, XCircle } from "lucide-react";
import { workflowApi, type HiringDecisionType } from "@/api/tenant/workflowApi";
import type { ApplicationDetail } from "@/api/types/applicant";
import { getApiErrorMessage } from "@/lib/axios";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/uiStore";
import { toast } from "@/stores/toastStore";
import { button, primary } from "@/features/tenant/recruiter/matching/components/rankingUi";

const LABELS: Record<HiringDecisionType, string> = { HIRE: "Tuyển / gửi offer", REJECT: "Từ chối", HOLD: "Tạm giữ" };
const TOASTS: Record<HiringDecisionType, string> = {
  HIRE: "Đã ghi nhận quyết định tuyển và gửi offer cho ứng viên",
  REJECT: "Đã từ chối ứng viên",
  HOLD: "Đã tạm giữ hồ sơ",
};
const DECIDABLE = new Set(["HUMAN_INTERVIEW", "OFFER"]);

/** WF-03: formal hiring decision after the human interview round, with history. */
export function HiringDecisionPanel({ detail, onChanged }: { detail: ApplicationDetail; onChanged: () => void }) {
  const client = useQueryClient();
  const askConfirm = useUiStore((s) => s.askConfirm);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const queryKey = ["applicants", "decisions", detail.id];
  const history = useQuery({ queryKey, queryFn: () => workflowApi.decisions(detail.id).then((r) => r.data) });
  const decide = useMutation({
    mutationFn: (decision: HiringDecisionType) => workflowApi.decide(detail.id, { decision, reason: reason.trim() || undefined }),
    onSuccess: (_response, decision) => {
      toast.success(TOASTS[decision]);
      setReason("");
      void client.invalidateQueries({ queryKey });
      onChanged();
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });

  const canDecide = DECIDABLE.has(detail.status) && !detail.archived;
  const rows = history.data ?? [];
  if (!canDecide && rows.length === 0) return null;

  const submit = (decision: HiringDecisionType) => {
    if (decision !== "HIRE" && !reason.trim()) {
      setReasonError("Nhập lý do cho quyết định Từ chối hoặc Tạm giữ.");
      return;
    }
    setReasonError(null);
    if (decision === "HOLD") {
      decide.mutate(decision);
      return;
    }
    askConfirm({
      title: decision === "HIRE" ? "Gửi offer cho ứng viên?" : "Từ chối ứng viên?",
      description: decision === "HIRE"
        ? `${detail.candidateName} sẽ nhận thông báo offer và tự chấp nhận hoặc từ chối.`
        : `${detail.candidateName} sẽ chuyển sang trạng thái Đã từ chối. Không thể mở lại.`,
      danger: decision === "REJECT",
      confirmLabel: decision === "HIRE" ? "Gửi offer" : "Từ chối",
      onConfirm: async () => { await decide.mutateAsync(decision); },
    });
  };

  return (
    <div className="space-y-3 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-4">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
          <Gavel className="size-4" aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold">Quyết định tuyển dụng</h3>
          <p className="text-xs text-[var(--color-on-surface-variant)]">
            {detail.status === "OFFER"
              ? "Đã gửi offer, đang chờ ứng viên chấp nhận hoặc từ chối."
              : "Chỉ người phụ trách Job hoặc quản trị công ty được ra quyết định."}
          </p>
        </div>
      </div>

      {canDecide && (
        <>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-[var(--color-on-surface-variant)]">Lý do / ghi chú quyết định</span>
            <textarea value={reason} maxLength={2000} rows={2} onChange={(e) => setReason(e.target.value)}
              aria-invalid={reasonError ? true : undefined}
              className="w-full rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-alt)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15" />
          </label>
          {reasonError && <p role="alert" className="text-xs text-red-700">{reasonError}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" className={primary} disabled={decide.isPending} onClick={() => submit("HIRE")}>
              <Send className="size-4" aria-hidden="true" />
              {detail.status === "OFFER" ? "Xác nhận tuyển" : "Gửi offer"}
            </button>
            <button type="button" className={button} disabled={decide.isPending} onClick={() => submit("HOLD")}>
              <PauseCircle className="size-4" aria-hidden="true" />
              Tạm giữ
            </button>
            <button type="button" disabled={decide.isPending} onClick={() => submit("REJECT")}
              className={cn(button, "hover:border-[var(--color-error)] hover:bg-[var(--color-error-container)] hover:text-[var(--color-on-error-container)]")}>
              <XCircle className="size-4" aria-hidden="true" />
              Từ chối
            </button>
          </div>
        </>
      )}

      {rows.length > 0 && (
        <ol className="space-y-2 border-t border-[var(--color-border-default)] pt-3">
          {rows.map((row) => (
            <li key={row.id} className="text-xs">
              <p className="font-semibold">{LABELS[row.decision]} · {row.decidedByName ?? `#${row.decidedBy}`}</p>
              {row.reason && <p className="text-[var(--color-on-surface-variant)]">{row.reason}</p>}
              <p className="text-[11px] text-[var(--color-outline)]">{new Date(row.createdAt).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}</p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
