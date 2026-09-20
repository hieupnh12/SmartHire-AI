import React from "react";
import { X, FileText } from "lucide-react";
import { SystemLog } from "@/api/master/masterAdminApi";

interface LogDetailModalProps {
  selectedLog: SystemLog | null;
  setSelectedLog: (log: SystemLog | null) => void;
}

export function LogDetailModal({ selectedLog, setSelectedLog }: LogDetailModalProps) {
  if (!selectedLog) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-6">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative font-mono text-xs animate-fade-in">
        <button
          onClick={() => setSelectedLog(null)}
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-800"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3 mb-4 font-sans">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold border border-blue-200">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Chi Tiết Nhật Ký Kiểm Toán</h3>
            <span className="text-xs text-slate-500">Log Entry #{selectedLog.id}</span>
          </div>
        </div>

        <div className="bg-slate-50 p-4 rounded-xl space-y-2.5 border border-slate-200">
          <div className="flex justify-between">
            <span className="text-slate-500 font-sans">Tenant Code:</span>
            <span className="text-blue-600 font-bold">{selectedLog.tenantCode}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-sans">Hành động:</span>
            <span className="font-semibold text-slate-900">{selectedLog.action}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-sans">Mức độ cảnh báo:</span>
            <span
              className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                selectedLog.level === "INFO"
                  ? "bg-blue-50 text-blue-700"
                  : selectedLog.level === "WARN"
                  ? "bg-amber-50 text-amber-700"
                  : "bg-rose-50 text-rose-700"
              }`}
            >
              {selectedLog.level}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-sans">Địa chỉ IP:</span>
            <span className="text-slate-700">{selectedLog.ipAddress}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500 font-sans">Thời điểm:</span>
            <span className="text-slate-700">{new Date(selectedLog.timestamp).toLocaleString("vi-VN")}</span>
          </div>
          <div className="pt-2 border-t border-slate-200/80 font-sans">
            <strong className="block text-slate-800 mb-1">Mô tả sự kiện:</strong>
            <p className="text-slate-600 leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200 text-xs">
              {selectedLog.description}
            </p>
          </div>
        </div>

        <div className="mt-5 text-right">
          <button
            onClick={() => setSelectedLog(null)}
            className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs font-sans"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}
