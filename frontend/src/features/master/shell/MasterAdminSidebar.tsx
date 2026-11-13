import { useState, useEffect, useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  BrainCircuit,
  Building2,
  Calculator,
  CreditCard,
  ReceiptText,
  FileSignature,
  ArrowUpDown,
  BarChart3,
  House,
  FileText,
  ShieldCheck,
  PhoneCall,
  Sliders,
  Cpu,
  ChevronDown,
  X,
  LucideIcon,
} from "lucide-react";
import { useTenants } from "@/api/master/queries";
import { SmartHireLogo } from "@/components/shared/SmartHireLogo";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";

export function ToggleMenuIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <line x1="4" x2="14" y1="7" y2="7" />
      <line x1="4" x2="20" y1="12" y2="12" />
      <line x1="4" x2="12" y1="17" y2="17" />
    </svg>
  );
}

interface MasterSidebarProps {
  isOpen: boolean;
  isMobileOpen: boolean;
  onMobileClose: () => void;
}

type SingleNavItem = {
  type: "single";
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
  activePaths?: string[];
};

type GroupNavItem = {
  type: "group";
  id: string;
  label: string;
  icon: LucideIcon;
  badge?: number | string;
  children: Array<{
    id: string;
    label: string;
    path: string;
    icon: LucideIcon;
    activePaths?: string[];
  }>;
};

type NavEntry = SingleNavItem | GroupNavItem;

export function MasterAdminSidebar({
  isOpen,
  isMobileOpen,
  onMobileClose,
}: MasterSidebarProps) {
  const t = useT();
  const navigate = useNavigate();
  const location = useLocation();
  const { data: tenants = [] } = useTenants();

  const navEntries: NavEntry[] = useMemo(() => [
    {
      type: "single",
      id: "overview",
      label: t("master.shell.sidebar.overview"),
      path: "/admin/dashboard",
      activePaths: ["/admin/dashboard"],
      icon: House,
    },
    {
      type: "single",
      id: "analytics",
      label: t("master.shell.sidebar.analytics"),
      path: "/admin/analytics",
      activePaths: ["/admin/analytics"],
      icon: BarChart3,
    },
    {
      type: "group",
      id: "tenants",
      label: t("master.shell.sidebar.tenantsGroup"),
      icon: Building2,
      badge: tenants.length > 0 ? tenants.length : undefined,
      children: [
        {
          id: "tenant-directory",
          label: t("master.shell.sidebar.tenantDirectory"),
          path: "/admin/tenants/directory",
          activePaths: ["/admin/tenants/directory"],
          icon: Building2,
        },
        {
          id: "leads",
          label: t("master.shell.sidebar.leads"),
          path: "/admin/leads",
          activePaths: ["/admin/leads"],
          icon: PhoneCall,
        },
        {
          id: "b2b-deals",
          label: t("master.shell.sidebar.b2bDeals"),
          path: "/admin/deals",
          activePaths: ["/admin/deals", "/admin/tenants/create"],
          icon: Calculator,
        },
        {
          id: "tenant-provisioning",
          label: t("master.shell.sidebar.provisioning"),
          path: "/admin/tenants/provisioning",
          activePaths: ["/admin/tenants/provisioning"],
          icon: Sliders,
        },
      ],
    },
    {
      type: "group",
      id: "commerce",
      label: t("master.shell.sidebar.commerceGroup"),
      icon: CreditCard,
      children: [
        {
          id: "contracts",
          label: t("master.shell.sidebar.contracts"),
          path: "/admin/contracts",
          activePaths: ["/admin/contracts", "/admin/contracts/create"],
          icon: FileSignature,
        },
        {
          id: "invoices",
          label: t("master.shell.sidebar.invoices"),
          path: "/admin/invoices",
          activePaths: ["/admin/invoices"],
          icon: ReceiptText,
        },
        {
          id: "subscriptions",
          label: t("master.shell.sidebar.saasPlans"),
          path: "/admin/subscriptions/plans",
          activePaths: ["/admin/subscriptions/plans", "/admin/subscriptions/create"],
          icon: CreditCard,
        },
        {
          id: "allocations",
          label: t("master.shell.sidebar.allocations"),
          path: "/admin/subscriptions/allocations",
          activePaths: ["/admin/subscriptions/allocations"],
          icon: ArrowUpDown,
        },
      ],
    },
    {
      type: "group",
      id: "system",
      label: t("master.shell.sidebar.systemGroup"),
      icon: ShieldCheck,
      children: [
        {
          id: "logs",
          label: t("master.shell.sidebar.logs"),
          path: "/admin/system/logs",
          activePaths: ["/admin/system/logs"],
          icon: FileText,
        },
        {
          id: "ai-usage",
          label: t("master.shell.sidebar.aiUsage"),
          path: "/admin/system/ai-usage",
          activePaths: ["/admin/system/ai-usage"],
          icon: BrainCircuit,
        },
        {
          id: "ai-quotas",
          label: t("master.shell.sidebar.aiQuotas"),
          path: "/admin/system/ai-quotas",
          activePaths: ["/admin/system/ai-quotas"],
          icon: Sliders,
        },
        {
          id: "ai-config",
          label: t("master.shell.sidebar.aiConfig"),
          path: "/admin/system/ai-config",
          activePaths: ["/admin/system/ai-config"],
          icon: Cpu,
        },
      ],
    },
  ], [tenants.length, t]);

  // Determine which group is active according to the current location.pathname
  const activeGroupId = useMemo(() => {
    for (const entry of navEntries) {
      if (entry.type === "group") {
        const hasActiveChild = entry.children.some(
          (c) => c.activePaths?.includes(location.pathname) || location.pathname === c.path
        );
        if (hasActiveChild) return entry.id;
      }
    }
    return null;
  }, [navEntries, location.pathname]);

  // Keep track of which groups are open
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    return {
      tenants: true,
      commerce: true,
      system: false,
      account: false,
    };
  });

  // Whenever the active group changes, automatically expand it
  useEffect(() => {
    if (activeGroupId) {
      setOpenGroups((prev) => ({ ...prev, [activeGroupId]: true }));
    }
  }, [activeGroupId]);

  const toggleGroup = (groupId: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  const handleNavigate = (path: string) => {
    navigate(path);
    onMobileClose();
  };

  return (
    <aside
      className={cn(
        "fixed inset-y-0 left-0 z-30 flex w-[260px] flex-col border-r border-slate-200/90 bg-gradient-to-b from-[#f8f9ff] via-[#f2f3fd] to-[#ecedf7] transition-transform duration-200 ease-in-out",
        isMobileOpen ? "translate-x-0 z-50 shadow-2xl" : "-translate-x-full",
        isOpen ? "md:translate-x-0" : "md:-translate-x-full"
      )}
      aria-label={t("master.shell.sidebar.navAria")}
    >
      {/* Brand Header at top of Sidebar (Desktop & Mobile) - seamless with sidebar */}
      <div className="flex h-16 shrink-0 items-center justify-between md:justify-center px-5">
        <button
          type="button"
          onClick={() => handleNavigate("/admin/dashboard")}
          className="group flex items-center text-left focus-visible:outline-none select-none"
        >
          <SmartHireLogo className="h-9" />
        </button>
        <button
          type="button"
          onClick={onMobileClose}
          className="grid size-9 place-items-center rounded-xl text-slate-400 hover:bg-white/70 hover:text-slate-700 md:hidden"
          aria-label={t("master.shell.sidebar.closeNavAria")}
        >
          <X className="size-5" />
        </button>
      </div>

      {/* Navigation List */}
      <nav className="flex-1 overflow-y-auto px-3.5 py-4 space-y-1.5 [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300/50 hover:[&::-webkit-scrollbar-thumb]:bg-slate-400/60">
        {navEntries.map((entry) => {
          if (entry.type === "single") {
            const isActive =
              entry.activePaths?.includes(location.pathname) || location.pathname === entry.path;
            const Icon = entry.icon;
            return (
              <button
                key={entry.id}
                type="button"
                onClick={() => handleNavigate(entry.path)}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all text-left",
                  isActive
                    ? "bg-white text-blue-600 font-semibold shadow-[0_2px_8px_-2px_rgba(37,99,235,0.14)] ring-1 ring-blue-200/70"
                    : "text-slate-600 hover:bg-white/65 hover:text-slate-900"
                )}
              >
                <Icon
                  className={cn(
                    "size-5 shrink-0 transition-colors",
                    isActive ? "text-blue-600" : "text-slate-500 group-hover:text-slate-800"
                  )}
                />
                <span className="truncate flex-1">{entry.label}</span>
              </button>
            );
          }

          // Group with Children (Level 1 with Level 2)
          const isOpenGroup = !!openGroups[entry.id];
          const isAnyChildActive = entry.children.some(
            (c) => c.activePaths?.includes(location.pathname) || location.pathname === c.path
          );
          const GroupIcon = entry.icon;

          return (
            <div key={entry.id} className="pt-1">
              <button
                type="button"
                onClick={() => toggleGroup(entry.id)}
                className={cn(
                  "group flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-colors text-left",
                  isAnyChildActive
                    ? "text-blue-900 font-bold hover:bg-white/50"
                    : "text-slate-600 hover:bg-white/65 hover:text-slate-900"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <GroupIcon
                    className={cn(
                      "size-5 shrink-0 transition-colors",
                      isAnyChildActive ? "text-blue-600" : "text-slate-500 group-hover:text-slate-700"
                    )}
                  />
                  <span className="truncate">{entry.label}</span>
                  {entry.badge !== undefined && (
                    <span className="rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-bold text-slate-600 ring-1 ring-slate-200/80">
                      {entry.badge}
                    </span>
                  )}
                </div>
                <ChevronDown
                  className={cn(
                    "size-4 shrink-0 text-slate-400 transition-transform duration-200",
                    isOpenGroup ? "rotate-180 text-blue-600" : "group-hover:text-slate-600"
                  )}
                />
              </button>

              {/* Level 2 Sub-items (no icons, slightly smaller font) */}
              {isOpenGroup && (
                <div className="mt-0.5 space-y-0.5">
                  {entry.children.map((child) => {
                    const isActive =
                      child.activePaths?.includes(location.pathname) || location.pathname === child.path;

                    return (
                      <button
                        key={child.id}
                        type="button"
                        onClick={() => handleNavigate(child.path)}
                        className={cn(
                          "group flex w-full items-center rounded-xl pl-11 pr-3.5 py-2 text-[13px] font-medium transition-all text-left",
                          isActive
                            ? "bg-white text-blue-600 font-semibold shadow-[0_2px_8px_-2px_rgba(37,99,235,0.14)] ring-1 ring-blue-200/70"
                            : "text-slate-600 hover:bg-white/65 hover:text-slate-900"
                        )}
                      >
                        <span className="truncate flex-1">{child.label}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );
}
