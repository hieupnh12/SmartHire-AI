import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, FileSignature, Building2, ShieldCheck, CreditCard, Loader2, Plus } from "lucide-react";
import { useMasterDashboard } from "@/features/master/shell/MasterAdminContext";
import { contractApi } from "@/api/master/contractApi";
import { consultationApi } from "@/api/master/consultationApi";

export function CreateContractPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const leadId = searchParams.get("leadId");

  const { tenants, plans, setContracts, triggerNotification } = useMasterDashboard();

  const [contractTenantId, setContractTenantId] = useState<number | "">("");
  const [contractPlanId, setContractPlanId] = useState<number | "">("");
  const [contractTitle, setContractTitle] = useState("Hợp Đồng Cung Cấp Dịch Vụ Tuyển Dụng AI & Dedicated DB SmartHire-AI");
  const [contractPartyBName, setContractPartyBName] = useState("");
  const [contractPartyBTaxCode, setContractPartyBTaxCode] = useState("");
  const [contractPartyBAddress, setContractPartyBAddress] = useState("");
  const [contractPartyBRepresentative, setContractPartyBRepresentative] = useState("");
  const [contractPartyBPosition, setContractPartyBPosition] = useState("Tổng Giám Đốc / Đại diện pháp luật");
  const [contractPartyBPhone, setContractPartyBPhone] = useState("");
  const [contractPartyBEmail, setContractPartyBEmail] = useState("");
  const [contractPartyBBankAccount, setContractPartyBBankAccount] = useState("");
  const [contractValue, setContractValue] = useState(3990);
  const [contractTaxRate, setContractTaxRate] = useState(10);
  const [contractCurrency, setContractCurrency] = useState("VND");
  const [contractStartDate, setContractStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [contractEndDate, setContractEndDate] = useState(new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split("T")[0]);
  const [contractTerms, setContractTerms] = useState(`1. Cam kết chất lượng dịch vụ (SLA):
- Chỉ số sẵn sàng (Uptime): Cam kết hệ thống đạt thời gian hoạt động tối thiểu 99.9% mỗi tháng (không bao gồm thời gian bảo trì định kỳ đã báo trước ít nhất 24 giờ).
- Khôi phục dữ liệu (RPO/RTO): Điểm khôi phục dữ liệu (RPO) <= 1 giờ; Thời gian khôi phục dịch vụ (RTO) <= 4 giờ khi xảy ra sự cố kỹ thuật nghiêm trọng.
- Hỗ trợ kỹ thuật: Tiếp nhận & xử lý phản hồi sự cố 24/7 qua kênh Email/Hotline hỗ trợ.

2. Tương thích và Tuân thủ Bảo vệ Dữ liệu Cá nhân (Nghị định 13/2023/NĐ-CP):
- Vai trò xử lý: Bên A đóng vai trò là Bên Xử lý Dữ liệu cá nhân / Bên Kiểm soát và Xử lý Dữ liệu cá nhân đối với các dữ liệu hồ sơ ứng viên do Bên B tải lên hệ thống SmartHire-AI.
- Tách biệt dữ liệu (Dedicated DB): Dữ liệu của Bên B được lưu trữ trên hạ tầng cơ sở dữ liệu tách biệt, mã hóa ở trạng thái nghỉ (Encryption at Rest) và mã hóa trên đường truyền (Encryption in Transit).
- Nghĩa vụ bảo mật: Bên A cam kết không sử dụng dữ liệu thương mại hoặc dữ liệu cá nhân của Bên B để huấn luyện (train) các mô hình AI dùng chung công khai mà không có sự đồng ý bằng văn bản của Bên B.
- Quyền của chủ thể dữ liệu: Hệ thống cung cấp công cụ cho phép Bên B thực hiện các quyền của chủ thể dữ liệu (truy xuất, chỉnh sửa, xóa bỏ, rút lại sự đồng ý) theo đúng quy định tại Nghị định 13/2023/NĐ-CP.`);
  const [contractNotes, setContractNotes] = useState("");
  
  const [creatingContract, setCreatingContract] = useState(false);
  const [loadingLead, setLoadingLead] = useState(false);

  useEffect(() => {
    // Set default tenant/plan if none selected
    if (tenants.length > 0 && contractTenantId === "" && !leadId) {
      setContractTenantId(tenants[0].id);
    }
    if (plans.length > 0 && contractPlanId === "") {
      const defaultPlan = plans[0];
      setContractPlanId(defaultPlan.id || "");
      setContractValue(defaultPlan.priceYearly || 3990);
    }
  }, [tenants, plans, contractTenantId, contractPlanId]);

  useEffect(() => {
    if (leadId) {
      const fetchLead = async () => {
        setLoadingLead(true);
        try {
          const lead = await consultationApi.getById(Number(leadId));
          setContractPartyBName(lead.companyName);
          setContractPartyBEmail(lead.workEmail);
          setContractPartyBRepresentative(lead.contactName);
          if (lead.phoneNumber) setContractPartyBPhone(lead.phoneNumber);
          if (lead.notes) setContractNotes(lead.notes);
          
          // Tự động match Tenant nếu đã cấp phát (dựa theo tên)
          if (tenants && tenants.length > 0) {
            const matched = tenants.find(t => t.name.toLowerCase() === lead.companyName.toLowerCase());
            if (matched) {
              setContractTenantId(matched.id);
            }
          }
        } catch (error) {
          console.error("Failed to fetch lead", error);
        } finally {
          setLoadingLead(false);
        }
      };
      fetchLead();
    }
  }, [leadId, tenants]);

  const handleCreateContractSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingContract(true);
    try {
      const payload = {
        tenantId: contractTenantId ? Number(contractTenantId) : undefined,
        planId: contractPlanId ? Number(contractPlanId) : undefined,
        consultationRequestId: leadId ? Number(leadId) : undefined,
        title: contractTitle,
        partyBName: contractPartyBName,
        partyBTaxCode: contractPartyBTaxCode,
        partyBAddress: contractPartyBAddress,
        partyBRepresentative: contractPartyBRepresentative,
        partyBPosition: contractPartyBPosition,
        partyBPhone: contractPartyBPhone,
        partyBEmail: contractPartyBEmail,
        partyBBankAccount: contractPartyBBankAccount,
        contractValue,
        taxRate: contractTaxRate,
        currency: contractCurrency,
        startDate: contractStartDate,
        endDate: contractEndDate,
        termsAndConditions: contractTerms,
        notes: contractNotes,
      };
      const res = await contractApi.create(payload as any);
      setContracts((prev) => [res, ...prev]);
      triggerNotification("Tạo hợp đồng B2B thành công!");
      navigate("/admin/contracts"); // go back to list
    } catch (err: any) {
      alert("Đã xảy ra lỗi khi tạo hợp đồng.");
    } finally {
      setCreatingContract(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fade-in pb-12">
      <div className="flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="p-2 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileSignature className="w-6 h-6 text-indigo-600" />
            Soạn Thảo Hợp Đồng Dịch Vụ
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Khởi tạo hợp đồng dịch vụ AI, Dedicated DB và bảo vệ dữ liệu PDPD
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 shadow-2xs relative">
        {loadingLead && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 flex items-center justify-center rounded-2xl">
            <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          </div>
        )}

        <form onSubmit={handleCreateContractSubmit} className="space-y-6 text-sm">
          {/* SECTION 1: CONTRACT GENERAL & TENANT */}
          <div className="p-5 bg-slate-50/50 rounded-xl border border-slate-200 space-y-4">
            <div className="font-bold text-indigo-900 text-sm uppercase flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-600" />
              <span>1. Thông Tin Doanh Nghiệp & Gói Cước</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(!leadId || contractTenantId !== "") && (
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Khách Hàng (Workspace) <span className="font-normal text-slate-500 text-xs ml-1">{leadId ? "(Đã liên kết)" : "(Có thể để trống)"}</span>
                  </label>
                  <select
                    disabled={!!leadId}
                    value={contractTenantId}
                  onChange={(e) => {
                    const tId = Number(e.target.value);
                    setContractTenantId(tId);
                    const selectedT = tenants.find((t) => t.id === tId);
                    if (selectedT) {
                      // Nếu đi từ trang Lead (có leadId) thì ưu tiên giữ data của Lead, không ghi đè.
                      // Chỉ ghi đè nếu các ô đang trống hoặc không có leadId.
                      if (!leadId) {
                        setContractPartyBName(selectedT.name);
                        setContractPartyBAddress(`Trụ sở chính ${selectedT.name}`);
                        setContractPartyBEmail(`admin@${selectedT.subdomain}.com`);
                      } else {
                        if (!contractPartyBName) setContractPartyBName(selectedT.name);
                        if (!contractPartyBAddress) setContractPartyBAddress(`Trụ sở chính ${selectedT.name}`);
                        if (!contractPartyBEmail) setContractPartyBEmail(`admin@${selectedT.subdomain}.com`);
                      }
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 font-semibold text-slate-800 focus:outline-none focus:border-indigo-600 bg-white"
                >
                  <option value="">-- Chọn doanh nghiệp ký hợp đồng --</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.code} - {t.subdomain}.smarthire.top)
                    </option>
                  ))}
                </select>
                <p className="text-xs text-slate-500 mt-1">Hệ thống sẽ tự động liên kết nếu tìm thấy dữ liệu.</p>
              </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Gói Dịch Vụ SaaS Tuyển Dụng</label>
                <select
                  value={contractPlanId}
                  onChange={(e) => {
                    const planIdVal = e.target.value ? Number(e.target.value) : "";
                    setContractPlanId(planIdVal);
                    const selectedP = plans.find((p) => String(p.id) === String(planIdVal));
                    if (selectedP) {
                      const basePrice = selectedP.priceYearly || 3990;
                      setContractValue(contractCurrency === "VND" ? basePrice * 25000 : basePrice);
                    }
                  }}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-800 focus:outline-none focus:border-indigo-600 bg-white"
                >
                  <option value="">-- Chọn gói cước (hoặc Tùy biến) --</option>
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} - ${p.priceMonthly}/tháng (${p.priceYearly}/năm)
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">Tiêu Đề Hợp Đồng *</label>
              <input
                type="text"
                required
                value={contractTitle}
                onChange={(e) => setContractTitle(e.target.value)}
                placeholder="VD: Hợp Đồng Cung Cấp Dịch Vụ Tuyển Dụng AI & Dedicated DB SmartHire-AI"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-800 focus:outline-none focus:border-indigo-600 font-medium"
              />
            </div>
          </div>

          {/* SECTION 2: BÊN B LEGAL DETAILS */}
          <div className="p-5 bg-slate-50/50 rounded-xl border border-slate-200 space-y-4">
            <div className="font-bold text-slate-900 text-sm uppercase flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-slate-600" />
              <span>2. Thông Tin Pháp Nhân Bên B (Khách Hàng Ký Kết)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Tên Công Ty Bên B *</label>
                <input
                  type="text"
                  required
                  value={contractPartyBName}
                  onChange={(e) => setContractPartyBName(e.target.value)}
                  placeholder="CÔNG TY CỔ PHẦN ABC..."
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-800 focus:outline-none focus:border-indigo-600 font-semibold"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Mã Số Thuế (MST Bên B) *</label>
                <input
                  type="text"
                  required
                  value={contractPartyBTaxCode}
                  onChange={(e) => setContractPartyBTaxCode(e.target.value)}
                  placeholder="0108899776"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 font-mono text-slate-900 focus:outline-none focus:border-indigo-600 font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">Địa Chỉ Đăng Ký Kinh Doanh *</label>
              <input
                type="text"
                required
                value={contractPartyBAddress}
                onChange={(e) => setContractPartyBAddress(e.target.value)}
                placeholder="Số 123 Đường ABC, Quận XYZ, TP. Hà Nội"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-800 focus:outline-none focus:border-indigo-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Người Đại Diện Pháp Luật *</label>
                <input
                  type="text"
                  required
                  value={contractPartyBRepresentative}
                  onChange={(e) => setContractPartyBRepresentative(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-800 focus:outline-none focus:border-indigo-600"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Chức Vụ *</label>
                <input
                  type="text"
                  required
                  value={contractPartyBPosition}
                  onChange={(e) => setContractPartyBPosition(e.target.value)}
                  placeholder="Tổng Giám Đốc"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-800 focus:outline-none focus:border-indigo-600"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Số Điện Thoại</label>
                <input
                  type="text"
                  value={contractPartyBPhone}
                  onChange={(e) => setContractPartyBPhone(e.target.value)}
                  placeholder="0988123456"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 font-mono text-slate-800 focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Email Nhận Hợp Đồng & Ký Số *</label>
                <input
                  type="email"
                  required
                  value={contractPartyBEmail}
                  onChange={(e) => setContractPartyBEmail(e.target.value)}
                  placeholder="ceo@company.com"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 font-mono text-indigo-700 focus:outline-none focus:border-indigo-600 font-semibold"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Tài Khoản Ngân Hàng Bên B (nếu có)</label>
                <input
                  type="text"
                  value={contractPartyBBankAccount}
                  onChange={(e) => setContractPartyBBankAccount(e.target.value)}
                  placeholder="123456789 - Ngân hàng Vietcombank"
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 font-mono text-slate-800 focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: FINANCIAL VALUE & VAT */}
          <div className="p-5 bg-slate-50/50 rounded-xl border border-slate-200 space-y-4">
            <div className="font-bold text-slate-900 text-sm uppercase flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-emerald-600" />
              <span>3. Giá Trị Hợp Đồng & Thuế VAT Theo Luật Việt Nam</span>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Giá Trị Trước Thuế *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={contractValue}
                  onChange={(e) => setContractValue(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 font-mono font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Thuế Suất VAT (%)</label>
                <select
                  value={contractTaxRate}
                  onChange={(e) => setContractTaxRate(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 font-bold text-slate-800 focus:outline-none focus:border-indigo-600 bg-white"
                >
                  <option value={10}>VAT 10% (Chuẩn dịch vụ phần mềm)</option>
                  <option value={8}>VAT 8% (Ưu đãi)</option>
                  <option value={0}>VAT 0% (Miễn thuế)</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">Loại Tiền Tệ</label>
                <select
                  value={contractCurrency}
                  onChange={(e) => {
                    const newCurrency = e.target.value;
                    if (newCurrency === "VND" && contractCurrency === "USD") {
                      setContractValue(contractValue * 25000);
                    } else if (newCurrency === "USD" && contractCurrency === "VND") {
                      setContractValue(Math.round(contractValue / 25000));
                    }
                    setContractCurrency(newCurrency);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 font-bold text-slate-800 focus:outline-none focus:border-indigo-600 bg-white"
                >
                  <option value="USD">USD ($)</option>
                  <option value="VND">VND (₫)</option>
                </select>
              </div>
            </div>

            <div className="p-4 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-sm">
              <div>
                <span className="text-slate-500">Tiền thuế VAT ({contractTaxRate}%): </span>
                <span className="font-mono font-semibold text-slate-800">${((contractValue * contractTaxRate) / 100).toLocaleString()} {contractCurrency}</span>
              </div>
              <div>
                <span className="font-bold text-slate-900">Tổng tiền thanh toán: </span>
                <span className="font-mono font-bold text-emerald-600 text-lg ml-2">
                  ${(contractValue + (contractValue * contractTaxRate) / 100).toLocaleString()} {contractCurrency}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 4: DATES & SLA */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 p-5 bg-slate-50/50 rounded-xl border border-slate-200">
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">Ngày Bắt Đầu Hiệu Lực *</label>
              <input
                type="date"
                required
                value={contractStartDate}
                onChange={(e) => setContractStartDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-800 focus:outline-none focus:border-indigo-600"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1.5">Ngày Kết Thúc Hiệu Lực *</label>
              <input
                type="date"
                required
                value={contractEndDate}
                onChange={(e) => setContractEndDate(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-800 focus:outline-none focus:border-indigo-600"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">Điều Khoản Dịch Vụ & Cam Kết SLA (Nghị Định 13/2023/NĐ-CP)</label>
            <textarea
              rows={4}
              value={contractTerms}
              onChange={(e) => setContractTerms(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:border-indigo-600 resize-none font-mono text-xs"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">Ghi Chú Nội Bộ (Tùy chọn)</label>
            <input
              type="text"
              value={contractNotes}
              onChange={(e) => setContractNotes(e.target.value)}
              placeholder="Ghi chú thêm về điều khoản bổ sung hoặc mã ưu đãi..."
              className="w-full px-4 py-3 rounded-xl border border-slate-300 focus:outline-none focus:border-indigo-600 text-sm"
            />
          </div>

          <div className="pt-4 flex gap-3 justify-end border-t border-slate-200">
            <button
              type="button"
              onClick={() => navigate("/admin/contracts")}
              className="px-6 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold transition-colors"
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              disabled={creatingContract}
              className="px-8 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm transition-colors"
            >
              {creatingContract ? <Loader2 className="w-5 h-5 animate-spin" /> : <Plus className="w-5 h-5" />}
              <span>Tạo Hợp Đồng B2B</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
