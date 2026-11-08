import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle, PartyPopper } from "lucide-react";
import { workflowApi } from "@/api/tenant/workflowApi";
import { Button } from "@/components/ux/Button";
import { getApiErrorMessage } from "@/lib/axios";
import { queryKeys } from "@/lib/query-keys";
import { toast } from "@/stores/toastStore";

const MAX_REASON = 255;

export function OfferResponsePanel({ applicationId, jobTitle }: { applicationId: number; jobTitle: string }) {
  const queryClient = useQueryClient();
  const [declining, setDeclining] = useState(false);
  const [reason, setReason] = useState("");
  const respond = useMutation({
    mutationFn: (accept: boolean) => workflowApi.respondToOffer(applicationId, { accept, reason: accept ? undefined : reason.trim() || undefined }),
    onSuccess: (_, accept) => {
      toast.success(accept ? "Bạn đã chấp nhận offer. Chúc mừng!" : "Bạn đã từ chối offer.");
      void queryClient.invalidateQueries({ queryKey: queryKeys.applicants.detail(applicationId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.applicants.mine });
    },
    onError: (error) => toast.error(getApiErrorMessage(error)),
  });
  const pending = respond.isPending;

  return (
    <section aria-labelledby="offer-title" className="rounded-2xl border border-[var(--color-primary)]/30 bg-[var(--color-primary-subtle)] p-5 sm:p-6">
      <div className="flex items-start gap-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-white text-[var(--color-primary)]"><PartyPopper className="size-5" aria-hidden="true" /></span>
        <div className="min-w-0 flex-1">
          <h2 id="offer-title" className="text-lg font-semibold">Bạn nhận được offer cho vị trí {jobTitle}</h2>
          <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">Chấp nhận để hoàn tất tuyển dụng, hoặc từ chối nếu bạn không tiếp tục. Quyết định này không thể hoàn tác.</p>
        </div>
      </div>
      {declining && (
        <label className="mt-4 block">
          <span className="mb-1.5 block text-sm font-medium">Lý do từ chối (không bắt buộc)</span>
          <textarea value={reason} onChange={(event) => setReason(event.target.value.slice(0, MAX_REASON))} rows={2} maxLength={MAX_REASON}
            className="w-full rounded-xl border border-[var(--color-border-default)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15" />
        </label>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        {declining ? (
          <>
            <Button variant="secondary" onClick={() => setDeclining(false)} disabled={pending}>Quay lại</Button>
            <Button variant="danger" onClick={() => respond.mutate(false)} disabled={pending}>
              {pending && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}Xác nhận từ chối
            </Button>
          </>
        ) : (
          <>
            <Button onClick={() => respond.mutate(true)} disabled={pending}>
              {pending && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}Chấp nhận offer
            </Button>
            <Button variant="secondary" onClick={() => setDeclining(true)} disabled={pending}>Từ chối</Button>
          </>
        )}
      </div>
    </section>
  );
}
