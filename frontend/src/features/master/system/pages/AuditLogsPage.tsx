import { useState, useMemo } from "react";
import { AuditLog } from "@/api/master/masterAdminApi";
import { useAuditLogs } from "@/api/master/queries";
import { LogDetailModal } from "../components/modals/LogDetailModal";
import { useT, useLocale, formatDateTime } from "@/i18n";

export function AuditLogsPage() {
  const t = useT();
  const locale = useLocale();
  const { data: logs = [] } = useAuditLogs();
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [logLevelFilter, setLogLevelFilter] = useState<string>("ALL");

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (logLevelFilter === "ALL") return true;
      return log.level === logLevelFilter;
    });
  }, [logs, logLevelFilter]);

  return (
    <>
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-600">
            {t("master.ops.auditLogs.title")}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {t("master.ops.auditLogs.subtitle")}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">{t("master.ops.auditLogs.filterLabel")}</span>
          <select
            value={logLevelFilter}
            onChange={(e) => setLogLevelFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 focus:border-blue-600 focus:outline-none shadow-2xs"
          >
            <option value="ALL">{t("master.ops.auditLogs.filterAll")}</option>
            <option value="INFO">{t("master.ops.auditLogs.filterInfo")}</option>
            <option value="WARN">{t("master.ops.auditLogs.filterWarn")}</option>
            <option value="ERROR">{t("master.ops.auditLogs.filterError")}</option>
          </select>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-2xs">
        <table className="w-full min-w-[820px] text-left text-xs text-slate-600">
          <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
            <tr>
              <th className="p-4">{t("master.ops.auditLogs.colLogId")}</th>
              <th className="p-4">{t("master.ops.auditLogs.colCompany")}</th>
              <th className="p-4">{t("master.ops.auditLogs.colAction")}</th>
              <th className="p-4">{t("master.ops.auditLogs.colDetails")}</th>
              <th className="p-4">{t("master.ops.auditLogs.colLevel")}</th>
              <th className="p-4">{t("master.ops.auditLogs.colTime")}</th>
              <th className="p-4 text-right">{t("master.ops.auditLogs.colActions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredLogs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50/80 transition-colors font-mono">
                <td className="p-4 text-slate-600">#{log.id}</td>
                <td className="p-4 font-bold text-slate-600">{log.tenantCode}</td>
                <td className="p-4 font-semibold text-slate-600">{log.action}</td>
                <td className="p-4 font-sans text-xs max-w-sm truncate text-slate-600">
                  {log.description}
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
                    className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold transition-colors"
                  >
                    {t("master.ops.auditLogs.viewDetailBtn")}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    <LogDetailModal selectedLog={selectedLog} setSelectedLog={setSelectedLog} />
    </>
  );
}
