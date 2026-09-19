import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  masterAdminApi,
  TenantInfo,
  SubscriptionPlan,
  RevenueAnalytics,
  AiQuotaUsage,
  AuditLog,
} from "@/api/master/masterAdminApi";
import { masterAuthApi } from "@/api/master/masterAuthApi";
import { consultationApi, ConsultationResponse } from "@/api/master/consultationApi";
import { LanguageSwitcher } from "@/components/ux/LanguageSwitcher";
import { Tooltip } from "@/components/ux/Tooltip";
import { PlatformAnalyticsDashboard } from "@/features/master/dashboard/components/PlatformAnalyticsDashboard";
import { PlatformHomeDashboard } from "@/features/master/dashboard/components/PlatformHomeDashboard";
import { TenantManagementHub } from "@/features/master/tenant-management/components/TenantManagementHub";
import { BillingWorkspace } from "@/features/master/billing/components/BillingWorkspace";
import type { BillingView } from "@/features/master/billing/components/BillingWorkspace";
import type { TenantHubTab } from "@/features/master/tenant-management/components/TenantManagementHub";
import { TrafficIngressInspector } from "@/features/master/system/components/TrafficIngressInspector";
import { SystemManagementWorkspace } from "@/features/master/system/components/SystemManagementWorkspace";
import type { LucideIcon } from "lucide-react";
import {
  BrainCircuit,
  Building2,
  CreditCard,
  ReceiptText,
  ArrowUpDown,
  BarChart3,
  House,
  FileText,
  Plus,
  Search,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Download,
  Activity,
  Cpu,
  LogOut,
  Eye,
  Sliders,
  X,
  ShieldCheck,
  ExternalLink,
  Filter,
  Clock,
  Layers,
  ChevronLeft,
  ChevronRight,
  Bell,
  CircleUserRound,
  KeyRound,
  PhoneCall,
  Inbox,
  UserPlus,
  Loader2,
  Check,
} from "lucide-react";

type DashboardTab = "home" | "analytics" | "leads" | "tenants" | "subscriptions" | "logs" | "ai-usage" | "ai-quotas" | "account-profile" | "account-security" | "account-accessibility" | "account-notifications";
type SidebarGroupId = "overview" | "analytics" | "tenants" | "commerce" | "system" | "account";
type SidebarItem = {
  tab?: DashboardTab;
  action?: () => void;
  label: string;
  description: string;
  icon: LucideIcon;
  comingSoon?: boolean;
  isActive?: boolean;
};

export function MasterAdminDashboardPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<DashboardTab>("home");
  const [tenantHubTab, setTenantHubTab] = useState<TenantHubTab>("overview");
  const [billingView, setBillingView] = useState<BillingView>("overview");
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(true);
  const [openSidebarGroup, setOpenSidebarGroup] = useState<SidebarGroupId | null>(null);
  const [isAccountMenuOpen, setIsAccountMenuOpen] = useState(false);
  const [isNotificationPanelOpen, setIsNotificationPanelOpen] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(() => localStorage.getItem("master_reduced_motion") === "true");
  const [emailNotifications, setEmailNotifications] = useState(() => localStorage.getItem("master_email_notifications") !== "false");

  // State Data
  const [tenants, setTenants] = useState<TenantInfo[]>([]);
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [revenue, setRevenue] = useState<RevenueAnalytics | null>(null);
  const [aiQuota, setAiQuota] = useState<AiQuotaUsage | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [leads, setLeads] = useState<ConsultationResponse[]>([]);

  const [, setLoading] = useState(true);

  // Modals state
  const [selectedTenant, setSelectedTenant] = useState<TenantInfo | null>(null);
  const [showPlanModal, setShowPlanModal] = useState<SubscriptionPlan | null>(null);
  const [isNewPlan, setIsNewPlan] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [selectedLead, setSelectedLead] = useState<ConsultationResponse | null>(null);
  const [leadNotesEdit, setLeadNotesEdit] = useState("");
  const [leadStatusEdit, setLeadStatusEdit] = useState<"PENDING" | "CONTACTED" | "PROVISIONED" | "REJECTED">("PENDING");
  const [updatingLead, setUpdatingLead] = useState(false);

  // Filters state
  const [tenantSearch, setTenantSearch] = useState("");
  const [tenantStatusFilter, setTenantStatusFilter] = useState<string>("ALL");
  const [logLevelFilter, setLogLevelFilter] = useState<string>("ALL");
  const [leadSearch, setLeadSearch] = useState("");
  const [leadStatusFilter, setLeadStatusFilter] = useState<string>("ALL");
  const [logSearch, setLogSearch] = useState("");
  const [logTenantFilter, setLogTenantFilter] = useState("ALL");
  const [logTimeRange, setLogTimeRange] = useState("ALL");
  const [logPage, setLogPage] = useState(1);

  // Plan Form state
  const [planCode, setPlanCode] = useState("");
  const [planName, setPlanName] = useState("");
  const [planDesc, setPlanDesc] = useState("");
  const [priceMonthly, setPriceMonthly] = useState(49);
  const [priceYearly, setPriceYearly] = useState(490);
  const [maxJobs, setMaxJobs] = useState(10);
  const [maxCvParses, setMaxCvParses] = useState(500);
  const [maxAiHours, setMaxAiHours] = useState(20);

  // Action status message
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Change Password state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [tenantsData, plansData, revenueData, quotaData, logsData, leadsData] = await Promise.all([
        masterAdminApi.getTenants().catch(() => [
          {
            id: 1,
            code: "viettel",
            name: "Tập đoàn Công nghiệp - Viễn thông Quân đội (Viettel)",
            subdomain: "viettel",
            dbName: "smarthire_tenant_viettel",
            status: "ACTIVE",
            createdAt: "2026-01-15T08:00:00Z",
          },
          {
            id: 2,
            code: "vng",
            name: "Công ty Cổ phần VNG",
            subdomain: "vng",
            dbName: "smarthire_tenant_vng",
            status: "ACTIVE",
            createdAt: "2026-02-10T09:30:00Z",
          },
          {
            id: 3,
            code: "acme",
            name: "Acme Corporation Enterprise",
            subdomain: "acme",
            dbName: "smarthire_tenant_acme",
            status: "ACTIVE",
            createdAt: "2026-03-01T10:15:00Z",
          },
          {
            id: 4,
            code: "fpt",
            name: "FPT Software Global",
            subdomain: "fpt",
            dbName: "smarthire_tenant_fpt",
            status: "ACTIVE",
            createdAt: "2026-04-12T14:20:00Z",
          },
          {
            id: 5,
            code: "techcombank",
            name: "Ngân hàng TMCP Kỹ thương Việt Nam",
            subdomain: "techcombank",
            dbName: "smarthire_tenant_techcombank",
            status: "PROVISIONING",
            createdAt: "2026-05-02T16:45:00Z",
          },
        ]),
        masterAdminApi.getSubscriptions().catch(() => [
          {
            id: 1,
            code: "STARTER",
            name: "Gói Khởi Đầu (Starter)",
            description: "Dành cho công ty khởi nghiệp & doanh nghiệp nhỏ.",
            priceMonthly: 49,
            priceYearly: 490,
            maxJobs: 5,
            maxCvParses: 200,
            maxAiInterviewHours: 5,
            status: "ACTIVE",
          },
          {
            id: 2,
            code: "PROFESSIONAL",
            name: "Gói Chuyên Nghiệp (Professional)",
            description: "Tối ưu cho doanh nghiệp tăng trưởng nhanh.",
            priceMonthly: 149,
            priceYearly: 1490,
            maxJobs: 25,
            maxCvParses: 2500,
            maxAiInterviewHours: 30,
            status: "ACTIVE",
          },
          {
            id: 3,
            code: "ENTERPRISE",
            name: "Gói Doanh Nghiệp (Enterprise Scale)",
            description: "Hạ tầng Dedicated Database và SLA cam kết 99.99%.",
            priceMonthly: 399,
            priceYearly: 3990,
            maxJobs: 100,
            maxCvParses: 15000,
            maxAiInterviewHours: 150,
            status: "ACTIVE",
          },
        ]),
        masterAdminApi.getRevenueAnalytics().catch(() => ({
          mrr: 48500,
          arr: 582000,
          activeTenants: 18,
          growthRate: "+28.4%",
          planDistribution: {
            "Enterprise Dedicated": 9,
            "Corporate Scale": 6,
            "Professional Standard": 3,
          },
        })),
        masterAdminApi.getAiQuotaUsage().catch(() => ({
          totalCvParsesUsed: 42850,
          totalCvParsesLimit: 100000,
          totalVoiceHoursUsed: 345,
          totalVoiceHoursLimit: 1000,
          activeModels: [
            "Gemini 1.5 Pro Multimodal (CV Screening)",
            "Whisper Large v3 (Voice Speech-to-Text)",
            "RoBERTa NLP Semantic Matching Engine",
            "CodeSandbox Runner (Docker Isolated)",
          ],
          systemHealth: "99.98% Uptime (Healthy)",
        })),
        masterAdminApi.getAuditLogs().catch(() => [
          {
            id: 1092,
            tenantCode: "viettel",
            action: "TENANT_PROVISION_SUCCESS",
            description: "Hoàn tất tạo database smarthire_tenant_viettel & Flyway migrations",
            level: "INFO" as const,
            timestamp: "2026-09-13T10:14:22Z",
            ipAddress: "14.225.24.18",
          },
          {
            id: 1091,
            tenantCode: "techcombank",
            action: "PROVISION_RETRY_TRIGGERED",
            description: "Workspace Admin kích hoạt lại luồng cấu hình database cho Techcombank",
            level: "WARN" as const,
            timestamp: "2026-09-13T09:45:00Z",
            ipAddress: "118.70.128.5",
          },
          {
            id: 1090,
            tenantCode: "vng",
            action: "QUOTA_LIMIT_WARNING",
            description: "Doanh nghiệp VNG đã sử dụng 85% hạn mức CV AI trong tháng",
            level: "WARN" as const,
            timestamp: "2026-09-13T08:30:15Z",
            ipAddress: "115.79.35.4",
          },
          {
            id: 1089,
            tenantCode: "master",
            action: "WORKSPACE_ADMIN_LOGIN",
            description: "Workspace Admin đăng nhập thành công qua Master Auth API",
            level: "INFO" as const,
            timestamp: "2026-09-13T07:15:00Z",
            ipAddress: "14.161.42.99",
          },
        ] as AuditLog[]),
        consultationApi.getAll().catch(() => [
          {
            id: 1,
            companyName: "Tập đoàn VNP Group",
            contactName: "Trần Minh Quang",
            jobTitle: "HR Director",
            workEmail: "quang.tm@vnp.com.vn",
            phoneNumber: "0987 654 321",
            companySize: "500-2000",
            requestType: "CONTRACT_QUOTE" as const,
            planTier: "Gói Doanh Nghiệp (Enterprise)",
            primaryNeed: "Tự động hóa sàng lọc CV và phỏng vấn sơ loại AI",
            notes: "Cần tư vấn báo giá hạ tầng Dedicated DB cho 15 HR và 5,000 CVs/tháng",
            status: "PENDING" as const,
            createdAt: "2026-09-17T14:30:00Z",
            updatedAt: "2026-09-17T14:30:00Z",
          },
          {
            id: 2,
            companyName: "Techcom Finance JSC",
            contactName: "Lê Thu Hà",
            jobTitle: "Head of Talent Acquisition",
            workEmail: "ha.lt@techcomfinance.vn",
            phoneNumber: "0912 345 678",
            companySize: "100-500",
            requestType: "DEMO" as const,
            planTier: "Gói Chuyên Nghiệp (Professional)",
            primaryNeed: "Đánh giá bài test kỹ thuật tự động cho Developers",
            notes: "Muốn xem demo trực tiếp tính năng Code Sandbox chấm điểm",
            status: "CONTACTED" as const,
            createdAt: "2026-09-16T09:15:00Z",
            updatedAt: "2026-09-16T11:00:00Z",
          }
        ] as ConsultationResponse[]),
      ]);

      setTenants(tenantsData);
      setPlans(plansData);
      setRevenue(revenueData);
      setAiQuota(quotaData);
      setLogs(logsData);
      setLeads(leadsData);
    } catch (err) {
      console.error("Error fetching workspace admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const triggerNotification = (msg: string) => {
    setActionSuccessMsg(msg);
    setTimeout(() => setActionSuccessMsg(null), 4000);
  };

  // Lead Handlers
  const handleUpdateLeadStatus = async (
    id: number,
    status: "PENDING" | "CONTACTED" | "PROVISIONED" | "REJECTED",
    notes?: string
  ) => {
    try {
      const updated = await consultationApi.updateStatus(id, { status, notes });
      setLeads((prev) => prev.map((l) => (l.id === id ? updated : l)));
      if (selectedLead && selectedLead.id === id) {
        setSelectedLead(updated);
      }
      triggerNotification(`Đã cập nhật trạng thái yêu cầu sang: ${status}`);
    } catch (err: any) {
      // Mock fallback if API offline
      setLeads((prev) =>
        prev.map((l) => (l.id === id ? { ...l, status, notes: notes || l.notes } : l))
      );
      if (selectedLead && selectedLead.id === id) {
        setSelectedLead({ ...selectedLead, status, notes: notes || selectedLead.notes });
      }
      triggerNotification(`Đã cập nhật trạng thái yêu cầu sang: ${status}`);
    }
  };

  const handleOpenLeadModal = (lead: ConsultationResponse) => {
    setSelectedLead(lead);
    setLeadNotesEdit(lead.notes || "");
    setLeadStatusEdit(lead.status);
  };

  const handleSaveLeadModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLead) return;
    setUpdatingLead(true);
    try {
      await handleUpdateLeadStatus(selectedLead.id, leadStatusEdit, leadNotesEdit);
      setSelectedLead(null);
    } finally {
      setUpdatingLead(false);
    }
  };

  const handleProvisionFromLead = (lead: ConsultationResponse) => {
    const query = new URLSearchParams({
      name: lead.companyName,
      email: lead.workEmail,
      adminName: lead.contactName,
    }).toString();
    navigate(`/onboard?${query}`);
  };

  // Handlers
  const handleToggleTenantStatus = async (tenant: TenantInfo) => {
    if (tenant.status === "FAILED" || tenant.status === "PROVISIONING") {
      navigate(`/onboard?retry=${tenant.id}`);
      return;
    }
    const nextStatus = tenant.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
    try {
      const updated = await masterAdminApi.updateTenantStatus(tenant.id, nextStatus);
      setTenants(tenants.map((t) => (t.id === updated.id ? updated : t)));
      triggerNotification(`Đã cập nhật trạng thái tenant ${tenant.code} sang ${nextStatus}`);
    } catch (err) {
      // Fallback update for mock/offline testing
      setTenants(
        tenants.map((t) => (t.id === tenant.id ? { ...t, status: nextStatus } : t))
      );
      triggerNotification(`Đã cập nhật trạng thái tenant ${tenant.code} sang ${nextStatus}`);
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
      status: "ACTIVE",
    };

    try {
      if (isNewPlan) {
        const created = await masterAdminApi.createSubscription(planPayload);
        setPlans([...plans, created]);
        triggerNotification(`Đã tạo thành công gói dịch vụ ${planPayload.name}`);
      } else if (showPlanModal && showPlanModal.id) {
        const updated = await masterAdminApi.updateSubscription(showPlanModal.id, planPayload);
        setPlans(plans.map((p) => (p.id === updated.id ? updated : p)));
        triggerNotification(`Đã cập nhật gói dịch vụ ${planPayload.name}`);
      }
      setShowPlanModal(null);
    } catch (err: any) {
      // Offline fallback
      if (isNewPlan) {
        setPlans([...plans, { ...planPayload, id: Date.now() }]);
      } else if (showPlanModal && showPlanModal.id) {
        setPlans(
          plans.map((p) =>
            p.id === showPlanModal.id ? { ...planPayload, id: showPlanModal.id } : p
          )
        );
      }
      setShowPlanModal(null);
      triggerNotification(`Đã lưu gói dịch vụ ${planPayload.name}`);
    }
  };

  const handleTogglePlanStatus = async (plan: SubscriptionPlan) => {
    if (!plan.id) return;
    const nextStatus = plan.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    try {
      const updated = await masterAdminApi.updateSubscriptionStatus(plan.id, nextStatus);
      setPlans(plans.map((p) => (p.id === updated.id ? updated : p)));
      triggerNotification(`Gói cước ${plan.name} đã chuyển sang ${nextStatus}`);
    } catch (err) {
      setPlans(
        plans.map((p) => (p.id === plan.id ? { ...p, status: nextStatus } : p))
      );
      triggerNotification(`Gói cước ${plan.name} đã chuyển sang ${nextStatus}`);
    }
  };

  const handleExportFinancial = () => {
    const csvContent =
      "data:text/csv;charset=utf-8,Tenant Code,Company Name,Database,Subdomain,Status\n" +
      tenants.map((t) => `${t.code},${t.name},${t.dbName},${t.subdomain}.smarthire.top,${t.status}`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `smarthire_tenants_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    triggerNotification("Đã xuất báo cáo danh sách Tenant dạng CSV thành công!");
  };

  const handleChangePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);

    if (newPassword.length < 12) {
      setPasswordError("Mật khẩu mới phải có tối thiểu 12 ký tự.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError("Xác nhận mật khẩu mới không khớp.");
      return;
    }

    setPasswordLoading(true);
    try {
      await masterAuthApi.changePassword({ currentPassword, newPassword });
      triggerNotification("Đổi mật khẩu Quản trị viên thành công!");
      setShowPasswordModal(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || "Không thể đổi mật khẩu. Vui lòng kiểm tra lại mật khẩu hiện tại.";
      setPasswordError(msg);
    } finally {
      setPasswordLoading(false);
    }
  };

  // Filtered Lists
  const filteredTenants = useMemo(() => {
    return tenants.filter((t) => {
      const matchSearch =
        t.name.toLowerCase().includes(tenantSearch.toLowerCase()) ||
        t.code.toLowerCase().includes(tenantSearch.toLowerCase()) ||
        t.subdomain.toLowerCase().includes(tenantSearch.toLowerCase());
      const matchStatus = tenantStatusFilter === "ALL" || t.status === tenantStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [tenants, tenantSearch, tenantStatusFilter]);

  const filteredLogs = useMemo(() => {
    const newestLogTime = logs.reduce((latest, item) => Math.max(latest, new Date(item.timestamp).getTime()), 0);
    return logs.filter((log) => {
      const normalizedSearch = logSearch.trim().toLowerCase();
      const matchesSearch = !normalizedSearch
        || log.action.toLowerCase().includes(normalizedSearch)
        || log.description.toLowerCase().includes(normalizedSearch)
        || log.tenantCode.toLowerCase().includes(normalizedSearch)
        || log.ipAddress.toLowerCase().includes(normalizedSearch)
        || String(log.id).includes(normalizedSearch);
      const matchesLevel = logLevelFilter === "ALL" || log.level === logLevelFilter;
      const matchesTenant = logTenantFilter === "ALL" || log.tenantCode === logTenantFilter;
      const eventTime = new Date(log.timestamp).getTime();
      const rangeInDays = logTimeRange === "24H" ? 1 : logTimeRange === "7D" ? 7 : logTimeRange === "30D" ? 30 : null;
      const matchesTime = rangeInDays === null || eventTime >= newestLogTime - rangeInDays * 86_400_000;
      return matchesSearch && matchesLevel && matchesTenant && matchesTime;
    });
  }, [logs, logLevelFilter, logSearch, logTenantFilter, logTimeRange]);

  const logTenantOptions = useMemo(() => Array.from(new Set(logs.map((log) => log.tenantCode))).sort(), [logs]);
  const logPageSize = 5;
  const logPageCount = Math.max(1, Math.ceil(filteredLogs.length / logPageSize));
  const paginatedLogs = filteredLogs.slice((logPage - 1) * logPageSize, logPage * logPageSize);

  useEffect(() => {
    setLogPage(1);
  }, [logLevelFilter, logSearch, logTenantFilter, logTimeRange]);

  const filteredLeads = useMemo(() => {
    return leads.filter((l) => {
      const q = leadSearch.toLowerCase();
      const matchSearch =
        l.companyName.toLowerCase().includes(q) ||
        l.contactName.toLowerCase().includes(q) ||
        l.workEmail.toLowerCase().includes(q) ||
        (l.phoneNumber && l.phoneNumber.toLowerCase().includes(q)) ||
        (l.planTier && l.planTier.toLowerCase().includes(q));
      const matchStatus = leadStatusFilter === "ALL" || l.status === leadStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [leads, leadSearch, leadStatusFilter]);

  const pendingLeadsCount = useMemo(() => {
    return leads.filter((l) => l.status === "PENDING").length;
  }, [leads]);

  const sidebarGroups: Array<{
    id: SidebarGroupId;
    label: string;
    icon: LucideIcon;
    items: SidebarItem[];
  }> = [
    {
      id: "overview",
      label: "Trang chủ",
      icon: House,
      items: [
        {
          tab: "home",
          label: "Trung tâm thông tin",
          description: "Sự kiện mới, cảnh báo và việc cần xử lý trên toàn nền tảng.",
          icon: House,
        },
      ],
    },
    {
      id: "analytics",
      label: "Thống kê",
      icon: BarChart3,
      items: [
        {
          tab: "analytics",
          label: "Phân tích nền tảng",
          description: "Doanh thu, tenant health, AI usage, hệ thống, bảo mật và vận hành.",
          icon: BarChart3,
        },
      ],
    },
    {
      id: "tenants",
      label: "Doanh nghiệp",
      icon: Building2,
      items: [
        {
          tab: "tenants",
          isActive: activeTab === "tenants" && tenantHubTab === "overview",
          action: () => {
            setTenantHubTab("overview");
            setActiveTab("tenants");
          },
          label: `Tổng quan doanh nghiệp (${tenants.length})`,
          description: "Tình trạng tenant và các thao tác quản trị nhanh.",
          icon: Building2,
        },
        {
          tab: "leads",
          label: `Yêu cầu Demo & Báo giá (${leads.length})`,
          description: "Xử lý yêu cầu tư vấn báo giá và demo của khách hàng doanh nghiệp.",
          icon: PhoneCall,
        },
        {
          isActive: activeTab === "tenants" && tenantHubTab === "directory",
          action: () => {
            setTenantHubTab("directory");
            setActiveTab("tenants");
          },
          label: "Danh bạ tenant",
          description: "Tìm kiếm, xem chi tiết và quản lý trạng thái tenant.",
          icon: FileText,
        },
        {
          isActive: activeTab === "tenants" && tenantHubTab === "create",
          action: () => {
            setTenantHubTab("create");
            setActiveTab("tenants");
          },
          label: "Tạo tenant mới",
          description: "Đăng ký tenant, cấp phát database và tạo admin đầu tiên.",
          icon: Plus,
        },
        {
          isActive: activeTab === "tenants" && tenantHubTab === "verification",
          action: () => {
            setTenantHubTab("verification");
            setActiveTab("tenants");
          },
          label: "Xác thực doanh nghiệp",
          description: "Thẩm định hồ sơ pháp lý; hiện là giao diện mẫu.",
          icon: ShieldCheck,
        },
        {
          isActive: activeTab === "tenants" && tenantHubTab === "provisioning",
          action: () => {
            setTenantHubTab("provisioning");
            setActiveTab("tenants");
          },
          label: "Theo dõi provisioning",
          description: "Kiểm tra tenant đang tạo database hoặc cần retry.",
          icon: Sliders,
        },
      ],
    },
    {
      id: "commerce",
      label: "Gói & thanh toán",
      icon: CreditCard,
      items: [
        {
          tab: "subscriptions",
          isActive: activeTab === "subscriptions" && (billingView === "overview" || billingView === "plans"),
          action: () => {
            setBillingView("plans");
            setActiveTab("subscriptions");
          },
          label: `Gói dịch vụ SaaS (${plans.length})`,
          description: "Cấu hình gói thuê bao, giới hạn và mức giá dịch vụ.",
          icon: CreditCard,
        },
        {
          isActive: activeTab === "subscriptions" && billingView === "allocations",
          action: () => {
            setBillingView("allocations");
            setActiveTab("subscriptions");
          },
          label: "Phân bổ gói cho Tenant",
          description: "Gán, nâng cấp hoặc hạ cấp gói dịch vụ của từng doanh nghiệp.",
          icon: ArrowUpDown,
        },
        {
          isActive: activeTab === "subscriptions" && billingView === "invoices",
          action: () => {
            setBillingView("invoices");
            setActiveTab("subscriptions");
          },
          label: "Hóa đơn & thanh toán",
          description: "Theo dõi hóa đơn, trạng thái thanh toán và lịch sử doanh thu.",
          icon: ReceiptText,
        },
      ],
    },
    {
      id: "system",
      label: "Hệ thống",
      icon: ShieldCheck,
      items: [
        {
          tab: "logs",
          label: `Nhật ký hệ thống (${logs.length})`,
          description: "Kiểm tra hoạt động quản trị và các sự kiện hệ thống.",
          icon: FileText,
        },
        {
          tab: "ai-usage",
          label: "Báo cáo sử dụng AI",
          description: "Phân tích mức tiêu thụ AI theo tenant, dịch vụ và thời gian.",
          icon: BrainCircuit,
        },
        {
          tab: "ai-quotas",
          label: "Quản lý hạn ngạch AI",
          description: "Theo dõi giới hạn, cảnh báo và chính sách sử dụng tài nguyên AI.",
          icon: Sliders,
        },
      ],
    },
  ];
  const accountSidebarGroup: {
    id: SidebarGroupId;
    label: string;
    icon: LucideIcon;
    items: SidebarItem[];
  } = {
    id: "account",
    label: "Tài khoản",
    icon: CircleUserRound,
    items: [
      { tab: "account-profile", label: "Hồ sơ của bạn", description: "Xem thông tin tài khoản Workspace Admin.", icon: CircleUserRound },
      { tab: "account-security", label: "Tài khoản và bảo mật", description: "Quản lý phiên đăng nhập và bảo mật tài khoản.", icon: ShieldCheck },
      { tab: "account-accessibility", label: "Khả năng tiếp cận", description: "Điều chỉnh trải nghiệm sử dụng phù hợp.", icon: Eye },
      { tab: "account-notifications", label: "Tùy chọn thông báo", description: "Cấu hình cách nhận thông báo quản trị.", icon: Bell },
    ],
  };
  const allSidebarGroups = [...sidebarGroups, accountSidebarGroup];
  const notificationCount = tenants.filter((tenant) => tenant.status !== "ACTIVE").length;
  const selectedSidebarGroup = allSidebarGroups.find((group) => group.id === openSidebarGroup)
    ?? allSidebarGroups.find((group) => group.items.some((item) => item.tab === activeTab))
    ?? sidebarGroups[0];

  useEffect(() => {
    if (!isAccountMenuOpen && !isNotificationPanelOpen) return;

    const closeUtilityPanels = (event: PointerEvent) => {
      const target = event.target;
      if (target instanceof Element && target.closest("[data-dashboard-utility]")) return;
      setIsAccountMenuOpen(false);
      setIsNotificationPanelOpen(false);
    };

    document.addEventListener("pointerdown", closeUtilityPanels);
    return () => document.removeEventListener("pointerdown", closeUtilityPanels);
  }, [isAccountMenuOpen, isNotificationPanelOpen]);

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans antialiased flex flex-col justify-between selection:bg-blue-600 selection:text-white">
      {/* Toast Notification Banner */}
      {actionSuccessMsg && (
        <div className="fixed top-22 right-6 z-50 bg-emerald-600 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 text-xs font-semibold animate-fade-in">
          <CheckCircle2 className="w-4 h-4" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* TOP EXECUTIVE NAVIGATION BAR */}
      <header className="hidden">
        <div
          className={`mx-auto grid min-h-[84px] w-full max-w-[1536px] grid-cols-[5rem_minmax(0,1fr)] items-center transition-[grid-template-columns] duration-200 ${
            isSidebarCollapsed ? "" : "md:grid-cols-[16rem_minmax(0,1fr)]"
          }`}
        >
          {/* Logo & Platform Info */}
          <div
            className={`flex h-full min-w-0 cursor-pointer select-none items-center gap-3.5 border-r border-slate-200 px-3 ${
              isSidebarCollapsed ? "justify-center" : "justify-center md:justify-start"
            }`}
            onClick={() => navigate("/")}
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-tr from-blue-700 via-blue-600 to-indigo-500 text-white shadow-md shadow-blue-600/20 ring-1 ring-white/20">
              <BrainCircuit className="w-6 h-6 text-white" />
            </div>
            {!isSidebarCollapsed && <div className="hidden min-w-0 md:block">
              <div className="flex items-center gap-2">
                <span className="text-xl font-semibold tracking-tight text-slate-900 font-display sm:text-2xl">
                  SmartHire<span className="text-blue-600">.AI</span>
                </span>
              </div>
              <div className="mt-0.5 hidden items-center gap-1.5 text-[11px] text-slate-500 md:flex">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Master DB: PostgreSQL 16 · Online</span>
              </div>
            </div>}
          </div>

          <div aria-hidden="true" />
        </div>
      </header>

      <div className="relative mx-auto flex w-full max-w-[1536px] flex-grow items-start">
        <aside
          className="fixed bottom-0 left-0 top-0 z-30 flex w-20 shrink-0 flex-col overflow-visible border-r border-slate-200 bg-white/95 shadow-sm backdrop-blur-md 2xl:left-[calc((100vw-1536px)/2)]"
          aria-label="Điều hướng quản trị nền tảng"
        >
          {!isSidebarCollapsed && (
            <nav data-dashboard-utility className="hidden" aria-label="Thanh điều hướng nhanh">
              <button
                type="button"
                onClick={() => navigate("/")}
                className="mb-5 flex min-h-12 items-center justify-center rounded-xl text-blue-700 transition-colors hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                aria-label="Trang chủ SmartHire.AI"
              >
                <BrainCircuit className="size-7" />
              </button>
              <div className="space-y-2">
                {sidebarGroups.map((group) => {
                  const GroupIcon = group.icon;
                  const groupIsActive = group.items.some((item) => item.tab === activeTab);
                  return (
                    <button
                      key={group.id}
                      type="button"
                      onClick={() => {
                        const targetItem = group.items.find((item) => item.tab === activeTab) ?? group.items[0];
                        if (targetItem.action) targetItem.action();
                        else if (targetItem.tab) setActiveTab(targetItem.tab);
                      }}
                      className={`flex min-h-16 w-full flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                        groupIsActive ? "bg-blue-100 text-blue-700" : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                      aria-label={group.label}
                    >
                      <GroupIcon className="size-6" />
                      <span className="max-w-full truncate">{group.label}</span>
                    </button>
                  );
                })}
              </div>
              <div className="mt-auto flex flex-col items-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsNotificationPanelOpen((open) => !open);
                    setIsAccountMenuOpen(false);
                  }}
                  className="relative flex size-11 items-center justify-center rounded-xl text-slate-500 transition-colors hover:bg-white hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  aria-label="Thông báo"
                >
                  <Bell className="size-6" />
                  {notificationCount > 0 && <span className="absolute right-1 top-1 size-2.5 rounded-full bg-amber-500 ring-2 ring-slate-50" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsAccountMenuOpen((open) => !open);
                    setIsNotificationPanelOpen(false);
                  }}
                  className="flex size-11 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-sm font-semibold text-white shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
                  aria-label="Tài khoản Workspace Admin"
                >
                  W
                </button>
              </div>
            </nav>
          )}

          <div className={`absolute top-4 z-50 ${isSidebarCollapsed ? "left-full" : "left-[21rem]"}`}>
            <Tooltip content={isSidebarCollapsed ? "Mở rộng" : "Thu gọn"} side="right">
              <button
                type="button"
                data-sidebar-toggle
                onClick={() => {
                  setIsSidebarCollapsed((collapsed) => {
                    if (collapsed) {
                      const activeGroup = sidebarGroups.find((group) => group.items.some((item) => item.tab === activeTab));
                      setOpenSidebarGroup((current) => current ?? activeGroup?.id ?? "overview");
                    } else {
                      setOpenSidebarGroup(null);
                    }
                    return !collapsed;
                  });
                }}
                className="flex h-10 w-5 items-center justify-center rounded-r-full border border-l-0 border-slate-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-blue-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                aria-label={isSidebarCollapsed ? "Mở rộng thanh điều hướng" : "Thu gọn thanh điều hướng"}
                aria-expanded={!isSidebarCollapsed}
              >
                {isSidebarCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
              </button>
            </Tooltip>
          </div>

          {!isSidebarCollapsed && (
            <section className="absolute inset-y-0 left-full z-40 flex w-64 flex-col overflow-hidden border-r border-slate-200 bg-white px-3 py-4 shadow-[8px_0_24px_-18px_rgba(15,23,42,0.35)]" aria-label={`Nhóm ${selectedSidebarGroup.label}`}>
              <div className="mb-5 flex h-12 items-center px-3">
                <span className="text-xl font-semibold tracking-tight text-slate-900 font-display">SmartHire<span className="text-blue-600">.AI</span></span>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto">
                <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">{selectedSidebarGroup.label}</p>
                <nav className="space-y-1.5">
                  {selectedSidebarGroup.items.map((item) => {
                    const ItemIcon = item.icon;
                    const itemIsActive = item.isActive ?? activeTab === item.tab;
                    return (
                      <button
                        key={item.tab ?? item.label}
                        type="button"
                        disabled={item.comingSoon}
                        onClick={() => {
                          if (item.action) item.action();
                          else if (item.tab) setActiveTab(item.tab);
                        }}
                        className={`flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                          item.comingSoon
                            ? "cursor-not-allowed text-slate-400"
                            : itemIsActive
                              ? "bg-blue-50 text-blue-700"
                              : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"
                        }`}
                        aria-current={itemIsActive ? "page" : undefined}
                      >
                        <ItemIcon className="size-5 shrink-0" />
                        <span className="min-w-0 flex-1 truncate">{item.label}</span>
                        {item.comingSoon && <span className="shrink-0 rounded-full bg-slate-100 px-2 py-1 text-[10px] font-semibold text-slate-500">Sắp phát triển</span>}
                      </button>
                    );
                  })}
                </nav>
              </div>
            </section>
          )}

          <div className="relative z-10 min-h-0 flex-1 overflow-visible p-3">
          {true ? (
            <button
              type="button"
              onClick={() => navigate("/")}
              className="mb-4 flex min-h-12 w-full items-center justify-center rounded-xl text-blue-700 transition-colors hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              aria-label="Trang chủ SmartHire.AI"
            >
              <BrainCircuit className="size-7" />
            </button>
          ) : (
            <div className="mb-5 flex h-12 items-center px-3">
              <span className="text-xl font-semibold tracking-tight text-slate-900 font-display">SmartHire<span className="text-blue-600">.AI</span></span>
            </div>
          )}
          {true ? (
            <nav
              className="space-y-2"
              onBlur={(event) => {
                const nextTarget = event.relatedTarget;
                if (
                  isSidebarCollapsed
                  && !event.currentTarget.contains(nextTarget)
                  && !(nextTarget instanceof Element && nextTarget.closest("[data-sidebar-toggle]"))
                ) setOpenSidebarGroup(null);
              }}
            >
              {sidebarGroups.map((group) => {
                const GroupIcon = group.icon;
                const directItem = group.items.length === 1 && !group.items[0].comingSoon
                  ? group.items[0]
                  : null;
                const groupIsActive = group.items.some((item) => item.tab === activeTab)
                  || openSidebarGroup === group.id;

                return (
                  <div
                    key={group.id}
                    className="relative"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        if (directItem) {
                          if (directItem.action) directItem.action();
                          else if (directItem.tab) setActiveTab(directItem.tab);
                          setOpenSidebarGroup(null);
                          setIsSidebarCollapsed(true);
                          return;
                        }
                        if (!isSidebarCollapsed && openSidebarGroup === "account") {
                          setIsSidebarCollapsed(true);
                          setOpenSidebarGroup(group.id);
                          return;
                        }
                        setOpenSidebarGroup((current) => {
                          if (!isSidebarCollapsed) return group.id;
                          return current === group.id ? null : group.id;
                        });
                      }}
                      className={`flex min-h-16 w-full flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-medium transition-colors active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                        groupIsActive
                          ? "bg-blue-50 text-blue-700"
                          : "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                      }`}
                      aria-label={directItem ? group.label : `Mở nhóm ${group.label}`}
                      aria-current={directItem?.tab === activeTab ? "page" : undefined}
                      aria-expanded={directItem ? undefined : openSidebarGroup === group.id}
                      aria-haspopup={directItem ? undefined : "menu"}
                    >
                      <GroupIcon className="h-6 w-6" />
                      <span className="max-w-full truncate">{group.label}</span>
                    </button>

                    {!directItem && isSidebarCollapsed && openSidebarGroup === group.id && (
                      <div
                        className="absolute left-[calc(100%+0.5rem)] top-0 z-40 w-[min(22rem,calc(100vw-6rem))] rounded-3xl border border-slate-200/90 bg-white p-3 shadow-[0_20px_50px_-16px_rgba(15,23,42,0.28)] before:absolute before:-left-2 before:top-0 before:h-full before:w-2 before:content-['']"
                        role="menu"
                        aria-label={group.label}
                      >
                        <p className="px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                          {group.label}
                        </p>
                        <div className="space-y-1.5">
                          {group.items.map((item) => {
                            const ItemIcon = item.icon;
                            const itemIsActive = item.isActive ?? activeTab === item.tab;

                            return (
                              <button
                                key={item.tab ?? item.label}
                                type="button"
                                role="menuitem"
                                disabled={item.comingSoon}
                                onClick={() => {
                                  if (item.action) item.action();
                                  else if (item.tab) setActiveTab(item.tab);
                                  setOpenSidebarGroup(null);
                                }}
                                className={`group flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-[background-color,border-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${
                                  item.comingSoon
                                    ? "cursor-not-allowed border-transparent bg-slate-50/70 opacity-70"
                                    : itemIsActive
                                      ? "cursor-pointer border-slate-300 bg-slate-200 shadow-sm"
                                      : "cursor-pointer border-transparent bg-white hover:border-slate-300 hover:bg-slate-100 hover:shadow-md"
                                }`}
                              >
                                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] border border-slate-200 bg-white text-slate-800 shadow-2xs transition-colors group-hover:border-blue-300 group-hover:text-blue-700">
                                  <ItemIcon className="h-[22px] w-[22px]" />
                                </span>
                                <span className="min-w-0">
                                  <span className="flex items-center gap-2">
                                    <span className="min-w-0 truncate text-base font-semibold leading-5 text-slate-900">{item.label}</span>
                                    {item.comingSoon && <span className="shrink-0 rounded-full bg-slate-200 px-2 py-0.5 text-[10px] font-semibold text-slate-600">Sắp phát triển</span>}
                                  </span>
                                  <span className="mt-1 block truncate text-sm leading-5 text-slate-600">{item.description}</span>
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>
          ) : (
          <nav className="space-y-5">
            <div className="space-y-1">
              {!isSidebarCollapsed && <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Tổng quan</p>}
              <Tooltip content="Tổng quan & Doanh thu" side="right" disabled={!isSidebarCollapsed} className="w-full">
              <button
                type="button"
                onClick={() => setActiveTab("analytics")}
                aria-label="Tổng quan & Doanh thu"
                aria-current={activeTab === "analytics" ? "page" : undefined}
                className={`flex min-h-11 w-full items-center rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${isSidebarCollapsed ? "justify-center px-0" : "gap-3 px-3"} ${
                  activeTab === "analytics"
                    ? "border border-slate-200 bg-blue-50 text-blue-700 shadow-2xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <BarChart3 className="h-5 w-5 shrink-0" />
                {!isSidebarCollapsed && <span>Tổng quan & Doanh thu</span>}
              </button>
              </Tooltip>
            </div>

            <div className={`space-y-1 border-t ${isSidebarCollapsed ? "border-slate-300 pt-2" : "border-slate-100 pt-4"}`}>
              {!isSidebarCollapsed && <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Quản trị</p>}
              <button
                type="button"
                onClick={() => navigate("/onboard")}
                className="flex min-h-11 w-full items-center gap-3 rounded-lg px-3 text-sm font-semibold text-slate-600 transition-colors hover:bg-slate-100 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <Plus className="h-5 w-5 shrink-0" />
                <span className="truncate">Khởi tạo Tenant mới</span>
              </button>
              <Tooltip content={`Danh bạ Doanh nghiệp (${tenants.length})`} side="right" disabled={!isSidebarCollapsed} className="w-full">
              <button
                type="button"
                onClick={() => setActiveTab("tenants")}
                aria-label={`Danh bạ Doanh nghiệp (${tenants.length})`}
                aria-current={activeTab === "tenants" ? "page" : undefined}
                className={`flex min-h-11 w-full items-center rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${isSidebarCollapsed ? "justify-center px-0" : "gap-3 px-3"} ${
                  activeTab === "tenants"
                    ? "border border-slate-200 bg-blue-50 text-blue-700 shadow-2xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <Building2 className="h-5 w-5 shrink-0" />
                {!isSidebarCollapsed && <span className="truncate">Danh bạ Doanh nghiệp ({tenants.length})</span>}
              </button>
              </Tooltip>
              <Tooltip content={`Gói dịch vụ SaaS (${plans.length})`} side="right" disabled={!isSidebarCollapsed} className="w-full">
              <button
                type="button"
                onClick={() => setActiveTab("subscriptions")}
                aria-label={`Gói dịch vụ SaaS (${plans.length})`}
                aria-current={activeTab === "subscriptions" ? "page" : undefined}
                className={`flex min-h-11 w-full items-center rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${isSidebarCollapsed ? "justify-center px-0" : "gap-3 px-3"} ${
                  activeTab === "subscriptions"
                    ? "border border-slate-200 bg-blue-50 text-blue-700 shadow-2xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <CreditCard className="h-5 w-5 shrink-0" />
                {!isSidebarCollapsed && <span className="truncate">Gói dịch vụ SaaS ({plans.length})</span>}
              </button>
              </Tooltip>
            </div>

            <div className={`space-y-1 border-t ${isSidebarCollapsed ? "border-slate-300 pt-2" : "border-slate-100 pt-4"}`}>
              {!isSidebarCollapsed && <p className="px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Hệ thống</p>}
              <Tooltip content={`Nhật ký hệ thống (${logs.length})`} side="right" disabled={!isSidebarCollapsed} className="w-full">
              <button
                type="button"
                onClick={() => setActiveTab("logs")}
                aria-label={`Nhật ký hệ thống (${logs.length})`}
                aria-current={activeTab === "logs" ? "page" : undefined}
                className={`flex min-h-11 w-full items-center rounded-lg text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 ${isSidebarCollapsed ? "justify-center px-0" : "gap-3 px-3"} ${
                  activeTab === "logs"
                    ? "border border-slate-200 bg-blue-50 text-blue-700 shadow-2xs"
                    : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                }`}
              >
                <FileText className="h-5 w-5 shrink-0" />
                {!isSidebarCollapsed && <span className="truncate">Nhật ký hệ thống ({logs.length})</span>}
              </button>
              </Tooltip>
            </div>
          </nav>
          )}
          </div>

          <div data-dashboard-utility className="relative shrink-0 border-t border-slate-200 p-3">
            {(isAccountMenuOpen || isNotificationPanelOpen) && (
              <button
                type="button"
                className="fixed inset-0 z-30 cursor-default"
                onClick={() => {
                  setIsAccountMenuOpen(false);
                  setIsNotificationPanelOpen(false);
                }}
                aria-label="Đóng bảng tiện ích"
              />
            )}

            <div className="flex flex-col items-center gap-3">
              {true ? (
                <Tooltip content="Thông báo hệ thống" side="right">
                  <button
                    type="button"
                    onClick={() => {
                      setIsNotificationPanelOpen((open) => !open);
                      setIsAccountMenuOpen(false);
                    }}
                    className="relative flex size-11 items-center justify-center rounded-xl text-slate-600 transition-colors hover:bg-slate-100 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    aria-label={`Thông báo hệ thống${notificationCount ? `, ${notificationCount} cần chú ý` : ""}`}
                  >
                    <Bell className="size-6" />
                    {notificationCount > 0 && (
                      <span className="absolute right-1 top-1 flex min-w-4 items-center justify-center rounded-full bg-amber-500 px-1 text-[10px] font-bold leading-4 text-white" role="status" aria-atomic="true">
                        {notificationCount}
                      </span>
                    )}
                  </button>
                </Tooltip>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setIsNotificationPanelOpen((open) => !open);
                    setIsAccountMenuOpen(false);
                  }}
                  className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  aria-label={`Thông báo hệ thống${notificationCount ? `, ${notificationCount} cần chú ý` : ""}`}
                >
                  <Bell className="size-5" />
                  <span className="flex-1 text-left">Thông báo</span>
                  {notificationCount > 0 && (
                    <span className="flex min-w-5 items-center justify-center rounded-full bg-amber-100 px-1.5 text-[11px] font-bold leading-5 text-amber-800" role="status" aria-atomic="true">
                      {notificationCount}
                    </span>
                  )}
                </button>
              )}

              <button
                type="button"
                onClick={() => {
                  setIsAccountMenuOpen((open) => !open);
                  setIsNotificationPanelOpen(false);
                }}
                className="relative z-40 flex size-12 items-center justify-center rounded-full border border-slate-200 bg-white p-1 shadow-sm transition-colors hover:border-blue-300 hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                aria-label="Mở menu tài khoản"
                aria-haspopup="menu"
                aria-expanded={isAccountMenuOpen}
              >
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-base font-semibold text-white">
                  W
                </span>
                {false && (
                  <>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-900">Workspace Admin</span>
                      <span className="block truncate text-xs text-slate-500">Platform Administrator</span>
                    </span>
                    <ChevronRight className="size-4 shrink-0 text-slate-500" />
                  </>
                )}
              </button>
            </div>

            {isNotificationPanelOpen && (
              <div
                className="absolute bottom-0 left-[calc(100%+0.75rem)] z-40 w-[min(22rem,calc(100vw-6rem))] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-[0_24px_60px_-18px_rgba(15,23,42,0.32)]"
                role="dialog"
                aria-label="Thông báo hệ thống"
              >
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
                  <div>
                    <h2 className="text-base font-semibold text-slate-950">Thông báo</h2>
                    <p className="mt-0.5 text-xs text-slate-500">Các tenant cần quản trị viên chú ý</p>
                  </div>
                  {notificationCount > 0 && (
                    <span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">{notificationCount} mới</span>
                  )}
                </div>

                <div className="max-h-80 overflow-y-auto p-3">
                  {notificationCount === 0 ? (
                    <div className="flex flex-col items-center px-4 py-8 text-center">
                      <span className="flex size-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><CheckCircle2 className="size-6" /></span>
                      <p className="mt-3 text-sm font-semibold text-slate-800">Không có thông báo mới</p>
                      <p className="mt-1 text-xs text-slate-500">Tất cả tenant đang hoạt động bình thường.</p>
                    </div>
                  ) : (
                    tenants.filter((tenant) => tenant.status !== "ACTIVE").map((tenant) => (
                      <button
                        key={tenant.id}
                        type="button"
                        onClick={() => {
                          setActiveTab("tenants");
                          setIsNotificationPanelOpen(false);
                        }}
                        className="flex w-full items-start gap-3 rounded-2xl p-3 text-left transition-colors hover:bg-amber-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
                      >
                        <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><Building2 className="size-5" /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-slate-900">{tenant.name}</span>
                          <span className="mt-1 block text-xs text-slate-500">Trạng thái: {tenant.status}</span>
                        </span>
                        <ChevronRight className="mt-2 size-4 shrink-0 text-slate-400" />
                      </button>
                    ))
                  )}
                </div>

                <div className="border-t border-slate-200 p-3">
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("logs");
                      setIsNotificationPanelOpen(false);
                    }}
                    className="min-h-10 w-full rounded-xl text-sm font-semibold text-blue-700 transition-colors hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    Xem nhật ký hệ thống
                  </button>
                </div>
              </div>
            )}

            {isAccountMenuOpen && (
              <div
                className="absolute bottom-0 left-[calc(100%+0.75rem)] z-40 w-[min(24rem,calc(100vw-6rem))] rounded-3xl border border-slate-200 bg-white shadow-[0_24px_60px_-18px_rgba(15,23,42,0.32)]"
                role="dialog"
                aria-label="Tài khoản Workspace Admin"
              >
                <div className="px-5 pb-2 pt-5 text-sm font-semibold text-slate-700">Tài khoản</div>
                <div className="mx-3 mb-3 flex items-center gap-3 rounded-2xl bg-slate-100 px-3 py-2.5">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-sm font-semibold text-white">W</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-slate-950">Workspace Admin</span>
                    <span className="mt-0.5 block truncate text-xs text-slate-600">Platform Administrator</span>
                  </span>
                </div>

                <div className="border-t border-slate-200 px-3 py-3">
                  <p className="px-2 pb-2 text-xs font-semibold text-slate-500">Tùy chọn</p>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveTab("account-profile");
                      setOpenSidebarGroup("account");
                      setIsSidebarCollapsed(false);
                      setIsAccountMenuOpen(false);
                    }}
                    className="mb-1 flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    <CircleUserRound className="size-5 shrink-0" aria-hidden="true" />
                    Tài khoản của bạn
                  </button>
                  <LanguageSwitcher variant="sidebar" menuSide="right" openOnHover />
                </div>

                <div className="border-t border-slate-200 p-3">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      localStorage.removeItem("master_access_token");
                      navigate("/admin/login");
                    }}
                    className="flex min-h-12 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium text-slate-700 transition-colors hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
                  >
                    <LogOut className="size-5" />
                    <span>Đăng xuất</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* MAIN DASHBOARD CONTENT */}
        <main className={`min-w-0 flex-1 px-4 py-8 transition-[margin] duration-200 sm:px-6 lg:px-8 ${
          isSidebarCollapsed ? "ml-20" : "ml-20 md:ml-[21rem]"
        }`}>
        {activeTab === "home" && (
          <PlatformHomeDashboard
            revenue={revenue}
            aiQuota={aiQuota}
            tenants={tenants}
            logs={logs}
            onNavigate={setActiveTab}
            onCreateTenant={() => navigate("/onboard")}
          />
        )}

        {activeTab === "analytics" && (
          <PlatformAnalyticsDashboard
            revenue={revenue}
            aiQuota={aiQuota}
            tenants={tenants}
            logs={logs}
            onExport={handleExportFinancial}
          />
        )}

        {/* Legacy analytics layout retained temporarily while downstream actions are migrated. */}
        {false && (
          <div className="space-y-8 animate-fade-in">
            {/* Action & Title */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Tổng Quan Doanh Thu & Tài Nguyên Nền Tảng
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Số liệu thời gian thực từ Master Database về doanh thu định kỳ và hạn ngạch AI toàn hệ thống.
                </p>
              </div>

              <button
                onClick={handleExportFinancial}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 shadow-2xs transition-all flex items-center gap-2 self-start sm:self-auto"
              >
                <Download className="w-4 h-4 text-slate-500" />
                <span>Xuất báo cáo tài chính (CSV)</span>
              </button>
            </div>

            {/* Metrics 4 Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                <span className="text-xs font-semibold text-slate-500 block mb-1">
                  Doanh thu hàng tháng (MRR)
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-blue-600">
                    ${revenue?.mrr.toLocaleString()}
                  </span>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    {revenue?.growthRate}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">Tăng trưởng so với tháng trước</span>
              </div>

              <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                <span className="text-xs font-semibold text-slate-500 block mb-1">
                  Doanh thu dự phóng năm (ARR)
                </span>
                <span className="text-3xl font-extrabold text-slate-900">
                  ${revenue?.arr.toLocaleString()}
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block">Hợp đồng B2B 12 tháng</span>
              </div>

              <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                <span className="text-xs font-semibold text-slate-500 block mb-1">
                  Doanh nghiệp đang kích hoạt
                </span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-emerald-600">
                    {revenue?.activeTenants}
                  </span>
                  <span className="text-xs font-semibold text-slate-500">Doanh nghiệp</span>
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">Mỗi công ty 1 Database riêng biệt</span>
              </div>

              <div className="p-6 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                <span className="text-xs font-semibold text-slate-500 block mb-1">
                  Độ sẵn sàng hệ thống (SLA)
                </span>
                <div className="flex items-center gap-2 mt-1">
                  <Activity className="w-5 h-5 text-emerald-500 animate-pulse" />
                  <span className="text-lg font-bold text-emerald-700">
                    {aiQuota?.systemHealth}
                  </span>
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">Tất cả cụm Cloud hoạt động bình thường</span>
              </div>
            </div>

            {/* AI Quotas Monitor & Plan Distribution */}
            <div className="grid lg:grid-cols-12 gap-8">
              {/* AI Quotas */}
              <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-6">
                <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
                      <Cpu className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Giám Sát Tài Nguyên AI Toàn Sàn</h3>
                      <p className="text-xs text-slate-500">Tiến độ tiêu thụ Quota sàng lọc CV & Phỏng vấn thoại tháng này.</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-md">
                    Realtime Workers
                  </span>
                </div>

                <div className="space-y-5">
                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-2">
                      <span className="text-slate-700">Hạn ngạch Sàng lọc CV (Monthly Parsing)</span>
                      <span className="text-blue-600 font-mono">
                        {aiQuota?.totalCvParsesUsed.toLocaleString()} / {aiQuota?.totalCvParsesLimit.toLocaleString()} CVs (
                        {Math.round(((aiQuota?.totalCvParsesUsed || 0) / (aiQuota?.totalCvParsesLimit || 1)) * 100)}%)
                      </span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-blue-600 rounded-full transition-all duration-500"
                        style={{
                          width: `${((aiQuota?.totalCvParsesUsed || 0) / (aiQuota?.totalCvParsesLimit || 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-xs font-semibold mb-2">
                      <span className="text-slate-700">Hạn ngạch Phỏng vấn AI bằng Giọng nói (Voice Hours)</span>
                      <span className="text-amber-600 font-mono">
                        {aiQuota?.totalVoiceHoursUsed} / {aiQuota?.totalVoiceHoursLimit} Giờ (
                        {Math.round(((aiQuota?.totalVoiceHoursUsed || 0) / (aiQuota?.totalVoiceHoursLimit || 1)) * 100)}%)
                      </span>
                    </div>
                    <div className="w-full h-3 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-amber-500 rounded-full transition-all duration-500"
                        style={{
                          width: `${((aiQuota?.totalVoiceHoursUsed || 0) / (aiQuota?.totalVoiceHoursLimit || 1)) * 100}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Active AI Engines List */}
                <div className="pt-3 border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-700 block mb-3">
                    Các mô hình AI đang vận hành trực tuyến:
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {aiQuota?.activeModels.map((model, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate font-medium">{model}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Plan Distribution & Recent Tenants */}
              <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-2xs space-y-6 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                      <Layers className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-bold text-slate-900">Phân Bổ Gói Cước Doanh Nghiệp</h3>
                      <p className="text-xs text-slate-500">Tỷ trọng các gói dịch vụ đang hoạt động.</p>
                    </div>
                  </div>

                  <div className="space-y-4 my-6">
                    {revenue?.planDistribution &&
                      Object.entries(revenue?.planDistribution ?? {}).map(([name, count], i) => (
                        <div key={i} className="space-y-1.5">
                          <div className="flex justify-between text-xs font-semibold">
                            <span className="text-slate-700">{name}</span>
                            <span className="font-mono text-slate-900">{count} Khách hàng</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-100 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                i === 0 ? "bg-blue-600" : i === 1 ? "bg-indigo-500" : "bg-sky-400"
                              }`}
                              style={{ width: `${(count / 18) * 100}%` }}
                            />
                          </div>
                        </div>
                      ))}
                  </div>
                </div>

                <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 text-xs text-slate-700">
                  <div className="font-bold text-blue-900 mb-1 flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                    <span>Cam kết hạ tầng Enterprise</span>
                  </div>
                  <p className="text-slate-600 text-[11px] leading-relaxed">
                    100% doanh nghiệp được cung cấp Database riêng biệt và connection pool độc lập, đảm bảo an toàn dữ liệu mức tối cao.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB: ENTERPRISE DEMO & CONTRACT LEADS */}
        {activeTab === "leads" && (
          <div className="space-y-6 animate-fade-in">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2.5">
                  <span>Yêu Cầu Demo & Báo Giá Hợp Đồng</span>
                  {pendingLeadsCount > 0 && (
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold border border-amber-300">
                      {pendingLeadsCount} yêu cầu mới
                    </span>
                  )}
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Khách hàng doanh nghiệp quan tâm từ Landing Page. Trao đổi nhu cầu và trực tiếp Cấp phát Workspace riêng khi chốt hợp đồng.
                </p>
              </div>

              <button
                onClick={() => navigate("/onboard")}
                className="px-4 py-2.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Cấp phát Workspace thủ công</span>
              </button>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
                <span className="text-xs text-slate-500 font-semibold block mb-1">Tổng Số Lead Tiếp Nhận</span>
                <span className="text-2xl font-bold text-slate-900">{leads.length}</span>
              </div>
              <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 shadow-2xs">
                <span className="text-xs text-amber-800 font-semibold block mb-1">Chờ Xử Lý & Liên Hệ</span>
                <span className="text-2xl font-bold text-amber-600">{pendingLeadsCount}</span>
              </div>
              <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 shadow-2xs">
                <span className="text-xs text-blue-800 font-semibold block mb-1">Đăng Ký Trải Nghiệm Demo</span>
                <span className="text-2xl font-bold text-blue-600">
                  {leads.filter((l) => l.requestType === "DEMO").length}
                </span>
              </div>
              <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 shadow-2xs">
                <span className="text-xs text-emerald-800 font-semibold block mb-1">Báo Giá & Hợp Đồng Enterprise</span>
                <span className="text-2xl font-bold text-emerald-600">
                  {leads.filter((l) => l.requestType === "CONTRACT_QUOTE").length}
                </span>
              </div>
            </div>

            {/* Filter & Search */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm theo tên công ty, người liên hệ, email, số điện thoại..."
                  value={leadSearch}
                  onChange={(e) => setLeadSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                <select
                  value={leadStatusFilter}
                  onChange={(e) => setLeadStatusFilter(e.target.value)}
                  className="px-3 py-2 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 font-semibold text-slate-700"
                >
                  <option value="ALL">Tất cả trạng thái ({leads.length})</option>
                  <option value="PENDING">Chờ xử lý ({leads.filter((l) => l.status === "PENDING").length})</option>
                  <option value="CONTACTED">Đang trao đổi / Demo ({leads.filter((l) => l.status === "CONTACTED").length})</option>
                  <option value="PROVISIONED">Đã cấp Workspace ({leads.filter((l) => l.status === "PROVISIONED").length})</option>
                  <option value="REJECTED">Từ chối / Hủy ({leads.filter((l) => l.status === "REJECTED").length})</option>
                </select>
              </div>
            </div>

            {/* Leads Table */}
            <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold">
                      <th className="py-3 px-4">Doanh Nghiệp</th>
                      <th className="py-3 px-4">Người Liên Hệ</th>
                      <th className="py-3 px-4">Loại Yêu Cầu & Gói</th>
                      <th className="py-3 px-4">Nhu Cầu / Ghi Chú</th>
                      <th className="py-3 px-4">Thời Gian</th>
                      <th className="py-3 px-4">Trạng Thái</th>
                      <th className="py-3 px-4 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredLeads.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="text-center py-10 text-slate-400">
                          <Inbox className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                          <span>Không tìm thấy yêu cầu demo hoặc báo giá nào.</span>
                        </td>
                      </tr>
                    ) : (
                      filteredLeads.map((lead) => (
                        <tr key={lead.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-bold text-slate-900">{lead.companyName}</div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <Building2 className="w-3 h-3 text-slate-400" />
                              <span>Quy mô: {lead.companySize || "Chưa rõ"}</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-slate-800">{lead.contactName}</div>
                            {lead.jobTitle && <div className="text-[11px] text-slate-500">{lead.jobTitle}</div>}
                            <div className="text-[11px] text-blue-600 font-mono mt-0.5">{lead.workEmail}</div>
                            {lead.phoneNumber && (
                              <div className="text-[11px] text-slate-500 font-mono">{lead.phoneNumber}</div>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                                lead.requestType === "CONTRACT_QUOTE"
                                  ? "bg-purple-50 text-purple-700 border border-purple-200"
                                  : "bg-sky-50 text-sky-700 border border-sky-200"
                              }`}
                            >
                              {lead.requestType === "CONTRACT_QUOTE" ? "Báo Giá Hợp Đồng" : "Trải Nghiệm Demo"}
                            </span>
                            <div className="text-[11px] text-slate-600 font-medium mt-1 truncate max-w-[180px]">
                              {lead.planTier || "Chưa chọn gói"}
                            </div>
                          </td>

                          <td className="py-3.5 px-4 max-w-[220px]">
                            {lead.notes ? (
                              <p className="text-[11px] text-slate-700 line-clamp-2 leading-relaxed" title={lead.notes}>
                                {lead.notes}
                              </p>
                            ) : lead.primaryNeed ? (
                              <p className="text-[11px] text-slate-500 line-clamp-2" title={lead.primaryNeed}>
                                {lead.primaryNeed}
                              </p>
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">—</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap text-[11px]">
                            {new Date(lead.createdAt).toLocaleDateString("vi-VN", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </td>

                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <span
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                lead.status === "PENDING"
                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                  : lead.status === "CONTACTED"
                                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                                  : lead.status === "PROVISIONED"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-rose-50 text-rose-700 border border-rose-200"
                              }`}
                            >
                              {lead.status === "PENDING" && "Chờ liên hệ"}
                              {lead.status === "CONTACTED" && "Đang trao đổi"}
                              {lead.status === "PROVISIONED" && "Đã cấp Tenant"}
                              {lead.status === "REJECTED" && "Từ chối"}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenLeadModal(lead)}
                                className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100 text-slate-700 text-[11px] font-semibold transition-colors"
                                title="Xem chi tiết & Cập nhật ghi chú"
                              >
                                Chi tiết
                              </button>

                              {lead.status !== "PROVISIONED" && (
                                <button
                                  onClick={() => handleProvisionFromLead(lead)}
                                  className="px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-semibold transition-colors flex items-center gap-1 shadow-2xs"
                                  title="Tự động điền thông tin và chuyển tới trang cấp phát Database riêng"
                                >
                                  <UserPlus className="w-3.5 h-3.5" />
                                  <span>Cấp Workspace</span>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: TENANT DIRECTORY & PROVISIONING */}
        {activeTab === "tenants" && (
          <TenantManagementHub
            activeTab={tenantHubTab}
            onTabChange={setTenantHubTab}
            tenants={tenants}
            onTenantCreated={(tenant) => setTenants((current) => [tenant, ...current])}
            onToggleStatus={handleToggleTenantStatus}
            onRetryProvisioning={(tenant) => navigate(`/onboard?retry=${tenant.id}`)}
          />
        )}

        {/* Legacy directory UI retained temporarily while its modal actions are migrated. */}
        {false && (
          <div className="space-y-6 animate-fade-in">
            {/* Header & New Tenant CTA */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Danh Bạ Khách Hàng Doanh Nghiệp (Tenants)
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Quản lý danh sách các công ty sử dụng dịch vụ, cấp phát Database và kiểm soát quyền truy cập.
                </p>
              </div>

              <button
                onClick={() => navigate("/onboard")}
                className="px-4 py-2.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Khởi tạo & Cấp phát Tenant mới</span>
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm theo Tên doanh nghiệp, Mã Tenant hoặc Subdomain..."
                  value={tenantSearch}
                  onChange={(e) => setTenantSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 focus:border-blue-600 focus:outline-none transition-colors shadow-2xs"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter className="w-4 h-4 text-slate-400" />
                <select
                  value={tenantStatusFilter}
                  onChange={(e) => setTenantStatusFilter(e.target.value)}
                  className="px-3 py-2.5 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 focus:border-blue-600 focus:outline-none shadow-2xs"
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="ACTIVE">Đang kích hoạt (ACTIVE)</option>
                  <option value="SUSPENDED">Đang tạm khóa (SUSPENDED)</option>
                  <option value="PROVISIONING">Đang cấp phát (PROVISIONING)</option>
                  <option value="FAILED">Thất bại (FAILED)</option>
                </select>
              </div>
            </div>

            {/* Tenant Table */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-800 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-4">Doanh Nghiệp</th>
                    <th className="p-4">Mã Tenant</th>
                    <th className="p-4">Subdomain / Domain</th>
                    <th className="p-4">Database Vật Lý</th>
                    <th className="p-4">Trạng Thái</th>
                    <th className="p-4 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTenants.length > 0 ? (
                    filteredTenants.map((tenant) => (
                      <tr key={tenant.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 text-blue-700 font-bold flex items-center justify-center text-xs shrink-0">
                              {tenant.code.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <div className="font-bold text-slate-900">{tenant.name}</div>
                              <div className="text-[11px] text-slate-400">ID #{tenant.id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 font-mono font-bold text-blue-600">{tenant.code}</td>
                        <td className="p-4 font-mono text-slate-500">
                          <a
                            href={`http://${tenant.subdomain}.localhost:5173/login`}
                            target="_blank"
                            rel="noreferrer"
                            className="hover:text-blue-600 hover:underline inline-flex items-center gap-1"
                          >
                            <span>{tenant.subdomain}.smarthire.top</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </td>
                        <td className="p-4 font-mono text-slate-700 font-medium">{tenant.dbName}</td>
                        <td className="p-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              tenant.status === "ACTIVE"
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : tenant.status === "SUSPENDED"
                                ? "bg-rose-50 text-rose-700 border border-rose-200"
                                : "bg-amber-50 text-amber-700 border border-amber-200"
                            }`}
                          >
                            {tenant.status === "ACTIVE" ? (
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            ) : tenant.status === "SUSPENDED" ? (
                              <XCircle className="w-3.5 h-3.5" />
                            ) : (
                              <Clock className="w-3.5 h-3.5" />
                            )}
                            {tenant.status}
                          </span>
                        </td>
                        <td className="p-4 text-right space-x-2">
                          <button
                            onClick={() => setSelectedTenant(tenant)}
                            className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold transition-colors inline-flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            <span>Chi tiết</span>
                          </button>

                          <button
                            onClick={() => handleToggleTenantStatus(tenant)}
                            className={`px-3 py-1.5 rounded-lg font-semibold transition-colors inline-flex items-center gap-1 ${
                              tenant.status === "ACTIVE"
                                ? "bg-rose-50 text-rose-600 hover:bg-rose-100"
                                : tenant.status === "FAILED" || tenant.status === "PROVISIONING"
                                ? "bg-blue-600 text-white hover:bg-blue-700"
                                : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                            }`}
                          >
                            {tenant.status === "FAILED" || tenant.status === "PROVISIONING"
                              ? "Cấp phát lại"
                              : tenant.status === "ACTIVE"
                              ? "Tạm khóa"
                              : "Mở khóa"}
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-slate-500">
                        Không tìm thấy doanh nghiệp nào phù hợp với từ khóa "{tenantSearch}".
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: SAAS SUBSCRIPTION & BILLING */}
        {activeTab === "subscriptions" && (
          <BillingWorkspace
            plans={plans}
            tenants={tenants}
            view={billingView}
            onViewChange={setBillingView}
            monthlyRevenue={revenue?.mrr ?? 48500}
            activeTenants={revenue?.activeTenants ?? tenants.filter((tenant) => tenant.status === "ACTIVE").length}
            onCreatePlan={() => {
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
            onEditPlan={(plan) => {
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
            onTogglePlanStatus={handleTogglePlanStatus}
          />
        )}

        {/* TAB 4: SYSTEM AUDIT LOGS */}
        {activeTab === "logs" && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <div className="mb-2 flex items-center gap-2"><span className="text-sm font-semibold text-blue-700">Hệ thống / Audit</span><span className="rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-blue-700">Master scope</span></div>
                <h1 className="text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl">Nhật ký hệ thống</h1>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">Theo dõi hành vi quản trị, quá trình cấp phát database và các sự kiện an toàn thông tin trên toàn nền tảng.</p>
              </div>
              <button type="button" onClick={() => { const escapeCsv = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`; const rows = filteredLogs.map((log) => [log.id, log.timestamp, log.level, log.tenantCode, log.action, log.ipAddress, log.description].map(escapeCsv).join(",")); const csv = ["ID,Timestamp,Level,Tenant,Action,IP Address,Description", ...rows].join("\n"); const link = document.createElement("a"); link.href = `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`; link.download = `system-audit-logs-${new Date().toISOString().slice(0, 10)}.csv`; document.body.appendChild(link); link.click(); document.body.removeChild(link); }} disabled={filteredLogs.length === 0} className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"><Download className="size-4" aria-hidden="true" />Xuất CSV ({filteredLogs.length})</button>
            </div>

            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-label="Tổng quan nhật ký hệ thống">
              {[
                { label: "Tổng sự kiện", value: logs.length, detail: "Trong phạm vi dữ liệu hiện tại", icon: Activity, tone: "bg-blue-50 text-blue-700" },
                { label: "Cảnh báo", value: logs.filter((log) => log.level === "WARN").length, detail: "Cần theo dõi hoặc xác minh", icon: AlertTriangle, tone: "bg-amber-50 text-amber-700" },
                { label: "Lỗi hệ thống", value: logs.filter((log) => log.level === "ERROR").length, detail: "Sự kiện cần ưu tiên xử lý", icon: XCircle, tone: "bg-rose-50 text-rose-700" },
                { label: "Tenant phát sinh log", value: logTenantOptions.length, detail: "Không truy cập dữ liệu tenant", icon: Building2, tone: "bg-violet-50 text-violet-700" },
              ].map(({ label, value, detail, icon: Icon, tone }) => <article key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_4px_14px_-8px_rgba(15,23,42,0.18)]"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold text-slate-950">{value}</p></div><span className={`grid size-10 place-items-center rounded-xl ${tone}`}><Icon className="size-5" aria-hidden="true" /></span></div><p className="mt-3 text-xs text-slate-500">{detail}</p></article>)}
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs" aria-label="Bộ lọc nhật ký">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-[minmax(16rem,1.4fr)_repeat(3,minmax(9rem,0.7fr))_auto]">
                <label className="relative"><span className="sr-only">Tìm kiếm nhật ký</span><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" /><input value={logSearch} onChange={(event) => setLogSearch(event.target.value)} placeholder="Tìm mã log, hành động, IP..." className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm outline-none transition-colors focus:border-blue-400 focus:bg-white focus:ring-2 focus:ring-blue-100" /></label>
                <select value={logLevelFilter} onChange={(event) => setLogLevelFilter(event.target.value)} aria-label="Lọc theo mức độ" className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"><option value="ALL">Tất cả mức độ</option><option value="INFO">Thông tin (INFO)</option><option value="WARN">Cảnh báo (WARN)</option><option value="ERROR">Lỗi (ERROR)</option></select>
                <select value={logTenantFilter} onChange={(event) => setLogTenantFilter(event.target.value)} aria-label="Lọc theo tenant" className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"><option value="ALL">Tất cả tenant</option>{logTenantOptions.map((code) => <option key={code} value={code}>{code}</option>)}</select>
                <select value={logTimeRange} onChange={(event) => setLogTimeRange(event.target.value)} aria-label="Lọc theo thời gian" className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"><option value="ALL">Toàn bộ thời gian</option><option value="24H">24 giờ gần nhất</option><option value="7D">7 ngày gần nhất</option><option value="30D">30 ngày gần nhất</option></select>
                <button type="button" onClick={() => { setLogSearch(""); setLogLevelFilter("ALL"); setLogTenantFilter("ALL"); setLogTimeRange("ALL"); }} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50">Xóa lọc</button>
              </div>
              <p className="mt-3 text-xs text-slate-500">Hiển thị {filteredLogs.length} trên {logs.length} sự kiện</p>
            </section>

            <TrafficIngressInspector tenants={tenants} />

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto"><table className="w-full min-w-[980px] text-left text-xs text-slate-600">
                <thead className="bg-slate-50 text-slate-800 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="p-4">Mã Log</th>
                    <th className="p-4">Doanh Nghiệp</th>
                    <th className="p-4">Hành Động</th>
                    <th className="p-4">Chi Tiết Sự Kiện</th>
                    <th className="p-4">Mức Độ</th>
                    <th className="p-4">Thời Gian</th>
                    <th className="p-4 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-slate-50/80 transition-colors font-mono">
                      <td className="p-4 text-slate-400">#{log.id}</td>
                      <td className="p-4 font-bold text-blue-600">{log.tenantCode}</td>
                      <td className="p-4 font-semibold text-slate-800">{log.action}</td>
                      <td className="p-4 font-sans text-xs max-w-sm truncate text-slate-700">
                        {log.description}
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            log.level === "INFO"
                              ? "bg-blue-50 text-blue-700 border border-blue-200"
                              : log.level === "WARN"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {log.level}
                        </span>
                      </td>
                      <td className="p-4 text-slate-500 text-[11px]">
                        {new Date(log.timestamp).toLocaleString("vi-VN")}
                      </td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold transition-colors"
                        >
                          Xem chi tiết
                        </button>
                      </td>
                    </tr>
                  ))}
                  {paginatedLogs.length === 0 && <tr><td colSpan={7} className="px-6 py-14 text-center"><FileText className="mx-auto size-8 text-slate-300" /><p className="mt-3 font-semibold text-slate-700">Không tìm thấy sự kiện phù hợp</p><p className="mt-1 text-slate-500">Thử thay đổi từ khóa hoặc xóa bộ lọc.</p></td></tr>}
                </tbody>
              </table></div>
              <div className="flex flex-col gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-slate-500">Trang {Math.min(logPage, logPageCount)} / {logPageCount}</p><div className="flex gap-2"><button type="button" disabled={logPage === 1} onClick={() => setLogPage((page) => Math.max(1, page - 1))} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"><ChevronLeft className="size-4" />Trước</button><button type="button" disabled={logPage >= logPageCount} onClick={() => setLogPage((page) => Math.min(logPageCount, page + 1))} className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-slate-200 px-3 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40">Sau<ChevronRight className="size-4" /></button></div></div>
            </div>
          </div>
        )}

        {(activeTab === "ai-usage" || activeTab === "ai-quotas") && (
          <SystemManagementWorkspace view={activeTab} tenants={tenants} />
        )}

        {activeTab.startsWith("account-") && (
          <div className="mx-auto max-w-5xl animate-fade-in">
            <div className="mb-7 rounded-3xl border border-slate-200 bg-gradient-to-br from-cyan-50 via-white to-violet-50 px-6 py-8 sm:px-10">
              <p className="text-sm font-semibold text-blue-700">Workspace Admin</p>
              <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">Quản lý tài khoản</h1>
              <p className="mt-2 text-sm text-slate-600">Quản lý hồ sơ, bảo mật và các tùy chọn cá nhân của bạn.</p>
            </div>

            {activeTab === "account-profile" && (
              <section aria-labelledby="account-profile-title">
                <h2 id="account-profile-title" className="mb-5 text-2xl font-bold text-slate-950">Hồ sơ của bạn</h2>
                <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
                  <div className="flex items-center gap-5 border-b border-slate-200 p-6">
                    <span className="flex size-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 text-2xl font-bold text-white">W</span>
                    <div><p className="text-lg font-semibold text-slate-950">Workspace Admin</p><p className="mt-1 text-sm text-slate-500">Quản trị viên nền tảng SmartHire.AI</p></div>
                  </div>
                  {[["Vai trò", "WORKSPACE_ADMIN"], ["Phạm vi", "Master Platform"], ["Trạng thái", "Đang hoạt động"]].map(([label, value]) => (
                    <div key={label} className="grid gap-1 border-b border-slate-200 px-6 py-5 last:border-b-0 sm:grid-cols-[12rem_1fr]"><span className="text-sm font-semibold">{label}</span><span className="text-sm text-slate-600">{value}</span></div>
                  ))}
                </div>
              </section>
            )}

            {activeTab === "account-security" && (
              <section aria-labelledby="account-security-title">
                <h2 id="account-security-title" className="mb-5 text-2xl font-bold text-slate-950">Tài khoản và bảo mật</h2>
                <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="rounded-2xl bg-emerald-50 p-5"><p className="font-semibold text-emerald-900">Phiên đăng nhập đang hoạt động</p><p className="mt-1 text-sm text-emerald-700">Tài khoản đã được xác thực bằng Master Auth.</p></div>
                  <button type="button" onClick={() => { localStorage.removeItem("master_access_token"); navigate("/admin/login"); }} className="flex min-h-12 items-center gap-3 rounded-xl border border-rose-200 px-4 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-50"><LogOut className="size-5" />Đăng xuất khỏi thiết bị này</button>
                </div>
              </section>
            )}

            {activeTab === "account-accessibility" && (
              <section aria-labelledby="account-accessibility-title">
                <h2 id="account-accessibility-title" className="mb-5 text-2xl font-bold text-slate-950">Khả năng tiếp cận</h2>
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <label className="flex cursor-pointer items-center justify-between gap-6 rounded-2xl p-4 hover:bg-slate-50"><span><span className="block font-semibold">Giảm hiệu ứng chuyển động</span><span className="mt-1 block text-sm text-slate-500">Hạn chế hoạt ảnh không cần thiết trong giao diện.</span></span><input type="checkbox" checked={reducedMotion} onChange={(event) => { setReducedMotion(event.target.checked); localStorage.setItem("master_reduced_motion", String(event.target.checked)); }} className="size-5 accent-blue-600" /></label>
                </div>
              </section>
            )}

            {activeTab === "account-notifications" && (
              <section aria-labelledby="account-notifications-title">
                <h2 id="account-notifications-title" className="mb-5 text-2xl font-bold text-slate-950">Tùy chọn thông báo</h2>
                <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                  <label className="flex cursor-pointer items-center justify-between gap-6 rounded-2xl p-4 hover:bg-slate-50"><span><span className="block font-semibold">Thông báo qua email</span><span className="mt-1 block text-sm text-slate-500">Nhận thông báo quản trị và trạng thái tenant qua email.</span></span><input type="checkbox" checked={emailNotifications} onChange={(event) => { setEmailNotifications(event.target.checked); localStorage.setItem("master_email_notifications", String(event.target.checked)); }} className="size-5 accent-blue-600" /></label>
                </div>
              </section>
            )}
          </div>
        )}
        </main>
      </div>

      {/* MODAL 1: VIEW TENANT DETAILS */}
      {selectedTenant && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative animate-fade-in">
            <button
              onClick={() => setSelectedTenant(null)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold border border-blue-200">
                <Building2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Chi Tiết Khách Hàng Doanh Nghiệp</h3>
                <span className="text-xs text-slate-500 font-mono">Tenant ID #{selectedTenant.id}</span>
              </div>
            </div>

            <div className="space-y-3 text-xs font-mono bg-slate-50 p-5 rounded-xl border border-slate-200">
              <div className="flex justify-between pb-2 border-b border-slate-200/80">
                <span className="text-slate-500 font-sans">Tên Doanh Nghiệp:</span>
                <span className="font-bold text-slate-900 text-right font-sans">{selectedTenant.name}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-slate-200/80">
                <span className="text-slate-500 font-sans">Mã Định Danh (Code):</span>
                <span className="font-bold text-blue-600">{selectedTenant.code}</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-slate-200/80">
                <span className="text-slate-500 font-sans">Cổng Đăng Nhập (Subdomain):</span>
                <span className="text-slate-700">{selectedTenant.subdomain}.smarthire.top</span>
              </div>
              <div className="flex justify-between pb-2 border-b border-slate-200/80">
                <span className="text-slate-500 font-sans">Database Riêng Biệt:</span>
                <span className="text-emerald-700 font-bold">{selectedTenant.dbName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Trạng Thái Hoạt Động:</span>
                <span className="font-bold text-slate-900">{selectedTenant.status}</span>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setSelectedTenant(null)}
                className="px-4 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700"
              >
                Đóng cửa sổ
              </button>
              <button
                onClick={() => {
                  const t = selectedTenant;
                  setSelectedTenant(null);
                  handleToggleTenantStatus(t);
                }}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm"
              >
                Đổi trạng thái vận hành
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: CREATE / EDIT SUBSCRIPTION PLAN */}
      {showPlanModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative animate-fade-in">
            <button
              onClick={() => setShowPlanModal(null)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold border border-blue-200">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  {isNewPlan ? "Tạo Gói SaaS Mới" : "Cập Nhật Gói SaaS"}
                </h3>
                <p className="text-xs text-slate-500">Cấu hình giá cước và hạn ngạch tài nguyên.</p>
              </div>
            </div>

            <form onSubmit={handleSavePlanSubmit} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mã Gói (Code)</label>
                <input
                  type="text"
                  required
                  disabled={!isNewPlan}
                  placeholder="VD: ENTERPRISE_PLUS"
                  value={planCode}
                  onChange={(e) => setPlanCode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono disabled:opacity-60"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Tên Hiển Thị Gói</label>
                <input
                  type="text"
                  required
                  placeholder="Gói Doanh Nghiệp Tùy Biến"
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mô Tả Gói</label>
                <input
                  type="text"
                  placeholder="Tối ưu cho doanh nghiệp trên 500 nhân sự"
                  value={planDesc}
                  onChange={(e) => setPlanDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Giá Tháng ($)</label>
                  <input
                    type="number"
                    value={priceMonthly}
                    onChange={(e) => setPriceMonthly(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Giá Năm ($)</label>
                  <input
                    type="number"
                    value={priceYearly}
                    onChange={(e) => setPriceYearly(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Max Jobs</label>
                  <input
                    type="number"
                    value={maxJobs}
                    onChange={(e) => setMaxJobs(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Max CVs</label>
                  <input
                    type="number"
                    value={maxCvParses}
                    onChange={(e) => setMaxCvParses(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Max Voice (hrs)</label>
                  <input
                    type="number"
                    value={maxAiHours}
                    onChange={(e) => setMaxAiHours(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowPlanModal(null)}
                  className="flex-1 py-2.5 rounded-lg border border-slate-200 text-slate-700 font-semibold"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-sm"
                >
                  Lưu Gói SaaS
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: VIEW LOG DETAIL */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative font-mono text-xs animate-fade-in">
            <button
              onClick={() => setSelectedLog(null)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-4 font-sans">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold border border-blue-200">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Chi Tiết Nhật Ký Kiểm Toán</h3>
                <span className="text-xs text-slate-500">Log Entry #{selectedLog.id}</span>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl space-y-2.5 border border-slate-200">
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Tenant Code:</span>
                <span className="text-blue-600 font-bold">{selectedLog.tenantCode}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Hành động:</span>
                <span className="font-semibold text-slate-900">{selectedLog.action}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Mức độ cảnh báo:</span>
                <span
                  className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                    selectedLog.level === "INFO"
                      ? "bg-blue-50 text-blue-700"
                      : selectedLog.level === "WARN"
                      ? "bg-amber-50 text-amber-700"
                      : "bg-rose-50 text-rose-700"
                  }`}
                >
                  {selectedLog.level}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Địa chỉ IP:</span>
                <span className="text-slate-700">{selectedLog.ipAddress}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 font-sans">Thời điểm:</span>
                <span className="text-slate-700">{new Date(selectedLog.timestamp).toLocaleString("vi-VN")}</span>
              </div>
              <div className="pt-2 border-t border-slate-200/80 font-sans">
                <strong className="block text-slate-800 mb-1">Mô tả sự kiện:</strong>
                <p className="text-slate-600 leading-relaxed bg-white p-2.5 rounded-lg border border-slate-200 text-xs">
                  {selectedLog.description}
                </p>
              </div>
            </div>

            <div className="mt-5 text-right">
              <button
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs font-sans"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: LEAD DETAIL & EDIT NOTES */}
      {selectedLead && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 max-w-lg w-full shadow-2xl relative animate-fade-in max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setSelectedLead(null)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold border border-blue-200">
                <PhoneCall className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">{selectedLead.companyName}</h3>
                <span className="text-xs text-slate-500">
                  {selectedLead.requestType === "CONTRACT_QUOTE"
                    ? "Yêu cầu Báo giá & Hợp đồng"
                    : "Đăng ký Trải nghiệm Demo"} · Lead #{selectedLead.id}
                </span>
              </div>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl space-y-2.5 border border-slate-200 text-xs mb-5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-500 block text-[11px]">Người liên hệ:</span>
                  <span className="font-semibold text-slate-800">{selectedLead.contactName}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Chức vụ:</span>
                  <span className="text-slate-700">{selectedLead.jobTitle || "—"}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-500 block text-[11px]">Email doanh nghiệp:</span>
                  <a href={`mailto:${selectedLead.workEmail}`} className="text-blue-600 font-mono hover:underline">
                    {selectedLead.workEmail}
                  </a>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Số điện thoại:</span>
                  <a href={`tel:${selectedLead.phoneNumber}`} className="text-slate-800 font-mono hover:underline">
                    {selectedLead.phoneNumber || "—"}
                  </a>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-200/60">
                <div>
                  <span className="text-slate-500 block text-[11px]">Quy mô nhân sự:</span>
                  <span className="text-slate-700">{selectedLead.companySize || "—"}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[11px]">Gói quan tâm:</span>
                  <span className="font-semibold text-blue-700">{selectedLead.planTier || "—"}</span>
                </div>
              </div>

              {selectedLead.primaryNeed && (
                <div className="pt-1 border-t border-slate-200/60">
                  <span className="text-slate-500 block text-[11px]">Nhu cầu chính:</span>
                  <span className="text-slate-700">{selectedLead.primaryNeed}</span>
                </div>
              )}

              <div className="pt-1 border-t border-slate-200/60 flex justify-between text-[11px] text-slate-500">
                <span>Thời gian đăng ký:</span>
                <span>{new Date(selectedLead.createdAt).toLocaleString("vi-VN")}</span>
              </div>
            </div>

            <form onSubmit={handleSaveLeadModal} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Trạng thái xử lý *</label>
                <select
                  value={leadStatusEdit}
                  onChange={(e) => setLeadStatusEdit(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 font-semibold focus:outline-none focus:border-blue-600"
                >
                  <option value="PENDING">Chờ xử lý / Chưa liên hệ</option>
                  <option value="CONTACTED">Đang liên hệ & Trao đổi Demo</option>
                  <option value="PROVISIONED">Đã cấp phát Workspace (Hoàn tất)</option>
                  <option value="REJECTED">Từ chối / Hủy yêu cầu</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Ghi chú chăm sóc / Nhu cầu chi tiết</label>
                <textarea
                  rows={3}
                  value={leadNotesEdit}
                  onChange={(e) => setLeadNotesEdit(e.target.value)}
                  placeholder="Nhập ghi chú sau khi gọi điện/trao đổi với khách hàng..."
                  className="w-full px-3.5 py-2 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 resize-none"
                />
              </div>

              <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
                {selectedLead.status !== "PROVISIONED" && (
                  <button
                    type="button"
                    onClick={() => {
                      const l = selectedLead;
                      setSelectedLead(null);
                      handleProvisionFromLead(l);
                    }}
                    className="py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Cấp Workspace Ngay</span>
                  </button>
                )}

                <div className="flex-1 flex gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => setSelectedLead(null)}
                    className="px-4 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold"
                  >
                    Đóng
                  </button>
                  <button
                    type="submit"
                    disabled={updatingLead}
                    className="px-5 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {updatingLead ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                    <span>Lưu Thay Đổi</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: CHANGE PASSWORD */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 sm:p-8 max-w-md w-full shadow-2xl relative animate-fade-in">
            <button
              onClick={() => setShowPasswordModal(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold border border-blue-200">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Đổi Mật Khẩu Quản Trị</h3>
                <span className="text-xs text-slate-500">Cập nhật mật khẩu bảo vệ Master Admin</span>
              </div>
            </div>

            {passwordError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-600 text-xs flex items-start gap-2">
                <XCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{passwordError}</span>
              </div>
            )}

            <form onSubmit={handleChangePasswordSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mật khẩu hiện tại *</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Mật khẩu mới (Tối thiểu 12 ký tự) *</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Xác nhận mật khẩu mới *</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-slate-300 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600"
                />
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="w-1/2 py-2.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 font-semibold"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="w-1/2 py-2.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-semibold disabled:opacity-50"
                >
                  {passwordLoading ? "Đang cập nhật..." : "Lưu mật khẩu"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className="border-t border-slate-200 py-5 text-center text-xs text-slate-500 bg-white">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>SmartHire-AI Platform © 2026 · Cổng Quản Trị Trung Tâm (Master DB Controller)</span>
          <span className="text-slate-400">PostgreSQL Master Registry · Separate Database Architecture</span>
        </div>
      </footer>
    </div>
  );
}
