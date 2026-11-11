import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useLocation } from "react-router-dom";
import { authApi } from "@/api/tenant/authApi";
import { useAuthStore } from "../stores/authStore";
import { getApiErrorMessage } from "@/lib/axios";
import { useT, type TranslateFn } from "@/i18n";
import { LanguageSwitcher } from "@/components/ux/LanguageSwitcher";
import { toast } from "@/stores/toastStore";
import { getTenantIdFromWindow, buildTenantUrl } from "@/lib/tenant";
import { recruiterHomePath, isAllowedRecruiterPath } from "@/features/tenant/recruiter/permissions";
import { workspaceOf } from "@/features/tenant/auth/workspace";
import type { RoleWorkspace } from "@/types/api";
import { getTenantTheme, getTenantThemeStyle } from "@/lib/tenantTheme";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  KeyRound,
  X,
  Loader2,
} from "lucide-react";

function createLoginSchema(t: TranslateFn) {
  return z.object({
    email: z.string().email(t("auth.validation.emailInvalid")),
    password: z.string().min(6, t("auth.validation.passwordMin6")),
  });
}

type LoginForm = z.infer<ReturnType<typeof createLoginSchema>>;

function homeForRole(role?: string, workspace?: RoleWorkspace, permissions?: string[]) {
  const ws = workspaceOf(role, workspace);
  if (ws === "ADMIN") return "/internal/admin";
  if (ws === "RECRUITER") return recruiterHomePath(permissions);
  return "/career";
}

function resumePath(from: string | undefined, role?: string, workspace?: RoleWorkspace, permissions?: string[]) {
  if (!from || from === "/login" || from === "/internal/login") return null;
  if (workspaceOf(role, workspace) === "RECRUITER") {
    return isAllowedRecruiterPath(from, permissions) ? from : null;
  }
  return from;
}

export function LoginPage() {
  const t = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname;
  const setTokens = useAuthStore((s) => s.setTokens);
  const setUser = useAuthStore((s) => s.setUser);

  const rawTenantCode = getTenantIdFromWindow() || "acme";
  const theme = getTenantTheme(rawTenantCode);

  const [showPassword, setShowPassword] = useState(false);

  // Forgot password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [forgotStep, setForgotStep] = useState<1 | 2>(1);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotOtp, setForgotOtp] = useState("");
  const [forgotNewPassword, setForgotNewPassword] = useState("");
  const [isSubmittingForgot, setIsSubmittingForgot] = useState(false);

  const loginSchema = useMemo(() => createLoginSchema(t), [t]);
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const mutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: async (res) => {
      if (!res.success || !res.data) throw new Error(res.message || t("common.errorGeneric"));
      setTokens(res.data.accessToken, res.data.refreshToken);

      let user = res.data.user;
      if (!user) {
        const profile = await authApi.me();
        if (profile.success && profile.data) user = profile.data;
      }
      if (user) setUser(user);

      toast.success(t("auth.login.loginSuccessToast"));
      const targetPath = resumePath(from, user?.role, user?.workspace, user?.permissions) ?? homeForRole(user?.role, user?.workspace, user?.permissions);
      const tenantCode = res.data.tenantId || rawTenantCode || "acme";
      localStorage.setItem("tenantId", tenantCode);

      const targetUrl = buildTenantUrl(res.data.subdomain, targetPath);
      if (window.location.href !== targetUrl) {
        window.location.href = targetUrl;
      } else {
        navigate(targetPath, { replace: true });
      }
    },
    onError: (err) => toast.danger(getApiErrorMessage(err, t("common.errorGeneric"))),
  });

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      toast.danger(t("auth.login.forgotEmailRequired"));
      return;
    }
    setIsSubmittingForgot(true);
    try {
      await authApi.forgotPassword(forgotEmail.trim());
      toast.success(t("auth.login.otpSentToast"));
      setForgotStep(2);
    } catch (err) {
      toast.danger(getApiErrorMessage(err, t("auth.login.otpSendFailed")));
    } finally {
      setIsSubmittingForgot(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotOtp.trim() || forgotOtp.trim().length !== 6) {
      toast.danger(t("auth.login.otpInvalid6Digits"));
      return;
    }
    if (!forgotNewPassword || forgotNewPassword.length < 6) {
      toast.danger(t("auth.login.newPasswordMin6"));
      return;
    }
    setIsSubmittingForgot(true);
    try {
      await authApi.resetPassword({
        email: forgotEmail.trim(),
        otp: forgotOtp.trim(),
        newPassword: forgotNewPassword,
      });
      toast.success(t("auth.login.resetSuccessToast"));
      setValue("email", forgotEmail.trim());
      setShowForgotModal(false);
      setForgotStep(1);
      setForgotOtp("");
      setForgotNewPassword("");
    } catch (err) {
      toast.danger(getApiErrorMessage(err, t("auth.login.resetFailed")));
    } finally {
      setIsSubmittingForgot(false);
    }
  };

  return (
    <div className="tenant-workspace-theme min-h-screen bg-slate-100 text-slate-900 font-sans antialiased flex flex-col justify-between" style={getTenantThemeStyle(theme)}>
      {/* Background Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-[var(--color-primary-soft)] rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      {/* Main Container */}
      <main className="relative z-10 w-full flex-grow flex flex-col items-center justify-center px-6 py-10">
        <div className="w-full max-w-[420px] bg-white border border-slate-200 rounded-[24px] p-8 shadow-xl shadow-slate-200/50 mb-6">

          {/* Title */}
          <div className="flex flex-col items-center text-center mb-8">
            <div className={`w-12 h-12 rounded-[14px] ${theme.primaryColorBtn} text-white flex items-center justify-center shadow-md font-bold text-xl mb-4`}>
              {theme.code.charAt(0).toUpperCase()}
            </div>
            <h1 className="text-2xl font-bold font-display text-[#1e293b]">
              {t("auth.login.workspaceTitle")}
            </h1>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4 text-xs" noValidate>
            {/* Email Input */}
            <div>
              <label className="block font-semibold text-[#1e293b] mb-1.5" htmlFor="email">
                {t("auth.login.emailRequiredLabel")}
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  aria-invalid={!!errors.email}
                  {...register("email")}
                  className="w-full pl-10 pr-4 py-3 rounded-[10px] bg-slate-50 border border-slate-300 text-slate-900 font-sans text-sm placeholder:text-slate-400 hover:bg-white hover:border-slate-400 focus:bg-white focus:border-[#3b82f6] focus:ring-4 focus:ring-[#3b82f6]/10 outline-none transition-all shadow-sm"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-[11px] text-red-600 font-semibold" role="alert">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password Input */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block font-semibold text-[#1e293b]" htmlFor="password">
                  {t("auth.login.passwordRequiredLabel")}
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotModal(true);
                    setForgotStep(1);
                  }}
                  className="text-[11px] font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                >
                  {t("auth.login.forgotPassword")}
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  aria-invalid={!!errors.password}
                  {...register("password")}
                  className="w-full pl-10 pr-10 py-3 rounded-[10px] bg-slate-50 border border-slate-300 text-slate-900 font-sans text-sm placeholder:text-slate-400 hover:bg-white hover:border-slate-400 focus:bg-white focus:border-[#3b82f6] focus:ring-4 focus:ring-[#3b82f6]/10 outline-none transition-all shadow-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-[11px] text-red-600 font-semibold" role="alert">
                  {errors.password.message}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={mutation.isPending}
              className={`w-full py-3.5 rounded-[10px] ${theme.primaryColorBtn} text-white font-bold text-xs shadow-md shadow-[#3b82f6]/20 transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-50`}
            >
              {mutation.isPending ? (
                <span>{t("auth.login.signingInDots")}</span>
              ) : (
                <>
                  <span>{t("auth.login.submitWorkspace")}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer Links & Actions */}
        <div className="w-full max-w-[420px] flex items-center justify-between px-4">
          <span onClick={() => navigate("/")} className="text-[12px] font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer flex items-center gap-1">
            &larr; {t("auth.login.backToHome")}
          </span>
          <div className="scale-90 origin-right opacity-80 hover:opacity-100 transition-opacity">
            <LanguageSwitcher />
          </div>
        </div>
      </main>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-slate-900 font-display font-bold text-lg">
                <KeyRound className="size-5 text-blue-600" />
                <span>{t("auth.login.forgotModalTitle")}</span>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                aria-label={t("common.close")}
              >
                <X className="size-5" />
              </button>
            </div>

            {forgotStep === 1 ? (
              <form onSubmit={handleSendOtp} className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  {t("auth.login.forgotStep1Desc")}
                </p>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t("auth.login.accountEmailLabel")}
                  </label>
                  <input
                    type="email"
                    required
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isSubmittingForgot}
                  className="w-full py-2.5 rounded-lg bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmittingForgot ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      <span>{t("auth.login.sendingOtp")}</span>
                    </>
                  ) : (
                    <span>{t("auth.login.sendOtp")}</span>
                  )}
                </button>
              </form>
            ) : (
              <form onSubmit={handleResetPassword} className="space-y-4">
                <p className="text-xs text-slate-600 leading-relaxed">
                  {t("auth.login.forgotStep2DescPrefix")} <strong>{forgotEmail}</strong>{t("auth.login.forgotStep2DescSuffix")}
                </p>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t("auth.login.otpLabel")}
                  </label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ""))}
                    placeholder="123456"
                    className="w-full tracking-widest text-center font-mono font-bold text-lg px-3.5 py-2 rounded-lg border border-slate-300 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    {t("auth.login.newPasswordLabel")}
                  </label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    value={forgotNewPassword}
                    onChange={(e) => setForgotNewPassword(e.target.value)}
                    placeholder={t("auth.login.newPasswordPlaceholder")}
                    className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setForgotStep(1)}
                    className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 font-semibold text-xs hover:bg-slate-50 transition-colors"
                  >
                    {t("common.back")}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingForgot}
                    className="flex-1 py-2.5 rounded-lg bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {isSubmittingForgot ? (
                      <>
                        <Loader2 className="size-4 animate-spin" />
                        <span>{t("auth.login.processing")}</span>
                      </>
                    ) : (
                      <span>{t("auth.login.confirmChangePassword")}</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-[#e2e8f0] py-4 text-center text-xs text-[#64748b] bg-white">
        {t("auth.login.internalPortalFooter", { name: theme.name })}
      </footer>
    </div>
  );
}
