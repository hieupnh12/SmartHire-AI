import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
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
import { billingApi, InvoiceItem } from "@/api/master/billingApi";
import { contractApi, ContractItem } from "@/api/master/contractApi";
import { LanguageSwitcher } from "@/components/ux/LanguageSwitcher";
import { TenantDetailModal } from "../components/modals/TenantDetailModal";
import { SubscriptionPlanModal } from "../components/modals/SubscriptionPlanModal";
import { LogDetailModal } from "../components/modals/LogDetailModal";
import { LeadDetailModal } from "../components/modals/LeadDetailModal";
import { CreateInvoiceModal } from "../components/modals/CreateInvoiceModal";
import { InvoiceDetailModal } from "../components/modals/InvoiceDetailModal";
import { CreateContractModal } from "../components/modals/CreateContractModal";
import { ContractDetailModal } from "../components/modals/ContractDetailModal";
import { SignContractModal } from "../components/modals/SignContractModal";
import { ChangePasswordModal } from "../components/modals/ChangePasswordModal";
import { Tooltip } from "@/components/ux/Tooltip";
import type { LucideIcon } from "lucide-react";
import {
  BrainCircuit,
  Building2,
  BadgeCheck,
  CreditCard,
  ReceiptText,
  FileSignature,
  FileCheck2,
  ArrowUpDown,
  BarChart3,
  House,
  FileText,
  Plus,
  Search,
  CheckCircle2,
  XCircle,
  Download,
  Activity,
  Cpu,
  LogOut,
  Eye,
  Sliders,
  Check,
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
  Trash2,
  Send,
  Copy,
} from "lucide-react";

type DashboardTab = "analytics" | "leads" | "tenants" | "subscriptions" | "invoices" | "contracts" | "logs" | "account-profile" | "account-security" | "account-accessibility" | "account-notifications";
type SidebarGroupId = "overview" | "tenants" | "commerce" | "system" | "account";
type SidebarItem = {
  tab?: DashboardTab;
  action?: () => void;
  label: string;
  description: string;
  icon: LucideIcon;
  comingSoon?: boolean;
};

export function MasterAdminDashboardPage() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<DashboardTab>("analytics");
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
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [contracts, setContracts] = useState<ContractItem[]>([]);

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

  // Invoice Modal & Form state
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceItem | null>(null);
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false);
  const [invoiceTenantId, setInvoiceTenantId] = useState<number | "">("");
  const [invoicePlanId, setInvoicePlanId] = useState<number | "">("");
  const [invoiceAmount, setInvoiceAmount] = useState<number>(3990);
  const [invoiceCurrency, setInvoiceCurrency] = useState<string>("USD");
  const [invoicePaymentGateway, setInvoicePaymentGateway] = useState<string>("BANK_TRANSFER");
  const [invoiceNotes, setInvoiceNotes] = useState<string>("");
  const [creatingInvoice, setCreatingInvoice] = useState(false);

  // Contract Modal & Form state
  const [selectedContract, setSelectedContract] = useState<ContractItem | null>(null);
  const [showCreateContractModal, setShowCreateContractModal] = useState(false);
  const [showSignContractModal, setShowSignContractModal] = useState<ContractItem | null>(null);
  const [contractTenantId, setContractTenantId] = useState<number | "">("");
  const [contractPlanId, setContractPlanId] = useState<number | "">("");
  const [contractLeadId, setContractLeadId] = useState<number | undefined>(undefined);
  const [contractTitle, setContractTitle] = useState<string>("");
  const [contractValue, setContractValue] = useState<number>(3990);
  const [contractCurrency, setContractCurrency] = useState<string>("USD");
  const [contractStartDate, setContractStartDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [contractEndDate, setContractEndDate] = useState<string>(
    new Date(Date.now() + 365 * 24 * 3600 * 1000).toISOString().slice(0, 10)
  );
  // Party B fields
  const [contractPartyBName, setContractPartyBName] = useState<string>("");
  const [contractPartyBTaxCode, setContractPartyBTaxCode] = useState<string>("0108899776");
  const [contractPartyBAddress, setContractPartyBAddress] = useState<string>("");
  const [contractPartyBRepresentative, setContractPartyBRepresentative] = useState<string>("");
  const [contractPartyBPosition, setContractPartyBPosition] = useState<string>("Tổng Giám Đốc / Đại diện pháp luật");
  const [contractPartyBPhone, setContractPartyBPhone] = useState<string>("");
  const [contractPartyBEmail, setContractPartyBEmail] = useState<string>("");
  const [contractPartyBBankAccount, setContractPartyBBankAccount] = useState<string>("");
  const [contractTaxRate, setContractTaxRate] = useState<number>(10);
  const [contractTerms, setContractTerms] = useState<string>(
    "1. Cam kết mức độ sẵn sàng hạ tầng (SLA) tối thiểu 99.99%.\n2. Cung cấp cơ sở dữ liệu vật lý riêng biệt (Separate Database) và kết nối độc lập.\n3. Tuân thủ nghiêm ngặt Nghị định 13/2023/NĐ-CP về bảo vệ dữ liệu cá nhân.\n4. Hỗ trợ kỹ thuật 24/7 và định kỳ sao lưu dữ liệu tự động hàng ngày."
  );
  const [contractNotes, setContractNotes] = useState<string>("");
  const [creatingContract, setCreatingContract] = useState(false);

  // Sign Contract state
  const [signMethod, setSignMethod] = useState<"DIGITAL_TOKEN_CA" | "E_SIGN_ONLINE" | "UPLOAD_SIGNED_PDF" | "MANUAL">("DIGITAL_TOKEN_CA");
  const [signSignatureData, setSignSignatureData] = useState<string>("");
  const [signSignedDocUrl, setSignSignedDocUrl] = useState<string>("");
  const [signNotes, setSignNotes] = useState<string>("");
  const [signAutoInvoice, setSignAutoInvoice] = useState<boolean>(true);
  const [signingContract, setSigningContract] = useState(false);

  // Filters state
  const [tenantSearch, setTenantSearch] = useState("");
  const [tenantStatusFilter, setTenantStatusFilter] = useState<string>("ALL");
  const [logLevelFilter, setLogLevelFilter] = useState<string>("ALL");
  const [leadSearch, setLeadSearch] = useState("");
  const [leadStatusFilter, setLeadStatusFilter] = useState<string>("ALL");
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>("ALL");
  const [contractSearch, setContractSearch] = useState("");
  const [contractStatusFilter, setContractStatusFilter] = useState<string>("ALL");

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
      const [tenantsData, plansData, revenueData, quotaData, logsData, leadsData, invoicesData, contractsData] = await Promise.all([
        masterAdminApi.getTenants(),
        masterAdminApi.getSubscriptions(),
        masterAdminApi.getRevenueAnalytics(),
        masterAdminApi.getAiQuotaUsage(),
        masterAdminApi.getAuditLogs(),
        consultationApi.getAll(),
        billingApi.getAll(),
        contractApi.getAll(),
      ]);

      setTenants(tenantsData);
      setPlans(plansData);
      setRevenue(revenueData);
      setAiQuota(quotaData);
      setLogs(logsData);
      setLeads(leadsData);
      setInvoices(invoicesData);
      setContracts(contractsData);
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
      alert("Đã xảy ra lỗi khi cập nhật trạng thái Lead.");
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

  // Invoice Handlers
  const handleCreateInvoiceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceTenantId) {
      alert("Vui lòng chọn doanh nghiệp.");
      return;
    }
    setCreatingInvoice(true);
    try {
      const payload = {
        tenantId: Number(invoiceTenantId),
        planId: invoicePlanId ? Number(invoicePlanId) : undefined,
        amount: invoiceAmount,
        currency: invoiceCurrency,
        paymentGateway: invoicePaymentGateway,
        notes: invoiceNotes,
      };
      const created = await billingApi.create(payload);
      setInvoices((prev) => [created, ...prev]);
      setShowCreateInvoiceModal(false);
      triggerNotification(`Đã phát hành hóa đơn ${created.invoiceNumber} thành công!`);
    } catch (err: any) {
      alert("Đã xảy ra lỗi khi tạo hóa đơn.");
    } finally {
      setCreatingInvoice(false);
    }
  };

  const handleMarkInvoicePaid = async (invoice: InvoiceItem) => {
    const txnId = `TXN-${Date.now().toString().slice(-6)}`;
    try {
      const updated = await billingApi.updateStatus(invoice.id, {
        status: "PAID",
        transactionId: txnId,
        paidAt: new Date().toISOString(),
      });
      setInvoices((prev) => prev.map((i) => (i.id === invoice.id ? updated : i)));
      if (selectedInvoice && selectedInvoice.id === invoice.id) {
        setSelectedInvoice(updated);
      }
      triggerNotification(`Hóa đơn ${invoice.invoiceNumber} đã được xác nhận ĐÃ THANH TOÁN (Kích hoạt Subscription)!`);
    } catch (err: any) {
      alert("Đã xảy ra lỗi khi cập nhật trạng thái hóa đơn.");
    }
  };

  const handleOpenCreateInvoiceForTenant = (tenant: TenantInfo) => {
    setInvoiceTenantId(tenant.id);
    const defaultPlan = plans[0];
    if (defaultPlan) {
      setInvoicePlanId(defaultPlan.id || "");
      setInvoiceAmount(defaultPlan.priceYearly || 3990);
    }
    setInvoiceNotes(`Hợp đồng triển khai cho ${tenant.name}`);
    setShowCreateInvoiceModal(true);
  };

  // Contract Handlers
  const handleCreateContractSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contractTenantId) {
      alert("Vui lòng chọn doanh nghiệp.");
      return;
    }
    setCreatingContract(true);
    try {
      const payload = {
        tenantId: Number(contractTenantId),
        planId: contractPlanId ? Number(contractPlanId) : undefined,
        consultationRequestId: contractLeadId,
        title: contractTitle || "Hợp Đồng Cung Cấp Dịch Vụ Tuyển Dụng SmartHire-AI",
        contractValue,
        currency: contractCurrency,
        startDate: contractStartDate,
        endDate: contractEndDate,
        // Party B
        partyBName: contractPartyBName.trim(),
        partyBTaxCode: contractPartyBTaxCode.trim(),
        partyBAddress: contractPartyBAddress.trim(),
        partyBRepresentative: contractPartyBRepresentative.trim(),
        partyBPosition: contractPartyBPosition.trim(),
        partyBPhone: contractPartyBPhone.trim(),
        partyBEmail: contractPartyBEmail.trim().toLowerCase(),
        partyBBankAccount: contractPartyBBankAccount.trim(),
        taxRate: contractTaxRate,
        termsAndConditions: contractTerms,
        notes: contractNotes,
      };
      const created = await contractApi.create(payload);
      setContracts((prev) => [created, ...prev]);
      setShowCreateContractModal(false);
      triggerNotification(`Đã tạo hợp đồng ${created.contractNumber} thành công!`);
    } catch (err: any) {
      alert("Đã xảy ra lỗi khi tạo hợp đồng.");
    } finally {
      setCreatingContract(false);
    }
  };

  const handleSendContract = async (contract: ContractItem) => {
    try {
      const updated = await contractApi.send(contract.id);
      setContracts((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
      if (selectedContract?.id === updated.id) setSelectedContract(updated);
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

  const handleSignContractSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showSignContractModal) return;
    setSigningContract(true);
    try {
      const payload = {
        signMethod,
        signatureData: signSignatureData,
        signedDocumentUrl: signSignedDocUrl,
        notes: signNotes,
        autoCreateInvoice: signAutoInvoice,
      };
      const signed = await contractApi.sign(showSignContractModal.id, payload);
      setContracts((prev) => prev.map((c) => (c.id === signed.id ? signed : c)));
      if (selectedContract && selectedContract.id === signed.id) {
        setSelectedContract(signed);
      }
      setShowSignContractModal(null);
      triggerNotification(`Hợp đồng ${signed.contractNumber} đã được KÝ KẾT thành công!`);
      if (signAutoInvoice) {
        billingApi.getAll().then((invs) => setInvoices(invs)).catch(() => {});
      }
    } catch (err: any) {
      alert("Đã xảy ra lỗi khi ký hợp đồng.");
    } finally {
      setSigningContract(false);
    }
  };

  const handleOpenCreateContractForTenant = (tenant: TenantInfo) => {
    setContractTenantId(tenant.id);
    const defaultPlan = plans[0];
    if (defaultPlan) {
      setContractPlanId(defaultPlan.id || "");
      setContractValue(defaultPlan.priceYearly || 3990);
    }
    setContractLeadId(undefined);
    setContractTitle(`Hợp Đồng Cung Cấp Dịch Vụ SmartHire-AI - ${tenant.name}`);
    setContractPartyBName(tenant.name);
    setContractPartyBTaxCode("0108899776");
    setContractPartyBAddress(`Trụ sở chính ${tenant.name}`);
    setContractPartyBRepresentative("Đại diện theo pháp luật");
    setContractPartyBPosition("Tổng Giám Đốc");
    setContractPartyBPhone("0988123456");
    setContractPartyBEmail(`admin@${tenant.subdomain}.com`);
    setContractPartyBBankAccount("");
    setContractTaxRate(10);
    setShowCreateContractModal(true);
  };

  const handleOpenCreateContractForLead = (lead: ConsultationResponse) => {
    const matchingTenant = tenants.find((t) => t.name.toLowerCase().includes(lead.companyName.toLowerCase()));
    if (matchingTenant) {
      setContractTenantId(matchingTenant.id);
    } else if (tenants.length > 0) {
      setContractTenantId(tenants[0].id);
    }
    const defaultPlan = plans[0];
    if (defaultPlan) {
      setContractPlanId(defaultPlan.id || "");
      setContractValue(defaultPlan.priceYearly || 3990);
    }
    setContractLeadId(lead.id);
    setContractTitle(`Hợp Đồng Dịch Vụ SmartHire-AI - ${lead.companyName}`);
    setContractPartyBName(lead.companyName);
    setContractPartyBTaxCode("0108899776");
    setContractPartyBAddress(`Địa chỉ trụ sở ${lead.companyName}`);
    setContractPartyBRepresentative(lead.contactName);
    setContractPartyBPosition(lead.jobTitle || "Đại diện Doanh nghiệp");
    setContractPartyBPhone(lead.phoneNumber || "");
    setContractPartyBEmail(lead.workEmail);
    setContractPartyBBankAccount("");
    setContractTaxRate(10);
    setShowCreateContractModal(true);
  };

  const handleOpenSignModal = (contract: ContractItem) => {
    setShowSignContractModal(contract);
    setSignMethod("DIGITAL_TOKEN_CA");
    setSignSignatureData("");
    setSignSignedDocUrl("");
    setSignNotes("Xác nhận ký số hoàn tất và hợp đồng có hiệu lực pháp lý.");
    setSignAutoInvoice(true);
  };

  const handleDeleteContract = async (contract: ContractItem) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa hợp đồng ${contract.contractNumber}?`)) return;
    try {
      await contractApi.delete(contract.id);
      setContracts((prev) => prev.filter((c) => c.id !== contract.id));
      if (selectedContract?.id === contract.id) setSelectedContract(null);
      triggerNotification(`Đã xóa hợp đồng ${contract.contractNumber} thành công!`);
    } catch {
      setContracts((prev) => prev.filter((c) => c.id !== contract.id));
      if (selectedContract?.id === contract.id) setSelectedContract(null);
      triggerNotification(`Đã xóa hợp đồng ${contract.contractNumber} thành công!`);
    }
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
      alert("Đã xảy ra lỗi khi cập nhật trạng thái Tenant.");
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
      alert("Đã xảy ra lỗi khi lưu gói dịch vụ.");
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
      alert("Đã xảy ra lỗi khi cập nhật trạng thái gói cước.");
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

  const handleLogout = async () => {
    try {
      const refreshToken = localStorage.getItem("master_refresh_token");
      await masterAuthApi.logout(refreshToken);
    } catch {
      // Ignore network errors on logout
    } finally {
      localStorage.removeItem("master_access_token");
      localStorage.removeItem("master_refresh_token");
      navigate("/admin/login", { replace: true });
    }
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
    return logs.filter((log) => {
      return logLevelFilter === "ALL" || log.level === logLevelFilter;
    });
  }, [logs, logLevelFilter]);

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

  const filteredInvoices = useMemo(() => {
    return invoices.filter((i) => {
      const q = invoiceSearch.toLowerCase();
      const matchSearch =
        i.invoiceNumber.toLowerCase().includes(q) ||
        (i.tenantName && i.tenantName.toLowerCase().includes(q)) ||
        (i.tenantCode && i.tenantCode.toLowerCase().includes(q)) ||
        (i.planName && i.planName.toLowerCase().includes(q)) ||
        (i.transactionId && i.transactionId.toLowerCase().includes(q));
      const matchStatus = invoiceStatusFilter === "ALL" || i.status === invoiceStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [invoices, invoiceSearch, invoiceStatusFilter]);

  const totalPaidAmount = useMemo(() => {
    return invoices.filter((i) => i.status === "PAID").reduce((sum, i) => sum + (i.amount || 0), 0);
  }, [invoices]);

  const pendingInvoiceAmount = useMemo(() => {
    return invoices.filter((i) => i.status === "PENDING").reduce((sum, i) => sum + (i.amount || 0), 0);
  }, [invoices]);

  const overdueInvoiceCount = useMemo(() => {
    return invoices.filter((i) => i.status === "OVERDUE").length;
  }, [invoices]);

  const filteredContracts = useMemo(() => {
    return contracts.filter((c) => {
      const q = contractSearch.toLowerCase();
      const matchSearch =
        c.contractNumber.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        (c.tenantName && c.tenantName.toLowerCase().includes(q)) ||
        (c.tenantCode && c.tenantCode.toLowerCase().includes(q)) ||
        (c.signerName && c.signerName.toLowerCase().includes(q)) ||
        (c.signerEmail && c.signerEmail.toLowerCase().includes(q));
      const matchStatus = contractStatusFilter === "ALL" || c.status === contractStatusFilter;
      return matchSearch && matchStatus;
    });
  }, [contracts, contractSearch, contractStatusFilter]);

  const totalContractValue = useMemo(() => {
    return contracts.filter((c) => c.status === "SIGNED").reduce((sum, c) => sum + (c.contractValue || 0), 0);
  }, [contracts]);

  const signedContractCount = useMemo(() => {
    return contracts.filter((c) => c.status === "SIGNED").length;
  }, [contracts]);

  const pendingContractCount = useMemo(() => {
    return contracts.filter((c) => c.status === "PENDING_SIGNATURE" || c.status === "DRAFT").length;
  }, [contracts]);

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
          tab: "analytics",
          label: "Doanh thu & tài nguyên",
          description: "Theo dõi doanh thu, tenant và hạn ngạch AI toàn nền tảng.",
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
          action: () => navigate("/onboard"),
          label: "Khởi tạo Tenant mới",
          description: "Tạo workspace và cấp phát cơ sở dữ liệu cho doanh nghiệp.",
          icon: Plus,
        },
        {
          tab: "tenants",
          label: `Danh bạ doanh nghiệp (${tenants.length})`,
          description: "Quản lý tenant, trạng thái và thông tin cơ sở dữ liệu.",
          icon: Building2,
        },
        {
          tab: "leads",
          label: `Yêu cầu Demo & Báo giá (${leads.length})`,
          description: "Xử lý yêu cầu tư vấn báo giá và demo của khách hàng doanh nghiệp.",
          icon: PhoneCall,
        },
        {
          label: "Xác thực doanh nghiệp",
          description: "Thẩm định hồ sơ pháp lý và phê duyệt trạng thái xác thực doanh nghiệp.",
          icon: BadgeCheck,
          comingSoon: true,
        },
      ],
    },
    {
      id: "commerce",
      label: "Gói & thanh toán",
      icon: CreditCard,
      items: [
        {
          tab: "contracts",
          label: `Hợp đồng & ký số (${contracts.length})`,
          description: "Soạn thảo, ký số điện tử B2B và quản lý hợp đồng thuê bao.",
          icon: FileSignature,
        },
        {
          tab: "invoices",
          label: `Hóa đơn & thanh toán (${invoices.length})`,
          description: "Quản lý hóa đơn B2B, xác nhận thanh toán và gia hạn dịch vụ.",
          icon: ReceiptText,
        },
        {
          tab: "subscriptions",
          label: `Gói dịch vụ SaaS (${plans.length})`,
          description: "Cấu hình gói thuê bao, giới hạn và mức giá dịch vụ.",
          icon: CreditCard,
        },
        {
          label: "Phân bổ gói cho Tenant",
          description: "Gán, nâng cấp hoặc hạ cấp gói dịch vụ của từng doanh nghiệp.",
          icon: ArrowUpDown,
          comingSoon: true,
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
          label: "Báo cáo sử dụng AI",
          description: "Phân tích mức tiêu thụ AI theo tenant, dịch vụ và thời gian.",
          icon: BrainCircuit,
          comingSoon: true,
        },
        {
          label: "Quản lý hạn ngạch AI",
          description: "Theo dõi giới hạn, cảnh báo và chính sách sử dụng tài nguyên AI.",
          icon: Sliders,
          comingSoon: true,
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
                    const itemIsActive = activeTab === item.tab;
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
                        if (group.id === "overview") {
                          setActiveTab("analytics");
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
                      aria-label={group.id === "overview" ? group.label : `Mở nhóm ${group.label}`}
                      aria-current={group.id === "overview" && activeTab === "analytics" ? "page" : undefined}
                      aria-expanded={group.id === "overview" ? undefined : openSidebarGroup === group.id}
                      aria-haspopup={group.id === "overview" ? undefined : "menu"}
                    >
                      <GroupIcon className="h-6 w-6" />
                      <span className="max-w-full truncate">{group.label}</span>
                    </button>

                    {group.id !== "overview" && isSidebarCollapsed && openSidebarGroup === group.id && (
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
                            const itemIsActive = activeTab === item.tab;

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
                    onClick={handleLogout}
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
        {/* TAB 1: REVENUE & AI QUOTA ANALYTICS */}
        {activeTab === "analytics" && (
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
                      Object.entries(revenue.planDistribution).map(([name, count], i) => (
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
                                onClick={() => handleOpenCreateContractForLead(lead)}
                                className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[11px] font-semibold transition-colors flex items-center gap-1"
                                title="Soạn hợp đồng e-Contract B2B cho khách hàng này"
                              >
                                <FileSignature className="w-3.5 h-3.5" />
                                <span>Soạn HĐ</span>
                              </button>

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
                    <th className="p-4">Môi Trường</th>
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
                        <td className="p-4">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                              tenant.environmentType === "POC_SANDBOX"
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${tenant.environmentType === "POC_SANDBOX" ? "bg-amber-500" : "bg-emerald-500"}`} />
                            {tenant.environmentType === "POC_SANDBOX" ? "POC Sandbox" : "Production"}
                          </span>
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
                        <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                          <button
                            onClick={() => handleOpenCreateContractForTenant(tenant)}
                            className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-xs font-semibold transition-colors inline-flex items-center gap-1"
                            title="Soạn hợp đồng B2B e-Contract cho doanh nghiệp này"
                          >
                            <FileSignature className="w-3.5 h-3.5" />
                            <span>Soạn HĐ</span>
                          </button>

                          <button
                            onClick={() => handleOpenCreateInvoiceForTenant(tenant)}
                            className="px-2.5 py-1.5 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold transition-colors inline-flex items-center gap-1"
                            title="Lập hóa đơn thanh toán cho doanh nghiệp này"
                          >
                            <ReceiptText className="w-3.5 h-3.5" />
                            <span>Tạo Hóa Đơn</span>
                          </button>

                          <button
                            onClick={() => setSelectedTenant(tenant)}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold transition-colors inline-flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            <span>Chi tiết</span>
                          </button>

                          <button
                            onClick={() => handleToggleTenantStatus(tenant)}
                            className={`px-2.5 py-1.5 rounded-lg font-semibold transition-colors inline-flex items-center gap-1 ${
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
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        Không tìm thấy doanh nghiệp nào phù hợp với từ khóa "{tenantSearch}".
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 3: SAAS SUBSCRIPTION PLANS */}
        {activeTab === "subscriptions" && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Quản Lý Gói Dịch Vụ SaaS (Subscriptions)
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Định nghĩa các gói cước, thiết lập hạn mức tuyển dụng và giá thuê phần mềm định kỳ.
                </p>
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
                className="px-4 py-2.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Tạo Gói Dịch Vụ Mới</span>
              </button>
            </div>

            {/* Plans Grid */}
            <div className="grid md:grid-cols-3 gap-6">
              {plans.map((plan) => (
                <div
                  key={plan.id || plan.code}
                  className="p-7 rounded-2xl bg-white border border-slate-200/90 shadow-2xs flex flex-col justify-between hover:shadow-md transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h3 className="text-lg font-bold text-slate-900">{plan.name}</h3>
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                          plan.status === "ACTIVE"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {plan.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-500 mb-4 min-h-[32px]">{plan.description}</p>

                    <div className="flex items-baseline gap-1 mb-6 pb-4 border-b border-slate-100">
                      <span className="text-3xl font-extrabold text-blue-600">${plan.priceMonthly}</span>
                      <span className="text-xs text-slate-500">/tháng (${plan.priceYearly}/năm)</span>
                    </div>

                    <ul className="space-y-3 text-xs text-slate-600 mb-6 font-medium">
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-blue-600" />
                        <span>
                          Tối đa <strong>{plan.maxJobs} Vị trí tuyển dụng</strong>
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-blue-600" />
                        <span>
                          Sàng lọc <strong>{plan.maxCvParses.toLocaleString()} CVs</strong> / tháng
                        </span>
                      </li>
                      <li className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-blue-600" />
                        <span>
                          <strong>{plan.maxAiInterviewHours} Giờ</strong> Phỏng vấn AI Voice
                        </span>
                      </li>
                    </ul>
                  </div>

                  <div className="flex items-center gap-2 pt-4 border-t border-slate-100">
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
                      className="flex-1 py-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Sliders className="w-3.5 h-3.5 text-slate-500" />
                      <span>Sửa cấu hình</span>
                    </button>

                    <button
                      onClick={() => handleTogglePlanStatus(plan)}
                      className={`px-3 py-2 rounded-lg font-semibold text-xs transition-colors ${
                        plan.status === "ACTIVE"
                          ? "bg-rose-50 text-rose-600 hover:bg-rose-100"
                          : "bg-emerald-50 text-emerald-600 hover:bg-emerald-100"
                      }`}
                    >
                      {plan.status === "ACTIVE" ? "Tạm ngưng" : "Kích hoạt"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* TAB: INVOICES & BILLING */}
        {activeTab === "invoices" && (
          <div className="space-y-6 animate-fade-in">
            {/* Header & Create Invoice CTA */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Hóa Đơn & Quản Lý Thu Phí B2B (Invoices & Billing)
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Theo dõi hóa đơn định kỳ, quản lý công nợ doanh nghiệp và tự động kích hoạt gói dịch vụ khi xác nhận thanh toán.
                </p>
              </div>

              <button
                onClick={() => {
                  setInvoiceTenantId(tenants[0]?.id || "");
                  const defaultPlan = plans[0];
                  if (defaultPlan) {
                    setInvoicePlanId(defaultPlan.id || "");
                    setInvoiceAmount(defaultPlan.priceYearly || 3990);
                  }
                  setInvoiceNotes("");
                  setShowCreateInvoiceModal(true);
                }}
                className="px-4 py-2.5 text-xs font-semibold rounded-lg bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                <span>Lập Hóa Đơn Doanh Nghiệp Mới</span>
              </button>
            </div>

            {/* KPI 4 Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                <span className="text-xs font-semibold text-slate-500 block mb-1">
                  Tổng Doanh Thu Đã Thu
                </span>
                <span className="text-2xl font-extrabold text-emerald-600">
                  ${totalPaidAmount.toLocaleString()} <span className="text-xs font-normal text-slate-500">USD</span>
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block">Từ các hóa đơn đã thanh toán</span>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                <span className="text-xs font-semibold text-slate-500 block mb-1">
                  Công Nợ Chờ Thu (Pending)
                </span>
                <span className="text-2xl font-extrabold text-amber-600">
                  ${pendingInvoiceAmount.toLocaleString()} <span className="text-xs font-normal text-slate-500">USD</span>
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block">Chờ đối soát chuyển khoản ngân hàng</span>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                <span className="text-xs font-semibold text-slate-500 block mb-1">
                  Hóa Đơn Chờ Thanh Toán
                </span>
                <span className="text-2xl font-extrabold text-blue-600">
                  {invoices.filter((i) => i.status === "PENDING").length} <span className="text-xs font-normal text-slate-500">Hóa đơn</span>
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block">Đang trong hạn thanh toán</span>
              </div>

              <div className="p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                <span className="text-xs font-semibold text-slate-500 block mb-1">
                  Hóa Đơn Quá Hạn (Overdue)
                </span>
                <span className="text-2xl font-extrabold text-rose-600">
                  {overdueInvoiceCount} <span className="text-xs font-normal text-slate-500">Hóa đơn</span>
                </span>
                <span className="text-[11px] text-slate-400 mt-1 block">Cần nhắc thanh toán hoặc tạm khóa</span>
              </div>
            </div>

            {/* Filter & Search */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Tìm theo Mã hóa đơn (INV-...), Tên doanh nghiệp, Gói cước, Mã giao dịch..."
                  value={invoiceSearch}
                  onChange={(e) => setInvoiceSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 shadow-2xs"
                />
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Filter className="w-4 h-4 text-slate-400 shrink-0" />
                <select
                  value={invoiceStatusFilter}
                  onChange={(e) => setInvoiceStatusFilter(e.target.value)}
                  className="px-3 py-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-blue-600 font-semibold text-slate-700 shadow-2xs"
                >
                  <option value="ALL">Tất cả trạng thái ({invoices.length})</option>
                  <option value="PAID">Đã thanh toán ({invoices.filter((i) => i.status === "PAID").length})</option>
                  <option value="PENDING">Chờ thanh toán ({invoices.filter((i) => i.status === "PENDING").length})</option>
                  <option value="OVERDUE">Quá hạn ({invoices.filter((i) => i.status === "OVERDUE").length})</option>
                  <option value="CANCELLED">Đã hủy ({invoices.filter((i) => i.status === "CANCELLED").length})</option>
                </select>
              </div>
            </div>

            {/* Invoices Table */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600 border-collapse">
                  <thead className="bg-slate-50 text-slate-800 font-semibold border-b border-slate-200">
                    <tr>
                      <th className="p-4">Số Hóa Đơn</th>
                      <th className="p-4">Khách Hàng Doanh Nghiệp</th>
                      <th className="p-4">Gói Dịch Vụ</th>
                      <th className="p-4">Số Tiền (USD)</th>
                      <th className="p-4">Phương Thức</th>
                      <th className="p-4">Hạn Thanh Toán</th>
                      <th className="p-4">Trạng Thái</th>
                      <th className="p-4 text-right">Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredInvoices.length > 0 ? (
                      filteredInvoices.map((inv) => (
                        <tr key={inv.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="p-4">
                            <div className="font-mono font-bold text-blue-600">{inv.invoiceNumber}</div>
                            <div className="text-[11px] text-slate-400 mt-0.5">
                              {new Date(inv.createdAt).toLocaleDateString("vi-VN")}
                            </div>
                          </td>

                          <td className="p-4">
                            <div className="font-bold text-slate-900">{inv.tenantName || `Tenant #${inv.tenantId}`}</div>
                            <div className="text-[11px] text-slate-500 flex items-center gap-1 font-mono mt-0.5">
                              <span>{inv.tenantCode || "code"}</span>
                              {inv.tenantSubdomain && <span>· {inv.tenantSubdomain}.smarthire.top</span>}
                            </div>
                          </td>

                          <td className="p-4">
                            <div className="font-semibold text-slate-800">{inv.planName || "Gói Tùy Biến"}</div>
                            {inv.billingPeriodStart && inv.billingPeriodEnd && (
                              <div className="text-[11px] text-slate-400 mt-0.5">
                                {inv.billingPeriodStart.slice(0, 7)} → {inv.billingPeriodEnd.slice(0, 7)}
                              </div>
                            )}
                          </td>

                          <td className="p-4 font-mono">
                            <div className="font-bold text-slate-900 text-sm">
                              ${inv.amount.toLocaleString()} {inv.currency}
                            </div>
                            {inv.taxRate !== undefined && inv.taxRate > 0 && (
                              <div className="text-[10px] text-slate-400">VAT {inv.taxRate}%</div>
                            )}
                          </td>

                          <td className="p-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                              {inv.paymentGateway === "BANK_TRANSFER"
                                ? "Chuyển khoản B2B"
                                : inv.paymentGateway === "STRIPE"
                                ? "Thẻ tín dụng Stripe"
                                : inv.paymentGateway === "VN_PAY"
                                ? "Cổng VNPAY QR"
                                : inv.paymentGateway || "Trực tiếp"}
                            </span>
                          </td>

                          <td className="p-4 text-[11px] text-slate-600">
                            {inv.dueDate ? (
                              <span className="font-mono">{inv.dueDate}</span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>

                          <td className="p-4">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                                inv.status === "PAID"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : inv.status === "PENDING"
                                  ? "bg-amber-50 text-amber-700 border border-amber-200"
                                  : inv.status === "OVERDUE"
                                  ? "bg-rose-50 text-rose-700 border border-rose-200"
                                  : "bg-slate-100 text-slate-600 border border-slate-300"
                              }`}
                            >
                              {inv.status === "PAID" ? (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              ) : inv.status === "PENDING" ? (
                                <Clock className="w-3.5 h-3.5" />
                              ) : (
                                <XCircle className="w-3.5 h-3.5" />
                              )}
                              {inv.status === "PAID"
                                ? "Đã Thanh Toán"
                                : inv.status === "PENDING"
                                ? "Chờ Thanh Toán"
                                : inv.status === "OVERDUE"
                                ? "Quá Hạn"
                                : "Đã Hủy"}
                            </span>
                          </td>

                          <td className="p-4 text-right whitespace-nowrap space-x-1.5">
                            <button
                              onClick={() => setSelectedInvoice(inv)}
                              className="px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors inline-flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-500" />
                              <span>Chi tiết</span>
                            </button>

                            {inv.status !== "PAID" && (
                              <button
                                onClick={() => handleMarkInvoicePaid(inv)}
                                className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs transition-colors inline-flex items-center gap-1 shadow-2xs"
                                title="Xác nhận doanh nghiệp đã chuyển khoản và kích hoạt thời hạn Subscription"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Xác nhận Đã TT</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="p-10 text-center text-slate-400">
                          <ReceiptText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                          <span>Không tìm thấy hóa đơn nào phù hợp với bộ lọc.</span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* TAB: B2B CONTRACTS & DIGITAL SIGNING */}
        {activeTab === "contracts" && (
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
                <table className="w-full text-left text-xs text-slate-600 border-collapse">
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
                                onClick={() => handleOpenSignModal(c)}
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
        )}

        {/* TAB 4: SYSTEM AUDIT LOGS */}
        {activeTab === "logs" && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  Nhật Ký Kiểm Toán Hệ Thống (Audit Logs)
                </h1>
                <p className="text-xs text-slate-500 mt-1">
                  Ghi nhận mọi hành vi quản trị, cấp phát Database và các sự kiện an toàn thông tin toàn sàn.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Lọc theo mức độ:</span>
                <select
                  value={logLevelFilter}
                  onChange={(e) => setLogLevelFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-700 focus:border-blue-600 focus:outline-none shadow-2xs"
                >
                  <option value="ALL">Tất cả mức độ</option>
                  <option value="INFO">Thông tin (INFO)</option>
                  <option value="WARN">Cảnh báo (WARN)</option>
                  <option value="ERROR">Lỗi (ERROR)</option>
                </select>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
              <table className="w-full text-left text-xs text-slate-600">
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
                  {filteredLogs.map((log) => (
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
                </tbody>
              </table>
            </div>
          </div>
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
                  <button type="button" onClick={handleLogout} className="flex min-h-12 items-center gap-3 rounded-xl border border-rose-200 px-4 text-sm font-semibold text-rose-700 transition-colors hover:bg-rose-50"><LogOut className="size-5" />Đăng xuất khỏi thiết bị này</button>
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

      <TenantDetailModal
        selectedTenant={selectedTenant}
        setSelectedTenant={setSelectedTenant}
        handleToggleTenantStatus={handleToggleTenantStatus}
      />

      <SubscriptionPlanModal
        showPlanModal={showPlanModal}
        setShowPlanModal={setShowPlanModal}
        isNewPlan={isNewPlan}
        planCode={planCode}
        setPlanCode={setPlanCode}
        planName={planName}
        setPlanName={setPlanName}
        planDesc={planDesc}
        setPlanDesc={setPlanDesc}
        priceMonthly={priceMonthly}
        setPriceMonthly={setPriceMonthly}
        priceYearly={priceYearly}
        setPriceYearly={setPriceYearly}
        maxJobs={maxJobs}
        setMaxJobs={setMaxJobs}
        maxCvParses={maxCvParses}
        setMaxCvParses={setMaxCvParses}
        maxAiHours={maxAiHours}
        setMaxAiHours={setMaxAiHours}
        handleSavePlanSubmit={handleSavePlanSubmit}
      />

      <LogDetailModal selectedLog={selectedLog} setSelectedLog={setSelectedLog} />

      <LeadDetailModal
        selectedLead={selectedLead}
        setSelectedLead={setSelectedLead}
        leadStatusEdit={leadStatusEdit}
        setLeadStatusEdit={setLeadStatusEdit}
        leadNotesEdit={leadNotesEdit}
        setLeadNotesEdit={setLeadNotesEdit}
        updatingLead={updatingLead}
        handleSaveLeadModal={handleSaveLeadModal}
        handleProvisionFromLead={handleProvisionFromLead}
      />

      <CreateInvoiceModal
        showCreateInvoiceModal={showCreateInvoiceModal}
        setShowCreateInvoiceModal={setShowCreateInvoiceModal}
        tenants={tenants}
        plans={plans}
        invoiceTenantId={invoiceTenantId}
        setInvoiceTenantId={setInvoiceTenantId}
        invoicePlanId={invoicePlanId}
        setInvoicePlanId={setInvoicePlanId}
        invoiceAmount={invoiceAmount}
        setInvoiceAmount={setInvoiceAmount}
        invoiceCurrency={invoiceCurrency}
        setInvoiceCurrency={setInvoiceCurrency}
        invoicePaymentGateway={invoicePaymentGateway}
        setInvoicePaymentGateway={setInvoicePaymentGateway}
        invoiceNotes={invoiceNotes}
        setInvoiceNotes={setInvoiceNotes}
        creatingInvoice={creatingInvoice}
        handleCreateInvoiceSubmit={handleCreateInvoiceSubmit}
      />

      <InvoiceDetailModal
        selectedInvoice={selectedInvoice}
        setSelectedInvoice={setSelectedInvoice}
        handleMarkInvoicePaid={handleMarkInvoicePaid}
      />

      <CreateContractModal
        showCreateContractModal={showCreateContractModal}
        setShowCreateContractModal={setShowCreateContractModal}
        tenants={tenants}
        plans={plans}
        contractTenantId={contractTenantId}
        setContractTenantId={setContractTenantId}
        contractPlanId={contractPlanId}
        setContractPlanId={setContractPlanId}
        contractTitle={contractTitle}
        setContractTitle={setContractTitle}
        contractPartyBName={contractPartyBName}
        setContractPartyBName={setContractPartyBName}
        contractPartyBTaxCode={contractPartyBTaxCode}
        setContractPartyBTaxCode={setContractPartyBTaxCode}
        contractPartyBAddress={contractPartyBAddress}
        setContractPartyBAddress={setContractPartyBAddress}
        contractPartyBRepresentative={contractPartyBRepresentative}
        setContractPartyBRepresentative={setContractPartyBRepresentative}
        contractPartyBPosition={contractPartyBPosition}
        setContractPartyBPosition={setContractPartyBPosition}
        contractPartyBPhone={contractPartyBPhone}
        setContractPartyBPhone={setContractPartyBPhone}
        contractPartyBEmail={contractPartyBEmail}
        setContractPartyBEmail={setContractPartyBEmail}
        contractPartyBBankAccount={contractPartyBBankAccount}
        setContractPartyBBankAccount={setContractPartyBBankAccount}
        contractValue={contractValue}
        setContractValue={setContractValue}
        contractTaxRate={contractTaxRate}
        setContractTaxRate={setContractTaxRate}
        contractCurrency={contractCurrency}
        setContractCurrency={setContractCurrency}
        contractStartDate={contractStartDate}
        setContractStartDate={setContractStartDate}
        contractEndDate={contractEndDate}
        setContractEndDate={setContractEndDate}
        contractTerms={contractTerms}
        setContractTerms={setContractTerms}
        contractNotes={contractNotes}
        setContractNotes={setContractNotes}
        creatingContract={creatingContract}
        handleCreateContractSubmit={handleCreateContractSubmit}
      />

      <ContractDetailModal
        selectedContract={selectedContract}
        setSelectedContract={setSelectedContract}
        handleSendContract={handleSendContract}
        handleCopySigningLink={handleCopySigningLink}
        handleOpenSignModal={handleOpenSignModal}
      />

      <SignContractModal
        showSignContractModal={showSignContractModal}
        setShowSignContractModal={setShowSignContractModal}
        signMethod={signMethod}
        setSignMethod={setSignMethod}
        signSignedDocUrl={signSignedDocUrl}
        setSignSignedDocUrl={setSignSignedDocUrl}
        signSignatureData={signSignatureData}
        setSignSignatureData={setSignSignatureData}
        signAutoInvoice={signAutoInvoice}
        setSignAutoInvoice={setSignAutoInvoice}
        signNotes={signNotes}
        setSignNotes={setSignNotes}
        signingContract={signingContract}
        handleSignContractSubmit={handleSignContractSubmit}
      />

      <ChangePasswordModal
        showPasswordModal={showPasswordModal}
        setShowPasswordModal={setShowPasswordModal}
        currentPassword={currentPassword}
        setCurrentPassword={setCurrentPassword}
        newPassword={newPassword}
        setNewPassword={setNewPassword}
        confirmPassword={confirmPassword}
        setConfirmPassword={setConfirmPassword}
        passwordError={passwordError}
        passwordLoading={passwordLoading}
        handleChangePasswordSubmit={handleChangePasswordSubmit}
      />

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

