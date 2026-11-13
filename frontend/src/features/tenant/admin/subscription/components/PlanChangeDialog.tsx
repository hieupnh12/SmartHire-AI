import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRightLeft, X } from "lucide-react";
import { companyApi } from "@/api/tenant/companyApi";
import { Button } from "@/components/ux/Button";
import { Skeleton } from "@/components/ux/Skeleton";
import { getApiErrorMessage } from "@/lib/axios";
import { cn } from "@/lib/utils";
import { toast } from "@/stores/toastStore";

const PLAN_CODES = ["STARTER", "PROFESSIONAL", "ENTERPRISE"] as const;

type PlanChangeDialogProps = {
  open: boolean;
  currentPlanCode: string;
  onClose: () => void;
};

export function PlanChangeDialog({ open, currentPlanCode, onClose }: PlanChangeDialogProps) {
  const queryClient = useQueryClient();
  const [selectedTargetPlan, setSelectedTargetPlan] = useState("");

  useEffect(() => {
    if (!open) {
      setSelectedTargetPlan("");
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const previewQuery = useQuery({
    queryKey: ["tenant-subscription-change-preview", selectedTargetPlan],
    queryFn: () => companyApi.previewSubscriptionChange(selectedTargetPlan),
    enabled: open && Boolean(selectedTargetPlan && selectedTargetPlan !== currentPlanCode),
  });

  const preview = previewQuery.data?.data;

  const changeMutation = useMutation({
    mutationFn: (targetPlanCode: string) => companyApi.changeSubscriptionPlan(targetPlanCode),
    onSuccess: () => {
      toast.success(
        preview?.changeType === "UPGRADE"
          ? "Đã nâng cấp gói cước thành công (áp dụng ngay kèm khấu trừ Proration)."
          : "Đã lên lịch hạ cấp gói cước vào cuối chu kỳ hiện tại.",
      );
      void queryClient.invalidateQueries({ queryKey: ["tenant-subscription-quota"] });
      onClose();
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, "Không thể thực hiện thay đổi gói cước."));
    },
  });

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="plan-change-dialog-title"
        className="w-full max-w-lg rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-surface-card p-6 shadow-[var(--shadow-elevated)] space-y-4"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border-default)] pb-3">
          <div className="flex items-center gap-2.5">
            <span className="grid size-9 place-items-center rounded-xl bg-[var(--color-primary-soft)] text-brand-primary">
              <ArrowRightLeft className="size-4" aria-hidden="true" />
            </span>
            <div>
              <h2 id="plan-change-dialog-title" className="font-display text-lg font-semibold text-[var(--color-text-primary)]">
                Thay đổi gói dịch vụ
              </h2>
              <p className="text-xs text-[var(--color-text-secondary)]">
                Gói hiện tại: <strong>{currentPlanCode}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-lg p-1.5 text-[var(--color-text-secondary)] hover:bg-surface-muted hover:text-[var(--color-text-primary)]"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="space-y-2">
          <label htmlFor="target-plan-select" className="block text-xs font-semibold text-[var(--color-text-primary)]">
            Chọn gói muốn chuyển đổi
          </label>
          <select
            id="target-plan-select"
            value={selectedTargetPlan}
            onChange={(event) => setSelectedTargetPlan(event.target.value)}
            className="min-h-10 w-full rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-surface-card px-3 text-sm font-medium text-[var(--color-text-primary)] outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15"
          >
            <option value="">-- Chọn gói dịch vụ --</option>
            {PLAN_CODES.filter((code) => code !== currentPlanCode).map((code) => (
              <option key={code} value={code}>
                Chuyển sang gói {code}
              </option>
            ))}
          </select>
        </div>

        {previewQuery.isFetching && (
          <div className="space-y-2 rounded-xl border border-[var(--color-border-default)] p-4">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        )}

        {previewQuery.isError && (
          <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-status-danger">
            {getApiErrorMessage(previewQuery.error, "Không thể xem trước thay đổi gói.")}
          </p>
        )}

        {preview && !previewQuery.isFetching && (
          <div className="space-y-3 rounded-xl border border-[var(--color-border-default)] bg-surface-muted p-4 text-xs">
            <div className="flex items-center justify-between gap-2">
              <span className="font-bold text-[var(--color-text-primary)]">
                {preview.changeType === "UPGRADE" ? "Nâng cấp giữa kỳ (Proration)" : "Hạ cấp cuối chu kỳ"}
              </span>
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                  preview.changeType === "UPGRADE"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-amber-100 text-amber-800",
                )}
              >
                {preview.effectiveTiming === "IMMEDIATE" ? "Hiệu lực ngay" : "Hiệu lực cuối kỳ"}
              </span>
            </div>

            <div className="space-y-1.5 border-t border-[var(--color-border-default)] pt-2.5 text-[var(--color-text-secondary)]">
              <div className="flex justify-between">
                <span>Giá gói {preview.targetPlanName}:</span>
                <strong className="text-[var(--color-text-primary)]">
                  {preview.targetPriceYearly.toLocaleString("vi-VN")} ₫ / năm
                </strong>
              </div>
              {preview.effectiveDate && (
                <div className="flex justify-between">
                  <span>Ngày hiệu lực:</span>
                  <strong className="text-[var(--color-text-primary)]">
                    {new Date(preview.effectiveDate).toLocaleDateString("vi-VN")}
                  </strong>
                </div>
              )}
              {preview.changeType === "UPGRADE" && (
                <>
                  <div className="flex justify-between text-emerald-700">
                    <span>Khấu trừ {preview.remainingDays}/{preview.totalCycleDays} ngày dư gói cũ:</span>
                    <strong>-{preview.proratedCreditAmount.toLocaleString("vi-VN")} ₫</strong>
                  </div>
                  <div className="flex justify-between border-t border-[var(--color-border-default)] pt-1.5 font-bold text-[var(--color-text-primary)]">
                    <span>Số tiền cần thanh toán:</span>
                    <span className="text-brand-primary">{preview.netAmountDue.toLocaleString("vi-VN")} ₫</span>
                  </div>
                </>
              )}
            </div>

            {preview.warnings && preview.warnings.length > 0 && (
              <ul className="space-y-1 rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-900">
                {preview.warnings.map((warning, idx) => (
                  <li key={idx}>{warning}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex items-center justify-end gap-2 border-t border-[var(--color-border-default)] pt-3">
          <Button variant="secondary" onClick={onClose} disabled={changeMutation.isPending}>
            Hủy
          </Button>
          <Button
            variant="primary"
            disabled={!preview?.allowed || changeMutation.isPending || previewQuery.isFetching}
            onClick={() => selectedTargetPlan && changeMutation.mutate(selectedTargetPlan)}
          >
            {changeMutation.isPending
              ? "Đang xử lý..."
              : preview?.changeType === "UPGRADE"
              ? "Xác nhận nâng cấp"
              : "Lên lịch hạ cấp"}
          </Button>
        </div>
      </div>
    </div>
  );
}

