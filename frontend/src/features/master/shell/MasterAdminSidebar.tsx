import React, { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  BrainCircuit,
  Building2,
  BadgeCheck,
  CreditCard,
  ReceiptText,
  FileSignature,
  ArrowUpDown,
  BarChart3,
  House,
  FileText,
  Plus,
  ShieldCheck,
  Eye,
  Bell,
  CircleUserRound,
  PhoneCall,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sliders,
  X,
} from "lucide-react";
import { Tooltip } from "@/components/ux/Tooltip";
import { LanguageSwitcher } from "@/components/ux/LanguageSwitcher";
import { DashboardTab, SidebarGroupId, SidebarItem } from "./types";
import { useMasterDashboard } from "./MasterAdminContext";
import { masterAuthApi } from "@/api/master/masterAuthApi";

interface MasterSidebarProps {
  activeTab: DashboardTab;
  setActiveTab: (tab: DashboardTab) => void;
  isSidebarCollapsed: boolean;
  setIsSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  openSidebarGroup: SidebarGroupId | null;
  setOpenSidebarGroup: React.Dispatch<React.SetStateAction<SidebarGroupId | null>>;
  isAccountMenuOpen: boolean;
  setIsAccountMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isNotificationPanelOpen: boolean;
  setIsNotificationPanelOpen: React.Dispatch<React.SetStateAction<boolean>>;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

export function MasterAdminSidebar({
  activeTab,
  setActiveTab,
  isSidebarCollapsed,
  setIsSidebarCollapsed,
  openSidebarGroup,
  setOpenSidebarGroup,
  isAccountMenuOpen,
  setIsAccountMenuOpen,
  isNotificationPanelOpen,
  setIsNotificationPanelOpen,
  isMobileOpen,
  onMobileClose,
}: MasterSidebarProps) {
  const navigate = useNavigate();
  const { tenants, plans, logs, leads, invoices, contracts } = useMasterDashboard();

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

  const sidebarGroups: Array<{
    id: SidebarGroupId;
    label: string;
    icon: any;
    items: SidebarItem[];
  }> = useMemo(() => [
    {
      id: "overview",
      label: "Trang chủ",
      icon: House,
      items: [
        {
          tab: "home",
          label: "Tổng quan nền tảng",
          description: "Theo dõi nhanh trạng thái vận hành toàn nền tảng.",
          icon: House,
        },
        {
          tab: "analytics",
          label: "Phân tích nền tảng",
          description: "Theo dõi doanh thu, tenant và tài nguyên AI.",
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
          action: () => navigate("/admin/tenants/create"),
          label: "Khởi tạo Tenant mới",
          description: "Tạo workspace và cấp phát cơ sở dữ liệu cho doanh nghiệp.",
          icon: Plus,
        },
        {
          tab: "tenants",
          action: () => navigate("/admin/tenants/directory"),
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
          action: () => navigate("/admin/tenants/verification"),
          label: "Xác thực doanh nghiệp",
          description: "Thẩm định hồ sơ pháp lý và phê duyệt trạng thái xác thực doanh nghiệp.",
          icon: BadgeCheck,
        },
        {
          tab: "tenants",
          action: () => navigate("/admin/tenants/provisioning"),
          label: "Theo dõi provisioning",
          description: "Kiểm tra tiến trình cấp phát database và retry khi cần.",
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
          action: () => navigate("/admin/subscriptions/allocations"),
          label: "Phân bổ gói cho Tenant",
          description: "Gán, nâng cấp hoặc hạ cấp gói dịch vụ của từng doanh nghiệp.",
          icon: ArrowUpDown,
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
  ], [tenants.length, plans.length, logs.length, leads.length, invoices.length, contracts.length, navigate]);

  const accountSidebarGroup: {
    id: SidebarGroupId;
    label: string;
    icon: any;
    items: SidebarItem[];
  } = useMemo(() => ({
    id: "account",
    label: "Tài khoản",
    icon: CircleUserRound,
    items: [
      { tab: "account-profile", label: "Hồ sơ của bạn", description: "Xem thông tin tài khoản Workspace Admin.", icon: CircleUserRound },
      { tab: "account-security", label: "Tài khoản và bảo mật", description: "Quản lý phiên đăng nhập và bảo mật tài khoản.", icon: ShieldCheck },
      { tab: "account-accessibility", label: "Khả năng tiếp cận", description: "Điều chỉnh trải nghiệm sử dụng phù hợp.", icon: Eye },
      { tab: "account-notifications", label: "Tùy chọn thông báo", description: "Cấu hình cách nhận thông báo quản trị.", icon: Bell },
    ],
  }), []);

  const allSidebarGroups = useMemo(() => [...sidebarGroups, accountSidebarGroup], [sidebarGroups, accountSidebarGroup]);
  const notificationCount = tenants.filter((tenant) => tenant.status !== "ACTIVE").length;
  const selectedSidebarGroup = allSidebarGroups.find((group) => group.id === openSidebarGroup)
    ?? allSidebarGroups.find((group) => group.items.some((item) => item.tab === activeTab))
    ?? sidebarGroups[0];

  return (
    <aside
      className={`fixed bottom-0 left-0 top-0 z-40 flex w-20 shrink-0 flex-col overflow-visible border-r border-slate-200 bg-white/95 shadow-sm backdrop-blur-md transition-transform duration-200 md:z-30 md:translate-x-0 2xl:left-[calc((100vw-1536px)/2)] ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}`}
      aria-label="Điều hướng quản trị nền tảng"
    >
      <button
        type="button"
        onClick={onMobileClose}
        className="absolute right-2 top-2 z-50 grid size-9 translate-x-full place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-md md:hidden"
        aria-label="Đóng điều hướng quản trị"
      >
        <X className="size-5" aria-hidden="true" />
      </button>
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
                      setActiveTab("home");
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
                  aria-current={group.id === "overview" && activeTab === "home" ? "page" : undefined}
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
                              onMobileClose();
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
      ) : null}
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
          ) : null}

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
                  <span className="flex size-11 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><ShieldCheck className="size-6" /></span>
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
  );
}
