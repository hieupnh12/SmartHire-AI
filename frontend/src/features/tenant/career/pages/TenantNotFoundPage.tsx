import { BrainCircuit, AlertTriangle, ArrowLeft, Plus } from "lucide-react";
import { LanguageSwitcher } from "@/components/ux/LanguageSwitcher";

interface TenantNotFoundPageProps {
  subdomain: string;
}

export function TenantNotFoundPage({ subdomain }: TenantNotFoundPageProps) {

  return (
    <div className="min-h-screen bg-[#f9f9ff] text-[#191b23] font-sans antialiased flex flex-col justify-between selection:bg-teal-600 selection:text-white">
      {/* Background Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-red-500/10 rounded-full blur-3xl" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-[#e2e8f0] bg-white/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => window.location.href = "http://localhost:5173/"}>
            <div className="w-10 h-10 rounded-[12px] bg-[#3b82f6] text-white flex items-center justify-center shadow-md">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-bold font-display text-[#1e293b] tracking-tight">
                SmartHire AI
              </span>
              <span className="ml-2.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">
                404 Tenant Not Found
              </span>
            </div>
          </div>

          <LanguageSwitcher />
        </div>
      </header>

      {/* Main Content Card */}
      <main className="relative z-10 max-w-lg mx-auto px-6 py-16 w-full flex-grow flex items-center justify-center">
        <div className="w-full bg-white border border-[#e2e8f0] rounded-[28px] p-8 sm:p-10 shadow-[0_20px_25px_-5px_rgba(239,68,68,0.05)] text-center animate-fade-in space-y-6">
          <div className="w-16 h-16 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200 shadow-sm">
            <AlertTriangle className="w-8 h-8" />
          </div>

          <div>
            <h1 className="text-2xl font-bold font-display text-[#1e293b] mb-2">
              Doanh Nghiệp Chưa Đăng Ký
            </h1>
            <p className="text-xs text-[#64748b] leading-relaxed">
              Subdomain <strong className="font-mono text-red-600 bg-red-50 px-2 py-0.5 rounded">"{subdomain}.smarthire.ai"</strong> chưa được cấp phát hoặc chưa đăng ký dịch vụ trên nền tảng SmartHire AI SaaS.
            </p>
          </div>

          <div className="p-4 rounded-[14px] bg-[#f8f9ff] border border-[#e2e8f0] text-left text-xs space-y-2 text-[#475569]">
            <span className="font-bold text-[#1e293b] block">💡 Nguyên Nhân Có Thể Do:</span>
            <ul className="list-disc pl-4 space-y-1 text-[11px]">
              <li>Bạn nhập nhầm Tên Subdomain trên thanh địa chỉ trình duyệt.</li>
              <li>Doanh nghiệp này chưa hoàn tất thủ tục Onboarding cấp phát Database.</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              onClick={() => window.location.href = "http://localhost:5173/"}
              className="w-full py-3 px-4 rounded-[10px] bg-slate-100 hover:bg-slate-200 text-[#1e293b] font-bold text-xs transition-colors flex items-center justify-center gap-2 border border-[#e2e8f0]"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Về Trang Chủ Platform</span>
            </button>

            <button
              onClick={() => window.location.href = "http://localhost:5173/onboard"}
              className="w-full py-3 px-4 rounded-[10px] bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>Tạo Tenant Mới</span>
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[#e2e8f0] py-6 text-center text-xs text-[#64748b] bg-white">
        SmartHire AI Platform © 2026. Separate DB Isolation Strategy.
      </footer>
    </div>
  );
}
