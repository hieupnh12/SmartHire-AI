import { useState } from "react";
import { createPortal } from "react-dom";
import { X, FileText, Copy, Check, Terminal, Globe, Server, AlertTriangle, Info, AlertOctagon } from "lucide-react";
import { TenantSystemLog } from "@/api/master/masterAdminApi";
import { useT, formatSimpleDateTime } from "@/i18n";

interface LogDetailModalProps {
  selectedLog: TenantSystemLog | null;
  setSelectedLog: (log: TenantSystemLog | null) => void;
}

export function LogDetailModal({ selectedLog, setSelectedLog }: LogDetailModalProps) {
  const t = useT();
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

  const getLevelBadge = (level: string) => {
    const lvl = level?.toUpperCase();
    if (lvl === "ERROR") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-rose-50 text-rose-700 border border-rose-200">
          <AlertOctagon className="size-3" />
          {level}
        </span>
      );
    }
    if (lvl === "WARN") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200">
          <AlertTriangle className="size-3" />
          {level}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
        <Info className="size-3" />
        {level}
      </span>
    );
  };

  const formattedTimestamp = selectedLog.timestamp
    ? formatSimpleDateTime(selectedLog.timestamp)
    : "—";

  return createPortal(
    <>
      <button
        type="button"
        className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs transition-opacity"
        onClick={() => setSelectedLog(null)}
        aria-label={t("master.ops.auditLogs.modal.closeAria")}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={t("master.ops.auditLogs.modal.title")}
        className="fixed inset-y-0 right-0 z-50 w-full max-w-xl sm:max-w-2xl overflow-y-auto bg-slate-50 p-6 shadow-2xl flex flex-col justify-between"
      >
        <div>
          {/* Header Banner - non-sticky, close to top edge */}
          <div className="flex items-start justify-between border-b border-slate-200 bg-white -mx-6 -mt-6 px-6 pt-3 pb-3 mb-4 shadow-2xs">
            <div>
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">
                {t("master.ops.auditLogs.modal.title")}
              </h2>
              <p className="mt-0.5 text-xs font-medium text-slate-500">
                {t("master.ops.auditLogs.modal.entryId", { id: selectedLog.id })}
                {selectedLog.tenantCode && (
                  <span className="ml-2 font-semibold text-slate-700">
                    · {selectedLog.tenantCode}
                  </span>
                )}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {selectedLog.traceId && (
                <span className="text-[11px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">
                  trace: {selectedLog.traceId}
                </span>
              )}
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="grid size-8 place-items-center rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition-colors"
                aria-label={t("master.ops.auditLogs.modal.closeAria")}
              >
                <X className="size-4" />
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {/* Section 1: Event & Metadata Overview */}
            <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
              <h3 className="flex items-center gap-2.5 font-bold text-slate-800 mb-4 text-xs uppercase tracking-wider">
                <span className="grid size-7 place-items-center rounded-lg bg-slate-100 text-slate-700">
                  <FileText className="size-4" />
                </span>
                <span>{t("master.ops.auditLogs.modal.title")}</span>
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-slate-500 block mb-1 font-sans">
                    {t("master.ops.auditLogs.modal.tenantCode").replace(/:$/, "")}
                  </span>
                  <span className="text-blue-700 font-bold px-2 py-0.5 bg-blue-50 rounded border border-blue-200 inline-block font-mono text-xs">
                    {selectedLog.tenantCode}
                  </span>
                </div>

                <div>
                  <span className="text-slate-500 block mb-1 font-sans">
                    {t("master.ops.auditLogs.modal.level").replace(/:$/, "")}
                  </span>
                  <div>{getLevelBadge(selectedLog.level)}</div>
                </div>

                <div>
                  <span className="text-slate-500 block mb-1 font-sans">
                    {t("master.ops.auditLogs.modal.action").replace(/:$/, "")}
                  </span>
                  <strong className="font-semibold text-slate-900 text-sm block">
                    {selectedLog.action}
                  </strong>
                </div>

                {selectedLog.category && (
                  <div>
                    <span className="text-slate-500 block mb-1 font-sans">Category</span>
                    <span className="font-semibold text-slate-700 bg-slate-50 px-2 py-0.5 rounded border border-slate-200 text-xs inline-block">
                      {selectedLog.category}
                    </span>
                  </div>
                )}

                <div>
                  <span className="text-slate-500 block mb-1 font-sans">
                    {t("master.ops.auditLogs.modal.timestamp").replace(/:$/, "")}
                  </span>
                  <strong className="font-medium text-slate-700 text-xs sm:text-sm block">
                    {formattedTimestamp}
                  </strong>
                </div>

                {selectedLog.ipAddress && (
                  <div>
                    <span className="text-slate-500 block mb-1 font-sans">
                      {t("master.ops.auditLogs.modal.ipAddress").replace(/:$/, "")}
                    </span>
                    <strong className="font-mono text-slate-700 text-xs sm:text-sm block">
                      {selectedLog.ipAddress}
                    </strong>
                  </div>
                )}

                {selectedLog.endpoint && (
                  <div className="sm:col-span-2">
                    <span className="text-slate-500 block mb-1 font-sans flex items-center gap-1.5">
                      <Globe className="size-3.5" />
                      API Endpoint
                    </span>
                    <div className="font-mono text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-slate-800 break-all">
                      {selectedLog.method && (
                        <strong className="text-blue-600 mr-1.5 uppercase font-bold">
                          {selectedLog.method}
                        </strong>
                      )}
                      <span>{selectedLog.endpoint}</span>
                      {selectedLog.statusCode && (
                        <span
                          className={`ml-2 font-bold ${
                            selectedLog.statusCode >= 500
                              ? "text-rose-600"
                              : selectedLog.statusCode >= 400
                              ? "text-amber-600"
                              : "text-emerald-600"
                          }`}
                        >
                          ({selectedLog.statusCode})
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {(selectedLog.message || selectedLog.description) && (
                  <div className="sm:col-span-2 pt-2 border-t border-slate-100">
                    <span className="text-slate-500 block mb-1 font-sans font-medium">
                      {t("master.ops.auditLogs.modal.description").replace(/:$/, "")}
                    </span>
                    <p className="text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs font-mono break-words leading-relaxed">
                      {selectedLog.message || selectedLog.description}
                    </p>
                  </div>
                )}
              </div>
            </section>

            {/* Section 2: Stack Trace Exception */}
            {selectedLog.stackTrace && (
              <section className="rounded-xl border border-rose-200 bg-white p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="flex items-center gap-2.5 font-bold text-rose-900 text-xs uppercase tracking-wider">
                    <span className="grid size-7 place-items-center rounded-lg bg-rose-50 text-rose-600 border border-rose-200">
                      <Terminal className="size-4" />
                    </span>
                    <span>Stack Trace Exception</span>
                  </h3>
                  <button
                    type="button"
                    onClick={handleCopyStackTrace}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-medium transition-colors shadow-2xs"
                  >
                    {copied ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                    <span>{copied ? "Đã sao chép" : "Sao chép"}</span>
                  </button>
                </div>
                <pre className="max-h-72 overflow-y-auto text-[11px] font-mono leading-relaxed bg-slate-950 text-slate-100 p-4 rounded-lg whitespace-pre-wrap break-all shadow-inner border border-slate-800">
                  {selectedLog.stackTrace}
                </pre>
              </section>
            )}

            {/* Section 3: Metadata Context */}
            {selectedLog.metadataJson && (
              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3">
                <h3 className="flex items-center gap-2.5 font-bold text-slate-800 text-xs uppercase tracking-wider">
                  <span className="grid size-7 place-items-center rounded-lg bg-slate-100 text-slate-700">
                    <Server className="size-4" />
                  </span>
                  <span>Metadata Context</span>
                </h3>
                <pre className="max-h-48 overflow-y-auto text-[11px] font-mono bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-slate-700 whitespace-pre-wrap break-all">
                  {selectedLog.metadataJson}
                </pre>
              </section>
            )}
          </div>
        </div>

        {/* Footer Actions - non-sticky */}
        <div className="mt-8 pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => setSelectedLog(null)}
            className="px-4 py-2.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 font-semibold text-xs transition-colors shadow-2xs"
          >
            {t("master.ops.auditLogs.modal.closeBtn")}
          </button>
        </div>
      </aside>
    </>,
    document.body
  );
}
