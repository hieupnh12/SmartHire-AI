import React from "react";
import { X, FileSignature, Loader2, FileCheck2 } from "lucide-react";
import { ContractItem } from "@/api/master/contractApi";

interface SignContractModalProps {
  showSignContractModal: ContractItem | null;
  setShowSignContractModal: (val: ContractItem | null) => void;
  signMethod: string;
  setSignMethod: (val: "DIGITAL_TOKEN_CA" | "E_SIGN_ONLINE" | "UPLOAD_SIGNED_PDF" | "MANUAL") => void;
  signSignedDocUrl: string;
  setSignSignedDocUrl: (val: string) => void;
  signSignatureData: string;
  setSignSignatureData: (val: string) => void;
  signAutoInvoice: boolean;
  setSignAutoInvoice: (val: boolean) => void;
  signNotes: string;
  setSignNotes: (val: string) => void;
  signingContract: boolean;
  handleSignContractSubmit: (e: React.FormEvent) => void;
}

export function SignContractModal({
  showSignContractModal,
  setShowSignContractModal,
  signMethod,
  setSignMethod,
  signSignedDocUrl,
  setSignSignedDocUrl,
  signSignatureData,
  setSignSignatureData,
  signAutoInvoice,
  setSignAutoInvoice,
  signNotes,
  setSignNotes,
  signingContract,
  handleSignContractSubmit,
}: SignContractModalProps) {
  if (!showSignContractModal) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative animate-fade-in max-h-[90vh] overflow-y-auto">
        <button
          onClick={() => setShowSignContractModal(null)}
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold border border-indigo-200">
            <FileSignature className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Ký Số Điện Tử Hợp Đồng B2B</h3>
            <span className="text-xs text-indigo-600 font-mono font-bold">{showSignContractModal.contractNumber}</span>
          </div>
        </div>

        <form onSubmit={handleSignContractSubmit} className="space-y-4 text-xs">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
            <div className="font-bold text-slate-900">{showSignContractModal.title}</div>
            <div className="flex justify-between text-slate-600 text-[11px]">
              <span>Khách hàng: {showSignContractModal.tenantName || `Tenant #${showSignContractModal.tenantId}`}</span>
              <span className="font-mono font-bold text-emerald-600">${showSignContractModal.contractValue.toLocaleString()} {showSignContractModal.currency}</span>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-2">Chọn Phương Thức Ký Số</label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label
                className={`flex flex-col p-3 rounded-xl border cursor-pointer transition-all ${
                  signMethod === "DIGITAL_TOKEN_CA"
                    ? "bg-indigo-50/70 border-indigo-500 text-indigo-900"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2 font-bold mb-1">
                  <input
                    type="radio"
                    name="signMethod"
                    checked={signMethod === "DIGITAL_TOKEN_CA"}
                    onChange={() => setSignMethod("DIGITAL_TOKEN_CA")}
                    className="text-indigo-600"
                  />
                  <span>USB Token / HSM CA</span>
                </div>
                <span className="text-[10px] text-slate-500">Chữ ký số doanh nghiệp qua CA Token</span>
              </label>

              <label
                className={`flex flex-col p-3 rounded-xl border cursor-pointer transition-all ${
                  signMethod === "E_SIGN_ONLINE"
                    ? "bg-indigo-50/70 border-indigo-500 text-indigo-900"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2 font-bold mb-1">
                  <input
                    type="radio"
                    name="signMethod"
                    checked={signMethod === "E_SIGN_ONLINE"}
                    onChange={() => setSignMethod("E_SIGN_ONLINE")}
                    className="text-indigo-600"
                  />
                  <span>e-Signature Online</span>
                </div>
                <span className="text-[10px] text-slate-500">Ký online xác thực mã OTP qua Email</span>
              </label>

              <label
                className={`flex flex-col p-3 rounded-xl border cursor-pointer transition-all ${
                  signMethod === "UPLOAD_SIGNED_PDF"
                    ? "bg-indigo-50/70 border-indigo-500 text-indigo-900"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2 font-bold mb-1">
                  <input
                    type="radio"
                    name="signMethod"
                    checked={signMethod === "UPLOAD_SIGNED_PDF"}
                    onChange={() => setSignMethod("UPLOAD_SIGNED_PDF")}
                    className="text-indigo-600"
                  />
                  <span>Tải Lên PDF Đã Ký</span>
                </div>
                <span className="text-[10px] text-slate-500">Tệp scan hoặc PDF đã đóng dấu</span>
              </label>

              <label
                className={`flex flex-col p-3 rounded-xl border cursor-pointer transition-all ${
                  signMethod === "MANUAL"
                    ? "bg-indigo-50/70 border-indigo-500 text-indigo-900"
                    : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                }`}
              >
                <div className="flex items-center gap-2 font-bold mb-1">
                  <input
                    type="radio"
                    name="signMethod"
                    checked={signMethod === "MANUAL"}
                    onChange={() => setSignMethod("MANUAL")}
                    className="text-indigo-600"
                  />
                  <span>Ký Tay / Trực Tiếp</span>
                </div>
                <span className="text-[10px] text-slate-500">Ký biên bản giấy truyền thống</span>
              </label>
            </div>
          </div>

          {signMethod === "UPLOAD_SIGNED_PDF" && (
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Đường dẫn tệp PDF đã ký số</label>
              <input
                type="text"
                value={signSignedDocUrl}
                onChange={(e) => setSignSignedDocUrl(e.target.value)}
                placeholder="VD: /contracts/signed/CTR-202609-0001_signed.pdf"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 font-mono text-slate-800 focus:outline-none focus:border-indigo-600"
              />
            </div>
          )}

          {signMethod === "DIGITAL_TOKEN_CA" && (
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Thông tin chứng thư số CA (Serial / Token ID)</label>
              <input
                type="text"
                value={signSignatureData}
                onChange={(e) => setSignSignatureData(e.target.value)}
                placeholder="VD: VNPT-CA Token Serial 54:02:FA:99:BC:11"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 font-mono text-slate-800 focus:outline-none focus:border-indigo-600"
              />
            </div>
          )}

          {signMethod === "E_SIGN_ONLINE" && (
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Chữ ký điện tử / Tên người ký xác nhận</label>
              <input
                type="text"
                value={signSignatureData}
                onChange={(e) => setSignSignatureData(e.target.value)}
                placeholder="VD: Nguyễn Văn A - Ký số ngày 19/09/2026"
                className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 text-slate-800 focus:outline-none focus:border-indigo-600"
              />
            </div>
          )}

          {/* Auto Create Invoice Toggle */}
          <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-200 flex items-start gap-2.5">
            <input
              type="checkbox"
              id="autoInvoice"
              checked={signAutoInvoice}
              onChange={(e) => setSignAutoInvoice(e.target.checked)}
              className="mt-0.5 text-indigo-600 rounded"
            />
            <label htmlFor="autoInvoice" className="cursor-pointer text-[11px] text-indigo-950">
              <span className="font-bold block">Tự động phát hành Hóa Đơn B2B ngay sau khi ký</span>
              <span className="text-indigo-700 block mt-0.5">
                Hệ thống sẽ tự động tạo hóa đơn ${showSignContractModal.contractValue.toLocaleString()} {showSignContractModal.currency} và chuyển sang danh mục Thu Phí.
              </span>
            </label>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Ghi chú ký kết</label>
            <textarea
              rows={2}
              value={signNotes}
              onChange={(e) => setSignNotes(e.target.value)}
              className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-indigo-600 resize-none"
            />
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={() => setShowSignContractModal(null)}
              className="w-1/2 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold"
            >
              Hủy Bỏ
            </button>
            <button
              type="submit"
              disabled={signingContract}
              className="w-1/2 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold disabled:opacity-50 flex items-center justify-center gap-1.5 shadow-sm"
            >
              {signingContract ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCheck2 className="w-4 h-4" />}
              <span>Xác Nhận Ký Kết Hợp Đồng</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
