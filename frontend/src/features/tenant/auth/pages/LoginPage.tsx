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
import { getTenantIdFromWindow } from "@/lib/tenant";
import { getTenantTheme } from "@/features/tenant/career/pages/TenantCareerPage";
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
  Layers,
  KeyRound
} from "lucide-react";

const loginSchema = z.object({
  email: z.string().email("Vui lòng nhập đúng định dạng email"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
});

type LoginForm = z.infer<typeof loginSchema>;

function homeForRole(role?: string) {
  if (role === "ADMIN" || role === "TENANT_ADMIN" || role === "RECRUITER") return "/recruiter";
  return "/candidate";
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
    setValue,
    formState: { errors },
  } = useForm<LoginForm>({ resolver: zodResolver(loginSchema) });

  const mutation = useMutation({
    mutationFn: authApi.login,
    onSuccess: async (res) => {
      if (!res.success || !res.data) throw new Error(res.message || t("common.errorGeneric"));
      setTokens(res.data.accessToken, res.data.refreshToken);

      const user = res.data.user;
      if (user) {
        setUser(user as any);
      }

      const role = user?.role || "TENANT_ADMIN";
      toast.success("Đăng nhập thành công 🎉");
      navigate(from && from !== "/login" && from !== "/internal/login" ? from : homeForRole(role), { replace: true });
    },
    onError: (err) => toast.danger(getApiErrorMessage(err, t("common.errorGeneric"))),
  });

  const handleFillDemoCreds = (email: string) => {
    setValue("email", email);
    setValue("password", "Password123!");
  };

  return (
    <div className="min-h-screen bg-[#f9f9ff] text-[#191b23] font-sans antialiased flex flex-col justify-between selection:bg-teal-600 selection:text-white">
      {/* Background Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      {/* Main Container */}
      <main className="relative z-10 max-w-6xl mx-auto px-6 py-10 w-full flex-grow flex items-center justify-center">
        <div className="w-full grid lg:grid-cols-12 gap-8 items-center bg-white border border-[#e2e8f0] rounded-[32px] overflow-hidden shadow-[0_25px_50px_-12px_rgba(59,130,246,0.08)]">
          {/* LEFT COLUMN: HIGH-TECH HERO SHOWCASE */}
          <div className="lg:col-span-6 relative p-8 sm:p-12 bg-slate-950 text-white min-h-[560px] flex flex-col justify-between overflow-hidden">
            {/* Background Generated Hero Image */}
            <img
              src={theme.heroImage}
              alt="High Tech Office"
              className="absolute inset-0 w-full h-full object-cover object-center opacity-30 mix-blend-luminosity scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-950/40" />

            <div className="relative z-10">
              <div className="flex items-center gap-3 cursor-pointer mb-8" onClick={() => navigate("/")}>
                <div className={`w-10 h-10 rounded-[12px] ${theme.primaryColorBtn} text-white flex items-center justify-center shadow-md font-bold text-lg`}>
                  {theme.code.charAt(0).toUpperCase()}
                </div>
                <div>
                  <span className="text-xl font-bold font-display tracking-tight text-white">
                    {theme.name}
                  </span>
                  <span className="block text-[11px] font-semibold text-cyan-400">
                    Enterprise Staff Portal
                  </span>
                </div>
              </div>

              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold text-cyan-300 mb-4">
                <ShieldCheck className="w-4 h-4 text-cyan-400" />
                <span>Separate Database per Tenant</span>
              </div>

              <h2 className="text-3xl font-extrabold font-display leading-tight mb-4 text-white">
                Không Gian Làm Việc Nội Bộ & Quản Trị Tuyển Dụng AI
              </h2>

              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal mb-8">
                Hệ thống tích hợp AI Screening, STT Voice Interview và Quy trình Đánh giá Ứng viên Enterprise dành riêng cho {theme.name}.
              </p>
            </div>

            {/* Features Bullet List */}
            <div className="relative z-10 space-y-3 font-mono text-xs text-slate-300 pt-6 border-t border-white/15">
              <div className="flex items-center gap-3">
                <Database className="w-4 h-4 text-teal-400 flex-shrink-0" />
                <span>Độc lập dữ liệu tuyệt đối (Database Isolated)</span>
              </div>
              <div className="flex items-center gap-3">
                <Cpu className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                <span>AI CV Parsing & Matching Score Engine</span>
              </div>
              <div className="flex items-center gap-3">
                <Layers className="w-4 h-4 text-indigo-400 flex-shrink-0" />
                <span>Realtime RabbitMQ Queue & Redis Cache</span>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: LUMINOUS FORM PANEL */}
          <div className="lg:col-span-6 p-8 sm:p-12 flex flex-col justify-between h-full">
            <div>
              {/* Header Top Bar */}
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-2 text-xs font-bold text-[#3b82f6]">
                  <BrainCircuit className="w-5 h-5 text-[#3b82f6]" />
                  <span>SmartHire AI SaaS</span>
                </div>
                <LanguageSwitcher />
              </div>

              {/* Title */}
              <h1 className="text-2xl sm:text-3xl font-bold font-display text-[#1e293b] mb-2">
                Đăng Nhập HR & Quản Trị
              </h1>
              <p className="text-xs text-[#64748b] mb-8">
                Truy cập không gian quản trị công ty <strong>{theme.name}</strong>
              </p>

              {/* Login Form */}
              <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-4 text-xs" noValidate>
                {/* Email Input */}
                <div>
                  <label className="block font-semibold text-[#1e293b] mb-1.5" htmlFor="email">
                    Email Công Vụ (Corporate Email) *
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="email"
                      type="email"
                      placeholder={`admin@${theme.code}.com`}
                      autoComplete="email"
                      aria-invalid={!!errors.email}
                      {...register("email")}
                      className="w-full pl-10 pr-4 py-3 rounded-[10px] bg-[#f8f9ff] border border-[#e2e8f0] text-[#1e293b] font-mono text-xs focus:border-[#3b82f6] focus:outline-none"
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
                      className="w-full pl-10 pr-10 py-3 rounded-[10px] bg-[#f8f9ff] border border-[#e2e8f0] text-[#1e293b] font-mono text-xs focus:border-[#3b82f6] focus:outline-none"
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
                    <span>Đang Xác Thực JWT...</span>
                  ) : (
                    <>
                      <span>Đăng Nhập Workspace</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* DEMO CREDENTIALS QUICK FILL CHIP BOX */}
              <div className="mt-8 p-4 rounded-[14px] bg-[#f8f9ff] border border-[#e2e8f0] text-xs font-mono">
                <span className="text-[11px] font-bold text-[#1e293b] flex items-center gap-1.5 mb-2">
                  <KeyRound className="w-3.5 h-3.5 text-amber-600" /> Tài Khoản Quản Trị Demo (`{theme.code}`):
                </span>
                <div className="flex items-center justify-between bg-white p-2 rounded-[8px] border border-[#e2e8f0]">
                  <div>
                    <span className="text-[#3b82f6] font-bold block">admin@{theme.code}.com</span>
                    <span className="text-amber-600 text-[10px]">Password123! [TENANT_ADMIN]</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleFillDemoCreds(`admin@${theme.code}.com`)}
                    className="px-3 py-1 rounded-[6px] bg-[#3b82f6]/10 text-[#3b82f6] font-bold text-[10px] hover:bg-[#3b82f6]/20 transition-colors"
                  >
                    Tự Điền
                  </button>
                </div>
              </div>
            </div>

            {/* Footer Notice */}
            <div className="mt-8 text-center text-[11px] text-[#64748b]">
              SmartHire AI SaaS Platform © 2026. Separate DB Isolation Strategy.
            </div>
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
