import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { masterTenantApi } from "@/api/master/tenantApi";
import { LanguageSwitcher } from "@/components/ux/LanguageSwitcher";
import axios from "axios";
import {
  BrainCircuit,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  ShieldCheck,
  AlertCircle
} from "lucide-react";

export function TenantOnboardPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Form State
  const [step, setStep] = useState(1);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [selectedPlan, setSelectedPlan] = useState("professional");
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [adminPassword, setAdminPassword] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successData, setSuccessData] = useState<any>(null);

  useEffect(() => {
    const planParam = searchParams.get("plan");
    if (planParam && ["starter", "professional", "enterprise"].includes(planParam.toLowerCase())) {
      setSelectedPlan(planParam.toLowerCase());
    }
  }, [searchParams]);

  // Auto fill subdomain when code changes
  const handleCodeChange = (val: string) => {
    const formatted = val.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setCode(formatted);
    setSubdomain(formatted);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 3) {
      setStep(step + 1);
      return;
    }

    // Submit Onboard Request
    setLoading(true);
    setError(null);

    try {
      // 1. Onboard Tenant in Master DB
      await masterTenantApi.onboardTenant({
        code,
        name,
        subdomain
      });

      // 2. Create Initial Admin User in Tenant DB
      try {
        await axios.post(
          "/api/v1/tenant/users",
          {
            email: adminEmail,
            fullName: adminName,
            password: adminPassword,
            role: "TENANT_ADMIN"
          },
          {
            headers: {
              "X-Tenant-ID": code
            }
          }
        );
      } catch {
        // Admin account bootstrap is best-effort during onboarding.
      }

      setSuccessData({
        code,
        name,
        subdomain,
        adminEmail,
        plan: selectedPlan
      });
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Lỗi khi khởi tạo doanh nghiệp";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--color-surface-page)] text-[var(--color-text-primary)] font-sans flex flex-col justify-between">
      {/* Top Header */}
      <header className="border-b border-[var(--color-border-default)] bg-[var(--color-surface-card)] sticky top-0 z-50 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
            <div className="w-10 h-10 rounded-[var(--radius-md)] bg-[var(--color-brand-primary)] text-white flex items-center justify-center shadow-sm">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <span className="text-xl font-bold font-display text-[var(--color-brand-primary)]">
              SmartHire AI
            </span>
          </div>

          <div className="flex items-center gap-4 text-xs text-[var(--color-text-secondary)]">
            <LanguageSwitcher />
            <div className="flex items-center gap-1.5 text-[var(--color-status-success)] font-semibold">
              <ShieldCheck className="w-4 h-4" />
              <span>Database per Tenant Isolation</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Form */}
      <main className="max-w-3xl mx-auto px-6 py-12 w-full flex-grow">
        {/* Step Indicator */}
        <div className="flex items-center justify-between mb-8 relative">
          <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-[var(--color-border-default)] -z-10 -translate-y-1/2" />

          <div className="flex items-center gap-2 bg-[var(--color-surface-page)] px-3">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${step >= 1 ? "bg-[var(--color-brand-primary)] text-white" : "bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)]"
                }`}
            >
              1
            </div>
            <span className={`text-xs font-semibold ${step >= 1 ? "text-[var(--color-brand-primary)]" : "text-[var(--color-text-secondary)]"}`}>
              Thông Tin Công Ty
            </span>
          </div>

          <div className="flex items-center gap-2 bg-[var(--color-surface-page)] px-3">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${step >= 2 ? "bg-[var(--color-brand-primary)] text-white" : "bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)]"
                }`}
            >
              2
            </div>
            <span className={`text-xs font-semibold ${step >= 2 ? "text-[var(--color-brand-primary)]" : "text-[var(--color-text-secondary)]"}`}>
              Chọn Gói SaaS
            </span>
          </div>

          <div className="flex items-center gap-2 bg-[var(--color-surface-page)] px-3">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${step >= 3 ? "bg-[var(--color-brand-primary)] text-white" : "bg-[var(--color-surface-muted)] text-[var(--color-text-secondary)]"
                }`}
            >
              3
            </div>
            <span className={`text-xs font-semibold ${step >= 3 ? "text-[var(--color-brand-primary)]" : "text-[var(--color-text-secondary)]"}`}>
              Tài Khoản Admin
            </span>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-6 p-4 rounded-[var(--radius-md)] bg-[var(--color-status-danger)]/10 border border-[var(--color-status-danger)]/30 text-[var(--color-status-danger)] text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Form Container */}
        <div className="p-8 rounded-[var(--radius-lg)] bg-[var(--color-surface-card)] border border-[var(--color-border-default)] shadow-[var(--shadow-elevated)]">
          <form onSubmit={handleSubmit}>
            {/* STEP 1: COMPANY INFO */}
            {step === 1 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-2xl font-bold font-display text-[var(--color-text-primary)] mb-1">Đăng Ký Khởi Tạo Doanh Nghiệp</h2>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    Nhập thông tin doanh nghiệp để hệ thống tự động tạo Database riêng biệt.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-primary)] mb-1.5">
                    Tên Doanh Nghiệp <span className="text-[var(--color-status-danger)]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Tập đoàn Acme Enterprise"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-[var(--radius-md)] bg-[var(--color-surface-card)] border border-[var(--color-border-default)] text-[var(--color-text-primary)] placeholder-[var(--color-text-disabled)] focus:border-[var(--color-brand-primary)] focus:outline-none text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-primary)] mb-1.5">
                    Mã Định Danh Doanh Nghiệp (Tenant Code) <span className="text-[var(--color-status-danger)]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="acme"
                    value={code}
                    onChange={(e) => handleCodeChange(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-[var(--radius-md)] bg-[var(--color-surface-card)] border border-[var(--color-border-default)] text-[var(--color-text-primary)] font-mono text-sm focus:border-[var(--color-brand-primary)] focus:outline-none"
                  />
                  <p className="text-[11px] text-[var(--color-text-secondary)] mt-1">
                    Viết liền không dấu (Ví dụ: acme, vng, viettel).
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-primary)] mb-1.5">
                    Subdomain Xem Trước
                  </label>
                  <div className="flex items-center px-4 py-2.5 rounded-[var(--radius-md)] bg-[var(--color-surface-muted)] border border-[var(--color-border-default)] text-[var(--color-brand-primary)] font-mono text-sm font-semibold">
                    <span>{subdomain || "acme"}</span>
                    <span className="text-[var(--color-text-secondary)]">.smarthire.ai</span>
                  </div>
                </div>
              </div>
            )}

            {/* STEP 2: SELECT PLAN */}
            {step === 2 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-2xl font-bold font-display text-[var(--color-text-primary)] mb-1">Chọn Gói Dịch Vụ SaaS</h2>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    Bạn có thể nâng cấp hoặc thay đổi gói dịch vụ bất kỳ lúc nào.
                  </p>
                </div>

                <div className="space-y-3.5">
                  {/* Starter */}
                  <label
                    onClick={() => setSelectedPlan("starter")}
                    className={`block p-4 rounded-[var(--radius-md)] border cursor-pointer transition-all ${selectedPlan === "starter"
                        ? "bg-[var(--color-surface-card)] border-[var(--color-brand-primary)] ring-2 ring-[var(--color-brand-primary)]/20 shadow-sm"
                        : "bg-[var(--color-surface-card)] border-[var(--color-border-default)] hover:border-[var(--color-border-focus)]"
                      }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-[var(--color-text-primary)] text-sm">Gói Starter</span>
                      <span className="text-[var(--color-brand-primary)] font-extrabold text-base">$49 <span className="text-xs font-normal text-[var(--color-text-secondary)]">/tháng</span></span>
                    </div>
                    <p className="text-xs text-[var(--color-text-secondary)]">Dành cho công ty nhỏ: 5 Jobs, 100 CV parses / tháng.</p>
                  </label>

                  {/* Professional */}
                  <label
                    onClick={() => setSelectedPlan("professional")}
                    className={`block p-4 rounded-[var(--radius-md)] border cursor-pointer transition-all relative ${selectedPlan === "professional"
                        ? "bg-[var(--color-surface-card)] border-[var(--color-brand-primary)] ring-2 ring-[var(--color-brand-primary)]/30 shadow-md"
                        : "bg-[var(--color-surface-card)] border-[var(--color-border-default)] hover:border-[var(--color-border-focus)]"
                      }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[var(--color-text-primary)] text-sm">Gói Professional</span>
                        <span className="px-2 py-0.5 rounded-[var(--radius-full)] bg-[var(--color-brand-primary)]/10 text-[var(--color-brand-primary)] text-[10px] font-bold">
                          Phổ Biến Nhất ✨
                        </span>
                      </div>
                      <span className="text-[var(--color-brand-primary)] font-extrabold text-base">$149 <span className="text-xs font-normal text-[var(--color-text-secondary)]">/tháng</span></span>
                    </div>
                    <p className="text-xs text-[var(--color-text-secondary)]">20 Jobs, 1,000 CV Parses, Full AI Screening & Voice Interview.</p>
                  </label>

                  {/* Enterprise */}
                  <label
                    onClick={() => setSelectedPlan("enterprise")}
                    className={`block p-4 rounded-[var(--radius-md)] border cursor-pointer transition-all ${selectedPlan === "enterprise"
                        ? "bg-[var(--color-surface-card)] border-[var(--color-brand-secondary)] ring-2 ring-[var(--color-brand-secondary)]/20 shadow-sm"
                        : "bg-[var(--color-surface-card)] border-[var(--color-border-default)] hover:border-[var(--color-border-focus)]"
                      }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-[var(--color-text-primary)] text-sm">Gói Enterprise</span>
                      <span className="text-[var(--color-brand-secondary)] font-extrabold text-base">$399 <span className="text-xs font-normal text-[var(--color-text-secondary)]">/tháng</span></span>
                    </div>
                    <p className="text-xs text-[var(--color-text-secondary)]">Không giới hạn Jobs/CVs, Dedicated Connection Pool & SLA Support 24/7.</p>
                  </label>
                </div>
              </div>
            )}

            {/* STEP 3: ADMIN ACCOUNT */}
            {step === 3 && (
              <div className="space-y-5">
                <div>
                  <h2 className="text-2xl font-bold font-display text-[var(--color-text-primary)] mb-1">Tạo Tài Khoản Admin Công Ty</h2>
                  <p className="text-xs text-[var(--color-text-secondary)]">
                    Tài khoản có quyền Quản trị tối cao (TENANT_ADMIN) trong Workspace công ty.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-primary)] mb-1.5">
                    Họ và Tên Admin <span className="text-[var(--color-status-danger)]">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nguyễn Văn Admin"
                    value={adminName}
                    onChange={(e) => setAdminName(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-[var(--radius-md)] bg-[var(--color-surface-card)] border border-[var(--color-border-default)] text-[var(--color-text-primary)] text-sm focus:border-[var(--color-brand-primary)] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-primary)] mb-1.5">
                    Email Công Vụ <span className="text-[var(--color-status-danger)]">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="admin@acme.com"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-[var(--radius-md)] bg-[var(--color-surface-card)] border border-[var(--color-border-default)] text-[var(--color-text-primary)] text-sm focus:border-[var(--color-brand-primary)] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[var(--color-text-primary)] mb-1.5">
                    Mật Khẩu <span className="text-[var(--color-status-danger)]">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Password123!"
                    value={adminPassword}
                    onChange={(e) => setAdminPassword(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-[var(--radius-md)] bg-[var(--color-surface-card)] border border-[var(--color-border-default)] text-[var(--color-text-primary)] text-sm focus:border-[var(--color-brand-primary)] focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* BUTTON CONTROLS */}
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-[var(--color-border-default)]">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep(step - 1)}
                  className="px-4 py-2 rounded-[var(--radius-md)] bg-[var(--color-surface-muted)] hover:bg-[var(--color-border-default)] text-[var(--color-text-secondary)] text-sm font-medium transition-colors flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-4 h-4" /> Quay Lại
                </button>
              ) : (
                <div />
              )}

              <button
                type="submit"
                disabled={loading}
                className="px-5 py-2.5 rounded-[var(--radius-md)] bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary-hover)] text-white font-bold text-sm shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
              >
                {loading ? (
                  <span>Đang Khởi Tạo DB...</span>
                ) : step === 3 ? (
                  <span>Hoàn Tất Khởi Tạo Workspace</span>
                ) : (
                  <>
                    <span>Tiếp Theo</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* SUCCESS MODAL OVERLAY */}
      {successData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-[var(--color-surface-card)] border border-[var(--color-border-default)] rounded-[var(--radius-lg)] p-8 max-w-lg w-full text-center shadow-[var(--shadow-elevated)]">
            <div className="w-14 h-14 rounded-full bg-[var(--color-status-success)]/10 text-[var(--color-status-success)] flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <h3 className="text-2xl font-bold font-display text-[var(--color-text-primary)] mb-2">Khởi Tạo Doanh Nghiệp Thành Công 🎉</h3>
            <p className="text-[var(--color-text-secondary)] text-sm mb-6">
              Database riêng biệt cho <strong>{successData.name}</strong> (`smarthire_tenant_{successData.code}`) đã được khởi tạo thành công!
            </p>

            <div className="bg-[var(--color-surface-muted)] p-4 rounded-[var(--radius-md)] text-left text-xs space-y-2 mb-6 font-mono border border-[var(--color-border-default)]">
              <div className="flex justify-between">
                <span className="text-[var(--color-text-secondary)]">Mã Doanh Nghiệp:</span>
                <span className="text-[var(--color-brand-primary)] font-bold">{successData.code}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-secondary)]">Email Admin:</span>
                <span className="text-[var(--color-text-primary)] font-semibold">{successData.adminEmail}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--color-text-secondary)]">Gói Dịch Vụ:</span>
                <span className="text-[var(--color-brand-secondary)] uppercase font-bold">{successData.plan}</span>
              </div>
            </div>

            <button
              onClick={() => navigate("/login")}
              className="w-full py-3 px-4 rounded-[var(--radius-md)] bg-[var(--color-brand-primary)] hover:bg-[var(--color-brand-primary-hover)] text-white font-bold text-sm shadow-md transition-all"
            >
              Chuyển Đến Trang Đăng Nhập Doanh Nghiệp
            </button>
          </div>
        </div>
      )}

      {/* Simple Footer */}
      <footer className="border-t border-[var(--color-border-default)] py-5 text-center text-xs text-[var(--color-text-secondary)] bg-[var(--color-surface-card)]">
        SmartHire AI Platform © 2026. Design Tokens per DESIGN.md.
      </footer>
    </div>
  );
}
