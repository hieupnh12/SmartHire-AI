import React, { useState, useMemo, useEffect } from "react";
import { Plus, Search, Filter, CheckCircle2, Clock, XCircle, Eye, Check, Inbox, Loader2 } from "lucide-react";
import { InvoiceItem, billingApi } from "@/api/master/billingApi";
import { useTenants, useSubscriptions, useInvoices, masterQueryKeys } from "@/api/master/queries";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/stores/toastStore";
import { useUiStore } from "@/stores/uiStore";
import { HeaderActions } from "@/features/master/shell/HeaderActions";
import { Tooltip } from "@/components/ux/Tooltip";
import { CreateInvoiceModal } from "@/features/master/billing/components/modals/CreateInvoiceModal";
import { InvoiceDetailModal } from "@/features/master/billing/components/modals/InvoiceDetailModal";
import { formatDate, formatDateTime, formatNumber, useLocale, useT } from "@/i18n";

interface InvoicesTabProps {
  invoiceTenantId: number | "";
  setInvoiceTenantId: (val: number | "") => void;
  invoicePlanId: number | "";
  setInvoicePlanId: (val: number | "") => void;
  invoiceAmount: number;
  setInvoiceAmount: (val: number) => void;
  invoiceCurrency: string;
  setInvoiceCurrency: (val: string) => void;
  invoicePaymentGateway: string;
  setInvoicePaymentGateway: (val: string) => void;
  invoiceNotes: string;
  setInvoiceNotes: (val: string) => void;
  showCreateInvoiceModal: boolean;
  setShowCreateInvoiceModal: (val: boolean) => void;
  selectedInvoice: InvoiceItem | null;
  setSelectedInvoice: (val: InvoiceItem | null) => void;
}

function InvoicesContent({
  invoiceTenantId,
  setInvoiceTenantId,
  invoicePlanId,
  setInvoicePlanId,
  invoiceAmount,
  setInvoiceAmount,
  invoiceCurrency,
  setInvoiceCurrency,
  invoicePaymentGateway,
  setInvoicePaymentGateway,
  invoiceNotes,
  setInvoiceNotes,
  showCreateInvoiceModal,
  setShowCreateInvoiceModal,
  selectedInvoice,
  setSelectedInvoice,
}: InvoicesTabProps) {
  const t = useT();
  const locale = useLocale();
  const queryClient = useQueryClient();
  const askConfirm = useUiStore((s) => s.askConfirm);
  const { data: tenants = [] } = useTenants();
  const { data: plans = [] } = useSubscriptions();
  const { data: invoices = [] } = useInvoices();
  const setInvoices = (updater: any) => queryClient.setQueryData(masterQueryKeys.invoices(), updater);

  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>("ALL");
  const [approvingId, setApprovingId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const filteredInvoices = useMemo(() => {
    return invoices.filter((i) => {
      const q = invoiceSearch.toLowerCase();
      const matchSearch =
        i.invoiceNumber.toLowerCase().includes(q) ||
        (i.tenantName && i.tenantName.toLowerCase().includes(q)) ||
        (i.tenantCode && i.tenantCode.toLowerCase().includes(q)) ||
        (i.planName && i.planName.toLowerCase().includes(q));
      const matchStatus = invoiceStatusFilter === "ALL" || i.status === invoiceStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [invoices, invoiceSearch, invoiceStatusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [invoiceSearch, invoiceStatusFilter]);

  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage) || 1;
  const paginatedInvoices = filteredInvoices.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const totalPaidAmount = useMemo(() => {
    return invoices.filter((i) => i.status === "PAID").reduce((sum, i) => sum + i.amount, 0);
  }, [invoices]);

  const pendingInvoiceAmount = useMemo(() => {
    return invoices.filter((i) => i.status === "PENDING").reduce((sum, i) => sum + i.amount, 0);
  }, [invoices]);

  const overdueInvoiceCount = useMemo(() => {
    return invoices.filter((i) => i.status === "OVERDUE").length;
  }, [invoices]);

  const [creatingInvoice, setCreatingInvoice] = useState(false);

  const handleMarkInvoicePaid = (inv: InvoiceItem) => {
    askConfirm({
      title: t("master.commerce.invoicesPage.approveModal.title", { invoiceNumber: inv.invoiceNumber }),
      description: t("master.commerce.invoicesPage.approveModal.description"),
      confirmLabel: t("master.commerce.invoicesPage.approveModal.confirmLabel"),
      onConfirm: async () => {
        setApprovingId(inv.id);
        try {
          const updated = await billingApi.approve(inv.id);
          setInvoices((prev: InvoiceItem[]) => prev.map((i) => (i.id === inv.id ? updated : i)));
          if (selectedInvoice?.id === inv.id) {
            setSelectedInvoice(updated);
          }
          toast.success(t("master.commerce.invoicesPage.approvedToast", { invoiceNumber: inv.invoiceNumber }));
        } catch (err: any) {
          const msg = err.response?.data?.message || t("master.commerce.invoicesPage.approveError");
          toast.error(msg);
        } finally {
          setApprovingId(null);
        }
      },
    });
  };

  const handleCreateInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceTenantId) {
      toast.danger(t("master.commerce.invoicesPage.selectTenantDanger"));
      return;
    }
    setCreatingInvoice(true);
    try {
      const created = await billingApi.create({
        tenantId: Number(invoiceTenantId),
        planId: invoicePlanId ? Number(invoicePlanId) : undefined,
        amount: invoiceAmount,
        currency: invoiceCurrency || "VND",
        paymentGateway: invoicePaymentGateway || "BANK_TRANSFER",
        notes: invoiceNotes || undefined,
      });
      setInvoices((prev: InvoiceItem[]) => [created, ...(prev || [])]);
      setShowCreateInvoiceModal(false);
      toast.success(t("master.commerce.invoicesPage.createdToast", { invoiceNumber: created.invoiceNumber }));
    } catch (err: any) {
      const msg = err.response?.data?.message || t("master.commerce.invoicesPage.createError");
      toast.danger(msg);
    } finally {
      setCreatingInvoice(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <HeaderActions>
        <button
          onClick={() => {
            setInvoiceTenantId(tenants[0]?.id || "");
            const defaultPlan = plans[0];
            if (defaultPlan) {
              setInvoicePlanId(defaultPlan.id || "");
              setInvoiceAmount(defaultPlan.priceYearly || 36000000);
            }
            setInvoiceNotes("");
            setShowCreateInvoiceModal(true);
          }}
          className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-blue-700"
        >
          <Plus className="size-3.5" />
          <span>{t("master.commerce.invoicesPage.createBtn")}</span>
        </button>
      </HeaderActions>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">{t("master.commerce.invoicesPage.kpiPaidTitle")}</span>
          <span className="text-lg font-extrabold text-emerald-600">
            {formatNumber(totalPaidAmount, undefined, locale)} <span className="text-[10px] font-medium text-slate-500">{t("master.commerce.common.vnd")}</span>
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">{t("master.commerce.invoicesPage.kpiPaidSub")}</span>
        </div>

        <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">{t("master.commerce.invoicesPage.kpiPendingAmountTitle")}</span>
          <span className="text-lg font-extrabold text-amber-600">
            {formatNumber(pendingInvoiceAmount, undefined, locale)} <span className="text-[10px] font-medium text-slate-500">{t("master.commerce.common.vnd")}</span>
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">{t("master.commerce.invoicesPage.kpiPendingAmountSub")}</span>
        </div>

        <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">{t("master.commerce.invoicesPage.kpiPendingCountTitle")}</span>
          <span className="text-lg font-extrabold text-blue-600">
            {invoices.filter((i) => i.status === "PENDING").length} <span className="text-[10px] font-medium text-slate-500">{t("master.commerce.invoicesPage.invoiceUnit")}</span>
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">{t("master.commerce.invoicesPage.kpiPendingCountSub")}</span>
        </div>

        <div className="p-3 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 block mb-1.5">{t("master.commerce.invoicesPage.kpiOverdueTitle")}</span>
          <span className="text-lg font-extrabold text-rose-600">
            {overdueInvoiceCount} <span className="text-[10px] font-medium text-slate-500">{t("master.commerce.invoicesPage.invoiceUnit")}</span>
          </span>
          <span className="text-[10px] text-slate-400 mt-0.5 block">{t("master.commerce.invoicesPage.kpiOverdueSub")}</span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder={t("master.commerce.invoicesPage.searchPlaceholder")}
            value={invoiceSearch}
            onChange={(e) => setInvoiceSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={invoiceStatusFilter}
            onChange={(e) => setInvoiceStatusFilter(e.target.value)}
            className="px-3 py-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 font-semibold text-slate-700 shadow-2xs"
          >
            <option value="ALL">{t("master.commerce.invoicesPage.filterAll", { count: invoices.length })}</option>
            <option value="PAID">{t("master.commerce.invoicesPage.filterPaid", { count: invoices.filter((i) => i.status === "PAID").length })}</option>
            <option value="PENDING">{t("master.commerce.invoicesPage.filterPending", { count: invoices.filter((i) => i.status === "PENDING").length })}</option>
            <option value="OVERDUE">{t("master.commerce.invoicesPage.filterOverdue", { count: invoices.filter((i) => i.status === "OVERDUE").length })}</option>
            <option value="CANCELLED">{t("master.commerce.invoicesPage.filterCancelled", { count: invoices.filter((i) => i.status === "CANCELLED").length })}</option>
          </select>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto pb-2 [scrollbar-width:thin] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-track]:bg-slate-50">
          <table className="w-full min-w-[1140px] table-fixed border-collapse text-left text-xs text-slate-600">
            <colgroup>
              <col className="w-[138px]" />
              <col />
              <col />
              <col className="w-[128px]" />
              <col className="w-[144px]" />
              <col className="w-[122px]" />
              <col className="w-[116px]" />
              <col className="w-[104px]" />
            </colgroup>
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="px-3.5 py-3.5 whitespace-nowrap">{t("master.commerce.invoicesPage.colNumber")}</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap">{t("master.commerce.invoicesPage.colCustomer")}</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap">{t("master.commerce.invoicesPage.colPlan")}</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap">{t("master.commerce.invoicesPage.colAmount")}</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap">{t("master.commerce.invoicesPage.colMethod")}</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap">{t("master.commerce.invoicesPage.colDueDate")}</th>
                <th className="px-3.5 py-3.5 whitespace-nowrap">{t("master.commerce.invoicesPage.colStatus")}</th>
                <th className="px-3.5 py-3.5 text-right whitespace-nowrap">{t("master.commerce.invoicesPage.colActions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredInvoices.length > 0 ? (
                paginatedInvoices.map((inv) => {
                  const customerName =
                    inv.tenantName || t("master.commerce.invoiceDetailModal.tenantFallback", { id: inv.tenantId });
                  const planLabel = inv.planName || t("master.commerce.invoicesPage.customPlanFallback");
                  const formattedAmount = `${formatNumber(inv.amount, undefined, locale)} ₫`;
                  const gatewayShort =
                    inv.paymentGateway === "BANK_TRANSFER"
                      ? t("master.commerce.invoicesPage.gatewayBank")
                      : inv.paymentGateway === "STRIPE"
                      ? t("master.commerce.invoicesPage.gatewayStripe")
                      : inv.paymentGateway === "VN_PAY"
                      ? t("master.commerce.invoicesPage.gatewayVnPay")
                      : inv.paymentGateway || t("master.commerce.invoicesPage.gatewayDirect");
                  const gatewayFull =
                    inv.paymentGateway === "BANK_TRANSFER"
                      ? t("master.commerce.invoiceDetailModal.gatewayBank")
                      : inv.paymentGateway === "STRIPE"
                      ? t("master.commerce.invoiceDetailModal.gatewayStripe")
                      : inv.paymentGateway === "VN_PAY"
                      ? t("master.commerce.invoiceDetailModal.gatewayVnPay")
                      : inv.paymentGateway || t("master.commerce.invoiceDetailModal.gatewayDirect");
                  const statusFull =
                    inv.status === "PAID"
                      ? t("master.commerce.billingWorkspace.invoiceStatus.PAID")
                      : inv.status === "PENDING"
                      ? t("master.commerce.billingWorkspace.invoiceStatus.PENDING")
                      : inv.status === "OVERDUE"
                      ? t("master.commerce.billingWorkspace.invoiceStatus.OVERDUE")
                      : t("master.commerce.billingWorkspace.invoiceStatus.CANCELLED");

                  return (
                    <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors group align-middle">
                      <td className="px-3.5 py-3">
                        <Tooltip
                          className="flex w-full min-w-0"
                          side="top"
                          content={
                            <span className="block space-y-0.5">
                              <span className="block font-mono font-semibold text-white">{inv.invoiceNumber}</span>
                              <span className="block text-slate-300">
                                {formatDate(inv.createdAt, undefined, locale)}
                              </span>
                              {inv.transactionId && (
                                <span className="block font-mono text-sky-300">{inv.transactionId}</span>
                              )}
                            </span>
                          }
                        >
                          <span className="min-w-0 flex-1 truncate font-mono font-bold text-blue-600 cursor-default">
                            {inv.invoiceNumber}
                          </span>
                        </Tooltip>
                      </td>

                      <td className="px-3.5 py-3">
                        <Tooltip
                          className="flex w-full min-w-0"
                          side="top"
                          content={
                            <span className="block space-y-0.5">
                              <span className="block font-semibold text-white">{customerName}</span>
                              {inv.billingLegalName && inv.billingLegalName !== customerName && (
                                <span className="block text-slate-200">{inv.billingLegalName}</span>
                              )}
                              {inv.billingTaxCode && (
                                <span className="block font-mono text-slate-300">
                                  {t("master.commerce.invoiceDetailModal.taxCodeLabel")} {inv.billingTaxCode}
                                </span>
                              )}
                              <span className="block font-mono text-slate-300">{inv.tenantCode || "code"}</span>
                              {inv.tenantSubdomain && (
                                <span className="block font-mono text-sky-300">{inv.tenantSubdomain}.smarthire.top</span>
                              )}
                            </span>
                          }
                        >
                          <span className="min-w-0 flex-1 truncate font-semibold text-slate-600 cursor-default">
                            {customerName}
                          </span>
                        </Tooltip>
                      </td>

                      <td className="px-3.5 py-3">
                        <Tooltip
                          className="flex w-full min-w-0"
                          side="top"
                          content={
                            <span className="block space-y-0.5">
                              <span className="block font-semibold text-white">{planLabel}</span>
                              {inv.billingPeriodStart && inv.billingPeriodEnd && (
                                <span className="block font-mono text-indigo-300">
                                  {inv.billingPeriodStart} → {inv.billingPeriodEnd}
                                </span>
                              )}
                              {inv.notes && <span className="block text-slate-300">{inv.notes}</span>}
                            </span>
                          }
                        >
                          <span className="min-w-0 flex-1 truncate font-medium text-slate-600 cursor-default">
                            {planLabel}
                          </span>
                        </Tooltip>
                      </td>

                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <Tooltip
                          className="flex w-full min-w-0"
                          side="top"
                          content={
                            <span className="block space-y-0.5">
                              <span className="block font-mono font-semibold text-white">{formattedAmount}</span>
                              {inv.currency && inv.currency !== "VND" && (
                                <span className="block font-mono text-slate-300">{inv.currency}</span>
                              )}
                            </span>
                          }
                        >
                          <span className="min-w-0 flex-1 truncate font-mono font-bold text-slate-600 cursor-default">
                            {formattedAmount}
                          </span>
                        </Tooltip>
                      </td>

                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <Tooltip
                          className="flex max-w-full"
                          side="top"
                          content={
                            <span className="block space-y-0.5">
                              <span className="block font-semibold text-white">{gatewayFull}</span>
                              {inv.transactionId && (
                                <span className="block font-mono text-sky-300">{inv.transactionId}</span>
                              )}
                            </span>
                          }
                        >
                          <span className="inline-flex max-w-full items-center truncate px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 cursor-default">
                            {gatewayShort}
                          </span>
                        </Tooltip>
                      </td>

                      <td className="px-3.5 py-3 text-[11px] text-slate-600 whitespace-nowrap">
                        {inv.dueDate ? (
                          <span className="font-mono">{inv.dueDate}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="px-3.5 py-3 whitespace-nowrap">
                        <Tooltip
                          side="top"
                          content={
                            <span className="block space-y-0.5">
                              <span className="block font-semibold text-white">{statusFull}</span>
                              {inv.paidAt && (
                                <span className="block font-mono text-slate-300">
                                  {formatDateTime(inv.paidAt, undefined, locale)}
                                </span>
                              )}
                            </span>
                          }
                        >
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold cursor-default ${
                              inv.status === "PAID"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : inv.status === "PENDING"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : inv.status === "OVERDUE"
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : "bg-slate-100 text-slate-600 border border-slate-300"
                            }`}
                          >
                            {inv.status === "PAID" ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : inv.status === "PENDING" ? (
                              <Clock className="w-3.5 h-3.5" />
                            ) : (
                              <XCircle className="w-3.5 h-3.5" />
                            )}
                            {inv.status === "PAID"
                              ? t("master.commerce.invoicesPage.statusPaidShort")
                              : inv.status === "PENDING"
                              ? t("master.commerce.invoicesPage.statusPendingShort")
                              : inv.status === "OVERDUE"
                              ? t("master.commerce.invoicesPage.statusOverdueShort")
                              : t("master.commerce.invoicesPage.statusCancelledShort")}
                          </span>
                        </Tooltip>
                      </td>

                      <td className="px-3.5 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1 opacity-85 group-hover:opacity-100 transition-opacity">
                          <Tooltip side="top" content={t("master.commerce.invoicesPage.detailBtn")}>
                            <button
                              type="button"
                              onClick={() => setSelectedInvoice(inv)}
                              aria-label={t("master.commerce.invoicesPage.detailBtn")}
                              className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                          </Tooltip>

                          {inv.status !== "PAID" && (
                            <Tooltip
                              side="top"
                              content={
                                approvingId === inv.id
                                  ? t("master.commerce.invoicesPage.approvingBtn")
                                  : t("master.commerce.invoicesPage.approveTitle")
                              }
                            >
                              <button
                                type="button"
                                disabled={approvingId === inv.id}
                                onClick={() => handleMarkInvoicePaid(inv)}
                                aria-label={
                                  approvingId === inv.id
                                    ? t("master.commerce.invoicesPage.approvingBtn")
                                    : t("master.commerce.invoicesPage.approveBtn")
                                }
                                className="inline-flex size-8 items-center justify-center rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white shadow-2xs transition-colors"
                              >
                                {approvingId === inv.id ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Check className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </Tooltip>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-14 text-center text-slate-400">
                    <Inbox className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <span>{t("master.commerce.invoicesPage.empty")}</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Footer */}
        {filteredInvoices.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
            <span className="text-[11px] text-slate-500">
              {t("master.commerce.invoicesPage.paginationShowingBefore")}{" "}
              <span className="font-semibold text-slate-700">{(currentPage - 1) * itemsPerPage + 1}</span> -{" "}
              <span className="font-semibold text-slate-700">{Math.min(currentPage * itemsPerPage, filteredInvoices.length)}</span>{" "}
              {t("master.commerce.invoicesPage.paginationShowingMiddle")}{" "}
              <span className="font-semibold text-slate-700">{filteredInvoices.length}</span>{" "}
              {t("master.commerce.invoicesPage.paginationShowingAfter")}
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-[11px] font-semibold transition-colors"
              >
                {t("master.commerce.common.prevPage")}
              </button>
              <span className="px-3 py-1.5 text-[11px] font-semibold text-slate-700">
                {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-[11px] font-semibold transition-colors"
              >
                {t("master.commerce.common.nextPage")}
              </button>
            </div>
          </div>
        )}
      </div>
      <CreateInvoiceModal
        showCreateInvoiceModal={showCreateInvoiceModal}
        setShowCreateInvoiceModal={setShowCreateInvoiceModal}
        tenants={tenants}
        plans={plans}
        invoiceTenantId={invoiceTenantId}
        setInvoiceTenantId={setInvoiceTenantId}
        invoicePlanId={invoicePlanId}
        setInvoicePlanId={setInvoicePlanId}
        invoiceAmount={invoiceAmount}
        setInvoiceAmount={setInvoiceAmount}
        invoiceCurrency={invoiceCurrency}
        setInvoiceCurrency={setInvoiceCurrency}
        invoicePaymentGateway={invoicePaymentGateway}
        setInvoicePaymentGateway={setInvoicePaymentGateway}
        invoiceNotes={invoiceNotes}
        setInvoiceNotes={setInvoiceNotes}
        creatingInvoice={creatingInvoice}
        handleCreateInvoiceSubmit={handleCreateInvoiceSubmit}
      />

      <InvoiceDetailModal
        selectedInvoice={selectedInvoice}
        setSelectedInvoice={setSelectedInvoice}
        handleMarkInvoicePaid={handleMarkInvoicePaid}
      />
    </div>
  );
}

export function InvoicesPage() {
  const [tenantId, setTenantId] = useState<number | "">("");
  const [planId, setPlanId] = useState<number | "">("");
  const [amount, setAmount] = useState(0);
  const [currency, setCurrency] = useState("VND");
  const [paymentGateway, setPaymentGateway] = useState("BANK_TRANSFER");
  const [notes, setNotes] = useState("");
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<InvoiceItem | null>(null);

  return (
    <InvoicesContent
      invoiceTenantId={tenantId}
      setInvoiceTenantId={setTenantId}
      invoicePlanId={planId}
      setInvoicePlanId={setPlanId}
      invoiceAmount={amount}
      setInvoiceAmount={setAmount}
      invoiceCurrency={currency}
      setInvoiceCurrency={setCurrency}
      invoicePaymentGateway={paymentGateway}
      setInvoicePaymentGateway={setPaymentGateway}
      invoiceNotes={notes}
      setInvoiceNotes={setNotes}
      showCreateInvoiceModal={creating}
      setShowCreateInvoiceModal={setCreating}
      selectedInvoice={selected}
      setSelectedInvoice={setSelected}
    />
  );
}
