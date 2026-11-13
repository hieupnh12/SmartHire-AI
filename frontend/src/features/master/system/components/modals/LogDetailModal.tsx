import { useState } from "react";
import { X, FileText, Copy, Check, Terminal, Globe, Server } from "lucide-react";
import { TenantSystemLog } from "@/api/master/masterAdminApi";
import { useT, useLocale, formatDateTime } from "@/i18n";

interface LogDetailModalProps {
  selectedLog: TenantSystemLog | null;
  setSelectedLog: (log: TenantSystemLog | null) => void;
}

export function LogDetailModal({ selectedLog, setSelectedLog }: LogDetailModalProps) {
  const t = useT();
  const locale = useLocale();
  const [copied, setCopied] = useState(false);

  if (!selectedLog) return null;

  const handleCopyStackTrace = async () => {
    if (!selectedLog.stackTrace) return;
    try {
      await navigator.clipboard.writeText(selectedLog.stackTrace);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl relative font-mono text-xs animate-fade-in my-8 max-h-[90vh] flex flex-col">
        <button
          type="button"
          onClick={() => setSelectedLog(null)}
          aria-label={t("master.ops.auditLogs.modal.closeAria")}
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4 font-sans shrink-0">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold border border-blue-200">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              {t("master.ops.auditLogs.modal.title")}
            </h3>
            <span className="text-xs text-slate-500">
              {t("master.ops.auditLogs.modal.entryId", { id: selectedLog.id })}
              {selectedLog.traceId && (
                <span className="ml-2 px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-mono">
                  trace: {selectedLog.traceId}
                </span>
              )}
            </span>
          </div>
        </div>

        <div className="overflow-y-auto space-y-4 pr-1">
          {/* Metadata Grid */}
          <div className="bg-slate-50 p-4 rounded-xl space-y-2.5 border border-slate-200 text-xs">
            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-sans flex items-center gap-1.5">
                <Server className="w-3.5 h-3.5" />
                {t("master.ops.auditLogs.modal.tenantCode")}
              </span>
              <span className="text-blue-600 font-bold px-2 py-0.5 bg-blue-50 rounded border border-blue-200">
                {selectedLog.tenantCode}
              </span>
            </div>

            {selectedLog.category && (
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-sans">Category</span>
                <span className="font-semibold text-slate-700 bg-white px-2 py-0.5 rounded border border-slate-200">
                  {selectedLog.category}
                </span>
              </div>
            )}

            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-sans">{t("master.ops.auditLogs.modal.action")}</span>
              <span className="font-semibold text-slate-900">{selectedLog.action}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-sans">{t("master.ops.auditLogs.modal.level")}</span>
              <span
                className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                  selectedLog.level === "INFO"
                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                    : selectedLog.level === "WARN"
                    ? "bg-amber-50 text-amber-700 border border-amber-200"
                    : "bg-rose-50 text-rose-700 border border-rose-200"
                }`}
              >
                {selectedLog.level}
              </span>
            </div>

            {selectedLog.endpoint && (
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-sans flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5" />
                  API Endpoint
                </span>
                <span className="text-slate-800 font-mono truncate max-w-xs">
                  {selectedLog.method && <strong className="text-blue-600 mr-1">{selectedLog.method}</strong>}
                  {selectedLog.endpoint}
                  {selectedLog.statusCode && (
                    <span className={`ml-1.5 font-bold ${selectedLog.statusCode >= 500 ? "text-rose-600" : "text-amber-600"}`}>
                      ({selectedLog.statusCode})
                    </span>
                  )}
                </span>
              </div>
            )}

            {selectedLog.ipAddress && (
              <div className="flex justify-between items-center">
                <span className="text-slate-500 font-sans">{t("master.ops.auditLogs.modal.ipAddress")}</span>
                <span className="text-slate-700">{selectedLog.ipAddress}</span>
              </div>
            )}

            <div className="flex justify-between items-center">
              <span className="text-slate-500 font-sans">{t("master.ops.auditLogs.modal.timestamp")}</span>
              <span className="text-slate-700">{formatDateTime(selectedLog.timestamp, undefined, locale)}</span>
            </div>

            <div className="pt-2 border-t border-slate-200/80 font-sans">
              <strong className="block text-slate-800 mb-1">{t("master.ops.auditLogs.modal.description")}</strong>
              <p className="text-slate-700 leading-relaxed bg-white p-3 rounded-lg border border-slate-200 text-xs font-mono break-words">
                {selectedLog.message || selectedLog.description}
              </p>
            </div>
          </div>

          {/* Stack Trace Section */}
          {selectedLog.stackTrace && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-4 space-y-2">
              <div className="flex items-center justify-between font-sans">
                <span className="font-semibold text-rose-900 flex items-center gap-1.5 text-xs">
                  <Terminal className="w-3.5 h-3.5 text-rose-600" />
                  Stack Trace Exception
                </span>
                <button
                  type="button"
                  onClick={handleCopyStackTrace}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-white hover:bg-slate-50 border border-rose-200 text-rose-700 text-[11px] font-medium transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copied ? "Đã sao chép" : "Copy Stack Trace"}
                </button>
              </div>
              <pre className="max-h-60 overflow-y-auto text-[11px] font-mono leading-relaxed bg-slate-900 text-slate-100 p-3 rounded-lg whitespace-pre-wrap break-all shadow-inner">
                {selectedLog.stackTrace}
              </pre>
            </div>
          )}

          {/* Metadata JSON Section */}
          {selectedLog.metadataJson && (
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2 font-sans">
              <span className="font-semibold text-slate-700 text-xs">Metadata Context</span>
              <pre className="max-h-40 overflow-y-auto text-[11px] font-mono bg-white p-3 rounded-lg border border-slate-200 text-slate-700 whitespace-pre-wrap break-all">
                {selectedLog.metadataJson}
              </pre>
            </div>
          )}
        </div>

        <div className="mt-5 pt-3 border-t border-slate-100 text-right shrink-0">
          <button
            type="button"
            onClick={() => setSelectedLog(null)}
            className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs font-sans transition-colors"
          >
            {t("master.ops.auditLogs.modal.closeBtn")}
          </button>
        </div>
      </div>
    </div>
  );
}
