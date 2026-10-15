import { useState, useEffect } from "react";
import { useSearchParams, useLocation, useNavigate, Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { LegalPolicyModal, type LegalPolicyTab } from "@/features/master/billing/components/modals/LegalPolicyModal";

export function LegalDocumentsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigate = useNavigate();
  const tabParam = searchParams.get("tab");

  const isPrivacyPath = location.pathname.includes("privacy");

  const [activeTab, setActiveTab] = useState<LegalPolicyTab>(() => {
    if (tabParam === "privacy" || isPrivacyPath) return "PRIVACY_ND13";
    return "TOS";
  });

  useEffect(() => {
    if (tabParam === "privacy" || isPrivacyPath) {
      setActiveTab("PRIVACY_ND13");
    } else if (tabParam === "tos" || location.pathname.includes("terms")) {
      setActiveTab("TOS");
    }
  }, [tabParam, isPrivacyPath, location.pathname]);

  const handleSwitchTab = (tab: LegalPolicyTab) => {
    setActiveTab(tab);
    setSearchParams({ tab: tab === "PRIVACY_ND13" ? "privacy" : "tos" });
  };

  return (
    <div className="min-h-screen bg-slate-100/80 flex flex-col">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shrink-0 shadow-xs">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              if (window.history.length > 1) {
                navigate(-1);
              } else {
                navigate("/");
              }
            }}
            className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 transition-colors cursor-pointer border border-slate-200"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay lại</span>
          </button>
          <span className="text-slate-300">|</span>
          <span className="text-sm font-bold text-slate-800 hidden sm:inline">
            Văn Bản Pháp Lý & Thỏa Thuận Dịch Vụ SmartHire-AI
          </span>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/checkout"
            className="text-xs font-bold px-3.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors shadow-2xs"
          >
            Đến Trang Đặt Hàng &gt;
          </Link>
        </div>
      </header>

      {/* Main Full-page Viewer (Reusing the PDF sheet modal inline) */}
      <div className="flex-1 flex justify-center p-2 sm:p-4">
        <LegalPolicyModal
          openTab={activeTab}
          policyVersion="v2026.10"
          onClose={() => {
            if (window.history.length > 1) {
              navigate(-1);
            } else {
              navigate("/");
            }
          }}
          onSwitchTab={handleSwitchTab}
          inline={true}
        />
      </div>
    </div>
  );
}

export default LegalDocumentsPage;
