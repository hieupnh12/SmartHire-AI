import { useState } from "react";
import { TenantSystemLog } from "@/api/master/masterAdminApi";
import { useAuditLogs, useTenants } from "@/api/master/queries";
import { LogDetailModal } from "../components/modals/LogDetailModal";
import { useT, useLocale, formatDateTime } from "@/i18n";
import { Terminal, RefreshCw } from "lucide-react";

export function AuditLogsPage() {
  const t = useT();
  const locale = useLocale();
  const [tenantFilter, setTenantFilter] = useState<string>("ALL");
  const [logLevelFilter, setLogLevelFilter] = useState<string>("ALL");
  const [selectedLog, setSelectedLog] = useState<TenantSystemLog | null>(null);

  const { data: tenants = [] } = useTenants();
  const { data: logs = [], refetch, isFetching } = useAuditLogs(tenantFilter, logLevelFilter);

  return (
    <>
      <div className="space-y-6 animate-fade-in">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              {t("master.ops.auditLogs.title")}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Nhật ký hệ thống & lỗi ứng dụng (System / Application Logs) theo ngữ cảnh từng Tenant
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Filter by Tenant */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-500 font-medium">Doanh nghiệp:</span>
              <select
                value={tenantFilter}
                onChange={(e) => setTenantFilter(e.target.value)}
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
                onChange={(e) => setLogLevelFilter(e.target.value)}
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
              {logs.map((log) => (
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
              {logs.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 font-sans">
                    Không có log nào phù hợp với bộ lọc hiện tại.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      <LogDetailModal selectedLog={selectedLog} setSelectedLog={setSelectedLog} />
    </>
  );
}
