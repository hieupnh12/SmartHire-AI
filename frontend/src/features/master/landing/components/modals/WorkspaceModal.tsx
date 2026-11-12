import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { X, Building2, ArrowRight, KeyRound } from "lucide-react";
import { useT } from "@/i18n";
import { useLandingModal } from "../../context/LandingModalContext";

export function WorkspaceModal() {
  const t = useT();
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
      window.location.href = `http://${code}.localhost:${window.location.port || 5173}/internal/login`;
    } else {
      window.location.href = `https://${code}.smarthire.top/internal/login`;
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-6 animate-fade-in">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 max-w-md w-full text-left shadow-2xl relative">
        <button
          onClick={closeWorkspaceModal}
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-900 transition-colors"
          aria-label={t("master.landingChrome.modals.closeWindowAria")}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center mb-5 font-semibold border border-blue-200">
          <Building2 className="w-6 h-6" />
        </div>

        <h3 className="text-xl font-semibold text-slate-900 mb-1">
          {t("master.landingChrome.modals.workspace.title")}
        </h3>
        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
          {t("master.landingChrome.modals.workspace.subtitle")}
        </p>

        <form onSubmit={handleSubdomainLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-900 mb-1.5">
              {t("master.landingChrome.modals.workspace.fieldLabel")}
            </label>
            <div className="flex rounded-lg border border-slate-300 overflow-hidden focus-within:border-blue-600 transition-colors">
              <input
                type="text"
                required
                placeholder={t("master.landingChrome.modals.workspace.placeholder")}
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
            <span>{t("master.landingChrome.modals.workspace.submitBtn")}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* LINK TO MASTER PLATFORM LOGIN */}
        <div className="mt-6 pt-5 border-t border-slate-100 text-center">
          <button
            type="button"
            onClick={() => {
              closeWorkspaceModal();
              navigate("/admin/login");
            }}
            className="text-xs text-slate-500 hover:text-blue-600 inline-flex items-center gap-1.5 transition-colors"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>{t("master.landingChrome.modals.workspace.adminPrompt")}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
