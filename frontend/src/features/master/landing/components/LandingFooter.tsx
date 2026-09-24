import { Link, useNavigate } from "react-router-dom";
import { BrainCircuit, KeyRound } from "lucide-react";
import { useLandingModal } from "../context/LandingModalContext";

export function LandingFooter() {
  const navigate = useNavigate();
  const { openWorkspaceModal } = useLandingModal();

  return (
    <footer className="border-t border-slate-200 py-12 bg-white text-slate-500 text-xs">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
          <div className="space-y-3 md:col-span-2">
            <Link to="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center">
                <BrainCircuit className="w-5 h-5" />
              </div>
              <span className="font-semibold text-slate-900 text-base">SmartHire.AI Enterprise</span>
            </Link>
            <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
              Nền tảng quản trị tuyển dụng thông minh hàng đầu dành cho doanh nghiệp, tối ưu hóa thời gian và gia tăng chất lượng tuyển dụng nhân tài.
            </p>
          </div>

          <div>
            <h5 className="font-semibold text-slate-900 text-sm mb-3">Thông Tin Giải Pháp</h5>
            <ul className="space-y-2 text-xs">
              <li>
                <Link to="/solutions" className="hover:text-blue-600 transition-colors">
                  Hệ Sinh Thái Giải Pháp AI
                </Link>
              </li>
              <li>
                <Link to="/preview" className="hover:text-blue-600 transition-colors">
                  Trải Nghiệm Tính Năng Trực Quan
                </Link>
              </li>
              <li>
                <Link to="/roi" className="hover:text-blue-600 transition-colors">
                  Hiệu Quả Kinh Tế & Chỉ Số ROI
                </Link>
              </li>
              <li>
                <Link to="/security" className="hover:text-blue-600 transition-colors">
                  Bảo Vệ Dữ Liệu & Nghị Định 13
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="hover:text-blue-600 transition-colors">
                  Các Gói Giải Pháp Doanh Nghiệp
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h5 className="font-semibold text-slate-900 text-sm mb-3">Dành Cho Khách Hàng</h5>
            <ul className="space-y-2 text-xs">
              <li>
                <button
                  onClick={openWorkspaceModal}
                  className="hover:text-blue-600 transition-colors text-left"
                >
                  Vào Không Gian Làm Việc (Workspace)
                </button>
              </li>
              <li>
                <button
                  onClick={() => navigate("/admin/login")}
                  className="hover:text-blue-600 transition-colors text-left flex items-center gap-1 font-medium text-blue-600"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Cổng Quản Trị Hệ Thống (Master Admin)</span>
                </button>
              </li>
              <li>
                <a href="mailto:contact@smarthire.top" className="hover:text-blue-600 transition-colors">
                  contact@smarthire.top
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© 2026 SmartHire.AI Enterprise. Bản quyền thuộc về nền tảng SmartHire-AI.</p>
          <div className="flex items-center gap-6">
            <span className="hover:text-blue-600 transition-colors cursor-pointer">Điều khoản sử dụng</span>
            <Link to="/security" className="hover:text-blue-600 transition-colors">Chính sách bảo mật dữ liệu</Link>
            <a href="mailto:contact@smarthire.top" className="hover:text-blue-600 transition-colors">Hỗ trợ khách hàng</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
