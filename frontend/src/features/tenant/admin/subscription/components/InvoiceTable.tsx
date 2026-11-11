import { Receipt } from "lucide-react";
import type { TenantInvoiceItem } from "@/api/tenant/companyApi";
import { Card } from "@/components/ux/Card";
import { cn } from "@/lib/utils";

const invoiceStatusStyle: Record<string, { label: string; className: string }> = {
  PAID: { label: "Đã thanh toán", className: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  PENDING: { label: "Chờ thanh toán", className: "bg-amber-50 text-amber-800 border-amber-200" },
  OVERDUE: { label: "Quá hạn", className: "bg-red-50 text-red-700 border-red-200" },
  VOID: { label: "Đã hủy", className: "bg-slate-100 text-slate-600 border-slate-200" },
  CANCELLED: { label: "Đã hủy", className: "bg-slate-100 text-slate-600 border-slate-200" },
};

function formatDate(value?: string | null): string {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("vi-VN");
}

function formatPeriod(start?: string | null, end?: string | null): string {
  if (!start && !end) return "—";
  return `${formatDate(start)} – ${formatDate(end)}`;
}

export function InvoiceTable({ invoices }: { invoices: TenantInvoiceItem[] }) {
  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-center justify-between gap-3 border-b border-[var(--color-border-default)] px-5 py-4">
        <div className="flex items-center gap-2.5">
          <Receipt className="size-5 text-brand-primary" aria-hidden="true" />
          <div>
            <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">Lịch sử hóa đơn</h2>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Các hóa đơn gia hạn, nâng cấp gói và trạng thái thanh toán của doanh nghiệp.
            </p>
          </div>
        </div>
        <span className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-semibold text-[var(--color-text-secondary)]">
          {invoices.length} hóa đơn
        </span>
      </div>

      {invoices.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <p className="text-sm font-medium text-[var(--color-text-primary)]">Chưa có hóa đơn nào</p>
          <p className="mt-1 text-xs text-[var(--color-text-secondary)]">
            Hóa đơn phát sinh khi gia hạn hoặc nâng cấp gói dịch vụ sẽ hiển thị tại đây.
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-left text-sm">
            <thead className="bg-[var(--color-surface-container-low)] text-xs uppercase tracking-wide text-[var(--color-text-secondary)]">
              <tr>
                <th className="px-5 py-3 font-semibold">Số hóa đơn</th>
                <th className="px-4 py-3 font-semibold">Gói dịch vụ</th>
                <th className="px-4 py-3 font-semibold">Kỳ thanh toán</th>
                <th className="px-4 py-3 text-right font-semibold">Số tiền</th>
                <th className="px-4 py-3 font-semibold">Trạng thái</th>
                <th className="px-4 py-3 font-semibold">Hạn thanh toán</th>
                <th className="px-5 py-3 text-right font-semibold">Ngày thanh toán</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => {
                const statusInfo = invoiceStatusStyle[inv.status?.toUpperCase()] ?? {
                  label: inv.status || "—",
                  className: "bg-slate-100 text-slate-700 border-slate-200",
                };
                return (
                  <tr key={inv.id} className="border-t border-[var(--color-border-default)] hover:bg-surface-muted/50">
                    <td className="px-5 py-3.5 font-mono text-xs font-bold text-brand-primary">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3.5 font-medium text-[var(--color-text-primary)]">
                      {inv.planName || "Dịch vụ SmartHire"}
                    </td>
                    <td className="px-4 py-3.5 text-xs text-[var(--color-text-secondary)]">
                      {formatPeriod(inv.billingPeriodStart, inv.billingPeriodEnd)}
                    </td>
                    <td className="px-4 py-3.5 text-right font-semibold text-[var(--color-text-primary)]">
                      {Number(inv.amount || 0).toLocaleString("vi-VN")} {inv.currency || "VND"}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={cn(
                          "inline-flex items-center rounded-full border px-2.5 py-0.5 text-[11px] font-semibold",
                          statusInfo.className,
                        )}
                      >
                        {statusInfo.label}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-[var(--color-text-secondary)]">
                      {formatDate(inv.dueDate)}
                    </td>
                    <td className="px-5 py-3.5 text-right text-xs text-[var(--color-text-secondary)]">
                      {formatDate(inv.paidAt)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

