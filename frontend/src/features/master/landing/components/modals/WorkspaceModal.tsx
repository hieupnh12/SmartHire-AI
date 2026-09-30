import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Building2, ArrowRight, KeyRound } from "lucide-react";
import { useLandingModal } from "../../context/LandingModalContext";

export function WorkspaceModal() {
  const navigate = useNavigate();
  const { showWorkspaceModal, closeWorkspaceModal } = useLandingModal();
  const [tenantCodeInput, setTenantCodeInput] = useState("");

  if (!showWorkspaceModal) return null;

  const handleSubdomainLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantCodeInput.trim()) return;
    const code = tenantCodeInput.trim().toLowerCase().replace(/[^a-z0-9-]/g, "");

    const currentHost = window.location.host;
    if (currentHost.includes("localhost")) {
      window.location.href = `http://${code}.localhost:${window.location.port || 5173}/login`;
    } else {
      window.location.href = `https://${code}.smarthire.top/login`;
    }
  };

  const handleDirectTenantJump = (code: string) => {
    const currentHost = window.location.host;
    if (currentHost.includes("localhost")) {
      window.location.href = `http://${code}.localhost:${window.location.port || 5173}/login`;
    } else {
      window.location.href = `https://${code}.smarthire.top/login`;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 max-w-md w-full text-left shadow-2xl relative">
        <button
          onClick={closeWorkspaceModal}
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 transition-colors"
          aria-label="Đóng cửa sổ"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-5 font-semibold border border-blue-200">
          <Building2 className="w-6 h-6" />
        </div>

        <h3 className="text-xl font-semibold text-slate-900 mb-1">
          Đăng Nhập Không Gian Tuyển Dụng
        </h3>
        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
          Nhập Tên miền phụ (Subdomain) hoặc Mã không gian làm việc của công ty bạn để truy cập vào cổng tuyển dụng riêng.
        </p>

        <form onSubmit={handleSubdomainLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-900 mb-1.5">
              Mã hoặc Tên Không Gian Làm Việc
            </label>
            <div className="flex rounded-lg border border-slate-300 overflow-hidden focus-within:border-blue-600 transition-colors">
              <input
                type="text"
                required
                placeholder="viettel"
                value={tenantCodeInput}
                onChange={(e) => setTenantCodeInput(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 text-slate-900 font-mono text-sm focus:outline-none"
              />
              <span className="bg-slate-100 text-slate-500 px-3.5 py-2.5 text-xs font-mono border-l border-slate-300 flex items-center">
                .smarthire.top
              </span>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-semibold text-sm shadow transition-all flex items-center justify-center gap-2"
          >
            <span>Đến Trang Đăng Nhập Riêng</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* QUICK SEED WORKSPACE SELECTOR */}
        <div className="mt-6 pt-5 border-t border-slate-100">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-2.5">
            Hoặc trải nghiệm nhanh không gian mẫu:
          </span>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleDirectTenantJump("se36")}
              className="px-2.5 py-2 rounded-lg bg-slate-50 hover:bg-blue-50 hover:text-blue-600 border border-slate-200 text-xs font-mono text-slate-700 transition-colors text-center active:scale-95"
            >
              se36
            </button>
            <button
              type="button"
              onClick={() => handleDirectTenantJump("se37")}
              className="px-2.5 py-2 rounded-lg bg-slate-50 hover:bg-blue-50 hover:text-blue-600 border border-slate-200 text-xs font-mono text-slate-700 transition-colors text-center active:scale-95"
            >
              se37
            </button>
          </div>
        </div>

        {/* LINK TO MASTER PLATFORM LOGIN */}
        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={() => {
              closeWorkspaceModal();
              navigate("/admin/login");
            }}
            className="text-xs text-slate-500 hover:text-blue-600 inline-flex items-center gap-1.5 transition-colors"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Quản trị viên nền tảng? Đăng nhập Workspace Admin</span>
          </button>
        </div>
      </div>
    </div>
  );
}
