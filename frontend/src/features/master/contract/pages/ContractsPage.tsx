import { useEffect, useRef, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus, Search, FileSignature, FileCheck2, Clock,
  Send, Copy, Eye, Trash2, ChevronDown, CheckCircle2,
  TrendingUp, AlertCircle, RefreshCw, Download,
} from "lucide-react";
import { ContractItem, contractApi } from "@/api/master/contractApi";
import { useContracts, masterQueryKeys } from "@/api/master/queries";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/stores/toastStore";
import { ContractDetailModal } from "../components/ContractDetailModal";
import { HeaderActions } from "@/features/master/shell/HeaderActions";

/* ─────────────────────────────────────────────
   Reusable CustomDropdown (same style as DemoRequestPage)
───────────────────────────────────────────── */
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
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = options.find((o) => o.value === value);

  return (
    <div ref={ref} className="relative min-w-[220px]">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center w-full px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-colors bg-white ${
          open
            ? "border-indigo-500 ring-3 ring-indigo-100"
            : "border-slate-200 hover:border-slate-300"
        }`}
      >
        <span className={`flex-1 text-left ${selected ? "text-slate-800" : "text-slate-400"}`}>
          {selected ? selected.label : placeholder}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 ml-2 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden">
          <ul className="py-1.5">
            {options.map((opt) => {
              const isSel = value === opt.value;
              return (
                <li
                  key={opt.value}
                  onMouseDown={(e) => { e.preventDefault(); onChange(opt.value); setOpen(false); }}
                  className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer select-none transition-colors ${
                    isSel ? "bg-slate-50" : "hover:bg-slate-50"
                  }`}
                >
                  <span className={`flex-1 text-xs ${isSel ? "font-semibold text-slate-900" : "font-medium text-slate-700"}`}>
                    {opt.label}
                  </span>
                  {isSel && <CheckCircle2 className="w-3.5 h-3.5 text-teal-500 flex-shrink-0" />}
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
   Status badge helper
───────────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; icon: React.ReactNode }> = {
    SIGNED:            { label: "Đã Ký Số",   cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: <FileCheck2 className="w-3 h-3" /> },
    PENDING_SIGNATURE: { label: "Chờ Ký",     cls: "bg-amber-50 text-amber-700 border-amber-200",       icon: <Clock className="w-3 h-3" /> },
    DRAFT:             { label: "Bản Nháp",   cls: "bg-slate-100 text-slate-600 border-slate-200",      icon: <FileSignature className="w-3 h-3" /> },
    EXPIRED:           { label: "Hết Hạn",    cls: "bg-rose-50 text-rose-600 border-rose-200",          icon: <AlertCircle className="w-3 h-3" /> },
    TERMINATED:        { label: "Chấm Dứt",   cls: "bg-rose-50 text-rose-700 border-rose-200",          icon: <AlertCircle className="w-3 h-3" /> },
  };
  const { label, cls, icon } = map[status] ?? { label: status, cls: "bg-slate-100 text-slate-600 border-slate-200", icon: null };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${cls}`}>
      {icon}{label}
    </span>
  );
}

/* ─────────────────────────────────────────────
   Main Page
───────────────────────────────────────────── */
export function ContractsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: contracts = [] } = useContracts();
  const setContracts = (updater: any) => queryClient.setQueryData(masterQueryKeys.contracts(), updater);
  const triggerNotification = (msg: string) => toast.success(msg);

  const [contractSearch, setContractSearch] = useState("");
  const [contractStatusFilter, setContractStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const [selectedContract, setSelectedContract] = useState<ContractItem | null>(null);

  /* ── derived counts ── */
  const signedCount   = useMemo(() => contracts.filter((c) => c.status === "SIGNED").length, [contracts]);
  const pendingCount  = useMemo(() => contracts.filter((c) => c.status === "PENDING_SIGNATURE").length, [contracts]);
  const totalValue    = useMemo(() => contracts.filter((c) => c.status === "SIGNED").reduce((s, c) => s + (c.totalAmount || c.contractValue || 0), 0), [contracts]);

  const statusOptions = [
    { value: "ALL",               label: `Tất cả trạng thái (${contracts.length})` },
    { value: "SIGNED",            label: `Đã ký kết (${signedCount})` },
    { value: "PENDING_SIGNATURE", label: `Chờ ký (${pendingCount})` },
    { value: "DRAFT",             label: `Bản nháp (${contracts.filter((c) => c.status === "DRAFT").length})` },
    { value: "EXPIRED",           label: `Đã hết hạn (${contracts.filter((c) => c.status === "EXPIRED").length})` },
    { value: "TERMINATED",        label: `Đã chấm dứt (${contracts.filter((c) => c.status === "TERMINATED").length})` },
  ];

  const filtered = useMemo(() => {
    const q = contractSearch.toLowerCase();
    return contracts.filter((c) => {
      const matchSearch =
        c.contractNumber.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        (c.partyBName && c.partyBName.toLowerCase().includes(q)) ||
        (c.tenantName && c.tenantName.toLowerCase().includes(q)) ||
        (c.signerName && c.signerName.toLowerCase().includes(q)) ||
        (c.partyBRepresentative && c.partyBRepresentative.toLowerCase().includes(q));
      const matchStatus = contractStatusFilter === "ALL" || c.status === contractStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [contracts, contractSearch, contractStatusFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [contractSearch, contractStatusFilter]);

  const totalPages = Math.ceil(filtered.length / itemsPerPage) || 1;
  const paginatedContracts = filtered.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  /* ── actions ── */
  const handleSendContract = (contract: ContractItem) => {
    triggerNotification(`Đang khởi tạo PDF và gửi yêu cầu ký qua Dropbox Sign cho HĐ ${contract.contractNumber}...`);
    contractApi.send(contract.id)
      .then((updated) => {
        setContracts((prev: ContractItem[]) => (prev || []).map((c: ContractItem) => (c.id === updated.id ? updated : c)));
        if (selectedContract && selectedContract.id === updated.id) {
          setSelectedContract(updated);
        }
        const url = `${window.location.origin}/contracts/sign/${updated.signingToken || contract.signingToken}`;
        navigator.clipboard?.writeText(url).catch(() => {});
        triggerNotification(`Đã gửi yêu cầu ký qua Dropbox Sign & sao chép link HĐ ${contract.contractNumber}!`);
      })
      .catch((err: any) => {
        alert(`Lỗi gửi HĐ ${contract.contractNumber}: ${err.response?.data?.message || err.message}`);
      });
  };

  const handleSyncEsign = (contract: ContractItem) => {
    triggerNotification(`Đang đồng bộ trạng thái ký từ Dropbox Sign cho HĐ ${contract.contractNumber}...`);
    contractApi.syncEsign(contract.id)
      .then((updated) => {
        setContracts((prev: ContractItem[]) => (prev || []).map((c: ContractItem) => (c.id === updated.id ? updated : c)));
        if (selectedContract && selectedContract.id === updated.id) {
          setSelectedContract(updated);
        }
        triggerNotification(
          updated.status === "SIGNED"
            ? `HĐ ${updated.contractNumber} đã hoàn tất ký số trên Dropbox Sign!`
            : `Đã đồng bộ Dropbox Sign: HĐ ${updated.contractNumber} đang chờ Bên B ký.`
        );
      })
      .catch((err: any) => {
        alert(`Lỗi đồng bộ Dropbox Sign: ${err.response?.data?.message || err.message}`);
      });
  };

  const handleCopySigningLink = (contract: ContractItem) => {
    const url = `${window.location.origin}/contracts/sign/${contract.signingToken || `CTR-TOKEN-${contract.id}`}`;
    navigator.clipboard?.writeText(url)
      .then(() => triggerNotification(`Đã sao chép link ký số HĐ ${contract.contractNumber}!`))
      .catch(() => triggerNotification(`Link: ${url}`));
  };

  const handleDeleteContract = async (contract: ContractItem) => {
    if (!window.confirm("Xác nhận xóa hợp đồng này? Không thể phục hồi!")) return;
    try {
      await contractApi.delete(contract.id);
      setContracts((prev: ContractItem[]) => (prev || []).filter((c: ContractItem) => c.id !== contract.id));
      triggerNotification(`Đã xóa HĐ ${contract.contractNumber}`);
    } catch { alert("Lỗi khi xóa hợp đồng."); }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <HeaderActions>
        <button
          onClick={() => navigate("/admin/contracts/create")}
          className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl bg-blue-600 px-3.5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-blue-700"
        >
          <Plus className="size-3.5" />
          <span>Soạn Hợp Đồng Mới</span>
        </button>
      </HeaderActions>

      {/* ── KPI cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Tổng Hợp Đồng",       value: contracts.length, unit: "hợp đồng",   color: "text-slate-900", icon: <FileSignature className="w-3.5 h-3.5 text-slate-400" />, sub: "Toàn bộ trên nền tảng" },
          { label: "Đã Ký & Kích Hoạt",   value: signedCount,      unit: "đã ký",       color: "text-emerald-600", icon: <FileCheck2 className="w-3.5 h-3.5 text-emerald-400" />, sub: "Có giá trị pháp lý" },
          { label: "Chờ Ký Số",           value: pendingCount,     unit: "chờ ký",      color: "text-amber-600", icon: <Clock className="w-3.5 h-3.5 text-amber-400" />, sub: "Doanh nghiệp chưa ký" },
          { label: "Tổng Giá Trị Ký",     value: `$${totalValue.toLocaleString()}`, unit: "USD", color: "text-indigo-600", icon: <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />, sub: "Doanh thu từ HĐ đã ký" },
        ].map((card, i) => (
          <div key={i} className="bg-white border border-slate-200/80 rounded-xl p-3 shadow-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] font-semibold text-slate-500">{card.label}</span>
              {card.icon}
            </div>
            <div className={`text-lg font-extrabold ${card.color}`}>
              {card.value}{" "}
              <span className="text-[10px] font-medium text-slate-400">{card.unit}</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* ── Search + Filter ── */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-3.5 h-3.5 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo số HĐ, tiêu đề, tên doanh nghiệp, người ký..."
            value={contractSearch}
            onChange={(e) => setContractSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:ring-3 focus:ring-indigo-100 shadow-xs transition-colors"
          />
        </div>

        <CustomDropdown
          value={contractStatusFilter}
          onChange={setContractStatusFilter}
          options={statusOptions}
          placeholder="Lọc trạng thái..."
        />
      </div>

      {/* ── Contracts table ── */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto pb-2 [scrollbar-width:thin] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-track]:bg-slate-50">
          <table className="w-full min-w-[1000px] text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <tr>
                <th className="px-5 py-3.5 whitespace-nowrap">Số HĐ / Ngày</th>
                <th className="px-5 py-3.5 min-w-[200px]">Khách Hàng</th>
                <th className="px-5 py-3.5 min-w-[200px]">Nội Dung / Gói</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Giá Trị</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Thời Hạn</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Phương Thức Ký</th>
                <th className="px-5 py-3.5 whitespace-nowrap">Trạng Thái</th>
                <th className="px-5 py-3.5 text-right whitespace-nowrap">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filtered.length > 0 ? (
                paginatedContracts.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/70 transition-colors group">

                    {/* Contract number */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="font-mono font-bold text-indigo-600 text-[12px]">{c.contractNumber}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(c.createdAt).toLocaleDateString("vi-VN")}
                      </div>
                    </td>

                    {/* Customer */}
                    <td className="px-5 py-4 min-w-[200px]">
                      <div className="font-semibold text-slate-900 leading-relaxed break-words">{c.partyBName || c.tenantName || `Tenant #${c.tenantId}`}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1 flex-wrap">
                        {c.partyBTaxCode && <span className="text-slate-600 font-semibold">MST: {c.partyBTaxCode}</span>}
                        {c.tenantSubdomain && <span>· {c.tenantSubdomain}.smarthire.top</span>}
                      </div>
                    </td>

                    {/* Content */}
                    <td className="px-5 py-4 min-w-[200px]">
                      <div className="font-medium text-slate-800 leading-relaxed break-words">{c.title}</div>
                      <div className="text-[10px] text-indigo-500 font-medium mt-0.5 leading-relaxed break-words">{c.planName || "Gói Tùy Biến B2B"}</div>
                    </td>

                    {/* Value */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <div className="font-bold text-slate-900 font-mono">
                        ${(c.totalAmount || c.contractValue).toLocaleString()}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Gốc: ${c.contractValue.toLocaleString()} + VAT {c.taxRate || 10}%
                      </div>
                    </td>

                    {/* Period */}
                    <td className="px-5 py-4 font-mono text-[11px] text-slate-600 whitespace-nowrap">
                      {c.startDate && c.endDate ? (
                        <>
                          <div>{c.startDate}</div>
                          <div className="text-slate-400">đến {c.endDate}</div>
                        </>
                      ) : (
                        <span className="text-slate-400">12 tháng</span>
                      )}
                    </td>

                    {/* Sign method */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        Dropbox Sign
                      </span>
                      {(c.partyBRepresentative || c.signerName) && (
                        <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[130px]">
                          {c.partyBRepresentative || c.signerName}
                        </div>
                      )}
                    </td>

                    {/* Status */}
                    <td className="px-5 py-4 whitespace-nowrap">
                      <StatusBadge status={c.status} />
                    </td>

                    {/* Actions */}
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                        {c.status !== "SIGNED" && (
                          <button
                            onClick={() => handleSendContract(c)}
                            title="Gửi yêu cầu ký qua Dropbox Sign"
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 font-semibold text-[11px] transition-colors"
                          >
                            <Send className="w-3 h-3" />
                            Gửi
                          </button>
                        )}

                        {c.status !== "SIGNED" && c.externalSignatureRequestId && (
                          <button
                            onClick={() => handleSyncEsign(c)}
                            title="Đồng bộ trạng thái ký từ Dropbox Sign"
                            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-semibold text-[11px] transition-colors"
                          >
                            <RefreshCw className="w-3 h-3" />
                            Đồng bộ
                          </button>
                        )}

                        <a
                          href={contractApi.getPublicPdfUrl(c.signingToken || `CTR-TOKEN-${c.id}`)}
                          target="_blank"
                          rel="noreferrer"
                          title="Tải PDF hợp đồng & Audit Trail"
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-600 transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>

                        <button
                          onClick={() => handleCopySigningLink(c)}
                          title="Sao chép link tra cứu hợp đồng"
                          className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-500 transition-colors"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => setSelectedContract(c)}
                          title="Xem văn bản HĐ"
                          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-[11px] transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                          Xem
                        </button>

                        {c.status !== "SIGNED" && (
                          <button
                            onClick={() => handleDeleteContract(c)}
                            title="Xóa hợp đồng"
                            className="p-1.5 rounded-lg hover:bg-rose-50 hover:text-rose-600 text-slate-400 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="py-14 text-center">
                    <FileSignature className="w-8 h-8 mx-auto mb-3 text-slate-300" />
                    <p className="text-sm text-slate-400 font-medium">Không tìm thấy hợp đồng phù hợp</p>
                    <p className="text-xs text-slate-300 mt-1">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination & Footer */}
        {filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50/50">
            <span className="text-[11px] text-slate-500">
              Hiển thị <span className="font-semibold text-slate-700">{(currentPage - 1) * itemsPerPage + 1}</span> - <span className="font-semibold text-slate-700">{Math.min(currentPage * itemsPerPage, filtered.length)}</span> trong số <span className="font-semibold text-slate-700">{filtered.length}</span> hợp đồng
            </span>
            <div className="flex items-center gap-1">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-[11px] font-semibold transition-colors"
              >
                Trước
              </button>
              <span className="px-3 py-1.5 text-[11px] font-semibold text-slate-700">
                {currentPage} / {totalPages}
              </span>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-[11px] font-semibold transition-colors"
              >
                Sau
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── Modals ── */}
      <ContractDetailModal
        selectedContract={selectedContract}
        setSelectedContract={setSelectedContract}
        handleSendContract={handleSendContract}
        handleCopySigningLink={handleCopySigningLink}
        handleSyncEsign={handleSyncEsign}
      />
    </div>
  );
}
