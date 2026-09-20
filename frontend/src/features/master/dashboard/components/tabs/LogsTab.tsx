import React, { useState, useMemo } from "react";
import { SystemLog } from "@/api/master/masterAdminApi";
import { useMasterDashboard } from "../../context/MasterDashboardContext";

interface LogsTabProps {
  setSelectedLog: (log: SystemLog | null) => void;
}

export function LogsTab({ setSelectedLog }: LogsTabProps) {
  const { logs } = useMasterDashboard();
  const [logLevelFilter, setLogLevelFilter] = useState<string>("ALL");

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (logLevelFilter === "ALL") return true;
      return log.level === logLevelFilter;
    });
  }, [logs, logLevelFilter]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Nhật Ký Kiểm Toán Hệ Thống (Audit Logs)
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Ghi nhận mọi hành vi quản trị, cấp phát Database và các sự kiện an toàn thông tin toàn sàn.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Lọc theo mức độ:</span>
          <select
            value={logLevelFilter}
            onChange={(e) => setLogLevelFilter(e.target.value)}
            className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 focus:border-blue-600 focus:outline-none shadow-2xs"
          >
            <option value="ALL">Tất cả mức độ</option>
            <option value="INFO">Thông tin (INFO)</option>
            <option value="WARN">Cảnh báo (WARN)</option>
            <option value="ERROR">Lỗi (ERROR)</option>
          </select>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
        <table className="w-full text-left text-xs text-slate-600">
          <thead className="bg-slate-50 text-slate-800 font-semibold border-b border-slate-200">
            <tr>
              <th className="p-4">Mã Log</th>
              <th className="p-4">Doanh Nghiệp</th>
              <th className="p-4">Hành Động</th>
              <th className="p-4">Chi Tiết Sự Kiện</th>
              <th className="p-4">Mức Độ</th>
              <th className="p-4">Thời Gian</th>
              <th className="p-4 text-right">Thao Tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredLogs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-50/80 transition-colors font-mono">
                <td className="p-4 text-slate-400">#{log.id}</td>
                <td className="p-4 font-bold text-blue-600">{log.tenantCode}</td>
                <td className="p-4 font-semibold text-slate-800">{log.action}</td>
                <td className="p-4 font-sans text-xs max-w-sm truncate text-slate-700">
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
                  {new Date(log.timestamp).toLocaleString("vi-VN")}
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => setSelectedLog(log)}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold transition-colors"
                  >
                    Xem chi tiết
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
