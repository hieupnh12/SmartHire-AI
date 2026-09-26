import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate, useLocation } from "react-router-dom";
import { authApi } from "@/api/tenant/authApi";
import { useAuthStore } from "../stores/authStore";
import { getApiErrorMessage } from "@/lib/axios";
import { useT } from "@/i18n";
import { LanguageSwitcher } from "@/components/ux/LanguageSwitcher";
import { toast } from "@/stores/toastStore";
import { getTenantIdFromWindow, buildTenantUrl } from "@/lib/tenant";
import { recruiterHomePath, isAllowedRecruiterPath } from "@/features/tenant/recruiter/permissions";
import { workspaceOf } from "@/features/tenant/auth/workspace";
import type { RoleWorkspace } from "@/types/api";
import { getTenantTheme, getTenantThemeStyle } from "@/lib/tenantTheme";
import {
  ShieldCheck,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  BrainCircuit,
  Database,
  Cpu,
  Layers
} from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Vui lòng nhập đúng định dạng email"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
});

type LoginForm = z.infer<typeof loginSchema>;

function homeForRole(role?: string, workspace?: RoleWorkspace, permissions?: string[]) {
  const ws = workspaceOf(role, workspace);
  if (ws === "ADMIN") return "/internal/admin";
  if (ws === "RECRUITER") return recruiterHomePath(permissions);
  return "/candidate";
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

  const {
    register,
    handleSubmit,
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

      toast.success("Đăng nhập thành công 🎉");
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
              Đăng Nhập Admin
            </h1>
          </div>

          {/* Login Form */}
          <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4 text-xs" noValidate>
            {/* Email Input */}
            <div>
              <label className="block font-semibold text-[#1e293b] mb-1.5" htmlFor="email">
                Email *
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
                  Mật Khẩu *
                </label>
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
                <span>Đang đăng nhập...</span>
              ) : (
                <>
                  <span>Đăng Nhập Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer Links & Actions */}
        <div className="w-full max-w-[420px] flex items-center justify-between px-4">
          <span onClick={() => navigate("/")} className="text-[12px] font-semibold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer flex items-center gap-1">
            &larr; Về Trang Chủ
          </span>
          <div className="scale-90 origin-right opacity-80 hover:opacity-100 transition-opacity">
            <LanguageSwitcher />
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#e2e8f0] py-4 text-center text-xs text-[#64748b] bg-white">
        {theme.name} Internal Portal © 2026.
      </footer>
    </div>
  );
}
