import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRightLeft, CheckCircle2, CreditCard, RefreshCw, Users, Zap } from "lucide-react";
import { companyApi } from "@/api/tenant/companyApi";
import { usersApi } from "@/api/tenant/usersApi";
import { Button } from "@/components/ux/Button";
import { Card } from "@/components/ux/Card";
import { Skeleton } from "@/components/ux/Skeleton";
import { getApiErrorMessage } from "@/lib/axios";
import { cn } from "@/lib/utils";
import { toast } from "@/stores/toastStore";
import { InvoiceTable } from "../components/InvoiceTable";
import { PlanChangeDialog } from "../components/PlanChangeDialog";

function formatQuotaBytes(bytes: number): string {
  if (bytes <= 0) return "0 MB";
  const mb = bytes / (1024 * 1024);
  if (mb < 1024) return `${mb.toFixed(1)} MB`;
  return `${(mb / 1024).toFixed(2)} GB`;
}

function formatSecondsToHoursLabel(seconds: number): string {
  const hours = seconds / 3600;
  if (hours > 0 && hours < 0.1) return `${Math.ceil(seconds / 60)} phút`;
  return `${hours.toFixed(1)} giờ`;
}

export function SubscriptionPage() {
  const queryClient = useQueryClient();
  const [planDialogOpen, setPlanDialogOpen] = useState(false);

  const subQuery = useQuery({
    queryKey: ["tenant-subscription-quota"],
    queryFn: companyApi.getSubscription,
  });

  const membersQuery = useQuery({
    queryKey: ["tenant-users"],
    queryFn: () => usersApi.list(),
  });

  const cancelDowngradeMutation = useMutation({
    mutationFn: () => companyApi.cancelScheduledDowngrade(),
    onSuccess: () => {
      toast.success("Đã hủy lịch hạ cấp gói cuối chu kỳ.");
      void queryClient.invalidateQueries({ queryKey: ["tenant-subscription-quota"] });
    },
    onError: (err) => {
      toast.error(getApiErrorMessage(err, "Không thể hủy lịch hạ cấp."));
    },
  });

  const sub = subQuery.data?.data;
  const activeMembersCount = (membersQuery.data?.data ?? []).filter(
    (m) => m.role !== "CANDIDATE" && m.workspace !== "CANDIDATE" && m.status === "ACTIVE",
  ).length;

  const quotaRows = sub
    ? [
        {
          id: "jobs",
          label: "Vị trí tuyển dụng đang mở (Active Jobs)",
          usedLabel: `${sub.usedJobs.toLocaleString("vi-VN")}`,
          maxLabel: sub.maxJobs < 0 ? "Không giới hạn" : `${sub.maxJobs.toLocaleString("vi-VN")} vị trí`,
          pct: sub.jobsUsagePercent,
          enabled: sub.jobsEnabled,
          allowed: sub.jobsAllowed,
          unlimited: sub.maxJobs < 0,
        },
        {
          id: "cv",
          label: "AI CV Parsing & Screening (theo tháng)",
          usedLabel: `${sub.usedCvParses.toLocaleString("vi-VN")}`,
          maxLabel: sub.maxCvParses < 0 ? "Không giới hạn" : `${sub.maxCvParses.toLocaleString("vi-VN")} CV/tháng`,
          pct: sub.cvParsesUsagePercent,
          enabled: sub.cvParseEnabled,
          allowed: sub.cvParseAllowed,
          unlimited: sub.maxCvParses < 0,
        },
        {
          id: "ai_voice",
          label: "Thời lượng Phỏng vấn AI Voice (theo tháng)",
          usedLabel: formatSecondsToHoursLabel(sub.usedAiInterviewSeconds),
          maxLabel:
            sub.maxAiInterviewHours < 0
              ? "Không giới hạn"
              : sub.maxAiInterviewHours === 0
              ? "Không hỗ trợ (0 giờ)"
              : `${sub.maxAiInterviewHours.toLocaleString("vi-VN")} giờ/tháng`,
          pct: sub.aiInterviewUsagePercent,
          enabled: sub.aiInterviewEnabled,
          allowed: sub.aiInterviewAllowed,
          unlimited: sub.maxAiInterviewHours < 0,
        },
        {
          id: "proctoring",
          label: "Giám sát thi & chống gian lận Proctoring (theo tháng)",
          usedLabel: formatSecondsToHoursLabel(sub.usedProctoringSeconds),
          maxLabel:
            sub.maxProctoringHours < 0
              ? "Không giới hạn"
              : sub.maxProctoringHours === 0
              ? "Không hỗ trợ (0 giờ)"
              : `${sub.maxProctoringHours.toLocaleString("vi-VN")} giờ/tháng`,
          pct: sub.proctoringUsagePercent,
          enabled: sub.proctoringEnabled,
          allowed: sub.proctoringAllowed,
          unlimited: sub.maxProctoringHours < 0,
        },
        {
          id: "storage",
          label: "Dung lượng lưu trữ hồ sơ & Audio/Video",
          usedLabel: formatQuotaBytes(sub.usedStorageBytes),
          maxLabel:
            sub.maxStorageGb < 0
              ? "Không giới hạn"
              : sub.maxStorageGb === 0
              ? "Không hỗ trợ (0 GB)"
              : `${sub.maxStorageGb} GB`,
          pct: sub.storageUsagePercent,
          enabled: sub.storageEnabled,
          allowed: sub.storageAllowed,
          unlimited: sub.maxStorageGb < 0,
        },
      ]
    : [];

  return (
    <section className="space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand-primary">Doanh nghiệp</p>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-[var(--color-text-primary)] sm:text-3xl">
            Gói dịch vụ &amp; Hóa đơn
          </h1>
          <p className="mt-1.5 max-w-2xl text-sm text-[var(--color-text-secondary)]">
            Theo dõi gói bản quyền hiện tại, mức sử dụng hạn mức AI/lưu trữ, đổi gói và lịch sử hóa đơn.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void subQuery.refetch()}
            disabled={subQuery.isFetching}
          >
            <RefreshCw className={cn("size-4", subQuery.isFetching && "animate-spin")} />
            Làm mới
          </Button>
          {sub && (
            <Button variant="primary" size="sm" onClick={() => setPlanDialogOpen(true)}>
              <ArrowRightLeft className="size-4" />
              Đổi gói dịch vụ
            </Button>
          )}
        </div>
      </header>

      {subQuery.isLoading && (
        <div className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
          <Card className="p-6 space-y-4">
            <Skeleton className="h-7 w-64" />
            <Skeleton className="h-24 w-full rounded-xl" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </Card>
          <Card className="p-6 space-y-4">
            <Skeleton className="h-7 w-40" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </Card>
        </div>
      )}

      {subQuery.isError && (
        <Card className="p-6">
          <p className="text-sm text-status-danger" role="alert">
            {getApiErrorMessage(subQuery.error, "Không tải được thông tin gói dịch vụ.")}
          </p>
        </Card>
      )}

      {sub && (
        <>
          {sub.subscriptionStatus === "PAST_DUE" && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900">
              <strong>Thuê bao quá hạn thanh toán (PAST_DUE — Đang trong thời gian ân hạn):</strong> Quyền lợi tuyển dụng của doanh nghiệp vẫn được duy trì tạm thời
              {sub.gracePeriodEndsAt ? ` đến ${new Date(sub.gracePeriodEndsAt).toLocaleDateString("vi-VN")}` : ""}. Vui lòng hoàn tất thanh toán hóa đơn gia hạn để tránh bị tạm khóa.
            </div>
          )}

          {sub.subscriptionStatus === "SUSPENDED" && (
            <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-xs text-red-900">
              <strong>Thuê bao đang tạm khóa (SUSPENDED):</strong> Thời gian ân hạn đã kết thúc. Quyền tạo mới vị trí tuyển dụng, lọc CV bằng AI và phỏng vấn AI tạm thời bị khóa cho tới khi gia hạn.
            </div>
          )}

          {sub.nextPlanName && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 text-xs text-blue-900">
              <span>
                <strong>Đã lên lịch hạ cấp cuối kỳ:</strong> Gói dịch vụ sẽ tự động chuyển sang{" "}
                <strong>
                  {sub.nextPlanName} ({sub.nextPlanCode})
                </strong>{" "}
                khi kết thúc chu kỳ hiện tại
                {sub.endsAt ? ` (${new Date(sub.endsAt).toLocaleDateString("vi-VN")})` : ""}. Hạn mức gói hiện tại vẫn được giữ nguyên 100%.
              </span>
              <Button
                variant="secondary"
                size="sm"
                disabled={cancelDowngradeMutation.isPending}
                onClick={() => cancelDowngradeMutation.mutate()}
              >
                Hủy lịch hạ cấp
              </Button>
            </div>
          )}

          <div className="grid gap-5 lg:grid-cols-[1.35fr_0.65fr]">
            <Card className="p-6 space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-3.5">
                <div className="flex items-start gap-3.5">
                  <span className="grid size-11 place-items-center rounded-xl bg-[var(--color-primary-soft)] text-brand-primary">
                    <Zap className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">
                        Hạn mức gói {sub.planName}
                      </h2>
                      <span className="rounded-full border border-brand-primary/25 bg-[var(--color-primary-soft)] px-2.5 py-0.5 text-xs font-bold text-brand-primary">
                        {sub.planCode} · v{sub.planVersion ?? 1}
                      </span>
                      <span className="rounded-full bg-surface-muted px-2.5 py-0.5 text-[11px] font-semibold text-[var(--color-text-secondary)]">
                        {sub.subscriptionStatus}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
                      Còn <strong>{sub.daysRemaining}</strong> ngày trong chu kỳ
                      {sub.endsAt ? ` (đến ${new Date(sub.endsAt).toLocaleDateString("vi-VN")})` : ""} · Lưu trữ bản ghi phỏng vấn:{" "}
                      <strong>
                        {sub.videoRetentionDays < 0
                          ? "Vĩnh viễn"
                          : sub.videoRetentionDays === 0
                          ? "Không lưu trữ (0 ngày)"
                          : `${sub.videoRetentionDays} ngày`}
                      </strong>
                    </p>
                  </div>
                </div>

                <div className="inline-flex items-center gap-2 rounded-xl border border-[var(--color-border-default)] bg-surface-muted px-3 py-2 text-xs font-medium text-[var(--color-text-primary)]">
                  <Users className="size-4 text-brand-primary" aria-hidden="true" />
                  <span>
                    {membersQuery.isLoading ? "…" : `${activeMembersCount} thành viên đang hoạt động`}
                  </span>
                </div>
              </div>

              <div className="space-y-4">
                {quotaRows.map((item) => {
                  const barColor = !item.enabled
                    ? "bg-slate-400"
                    : !item.allowed || item.pct >= 100
                    ? "bg-red-600"
                    : item.pct >= 85
                    ? "bg-amber-500"
                    : "bg-brand-primary";

                  return (
                    <div
                      key={item.id}
                      className="rounded-xl border border-[var(--color-border-default)] bg-surface-muted p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                        <span className="font-medium text-[var(--color-text-primary)]">{item.label}</span>
                        <div className="flex items-center gap-2">
                          {!item.enabled ? (
                            <span className="rounded-md bg-slate-200 px-2 py-0.5 text-xs font-semibold text-slate-700">
                              Không bao gồm trong gói
                            </span>
                          ) : !item.allowed ? (
                            <span className="rounded-md bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                              Đã đạt trần 100%
                            </span>
                          ) : item.unlimited ? (
                            <span className="rounded-md bg-[var(--color-primary-soft)] px-2 py-0.5 text-xs font-semibold text-brand-primary">
                              Không giới hạn
                            </span>
                          ) : null}
                          <strong className="text-brand-primary">
                            {item.usedLabel} / {item.maxLabel}
                          </strong>
                        </div>
                      </div>
                      <div className="mt-2.5 h-2.5 overflow-hidden rounded-full bg-slate-200">
                        <div
                          className={cn("h-full rounded-full transition-all duration-300", barColor)}
                          style={{ width: `${item.unlimited ? 18 : Math.min(100, item.pct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>

            <Card className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <span className="grid size-10 place-items-center rounded-xl bg-[var(--color-primary-soft)] text-brand-primary">
                  <CreditCard className="size-5" aria-hidden="true" />
                </span>
                <span className="text-xs font-medium text-[var(--color-text-secondary)]">
                  {sub.autoRenew ? "Tự động gia hạn" : "Không tự động gia hạn"}
                </span>
              </div>

              <div>
                <p className="text-sm font-medium text-[var(--color-text-secondary)]">Giá hợp đồng bảo lưu</p>
                <p className="mt-1 font-display text-3xl font-bold text-[var(--color-text-primary)]">
                  {(sub.priceYearly ?? 0).toLocaleString("vi-VN")} ₫
                  <span className="text-xs font-normal text-[var(--color-text-secondary)]"> / năm</span>
                </p>
                {sub.proratedCreditAmount != null && sub.proratedCreditAmount > 0 && (
                  <p className="mt-1 text-xs font-semibold text-emerald-700">
                    Đã khấu trừ Proration từ gói cũ: -{sub.proratedCreditAmount.toLocaleString("vi-VN")} ₫
                  </p>
                )}
                <p className="mt-2 text-xs leading-relaxed text-[var(--color-text-secondary)]">
                  {sub.description || "Gói dịch vụ SaaS Multi-Tenant đang áp dụng cho toàn bộ thành viên trong workspace."}
                </p>
              </div>

              <Button variant="primary" className="w-full" onClick={() => setPlanDialogOpen(true)}>
                <ArrowRightLeft className="size-4" />
                Xem trước &amp; Đổi gói dịch vụ
              </Button>

              {sub.features && sub.features.length > 0 && (
                <div className="border-t border-[var(--color-border-default)] pt-4 space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-text-secondary)]">
                    Quyền lợi trong gói
                  </p>
                  <ul className="space-y-1.5 text-xs text-[var(--color-text-primary)]">
                    {sub.features.map((feat, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-brand-primary" aria-hidden="true" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Card>
          </div>

          <InvoiceTable invoices={sub.invoices ?? []} />

          <PlanChangeDialog
            open={planDialogOpen}
            currentPlanCode={sub.planCode}
            onClose={() => setPlanDialogOpen(false)}
          />
        </>
      )}
    </section>
  );
}

