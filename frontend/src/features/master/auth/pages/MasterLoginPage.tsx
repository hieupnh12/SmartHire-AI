import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { masterAuthApi } from "@/api/master/masterAuthApi";
import { SmartHireLogo } from "@/components/shared/SmartHireLogo";
import { LanguageSwitcher } from "@/components/ux/LanguageSwitcher";
import { useT } from "@/i18n";
import {
  Lock,
  ArrowRight,
  ArrowLeft,
  AlertCircle,
  Mail,
  Eye,
  EyeOff
} from "lucide-react";

export function MasterLoginPage() {
  const t = useT();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await masterAuthApi.login({ email, password });
      if (response.success && response.data) {
        localStorage.setItem("master_access_token", response.data.accessToken);
        if (response.data.refreshToken) {
          localStorage.setItem("master_refresh_token", response.data.refreshToken);
        }
        navigate("/admin/dashboard", { replace: true });
      } else {
        setError(response.message || t("master.login.invalidCredentials"));
      }
    } catch (err: any) {
      const msg =
        err.response?.data?.message ||
        err.message ||
        t("master.login.adminInvalidCredentials");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans antialiased selection:bg-blue-600 selection:text-white flex flex-col justify-between relative">
      {/* Subtle Background Pattern */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-40">
        <div
          className="w-full h-full"
          style={{
            backgroundImage: "radial-gradient(#cbd5e1 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        />
      </div>

      {/* Top Header */}
      <header className="relative z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-18 flex items-center justify-between">
          <div
            className="flex items-center cursor-pointer select-none group"
            onClick={() => navigate("/")}
          >
            <SmartHireLogo className="h-9 sm:h-10" />
          </div>

          <div className="flex items-center gap-3 text-xs font-medium">
            <LanguageSwitcher variant="icon" />
            <button
              type="button"
              onClick={() => navigate("/")}
              className="flex items-center gap-1.5 text-slate-600 hover:text-blue-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>{t("master.login.backHome")}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Login Section */}
      <main className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 py-10 w-full flex-grow flex items-center justify-center">
        <div className="w-full bg-white border border-slate-200/90 rounded-2xl shadow-xl shadow-slate-900/5 overflow-hidden grid md:grid-cols-12 transition-all">
          {/* Left Column: Visual Illustration Banner */}
          <div className="md:col-span-5 bg-gradient-to-b from-blue-50/70 via-slate-50/50 to-indigo-50/40 p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-100 text-center relative">
            <div className="my-6 flex justify-center">
              <div className="relative group">
                <img
                  src="/master_admin_shield.jpg"
                  alt={t("master.login.shieldAlt")}
                  className="w-48 h-48 object-contain rounded-2xl drop-shadow-md group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            </div>
          </div>

          {/* Right Column: Clean & Compact Login Form */}
          <div className="md:col-span-7 p-6 sm:p-8 flex flex-col justify-center">
            <div className="mb-6">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {t("master.login.title")}
              </h1>
            </div>

            {error && (
              <div className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-600 text-xs flex items-start gap-2.5 animate-fade-in">
                <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                <span className="leading-relaxed">{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {t("master.login.adminEmailLabel")} <span className="text-rose-500">*</span>
                </label>
                <div className="relative rounded-lg border border-slate-300 bg-slate-50/50 focus-within:border-blue-600 focus-within:bg-white focus-within:ring-1 focus-within:ring-blue-600 transition-colors">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    required
                    placeholder="admin@gmail.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3.5 py-2.5 bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  {t("master.login.passwordLabel")} <span className="text-rose-500">*</span>
                </label>
                <div className="relative rounded-lg border border-slate-300 bg-slate-50/50 focus-within:border-blue-600 focus-within:bg-white focus-within:ring-1 focus-within:ring-blue-600 transition-colors">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-10 py-2.5 bg-transparent text-sm text-slate-900 placeholder-slate-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-98 text-white font-semibold text-sm shadow-md shadow-blue-600/20 hover:shadow-lg hover:shadow-blue-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>{t("master.login.authenticating")}</span>
                  </span>
                ) : (
                  <>
                    <span>{t("master.login.submit")}</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-200/80 py-4 text-center text-xs text-slate-400 bg-white">
        {t("master.login.footer")}
      </footer>
    </div>
  );
}
