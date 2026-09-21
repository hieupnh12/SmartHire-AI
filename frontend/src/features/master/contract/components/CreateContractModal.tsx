import React from "react";
import { X, FileSignature, Building2, ShieldCheck, CreditCard, Loader2, Plus } from "lucide-react";
import { TenantInfo, SubscriptionPlan } from "@/api/master/masterAdminApi";

interface CreateContractModalProps {
  showCreateContractModal: boolean;
  setShowCreateContractModal: (val: boolean) => void;
  tenants: TenantInfo[];
  plans: SubscriptionPlan[];
  contractTenantId: string | number;
  setContractTenantId: (val: number) => void;
  contractPlanId: string | number;
  setContractPlanId: (val: number | "") => void;
  contractTitle: string;
  setContractTitle: (val: string) => void;
  contractPartyBName: string;
  setContractPartyBName: (val: string) => void;
  contractPartyBTaxCode: string;
  setContractPartyBTaxCode: (val: string) => void;
  contractPartyBAddress: string;
  setContractPartyBAddress: (val: string) => void;
  contractPartyBRepresentative: string;
  setContractPartyBRepresentative: (val: string) => void;
  contractPartyBPosition: string;
  setContractPartyBPosition: (val: string) => void;
  contractPartyBPhone: string;
  setContractPartyBPhone: (val: string) => void;
  contractPartyBEmail: string;
  setContractPartyBEmail: (val: string) => void;
  contractPartyBBankAccount: string;
  setContractPartyBBankAccount: (val: string) => void;
  contractValue: number;
  setContractValue: (val: number) => void;
  contractTaxRate: number;
  setContractTaxRate: (val: number) => void;
  contractCurrency: string;
  setContractCurrency: (val: string) => void;
  contractStartDate: string;
  setContractStartDate: (val: string) => void;
  contractEndDate: string;
  setContractEndDate: (val: string) => void;
  contractTerms: string;
  setContractTerms: (val: string) => void;
  contractNotes: string;
  setContractNotes: (val: string) => void;
  creatingContract: boolean;
  handleCreateContractSubmit: (e: React.FormEvent) => void;
}

export function CreateContractModal({
  showCreateContractModal,
  setShowCreateContractModal,
  tenants,
  plans,
  contractTenantId,
  setContractTenantId,
  contractPlanId,
  setContractPlanId,
  contractTitle,
  setContractTitle,
  contractPartyBName,
  setContractPartyBName,
  contractPartyBTaxCode,
  setContractPartyBTaxCode,
  contractPartyBAddress,
  setContractPartyBAddress,
  contractPartyBRepresentative,
  setContractPartyBRepresentative,
  contractPartyBPosition,
  setContractPartyBPosition,
  contractPartyBPhone,
  setContractPartyBPhone,
  contractPartyBEmail,
  setContractPartyBEmail,
  contractPartyBBankAccount,
  setContractPartyBBankAccount,
  contractValue,
  setContractValue,
  contractTaxRate,
  setContractTaxRate,
  contractCurrency,
  setContractCurrency,
  contractStartDate,
  setContractStartDate,
  contractEndDate,
  setContractEndDate,
  contractTerms,
  setContractTerms,
  contractNotes,
  setContractNotes,
  creatingContract,
  handleCreateContractSubmit,
}: CreateContractModalProps) {
  if (!showCreateContractModal) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl relative animate-fade-in max-h-[90vh] overflow-y-auto">
        <button
          onClick={() => setShowCreateContractModal(false)}
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold border border-indigo-200">
            <FileSignature className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Soạn Thảo Hợp Đồng Dịch Vụ B2B (Chuẩn Pháp Lý VN)</h3>
            <span className="text-xs text-slate-500">Khởi tạo hợp đồng dịch vụ AI, Dedicated DB và bảo vệ dữ liệu PDPD</span>
          </div>
        </div>

        <form onSubmit={handleCreateContractSubmit} className="space-y-4 text-xs">
          {/* SECTION 1: CONTRACT GENERAL & TENANT */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="font-bold text-indigo-900 text-xs uppercase flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-indigo-600" />
              <span>1. Thông Tin Doanh Nghiệp & Gói Cước</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Khách Hàng (Tenant) *</label>
                <select
                  required
                  value={contractTenantId}
                  onChange={(e) => {
                    const tId = Number(e.target.value);
                    setContractTenantId(tId);
                    const selectedT = tenants.find((t) => t.id === tId);
                    if (selectedT) {
                      setContractPartyBName(selectedT.name);
                      setContractPartyBAddress(`Trụ sở chính ${selectedT.name}`);
                      setContractPartyBEmail(`admin@${selectedT.subdomain}.com`);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-semibold text-slate-800 focus:outline-none focus:border-indigo-600 bg-white"
                >
                  <option value="">-- Chọn doanh nghiệp ký hợp đồng --</option>
                  {tenants.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} ({t.code} - {t.subdomain}.smarthire.top)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Gói Dịch Vụ SaaS Tuyển Dụng</label>
                <select
                  value={contractPlanId}
                  onChange={(e) => {
                    const planIdVal = e.target.value ? Number(e.target.value) : "";
                    setContractPlanId(planIdVal);
                    const selectedP = plans.find((p) => String(p.id) === String(planIdVal));
                    if (selectedP) {
                      setContractValue(selectedP.priceYearly || 3990);
                    }
                  }}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-800 focus:outline-none focus:border-indigo-600 bg-white"
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
              <label className="block font-semibold text-slate-700 mb-1">Tiêu Đề Hợp Đồng *</label>
              <input
                type="text"
                required
                value={contractTitle}
                onChange={(e) => setContractTitle(e.target.value)}
                placeholder="VD: Hợp Đồng Cung Cấp Dịch Vụ Tuyển Dụng AI & Dedicated DB SmartHire-AI"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-800 focus:outline-none focus:border-indigo-600 font-medium"
              />
            </div>
          </div>

          {/* SECTION 2: BÊN B LEGAL DETAILS */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="font-bold text-slate-900 text-xs uppercase flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-slate-600" />
              <span>2. Thông Tin Pháp Nhân Bên B (Khách Hàng Ký Kết)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tên Công Ty Bên B *</label>
                <input
                  type="text"
                  required
                  value={contractPartyBName}
                  onChange={(e) => setContractPartyBName(e.target.value)}
                  placeholder="CÔNG TY CỔ PHẦN ABC..."
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-800 focus:outline-none focus:border-indigo-600 font-semibold"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mã Số Thuế (MST Bên B) *</label>
                <input
                  type="text"
                  required
                  value={contractPartyBTaxCode}
                  onChange={(e) => setContractPartyBTaxCode(e.target.value)}
                  placeholder="0108899776"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-slate-900 focus:outline-none focus:border-indigo-600 font-bold"
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Địa Chỉ Đăng Ký Kinh Doanh *</label>
              <input
                type="text"
                required
                value={contractPartyBAddress}
                onChange={(e) => setContractPartyBAddress(e.target.value)}
                placeholder="Số 123 Đường ABC, Quận XYZ, TP. Hà Nội"
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-800 focus:outline-none focus:border-indigo-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Người Đại Diện Pháp Luật *</label>
                <input
                  type="text"
                  required
                  value={contractPartyBRepresentative}
                  onChange={(e) => setContractPartyBRepresentative(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-800 focus:outline-none focus:border-indigo-600"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Chức Vụ *</label>
                <input
                  type="text"
                  required
                  value={contractPartyBPosition}
                  onChange={(e) => setContractPartyBPosition(e.target.value)}
                  placeholder="Tổng Giám Đốc"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-800 focus:outline-none focus:border-indigo-600"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Số Điện Thoại</label>
                <input
                  type="text"
                  value={contractPartyBPhone}
                  onChange={(e) => setContractPartyBPhone(e.target.value)}
                  placeholder="0988123456"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-slate-800 focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Email Nhận Hợp Đồng & Ký Số *</label>
                <input
                  type="email"
                  required
                  value={contractPartyBEmail}
                  onChange={(e) => setContractPartyBEmail(e.target.value)}
                  placeholder="ceo@company.com"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-indigo-700 focus:outline-none focus:border-indigo-600 font-semibold"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tài Khoản Ngân Hàng Bên B (nếu có)</label>
                <input
                  type="text"
                  value={contractPartyBBankAccount}
                  onChange={(e) => setContractPartyBBankAccount(e.target.value)}
                  placeholder="123456789 - Ngân hàng Vietcombank"
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono text-slate-800 focus:outline-none focus:border-indigo-600"
                />
              </div>
            </div>
          </div>

          {/* SECTION 3: FINANCIAL VALUE & VAT */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="font-bold text-slate-900 text-xs uppercase flex items-center gap-1.5">
              <CreditCard className="w-4 h-4 text-emerald-600" />
              <span>3. Giá Trị Hợp Đồng & Thuế VAT Theo Luật Việt Nam</span>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Giá Trị Trước Thuế *</label>
                <input
                  type="number"
                  required
                  min={1}
                  value={contractValue}
                  onChange={(e) => setContractValue(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-mono font-bold text-slate-900 focus:outline-none focus:border-indigo-600"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Thuế Suất VAT (%)</label>
                <select
                  value={contractTaxRate}
                  onChange={(e) => setContractTaxRate(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-800 focus:outline-none focus:border-indigo-600 bg-white"
                >
                  <option value={10}>VAT 10% (Chuẩn dịch vụ phần mềm)</option>
                  <option value={8}>VAT 8% (Ưu đãi)</option>
                  <option value={0}>VAT 0% (Miễn thuế)</option>
                </select>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Loại Tiền Tệ</label>
                <select
                  value={contractCurrency}
                  onChange={(e) => setContractCurrency(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-slate-300 font-bold text-slate-800 focus:outline-none focus:border-indigo-600 bg-white"
                >
                  <option value="USD">USD ($)</option>
                  <option value="VND">VND (₫)</option>
                </select>
              </div>
            </div>

            <div className="p-3 bg-white rounded-lg border border-slate-200 flex items-center justify-between text-xs">
              <div>
                <span className="text-slate-500">Tiền thuế VAT ({contractTaxRate}%): </span>
                <span className="font-mono font-semibold text-slate-800">${((contractValue * contractTaxRate) / 100).toLocaleString()} {contractCurrency}</span>
              </div>
              <div>
                <span className="font-bold text-slate-900">Tổng tiền thanh toán: </span>
                <span className="font-mono font-bold text-emerald-600 text-sm">
                  ${(contractValue + (contractValue * contractTaxRate) / 100).toLocaleString()} {contractCurrency}
                </span>
              </div>
            </div>
          </div>

          {/* SECTION 4: DATES & SLA */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Ngày Bắt Đầu Hiệu Lực *</label>
              <input
                type="date"
                required
                value={contractStartDate}
                onChange={(e) => setContractStartDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-800 focus:outline-none focus:border-indigo-600"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Ngày Kết Thúc Hiệu Lực *</label>
              <input
                type="date"
                required
                value={contractEndDate}
                onChange={(e) => setContractEndDate(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-slate-300 text-slate-800 focus:outline-none focus:border-indigo-600"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Điều Khoản Dịch Vụ & Cam Kết SLA (Nghị Định 13/2023/NĐ-CP)</label>
            <textarea
              rows={3}
              value={contractTerms}
              onChange={(e) => setContractTerms(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-indigo-600 resize-none font-mono text-[11px]"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Ghi Chú Nội Bộ (Tùy chọn)</label>
            <input
              type="text"
              value={contractNotes}
              onChange={(e) => setContractNotes(e.target.value)}
              placeholder="Ghi chú thêm về điều khoản bổ sung hoặc mã ưu đãi..."
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-indigo-600 text-xs"
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={() => setShowCreateContractModal(false)}
              className="w-1/2 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold"
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              disabled={creatingContract}
              className="w-1/2 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"
            >
              {creatingContract ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              <span>Tạo Hợp Đồng B2B</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
