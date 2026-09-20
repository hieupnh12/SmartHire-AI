import { X, FileSignature, Send, Copy, ExternalLink, CheckCircle2 } from "lucide-react";
import { ContractItem } from "@/api/master/contractApi";

interface ContractDetailModalProps {
  selectedContract: ContractItem | null;
  setSelectedContract: (val: ContractItem | null) => void;
  handleSendContract: (contract: ContractItem) => void;
  handleCopySigningLink: (contract: ContractItem) => void;
  handleOpenSignModal: (contract: ContractItem) => void;
}

export function ContractDetailModal({
  selectedContract,
  setSelectedContract,
  handleSendContract,
  handleCopySigningLink,
  handleOpenSignModal,
}: ContractDetailModalProps) {
  if (!selectedContract) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 max-w-3xl w-full shadow-2xl relative animate-fade-in max-h-[90vh] overflow-y-auto font-sans">
        <button
          onClick={() => setSelectedContract(null)}
          className="absolute top-6 right-6 text-slate-400 hover:text-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Document Action Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4 mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold border border-indigo-200">
              <FileSignature className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Văn Bản Hợp Đồng Điện Tử B2B</h3>
              <span className="text-xs text-indigo-600 font-mono font-bold">{selectedContract.contractNumber}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleSendContract(selectedContract)}
              className="px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 rounded-lg text-xs font-semibold flex items-center gap-1"
              title="Gửi email mời đại diện Bên B ký hợp đồng"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Gửi Mời Ký</span>
            </button>

            <button
              onClick={() => handleCopySigningLink(selectedContract)}
              className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1"
              title="Sao chép link ký số công khai"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Sao Chép Link</span>
            </button>

            <a
              href={`/contracts/sign/${selectedContract.signingToken || `CTR-TOKEN-${selectedContract.id}`}`}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-semibold flex items-center gap-1"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Mở Trang Ký</span>
            </a>
          </div>
        </div>

        {/* Vietnam National Header Document Layout */}
        <div className="border border-slate-200 rounded-xl p-6 bg-slate-50/50 space-y-5 text-xs text-slate-800 leading-relaxed">
          <div className="text-center pb-4 border-b border-slate-200">
            <div className="text-xs font-bold uppercase tracking-widest text-slate-900">
              CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
            </div>
            <div className="text-xs font-semibold text-slate-800 mt-0.5">Độc lập - Tự do - Hạnh phúc</div>
            <div className="w-24 h-0.5 bg-slate-800 mx-auto my-2" />
            <div className="text-[11px] text-slate-500 italic">
              Hà Nội, ngày {new Date(selectedContract.createdAt).getDate()} tháng {new Date(selectedContract.createdAt).getMonth() + 1} năm {new Date(selectedContract.createdAt).getFullYear()}
            </div>
          </div>

          <div className="text-center my-3">
            <div className="text-base font-black uppercase tracking-tight text-slate-900">
              {selectedContract.title}
            </div>
            <div className="text-xs font-mono font-bold text-indigo-700 mt-1">
              Số: {selectedContract.contractNumber}/HĐDV-SMARTHIRE
            </div>
          </div>

          {/* Party A & Party B */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
            <div className="bg-white p-3.5 rounded-lg border border-slate-200 space-y-1">
              <div className="font-bold text-indigo-900 uppercase">BÊN A (BÊN CUNG CẤP):</div>
              <div><span className="font-semibold">Công ty: </span>{selectedContract.partyAName || "CÔNG TY CỔ PHẦN CÔNG NGHỆ SMARTHIRE VIỆT NAM"}</div>
              <div><span className="font-semibold">MST: </span><span className="font-mono font-bold">{selectedContract.partyATaxCode || "0110889988"}</span></div>
              <div><span className="font-semibold">Đại diện: </span>{selectedContract.partyARepresentative || "Phan Nhật Hưng"} ({selectedContract.partyAPosition || "Tổng Giám Đốc"})</div>
              <div><span className="font-semibold">STK: </span><span className="font-mono font-bold">{selectedContract.partyABankAccount || "190388889999"}</span> - Techcombank</div>
            </div>

            <div className="bg-white p-3.5 rounded-lg border border-slate-200 space-y-1">
              <div className="font-bold text-slate-900 uppercase">BÊN B (KHÁCH HÀNG):</div>
              <div><span className="font-semibold">Công ty: </span><span className="font-bold">{selectedContract.partyBName || selectedContract.tenantName || "Khách hàng doanh nghiệp"}</span></div>
              <div><span className="font-semibold">MST: </span><span className="font-mono font-bold text-slate-900">{selectedContract.partyBTaxCode || "Đang cập nhật"}</span></div>
              <div><span className="font-semibold">Đại diện: </span>{selectedContract.partyBRepresentative || "Đại diện theo pháp luật"} ({selectedContract.partyBPosition || "Giám Đốc"})</div>
              <div><span className="font-semibold">Email: </span><span className="font-mono text-indigo-700">{selectedContract.partyBEmail || "email@company.com"}</span></div>
            </div>
          </div>

          {/* Financial Summary */}
          <div className="bg-white p-3.5 rounded-lg border border-slate-200 space-y-1.5 text-[11px]">
            <div className="font-bold text-slate-900 uppercase">GIÁ TRỊ HỢP ĐỒNG & THANH TOÁN:</div>
            <div className="grid grid-cols-1 gap-2 font-mono sm:grid-cols-3">
              <div>
                <span className="text-slate-500 block">Giá gốc:</span>
                <span className="font-bold text-slate-900">${selectedContract.contractValue.toLocaleString()} {selectedContract.currency}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Thuế VAT ({selectedContract.taxRate || 10}%):</span>
                <span className="font-bold text-slate-700">${(selectedContract.taxAmount || 0).toLocaleString()} {selectedContract.currency}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Tổng thanh toán:</span>
                <span className="font-bold text-emerald-600 text-xs">${(selectedContract.totalAmount || selectedContract.contractValue).toLocaleString()} {selectedContract.currency}</span>
              </div>
            </div>
            <div className="text-[10px] text-slate-500 italic pt-1 border-t border-slate-100">
              (Bằng chữ: {selectedContract.amountInWords || "Đã bao gồm thuế giá trị gia tăng"})
            </div>
          </div>

          {/* Digital Signature Certificate Section */}
          {selectedContract.status === "SIGNED" && (
            <div className="bg-emerald-50/80 p-3.5 rounded-lg border border-emerald-300 space-y-1.5 text-[11px]">
              <div className="flex items-center gap-1.5 text-emerald-900 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Chứng Thư Ký Số Điện Tử Đã Xác Thực Hợp Lệ</span>
              </div>
              <div className="grid grid-cols-1 gap-2 text-emerald-800 sm:grid-cols-2">
                <div>Phương thức: <span className="font-semibold">{selectedContract.signMethod}</span></div>
                <div>Thời gian: <span className="font-mono font-semibold">{selectedContract.signedAt ? new Date(selectedContract.signedAt).toLocaleString("vi-VN") : "Đã ký"}</span></div>
              </div>
              {selectedContract.signatures && selectedContract.signatures.length > 0 && (
                <div className="mt-2 pt-2 border-t border-emerald-200/50">
                  <div className="font-semibold text-emerald-900 mb-1.5">Lịch sử chữ ký:</div>
                  <div className="space-y-1.5">
                    {selectedContract.signatures.map((sig: any, idx: number) => (
                      <div key={idx} className="flex justify-between items-center bg-white/60 p-1.5 rounded border border-emerald-100">
                        <div>
                          <span className="font-bold">{sig.signerName || "Người đại diện"}</span>
                          <span className="text-emerald-700 ml-1">({sig.signerTitle || "Bên B"})</span>
                        </div>
                        <div className="font-mono text-[10px] text-emerald-600 flex flex-col items-end">
                          <span>{sig.signedAt ? new Date(sig.signedAt).toLocaleString("vi-VN") : "Đã ký"}</span>
                          {sig.clientIp && <span className="text-[9px] opacity-70">IP: {sig.clientIp}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 mt-5 pt-3 border-t border-slate-200">
          <button
            onClick={() => setSelectedContract(null)}
            className="px-4 py-2 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold text-xs"
          >
            Đóng
          </button>

          {selectedContract.status !== "SIGNED" && (
            <button
              onClick={() => {
                handleOpenSignModal(selectedContract);
              }}
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
            >
              <FileSignature className="w-4 h-4" />
              <span>Ký Số Ngay</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
