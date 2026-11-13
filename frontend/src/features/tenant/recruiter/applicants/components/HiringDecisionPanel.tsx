import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Gavel, PauseCircle, Send, XCircle } from "lucide-react";
import { workflowApi, type HiringDecisionType } from "@/api/tenant/workflowApi";
import type { ApplicationDetail } from "@/api/types/applicant";
import { formatDateTime, useLocale, useT } from "@/i18n";
import { getApiErrorMessage } from "@/lib/axios";
import { cn } from "@/lib/utils";
import { useUiStore } from "@/stores/uiStore";
import { toast } from "@/stores/toastStore";
import { button, primary } from "@/features/tenant/recruiter/matching/components/rankingUi";

const DECIDABLE = new Set(["HUMAN_INTERVIEW", "OFFER"]);

/** WF-03: formal hiring decision after the human interview round, with history. */
export function HiringDecisionPanel({ detail, onChanged }: { detail: ApplicationDetail; onChanged: () => void }) {
  const t = useT();
  const locale = useLocale();
  const client = useQueryClient();
  const askConfirm = useUiStore((s) => s.askConfirm);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);
  const queryKey = ["applicants", "decisions", detail.id];
  const history = useQuery({ queryKey, queryFn: () => workflowApi.decisions(detail.id).then((r) => r.data) });
  const decide = useMutation({
    mutationFn: (decision: HiringDecisionType) => workflowApi.decide(detail.id, { decision, reason: reason.trim() || undefined }),
    onSuccess: (_response, decision) => {
      toast.success(t(`recruiter.ops.applicants.hiringDecision.toasts.${decision}`));
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
      setReasonError(t("recruiter.ops.applicants.hiringDecision.reasonRequired"));
      return;
    }
    setReasonError(null);
    if (decision === "HOLD") {
      decide.mutate(decision);
      return;
    }
    askConfirm({
      title: decision === "HIRE"
        ? t("recruiter.ops.applicants.hiringDecision.confirmHireTitle")
        : t("recruiter.ops.applicants.hiringDecision.confirmRejectTitle"),
      description: decision === "HIRE"
        ? t("recruiter.ops.applicants.hiringDecision.confirmHireDesc", { name: detail.candidateName })
        : t("recruiter.ops.applicants.hiringDecision.confirmRejectDesc", { name: detail.candidateName }),
      danger: decision === "REJECT",
      confirmLabel: decision === "HIRE"
        ? t("recruiter.ops.applicants.hiringDecision.confirmHireBtn")
        : t("recruiter.ops.applicants.hiringDecision.confirmRejectBtn"),
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
          <h3 className="text-sm font-semibold">{t("recruiter.ops.applicants.hiringDecision.title")}</h3>
          <p className="text-xs text-[var(--color-on-surface-variant)]">
            {detail.status === "OFFER"
              ? t("recruiter.ops.applicants.hiringDecision.offerSentHint")
              : t("recruiter.ops.applicants.hiringDecision.permissionHint")}
          </p>
        </div>
      </div>

      {canDecide && (
        <>
          <label className="block space-y-1">
            <span className="text-xs font-semibold text-[var(--color-on-surface-variant)]">
              {t("recruiter.ops.applicants.hiringDecision.reasonLabel")}
            </span>
            <textarea value={reason} maxLength={2000} rows={2} onChange={(e) => setReason(e.target.value)}
              aria-invalid={reasonError ? true : undefined}
              className="w-full rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-alt)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15" />
          </label>
          {reasonError && <p role="alert" className="text-xs text-red-700">{reasonError}</p>}
          <div className="flex flex-wrap gap-2">
            <button type="button" className={primary} disabled={decide.isPending} onClick={() => submit("HIRE")}>
              <Send className="size-4" aria-hidden="true" />
              {detail.status === "OFFER"
                ? t("recruiter.ops.applicants.hiringDecision.confirmHireAction")
                : t("recruiter.ops.applicants.hiringDecision.sendOfferAction")}
            </button>
            <button type="button" className={button} disabled={decide.isPending} onClick={() => submit("HOLD")}>
              <PauseCircle className="size-4" aria-hidden="true" />
              {t("recruiter.ops.applicants.hiringDecision.holdAction")}
            </button>
            <button type="button" disabled={decide.isPending} onClick={() => submit("REJECT")}
              className={cn(button, "hover:border-[var(--color-error)] hover:bg-[var(--color-error-container)] hover:text-[var(--color-on-error-container)]")}>
              <XCircle className="size-4" aria-hidden="true" />
              {t("recruiter.ops.applicants.hiringDecision.rejectAction")}
            </button>
          </div>
        </>
      )}

      {rows.length > 0 && (
        <ol className="space-y-2 border-t border-[var(--color-border-default)] pt-3">
          {rows.map((row) => (
            <li key={row.id} className="text-xs">
              <p className="font-semibold">
                {t(`recruiter.ops.applicants.hiringDecision.labels.${row.decision}`)} · {row.decidedByName ?? `#${row.decidedBy}`}
              </p>
              {row.reason && <p className="text-[var(--color-on-surface-variant)]">{row.reason}</p>}
              <p className="text-[11px] text-[var(--color-outline)]">
                {formatDateTime(row.createdAt, { dateStyle: "short", timeStyle: "short" }, locale)}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
