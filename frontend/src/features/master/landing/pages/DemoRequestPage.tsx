import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  PhoneCall,
  FileText,
  Loader2,
  Send,
  CheckCircle2,
  ChevronDown,
  ArrowLeft,
  BrainCircuit,
} from "lucide-react";
import { consultationApi } from "@/api/master/consultationApi";

/* ─────────────────────────────────────────────
   Job-title options
───────────────────────────────────────────── */
const JOB_TITLE_OPTIONS = [
  "Giám Đốc Nhân Sự",
  "Trưởng Phòng Nhân Sự",
  "Trưởng Phòng Tuyển Dụng",
  "Chuyên Viên Tuyển Dụng",
  "Giám Đốc Điều Hành",
  "Giám Đốc Công Nghệ",
  "Trưởng Nhóm Kỹ Thuật",
  "Quản Lý Dự Án",
  "Giám Đốc Vận Hành",
  "Chủ Doanh Nghiệp",
  "Trưởng Phòng Hành Chính",
  "Quản Lý Phát Triển Kinh Doanh",
];

/* ─────────────────────────────────────────────
   Custom Combobox component
───────────────────────────────────────────── */
function JobTitleCombobox({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setQuery(value);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value]);

  // Sync query when value changes
  useEffect(() => {
    setQuery(value);
  }, [value]);

  const filtered =
    query.trim() === ""
      ? JOB_TITLE_OPTIONS
      : JOB_TITLE_OPTIONS.filter((o) =>
        o.toLowerCase().includes(query.toLowerCase())
      );

  const handleSelect = (label: string) => {
    onChange(label);
    setQuery(label);
    setOpen(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    onChange(e.target.value);
    setOpen(true);
  };

  return (
    <div ref={containerRef} className="relative">
      <div
        className={`flex items-center w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border text-xs sm:text-sm text-slate-900 transition-colors cursor-text ${open
            ? "border-blue-500 bg-white ring-2 ring-blue-100"
            : "border-slate-300 hover:border-slate-400"
          }`}
        onClick={() => {
          setQuery("");
          setOpen(true);
          inputRef.current?.focus();
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => {
            setQuery("");
            setOpen(true);
          }}
          placeholder="Chọn hoặc nhập chức vụ..."
          className="flex-1 bg-transparent border-none outline-none text-xs sm:text-sm text-slate-900 placeholder:text-slate-400"
        />
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ml-1.5 ${open ? "rotate-180" : ""
            }`}
        />
      </div>

      {open && (
        <div className="absolute z-50 mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
          <ul className="py-1">
            {filtered.length === 0 ? (
              <li
                onMouseDown={() => handleSelect(query.trim())}
                className="px-3.5 py-2 text-xs text-blue-600 hover:bg-blue-50 cursor-pointer font-medium"
              >
                Sử dụng &quot;{query.trim()}&quot;
              </li>
            ) : (
              filtered.map((title) => {
                const isSelected = value === title;
                return (
                  <li
                    key={title}
                    onMouseDown={() => handleSelect(title)}
                    className={`flex items-center gap-2 px-3.5 py-2 cursor-pointer transition-colors text-xs ${isSelected
                        ? "bg-blue-50 text-blue-700 font-semibold"
                        : "hover:bg-slate-50 text-slate-700"
                      }`}
                  >
                    <span className="flex-1 truncate">{title}</span>
                    {isSelected && (
                      <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Company size options
───────────────────────────────────────────── */
const COMPANY_SIZE_OPTIONS: { value: string; label: string }[] = [
  { value: "50-100", label: "Dưới 100 nhân sự" },
  { value: "100-500", label: "100 – 500 nhân sự" },
  { value: "500-2000", label: "500 – 2.000 nhân sự" },
  { value: "2000+", label: "Trên 2.000 nhân sự" },
];

/* Generic styled dropdown for fixed option lists */
function CustomDropdown({
  value,
  onChange,
  options,
  placeholder = "Chọn...",
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border text-xs sm:text-sm transition-colors ${open
            ? "border-blue-500 bg-white ring-2 ring-blue-100"
            : "border-slate-300 hover:border-slate-400"
          }`}
      >
        <span className={`flex-1 text-left truncate ${selected ? "text-slate-900" : "text-slate-400"}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ml-1.5 ${open ? "rotate-180" : ""
            }`}
        />
      </button>

      {open && (
        <div className="absolute z-50 mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
          <ul className="py-1">
            {options.map((opt) => {
              const isSelected = value === opt.value;
              return (
                <li
                  key={opt.value}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    onChange(opt.value);
                    setOpen(false);
                  }}
                  className={`flex items-center gap-2 px-3.5 py-2 cursor-pointer transition-colors text-xs select-none ${isSelected
                      ? "bg-blue-50 text-blue-700 font-semibold"
                      : "hover:bg-slate-50 text-slate-700"
                    }`}
                >
                  <span className="flex-1 truncate">{opt.label}</span>
                  {isSelected && (
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-600 flex-shrink-0" />
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Form interface & helpers
───────────────────────────────────────────── */
interface DemoRequestForm {
  companyName: string;
  contactName: string;
  jobTitle: string;
  workEmail: string;
  phoneNumber: string;
  companySize: string;
  primaryNeed: string;
  notes: string;
}

const BLOCKED_PERSONAL_DOMAINS = [
  "gmail.com",
  "yahoo.com",
  "hotmail.com",
  "outlook.com",
  "live.com",
  "icloud.com",
  "mail.com",
  "zoho.com",
  "proton.me",
  "protonmail.com",
  "yandex.com",
];

const isPersonalEmail = (email: string) => {
  const domain = email.trim().toLowerCase().split("@")[1];
  return domain ? BLOCKED_PERSONAL_DOMAINS.includes(domain) : false;
};

/* ─────────────────────────────────────────────
   Page component
───────────────────────────────────────────── */
export function DemoRequestPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const initialTier =
    searchParams.get("tier") || "Tư Vấn Giải Pháp Doanh Nghiệp";
  const initialType =
    (searchParams.get("type") as "DEMO" | "CONTRACT_QUOTE") || "DEMO";

  const [requestType, setRequestType] = useState<"DEMO" | "CONTRACT_QUOTE">(
    initialType
  );
  const [selectedTier] = useState(initialTier);

  const [formData, setFormData] = useState<DemoRequestForm>({
    companyName: "",
    contactName: "",
    jobTitle: "",
    workEmail: "",
    phoneNumber: "",
    companySize: "100-500",
    primaryNeed: "Tự động hóa sàng lọc CV và phỏng vấn sơ loại AI",
    notes: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [demoSubmitted, setDemoSubmitted] = useState(false);

  const handleDemoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (isPersonalEmail(formData.workEmail)) {
      setSubmitError(
        "Vui lòng sử dụng Email Doanh nghiệp (domain công ty riêng, ví dụ: name@company.com) để được xếp lịch thẩm định & demo 1:1 nhanh nhất."
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await consultationApi.submit({
        companyName: formData.companyName,
        contactName: formData.contactName,
        jobTitle: formData.jobTitle,
        workEmail: formData.workEmail,
        phoneNumber: formData.phoneNumber,
        companySize: formData.companySize,
        requestType,
        planTier: selectedTier,
        primaryNeed: formData.primaryNeed,
        notes: formData.notes,
      });
      setDemoSubmitted(true);
    } catch (err: any) {
      if (
        err?.response?.data?.errors &&
        typeof err.response.data.errors === "object"
      ) {
        const firstErrMsg = Object.values(
          err.response.data.errors
        )[0] as string;
        setSubmitError(
          firstErrMsg ||
          err.response.data.message ||
          "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại."
        );
      } else if (err?.response?.data?.message) {
        setSubmitError(err.response.data.message);
      } else if (err?.message === "Network Error" || !err?.response) {
        setSubmitError(
          "Không thể kết nối đến máy chủ Backend (Port 8080). Vui lòng đảm bảo dịch vụ Backend đang chạy."
        );
      } else {
        setSubmitError(
          "Không thể gửi yêu cầu lúc này. Vui lòng thử lại hoặc gửi email tới contact@smarthire.top"
        );
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="h-screen w-screen bg-slate-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto sm:overflow-hidden">
      <div className="w-full max-w-2xl my-auto">
        {!demoSubmitted ? (
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-5 sm:p-6 lg:p-7">
            {/* Top Navigation & Brand Header */}
            <div className="flex items-center justify-between pb-3 mb-3.5 border-b border-slate-100">
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-slate-600 hover:text-blue-600 transition-colors group"
              >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-500 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                  <BrainCircuit className="w-4 h-4 text-white" />
                </div>
                <span className="text-base font-bold tracking-tight text-slate-900 font-display">
                  SmartHire<span className="text-blue-600">.AI</span>
                </span>
              </Link>

              <div className="flex items-center gap-2">
                <span className="text-[11px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200/80">
                  {selectedTier}
                </span>
                <Link
                  to="/"
                  className="text-xs text-slate-400 hover:text-slate-600 inline-flex items-center gap-1 transition-colors ml-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Trang chủ</span>
                </Link>
              </div>
            </div>

            {/* Title & Subtitle */}
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 flex items-center gap-2">
                  {requestType === "DEMO" ? (
                    <PhoneCall className="w-5 h-5 text-blue-600 shrink-0" />
                  ) : (
                    <FileText className="w-5 h-5 text-blue-600 shrink-0" />
                  )}
                  <span>
                    {requestType === "DEMO"
                      ? "Đăng Ký Trải Nghiệm Demo 1:1"
                      : "Tư Vấn Báo Giá & Hợp Đồng"}
                  </span>
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  {requestType === "DEMO"
                    ? "Chuyên viên giải pháp sẽ liên hệ trong 2h để chuẩn bị nội dung demo phù hợp."
                    : "Đội ngũ chuyên trách Enterprise sẽ liên hệ chi tiết bảng giá và thỏa thuận SLA."}
                </p>
              </div>
            </div>

            {/* Tab switcher */}
            <div className="flex rounded-lg bg-slate-100 p-1 mb-3.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setRequestType("DEMO")}
                className={`flex-1 py-1.5 rounded-md transition-all ${requestType === "DEMO"
                    ? "bg-white text-blue-600 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                  }`}
              >
                Đặt Lịch Demo 1:1
              </button>
              <button
                type="button"
                onClick={() => setRequestType("CONTRACT_QUOTE")}
                className={`flex-1 py-1.5 rounded-md transition-all ${requestType === "CONTRACT_QUOTE"
                    ? "bg-white text-blue-600 shadow-xs"
                    : "text-slate-500 hover:text-slate-900"
                  }`}
              >
                Báo Giá & Hợp Đồng Enterprise
              </button>
            </div>

            {submitError && (
              <div className="mb-3 p-3 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
                {submitError}
              </div>
            )}

            <form onSubmit={handleDemoSubmit} className="space-y-3">
              {/* Row 1: Tên Doanh Nghiệp + Quy Mô Nhân Sự */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Tên Doanh Nghiệp / Tổ Chức <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Tập đoàn Công nghệ..."
                    value={formData.companyName}
                    onChange={(e) =>
                      setFormData({ ...formData, companyName: e.target.value })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs sm:text-sm text-slate-900 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Quy Mô Nhân Sự Doanh Nghiệp
                  </label>
                  <CustomDropdown
                    value={formData.companySize}
                    onChange={(v) => setFormData({ ...formData, companySize: v })}
                    options={COMPANY_SIZE_OPTIONS}
                    placeholder="Chọn quy mô..."
                  />
                </div>
              </div>

              {/* Row 2: Họ và Tên + Chức Vụ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Họ và Tên Người Liên Hệ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Nguyễn Văn A"
                    value={formData.contactName}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contactName: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs sm:text-sm text-slate-900 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:outline-none transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Chức Vụ <span className="text-red-500">*</span>
                  </label>
                  <JobTitleCombobox
                    value={formData.jobTitle}
                    onChange={(v) =>
                      setFormData({ ...formData, jobTitle: v })
                    }
                  />
                </div>
              </div>

              {/* Row 3: Email + Số Điện Thoại */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Email Doanh Nghiệp <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    placeholder="name@company.com"
                    value={formData.workEmail}
                    onChange={(e) =>
                      setFormData({ ...formData, workEmail: e.target.value })
                    }
                    className={`w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border text-xs sm:text-sm text-slate-900 focus:bg-white focus:ring-2 focus:outline-none transition-colors ${isPersonalEmail(formData.workEmail)
                        ? "border-amber-500 focus:border-amber-500 focus:ring-amber-100"
                        : "border-slate-300 focus:border-blue-500 focus:ring-blue-100"
                      }`}
                  />
                  {isPersonalEmail(formData.workEmail) && (
                    <span className="text-[11px] text-amber-600 mt-1 block">
                      * Yêu cầu email tên miền công ty (không dùng @gmail/@yahoo)
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-800 mb-1">
                    Số Điện Thoại Liên Hệ <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="0912 345 678"
                    value={formData.phoneNumber}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        phoneNumber: e.target.value,
                      })
                    }
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs sm:text-sm text-slate-900 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Row 4: Nhu cầu / Ghi chú */}
              <div>
                <label className="block text-xs font-semibold text-slate-800 mb-1">
                  Nhu Cầu hoặc Ghi Chú Cụ Thể (Tùy chọn)
                </label>
                <input
                  type="text"
                  placeholder="Ví dụ: Tích hợp đánh giá code tự động và phỏng vấn AI cho khối IT..."
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-300 text-xs sm:text-sm text-slate-900 focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 focus:outline-none transition-colors"
                />
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full mt-1.5 py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-semibold text-xs sm:text-sm shadow-md shadow-blue-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:pointer-events-none cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang gửi thông tin...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>
                      {requestType === "DEMO"
                        ? "Gửi Yêu Cầu Đặt Lịch Demo"
                        : "Gửi Yêu Cầu Báo Giá & Ký Hợp Đồng"}
                    </span>
                  </>
                )}
              </button>
            </form>
          </div>
        ) : (
          /* Success Card */
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-8 sm:p-10 text-center max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-4 border border-emerald-200">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 mb-2">
              Đã Tiếp Nhận Thông Tin!
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mb-6 leading-relaxed max-w-md mx-auto">
              Cảm ơn Quý doanh nghiệp <strong>{formData.companyName}</strong>. Chuyên viên giải pháp của SmartHire-AI sẽ liên hệ trực tiếp qua email <strong>{formData.workEmail}</strong> và số điện thoại <strong>{formData.phoneNumber}</strong> trong vòng 2 giờ làm việc.
            </p>
            <button
              onClick={() => navigate("/")}
              className="px-6 py-2.5 rounded-xl bg-blue-600 text-white text-xs sm:text-sm font-semibold hover:bg-blue-700 transition-colors cursor-pointer"
            >
              Về Trang Chủ
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
