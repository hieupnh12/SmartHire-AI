import { Link } from "react-router-dom";
import { Mail, ArrowUpRight } from "lucide-react";
import { SmartHireLogo } from "@/components/shared/SmartHireLogo";
import { useLandingModal } from "../context/LandingModalContext";

const NAV_LINKS = [
  { label: "Giải Pháp AI", to: "/solutions" },
  { label: "Trải Nghiệm Thực Tế", to: "/preview" },
  { label: "Hiệu Quả & ROI", to: "/roi" },
  { label: "Bảo Mật Dữ Liệu", to: "/security" },
  { label: "Gói Giải Pháp", to: "/pricing" },
];

export function LandingFooter() {
  const { openWorkspaceModal } = useLandingModal();

  return (
    <footer className="bg-slate-950 text-slate-400 text-sm">
      {/* Top divider accent */}
      <div className="h-px bg-gradient-to-r from-transparent via-slate-700 to-transparent" />

      <div className="max-w-7xl mx-auto px-6 py-14">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-12">

          {/* Brand column */}
          <div className="space-y-4">
            <Link to="/" className="inline-flex items-center group">
              <SmartHireLogo tone="dark" className="h-8" />
            </Link>
            <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
              Nền tảng tuyển dụng AI thế hệ mới dành cho doanh nghiệp — tự động hóa sàng lọc, đánh giá và phỏng vấn với độ chính xác vượt trội.
            </p>
            <a
              href="mailto:contact@smarthire.top"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-blue-400 transition-colors"
            >
              <Mail className="w-3.5 h-3.5" />
              contact@smarthire.top
            </a>
          </div>

          {/* Solutions links */}
          <div>
            <h5 className="text-xs font-semibold text-slate-300 uppercase tracking-widest mb-4">
              Giải Pháp
            </h5>
            <ul className="space-y-2.5">
              {NAV_LINKS.map((l) => (
                <li key={l.to}>
                  <Link
                    to={l.to}
                    className="text-xs text-slate-500 hover:text-slate-200 transition-colors flex items-center gap-1 group"
                  >
                    {l.label}
                    <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Customers column */}
          <div>
            <h5 className="text-xs font-semibold text-slate-300 uppercase tracking-widest mb-4">
              Dành Cho Khách Hàng
            </h5>
            <ul className="space-y-2.5">
              <li>
                <button
                  onClick={openWorkspaceModal}
                  className="text-xs text-slate-500 hover:text-slate-200 transition-colors text-left flex items-center gap-1 group"
                >
                  Vào Workspace Tuyển Dụng
                  <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              </li>
              <li>
                <a
                  href="mailto:contact@smarthire.top"
                  className="text-xs text-slate-500 hover:text-slate-200 transition-colors flex items-center gap-1 group"
                >
                  Hỗ Trợ Kỹ Thuật
                  <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
              </li>
              <li>
                <Link
                  to="/security"
                  className="text-xs text-slate-500 hover:text-slate-200 transition-colors flex items-center gap-1 group"
                >
                  Chính Sách Bảo Mật
                  <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
          <p>© 2026 SmartHire.AI Enterprise. All rights reserved.</p>
          <div className="flex items-center gap-5">
            <Link to="/terms" className="hover:text-slate-400 transition-colors">Điều khoản sử dụng</Link>
            <Link to="/privacy" className="hover:text-slate-400 transition-colors">Bảo vệ dữ liệu cá nhân</Link>
            <Link to="/security" className="hover:text-slate-400 transition-colors">An ninh hệ thống</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
