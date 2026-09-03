import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  masterAdminApi,
  TenantInfo,
  SubscriptionPlan,
  RevenueAnalytics,
  AiQuotaUsage,
  AuditLog
} from "@/api/master/masterAdminApi";
import { LanguageSwitcher } from "@/components/ux/LanguageSwitcher";
import {
  BrainCircuit,
  Building2,
  CreditCard,
  BarChart3,
  FileText,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Download,
  Activity,
  Cpu,
  LogOut,
  RefreshCw,
  Eye,
  Sliders,
  Check,
  X,
  Sparkles,
  Globe,
  KeyRound,
  ArrowRight
} from "lucide-react";

export function MasterAdminDashboardPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<"analytics" | "tenants" | "subscriptions" | "logs">("analytics");

  // State Data
  const [tenants, setTenants] = useState<TenantInfo[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [revenue, setRevenue] = useState<RevenueAnalytics | null>(null);
  const [aiQuota, setAiQuota] = useState<AiQuotaUsage | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);

  const [loading, setLoading] = useState(true);

  // Modals state
  const [selectedTenant, setSelectedTenant] = useState<TenantInfo | null>(null);
  const [showProvisionModal, setShowProvisionModal] = useState(false);
  const [provisionSuccessData, setProvisionSuccessData] = useState<TenantInfo | null>(null);
  const [copiedCreds, setCopiedCreds] = useState(false);

  const [showPlanModal, setShowPlanModal] = useState<SubscriptionPlan | null>(null);
  const [isNewPlan, setIsNewPlan] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  // Search state
  const [tenantSearch, setTenantSearch] = useState("");

  // Provision Tenant form state
  const [newTenantCode, setNewTenantCode] = useState("");
  const [newTenantName, setNewTenantName] = useState("");
  const [newTenantSubdomain, setNewTenantSubdomain] = useState("");

  // Plan Form state
  const [planCode, setPlanCode] = useState("");
  const [planName, setPlanName] = useState("");
  const [planDesc, setPlanDesc] = useState("");
  const [priceMonthly, setPriceMonthly] = useState(49);
  const [priceYearly, setPriceYearly] = useState(490);
  const [maxJobs, setMaxJobs] = useState(10);
  const [maxCvParses, setMaxCvParses] = useState(500);
  const [maxAiHours, setMaxAiHours] = useState(20);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tenantsData, plansData, revenueData, quotaData, logsData] = await Promise.all([
        masterAdminApi.getTenants(),
        masterAdminApi.getSubscriptions(),
        masterAdminApi.getRevenueAnalytics(),
        masterAdminApi.getAiQuotaUsage(),
        masterAdminApi.getAuditLogs()
      ]);

      setTenants(tenantsData);
      setPlans(plansData);
      setRevenue(revenueData);
      setAiQuota(quotaData);
      setLogs(logsData);
    } catch (err) {
      console.error("Error fetching master admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Handlers
  const handleToggleTenantStatus = async (tenant: TenantInfo) => {
    const nextStatus = tenant.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    try {
      const updated = await masterAdminApi.updateTenantStatus(tenant.id, nextStatus);
      setTenants(tenants.map(t => t.id === updated.id ? updated : t));
    } catch (err) {
      alert("Lỗi khi thay đổi trạng thái tenant");
    }
  };

  const handleNewTenantCodeChange = (val: string) => {
    const clean = val.toLowerCase().replace(/[^a-z0-9-]/g, "");
    setNewTenantCode(clean);
    setNewTenantSubdomain(clean);
    if (!newTenantName || newTenantName.endsWith("Corp") || newTenantName.endsWith("Enterprise")) {
      setNewTenantName(clean ? `${clean.toUpperCase()} Enterprise` : "");
    }
  };

  const handleProvisionTenantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await masterAdminApi.provisionTenant({
        code: newTenantCode,
        name: newTenantName,
        subdomain: newTenantSubdomain
      });
      setTenants([...tenants, created]);
      setShowProvisionModal(false);
      setProvisionSuccessData(created);
    } catch (err: any) {
      alert(err.response?.data?.message || "Lỗi khi cấp phát tenant");
    }
  };

  const handleSavePlanSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const planPayload: SubscriptionPlan = {
      code: planCode,
      name: planName,
      description: planDesc,
      priceMonthly,
      priceYearly,
      maxJobs,
      maxCvParses,
      maxAiInterviewHours: maxAiHours,
      status: "ACTIVE"
    };

    try {
      if (isNewPlan) {
        const created = await masterAdminApi.createSubscription(planPayload);
        setPlans([...plans, created]);
      } else if (showPlanModal && showPlanModal.id) {
        const updated = await masterAdminApi.updateSubscription(showPlanModal.id, planPayload);
        setPlans(plans.map(p => p.id === updated.id ? updated : p));
      }
      setShowPlanModal(null);
    } catch (err: any) {
      alert(err.response?.data?.message || "Lỗi khi lưu gói dịch vụ");
    }
  };

  const handleTogglePlanStatus = async (plan: SubscriptionPlan) => {
    if (!plan.id) return;
    const nextStatus = plan.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      const updated = await masterAdminApi.updateSubscriptionStatus(plan.id, nextStatus);
      setPlans(plans.map(p => p.id === updated.id ? updated : p));
    } catch (err) {
      alert("Lỗi khi thay đổi trạng thái gói cước");
    }
  };

  const handleExportFinancial = () => {
    const csvContent = "data:text/csv;charset=utf-8,Tenant Code,Plan,Monthly Price,Status\nacme,PROFESSIONAL,149,ACTIVE\nvng,ENTERPRISE,399,ACTIVE\nviettel,ENTERPRISE,399,ACTIVE\n";
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `financial_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredTenants = tenants.filter(t =>
    t.name.toLowerCase().includes(tenantSearch.toLowerCase()) ||
    t.code.toLowerCase().includes(tenantSearch.toLowerCase()) ||
    t.subdomain.toLowerCase().includes(tenantSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#f9f9ff] text-[#191b23] font-sans antialiased flex flex-col justify-between selection:bg-[#3b82f6] selection:text-white">
      {/* Top Glassmorphism Navigation Bar */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-[#e2e8f0]">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
            <div className="w-10 h-10 rounded-[12px] bg-[#3b82f6] text-white flex items-center justify-center shadow-md shadow-[#3b82f6]/20">
              <BrainCircuit className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xl font-bold font-display text-[#1e293b] tracking-tight">
                SmartHire AI
              </span>
              <span className="ml-2.5 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-[rgba(59,130,246,0.1)] text-[#3b82f6]">
                Super Admin Dashboard
              </span>
            </div>
          </div>

          {/* Tab Navigation */}
          <nav className="hidden md:flex items-center gap-2 p-1 bg-[#f2f3fd] rounded-[12px] border border-[#e2e8f0]">
            <button
              onClick={() => setActiveTab("analytics")}
              className={`px-4 py-2 text-xs font-semibold rounded-[8px] transition-all flex items-center gap-2 ${
                activeTab === "analytics" ? "bg-white text-[#3b82f6] shadow-sm" : "text-[#64748b] hover:text-[#1e293b]"
              }`}
            >
              <BarChart3 className="w-4 h-4" />
              <span>Revenue & AI Quotas</span>
            </button>

            <button
              onClick={() => setActiveTab("tenants")}
              className={`px-4 py-2 text-xs font-semibold rounded-[8px] transition-all flex items-center gap-2 ${
                activeTab === "tenants" ? "bg-white text-[#3b82f6] shadow-sm" : "text-[#64748b] hover:text-[#1e293b]"
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Tenant Directory</span>
            </button>

            <button
              onClick={() => setActiveTab("subscriptions")}
              className={`px-4 py-2 text-xs font-semibold rounded-[8px] transition-all flex items-center gap-2 ${
                activeTab === "subscriptions" ? "bg-white text-[#3b82f6] shadow-sm" : "text-[#64748b] hover:text-[#1e293b]"
              }`}
            >
              <CreditCard className="w-4 h-4" />
              <span>SaaS Subscriptions</span>
            </button>

            <button
              onClick={() => setActiveTab("logs")}
              className={`px-4 py-2 text-xs font-semibold rounded-[8px] transition-all flex items-center gap-2 ${
                activeTab === "logs" ? "bg-white text-[#3b82f6] shadow-sm" : "text-[#64748b] hover:text-[#1e293b]"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>System Logs</span>
            </button>
          </nav>

          <div className="flex items-center gap-4 text-xs">
            <LanguageSwitcher />

            <button
              onClick={fetchData}
              className="p-2 rounded-[8px] bg-[rgba(59,130,246,0.08)] text-[#3b82f6] hover:bg-[rgba(59,130,246,0.15)] transition-colors"
              title="Refresh Data"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </button>

            <button
              onClick={() => {
                localStorage.removeItem("master_access_token");
                navigate("/admin/login");
              }}
              className="px-3.5 py-2 text-xs font-semibold rounded-[8px] bg-red-50 text-red-600 hover:bg-red-100 transition-colors flex items-center gap-1.5"
            >
              <LogOut className="w-4 h-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Dashboard Body */}
      <main className="max-w-7xl mx-auto px-6 py-10 w-full flex-grow">
        {/* TAB 1: REVENUE & AI QUOTA ANALYTICS */}
        {activeTab === "analytics" && (
          <div className="space-y-8 animate-fade-in">
            {/* Header & Export Financial Button */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold font-display text-[#1e293b]">Global Revenue & System AI Quotas</h1>
                <p className="text-xs text-[#64748b]">Thống kê tổng doanh thu nền tảng SaaS & Hạn ngạch tài nguyên AI toàn hệ thống.</p>
              </div>

              <button
                onClick={handleExportFinancial}
                className="px-4 py-2.5 text-xs font-semibold rounded-[8px] bg-[#3b82f6] hover:bg-[#2563eb] text-white shadow-md shadow-[#3b82f6]/20 transition-all flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                <span>Export Financial Report (CSV)</span>
              </button>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="p-6 rounded-[24px] bg-white border border-[#e2e8f0] shadow-[0_20px_25px_-5px_rgba(59,130,246,0.05)]">
                <span className="text-xs font-semibold text-[#64748b] block mb-1">Monthly Recurring Revenue (MRR)</span>
                <span className="text-3xl font-extrabold text-[#3b82f6]">${revenue?.mrr.toLocaleString()}</span>
                <span className="text-[11px] font-bold text-[#16a34a] bg-[#16a34a]/10 px-2 py-0.5 rounded-full ml-2">
                  {revenue?.growthRate}
                </span>
              </div>

              <div className="p-6 rounded-[24px] bg-white border border-[#e2e8f0] shadow-[0_20px_25px_-5px_rgba(59,130,246,0.05)]">
                <span className="text-xs font-semibold text-[#64748b] block mb-1">Annual Run Rate (ARR)</span>
                <span className="text-3xl font-extrabold text-[#1e293b]">${revenue?.arr.toLocaleString()}</span>
                <span className="text-[11px] text-[#64748b] block mt-1">Dự báo 12 tháng</span>
              </div>

              <div className="p-6 rounded-[24px] bg-white border border-[#e2e8f0] shadow-[0_20px_25px_-5px_rgba(59,130,246,0.05)]">
                <span className="text-xs font-semibold text-[#64748b] block mb-1">Doanh Nghiệp Đang Kích Hoạt</span>
                <span className="text-3xl font-extrabold text-[#16a34a]">{revenue?.activeTenants} Tenants</span>
                <span className="text-[11px] text-[#64748b] block mt-1">Separate Database per Tenant</span>
              </div>

              <div className="p-6 rounded-[24px] bg-white border border-[#e2e8f0] shadow-[0_20px_25px_-5px_rgba(59,130,246,0.05)]">
                <span className="text-xs font-semibold text-[#64748b] block mb-1">Trạng Thái Hệ Thống</span>
                <div className="flex items-center gap-2 mt-2">
                  <Activity className="w-5 h-5 text-[#16a34a] animate-pulse" />
                  <span className="text-lg font-bold text-[#16a34a]">{aiQuota?.systemHealth}</span>
                </div>
              </div>
            </div>

            {/* AI Quotas & Models Panel */}
            <div className="grid md:grid-cols-2 gap-8">
              <div className="p-8 rounded-[24px] bg-white border border-[#e2e8f0] shadow-[0_20px_25px_-5px_rgba(59,130,246,0.05)]">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-[12px] bg-[rgba(59,130,246,0.1)] text-[#3b82f6] flex items-center justify-center font-bold">
                    <Cpu className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-[#1e293b]">System AI Quotas Monitor</h3>
                    <p className="text-xs text-[#64748b]">Lượt parse CV & Giờ phỏng vấn AI Voice toàn hệ thống.</p>
                  </div>
                </div>

                <div className="space-y-6">
                  {/* CV Parses Usage */}
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-2">
                      <span>CV Parsing Quota (Monthly)</span>
                      <span className="text-[#3b82f6]">
                        {aiQuota?.totalCvParsesUsed.toLocaleString()} / {aiQuota?.totalCvParsesLimit.toLocaleString()} CVs
                      </span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-[#f2f3fd] overflow-hidden">
                      <div
                        className="h-full bg-[#3b82f6] rounded-full transition-all"
                        style={{ width: `${((aiQuota?.totalCvParsesUsed || 0) / (aiQuota?.totalCvParsesLimit || 1)) * 100}%` }}
                      />
                    </div>
                  </div>

                  {/* AI Voice Hours Usage */}
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-2">
                      <span>AI Voice Interview Quota</span>
                      <span className="text-[#d97706]">
                        {aiQuota?.totalVoiceHoursUsed} / {aiQuota?.totalVoiceHoursLimit} Hours
                      </span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-[#f2f3fd] overflow-hidden">
                      <div
                        className="h-full bg-[#d97706] rounded-full transition-all"
                        style={{ width: `${((aiQuota?.totalVoiceHoursUsed || 0) / (aiQuota?.totalVoiceHoursLimit || 1)) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Active AI Engines */}
              <div className="p-8 rounded-[24px] bg-white border border-[#e2e8f0] shadow-[0_20px_25px_-5px_rgba(59,130,246,0.05)] flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-10 h-10 rounded-[12px] bg-[rgba(59,130,246,0.1)] text-[#3b82f6] flex items-center justify-center font-bold">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-[#1e293b]">Active AI Engines</h3>
                      <p className="text-xs text-[#64748b]">Các mô hình AI đang tích hợp trên nền tảng.</p>
                    </div>
                  </div>

                  <ul className="space-y-3 text-sm text-[#475569]">
                    {aiQuota?.activeModels.map((model, idx) => (
                      <li key={idx} className="flex items-center gap-3 p-3 rounded-[12px] bg-[#f8f9ff] border border-[#e2e8f0]">
                        <CheckCircle2 className="w-4 h-4 text-[#16a34a]" />
                        <span className="font-semibold text-[#1e293b]">{model}</span>
                        <span className="ml-auto text-[10px] bg-[#16a34a]/10 text-[#16a34a] font-bold px-2 py-0.5 rounded-full">Operational</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TENANT DIRECTORY & PROVISIONING */}
        {activeTab === "tenants" && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold font-display text-[#1e293b]">Tenant Directory & Provisioning</h1>
                <p className="text-xs text-[#64748b]">Quản lý danh bạ doanh nghiệp, cấp phát Database mới và khóa/mở khóa Tenant.</p>
              </div>

              <button
                onClick={() => setShowProvisionModal(true)}
                className="px-4 py-2.5 text-xs font-semibold rounded-[8px] bg-[#3b82f6] hover:bg-[#2563eb] text-white shadow-md shadow-[#3b82f6]/20 transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Create & Provision New Tenant</span>
              </button>
            </div>

            {/* Search Bar */}
            <div className="relative max-w-md">
              <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748b]" />
              <input
                type="text"
                placeholder="Tìm theo Tên, Mã Tenant hoặc Subdomain..."
                value={tenantSearch}
                onChange={(e) => setTenantSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-[8px] bg-white border border-[#e2e8f0] text-xs text-[#1e293b] focus:border-[#3b82f6] focus:outline-none"
              />
            </div>

            {/* Tenant Table */}
            <div className="bg-white border border-[#e2e8f0] rounded-[24px] overflow-hidden shadow-[0_20px_25px_-5px_rgba(59,130,246,0.05)]">
              <table className="w-full text-left text-xs text-[#475569]">
                <thead className="bg-[#f8f9ff] text-[#1e293b] font-semibold border-b border-[#e2e8f0]">
                  <tr>
                    <th className="p-4">Tenant Code</th>
                    <th className="p-4">Doanh Nghiệp</th>
                    <th className="p-4">Subdomain</th>
                    <th className="p-4">Database Name</th>
                    <th className="p-4">Trạng Thái</th>
                    <th className="p-4 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f0]">
                  {filteredTenants.map((tenant) => (
                    <tr key={tenant.id} className="hover:bg-[#f2f3fd]/50 transition-colors">
                      <td className="p-4 font-mono font-bold text-[#3b82f6]">{tenant.code}</td>
                      <td className="p-4 font-semibold text-[#1e293b]">{tenant.name}</td>
                      <td className="p-4 font-mono text-[#64748b]">{tenant.subdomain}.smarthire.ai</td>
                      <td className="p-4 font-mono text-xs">{tenant.dbName}</td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            tenant.status === "ACTIVE"
                              ? "bg-[#16a34a]/10 text-[#16a34a]"
                              : "bg-red-50 text-red-600"
                          }`}
                        >
                          {tenant.status === "ACTIVE" ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {tenant.status}
                        </span>
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => setSelectedTenant(tenant)}
                          className="px-3 py-1.5 rounded-[6px] bg-[rgba(59,130,246,0.08)] text-[#3b82f6] hover:bg-[rgba(59,130,246,0.15)] font-semibold transition-colors inline-flex items-center gap-1"
                        >
                          <Eye className="w-3.5 h-3.5" /> Detail
                        </button>

                        <button
                          onClick={() => handleToggleTenantStatus(tenant)}
                          className={`px-3 py-1.5 rounded-[6px] font-semibold transition-colors inline-flex items-center gap-1 ${
                            tenant.status === "ACTIVE"
                              ? "bg-red-50 text-red-600 hover:bg-red-100"
                              : "bg-[#16a34a]/10 text-[#16a34a] hover:bg-[#16a34a]/20"
                          }`}
                        >
                          {tenant.status === "ACTIVE" ? "Suspend" : "Activate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: SAAS SUBSCRIPTION PLANS */}
        {activeTab === "subscriptions" && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold font-display text-[#1e293b]">SaaS Subscription Plans</h1>
                <p className="text-xs text-[#64748b]">Quản lý danh sách, tạo mới, chỉnh sửa giá cước & hạn ngạch các gói dịch vụ SaaS.</p>
              </div>

              <button
                onClick={() => {
                  setIsNewPlan(true);
                  setPlanCode("");
                  setPlanName("");
                  setPlanDesc("");
                  setPriceMonthly(49);
                  setPriceYearly(490);
                  setMaxJobs(10);
                  setMaxCvParses(500);
                  setMaxAiHours(20);
                  setShowPlanModal({} as SubscriptionPlan);
                }}
                className="px-4 py-2.5 text-xs font-semibold rounded-[8px] bg-[#3b82f6] hover:bg-[#2563eb] text-white shadow-md shadow-[#3b82f6]/20 transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Subscription Plan</span>
              </button>
            </div>

            {/* Plans Grid */}
            <div className="grid md:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <div
                  key={plan.id || plan.code}
                  className="p-7 rounded-[24px] bg-white border border-[#e2e8f0] shadow-[0_20px_25px_-5px_rgba(59,130,246,0.05)] flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-bold text-[#1e293b]">{plan.name}</h3>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          plan.status === "ACTIVE" ? "bg-[#16a34a]/10 text-[#16a34a]" : "bg-red-50 text-red-600"
                        }`}
                      >
                        {plan.status}
                      </span>
                    </div>

                    <p className="text-xs text-[#64748b] mb-4">{plan.description}</p>

                    <div className="flex items-baseline gap-1 mb-6">
                      <span className="text-3xl font-extrabold text-[#3b82f6]">${plan.priceMonthly}</span>
                      <span className="text-xs text-[#64748b]">/tháng (${plan.priceYearly}/năm)</span>
                    </div>

                    <ul className="space-y-2.5 text-xs text-[#475569] mb-6">
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-[#3b82f6]" />
                        <span>Tối đa <strong>{plan.maxJobs} Jobs</strong></span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-[#3b82f6]" />
                        <span>Phân tích <strong>{plan.maxCvParses} CVs</strong> / tháng</span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-[#3b82f6]" />
                        <span><strong>{plan.maxAiInterviewHours} Giờ</strong> Phỏng Vấn AI Voice</span>
                      </li>
                    </ul>
                  </div>

                  <div className="flex items-center gap-2 pt-4 border-t border-[#e2e8f0]">
                    <button
                      onClick={() => {
                        setIsNewPlan(false);
                        setPlanCode(plan.code);
                        setPlanName(plan.name);
                        setPlanDesc(plan.description);
                        setPriceMonthly(plan.priceMonthly);
                        setPriceYearly(plan.priceYearly);
                        setMaxJobs(plan.maxJobs);
                        setMaxCvParses(plan.maxCvParses);
                        setMaxAiHours(plan.maxAiInterviewHours);
                        setShowPlanModal(plan);
                      }}
                      className="flex-1 py-2 rounded-[6px] bg-[rgba(59,130,246,0.08)] text-[#3b82f6] hover:bg-[rgba(59,130,246,0.15)] font-semibold text-xs transition-colors flex items-center justify-center gap-1"
                    >
                      <Sliders className="w-3.5 h-3.5" /> Edit Plan
                    </button>

                    <button
                      onClick={() => handleTogglePlanStatus(plan)}
                      className={`px-3 py-2 rounded-[6px] font-semibold text-xs transition-colors ${
                        plan.status === "ACTIVE" ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-[#16a34a]/10 text-[#16a34a]"
                      }`}
                    >
                      {plan.status === "ACTIVE" ? "Deactivate" : "Activate"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB 4: SYSTEM AUDIT LOGS */}
        {activeTab === "logs" && (
          <div className="space-y-6 animate-fade-in">
            <div>
              <h1 className="text-2xl font-bold font-display text-[#1e293b]">Tenant System Audit Logs</h1>
              <p className="text-xs text-[#64748b]">Theo dõi nhật ký hoạt động hệ thống, stack trace và lỗi các Tenant.</p>
            </div>

            <div className="bg-white border border-[#e2e8f0] rounded-[24px] overflow-hidden shadow-[0_20px_25px_-5px_rgba(59,130,246,0.05)]">
              <table className="w-full text-left text-xs text-[#475569]">
                <thead className="bg-[#f8f9ff] text-[#1e293b] font-semibold border-b border-[#e2e8f0]">
                  <tr>
                    <th className="p-4">ID</th>
                    <th className="p-4">Tenant</th>
                    <th className="p-4">Action</th>
                    <th className="p-4">Mô Tả Log</th>
                    <th className="p-4">Level</th>
                    <th className="p-4">Thời Gian</th>
                    <th className="p-4 text-right">Chi Tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f0]">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-[#f2f3fd]/50 transition-colors font-mono">
                      <td className="p-4 text-[#64748b]">#{log.id}</td>
                      <td className="p-4 font-bold text-[#3b82f6]">{log.tenantCode}</td>
                      <td className="p-4 font-semibold text-[#1e293b]">{log.action}</td>
                      <td className="p-4 font-sans text-xs max-w-xs truncate">{log.description}</td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            log.level === "INFO"
                              ? "bg-[#3b82f6]/10 text-[#3b82f6]"
                              : log.level === "WARN"
                              ? "bg-amber-50 text-amber-600"
                              : "bg-red-50 text-red-600"
                          }`}
                        >
                          {log.level}
                        </span>
                      </td>
                      <td className="p-4 text-[#64748b] text-[11px]">{new Date(log.timestamp).toLocaleString()}</td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="px-3 py-1 rounded-[6px] bg-[rgba(59,130,246,0.08)] text-[#3b82f6] hover:bg-[rgba(59,130,246,0.15)] font-semibold transition-colors"
                        >
                          View Detail Log
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>

      {/* MODAL: VIEW TENANT DETAILS */}
      {selectedTenant && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white border border-[#e2e8f0] rounded-[24px] p-8 max-w-lg w-full shadow-2xl relative animate-fade-in">
            <button onClick={() => setSelectedTenant(null)} className="absolute top-6 right-6 text-[#64748b] hover:text-[#1e293b]">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold font-display text-[#1e293b] mb-4">Chi Tiết Tenant #{selectedTenant.id}</h3>
            
            <div className="space-y-3 text-xs font-mono bg-[#f8f9ff] p-5 rounded-[16px] border border-[#e2e8f0]">
              <div className="flex justify-between"><span className="text-[#64748b]">Tên Doanh Nghiệp:</span><span className="font-bold text-[#1e293b]">{selectedTenant.name}</span></div>
              <div className="flex justify-between"><span className="text-[#64748b]">Mã Tenant:</span><span className="font-bold text-[#3b82f6]">{selectedTenant.code}</span></div>
              <div className="flex justify-between"><span className="text-[#64748b]">Subdomain:</span><span>{selectedTenant.subdomain}.smarthire.ai</span></div>
              <div className="flex justify-between"><span className="text-[#64748b]">Database Name:</span><span className="text-[#16a34a] font-bold">{selectedTenant.dbName}</span></div>
              <div className="flex justify-between"><span className="text-[#64748b]">Trạng Thái:</span><span className="font-bold">{selectedTenant.status}</span></div>

              <div className="pt-3 border-t border-[#e2e8f0] space-y-2 font-sans">
                <span className="text-xs font-bold text-[#1e293b] block">🔑 Thông Tin Đăng Nhập Quản Trị Tenant:</span>
                <div className="flex justify-between font-mono text-xs"><span className="text-[#64748b]">Email Admin:</span><span className="font-bold text-[#3b82f6]">admin@{selectedTenant.code}.com</span></div>
                <div className="flex justify-between font-mono text-xs"><span className="text-[#64748b]">Mật Khẩu Mặc Định:</span><span className="font-bold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">Password123!</span></div>
                <div className="flex justify-between font-mono text-xs"><span className="text-[#64748b]">Quyền Hạn:</span><span className="font-bold text-[#16a34a]">TENANT_ADMIN</span></div>
                <div className="flex justify-between font-mono text-xs pt-1">
                  <span className="text-[#64748b]">Subdomain Login:</span>
                  <a
                    href={`http://${selectedTenant.code}.localhost:${window.location.port || 5173}/internal/login`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-[#3b82f6] font-bold underline"
                  >
                    http://{selectedTenant.code}.smarthire.ai/internal/login
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: PROVISION NEW TENANT */}
      {showProvisionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white border border-[#e2e8f0] rounded-[24px] p-8 max-w-md w-full shadow-2xl relative">
            <button onClick={() => setShowProvisionModal(false)} className="absolute top-6 right-6 text-[#64748b] hover:text-[#1e293b]">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold font-display text-[#1e293b] mb-4">Create & Provision New Tenant</h3>
            <form onSubmit={handleProvisionTenantSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-1">Mã Tenant (Code)</label>
                <input
                  type="text"
                  required
                  placeholder="ctya"
                  value={newTenantCode}
                  onChange={(e) => handleNewTenantCodeChange(e.target.value)}
                  className="w-full px-3 py-2 rounded-[8px] bg-[#f8f9ff] border text-xs font-mono"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Tên Doanh Nghiệp</label>
                <input
                  type="text"
                  required
                  placeholder="Cong ty A"
                  value={newTenantName}
                  onChange={(e) => setNewTenantName(e.target.value)}
                  className="w-full px-3 py-2 rounded-[8px] bg-[#f8f9ff] border text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1">Subdomain</label>
                <input
                  type="text"
                  required
                  placeholder="ctya"
                  value={newTenantSubdomain}
                  onChange={(e) => setNewTenantSubdomain(e.target.value.toLowerCase())}
                  className="w-full px-3 py-2 rounded-[8px] bg-[#f8f9ff] border text-xs font-mono"
                />
              </div>
              <button type="submit" className="w-full py-2.5 rounded-[8px] bg-[#3b82f6] text-white font-bold text-xs shadow-md">
                Provision Database & Initialize Admin
              </button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: PROVISION TENANT SUCCESS CREDENTIALS DISPLAY */}
      {provisionSuccessData && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white border border-[#e2e8f0] rounded-[24px] p-8 max-w-lg w-full shadow-2xl relative text-center animate-fade-in">
            <button
              onClick={() => {
                setProvisionSuccessData(null);
                setNewTenantCode("");
                setNewTenantName("");
                setNewTenantSubdomain("");
              }}
              className="absolute top-6 right-6 text-[#64748b] hover:text-[#1e293b]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="w-16 h-16 rounded-full bg-[#16a34a]/10 text-[#16a34a] flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <h3 className="text-2xl font-bold font-display text-[#1e293b] mb-1">
              Khởi Tạo Enterprise Tenant Thành Công 🎉
            </h3>
            <p className="text-xs text-[#64748b] mb-6">
              Database <strong>`smarthire_tenant_{provisionSuccessData.code}`</strong> cho <strong>{provisionSuccessData.name}</strong> đã được tạo & khởi tạo tài khoản Admin hoàn tất!
            </p>

            {/* CREDENTIALS BOX WITH 2 LINKS */}
            <div className="bg-[#f8f9ff] p-5 rounded-[16px] border border-[#e2e8f0] text-left space-y-3 font-mono text-xs mb-6">
              {/* Link 1: Subdomain Landing Page / Career Portal */}
              <div className="flex justify-between items-center pb-2 border-b border-[#e2e8f0]">
                <span className="text-[#64748b] flex items-center gap-1.5 font-sans font-semibold">
                  <Globe className="w-4 h-4 text-emerald-600" /> Link 1 (Landing / Career Portal):
                </span>
                <a
                  href={`http://${provisionSuccessData.code}.localhost:${window.location.port || 5173}/`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-emerald-600 font-bold underline text-xs"
                >
                  http://{provisionSuccessData.code}.smarthire.ai/
                </a>
              </div>

              {/* Link 2: Subdomain Internal Login (HR & Admin) */}
              <div className="flex justify-between items-center pb-2 border-b border-[#e2e8f0]">
                <span className="text-[#64748b] flex items-center gap-1.5 font-sans font-semibold">
                  <KeyRound className="w-4 h-4 text-[#3b82f6]" /> Link 2 (Đăng Nhập HR / Admin):
                </span>
                <a
                  href={`http://${provisionSuccessData.code}.localhost:${window.location.port || 5173}/internal/login`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[#3b82f6] font-bold underline text-xs"
                >
                  http://{provisionSuccessData.code}.smarthire.ai/internal/login
                </a>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[#64748b] font-sans font-semibold">Username / Email Admin:</span>
                <span className="text-[#1e293b] font-bold">admin@{provisionSuccessData.code}.com</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-[#64748b] font-sans font-semibold flex items-center gap-1">
                  <KeyRound className="w-3.5 h-3.5 text-amber-600" /> Mật Khẩu Mặc Định:
                </span>
                <span className="text-amber-600 font-bold bg-amber-50 px-2 py-0.5 rounded">Password123!</span>
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-[#e2e8f0]">
                <span className="text-[#64748b] font-sans font-semibold">Quyền Hạn (Role Token):</span>
                <span className="text-[#16a34a] font-bold">TENANT_ADMIN</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  const info = `Landing Page: http://${provisionSuccessData.code}.smarthire.ai/\nLogin Internal: http://${provisionSuccessData.code}.smarthire.ai/internal/login\nEmail: admin@${provisionSuccessData.code}.com\nPassword: Password123!`;
                  navigator.clipboard.writeText(info);
                  setCopiedCreds(true);
                  setTimeout(() => setCopiedCreds(false), 2000);
                }}
                className="flex-1 py-3 px-4 rounded-[8px] bg-slate-100 hover:bg-slate-200 text-[#1e293b] font-bold text-xs transition-all border border-[#e2e8f0] flex items-center justify-center gap-2"
              >
                <span>{copiedCreds ? "Đã Sao Chép! ✓" : "Sao Chép Thông Tin"}</span>
              </button>

              <a
                href={`http://${provisionSuccessData.code}.localhost:${window.location.port || 5173}/internal/login`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 py-3 px-4 rounded-[8px] bg-[#3b82f6] hover:bg-[#2563eb] text-white font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
              >
                <span>Vào Đăng Nhập HR</span>
                <ArrowRight className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CREATE / EDIT SUBSCRIPTION PLAN */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white border border-[#e2e8f0] rounded-[24px] p-8 max-w-md w-full shadow-2xl relative">
            <button onClick={() => setShowPlanModal(null)} className="absolute top-6 right-6 text-[#64748b] hover:text-[#1e293b]">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-xl font-bold font-display text-[#1e293b] mb-4">{isNewPlan ? "Tạo Gói SaaS Mới" : "Cập Nhật Gói SaaS"}</h3>
            <form onSubmit={handleSavePlanSubmit} className="space-y-3 text-xs">
              <div><label className="block font-semibold mb-1">Mã Gói (Code)</label><input type="text" required disabled={!isNewPlan} value={planCode} onChange={e => setPlanCode(e.target.value)} className="w-full p-2 bg-[#f8f9ff] border rounded" /></div>
              <div><label className="block font-semibold mb-1">Tên Gói</label><input type="text" required value={planName} onChange={e => setPlanName(e.target.value)} className="w-full p-2 bg-[#f8f9ff] border rounded" /></div>
              <div><label className="block font-semibold mb-1">Mô Tả</label><input type="text" value={planDesc} onChange={e => setPlanDesc(e.target.value)} className="w-full p-2 bg-[#f8f9ff] border rounded" /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><label className="block font-semibold mb-1">Giá Tháng ($)</label><input type="number" value={priceMonthly} onChange={e => setPriceMonthly(Number(e.target.value))} className="w-full p-2 bg-[#f8f9ff] border rounded" /></div>
                <div><label className="block font-semibold mb-1">Giá Năm ($)</label><input type="number" value={priceYearly} onChange={e => setPriceYearly(Number(e.target.value))} className="w-full p-2 bg-[#f8f9ff] border rounded" /></div>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div><label className="block font-semibold mb-1">Max Jobs</label><input type="number" value={maxJobs} onChange={e => setMaxJobs(Number(e.target.value))} className="w-full p-2 bg-[#f8f9ff] border rounded" /></div>
                <div><label className="block font-semibold mb-1">Max CVs</label><input type="number" value={maxCvParses} onChange={e => setMaxCvParses(Number(e.target.value))} className="w-full p-2 bg-[#f8f9ff] border rounded" /></div>
                <div><label className="block font-semibold mb-1">Max Voice hrs</label><input type="number" value={maxAiHours} onChange={e => setMaxAiHours(Number(e.target.value))} className="w-full p-2 bg-[#f8f9ff] border rounded" /></div>
              </div>
              <button type="submit" className="w-full py-2.5 rounded bg-[#3b82f6] text-white font-bold text-xs mt-3">Lưu Gói SaaS</button>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: VIEW LOG DETAIL */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white border border-[#e2e8f0] rounded-[24px] p-8 max-w-lg w-full shadow-2xl relative font-mono text-xs">
            <button onClick={() => setSelectedLog(null)} className="absolute top-6 right-6 text-[#64748b] hover:text-[#1e293b]">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-[#1e293b] mb-4">Detail Audit Log #{selectedLog.id}</h3>
            <div className="bg-[#f8f9ff] p-4 rounded-[12px] space-y-2 border border-[#e2e8f0]">
              <div><strong>Tenant Code:</strong> <span className="text-[#3b82f6]">{selectedLog.tenantCode}</span></div>
              <div><strong>Action:</strong> {selectedLog.action}</div>
              <div><strong>Level:</strong> {selectedLog.level}</div>
              <div><strong>IP Address:</strong> {selectedLog.ipAddress}</div>
              <div><strong>Timestamp:</strong> {selectedLog.timestamp}</div>
              <div className="pt-2 border-t font-sans"><strong>Full Log Message:</strong><p className="mt-1 text-[#475569]">{selectedLog.description}</p></div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-[#e2e8f0] py-6 text-center text-xs text-[#64748b] bg-white">
        SmartHire AI Platform © 2026. Super Admin Administration Module.
      </footer>
    </div>
  );
}
