import React, { useState, useEffect } from "react";
import { LogOut, KeyRound, CircleUserRound, ShieldCheck, Eye, Bell, LucideIcon } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { masterAuthApi } from "@/api/master/masterAuthApi";
import { useUiStore } from "@/stores/uiStore";
import { toast } from "@/stores/toastStore";
import { ChangePasswordModal } from "@/features/master/account/components/ChangePasswordModal";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";

export type AccountTab = "profile" | "security" | "accessibility" | "notifications";

interface AccountPageProps {
  activeTab?: string;
}

export function AccountPage({ activeTab: propTab }: AccountPageProps = {}) {
  const t = useT();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const askConfirm = useUiStore((state) => state.askConfirm);
  const [reducedMotion, setReducedMotion] = useState(() => localStorage.getItem("master_reduced_motion") === "true");
  const [emailNotifications, setEmailNotifications] = useState(() => localStorage.getItem("master_email_notifications") === "true");

  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const resolveTab = (tab?: string | null): AccountTab => {
    if (!tab) return "profile";
    const cleaned = tab.replace("account-", "");
    if (cleaned === "security") return "security";
    if (cleaned === "accessibility") return "accessibility";
    if (cleaned === "notifications") return "notifications";
    return "profile";
  };

  const currentTab = resolveTab(searchParams.get("tab") || propTab);

  const handleTabChange = (tab: AccountTab) => {
    setSearchParams({ tab }, { replace: true });
  };

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

  const tabs: { id: AccountTab; label: string; icon: LucideIcon }[] = [
    { id: "profile", label: t("master.ops.account.profile.title"), icon: CircleUserRound },
    { id: "security", label: t("master.ops.account.security.title"), icon: ShieldCheck },
    { id: "accessibility", label: t("master.ops.account.accessibility.title"), icon: Eye },
    { id: "notifications", label: t("master.ops.account.notifications.title"), icon: Bell },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">{t("master.ops.account.pageTitle")}</h1>
        <p className="mt-1 text-sm text-slate-500">{t("master.ops.account.pageSubtitle")}</p>
      </div>

      <nav className="flex flex-wrap items-center gap-1 border-b border-slate-200 pb-px" aria-label={t("master.ops.account.pageTitle")}>
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => handleTabChange(id)}
            aria-current={currentTab === id ? "page" : undefined}
            className={cn(
              "flex min-h-10 items-center gap-2 rounded-xl px-4 text-sm font-semibold transition-colors",
              currentTab === id
                ? "bg-blue-50 text-blue-700"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            )}
          >
            <Icon className="size-4 shrink-0" />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      {currentTab === "profile" && (
        <section aria-labelledby="account-profile-title">
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xs">
            <div className="flex items-center gap-5 border-b border-slate-200 p-6">
              <span className="flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-2xl font-bold text-white shadow-xs">W</span>
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
                <span className="text-sm font-semibold text-slate-800">{label}</span>
                <span className="text-sm text-slate-600">{value}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {currentTab === "security" && (
        <section aria-labelledby="account-security-title">
          <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
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
                className="flex min-h-11 items-center gap-2.5 rounded-xl border border-blue-200 bg-blue-50/60 px-4 text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-100/70"
              >
                <KeyRound className="size-4" />
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
                className="flex min-h-11 items-center gap-2.5 rounded-xl border border-rose-200 px-4 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-50"
              >
                <LogOut className="size-4" />
                {t("master.ops.account.security.logoutBtn")}
              </button>
            </div>
          </div>
        </section>
      )}

      {currentTab === "accessibility" && (
        <section aria-labelledby="account-accessibility-title">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
            <label className="flex cursor-pointer items-center justify-between gap-6 rounded-2xl p-4 transition-colors hover:bg-slate-50">
              <span>
                <span className="block font-semibold text-slate-900">{t("master.ops.account.accessibility.reducedMotionTitle")}</span>
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

      {currentTab === "notifications" && (
        <section aria-labelledby="account-notifications-title">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs">
            <label className="flex cursor-pointer items-center justify-between gap-6 rounded-2xl p-4 transition-colors hover:bg-slate-50">
              <span>
                <span className="block font-semibold text-slate-900">{t("master.ops.account.notifications.emailNotifTitle")}</span>
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
