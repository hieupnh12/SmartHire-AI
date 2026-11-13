import React, { useState, useEffect } from "react";
import { LogOut, KeyRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { masterAuthApi } from "@/api/master/masterAuthApi";
import { useUiStore } from "@/stores/uiStore";
import { toast } from "@/stores/toastStore";
import { ChangePasswordModal } from "@/features/master/account/components/ChangePasswordModal";
import { useT } from "@/i18n";

interface AccountPageProps {
  activeTab: string;
}

export function AccountPage({ activeTab }: AccountPageProps) {
  const t = useT();
  const navigate = useNavigate();
  const askConfirm = useUiStore((state) => state.askConfirm);
  const [reducedMotion, setReducedMotion] = useState(() => localStorage.getItem("master_reduced_motion") === "true");
  const [emailNotifications, setEmailNotifications] = useState(() => localStorage.getItem("master_email_notifications") === "true");

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  useEffect(() => {
    localStorage.setItem("master_reduced_motion", String(reducedMotion));
  }, [reducedMotion]);

  useEffect(() => {
    localStorage.setItem("master_email_notifications", String(emailNotifications));
  }, [emailNotifications]);

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem("master_refresh_token");
      await masterAuthApi.logout(refreshToken);
    } catch {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem("master_access_token");
      localStorage.removeItem("master_refresh_token");
      navigate("/admin/login", { replace: true });
    }
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword.length < 12) {
      setPasswordError(t("master.ops.account.passwordTooShort"));
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError(t("master.ops.account.passwordMismatch"));
      return;
    }

    setPasswordLoading(true);
    try {
      await masterAuthApi.changePassword({
        currentPassword,
        newPassword,
      });
      setShowPasswordModal(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      toast.success(t("master.ops.account.passwordChanged"));
    } catch (err: any) {
      setPasswordError(err?.response?.data?.message || t("master.ops.account.passwordChangeFailed"));
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl animate-fade-in">
      {activeTab === "account-profile" && (
        <section aria-labelledby="account-profile-title">
          <h2 id="account-profile-title" className="mb-5 text-2xl font-bold text-slate-950">{t("master.ops.account.profile.title")}</h2>
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-5 border-b border-slate-200 p-6">
              <span className="flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-2xl font-bold text-white">W</span>
              <div>
                <p className="text-lg font-semibold text-slate-950">{t("master.ops.account.roleBadge")}</p>
                <p className="mt-1 text-sm text-slate-500">{t("master.ops.account.profile.platformAdminDesc")}</p>
              </div>
            </div>
            {[
              [t("master.ops.account.profile.fieldRole"), "WORKSPACE_ADMIN"],
              [t("master.ops.account.profile.fieldScope"), t("master.ops.account.profile.fieldScopeValue")],
              [t("master.ops.account.profile.fieldStatus"), t("master.ops.account.profile.fieldStatusValue")]
            ].map(([label, value]) => (
              <div key={label} className="grid gap-1 border-b border-slate-200 px-6 py-5 last:border-b-0 sm:grid-cols-[12rem_1fr]">
                <span className="text-sm font-semibold">{label}</span>
                <span className="text-sm text-slate-600">{value}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {activeTab === "account-security" && (
        <section aria-labelledby="account-security-title">
          <h2 id="account-security-title" className="mb-5 text-2xl font-bold text-slate-950">{t("master.ops.account.security.title")}</h2>
          <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="rounded-2xl bg-emerald-50 p-5">
              <p className="font-semibold text-emerald-900">{t("master.ops.account.security.sessionActiveTitle")}</p>
              <p className="mt-1 text-sm text-emerald-700">{t("master.ops.account.security.sessionActiveDesc")}</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setPasswordError(null);
                  setShowPasswordModal(true);
                }}
                className="flex min-h-12 items-center gap-3 rounded-xl border border-blue-200 bg-blue-50/60 px-4 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100/70"
              >
                <KeyRound className="size-5" />
                {t("master.ops.account.security.changePasswordBtn")}
              </button>
              <button
                type="button"
                onClick={() =>
                  askConfirm({
                    title: t("master.ops.account.security.logoutConfirmTitle"),
                    confirmLabel: t("master.ops.account.security.logoutConfirmLabel"),
                    danger: true,
                    onConfirm: handleLogout,
                  })
                }
                className="flex min-h-12 items-center gap-3 rounded-xl border border-rose-200 px-4 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-50"
              >
                <LogOut className="size-5" />
                {t("master.ops.account.security.logoutBtn")}
              </button>
            </div>
          </div>
        </section>
      )}

      {activeTab === "account-accessibility" && (
        <section aria-labelledby="account-accessibility-title">
          <h2 id="account-accessibility-title" className="mb-5 text-2xl font-bold text-slate-950">{t("master.ops.account.accessibility.title")}</h2>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <label className="flex cursor-pointer items-center justify-between gap-6 rounded-2xl p-4 hover:bg-slate-50">
              <span>
                <span className="block font-semibold">{t("master.ops.account.accessibility.reducedMotionTitle")}</span>
                <span className="mt-1 block text-sm text-slate-500">{t("master.ops.account.accessibility.reducedMotionDesc")}</span>
              </span>
              <input
                type="checkbox"
                checked={reducedMotion}
                onChange={(event) => setReducedMotion(event.target.checked)}
                className="size-5 accent-blue-600"
              />
            </label>
          </div>
        </section>
      )}

      {activeTab === "account-notifications" && (
        <section aria-labelledby="account-notifications-title">
          <h2 id="account-notifications-title" className="mb-5 text-2xl font-bold text-slate-950">{t("master.ops.account.notifications.title")}</h2>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <label className="flex cursor-pointer items-center justify-between gap-6 rounded-2xl p-4 hover:bg-slate-50">
              <span>
                <span className="block font-semibold">{t("master.ops.account.notifications.emailNotifTitle")}</span>
                <span className="mt-1 block text-sm text-slate-500">{t("master.ops.account.notifications.emailNotifDesc")}</span>
              </span>
              <input
                type="checkbox"
                checked={emailNotifications}
                onChange={(event) => setEmailNotifications(event.target.checked)}
                className="size-5 accent-blue-600"
              />
            </label>
          </div>
        </section>
      )}

      <ChangePasswordModal
        showPasswordModal={showPasswordModal}
        setShowPasswordModal={setShowPasswordModal}
        currentPassword={currentPassword}
        setCurrentPassword={setCurrentPassword}
        newPassword={newPassword}
        setNewPassword={setNewPassword}
        confirmPassword={confirmPassword}
        setConfirmPassword={setConfirmPassword}
        passwordError={passwordError}
        passwordLoading={passwordLoading}
        handleChangePasswordSubmit={handleChangePasswordSubmit}
      />
    </div>
  );
}
