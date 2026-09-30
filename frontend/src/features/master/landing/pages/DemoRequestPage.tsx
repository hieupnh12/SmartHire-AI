import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  PhoneCall,
  FileText,
  Loader2,
  Send,
  CheckCircle2,
  ChevronDown,
} from "lucide-react";
import { consultationApi } from "@/api/master/consultationApi";
import { LandingHeader } from "../components/LandingHeader";
import { LandingFooter } from "../components/LandingFooter";

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
   Custom Combobox component (styled like screenshot)
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

  // Close on outside click — restore query to committed value
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
        setQuery(value); // restore displayed text when closing without selecting
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [value]);

  // Sync query when value changes from outside
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
      {/* Trigger input */}
      <div
        className={`flex items-center w-full px-4 py-3 rounded-xl bg-slate-50 border text-sm text-slate-900 transition-colors cursor-text ${open
            ? "border-blue-500 bg-white ring-3 ring-blue-100"
            : "border-slate-300 hover:border-slate-400"
          }`}
        onClick={() => {
          setQuery(""); // clear so all options show
          setOpen(true);
          inputRef.current?.focus();
        }}
      >
        <input
          ref={inputRef}
          type="text"
          required
          autoComplete="off"
          placeholder="Chọn hoặc nhập chức vụ của bạn..."
          value={query}
          onChange={handleInputChange}
          onFocus={() => {
            setQuery(""); // clear filter so all options are visible
            setOpen(true);
          }}
          className="flex-1 bg-transparent outline-none text-slate-900 placeholder-slate-400 text-sm"
        />
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ml-2 ${open ? "rotate-180" : ""
            }`}
        />
      </div>

      {/* Dropdown popover */}
      {open && (
        <div className="absolute z-50 mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-fade-in">
          <ul className="py-1.5 max-h-60 overflow-y-auto">
            {filtered.length === 0 ? (
              <li className="px-4 py-3 text-sm text-slate-400 text-center">
                Không tìm thấy chức vụ phù hợp
              </li>
            ) : (
              filtered.map((opt) => {
                const isSelected = value === opt;
                return (
                  <li
                    key={opt}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      handleSelect(opt);
                    }}
                    className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors select-none ${isSelected ? "bg-slate-50" : "hover:bg-slate-50"
                      }`}
                  >
                    {/* Label */}
                    <span
                      className={`flex-1 text-sm ${isSelected
                          ? "font-semibold text-slate-900"
                          : "font-medium text-slate-700"
                        }`}
                    >
                      {opt}
                    </span>

                    {/* Right checkmark — only when selected */}
                    {isSelected && (
                      <CheckCircle2 className="w-4 h-4 text-teal-500 flex-shrink-0" />
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
      {/* Trigger button */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center w-full px-4 py-3 rounded-xl bg-slate-50 border text-sm transition-colors ${open
            ? "border-blue-500 bg-white ring-3 ring-blue-100"
            : "border-slate-300 hover:border-slate-400"
          }`}
      >
        <span className={`flex-1 text-left ${selected ? "text-slate-900" : "text-slate-400"}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 transition-transform flex-shrink-0 ml-2 ${open ? "rotate-180" : ""
            }`}
        />
      </button>

      {/* Popover */}
      {open && (
        <div className="absolute z-50 mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-fade-in">
          <ul className="py-1.5">
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
                  className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors select-none ${isSelected ? "bg-slate-50" : "hover:bg-slate-50"
                    }`}
                >
                  <span
                    className={`flex-1 text-sm ${isSelected ? "font-semibold text-slate-900" : "font-medium text-slate-700"
                      }`}
                  >
                    {opt.label}
                  </span>
                  {isSelected && (
                    <CheckCircle2 className="w-4 h-4 text-teal-500 flex-shrink-0" />
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
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <LandingHeader />

      <main className="flex-1 flex items-start justify-center py-12 px-4 sm:px-6 mt-[80px] sm:mt-[84px]">
        <div className="w-full max-w-2xl">
          {!demoSubmitted ? (
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-8 sm:p-10">
              {/* Header */}
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
                  {requestType === "DEMO" ? (
                    <PhoneCall className="w-6 h-6" />
                  ) : (
                    <FileText className="w-6 h-6" />
                  )}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">
                    {requestType === "DEMO"
                      ? "Đăng Ký Trải Nghiệm Demo 1:1"
                      : "Tư Vấn Báo Giá & Hợp Đồng"}
                  </h1>
                  <span className="text-sm font-medium text-blue-600">
                    {selectedTier}
                  </span>
                </div>
              </div>

              {/* Tab switcher */}
              <div className="flex rounded-xl bg-slate-100 p-1 mb-6 text-sm font-semibold">
                <button
                  type="button"
                  onClick={() => setRequestType("DEMO")}
                  className={`flex-1 py-2 rounded-lg transition-all ${requestType === "DEMO"
                      ? "bg-white text-blue-600 shadow"
                      : "text-slate-500 hover:text-slate-900"
                    }`}
                >
                  Đặt Lịch Demo 1:1
                </button>
                <button
                  type="button"
                  onClick={() => setRequestType("CONTRACT_QUOTE")}
                  className={`flex-1 py-2 rounded-lg transition-all ${requestType === "CONTRACT_QUOTE"
                      ? "bg-white text-blue-600 shadow"
                      : "text-slate-500 hover:text-slate-900"
                    }`}
                >
                  Báo Giá & Hợp Đồng Enterprise
                </button>
              </div>

              {submitError && (
                <div className="mb-5 p-4 rounded-xl bg-red-50 border border-red-200 text-sm text-red-600">
                  {submitError}
                </div>
              )}

              <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                {requestType === "DEMO"
                  ? "Chuyên viên giải pháp của SmartHire-AI sẽ liên hệ trong 2 giờ làm việc để chuẩn bị nội dung demo phù hợp với doanh nghiệp của bạn."
                  : "Đội ngũ chuyên trách Enterprise sẽ liên hệ để trao đổi chi tiết bảng giá, thỏa thuận SLA và quy trình ký kết hợp đồng."}
              </p>

              <form onSubmit={handleDemoSubmit} className="space-y-4">
                {/* Company name */}
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-1.5">
                    Tên Doanh Nghiệp / Tổ Chức{" "}
                    <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Tập đoàn Công nghệ VNP..."
                    value={formData.companyName}
                    onChange={(e) =>
                      setFormData({ ...formData, companyName: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:border-blue-500 focus:bg-white focus:ring-3 focus:ring-blue-100 focus:outline-none transition-colors"
                  />
                </div>

                {/* Contact name + Job title (combobox) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-1.5">
                      Họ và Tên Người Liên Hệ{" "}
                      <span className="text-red-500">*</span>
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
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:border-blue-500 focus:bg-white focus:ring-3 focus:ring-blue-100 focus:outline-none transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-1.5">
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

                {/* Email + Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-1.5">
                      Email Doanh Nghiệp{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="name@company.com"
                      value={formData.workEmail}
                      onChange={(e) =>
                        setFormData({ ...formData, workEmail: e.target.value })
                      }
                      className={`w-full px-4 py-3 rounded-xl bg-slate-50 border text-sm text-slate-900 focus:bg-white focus:ring-3 focus:outline-none transition-colors ${isPersonalEmail(formData.workEmail)
                          ? "border-amber-500 focus:border-amber-500 focus:ring-amber-100"
                          : "border-slate-300 focus:border-blue-500 focus:ring-blue-100"
                        }`}
                    />
                    {isPersonalEmail(formData.workEmail) && (
                      <span className="text-xs text-amber-600 mt-1 block">
                        * Yêu cầu email công ty (domain riêng, không dùng
                        @gmail/@yahoo)
                      </span>
                    )}
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-slate-900 mb-1.5">
                      Số Điện Thoại Liên Hệ{" "}
                      <span className="text-red-500">*</span>
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
                      className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:border-blue-500 focus:bg-white focus:ring-3 focus:ring-blue-100 focus:outline-none transition-colors"
                    />
                  </div>
                </div>

                {/* Company size */}
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-1.5">
                    Quy Mô Nhân Sự Doanh Nghiệp
                  </label>
                  <CustomDropdown
                    value={formData.companySize}
                    onChange={(v) => setFormData({ ...formData, companySize: v })}
                    options={COMPANY_SIZE_OPTIONS}
                    placeholder="Chọn quy mô doanh nghiệp..."
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-semibold text-slate-900 mb-1.5">
                    Nhu Cầu hoặc Ghi Chú Cụ Thể (Tùy chọn)
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Ví dụ: Mong muốn tích hợp đánh giá code tự động và phỏng vấn AI cho khối IT..."
                    value={formData.notes}
                    onChange={(e) =>
                      setFormData({ ...formData, notes: e.target.value })
                    }
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:border-blue-500 focus:bg-white focus:ring-3 focus:ring-blue-100 focus:outline-none transition-colors resize-none"
                  />
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full mt-2 py-4 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-[0.98] text-white font-semibold text-sm shadow-lg shadow-blue-600/20 transition-all flex items-center justify-center gap-2 disabled:opacity-60 disabled:pointer-events-none"
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
            /* Success */
            <div className="bg-white border border-slate-200 rounded-2xl shadow-xl p-10 text-center">
              <div className="w-20 h-20 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto mb-6 border border-emerald-200">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 mb-3">
                Đã Tiếp Nhận Thông Tin!
              </h2>
              <p className="text-sm text-slate-600 mb-8 leading-relaxed max-w-md mx-auto">
                Cảm ơn Quý doanh nghiệp{" "}
                <strong>{formData.companyName}</strong>. Chuyên viên giải pháp
                của SmartHire-AI sẽ liên hệ trực tiếp qua email{" "}
                <strong>{formData.workEmail}</strong> và số điện thoại{" "}
                <strong>{formData.phoneNumber}</strong> trong vòng 2 giờ làm
                việc.
              </p>
              <button
                onClick={() => navigate("/")}
                className="px-8 py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors"
              >
                Về Trang Chủ
              </button>
            </div>
          )}
        </div>
      </main>

      <LandingFooter />
    </div>
  );
}
