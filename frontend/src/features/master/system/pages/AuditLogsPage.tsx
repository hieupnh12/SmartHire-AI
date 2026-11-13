import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { TenantSystemLog } from "@/api/master/masterAdminApi";
import { useAuditLogs, useTenants } from "@/api/master/queries";
import { LogDetailModal } from "../components/modals/LogDetailModal";
import { useT, useLocale, formatDateTime } from "@/i18n";
import {
  Terminal,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;

function getPaginationItems(current: number, total: number): (number | "ellipsis-start" | "ellipsis-end")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }
  const showStartEllipsis = current > 4;
  const showEndEllipsis = current < total - 3;
  if (!showStartEllipsis && showEndEllipsis) {
    return [1, 2, 3, 4, 5, "ellipsis-end", total];
  }
  if (showStartEllipsis && !showEndEllipsis) {
    return [1, "ellipsis-start", total - 4, total - 3, total - 2, total - 1, total];
  }
  return [1, "ellipsis-start", current - 1, current, current + 1, "ellipsis-end", total];
}

export function AuditLogsPage() {
  const t = useT();
  const locale = useLocale();
  const [params, setParams] = useSearchParams();

  const requestedPage = Math.max(1, parseInt(params.get("page") || "1", 10) || 1);
  const rawSize = parseInt(params.get("limit") || params.get("size") || "25", 10);
  const requestedSize = (PAGE_SIZE_OPTIONS as readonly number[]).includes(rawSize) ? rawSize : 25;
  const requestedTenant = params.get("tenant") || "ALL";
  const requestedLevel = params.get("level") || "ALL";

  const [page, setPage] = useState(requestedPage);
  const [pageSize, setPageSize] = useState(requestedSize);
  const [tenantFilter, setTenantFilter] = useState<string>(requestedTenant);
  const [logLevelFilter, setLogLevelFilter] = useState<string>(requestedLevel);
  const [selectedLog, setSelectedLog] = useState<TenantSystemLog | null>(null);

  // Synchronize when browser Back / Forward is clicked
  useEffect(() => {
    const p = Math.max(1, parseInt(params.get("page") || "1", 10) || 1);
    const raw = parseInt(params.get("limit") || params.get("size") || "25", 10);
    const s = (PAGE_SIZE_OPTIONS as readonly number[]).includes(raw) ? raw : 25;
    const tCode = params.get("tenant") || "ALL";
    const lvl = params.get("level") || "ALL";

    if (p !== page) setPage(p);
    if (s !== pageSize) setPageSize(s);
    if (tCode !== tenantFilter) setTenantFilter(tCode);
    if (lvl !== logLevelFilter) setLogLevelFilter(lvl);
  }, [params]);

  const { data: tenants = [] } = useTenants();
  const { data: logs = [], refetch, isFetching } = useAuditLogs(tenantFilter, logLevelFilter);

  const totalItems = logs.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;

  const paginatedLogs = useMemo(
    () => logs.slice(startIndex, startIndex + pageSize),
    [logs, startIndex, pageSize]
  );

  const pageItems = useMemo(
    () => getPaginationItems(currentPage, totalPages),
    [currentPage, totalPages]
  );

  const updateUrlParams = (newPage: number, newSize: number, newTenant: string, newLevel: string) => {
    const next = new URLSearchParams(params);
    next.set("page", String(newPage));
    next.set("limit", String(newSize));
    next.delete("size");
    if (newTenant && newTenant !== "ALL") {
      next.set("tenant", newTenant);
    } else {
      next.delete("tenant");
    }
    if (newLevel && newLevel !== "ALL") {
      next.set("level", newLevel);
    } else {
      next.delete("level");
    }
    setParams(next, { replace: true });
  };

  const goToPage = (nextPage: number, nextSize: number = pageSize) => {
    const calcTotalPages = Math.max(1, Math.ceil(totalItems / nextSize));
    const target = Math.max(1, Math.min(nextPage, calcTotalPages));
    setPage(target);
    if (nextSize !== pageSize) setPageSize(nextSize);
    updateUrlParams(target, nextSize, tenantFilter, logLevelFilter);
  };

  const handleTenantChange = (newTenant: string) => {
    setTenantFilter(newTenant);
    setPage(1);
    updateUrlParams(1, pageSize, newTenant, logLevelFilter);
  };

  const handleLevelChange = (newLevel: string) => {
    setLogLevelFilter(newLevel);
    setPage(1);
    updateUrlParams(1, pageSize, tenantFilter, newLevel);
  };

  // Boundary check when log items shrink
  useEffect(() => {
    if (!isFetching && totalItems > 0 && page > totalPages) {
      goToPage(totalPages);
    }
  }, [isFetching, totalItems, page, totalPages]);

  return (
    <>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-sm sm:text-base font-semibold text-slate-600">
              {t("master.ops.auditLogs.title")}
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filter by Tenant */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 font-medium">Doanh nghiệp:</span>
              <select
                value={tenantFilter}
                onChange={(e) => handleTenantChange(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 focus:border-blue-600 focus:outline-none shadow-2xs font-sans"
              >
                <option value="ALL">Tất cả Doanh nghiệp</option>
                <option value="SYSTEM">Hệ thống chung (SYSTEM)</option>
                {tenants.map((item) => (
                  <option key={item.id} value={item.code}>
                    {item.name} ({item.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Filter by Level */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 font-medium">{t("master.ops.auditLogs.filterLabel")}:</span>
              <select
                value={logLevelFilter}
                onChange={(e) => handleLevelChange(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 focus:border-blue-600 focus:outline-none shadow-2xs"
              >
                <option value="ALL">{t("master.ops.auditLogs.filterAll")}</option>
                <option value="ERROR">{t("master.ops.auditLogs.filterError")}</option>
                <option value="WARN">{t("master.ops.auditLogs.filterWarn")}</option>
                <option value="INFO">{t("master.ops.auditLogs.filterInfo")}</option>
              </select>
            </div>

            {/* Refresh Button */}
            <button
              type="button"
              onClick={() => refetch()}
              disabled={isFetching}
              title="Làm mới danh sách log"
              className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 disabled:opacity-50 transition-colors shadow-2xs"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin text-blue-600" : ""}`} />
            </button>
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-2xs">
          <table className="w-full min-w-[860px] text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-4">{t("master.ops.auditLogs.colLogId")}</th>
                <th className="p-4">{t("master.ops.auditLogs.colCompany")}</th>
                <th className="p-4">Phân loại</th>
                <th className="p-4">{t("master.ops.auditLogs.colAction")}</th>
                <th className="p-4">{t("master.ops.auditLogs.colDetails")}</th>
                <th className="p-4">{t("master.ops.auditLogs.colLevel")}</th>
                <th className="p-4">{t("master.ops.auditLogs.colTime")}</th>
                <th className="p-4 text-right">{t("master.ops.auditLogs.colActions")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition-colors font-mono">
                  <td className="p-4 text-slate-500">#{log.id}</td>
                  <td className="p-4 font-bold text-slate-700">
                    <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[11px]">
                      {log.tenantCode}
                    </span>
                  </td>
                  <td className="p-4 font-sans text-slate-500 text-[11px]">
                    {log.category || "APPLICATION"}
                  </td>
                  <td className="p-4 font-semibold text-slate-700">{log.action}</td>
                  <td className="p-4 font-sans text-xs max-w-sm truncate text-slate-600">
                    <div className="flex items-center gap-1.5">
                      {log.stackTrace && (
                        <span title="Chứa Stack Trace lỗi">
                          <Terminal className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                        </span>
                      )}
                      <span className="truncate">{log.message || log.description}</span>
                    </div>
                  </td>
                  <td className="p-4">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        log.level === "INFO"
                          ? "bg-blue-50 text-blue-700 border border-blue-200"
                          : log.level === "WARN"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                    >
                      {log.level}
                    </span>
                  </td>
                  <td className="p-4 text-slate-500 text-[11px]">
                    {formatDateTime(log.timestamp, undefined, locale)}
                  </td>
                  <td className="p-4 text-right">
                    <button
                      onClick={() => setSelectedLog(log)}
                      className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold transition-colors font-sans"
                    >
                      {t("master.ops.auditLogs.viewDetailBtn")}
                    </button>
                  </td>
                </tr>
              ))}
              {paginatedLogs.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 font-sans">
                    Không có log nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Minimalist Pagination (Chỉ hiển thị khi có trên 10 logs và không bọc khung) */}
        {totalItems > 10 && (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-1 text-xs text-slate-500">
            {/* Left: Hiển thị 25 dòng & Hiển thị 1 - 14 / 14 log */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5">
                <span>Hiển thị</span>
                <select
                  aria-label="Số dòng mỗi trang"
                  value={pageSize}
                  onChange={(e) => {
                    const nextSize = Number(e.target.value);
                    goToPage(1, nextSize);
                  }}
                  className="h-7 rounded-md border border-slate-200 bg-white px-2 text-xs font-medium text-slate-700 outline-none hover:border-slate-300 focus:border-blue-600 cursor-pointer"
                >
                  {PAGE_SIZE_OPTIONS.map((size) => (
                    <option key={size} value={size}>
                      {size} dòng
                    </option>
                  ))}
                </select>
              </div>

              <span>
                Hiển thị {startIndex + 1} - {Math.min(startIndex + pageSize, totalItems)} / {totalItems} log
              </span>

              {isFetching && (
                <span className="inline-flex items-center gap-1 text-[11px] text-blue-600">
                  <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
                </span>
              )}
            </div>

            {/* Right: <  1  2  3  > */}
            <div className="flex items-center gap-1">
              {/* Previous [<] */}
              <button
                type="button"
                aria-label="Trang trước"
                title="Trang trước"
                disabled={currentPage <= 1}
                onClick={() => goToPage(currentPage - 1)}
                className="inline-flex size-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="size-4" aria-hidden="true" />
              </button>

              {/* Page Numbers */}
              <div className="flex items-center gap-1">
                {pageItems.map((item, idx) => {
                  if (typeof item !== "number") {
                    return (
                      <span
                        key={`${item}-${idx}`}
                        className="px-1 text-slate-400 select-none"
                        aria-hidden="true"
                      >
                        …
                      </span>
                    );
                  }

                  const isActive = item === currentPage;
                  return (
                    <button
                      key={item}
                      type="button"
                      aria-label={`Trang ${item}`}
                      aria-current={isActive ? "page" : undefined}
                      onClick={() => goToPage(item)}
                      className={cn(
                        "inline-flex min-w-7 h-7 px-2 items-center justify-center rounded-md text-xs font-semibold transition-colors",
                        isActive
                          ? "bg-blue-600 text-white"
                          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                      )}
                    >
                      {item}
                    </button>
                  );
                })}
              </div>

              {/* Next [>] */}
              <button
                type="button"
                aria-label="Trang sau"
                title="Trang sau"
                disabled={currentPage >= totalPages}
                onClick={() => goToPage(currentPage + 1)}
                className="inline-flex size-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="size-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        )}
      </div>
      <LogDetailModal selectedLog={selectedLog} setSelectedLog={setSelectedLog} />
    </>
  );
}
