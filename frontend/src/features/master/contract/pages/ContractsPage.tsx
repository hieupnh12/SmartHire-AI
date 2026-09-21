import { useState, useMemo } from "react";
import { Plus, Search, Filter, FileSignature, FileCheck2, Clock, Send, Copy, Eye, Trash2 } from "lucide-react";
import { ContractItem, contractApi } from "@/api/master/contractApi";
import { useMasterDashboard } from "@/features/master/shell/MasterAdminContext";

interface ContractsTabProps {
  setContractTenantId: (val: number | "") => void;
  setContractPlanId: (val: number | "") => void;
  setContractValue: (val: number) => void;
  setContractLeadId: (val: number | undefined) => void;
  setContractTitle: (val: string) => void;
  setContractPartyBRepresentative: (val: string) => void;
  setContractPartyBEmail: (val: string) => void;
  setContractPartyBPosition: (val: string) => void;
  setContractNotes: (val: string) => void;
  setShowCreateContractModal: (val: boolean) => void;
  setSelectedContract: (val: ContractItem | null) => void;
  setShowSignContractModal: (val: ContractItem | null) => void;
}

function ContractsContent({
  setContractTenantId,
  setContractPlanId,
  setContractValue,
  setContractLeadId,
  setContractTitle,
  setContractPartyBRepresentative,
  setContractPartyBEmail,
  setContractPartyBPosition,
  setContractNotes,
  setShowCreateContractModal,
  setSelectedContract,
  setShowSignContractModal,
}: ContractsTabProps) {
  const { contracts, setContracts, tenants, plans, triggerNotification } = useMasterDashboard();

  const [contractSearch, setContractSearch] = useState("");
  const [contractStatusFilter, setContractStatusFilter] = useState<string>("ALL");

  const filteredContracts = useMemo(() => {
    return contracts.filter((c) => {
      const q = contractSearch.toLowerCase();
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

  const signedContractCount = useMemo(() => {
    return contracts.filter((c) => c.status === "SIGNED").length;
  }, [contracts]);

  const pendingContractCount = useMemo(() => {
    return contracts.filter((c) => c.status === "PENDING_SIGNATURE").length;
  }, [contracts]);

  const totalContractValue = useMemo(() => {
    return contracts
      .filter((c) => c.status === "SIGNED")
      .reduce((sum, c) => sum + (c.totalAmount || c.contractValue || 0), 0);
  }, [contracts]);

  const handleSendContract = async (contract: ContractItem) => {
    try {
      const updated = await contractApi.send(contract.id);
      setContracts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      const signUrl = `${window.location.origin}/contracts/sign/${updated.signingToken || contract.signingToken}`;
      navigator.clipboard?.writeText(signUrl).catch(() => {});
      triggerNotification(`Đã gửi email mời ký HĐ ${contract.contractNumber} đến ${contract.partyBEmail || contract.signerEmail || "đối tác"} & Sao chép link ký số!`);
    } catch (err: any) {
      alert("Đã xảy ra lỗi khi gửi hợp đồng.");
    }
  };

  const handleCopySigningLink = (contract: ContractItem) => {
    const token = contract.signingToken || `CTR-TOKEN-${contract.id}`;
    const signUrl = `${window.location.origin}/contracts/sign/${token}`;
    navigator.clipboard?.writeText(signUrl).then(() => {
      triggerNotification(`Đã sao chép liên kết ký số của hợp đồng ${contract.contractNumber}!`);
    }).catch(() => {
      triggerNotification(`Liên kết ký số: ${signUrl}`);
    });
  };

  const handleDeleteContract = async (contract: ContractItem) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa hợp đồng này? Thao tác không thể phục hồi!")) return;
    try {
      await contractApi.delete(contract.id);
      setContracts((prev) => prev.filter((c) => c.id !== contract.id));
      triggerNotification(`Đã xóa Hợp đồng ${contract.contractNumber}`);
    } catch (err) {
      alert("Đã xảy ra lỗi khi xóa hợp đồng.");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header & New Contract CTA */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <FileSignature className="w-7 h-7 text-indigo-600" />
            <span>Hợp Đồng & Ký Số Điện Tử B2B (e-Contracts)</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Ký kết hợp đồng B2B 100% Online với chữ ký số USB Token / HSM hoặc e-Signature, tự động phát hành hóa đơn và kích hoạt gói dịch vụ.
          </p>
        </div>

        <button
          onClick={() => {
            setContractTenantId(tenants[0]?.id || "");
            const defaultPlan = plans[0];
            if (defaultPlan) {
              setContractPlanId(defaultPlan.id || "");
              setContractValue(defaultPlan.priceYearly || 3990);
            }
            setContractLeadId(undefined);
            setContractTitle("Hợp Đồng Cung Cấp Dịch Vụ Tuyển Dụng AI & Dedicated DB SmartHire-AI");
            setContractPartyBRepresentative("");
            setContractPartyBEmail("");
            setContractPartyBPosition("Tổng Giám Đốc / Đại diện pháp luật");
            setContractNotes("");
            setShowCreateContractModal(true);
          }}
          className="px-4 py-2.5 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Soạn Hợp Đồng B2B Mới</span>
        </button>
      </div>

      {/* KPI 4 Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 block mb-1">
            Tổng Số Hợp Đồng
          </span>
          <span className="text-2xl font-extrabold text-slate-900">
            {contracts.length} <span className="text-xs font-normal text-slate-500">Hợp đồng</span>
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">Toàn bộ hợp đồng B2B trên nền tảng</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 block mb-1">
            Đã Ký Số & Kích Hoạt
          </span>
          <span className="text-2xl font-extrabold text-emerald-600">
            {signedContractCount} <span className="text-xs font-normal text-slate-500">Đã ký</span>
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">Có đầy đủ giá trị pháp lý</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 block mb-1">
            Chờ Ký Số (Pending)
          </span>
          <span className="text-2xl font-extrabold text-amber-600">
            {pendingContractCount} <span className="text-xs font-normal text-slate-500">Chờ ký</span>
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">Chờ doanh nghiệp ký số điện tử</span>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 block mb-1">
            Tổng Giá Trị Hợp Đồng Ký
          </span>
          <span className="text-2xl font-extrabold text-indigo-600">
            ${totalContractValue.toLocaleString()} <span className="text-xs font-normal text-slate-500">USD</span>
          </span>
          <span className="text-[11px] text-slate-400 mt-1 block">Doanh thu từ các HĐ đã ký kết</span>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Tìm theo Số hợp đồng (CTR-...), Tiêu đề, Tên doanh nghiệp, Người đại diện ký..."
            value={contractSearch}
            onChange={(e) => setContractSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600 shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={contractStatusFilter}
            onChange={(e) => setContractStatusFilter(e.target.value)}
            className="px-3 py-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-600 font-semibold text-slate-700 shadow-2xs"
          >
            <option value="ALL">Tất cả trạng thái ({contracts.length})</option>
            <option value="SIGNED">Đã ký kết ({contracts.filter((c) => c.status === "SIGNED").length})</option>
            <option value="PENDING_SIGNATURE">Chờ ký ({contracts.filter((c) => c.status === "PENDING_SIGNATURE").length})</option>
            <option value="DRAFT">Bản nháp ({contracts.filter((c) => c.status === "DRAFT").length})</option>
            <option value="EXPIRED">Đã hết hạn ({contracts.filter((c) => c.status === "EXPIRED").length})</option>
            <option value="TERMINATED">Đã chấm dứt ({contracts.filter((c) => c.status === "TERMINATED").length})</option>
          </select>
        </div>
      </div>

      {/* Contracts Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[860px] border-collapse text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-800 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-4">Số Hợp Đồng</th>
                <th className="p-4">Khách Hàng Doanh Nghiệp</th>
                <th className="p-4">Nội Dung / Gói Dịch Vụ</th>
                <th className="p-4">Giá Trị Hợp Đồng</th>
                <th className="p-4">Thời Hạn Hiệu Lực</th>
                <th className="p-4">Phương Thức Ký</th>
                <th className="p-4">Trạng Thái</th>
                <th className="p-4 text-right">Thao Tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredContracts.length > 0 ? (
                filteredContracts.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-4">
                      <div className="font-mono font-bold text-indigo-600">{c.contractNumber}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {new Date(c.createdAt).toLocaleDateString("vi-VN")}
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="font-bold text-slate-900">{c.partyBName || c.tenantName || `Tenant #${c.tenantId}`}</div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-1 font-mono mt-0.5">
                        {c.partyBTaxCode && <span className="font-bold text-slate-700">MST: {c.partyBTaxCode} · </span>}
                        <span>{c.tenantCode || "code"}</span>
                        {c.tenantSubdomain && <span>· {c.tenantSubdomain}.smarthire.top</span>}
                      </div>
                    </td>

                    <td className="p-4 max-w-[240px]">
                      <div className="font-semibold text-slate-800 truncate" title={c.title}>{c.title}</div>
                      <div className="text-[11px] text-indigo-600 mt-0.5 font-medium">
                        {c.planName || "Gói Tùy Biến B2B"}
                      </div>
                    </td>

                    <td className="p-4 font-mono">
                      <div className="font-bold text-slate-900 text-sm">
                        ${(c.totalAmount || c.contractValue).toLocaleString()} {c.currency}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        (Gốc: ${c.contractValue.toLocaleString()} + VAT {c.taxRate || 10}%)
                      </div>
                    </td>

                    <td className="p-4 text-[11px] text-slate-600">
                      {c.startDate && c.endDate ? (
                        <div className="font-mono">
                          <div>{c.startDate}</div>
                          <div className="text-slate-400">đến {c.endDate}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400">12 tháng</span>
                      )}
                    </td>

                    <td className="p-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                        {c.signMethod === "DIGITAL_TOKEN_CA"
                          ? "Chữ ký số USB Token/CA"
                          : c.signMethod === "E_SIGN_ONLINE"
                          ? "Ký Online (OTP Mail)"
                          : c.signMethod === "UPLOAD_SIGNED_PDF"
                          ? "Tải lên PDF đã ký"
                          : c.signMethod === "MANUAL"
                          ? "Ký tay trực tiếp"
                          : "Chưa ký"}
                      </span>
                      {(c.partyBRepresentative || c.signerName) && (
                        <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[140px]" title={`${c.partyBRepresentative || c.signerName} (${c.partyBEmail || c.signerEmail})`}>
                          Ký bởi: {c.partyBRepresentative || c.signerName}
                        </div>
                      )}
                    </td>

                    <td className="p-4">
                      <span
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                          c.status === "SIGNED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : c.status === "PENDING_SIGNATURE"
                            ? "bg-amber-50 text-amber-700 border border-amber-200"
                            : c.status === "DRAFT"
                            ? "bg-slate-100 text-slate-700 border border-slate-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {c.status === "SIGNED" ? (
                          <FileCheck2 className="w-3.5 h-3.5" />
                        ) : c.status === "PENDING_SIGNATURE" ? (
                          <Clock className="w-3.5 h-3.5" />
                        ) : (
                          <FileSignature className="w-3.5 h-3.5" />
                        )}
                        {c.status === "SIGNED"
                          ? "Đã Ký Số"
                          : c.status === "PENDING_SIGNATURE"
                          ? "Chờ Ký Số"
                          : c.status === "DRAFT"
                          ? "Bản Nháp"
                          : c.status === "EXPIRED"
                          ? "Hết Hạn"
                          : "Chấm Dứt"}
                      </span>
                    </td>

                    <td className="p-4 text-right whitespace-nowrap space-x-1.5">
                      <button
                        onClick={() => handleSendContract(c)}
                        className="px-2 py-1.5 rounded-lg bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 font-semibold text-xs transition-colors inline-flex items-center gap-1"
                        title="Gửi email mời đại diện Bên B ký hợp đồng điện tử"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Gửi Mời Ký</span>
                      </button>

                      <button
                        onClick={() => handleCopySigningLink(c)}
                        className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors inline-flex items-center"
                        title="Sao chép liên kết ký số gửi qua Zalo/Email"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => setSelectedContract(c)}
                        className="px-2 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors inline-flex items-center gap-1"
                        title="Xem chi tiết văn bản hợp đồng"
                      >
                        <Eye className="w-3.5 h-3.5 text-slate-500" />
                        <span>Văn bản</span>
                      </button>

                      {c.status !== "SIGNED" && (
                        <button
                          onClick={() => setShowSignContractModal(c)}
                          className="px-2 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors inline-flex items-center gap-1 shadow-2xs"
                          title="Ký số điện tử và tự động phát hành Hóa Đơn B2B"
                        >
                          <FileSignature className="w-3.5 h-3.5" />
                          <span>Ký số</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleDeleteContract(c)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors inline-flex items-center"
                        title="Xóa hợp đồng"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-slate-400">
                    <FileSignature className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <span>Không tìm thấy hợp đồng nào phù hợp với bộ lọc.</span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export function ContractsPage() {
  const [, setTenantId] = useState<number | "">("");
  const [, setPlanId] = useState<number | "">("");
  const [, setValue] = useState(0);
  const [, setLeadId] = useState<number | undefined>();
  const [, setTitle] = useState("");
  const [, setRepresentative] = useState("");
  const [, setEmail] = useState("");
  const [, setPosition] = useState("");
  const [, setNotes] = useState("");
  const [, setCreating] = useState(false);
  const [, setSelected] = useState<ContractItem | null>(null);
  const [, setSigning] = useState<ContractItem | null>(null);

  return <ContractsContent
    setContractTenantId={setTenantId}
    setContractPlanId={setPlanId}
    setContractValue={setValue}
    setContractLeadId={setLeadId}
    setContractTitle={setTitle}
    setContractPartyBRepresentative={setRepresentative}
    setContractPartyBEmail={setEmail}
    setContractPartyBPosition={setPosition}
    setContractNotes={setNotes}
    setShowCreateContractModal={setCreating}
    setSelectedContract={setSelected}
    setShowSignContractModal={setSigning}
  />;
}
