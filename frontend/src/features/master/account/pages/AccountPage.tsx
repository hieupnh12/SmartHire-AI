import React, { useState, useEffect } from "react";
import { LogOut, KeyRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { masterAuthApi } from "@/api/master/masterAuthApi";
import { useUiStore } from "@/stores/uiStore";
import { toast } from "@/stores/toastStore";
import { ChangePasswordModal } from "@/features/master/account/components/ChangePasswordModal";

interface AccountPageProps {
  activeTab: string;
}

export function AccountPage({ activeTab }: AccountPageProps) {
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
      setPasswordError("Mật khẩu mới phải có tối thiểu 12 ký tự.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Mật khẩu xác nhận không khớp.");
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
      toast.success("Đổi mật khẩu quản trị thành công!");
    } catch (err: any) {
      setPasswordError(err?.response?.data?.message || "Không thể đổi mật khẩu. Vui lòng kiểm tra lại mật khẩu hiện tại.");
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl animate-fade-in">
      <div className="mb-7 rounded-3xl border border-slate-200 bg-gradient-to-br from-cyan-50 via-white to-violet-50 px-6 py-8 sm:px-10">
        <p className="text-sm font-semibold text-blue-700">Workspace Admin</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Quản lý tài khoản</h1>
        <p className="mt-2 text-sm text-slate-600">Quản lý hồ sơ, bảo mật và các tùy chọn cá nhân của bạn.</p>
      </div>

      {activeTab === "account-profile" && (
        <section aria-labelledby="account-profile-title">
          <h2 id="account-profile-title" className="mb-5 text-2xl font-bold text-slate-950">Hồ sơ của bạn</h2>
          <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex items-center gap-5 border-b border-slate-200 p-6">
              <span className="flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-2xl font-bold text-white">W</span>
              <div>
                <p className="text-lg font-semibold text-slate-950">Workspace Admin</p>
                <p className="mt-1 text-sm text-slate-500">Quản trị viên nền tảng SmartHire.AI</p>
              </div>
            </div>
            {[
              ["Vai trò", "WORKSPACE_ADMIN"],
              ["Phạm vi", "Master Platform"],
              ["Trạng thái", "Đang hoạt động"]
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
          <h2 id="account-security-title" className="mb-5 text-2xl font-bold text-slate-950">Tài khoản và bảo mật</h2>
          <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="rounded-2xl bg-emerald-50 p-5">
              <p className="font-semibold text-emerald-900">Phiên đăng nhập đang hoạt động</p>
              <p className="mt-1 text-sm text-emerald-700">Tài khoản đã được xác thực bằng Master Auth.</p>
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
                Đổi mật khẩu quản trị
              </button>
              <button
                type="button"
                onClick={() => askConfirm({ title: "Đăng xuất khỏi SmartHire?", confirmLabel: "Đăng xuất", danger: true, onConfirm: handleLogout })}
                className="flex min-h-12 items-center gap-3 rounded-xl border border-rose-200 px-4 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-50"
              >
                <LogOut className="size-5" />
                Đăng xuất khỏi thiết bị này
              </button>
            </div>
          </div>
        </section>
      )}

      {activeTab === "account-accessibility" && (
        <section aria-labelledby="account-accessibility-title">
          <h2 id="account-accessibility-title" className="mb-5 text-2xl font-bold text-slate-950">Khả năng tiếp cận</h2>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <label className="flex cursor-pointer items-center justify-between gap-6 rounded-2xl p-4 hover:bg-slate-50">
              <span>
                <span className="block font-semibold">Giảm hiệu ứng chuyển động</span>
                <span className="mt-1 block text-sm text-slate-500">Hạn chế hoạt ảnh không cần thiết trong giao diện.</span>
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
          <h2 id="account-notifications-title" className="mb-5 text-2xl font-bold text-slate-950">Tùy chọn thông báo</h2>
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <label className="flex cursor-pointer items-center justify-between gap-6 rounded-2xl p-4 hover:bg-slate-50">
              <span>
                <span className="block font-semibold">Thông báo qua email</span>
                <span className="mt-1 block text-sm text-slate-500">Nhận thông báo quản trị và trạng thái tenant qua email.</span>
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
