import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BriefcaseBusiness,
  Building2,
  ChartNoAxesCombined,
  CreditCard,
  House,
  LayoutTemplate,
  Mail,
  Receipt,
  Search,
  ShieldCheck,
  UserRound,
  UserRoundCog,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { companyApi } from "@/api/tenant/companyApi";
import { jobApi } from "@/api/tenant/jobApi";
import { tenantRolesApi } from "@/api/tenant/tenantRolesApi";
import { usersApi } from "@/api/tenant/usersApi";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { formatInvoiceStatusLabel } from "@/features/tenant/admin/billing/utils/billingLabels";
import { formatNumber, useLocale, useT } from "@/i18n";
import { cn } from "@/lib/utils";

type AdminSearchItem = {
  id: string;
  group: "pages" | "users" | "roles" | "jobs" | "invoices";
  title: string;
  subtitle?: string;
  badge?: string;
  to: string;
  icon: LucideIcon;
};

type AdminPageEntry = {
  id: string;
  titleKey: string;
  subtitleKey: string;
  path: string;
  keywords: string;
  icon: LucideIcon;
  quickAccess?: boolean;
};

const ADMIN_PAGES: AdminPageEntry[] = [
  {
    id: "page-overview",
    titleKey: "tenantAdmin.globalSearch.pages.overview.title",
    subtitleKey: "tenantAdmin.globalSearch.pages.overview.subtitle",
    path: "",
    keywords: "tong quan overview dashboard trang chu admin home",
    icon: House,
  },
  {
    id: "page-company",
    titleKey: "tenantAdmin.globalSearch.pages.company.title",
    subtitleKey: "tenantAdmin.globalSearch.pages.company.subtitle",
    path: "/company",
    keywords: "doanh nghiep cong ty ho so thuong hieu logo website dia chi phong ban dia diem company profile directory",
    icon: Building2,
    quickAccess: true,
  },
  {
    id: "page-landing",
    titleKey: "tenantAdmin.globalSearch.pages.landing.title",
    subtitleKey: "tenantAdmin.globalSearch.pages.landing.subtitle",
    path: "/landing-page",
    keywords: "trang tuyen dung landing page career thuong hieu banner hero giao dien cong khai",
    icon: LayoutTemplate,
  },
  {
    id: "page-billing",
    titleKey: "tenantAdmin.globalSearch.pages.billing.title",
    subtitleKey: "tenantAdmin.globalSearch.pages.billing.subtitle",
    path: "/billing",
    keywords: "goi hoa don thanh toan gia han nang cap han muc quota subscription plan dung luong storage ai voice cv parse billing invoice vnpay chuyen khoan",
    icon: CreditCard,
    quickAccess: true,
  },
  {
    id: "page-users",
    titleKey: "tenantAdmin.globalSearch.pages.users.title",
    subtitleKey: "tenantAdmin.globalSearch.pages.users.subtitle",
    path: "/users",
    keywords: "nguoi dung nhan vien thanh vien moi loi moi user member invite khoa tai khoan",
    icon: Users,
    quickAccess: true,
  },
  {
    id: "page-roles",
    titleKey: "tenantAdmin.globalSearch.pages.roles.title",
    subtitleKey: "tenantAdmin.globalSearch.pages.roles.subtitle",
    path: "/roles",
    keywords: "phan quyen vai tro quyen han role permission rbac",
    icon: ShieldCheck,
    quickAccess: true,
  },
  {
    id: "page-recruitment",
    titleKey: "tenantAdmin.globalSearch.pages.recruitment.title",
    subtitleKey: "tenantAdmin.globalSearch.pages.recruitment.subtitle",
    path: "/recruitment",
    keywords: "tuyen dung job da dang ung vien ho so ung tuyen recruitment published candidate",
    icon: BriefcaseBusiness,
    quickAccess: true,
  },
  {
    id: "page-assignments",
    titleKey: "tenantAdmin.globalSearch.pages.assignments.title",
    subtitleKey: "tenantAdmin.globalSearch.pages.assignments.subtitle",
    path: "/recruiter-assignments",
    keywords: "quan ly cong viec phan cong phu trach chu so huu owner assignment recruiter",
    icon: UserRoundCog,
  },
  {
    id: "page-analytics",
    titleKey: "tenantAdmin.globalSearch.pages.analytics.title",
    subtitleKey: "tenantAdmin.globalSearch.pages.analytics.subtitle",
    path: "/analytics",
    keywords: "phan tich thong ke bao cao hieu suat analytics report chart",
    icon: ChartNoAxesCombined,
  },
  {
    id: "page-system",
    titleKey: "tenantAdmin.globalSearch.pages.system.title",
    subtitleKey: "tenantAdmin.globalSearch.pages.system.subtitle",
    path: "/system",
    keywords: "he thong gmail email mail smtp health ha tang redis rabbitmq database",
    icon: Mail,
    quickAccess: true,
  },
  {
    id: "page-account",
    titleKey: "tenantAdmin.globalSearch.pages.account.title",
    subtitleKey: "tenantAdmin.globalSearch.pages.account.subtitle",
    path: "/account",
    keywords: "tai khoan ca nhan bao mat mat khau thong bao account security profile",
    icon: UserRound,
  },
  {
    id: "page-recruiter",
    titleKey: "tenantAdmin.globalSearch.pages.recruiter.title",
    subtitleKey: "tenantAdmin.globalSearch.pages.recruiter.subtitle",
    path: "__RECRUITER__",
    keywords: "workspace tuyen dung nha tuyen dung recruiter",
    icon: BriefcaseBusiness,
  },
];

const GROUP_LABEL_KEYS: Record<AdminSearchItem["group"], string> = {
  pages: "tenantAdmin.globalSearch.groups.pages",
  users: "tenantAdmin.globalSearch.groups.users",
  roles: "tenantAdmin.globalSearch.groups.roles",
  jobs: "tenantAdmin.globalSearch.groups.jobs",
  invoices: "tenantAdmin.globalSearch.groups.invoices",
};

const USER_STATUS_LABEL_KEYS: Record<string, string> = {
  ACTIVE: "tenantAdmin.globalSearch.userStatuses.ACTIVE",
  LOCKED: "tenantAdmin.globalSearch.userStatuses.LOCKED",
  DISABLED: "tenantAdmin.globalSearch.userStatuses.DISABLED",
};

const JOB_STATUS_LABEL_KEYS: Record<string, string> = {
  DRAFT: "tenantAdmin.globalSearch.jobStatuses.DRAFT",
  PUBLISHED: "tenantAdmin.globalSearch.jobStatuses.PUBLISHED",
  PAUSED: "tenantAdmin.globalSearch.jobStatuses.PAUSED",
  CLOSED: "tenantAdmin.globalSearch.jobStatuses.CLOSED",
  ARCHIVED: "tenantAdmin.globalSearch.jobStatuses.ARCHIVED",
};

function normalizeSearchText(value: string): string {
  return value
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function matchesSearchTokens(tokens: string[], ...fields: Array<string | null | undefined>): boolean {
  if (tokens.length === 0) return true;
  const haystack = normalizeSearchText(fields.filter(Boolean).join(" "));
  return tokens.every((token) => haystack.includes(token));
}

export function AdminGlobalSearch({ basePath }: { basePath: string }) {
  const t = useT();
  const locale = useLocale();
  const navigate = useNavigate();
  const location = useLocation();
  const accessToken = useAuthStore((s) => s.accessToken);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const trimmedQuery = query.trim();

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setDebouncedQuery(trimmedQuery);
    }, 200);
    return () => window.clearTimeout(timer);
  }, [trimmedQuery]);

  // Close dropdown on route navigation
  useEffect(() => {
    setIsOpen(false);
  }, [location.pathname, location.search]);

  // Close dropdown on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => document.removeEventListener("mousedown", handlePointerDown);
  }, [isOpen]);

  const shouldSearchEntities = isOpen && !!accessToken && trimmedQuery.length >= 1;

  const usersQuery = useQuery({
    queryKey: ["tenant-users"],
    queryFn: () => usersApi.list(),
    enabled: shouldSearchEntities,
    staleTime: 60_000,
  });

  const rolesQuery = useQuery({
    queryKey: ["tenant-roles"],
    queryFn: tenantRolesApi.list,
    enabled: shouldSearchEntities,
    staleTime: 60_000,
  });

  const subscriptionQuery = useQuery({
    queryKey: ["tenant-subscription-quota"],
    queryFn: companyApi.getSubscription,
    enabled: shouldSearchEntities,
    staleTime: 60_000,
  });

  const jobsQuery = useQuery({
    queryKey: ["admin-global-search-jobs", debouncedQuery],
    queryFn: () => jobApi.search({ q: debouncedQuery, page: 0, size: 6, scope: "all" }),
    enabled: isOpen && !!accessToken && debouncedQuery.length >= 2,
    staleTime: 30_000,
  });

  const normalizedQuery = normalizeSearchText(trimmedQuery);
  const tokens = useMemo(
    () => (normalizedQuery ? normalizedQuery.split(" ").filter(Boolean) : []),
    [normalizedQuery],
  );

  const results = useMemo<AdminSearchItem[]>(() => {
    const resolvePageTarget = (path: string) =>
      path === "__RECRUITER__" ? "/recruiter" : `${basePath}${path}`;
    const resolveStatusLabel = (status: string, keys: Record<string, string>) => {
      const key = keys[status];
      return key ? t(key) : status;
    };

    if (tokens.length === 0) {
      return ADMIN_PAGES.filter((page) => page.quickAccess).map((page) => ({
        id: page.id,
        group: "pages",
        title: t(page.titleKey),
        subtitle: t(page.subtitleKey),
        to: resolvePageTarget(page.path),
        icon: page.icon,
      }));
    }

    const pageItems: AdminSearchItem[] = ADMIN_PAGES.filter((page) =>
      matchesSearchTokens(tokens, t(page.titleKey), t(page.subtitleKey), page.keywords),
    )
      .slice(0, 5)
      .map((page) => ({
        id: page.id,
        group: "pages",
        title: t(page.titleKey),
        subtitle: t(page.subtitleKey),
        to: resolvePageTarget(page.path),
        icon: page.icon,
      }));

    const userItems: AdminSearchItem[] = (usersQuery.data?.data ?? [])
      .filter((member) => member.role !== "CANDIDATE" && member.workspace !== "CANDIDATE")
      .filter((member) => {
        const status = member.status ?? "ACTIVE";
        return matchesSearchTokens(
          tokens,
          member.fullName,
          member.email,
          member.role,
          resolveStatusLabel(status, USER_STATUS_LABEL_KEYS),
          status,
        );
      })
      .slice(0, 5)
      .map((member) => {
        const status = member.status ?? "ACTIVE";
        return {
          id: `user-${member.id}`,
          group: "users",
          title: member.fullName,
          subtitle: member.email,
          badge: `${member.role} · ${resolveStatusLabel(status, USER_STATUS_LABEL_KEYS)}`,
          to: `${basePath}/users?q=${encodeURIComponent(member.email)}&userId=${member.id}`,
          icon: Users,
        };
      });

    const roleItems: AdminSearchItem[] = (rolesQuery.data?.data?.roles ?? [])
      .filter((role) => role.workspace === "RECRUITER")
      .filter((role) => matchesSearchTokens(tokens, role.name, role.code))
      .slice(0, 4)
      .map((role) => ({
        id: `role-${role.id}`,
        group: "roles",
        title: role.name,
        subtitle: t("tenantAdmin.globalSearch.roleCodeSubtitle", { code: role.code }),
        badge: role.system
          ? t("tenantAdmin.globalSearch.roleSystemBadge")
          : t("tenantAdmin.globalSearch.roleCustomBadge"),
        to: `${basePath}/roles?role=${encodeURIComponent(role.code)}`,
        icon: ShieldCheck,
      }));

    const jobItems: AdminSearchItem[] = (jobsQuery.data?.data?.items ?? [])
      .slice(0, 5)
      .map((job) => ({
        id: `job-${job.id}`,
        group: "jobs",
        title: job.title,
        subtitle:
          [job.department, job.location].filter(Boolean).join(" · ") ||
          t("tenantAdmin.globalSearch.defaultJobSubtitle"),
        badge: resolveStatusLabel(job.status, JOB_STATUS_LABEL_KEYS),
        to:
          job.status === "PUBLISHED"
            ? `${basePath}/recruitment?jobId=${job.id}`
            : `${basePath}/recruiter-assignments?jobId=${job.id}&q=${encodeURIComponent(job.title)}`,
        icon: BriefcaseBusiness,
      }));

    const invoiceItems: AdminSearchItem[] = (subscriptionQuery.data?.data?.invoices ?? [])
      .filter((inv) =>
        matchesSearchTokens(tokens, inv.invoiceNumber, inv.planName, inv.status, inv.notes),
      )
      .slice(0, 4)
      .map((inv) => ({
        id: `invoice-${inv.id}`,
        group: "invoices",
        title: `#${inv.invoiceNumber}`,
        subtitle: [
          inv.planName || t("tenantAdmin.globalSearch.defaultInvoiceSubtitle"),
          `${formatNumber(Number(inv.amount || 0), undefined, locale)}${t("tenantAdmin.globalSearch.priceYearlySuffix")}`,
        ].join(" · "),
        badge: formatInvoiceStatusLabel(inv.status, t),
        to: `${basePath}/billing?invoice=${encodeURIComponent(inv.invoiceNumber)}`,
        icon: Receipt,
      }));

    return [...pageItems, ...userItems, ...roleItems, ...jobItems, ...invoiceItems];
  }, [
    basePath,
    tokens,
    t,
    locale,
    usersQuery.data?.data,
    rolesQuery.data?.data?.roles,
    jobsQuery.data?.data?.items,
    subscriptionQuery.data?.data?.invoices,
  ]);

  useEffect(() => {
    setActiveIndex(0);
  }, [trimmedQuery, results.length]);

  const groupedResults = useMemo(() => {
    const groups: Array<{ group: AdminSearchItem["group"]; label: string; items: AdminSearchItem[] }> = [];
    for (const item of results) {
      let existing = groups.find((g) => g.group === item.group);
      if (!existing) {
        existing = { group: item.group, label: t(GROUP_LABEL_KEYS[item.group]), items: [] };
        groups.push(existing);
      }
      existing.items.push(item);
    }
    return groups;
  }, [results, t]);

  const selectItem = (item: AdminSearchItem) => {
    setIsOpen(false);
    navigate(item.to);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!trimmedQuery) {
      setIsOpen(true);
      inputRef.current?.focus();
      return;
    }
    const target = results[activeIndex] ?? results[0];
    if (target) {
      selectItem(target);
      return;
    }
    setIsOpen(true);
  };

  const handleKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      if (isOpen) {
        event.preventDefault();
        setIsOpen(false);
      } else if (query) {
        event.preventDefault();
        setQuery("");
      }
      return;
    }

    if (!isOpen && (event.key === "ArrowDown" || event.key === "ArrowUp")) {
      setIsOpen(true);
      return;
    }

    if (results.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((prev) => (prev + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((prev) => (prev - 1 + results.length) % results.length);
    }
  };

  const isLoadingEntities =
    trimmedQuery.length >= 1 &&
    (usersQuery.isFetching ||
      rolesQuery.isFetching ||
      subscriptionQuery.isFetching ||
      (debouncedQuery.length >= 2 && jobsQuery.isFetching));

  return (
    <div ref={containerRef} className="relative min-w-0 w-full">
      <form className="relative min-w-0 w-full" role="search" onSubmit={handleSubmit}>
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-[var(--color-outline)]"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          data-search-input
          name="admin-search"
          type="search"
          autoComplete="off"
          value={query}
          onFocus={() => setIsOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder={t("tenantAdmin.globalSearch.placeholder")}
          aria-label={t("tenantAdmin.globalSearch.inputAria")}
          aria-expanded={isOpen}
          aria-controls="admin-global-search-results"
          aria-autocomplete="list"
          className={cn(
            "min-h-10 w-full rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-alt)] py-1.5 pl-10 text-sm text-[var(--color-on-surface)] outline-none transition-colors placeholder:text-[var(--color-outline)] focus:border-brand-primary focus:bg-white focus:ring-2 focus:ring-brand-primary/15",
            query ? "pr-28" : "pr-20",
          )}
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setDebouncedQuery("");
              setIsOpen(true);
              inputRef.current?.focus();
            }}
            aria-label={t("tenantAdmin.globalSearch.clearAria")}
            className="absolute right-[4.85rem] top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-md text-[var(--color-outline)] transition-colors hover:bg-slate-200/70 hover:text-[var(--color-on-surface)]"
          >
            <X className="size-3.5" aria-hidden="true" />
          </button>
        )}
        <button
          type="submit"
          className="absolute right-1.5 top-1/2 min-h-7 -translate-y-1/2 rounded-lg bg-brand-primary px-3 text-xs font-semibold text-[var(--color-on-primary)] transition-colors hover:bg-brand-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-brand-primary"
        >
          {t("tenantAdmin.globalSearch.submitBtn")}
        </button>
      </form>

      {isOpen && (
        <div
          id="admin-global-search-results"
          role="listbox"
          aria-label={t("tenantAdmin.globalSearch.resultsAria")}
          className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 max-h-[min(70vh,28rem)] overflow-y-auto rounded-2xl border border-[var(--color-border-default)] bg-white p-2 shadow-[0_20px_50px_-16px_rgba(15,23,42,0.28)]"
        >
          {results.length > 0 ? (
            <div className="space-y-2">
              {!trimmedQuery && (
                <p className="px-3 pt-1 text-[11px] font-medium text-[var(--color-on-surface-variant)]">
                  {t("tenantAdmin.globalSearch.emptyHint")}
                </p>
              )}
              {groupedResults.map((group) => (
                <div key={group.group}>
                  <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--color-outline)]">
                    {group.label}
                  </p>
                  <ul className="space-y-0.5">
                    {group.items.map((item) => {
                      const flatIdx = results.findIndex((r) => r.id === item.id);
                      const isActive = flatIdx === activeIndex;
                      const Icon = item.icon;
                      return (
                        <li key={item.id} role="option" aria-selected={isActive}>
                          <button
                            type="button"
                            onMouseEnter={() => setActiveIndex(flatIdx)}
                            onClick={() => selectItem(item)}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left transition-colors",
                              isActive
                                ? "bg-[var(--color-primary-soft)] text-brand-primary"
                                : "text-[var(--color-on-surface)] hover:bg-[var(--color-surface-alt)]",
                            )}
                          >
                            <span
                              className={cn(
                                "grid size-8 shrink-0 place-items-center rounded-lg border",
                                isActive
                                  ? "border-brand-primary/25 bg-white text-brand-primary"
                                  : "border-[var(--color-border-default)] bg-[var(--color-surface-alt)] text-[var(--color-on-surface-variant)]",
                              )}
                            >
                              <Icon className="size-4" aria-hidden="true" />
                            </span>
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold">{item.title}</span>
                              {item.subtitle && (
                                <span className="block truncate text-xs text-[var(--color-on-surface-variant)]">
                                  {item.subtitle}
                                </span>
                              )}
                            </span>
                            {item.badge && (
                              <span className="shrink-0 rounded-md border border-[var(--color-border-default)] bg-white px-2 py-0.5 text-[11px] font-medium text-[var(--color-on-surface-variant)]">
                                {item.badge}
                              </span>
                            )}
                            <ArrowRight
                              className={cn(
                                "size-3.5 shrink-0 transition-opacity",
                                isActive ? "opacity-100" : "opacity-0",
                              )}
                              aria-hidden="true"
                            />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
              {isLoadingEntities && (
                <p className="px-3 py-1.5 text-xs text-[var(--color-on-surface-variant)]">
                  {t("tenantAdmin.globalSearch.loadingMore")}
                </p>
              )}
            </div>
          ) : isLoadingEntities ? (
            <div className="px-4 py-6 text-center text-sm text-[var(--color-on-surface-variant)]">
              {t("tenantAdmin.globalSearch.searchingFor", { query: trimmedQuery })}
            </div>
          ) : (
            <div className="space-y-3 px-4 py-5 text-center">
              <p className="text-sm font-medium text-[var(--color-on-surface)]">
                {t("tenantAdmin.globalSearch.noResultsFor", { query: trimmedQuery })}
              </p>
              <p className="text-xs text-[var(--color-on-surface-variant)]">
                {t("tenantAdmin.globalSearch.noResultsHint")}
              </p>
              <div className="flex flex-wrap justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    navigate(`${basePath}/users?q=${encodeURIComponent(trimmedQuery)}`);
                  }}
                  className="rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-alt)] px-3 py-1.5 text-xs font-semibold text-[var(--color-on-surface)] hover:border-brand-primary/40 hover:text-brand-primary"
                >
                  {t("tenantAdmin.globalSearch.searchInUsers")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    navigate(`${basePath}/recruiter-assignments?q=${encodeURIComponent(trimmedQuery)}`);
                  }}
                  className="rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-alt)] px-3 py-1.5 text-xs font-semibold text-[var(--color-on-surface)] hover:border-brand-primary/40 hover:text-brand-primary"
                >
                  {t("tenantAdmin.globalSearch.searchInJobs")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

