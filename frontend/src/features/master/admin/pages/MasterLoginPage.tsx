import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { masterAuthApi } from "@/api/master/masterAuthApi";
import { LanguageSwitcher } from "@/components/ux/LanguageSwitcher";
import {
  BrainCircuit,
  Lock,
  ArrowRight,
  AlertCircle,
  KeyRound
} from "lucide-react";

export function MasterLoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // If token exists, auto redirect to admin dashboard
    const existingToken = localStorage.getItem("master_access_token");
    if (existingToken) {
      navigate("/admin/dashboard", { replace: true });
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await masterAuthApi.login({ email, password });
      if (response.success && response.data) {
        localStorage.setItem("master_access_token", response.data.accessToken);
        // Direct immediate redirection to Super Admin Dashboard
        navigate("/admin/dashboard", { replace: true });
      } else {
        setError(response.message || "Đăng nhập thất bại");
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Tài khoản hoặc mật khẩu không chính xác";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f9f9ff] text-[#191b23] font-sans antialiased flex flex-col justify-between selection:bg-[#3b82f6] selection:text-white">
      {/* Top Header */}
      <header className="border-b border-[#e2e8f0] bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
            <div className="w-10 h-10 rounded-[12px] bg-[#3b82f6] text-white flex items-center justify-center shadow-md shadow-[#3b82f6]/20">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-bold font-display text-[#1e293b] tracking-tight">
                SmartHire AI
              </span>
              <span className="ml-2.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[rgba(59,130,246,0.1)] text-[#3b82f6]">
                Super Admin Portal
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs text-[#64748b]">
            <LanguageSwitcher />
            <div className="flex items-center gap-1.5 text-[#3b82f6] font-semibold bg-[rgba(59,130,246,0.08)] px-3 py-1.5 rounded-full">
              <Lock className="w-4 h-4" />
              <span>Master DB Control</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Login Card - Production Luminous Professional Style */}
      <main className="max-w-md mx-auto px-6 py-16 w-full flex-grow flex items-center justify-center">
        <div className="w-full bg-white border border-[#e2e8f0] rounded-[24px] p-8 shadow-[0_20px_25px_-5px_rgba(59,130,246,0.05)]">
          <div className="text-center mb-8">
            <div className="w-12 h-12 rounded-[12px] bg-[rgba(59,130,246,0.1)] text-[#3b82f6] flex items-center justify-center mx-auto mb-4 font-bold">
              <KeyRound className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold font-display text-[#1e293b] mb-1">
              Platform Super Admin Access
            </h1>
            <p className="text-xs text-[#64748b]">
              Cổng xác thực tối cao dành cho Ban quản trị nền tảng SaaS SmartHire AI.
            </p>
          </div>

          {/* Error Alert */}
          {error && (
            <div className="mb-6 p-4 rounded-[12px] bg-red-50 border border-red-200 text-red-600 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#1e293b] mb-1.5">
                Super Admin Email <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                placeholder="admin@smarthire.ai"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-[8px] bg-[#f8f9ff] border border-[#e2e8f0] text-[#1e293b] text-sm focus:border-[#3b82f6] focus:outline-none transition-colors"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#1e293b] mb-1.5">
                Mật Khẩu Quản Trị <span className="text-red-500">*</span>
              </label>
              <input
                type="password"
                required
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2.5 rounded-[8px] bg-[#f8f9ff] border border-[#e2e8f0] text-[#1e293b] text-sm focus:border-[#3b82f6] focus:outline-none transition-colors"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded-[8px] bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold text-sm shadow-md shadow-[#3b82f6]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50 mt-6"
            >
              {loading ? (
                <span>Đang Xác Thực Master DB...</span>
              ) : (
                <>
                  <span>Đăng Nhập Super Admin</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[#e2e8f0] py-6 text-center text-xs text-[#64748b] bg-white">
        SmartHire AI Platform © 2026. Master DB Control Panel.
      </footer>
    </div>
  );
}
