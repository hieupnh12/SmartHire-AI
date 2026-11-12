import React from "react";
import { X, KeyRound, XCircle } from "lucide-react";
import { useT } from "@/i18n";

interface ChangePasswordModalProps {
  showPasswordModal: boolean;
  setShowPasswordModal: (val: boolean) => void;
  currentPassword: string;
  setCurrentPassword: (val: string) => void;
  newPassword: string;
  setNewPassword: (val: string) => void;
  confirmPassword: string;
  setConfirmPassword: (val: string) => void;
  passwordError: string | null;
  passwordLoading: boolean;
  handleChangePasswordSubmit: (e: React.FormEvent) => void;
}

export function ChangePasswordModal({
  showPasswordModal,
  setShowPasswordModal,
  currentPassword,
  setCurrentPassword,
  newPassword,
  setNewPassword,
  confirmPassword,
  setConfirmPassword,
  passwordError,
  passwordLoading,
  handleChangePasswordSubmit,
}: ChangePasswordModalProps) {
  const t = useT();
  if (!showPasswordModal) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative animate-fade-in">
        <button
          type="button"
          onClick={() => setShowPasswordModal(false)}
          aria-label={t("master.ops.account.passwordModal.closeAria")}
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-800"
        >
          <X className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold border border-blue-200">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">{t("master.ops.account.passwordModal.title")}</h3>
            <span className="text-xs text-slate-500">{t("master.ops.account.passwordModal.subtitle")}</span>
          </div>
        </div>

        {passwordError && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-xs flex items-start gap-2">
            <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{passwordError}</span>
          </div>
        )}

        <form onSubmit={handleChangePasswordSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">{t("master.ops.account.passwordModal.currentPasswordLabel")}</label>
            <input
              type="password"
              required
              placeholder="••••••••••••"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">{t("master.ops.account.passwordModal.newPasswordLabel")}</label>
            <input
              type="password"
              required
              placeholder="••••••••••••"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">{t("master.ops.account.passwordModal.confirmPasswordLabel")}</label>
            <input
              type="password"
              required
              placeholder="••••••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={() => setShowPasswordModal(false)}
              className="w-1/2 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold"
            >
              {t("master.ops.account.passwordModal.cancelBtn")}
            </button>
            <button
              type="submit"
              disabled={passwordLoading}
              className="w-1/2 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50"
            >
              {passwordLoading
                ? t("master.ops.account.passwordModal.updatingBtn")
                : t("master.ops.account.passwordModal.saveBtn")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
