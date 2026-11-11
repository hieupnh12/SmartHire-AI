import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { getTenantIdFromWindow } from "@/lib/tenant";
import { getTenantTheme } from "@/lib/tenantTheme";
import { LanguageSwitcher } from "@/components/ux/LanguageSwitcher";
import { companyApi } from "@/api/tenant/companyApi";
import { useT, useLocale, formatDate, formatNumber } from "@/i18n";
import {
  formatInvoiceStatusLabel,
  formatPlanDisplayName,
  formatSubscriptionStatusLabel,
} from "@/features/tenant/admin/billing/utils/billingLabels";
import {
  Users,
  Building2,
  CreditCard,
  BrainCircuit,
  Search,
  CheckCircle2,
  XCircle,
  LogOut,
  Upload,
  Sliders,
  UserPlus,
  Edit,
  UserX,
  Palette,
  ExternalLink,
  Cpu,
  X
} from "lucide-react";

interface WorkspaceMember {
  id: number;
  fullName: string;
  email: string;
  role: "TENANT_ADMIN" | "HR_RECRUITER" | "HIRING_MANAGER" | "INTERVIEWER";
  status: "ACTIVE" | "INACTIVE";
  joinedDate: string;
}

interface BillingInvoice {
  id: string;
  date: string;
  description: string;
  amount: number;
  status: "PAID" | "PENDING";
}

export function TenantAdminDashboardPage() {
  const t = useT();
  const locale = useLocale();
  const navigate = useNavigate();
  const rawTenantCode = getTenantIdFromWindow() || "acme";
  const theme = getTenantTheme(rawTenantCode);

  const [activeTab, setActiveTab] = useState<"members" | "profile" | "billing" | "ai_screening">("members");

  // State: Workspace Members (UC: View Workspace Member List)
  const [members, setMembers] = useState<WorkspaceMember[]>([
    { id: 1, fullName: "Admin System", email: `admin@${theme.code}.com`, role: "TENANT_ADMIN", status: "ACTIVE", joinedDate: "2026-01-10" },
    { id: 2, fullName: "Nguyễn Văn HR Lead", email: `hr.lead@${theme.code}.com`, role: "HR_RECRUITER", status: "ACTIVE", joinedDate: "2026-02-01" },
    { id: 3, fullName: "Trần Thị Recruiter", email: `recruiter1@${theme.code}.com`, role: "HR_RECRUITER", status: "ACTIVE", joinedDate: "2026-02-12" },
    { id: 4, fullName: "Lê Văn Engineering Director", email: `engineering@${theme.code}.com`, role: "HIRING_MANAGER", status: "ACTIVE", joinedDate: "2026-03-05" },
    { id: 5, fullName: "Phạm Hoàng Tech Lead", email: `techlead@${theme.code}.com`, role: "INTERVIEWER", status: "INACTIVE", joinedDate: "2026-03-15" },
  ]);

  const [memberSearch, setMemberSearch] = useState("");
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState<WorkspaceMember["role"]>("HR_RECRUITER");
  const [inviteSuccess, setInviteSuccess] = useState(false);

  // State: Company Profile (UC: Update Company Profile Info)
  const [companyName, setCompanyName] = useState(theme.name);
  const [companyTagline, setCompanyTagline] = useState(theme.tagline);
  const [companySize, setCompanySize] = useState(() => t("tenantAdmin.workspace.defaults.companySize"));
  const [companyWebsite, setCompanyWebsite] = useState(`https://${theme.code}.smarthire.top`);
  const [companyAddress, setCompanyAddress] = useState(() => t("tenantAdmin.workspace.defaults.companyAddress"));
  const [companyBio, setCompanyBio] = useState(() => t("tenantAdmin.workspace.defaults.companyBio"));
  const [selectedThemePreset, setSelectedThemePreset] = useState(theme.accentBadge);
  const [profileSaved, setProfileSaved] = useState(false);

  // State: Billing & Subscription (UC: View Current Plan & Billing History)
  const subQuery = useQuery({
    queryKey: ["tenant-subscription-quota"],
    queryFn: companyApi.getSubscription,
  });
  const sub = subQuery.data?.data;
  const invoices = useMemo<BillingInvoice[]>(
    () => [
      { id: "INV-2026-001", date: "2026-08-01", description: t("tenantAdmin.workspace.defaults.inv1Desc"), amount: 149, status: "PAID" },
      { id: "INV-2026-002", date: "2026-07-01", description: t("tenantAdmin.workspace.defaults.inv2Desc"), amount: 149, status: "PAID" },
      { id: "INV-2026-003", date: "2026-06-15", description: t("tenantAdmin.workspace.defaults.inv3Desc"), amount: 29, status: "PAID" },
    ],
    [t],
  );
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [purchasedAddon, setPurchasedAddon] = useState(false);

  // State: AI Screening Criteria (UC: Configure AI Screening Criteria)
  const [minPassScore, setMinPassScore] = useState(75);
  const [techWeight, setTechWeight] = useState(40);
  const [expWeight, setExpWeight] = useState(30);
  const [eduWeight, setEduWeight] = useState(15);
  const [softWeight, setSoftWeight] = useState(15);
  const [aiStrictness, setAiStrictness] = useState<"LENIENT" | "BALANCED" | "RIGOROUS">("BALANCED");
  const [autoReject, setAutoReject] = useState(true);
  const [aiCriteriaSaved, setAiCriteriaSaved] = useState(false);

  // Handlers: Workspace Members
  const handleToggleMemberStatus = (id: number) => {
    setMembers(members.map(m => m.id === id ? { ...m, status: m.status === "ACTIVE" ? "INACTIVE" : "ACTIVE" } : m));
  };

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newM: WorkspaceMember = {
      id: Date.now(),
      fullName: inviteName,
      email: inviteEmail,
      role: inviteRole,
      status: "ACTIVE",
      joinedDate: new Date().toISOString().slice(0, 10)
    };
    setMembers([...members, newM]);
    setInviteSuccess(true);
    setTimeout(() => {
      setInviteSuccess(false);
      setShowInviteModal(false);
      setInviteEmail("");
      setInviteName("");
    }, 1500);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaved(true);
    setTimeout(() => setProfileSaved(false), 2000);
  };

  const handleSaveAiCriteria = (e: React.FormEvent) => {
    e.preventDefault();
    setAiCriteriaSaved(true);
    setTimeout(() => setAiCriteriaSaved(false), 2000);
  };

  const filteredMembers = members.filter(m =>
    m.fullName.toLowerCase().includes(memberSearch.toLowerCase()) ||
    m.email.toLowerCase().includes(memberSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#f9f9ff] text-[#191b23] font-sans antialiased flex flex-col justify-between selection:bg-teal-600 selection:text-white">
      {/* Top Header */}
      <header className="sticky top-0 z-40 bg-white/85 backdrop-blur-md border-b border-[#e2e8f0]">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate("/")}>
            <div className={`w-10 h-10 rounded-[12px] ${theme.primaryColorBtn} text-white flex items-center justify-center shadow-md font-bold text-lg`}>
              {theme.code.charAt(0).toUpperCase()}
            </div>
            <div>
              <span className="text-xl font-bold font-display text-[#1e293b] tracking-tight">
                {theme.name}
              </span>
              <span className={`ml-2.5 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${theme.badgeBg}`}>
                {t("tenantAdmin.workspace.adminBadge")}
              </span>
            </div>
          </div>

          {/* Navigation Tabs (Corresponding to UC Diagram) */}
          <nav className="hidden lg:flex items-center gap-1.5 p-1.5 bg-[#f2f3fd] rounded-[14px] border border-[#e2e8f0]">
            <button
              onClick={() => setActiveTab("members")}
              className={`px-4 py-2 text-xs font-semibold rounded-[10px] transition-all flex items-center gap-2 ${
                activeTab === "members" ? "bg-white text-[#1e293b] shadow-sm font-bold" : "text-[#64748b] hover:text-[#1e293b]"
              }`}
            >
              <Users className="w-4 h-4 text-teal-600" />
              <span>{t("tenantAdmin.workspace.tabs.members")}</span>
            </button>

            <button
              onClick={() => setActiveTab("profile")}
              className={`px-4 py-2 text-xs font-semibold rounded-[10px] transition-all flex items-center gap-2 ${
                activeTab === "profile" ? "bg-white text-[#1e293b] shadow-sm font-bold" : "text-[#64748b] hover:text-[#1e293b]"
              }`}
            >
              <Building2 className="w-4 h-4 text-cyan-600" />
              <span>{t("tenantAdmin.workspace.tabs.profile")}</span>
            </button>

            <button
              onClick={() => setActiveTab("billing")}
              className={`px-4 py-2 text-xs font-semibold rounded-[10px] transition-all flex items-center gap-2 ${
                activeTab === "billing" ? "bg-white text-[#1e293b] shadow-sm font-bold" : "text-[#64748b] hover:text-[#1e293b]"
              }`}
            >
              <CreditCard className="w-4 h-4 text-amber-600" />
              <span>{t("tenantAdmin.workspace.tabs.billing")}</span>
            </button>

            <button
              onClick={() => setActiveTab("ai_screening")}
              className={`px-4 py-2 text-xs font-semibold rounded-[10px] transition-all flex items-center gap-2 ${
                activeTab === "ai_screening" ? "bg-white text-[#1e293b] shadow-sm font-bold" : "text-[#64748b] hover:text-[#1e293b]"
              }`}
            >
              <BrainCircuit className="w-4 h-4 text-indigo-600" />
              <span>{t("tenantAdmin.workspace.tabs.aiScreening")}</span>
            </button>
          </nav>

          <div className="flex items-center gap-4 text-xs">
            <LanguageSwitcher />

            <button
              onClick={() => window.open("/", "_blank")}
              className="px-3.5 py-2 text-xs font-semibold rounded-[8px] bg-slate-100 hover:bg-slate-200 text-[#1e293b] transition-colors flex items-center gap-1.5 border border-[#e2e8f0]"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>{t("tenantAdmin.workspace.viewCareerSite")}</span>
            </button>

            <button
              onClick={() => {
                localStorage.removeItem("accessToken");
                navigate("/internal/login");
              }}
              className="px-3 py-2 text-xs font-semibold rounded-[8px] bg-red-50 text-red-600 hover:bg-red-100 transition-colors flex items-center gap-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{t("tenantAdmin.workspace.logout")}</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Body */}
      <main className="max-w-7xl mx-auto px-6 py-10 w-full flex-grow">
        {/* USE CASE AREA 1: VIEW WORKSPACE MEMBER LIST & ROLES */}
        {activeTab === "members" && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold font-display text-[#1e293b]">
                  {t("tenantAdmin.workspace.members.title")}
                </h1>
                <p className="text-xs text-[#64748b]">
                  {t("tenantAdmin.workspace.members.subtitle")}
                </p>
              </div>

              <button
                onClick={() => setShowInviteModal(true)}
                className={`px-4 py-2.5 text-xs font-semibold rounded-[8px] ${theme.primaryColorBtn} text-white shadow-md transition-all flex items-center gap-2`}
              >
                <UserPlus className="w-4 h-4" />
                <span>{t("tenantAdmin.workspace.members.inviteButton")}</span>
              </button>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-5 rounded-[20px] bg-white border border-[#e2e8f0] shadow-sm">
                <span className="text-xs text-[#64748b] block mb-1">
                  {t("tenantAdmin.workspace.members.metricTotalLabel")}
                </span>
                <span className="text-2xl font-extrabold text-[#1e293b]">
                  {t("tenantAdmin.workspace.members.metricTotalValue", { count: members.length })}
                </span>
              </div>
              <div className="p-5 rounded-[20px] bg-white border border-[#e2e8f0] shadow-sm">
                <span className="text-xs text-[#64748b] block mb-1">
                  {t("tenantAdmin.workspace.members.metricHrLabel")}
                </span>
                <span className="text-2xl font-extrabold text-teal-600">
                  {t("tenantAdmin.workspace.members.metricHrValue", {
                    count: members.filter((m) => m.role === "HR_RECRUITER").length,
                  })}
                </span>
              </div>
              <div className="p-5 rounded-[20px] bg-white border border-[#e2e8f0] shadow-sm">
                <span className="text-xs text-[#64748b] block mb-1">
                  {t("tenantAdmin.workspace.members.metricHmLabel")}
                </span>
                <span className="text-2xl font-extrabold text-indigo-600">
                  {t("tenantAdmin.workspace.members.metricHmValue", {
                    count: members.filter((m) => m.role === "HIRING_MANAGER").length,
                  })}
                </span>
              </div>
              <div className="p-5 rounded-[20px] bg-white border border-[#e2e8f0] shadow-sm">
                <span className="text-xs text-[#64748b] block mb-1">
                  {t("tenantAdmin.workspace.members.metricActiveLabel")}
                </span>
                <span className="text-2xl font-extrabold text-[#16a34a]">
                  {t("tenantAdmin.workspace.members.metricActiveValue", {
                    count: members.filter((m) => m.status === "ACTIVE").length,
                  })}
                </span>
              </div>
            </div>

            {/* Member Table */}
            <div className="bg-white border border-[#e2e8f0] rounded-[24px] overflow-hidden shadow-sm">
              <div className="p-4 border-b border-[#e2e8f0] flex items-center justify-between">
                <div className="relative max-w-xs w-full">
                  <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#64748b]" />
                  <input
                    type="text"
                    placeholder={t("tenantAdmin.workspace.members.searchPlaceholder")}
                    value={memberSearch}
                    onChange={(e) => setMemberSearch(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded-[8px] bg-[#f8f9ff] border border-[#e2e8f0] text-xs focus:outline-none"
                  />
                </div>
                <span className="text-xs text-[#64748b] font-mono">
                  {t("tenantAdmin.workspace.members.resultsCount", { count: filteredMembers.length })}
                </span>
              </div>

              <table className="w-full text-left text-xs text-[#475569]">
                <thead className="bg-[#f8f9ff] text-[#1e293b] font-semibold border-b border-[#e2e8f0]">
                  <tr>
                    <th className="p-4">{t("tenantAdmin.workspace.members.columns.fullName")}</th>
                    <th className="p-4">{t("tenantAdmin.workspace.members.columns.email")}</th>
                    <th className="p-4">{t("tenantAdmin.workspace.members.columns.role")}</th>
                    <th className="p-4">{t("tenantAdmin.workspace.members.columns.status")}</th>
                    <th className="p-4">{t("tenantAdmin.workspace.members.columns.joinedDate")}</th>
                    <th className="p-4 text-right">{t("tenantAdmin.workspace.members.columns.actions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f0]">
                  {filteredMembers.map((m) => (
                    <tr key={m.id} className="hover:bg-[#f8f9ff] transition-colors">
                      <td className="p-4 font-bold text-[#1e293b] flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-bold text-slate-700">
                          {m.fullName.charAt(0)}
                        </div>
                        <span>{m.fullName}</span>
                      </td>
                      <td className="p-4 font-mono text-[#3b82f6]">{m.email}</td>
                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold border ${
                          m.role === "TENANT_ADMIN" ? "bg-amber-50 text-amber-700 border-amber-200" :
                          m.role === "HR_RECRUITER" ? "bg-teal-50 text-teal-700 border-teal-200" :
                          "bg-indigo-50 text-indigo-700 border-indigo-200"
                        }`}>
                          {m.role}
                        </span>
                      </td>
                      <td className="p-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          m.status === "ACTIVE" ? "bg-[#16a34a]/10 text-[#16a34a]" : "bg-red-50 text-red-600"
                        }`}>
                          {m.status === "ACTIVE" ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                          {m.status === "ACTIVE"
                            ? t("tenantAdmin.workspace.members.statusActive")
                            : t("tenantAdmin.workspace.members.statusInactive")}
                        </span>
                      </td>
                      <td className="p-4 text-[#64748b] font-mono">
                        {formatDate(m.joinedDate, undefined, locale)}
                      </td>
                      <td className="p-4 text-right space-x-2">
                        <button
                          onClick={() => alert(t("tenantAdmin.workspace.members.roleUpdateNotice", { name: m.fullName }))}
                          className="px-2.5 py-1.5 rounded-[6px] bg-slate-100 hover:bg-slate-200 text-[#1e293b] font-semibold text-[11px] transition-colors inline-flex items-center gap-1"
                        >
                          <Edit className="w-3 h-3" /> {t("tenantAdmin.workspace.members.roleAction")}
                        </button>
                        <button
                          onClick={() => handleToggleMemberStatus(m.id)}
                          className={`px-2.5 py-1.5 rounded-[6px] font-semibold text-[11px] transition-colors inline-flex items-center gap-1 ${
                            m.status === "ACTIVE" ? "bg-red-50 text-red-600 hover:bg-red-100" : "bg-[#16a34a]/10 text-[#16a34a]"
                          }`}
                        >
                          <UserX className="w-3 h-3" />{" "}
                          {m.status === "ACTIVE"
                            ? t("tenantAdmin.workspace.members.deactivateAction")
                            : t("tenantAdmin.workspace.members.activateAction")}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* USE CASE AREA 2: UPDATE COMPANY PROFILE & BRAND MEDIA & STYLE */}
        {activeTab === "profile" && (
          <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
            <div>
              <h1 className="text-2xl font-bold font-display text-[#1e293b]">
                {t("tenantAdmin.workspace.profile.title")}
              </h1>
              <p className="text-xs text-[#64748b]">
                {t("tenantAdmin.workspace.profile.subtitle")}
              </p>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-8">
              {/* Basic Profile Card */}
              <div className="p-8 rounded-[24px] bg-white border border-[#e2e8f0] shadow-sm space-y-4 text-xs">
                <h3 className="text-base font-bold font-display text-[#1e293b] border-b pb-3 flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-cyan-600" />
                  <span>{t("tenantAdmin.workspace.profile.cardInfoTitle")}</span>
                </h3>

                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="block font-semibold text-[#1e293b] mb-1">
                      {t("tenantAdmin.workspace.profile.companyNameLabel")}
                    </label>
                    <input
                      type="text"
                      required
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="w-full px-3 py-2 rounded-[8px] bg-[#f8f9ff] border border-[#e2e8f0] font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#1e293b] mb-1">
                      {t("tenantAdmin.workspace.profile.companySizeLabel")}
                    </label>
                    <input
                      type="text"
                      value={companySize}
                      onChange={(e) => setCompanySize(e.target.value)}
                      className="w-full px-3 py-2 rounded-[8px] bg-[#f8f9ff] border border-[#e2e8f0]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-[#1e293b] mb-1">
                    {t("tenantAdmin.workspace.profile.sloganLabel")}
                  </label>
                  <input
                    type="text"
                    value={companyTagline}
                    onChange={(e) => setCompanyTagline(e.target.value)}
                    className="w-full px-3 py-2 rounded-[8px] bg-[#f8f9ff] border border-[#e2e8f0]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#1e293b] mb-1">
                    {t("tenantAdmin.workspace.profile.websiteLabel")}
                  </label>
                  <input
                    type="url"
                    value={companyWebsite}
                    onChange={(e) => setCompanyWebsite(e.target.value)}
                    className="w-full px-3 py-2 rounded-[8px] bg-[#f8f9ff] border border-[#e2e8f0] font-mono text-[#3b82f6]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#1e293b] mb-1">
                    {t("tenantAdmin.workspace.profile.addressLabel")}
                  </label>
                  <input
                    type="text"
                    value={companyAddress}
                    onChange={(e) => setCompanyAddress(e.target.value)}
                    className="w-full px-3 py-2 rounded-[8px] bg-[#f8f9ff] border border-[#e2e8f0]"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-[#1e293b] mb-1">
                    {t("tenantAdmin.workspace.profile.bioLabel")}
                  </label>
                  <textarea
                    rows={3}
                    value={companyBio}
                    onChange={(e) => setCompanyBio(e.target.value)}
                    className="w-full px-3 py-2 rounded-[8px] bg-[#f8f9ff] border border-[#e2e8f0]"
                  />
                </div>
              </div>

              {/* Brand Media Uploader Card */}
              <div className="p-8 rounded-[24px] bg-white border border-[#e2e8f0] shadow-sm space-y-4 text-xs">
                <h3 className="text-base font-bold font-display text-[#1e293b] border-b pb-3 flex items-center gap-2">
                  <Upload className="w-5 h-5 text-teal-600" />
                  <span>{t("tenantAdmin.workspace.profile.mediaTitle")}</span>
                </h3>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Hero Banner Preview */}
                  <div>
                    <label className="block font-semibold text-[#1e293b] mb-2">
                      {t("tenantAdmin.workspace.profile.heroBannerLabel")}
                    </label>
                    <div className="relative rounded-[16px] overflow-hidden border border-[#e2e8f0] h-36 bg-slate-900 group">
                      <img
                        src={theme.heroImage}
                        alt={t("tenantAdmin.workspace.profile.heroBannerAlt")}
                        className="w-full h-full object-cover opacity-60"
                      />
                      <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button type="button" className="px-3 py-1.5 rounded-full bg-white text-[#1e293b] font-bold text-[11px] flex items-center gap-1 shadow-md">
                          <Upload className="w-3.5 h-3.5" /> {t("tenantAdmin.workspace.profile.changeBannerBtn")}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Culture Photo Preview */}
                  <div>
                    <label className="block font-semibold text-[#1e293b] mb-2">
                      {t("tenantAdmin.workspace.profile.culturePhotoLabel")}
                    </label>
                    <div className="relative rounded-[16px] overflow-hidden border border-[#e2e8f0] h-36 bg-slate-900 group">
                      <img
                        src={theme.cultureImage}
                        alt={t("tenantAdmin.workspace.profile.culturePhotoAlt")}
                        className="w-full h-full object-cover opacity-75"
                      />
                      <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <button type="button" className="px-3 py-1.5 rounded-full bg-white text-[#1e293b] font-bold text-[11px] flex items-center gap-1 shadow-md">
                          <Upload className="w-3.5 h-3.5" /> {t("tenantAdmin.workspace.profile.changeCultureBtn")}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Configure Career Page Style */}
              <div className="p-8 rounded-[24px] bg-white border border-[#e2e8f0] shadow-sm space-y-4 text-xs">
                <h3 className="text-base font-bold font-display text-[#1e293b] border-b pb-3 flex items-center gap-2">
                  <Palette className="w-5 h-5 text-indigo-600" />
                  <span>{t("tenantAdmin.workspace.profile.themeTitle")}</span>
                </h3>

                <div>
                  <label className="block font-semibold text-[#1e293b] mb-2">
                    {t("tenantAdmin.workspace.profile.paletteLabel")}
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {["Teal Cyber Tech", "Royal Indigo Tech", "Sunset Amber Tech", "Electric Blue Tech"].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setSelectedThemePreset(preset)}
                        className={`p-3 rounded-[12px] border text-left text-xs font-semibold transition-all ${
                          selectedThemePreset === preset ? "border-teal-600 bg-teal-50 text-teal-800 ring-2 ring-teal-500/20" : "border-[#e2e8f0] bg-[#f8f9ff] text-[#475569]"
                        }`}
                      >
                        <div className="w-4 h-4 rounded-full bg-teal-600 mb-1" />
                        <span>{preset}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end gap-3">
                <button
                  type="submit"
                  className={`px-8 py-3 rounded-[10px] ${theme.primaryColorBtn} text-white font-bold text-xs shadow-md transition-all flex items-center gap-2`}
                >
                  {profileSaved ? (
                    <span>{t("tenantAdmin.workspace.profile.savedButton")}</span>
                  ) : (
                    <span>{t("tenantAdmin.workspace.profile.saveButton")}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* USE CASE AREA 3: VIEW CURRENT PLAN & BILLING HISTORY & ADDONS */}
        {activeTab === "billing" && (
          <div className="space-y-8 animate-fade-in">
            <div>
              <h1 className="text-2xl font-bold font-display text-[#1e293b]">
                {t("tenantAdmin.workspace.billing.title")}
              </h1>
              <p className="text-xs text-[#64748b]">
                {t("tenantAdmin.workspace.billing.subtitle")}
              </p>
            </div>

            {/* Current Plan Overview Card */}
            <div className="p-8 rounded-[28px] bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-xl relative overflow-hidden">
              <div className="relative z-10 grid md:grid-cols-12 gap-8 items-center">
                <div className="md:col-span-7 space-y-3">
                  <span className="px-3 py-1 rounded-full bg-teal-500/20 text-teal-300 font-bold text-xs border border-teal-500/30">
                    {t("tenantAdmin.workspace.billing.currentPlanBadge", {
                      code: (sub?.planCode || "STARTER").toUpperCase(),
                      status: formatSubscriptionStatusLabel(sub?.subscriptionStatus || "ACTIVE", t),
                    })}
                  </span>
                  <h2 className="text-3xl font-extrabold font-display">
                    {t("tenantAdmin.workspace.billing.planTitle", {
                      name: formatPlanDisplayName(sub?.planName || "Starter", t),
                    })}
                  </h2>
                  <p className="text-xs text-slate-300">
                    {sub?.description || t("tenantAdmin.workspace.billing.defaultPlanDesc")}
                  </p>
                  <p className="text-xs text-teal-300 font-semibold">
                    {t("tenantAdmin.workspace.billing.retentionLabel", { days: sub?.daysRemaining ?? 0 })}
                    {sub == null
                      ? "—"
                      : sub.videoRetentionDays < 0
                      ? t("tenantAdmin.workspace.billing.retentionForever")
                      : sub.videoRetentionDays === 0
                      ? t("tenantAdmin.workspace.billing.retentionNone")
                      : t("tenantAdmin.workspace.billing.retentionDays", { days: sub.videoRetentionDays })}
                  </p>
                </div>

                <div className="md:col-span-5 bg-white/10 backdrop-blur-md p-6 rounded-[20px] border border-white/20 text-center space-y-3">
                  <span className="text-xs text-slate-300 block">
                    {t("tenantAdmin.workspace.billing.annualPriceLabel")}
                  </span>
                  <span className="text-3xl font-extrabold text-cyan-400">
                    {t("tenantAdmin.workspace.billing.priceValue", {
                      amount: formatNumber(sub?.priceYearly ?? 0, undefined, locale),
                    })}
                    <span className="text-xs text-slate-300">{t("tenantAdmin.workspace.billing.perYear")}</span>
                  </span>
                  <button
                    onClick={() => setShowUpgradeModal(true)}
                    className="w-full py-2.5 rounded-[10px] bg-white text-slate-900 font-bold text-xs hover:bg-slate-100 transition-colors shadow-md"
                  >
                    {t("tenantAdmin.workspace.billing.upgradeOrAddonsBtn")}
                  </button>
                </div>
              </div>
            </div>

            {/* 6 Quotas Progress Bars */}
            <div className="grid md:grid-cols-3 gap-6">
              <div className="p-6 rounded-[20px] bg-white border border-[#e2e8f0] shadow-sm space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span>{t("tenantAdmin.workspace.billing.quotas.activeJobs")}</span>
                  <span className="text-[#3b82f6]">
                    {sub?.usedJobs ?? 0} /{" "}
                    {sub?.maxJobs != null && sub.maxJobs < 0
                      ? t("tenantAdmin.workspace.billing.unlimited")
                      : t("tenantAdmin.workspace.billing.jobsSuffix", { count: sub?.maxJobs ?? 3 })}
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-[#f2f3fd] overflow-hidden">
                  <div
                    className={`h-full rounded-full ${sub && !sub.jobsAllowed ? "bg-red-600" : "bg-[#3b82f6]"}`}
                    style={{ width: `${sub?.maxJobs != null && sub.maxJobs < 0 ? 20 : Math.min(100, sub?.jobsUsagePercent ?? 0)}%` }}
                  />
                </div>
              </div>

              <div className="p-6 rounded-[20px] bg-white border border-[#e2e8f0] shadow-sm space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span>{t("tenantAdmin.workspace.billing.quotas.cvParsing")}</span>
                  <span className="text-teal-600">
                    {sub?.usedCvParses ?? 0} /{" "}
                    {sub?.maxCvParses != null && sub.maxCvParses < 0
                      ? t("tenantAdmin.workspace.billing.unlimited")
                      : t("tenantAdmin.workspace.billing.cvsSuffix", { count: sub?.maxCvParses ?? 100 })}
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-[#f2f3fd] overflow-hidden">
                  <div
                    className={`h-full rounded-full ${sub && !sub.cvParseAllowed ? "bg-red-600" : "bg-teal-600"}`}
                    style={{ width: `${sub?.maxCvParses != null && sub.maxCvParses < 0 ? 20 : Math.min(100, sub?.cvParsesUsagePercent ?? 0)}%` }}
                  />
                </div>
              </div>

              <div className="p-6 rounded-[20px] bg-white border border-[#e2e8f0] shadow-sm space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span>{t("tenantAdmin.workspace.billing.quotas.aiVoice")}</span>
                  <span className="text-amber-600">
                    {((sub?.usedAiInterviewSeconds ?? 0) / 3600).toFixed(1)} /{" "}
                    {sub?.maxAiInterviewHours != null && sub.maxAiInterviewHours < 0
                      ? t("tenantAdmin.workspace.billing.unlimited")
                      : sub?.maxAiInterviewHours === 0
                      ? t("tenantAdmin.workspace.billing.lockedZeroHours")
                      : t("tenantAdmin.workspace.billing.hoursSuffix", { count: sub?.maxAiInterviewHours ?? 0 })}
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-[#f2f3fd] overflow-hidden">
                  <div
                    className={`h-full rounded-full ${sub && !sub.aiInterviewAllowed ? "bg-red-600" : "bg-amber-600"}`}
                    style={{ width: `${sub?.maxAiInterviewHours != null && sub.maxAiInterviewHours < 0 ? 20 : Math.min(100, sub?.aiInterviewUsagePercent ?? 0)}%` }}
                  />
                </div>
              </div>

              <div className="p-6 rounded-[20px] bg-white border border-[#e2e8f0] shadow-sm space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span>{t("tenantAdmin.workspace.billing.quotas.proctoring")}</span>
                  <span className="text-indigo-600">
                    {((sub?.usedProctoringSeconds ?? 0) / 3600).toFixed(1)} /{" "}
                    {sub?.maxProctoringHours != null && sub.maxProctoringHours < 0
                      ? t("tenantAdmin.workspace.billing.unlimited")
                      : sub?.maxProctoringHours === 0
                      ? t("tenantAdmin.workspace.billing.lockedZeroHours")
                      : t("tenantAdmin.workspace.billing.hoursSuffix", { count: sub?.maxProctoringHours ?? 0 })}
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-[#f2f3fd] overflow-hidden">
                  <div
                    className={`h-full rounded-full ${sub && !sub.proctoringAllowed ? "bg-red-600" : "bg-indigo-600"}`}
                    style={{ width: `${sub?.maxProctoringHours != null && sub.maxProctoringHours < 0 ? 20 : Math.min(100, sub?.proctoringUsagePercent ?? 0)}%` }}
                  />
                </div>
              </div>

              <div className="p-6 rounded-[20px] bg-white border border-[#e2e8f0] shadow-sm space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span>{t("tenantAdmin.workspace.billing.quotas.storage")}</span>
                  <span className="text-cyan-600">
                    {((sub?.usedStorageBytes ?? 0) / (1024 * 1024)).toFixed(1)} MB /{" "}
                    {sub?.maxStorageGb != null && sub.maxStorageGb < 0
                      ? t("tenantAdmin.workspace.billing.unlimited")
                      : `${sub?.maxStorageGb ?? 2} GB`}
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-[#f2f3fd] overflow-hidden">
                  <div
                    className={`h-full rounded-full ${sub && !sub.storageAllowed ? "bg-red-600" : "bg-cyan-600"}`}
                    style={{ width: `${sub?.maxStorageGb != null && sub.maxStorageGb < 0 ? 20 : Math.min(100, sub?.storageUsagePercent ?? 0)}%` }}
                  />
                </div>
              </div>

              <div className="p-6 rounded-[20px] bg-white border border-[#e2e8f0] shadow-sm space-y-2">
                <div className="flex justify-between text-xs font-semibold">
                  <span>{t("tenantAdmin.workspace.billing.quotas.videoRetention")}</span>
                  <span className="text-emerald-600">
                    {sub == null
                      ? "—"
                      : sub.videoRetentionDays < 0
                      ? t("tenantAdmin.workspace.billing.unlimited")
                      : sub.videoRetentionDays === 0
                      ? t("tenantAdmin.workspace.billing.lockedZeroDays")
                      : t("tenantAdmin.workspace.billing.daysSuffix", { count: sub.videoRetentionDays })}
                  </span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-[#f2f3fd] overflow-hidden">
                  <div
                    className={`h-full rounded-full ${sub && !sub.videoRetentionEnabled ? "bg-slate-400" : "bg-emerald-600"}`}
                    style={{ width: sub && sub.videoRetentionEnabled ? "100%" : "0%" }}
                  />
                </div>
              </div>
            </div>

            {/* Billing Invoices Table */}
            <div className="bg-white border border-[#e2e8f0] rounded-[24px] overflow-hidden shadow-sm">
              <div className="p-5 border-b border-[#e2e8f0]">
                <h3 className="font-bold text-base text-[#1e293b]">
                  {t("tenantAdmin.workspace.billing.invoicesTitle")}
                </h3>
              </div>

              <table className="w-full text-left text-xs text-[#475569]">
                <thead className="bg-[#f8f9ff] text-[#1e293b] font-semibold border-b border-[#e2e8f0]">
                  <tr>
                    <th className="p-4">{t("tenantAdmin.workspace.billing.invoiceColumns.id")}</th>
                    <th className="p-4">{t("tenantAdmin.workspace.billing.invoiceColumns.date")}</th>
                    <th className="p-4">{t("tenantAdmin.workspace.billing.invoiceColumns.description")}</th>
                    <th className="p-4">{t("tenantAdmin.workspace.billing.invoiceColumns.amount")}</th>
                    <th className="p-4">{t("tenantAdmin.workspace.billing.invoiceColumns.status")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e2e8f0]">
                  {sub?.invoices && sub.invoices.length > 0 ? (
                    sub.invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-[#f8f9ff] font-mono">
                        <td className="p-4 font-bold text-[#3b82f6]">{inv.invoiceNumber}</td>
                        <td className="p-4 text-[#64748b]">
                          {inv.paidAt
                            ? formatDate(inv.paidAt, undefined, locale)
                            : inv.dueDate
                            ? formatDate(inv.dueDate, undefined, locale)
                            : "—"}
                        </td>
                        <td className="p-4 font-sans text-xs font-semibold text-[#1e293b]">
                          {inv.planName
                            ? t("tenantAdmin.workspace.billing.invoicePlanDesc", {
                                plan: formatPlanDisplayName(inv.planName, t),
                              })
                            : t("tenantAdmin.workspace.billing.invoiceFallbackDesc")}
                        </td>
                        <td className="p-4 font-extrabold text-[#1e293b]">
                          {formatNumber(Number(inv.amount || 0), undefined, locale)} {inv.currency || "VND"}
                        </td>
                        <td className="p-4">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#16a34a]/10 text-[#16a34a]">
                            {formatInvoiceStatusLabel(inv.status, t)}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-[#f8f9ff] font-mono">
                        <td className="p-4 font-bold text-[#3b82f6]">{inv.id}</td>
                        <td className="p-4 text-[#64748b]">{formatDate(inv.date, undefined, locale)}</td>
                        <td className="p-4 font-sans text-xs font-semibold text-[#1e293b]">{inv.description}</td>
                        <td className="p-4 font-extrabold text-[#1e293b]">${inv.amount}</td>
                        <td className="p-4">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#16a34a]/10 text-[#16a34a]">
                            {inv.status === "PAID"
                              ? t("tenantAdmin.workspace.billing.invoicePaid")
                              : t("tenantAdmin.workspace.billing.invoicePending")}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* USE CASE AREA 4: CONFIGURE AI SCREENING CRITERIA */}
        {activeTab === "ai_screening" && (
          <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
            <div>
              <h1 className="text-2xl font-bold font-display text-[#1e293b]">
                {t("tenantAdmin.workspace.aiScreening.title")}
              </h1>
              <p className="text-xs text-[#64748b]">
                {t("tenantAdmin.workspace.aiScreening.subtitle")}
              </p>
            </div>

            <form onSubmit={handleSaveAiCriteria} className="space-y-8 text-xs">
              {/* Threshold Slider Card */}
              <div className="p-8 rounded-[24px] bg-white border border-[#e2e8f0] shadow-sm space-y-6">
                <h3 className="text-base font-bold font-display text-[#1e293b] border-b pb-3 flex items-center gap-2">
                  <BrainCircuit className="w-5 h-5 text-indigo-600" />
                  <span>{t("tenantAdmin.workspace.aiScreening.thresholdCardTitle")}</span>
                </h3>

                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-[#1e293b]">
                      {t("tenantAdmin.workspace.aiScreening.passScoreLabel")}
                    </span>
                    <span className="text-2xl font-extrabold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-[8px] border border-indigo-200">
                      {minPassScore}%
                    </span>
                  </div>

                  <input
                    type="range"
                    min="50"
                    max="95"
                    value={minPassScore}
                    onChange={(e) => setMinPassScore(Number(e.target.value))}
                    className="w-full accent-indigo-600 cursor-pointer"
                  />
                  <div className="flex justify-between text-[11px] text-[#64748b]">
                    <span>{t("tenantAdmin.workspace.aiScreening.scaleMin")}</span>
                    <span>{t("tenantAdmin.workspace.aiScreening.scaleRec")}</span>
                    <span>{t("tenantAdmin.workspace.aiScreening.scaleMax")}</span>
                  </div>
                </div>
              </div>

              {/* Weightage Matrix Card */}
              <div className="p-8 rounded-[24px] bg-white border border-[#e2e8f0] shadow-sm space-y-6">
                <h3 className="text-base font-bold font-display text-[#1e293b] border-b pb-3 flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-teal-600" />
                  <span>{t("tenantAdmin.workspace.aiScreening.matrixCardTitle")}</span>
                </h3>

                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block font-semibold text-[#1e293b] mb-1">
                      {t("tenantAdmin.workspace.aiScreening.techWeightLabel", { weight: techWeight })}
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="60"
                      value={techWeight}
                      onChange={(e) => setTechWeight(Number(e.target.value))}
                      className="w-full accent-teal-600 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#1e293b] mb-1">
                      {t("tenantAdmin.workspace.aiScreening.expWeightLabel", { weight: expWeight })}
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="50"
                      value={expWeight}
                      onChange={(e) => setExpWeight(Number(e.target.value))}
                      className="w-full accent-teal-600 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#1e293b] mb-1">
                      {t("tenantAdmin.workspace.aiScreening.eduWeightLabel", { weight: eduWeight })}
                    </label>
                    <input
                      type="range"
                      min="5"
                      max="30"
                      value={eduWeight}
                      onChange={(e) => setEduWeight(Number(e.target.value))}
                      className="w-full accent-teal-600 cursor-pointer"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#1e293b] mb-1">
                      {t("tenantAdmin.workspace.aiScreening.softWeightLabel", { weight: softWeight })}
                    </label>
                    <input
                      type="range"
                      min="5"
                      max="30"
                      value={softWeight}
                      onChange={(e) => setSoftWeight(Number(e.target.value))}
                      className="w-full accent-teal-600 cursor-pointer"
                    />
                  </div>
                </div>

                <div className="p-3 rounded-[12px] bg-slate-50 border border-[#e2e8f0] text-slate-700 flex items-center justify-between font-mono">
                  <span>{t("tenantAdmin.workspace.aiScreening.totalWeightLabel")}</span>
                  <span className={`font-bold ${techWeight + expWeight + eduWeight + softWeight === 100 ? "text-[#16a34a]" : "text-red-600"}`}>
                    {techWeight + expWeight + eduWeight + softWeight}%{" "}
                    {techWeight + expWeight + eduWeight + softWeight === 100
                      ? t("tenantAdmin.workspace.aiScreening.weightValid")
                      : t("tenantAdmin.workspace.aiScreening.weightInvalid")}
                  </span>
                </div>
              </div>

              {/* AI STT Voice Interview Settings */}
              <div className="p-8 rounded-[24px] bg-white border border-[#e2e8f0] shadow-sm space-y-6">
                <h3 className="text-base font-bold font-display text-[#1e293b] border-b pb-3 flex items-center gap-2">
                  <Cpu className="w-5 h-5 text-amber-600" />
                  <span>{t("tenantAdmin.workspace.aiScreening.voiceCardTitle")}</span>
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block font-semibold text-[#1e293b] mb-2">
                      {t("tenantAdmin.workspace.aiScreening.strictnessLabel")}
                    </label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { id: "LENIENT", name: t("tenantAdmin.workspace.aiScreening.strictnessLenient") },
                        { id: "BALANCED", name: t("tenantAdmin.workspace.aiScreening.strictnessBalanced") },
                        { id: "RIGOROUS", name: t("tenantAdmin.workspace.aiScreening.strictnessRigorous") },
                      ].map((st) => (
                        <button
                          key={st.id}
                          type="button"
                          onClick={() => setAiStrictness(st.id as "LENIENT" | "BALANCED" | "RIGOROUS")}
                          className={`p-3 rounded-[12px] border text-xs font-semibold transition-all ${
                            aiStrictness === st.id ? "border-indigo-600 bg-indigo-50 text-indigo-700" : "border-[#e2e8f0] bg-[#f8f9ff] text-[#475569]"
                          }`}
                        >
                          {st.name}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 pt-2">
                    <input
                      type="checkbox"
                      id="autoReject"
                      checked={autoReject}
                      onChange={(e) => setAutoReject(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                    />
                    <label htmlFor="autoReject" className="font-semibold text-[#1e293b] cursor-pointer">
                      {t("tenantAdmin.workspace.aiScreening.autoRejectLabel")}
                    </label>
                  </div>
                </div>
              </div>

              {/* Save Button */}
              <div className="flex justify-end">
                <button
                  type="submit"
                  className={`px-8 py-3 rounded-[10px] ${theme.primaryColorBtn} text-white font-bold text-xs shadow-md transition-all flex items-center gap-2`}
                >
                  {aiCriteriaSaved ? (
                    <span>{t("tenantAdmin.workspace.aiScreening.savedButton")}</span>
                  ) : (
                    <span>{t("tenantAdmin.workspace.aiScreening.saveButton")}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* MODAL: INVITE NEW MEMBER */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white border border-[#e2e8f0] rounded-[24px] p-8 max-w-md w-full shadow-2xl relative animate-fade-in text-xs">
            <button onClick={() => setShowInviteModal(false)} className="absolute top-6 right-6 text-[#64748b] hover:text-[#1e293b]">
              <X className="w-5 h-5" />
            </button>

            {inviteSuccess ? (
              <div className="text-center py-6">
                <CheckCircle2 className="w-12 h-12 text-[#16a34a] mx-auto mb-3" />
                <h4 className="text-xl font-bold text-[#1e293b] mb-1">
                  {t("tenantAdmin.workspace.inviteModal.successTitle")}
                </h4>
                <p className="text-xs text-[#64748b]">
                  {t("tenantAdmin.workspace.inviteModal.successDescPrefix")}
                  <strong>{inviteEmail}</strong>
                  {t("tenantAdmin.workspace.inviteModal.successDescSuffix")}
                </p>
              </div>
            ) : (
              <>
                <h3 className="text-xl font-bold font-display text-[#1e293b] mb-1">
                  {t("tenantAdmin.workspace.inviteModal.title")}
                </h3>
                <p className="text-xs text-[#64748b] mb-6">
                  {t("tenantAdmin.workspace.inviteModal.subtitle")}
                </p>

                <form onSubmit={handleInviteSubmit} className="space-y-4">
                  <div>
                    <label className="block font-semibold text-[#1e293b] mb-1">
                      {t("tenantAdmin.workspace.inviteModal.nameLabel")}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={t("tenantAdmin.workspace.inviteModal.namePlaceholder")}
                      value={inviteName}
                      onChange={(e) => setInviteName(e.target.value)}
                      className="w-full px-3 py-2 rounded-[8px] bg-[#f8f9ff] border border-[#e2e8f0]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#1e293b] mb-1">
                      {t("tenantAdmin.workspace.inviteModal.emailLabel")}
                    </label>
                    <input
                      type="email"
                      required
                      placeholder={`recruiter2@${theme.code}.com`}
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="w-full px-3 py-2 rounded-[8px] bg-[#f8f9ff] border border-[#e2e8f0] font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#1e293b] mb-1">
                      {t("tenantAdmin.workspace.inviteModal.roleLabel")}
                    </label>
                    <select
                      value={inviteRole}
                      onChange={(e) => setInviteRole(e.target.value as WorkspaceMember["role"])}
                      className="w-full px-3 py-2 rounded-[8px] bg-[#f8f9ff] border border-[#e2e8f0] font-semibold"
                    >
                      <option value="HR_RECRUITER">{t("tenantAdmin.workspace.inviteModal.roleHr")}</option>
                      <option value="HIRING_MANAGER">{t("tenantAdmin.workspace.inviteModal.roleHm")}</option>
                      <option value="INTERVIEWER">{t("tenantAdmin.workspace.inviteModal.roleInterviewer")}</option>
                      <option value="TENANT_ADMIN">{t("tenantAdmin.workspace.inviteModal.roleAdmin")}</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    className={`w-full py-3 rounded-[8px] ${theme.primaryColorBtn} text-white font-bold text-xs shadow-md transition-all mt-4`}
                  >
                    {t("tenantAdmin.workspace.inviteModal.submitButton")}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* MODAL: PURCHASE SUBSCRIPTION OR ADD-ONS */}
      {showUpgradeModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="bg-white border border-[#e2e8f0] rounded-[24px] p-8 max-w-lg w-full shadow-2xl relative text-xs">
            <button onClick={() => setShowUpgradeModal(false)} className="absolute top-6 right-6 text-[#64748b] hover:text-[#1e293b]">
              <X className="w-5 h-5" />
            </button>

            {purchasedAddon ? (
              <div className="text-center py-6">
                <CheckCircle2 className="w-12 h-12 text-[#16a34a] mx-auto mb-3" />
                <h4 className="text-xl font-bold text-[#1e293b] mb-1">
                  {t("tenantAdmin.workspace.upgradeModal.successTitle")}
                </h4>
                <p className="text-xs text-[#64748b]">
                  {t("tenantAdmin.workspace.upgradeModal.successDescPrefix")}
                  <strong>{theme.name}</strong>
                  {t("tenantAdmin.workspace.upgradeModal.successDescSuffix")}
                </p>
              </div>
            ) : (
              <>
                <h3 className="text-xl font-bold font-display text-[#1e293b] mb-1">
                  {t("tenantAdmin.workspace.upgradeModal.title")}
                </h3>
                <p className="text-xs text-[#64748b] mb-6">
                  {t("tenantAdmin.workspace.upgradeModal.subtitle")}
                </p>

                <div className="space-y-4">
                  <div className="p-4 rounded-[16px] bg-[#f8f9ff] border border-[#e2e8f0] flex items-center justify-between">
                    <div>
                      <span className="font-bold text-[#1e293b] block">
                        {t("tenantAdmin.workspace.upgradeModal.addon1Title")}
                      </span>
                      <span className="text-[#64748b] text-[11px]">
                        {t("tenantAdmin.workspace.upgradeModal.addon1Desc")}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setPurchasedAddon(true);
                        setTimeout(() => {
                          setPurchasedAddon(false);
                          setShowUpgradeModal(false);
                        }, 1800);
                      }}
                      className="px-4 py-2 rounded-[8px] bg-teal-600 text-white font-bold text-xs"
                    >
                      {t("tenantAdmin.workspace.upgradeModal.addon1Btn")}
                    </button>
                  </div>

                  <div className="p-4 rounded-[16px] bg-[#f8f9ff] border border-[#e2e8f0] flex items-center justify-between">
                    <div>
                      <span className="font-bold text-[#1e293b] block">
                        {t("tenantAdmin.workspace.upgradeModal.addon2Title")}
                      </span>
                      <span className="text-[#64748b] text-[11px]">
                        {t("tenantAdmin.workspace.upgradeModal.addon2Desc")}
                      </span>
                    </div>
                    <button
                      onClick={() => {
                        setPurchasedAddon(true);
                        setTimeout(() => {
                          setPurchasedAddon(false);
                          setShowUpgradeModal(false);
                        }, 1800);
                      }}
                      className="px-4 py-2 rounded-[8px] bg-indigo-600 text-white font-bold text-xs"
                    >
                      {t("tenantAdmin.workspace.upgradeModal.addon2Btn")}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-[#e2e8f0] py-6 text-center text-xs text-[#64748b] bg-white">
        {t("tenantAdmin.workspace.footer", { name: theme.name })}
      </footer>
    </div>
  );
}
