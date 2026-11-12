import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { questionBankApi } from "@/api/tenant/questionBankApi";
import { queryKeys } from "@/lib/query-keys";
import { AssessmentError } from "@/components/ux/assessmentUi";
import { Breadcrumb } from "@/components/ux/Breadcrumb";
import { LoadingState, Skeleton, TableSkeleton } from "@/components/ux/Skeleton";
import { keepPreviousData, TableRefreshBar } from "@/components/ux/TableRefresh";
import { AiQuestionGenerateDialog } from "../components/AiQuestionGenerateDialog";
import { bankQuestionAuthoring } from "../utils/bankQuestionAuthoring";
import { typeMeta, type BankQuestion } from "../constants/excelTemplateMock";
import { questionBankLocalKeys } from "../utils/generalQuestionDraft";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { useEffect, useMemo, useState } from "react";

import { Link, useLocation, useSearchParams } from "react-router-dom";
import {
  Archive,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Copy,
  Download,
  FolderOpen,
  Grid3x3,
  Infinity as InfinityIcon,
  MoreVertical,
  Pencil,
  Search,
  Shield,
  Sparkles,
  Star,
  Table2,
  UserRound,
  X,
} from "lucide-react";

import type { Question, TestStatus } from "@/api/types/assessment";

import { SKILL_CATALOG } from "@/features/tenant/recruiter/jobs/skillCatalog";

import { getTenantIdFromWindow } from "@/lib/tenant";
import { getTenantTheme } from "@/lib/tenantTheme";
import { formatNumber, t as globalT, useLocale, useT, type TranslateFn } from "@/i18n";
import { cn } from "@/lib/utils";
import { toast } from "@/stores/toastStore";

const FAVORITES_KEY = "smarthire.general-question-bank.preview.favorites";
const SKILLS = SKILL_CATALOG.flatMap((group) => group.skills);

type Collection = "all" | "favorites" | "ready" | "pending" | "archived";
type ViewMode = "table" | "cards";
type DrawerTab = "content" | "usage" | "history";
type Difficulty = "easy" | "medium" | "hard";

type BankRow = {
  key: string;
  testId: number;
  testTitle: string;
  testStatus: TestStatus;
  jobId: number;
  jobTitle: string;
  department: string;
  question: Question;
  content?: BankQuestion;
  code: string;
  skills: string[];
  difficulty: Difficulty;
  aiGenerated: boolean;
};

function isAiGenerated(meta: Record<string, unknown> | null | undefined) {
  return meta?.aiGenerated === true || meta?.aiGenerated === "true" || meta?.source === "AI";
}

function getCollections(translate: TranslateFn): { id: Collection; label: string; icon: typeof FolderOpen }[] {
  return [
    { id: "all", label: translate("recruiter.assessments.bank.collections.all"), icon: FolderOpen },
    { id: "favorites", label: translate("recruiter.assessments.bank.collections.favorites"), icon: Star },
    { id: "ready", label: translate("recruiter.assessments.bank.collections.ready"), icon: UserRound },
    { id: "pending", label: translate("recruiter.assessments.bank.collections.pendingGeneral"), icon: ClipboardList },
    { id: "archived", label: translate("recruiter.assessments.bank.collections.archived"), icon: Archive },
  ];
}

function loadFavorites(key: string) {
  try {
    const raw = sessionStorage.getItem(key);
    return new Set<string>(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set<string>();
  }
}

function questionCode(id: number) {
  return `#QB-${String(id).padStart(3, "0")}`;
}

function difficultyOf(points: number): Difficulty {
  if (points <= 5) return "easy";
  if (points <= 15) return "medium";
  return "hard";
}

function difficultyLabel(value: string | null | undefined, points: number): Difficulty {
  const key = (value ?? "").trim().toLowerCase();
  if (key === "easy") return "easy";
  if (key === "medium") return "medium";
  if (key === "hard") return "hard";
  return difficultyOf(points);
}

function skillsOf(text: string, skill: string | null | undefined) {
  const tagged = (skill ?? "").trim();
  if (tagged) return [tagged];
  const haystack = text.toLowerCase();
  const matched = SKILLS.filter((item) => haystack.includes(item.toLowerCase()));
  return matched.slice(0, 4);
}

function statusMeta(status: TestStatus, standalone = false, translate: TranslateFn = globalT) {
  if (status === "PUBLISHED") return { label: translate("recruiter.assessments.bank.status.ready"), dot: "bg-emerald-600", chip: "bg-emerald-100 text-emerald-800" };
  if (status === "DRAFT") return { label: standalone ? translate("recruiter.assessments.bank.status.standalone") : translate("recruiter.assessments.bank.status.draft"), dot: "bg-amber-600", chip: "bg-amber-100 text-amber-900" };
  return { label: translate("recruiter.assessments.bank.status.archived"), dot: "bg-[var(--color-outline)]", chip: "bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)]" };
}

function paginationItems(current: number, total: number): (number | "start-ellipsis" | "end-ellipsis")[] {
  if (total <= 7) return Array.from({ length: total }, (_, index) => index);
  const pages = new Set([0, total - 1, current - 1, current, current + 1]);
  const visible = [...pages].filter((item) => item >= 0 && item < total).sort((a, b) => a - b);
  const items: (number | "start-ellipsis" | "end-ellipsis")[] = [];
  visible.forEach((item, index) => {
    if (index > 0 && item - visible[index - 1] > 1) items.push(index === 1 ? "start-ellipsis" : "end-ellipsis");
    items.push(item);
  });
  return items;
}

function JumpPageInput({
  pageCount,
  onJump,
}: {
  pageCount: number;
  onJump: (page: number) => void;
}) {
  const t = useT();
  const [val, setVal] = useState("");

  const handleCommit = () => {
    const p = parseInt(val, 10);
    if (!isNaN(p) && p >= 1 && p <= pageCount) {
      onJump(p);
      setVal("");
    } else {
      setVal("");
    }
  };

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleCommit();
      }}
      className="inline-flex items-center"
    >
      <input
        type="number"
        min={1}
        max={pageCount}
        placeholder={t("recruiter.assessments.common.pagination.jumpPlaceholder")}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={handleCommit}
        className="h-8 w-11 rounded border border-[var(--color-border-default)] bg-[var(--color-surface-card)] px-1 text-center text-xs font-semibold text-[var(--color-on-surface)] outline-none transition placeholder:text-[var(--color-on-surface-variant)] focus:border-[var(--color-primary)] focus:ring-1 focus:ring-[var(--color-primary)] [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        title={t("recruiter.assessments.common.pagination.jumpTitle", { total: pageCount })}
        aria-label={t("recruiter.assessments.common.pagination.jumpAria")}
      />
    </form>
  );
}

function difficultyClass(level: Difficulty) {
  if (level === "easy") return "bg-emerald-50 text-emerald-700";
  if (level === "hard") return "bg-rose-50 text-rose-700";
  return "bg-amber-50 text-amber-700";
}

function downloadCsv(rows: BankRow[], translate: TranslateFn) {
  const header = [
    translate("recruiter.assessments.bank.csvHeaders.code"),
    translate("recruiter.assessments.bank.csvHeaders.question"),
    translate("recruiter.assessments.bank.csvHeaders.test"),
    translate("recruiter.assessments.bank.csvHeaders.job"),
    translate("recruiter.assessments.bank.csvHeaders.points"),
    translate("recruiter.assessments.bank.csvHeaders.status"),
    translate("recruiter.assessments.bank.csvHeaders.skills"),
  ];
  const body = rows.map((row) => [
    row.code,
    row.question.questionText,
    row.testTitle,
    row.jobTitle,
    String(row.question.points),
    statusMeta(row.testStatus, !row.testId, translate).label,
    row.skills.join("; "),
  ]);
  const csv = [header, ...body]
    .map((line) => line.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = translate("recruiter.assessments.bank.csvFilename");
  link.click();
  URL.revokeObjectURL(url);
}

export function GeneralQuestionBankPage() {
  const userId = useAuthStore(state => state.user?.id);
  const localKeys = questionBankLocalKeys(getTenantIdFromWindow() ?? "acme", userId);
  return <GeneralQuestionBankView key={localKeys.scope} localKeys={localKeys} />;
}

function GeneralQuestionBankView({ localKeys }: { localKeys: ReturnType<typeof questionBankLocalKeys> }) {
  const t = useT();
  const locale = useLocale();
  const collections = getCollections(t);
  const difficultyLabelText = (level: Difficulty) => t(`recruiter.assessments.common.difficulty.${level}`);
  const basePath = "/recruiter/question-bank";
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [questionType, setQuestionType] = useState("QUIZ");
  const workspace = getTenantTheme(getTenantIdFromWindow() ?? "acme").name;
  const [collection, setCollection] = useState<Collection>("all");
  const [query, setQuery] = useState("");
  const [skill, setSkill] = useState("");
  const [sourceFilter, setSourceFilter] = useState<"" | "AI">("");
  const [difficulty, setDifficulty] = useState<Difficulty | "">("");
  const [status, setStatus] = useState<TestStatus | "">("");
  const [sort, setSort] = useState<"latest" | "points" | "text">("latest");
  const [view, setView] = useState<ViewMode>("table");
  const [aiOpen, setAiOpen] = useState(false);
  const initialPage = Math.max(0, Number(searchParams.get("page") ?? 1) - 1 || 0);
  const requestedSize = Number(searchParams.get("size"));
  const [page, setPage] = useState(initialPage);
  const [pageSize, setPageSize] = useState([10, 25, 50].includes(requestedSize) ? requestedSize : 10);
  const [selected, setSelected] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(() => loadFavorites(`${FAVORITES_KEY}:${localKeys.scope}`));
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>("content");
  const [menuKey, setMenuKey] = useState<string | null>(null);

  useEffect(() => {
    if (location.state?.savedQuestions) {
      toast.success(
        t("recruiter.assessments.bank.general.savedSuccessTitle"),
        t("recruiter.assessments.bank.general.savedSuccessDesc", { count: location.state.savedQuestions }),
      );
    }
  }, [location.state?.savedQuestions, t]);

  const client = useQueryClient();
  const favoriteIds = useMemo(() => [...favorites].map(key => Number(key.replace("bank-", ""))).filter(Number.isFinite).sort((a, b) => a - b), [favorites]);
  const apiDifficulty = difficulty === "easy" ? "Easy" : difficulty === "medium" ? "Medium" : difficulty === "hard" ? "Hard" : undefined;
  const bankQuery = useQuery({
    queryKey: [...queryKeys.assessments.all(), "general-bank", page, pageSize, collection, query, skill, apiDifficulty, status, questionType, sourceFilter, sort, favoriteIds],
    queryFn: ({ signal }) => questionBankApi.list({ page, size: pageSize, collection, query: query.trim() || undefined,
      skill: skill || undefined, difficulty: apiDifficulty, status: status || undefined,
      questionType: questionType || undefined, source: sourceFilter || undefined, sort, favoriteIds }, signal),
    placeholderData: keepPreviousData,
  });
  const rows = useMemo<BankRow[]>(() => (bankQuery.data?.items ?? []).map(item => {
    const question = item.question;
    return { key: `bank-${question.id}`, testId: item.testId ?? 0, testTitle: item.testTitle ?? t("recruiter.assessments.bank.general.standaloneTitle"),
      testStatus: item.archived ? "ARCHIVED" : item.testStatus ?? "DRAFT",
      jobId: item.jobId ?? 0, jobTitle: item.jobTitle ?? t("recruiter.assessments.bank.general.generalBankTitle"), department: "",
      question, content: bankQuestionAuthoring(item), code: questionCode(question.id),
      skills: skillsOf(question.questionText, question.skill), difficulty: difficultyLabel(question.difficulty, question.points),
      aiGenerated: isAiGenerated(item.authoringMetadata),
    };
  }), [bankQuery.data, t]);
  const archiveMutation = useMutation({ mutationFn: ({ ids, archived }: { ids: number[]; archived: boolean }) => questionBankApi.archive(ids, archived),
    onSuccess: async () => { setSelected([]); toast.success(t("recruiter.assessments.bank.general.archiveSuccessTitle"), t("recruiter.assessments.bank.general.archiveSuccessDesc")); await client.invalidateQueries({ queryKey: queryKeys.assessments.all() }); } });
  const editPath = (row: BankRow) => row.testId ? `/recruiter/jobs/${row.jobId}/assessments/${row.testId}` : `${basePath}/${row.question.id}/edit`;

  const skillOptions = bankQuery.data?.skills ?? [];
  const total = bankQuery.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const pageRows = rows;
  const visiblePages = paginationItems(page, pageCount);
  const isInitialLoading = bankQuery.isPending && !bankQuery.data;
  const isTableRefreshing = bankQuery.isFetching && bankQuery.isPlaceholderData;
  const readyCount = bankQuery.data?.counts.ready ?? 0;
  const allCount = bankQuery.data?.counts.all ?? 0;
  const coverage = allCount ? Math.round((readyCount / allCount) * 100) : 0;
  const active = rows.find((row) => row.key === activeKey) ?? null;
  const selectedRows = rows.filter((row) => selected.includes(row.key));
  const pageKeys = pageRows.map((row) => row.key);
  const allPageSelected = pageKeys.length > 0 && pageKeys.every((key) => selected.includes(key));

  const goToPage = (nextPage: number) => {
    const target = Math.max(0, Math.min(nextPage, pageCount - 1));
    setPage(target);
    const next = new URLSearchParams(searchParams);
    next.set("page", String(target + 1));
    next.set("size", String(pageSize));
    setSearchParams(next);
  };

  useEffect(() => {
    const paramPage = Math.max(0, Number(searchParams.get("page") ?? 1) - 1 || 0);
    if (paramPage !== page) {
      setPage(paramPage);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!bankQuery.isFetching && total > 0 && page >= pageCount) {
      goToPage(pageCount - 1);
    }
  }, [bankQuery.isFetching, total, page, pageCount]);

  const counts: Record<Collection, number> = bankQuery.data?.counts ?? { all: 0, favorites: 0, ready: 0, pending: 0, archived: 0 };

  const chips = [
    questionType ? {
      id: "type",
      label: t("recruiter.assessments.bank.chipTypePrefix", {
        label: questionType === "MCQ"
          ? t("recruiter.assessments.common.questionTypes.singleChoice")
          : questionType === "MULTIPLE_CHOICE"
            ? t("recruiter.assessments.common.questionTypes.multipleChoice")
            : questionType === "CODING"
              ? t("recruiter.assessments.common.questionTypes.coding")
              : t("recruiter.assessments.common.questionTypes.essay"),
      }),
    } : null,
    skill ? { id: "skill", label: t("recruiter.assessments.bank.chipSkillPrefix", { skill }) } : null,
    difficulty ? { id: "difficulty", label: t("recruiter.assessments.bank.chipDifficultyPrefix", { difficulty: difficultyLabelText(difficulty) }) } : null,
    status ? { id: "status", label: t("recruiter.assessments.bank.chipStatusPrefix", { status: statusMeta(status, false, t).label }) } : null,
    query.trim() ? { id: "query", label: query.trim() } : null,
  ].filter((chip): chip is { id: string; label: string } => chip !== null);

  const clearChip = (id: string) => {
    goToPage(0);
    if (id === "type") setQuestionType("");
    if (id === "skill") setSkill("");
    if (id === "difficulty") setDifficulty("");
    if (id === "status") setStatus("");
    if (id === "query") setQuery("");
  };

  const clearFilters = () => {
    setSkill("");
    setDifficulty("");
    setStatus("");
    setQuery("");
    setQuestionType("");
    setCollection("all");
    goToPage(0);
  };

  const toggleFavorite = (key: string) => {
    setFavorites((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      sessionStorage.setItem(`${FAVORITES_KEY}:${localKeys.scope}`, JSON.stringify([...next]));
      return next;
    });
  };

  const archiveSelected = () => {
    const ids = selectedRows.filter(row => !row.testId).map(row => row.question.id);
    if (ids.length) archiveMutation.mutate({ ids, archived: collection !== "archived" });
  };

  const toggleOne = (key: string) => {
    setSelected((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]));
  };

  const openRow = (key: string) => {
    setActiveKey(key);
    setDrawerTab("content");
    setMenuKey(null);
  };

  return (
    <section className="flex flex-col gap-4 text-[var(--color-on-surface)]">
      <header className="flex flex-col gap-2.5">
        <Breadcrumb
          items={[
            { label: t("recruiter.assessments.bank.general.breadcrumbResources"), to: "/recruiter" },
            { label: t("recruiter.assessments.bank.general.title") },
          ]}
          meta={
            <span className="rounded-full bg-[var(--color-surface-container-high)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-on-surface-variant)]">
              {t("recruiter.assessments.bank.general.workspaceBadge", { name: workspace })}
            </span>
          }
          actions={
            <>
              <Link
                to="/recruiter/question-bank/ai-generator"
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--color-surface-card)] px-3 text-sm font-medium ring-1 ring-[var(--color-border-default)] hover:bg-[var(--color-surface-container-low)]"
              >
                <Sparkles className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
                {t("recruiter.assessments.bank.general.aiGenerateBtn")}
              </Link>
              <Link to={`${basePath}/new`} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--color-surface-card)] px-3 text-sm font-medium ring-1 ring-[var(--color-border-default)]"><Table2 className="size-4 text-[var(--color-primary)]" aria-hidden="true" />{t("recruiter.assessments.bank.general.importExcelBtn")}</Link>
              <Link to={`${basePath}/new`} className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--color-primary)] px-3 text-sm font-semibold text-white hover:bg-[var(--color-primary-hover)]">{t("recruiter.assessments.bank.general.addQuestionBtn")}</Link>
              <button
                type="button"
                onClick={() => downloadCsv(pageRows, t)}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--color-surface-card)] px-3 text-sm font-medium ring-1 ring-[var(--color-border-default)] hover:bg-[var(--color-surface-container-low)]"
              >
                <Download className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
                {t("recruiter.assessments.bank.general.exportCurrentPageBtn")}
              </button>
            </>
          }
        />
        <div className="min-w-0 max-w-3xl">
          <h1 className="text-2xl font-semibold tracking-tight">{t("recruiter.assessments.bank.general.title")}</h1>
          <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
            {t("recruiter.assessments.bank.general.subtitle")}
          </p>
        </div>
      </header>
      <nav aria-label={t("recruiter.assessments.bank.general.groupNavAria")} className="flex flex-wrap gap-2 rounded-xl bg-[var(--color-surface-container-low)] p-1">
        {([
          ["QUIZ", t("recruiter.assessments.common.questionTypes.quiz")],
          ["ESSAY", t("recruiter.assessments.common.questionTypes.essayTheory")],
          ["CODING", t("recruiter.assessments.common.questionTypes.coding")],
        ] as const).map(([type, label]) =>
          <button key={type} type="button" aria-pressed={questionType === type} onClick={() => { setQuestionType(type); goToPage(0); setActiveKey(null); setSelected([]); }}
            className={cn("rounded-lg px-4 py-2 text-sm", questionType === type ? "bg-[var(--color-surface-card)] font-semibold text-[var(--color-primary)] shadow-sm" : "text-[var(--color-on-surface-variant)]")}>{label}</button>)}
      </nav>


      <AssessmentError error={bankQuery.error} retry={() => void bankQuery.refetch()} />
      <AssessmentError error={archiveMutation.error} retry={archiveSelected} />

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-12">
        <aside className="flex flex-col gap-4 xl:col-span-3">
          <div className="rounded-xl bg-[var(--color-surface-card)] p-3 shadow-[var(--shadow-card)]">
            <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">{t("recruiter.assessments.bank.general.systemCollectionsTitle")}</p>
            {collections.map((item) => {
              const Icon = item.icon;
              const activeCollection = collection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { setCollection(item.id); goToPage(0); }}
                  className={cn(
                    "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm transition-colors",
                    activeCollection
                      ? "bg-[var(--color-primary)] font-semibold text-white"
                      : "text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-low)] hover:text-[var(--color-on-surface)]",
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <Icon className={cn("size-4", item.id === "favorites" && !activeCollection && "text-amber-500")} aria-hidden="true" />
                    {item.label}
                  </span>
                  <span className={cn("rounded-full px-2 py-0.5 text-[11px]", activeCollection ? "bg-white/20" : "bg-[var(--color-surface-container)]")}>
                    {counts[item.id]}
                  </span>
                </button>
              );
            })}
            <Link to="/recruiter" className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-[var(--color-surface-container)] px-3 py-2 text-sm font-semibold text-[var(--color-primary)] hover:bg-[var(--color-surface-container-high)]">
              {t("recruiter.assessments.bank.general.manageJobsLink")}
            </Link>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-[var(--color-surface-card)] to-[var(--color-surface-container-low)] p-4 shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">{t("recruiter.assessments.bank.general.classificationTitle")}</h2>
              <Sparkles className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
            </div>
            <p className="mt-2 text-xs leading-5 text-[var(--color-on-surface-variant)]">
              {t("recruiter.assessments.bank.general.coverageDesc", { percent: coverage })}
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--color-surface-container-high)]">
              <div className="h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${coverage}%` }} />
            </div>
            <p className="mt-2 flex justify-between text-[11px] text-[var(--color-on-surface-variant)]">
              <span>{t("recruiter.assessments.bank.general.readyLabel")}</span>
              <span className="font-semibold text-[var(--color-primary)]">{formatNumber(readyCount, undefined, locale)} / {formatNumber(allCount, undefined, locale)}</span>
            </p>
          </div>
        </aside>

        <div className="flex flex-col gap-3 xl:col-span-9">
          <div className="flex flex-col gap-3 rounded-xl bg-[var(--color-surface-card)] p-4 shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-2 rounded-lg bg-[var(--color-surface-container-low)] px-3.5 py-2.5 focus-within:bg-[var(--color-surface-card)] focus-within:ring-2 focus-within:ring-[var(--color-primary)]">
              <Search className="size-5 text-[var(--color-on-surface-variant)]" aria-hidden="true" />
              <input
                value={query}
                onChange={(event) => { setQuery(event.target.value); goToPage(0); }}
                className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--color-outline)]"
                placeholder={t("recruiter.assessments.bank.general.searchPlaceholder")}
                aria-label={t("recruiter.assessments.bank.general.searchAria")}
              />
              {query && (
                <button type="button" aria-label={t("recruiter.assessments.common.actions.clearSearchText")} onClick={() => { setQuery(""); goToPage(0); }} className="text-[var(--color-on-surface-variant)]">
                  <X className="size-4" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-5">
              <label className="flex min-w-0 items-center gap-2 rounded-lg bg-[var(--color-surface-container)] px-3 py-1.5 text-xs">
                <span className="shrink-0 text-[var(--color-on-surface-variant)]">{t("recruiter.assessments.bank.general.skillFilterLabel")}</span>
                <select aria-label={t("recruiter.assessments.bank.general.skillFilterAria")} value={skill} onChange={(event) => { setSkill(event.target.value); goToPage(0); }} className="min-w-0 flex-1 bg-transparent font-semibold text-[var(--color-primary)] outline-none">
                  <option value="">{t("recruiter.assessments.common.all")}</option>
                  {skillOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <div className="flex items-center rounded-lg bg-[var(--color-surface-container)] px-3 py-1.5 text-xs">
                {t("recruiter.assessments.bank.general.typeFilterLabel")} <select aria-label={t("recruiter.assessments.bank.general.typeFilterAria")} value={questionType} onChange={event => { setQuestionType(event.target.value); goToPage(0); }} className="ml-1 min-w-0 bg-transparent"><option value="">{t("recruiter.assessments.common.all")}</option><option value="MCQ">{t("recruiter.assessments.common.questionTypes.singleChoice")}</option><option value="MULTIPLE_CHOICE">{t("recruiter.assessments.common.questionTypes.multipleChoice")}</option><option value="QUIZ">{t("recruiter.assessments.common.questionTypes.quiz")}</option><option value="ESSAY">{t("recruiter.assessments.common.questionTypes.essayTheory")}</option><option value="CODING">{t("recruiter.assessments.common.questionTypes.coding")}</option></select>
              </div>
              <label className="flex min-w-0 items-center gap-2 rounded-lg bg-[var(--color-surface-container)] px-3 py-1.5 text-xs">
                <span className="shrink-0 text-[var(--color-on-surface-variant)]">{t("recruiter.assessments.bank.general.sourceFilterLabel")}</span>
                <select aria-label={t("recruiter.assessments.bank.general.sourceFilterAria")} value={sourceFilter} onChange={event => { setSourceFilter(event.target.value as "" | "AI"); goToPage(0); }} className="min-w-0 flex-1 bg-transparent font-semibold outline-none">
                  <option value="">{t("recruiter.assessments.common.all")}</option>
                  <option value="AI">{t("recruiter.assessments.bank.general.sourceAiOnly")}</option>
                </select>
              </label>
              <label className="flex min-w-0 items-center gap-2 rounded-lg bg-[var(--color-surface-container)] px-3 py-1.5 text-xs">
                <span className="shrink-0 text-[var(--color-on-surface-variant)]">{t("recruiter.assessments.bank.general.difficultyFilterLabel")}</span>
                <select aria-label={t("recruiter.assessments.bank.general.difficultyFilterAria")} value={difficulty} onChange={(event) => { setDifficulty(event.target.value as Difficulty | ""); goToPage(0); }} className="min-w-0 flex-1 bg-transparent font-semibold outline-none">
                  <option value="">{t("recruiter.assessments.common.all")}</option>
                  <option value="easy">{t("recruiter.assessments.common.difficulty.easy")}</option>
                  <option value="medium">{t("recruiter.assessments.common.difficulty.medium")}</option>
                  <option value="hard">{t("recruiter.assessments.common.difficulty.hard")}</option>
                </select>
              </label>
              <label className="flex min-w-0 items-center gap-2 rounded-lg bg-[var(--color-surface-container)] px-3 py-1.5 text-xs">
                <span className="shrink-0 text-[var(--color-on-surface-variant)]">{t("recruiter.assessments.bank.general.statusFilterLabel")}</span>
                <select aria-label={t("recruiter.assessments.bank.general.statusFilterAria")} value={status} onChange={(event) => { setStatus(event.target.value as TestStatus | ""); goToPage(0); }} className="min-w-0 flex-1 bg-transparent font-semibold text-emerald-700 outline-none">
                  <option value="">{t("recruiter.assessments.common.all")}</option>
                  <option value="PUBLISHED">{t("recruiter.assessments.bank.status.ready")}</option>
                  <option value="DRAFT">{t("recruiter.assessments.bank.collections.pendingGeneral")}</option>
                  <option value="ARCHIVED">{t("recruiter.assessments.bank.status.archived")}</option>
                </select>
              </label>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-[var(--color-on-surface-variant)]">{t("recruiter.assessments.common.actions.activeFilters")}</span>
                {chips.length === 0 && <span className="text-[var(--color-on-surface-variant)]">{t("recruiter.assessments.common.none")}</span>}
                {chips.map((chip) => (
                  <button key={chip.id} type="button" onClick={() => clearChip(chip.id)} className="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-container)] px-2.5 py-1 font-medium">
                    {chip.label}
                    <X className="size-3.5" aria-hidden="true" />
                  </button>
                ))}
                {chips.length > 0 && (
                  <button type="button" onClick={clearFilters} className="font-semibold text-[var(--color-primary)] hover:underline">{t("recruiter.assessments.common.actions.clearAllFilters")}</button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex rounded-lg bg-[var(--color-surface-container)] p-0.5">
                  <button type="button" aria-label={t("recruiter.assessments.bank.general.viewTableAria")} aria-pressed={view === "table"} onClick={() => setView("table")} className={cn("rounded-md p-1.5", view === "table" ? "bg-[var(--color-surface-card)] text-[var(--color-primary)] shadow-sm" : "text-[var(--color-on-surface-variant)]")}>
                    <Table2 className="size-4" />
                  </button>
                  <button type="button" aria-label={t("recruiter.assessments.bank.general.viewCardsAria")} aria-pressed={view === "cards"} onClick={() => setView("cards")} className={cn("rounded-md p-1.5", view === "cards" ? "bg-[var(--color-surface-card)] text-[var(--color-primary)] shadow-sm" : "text-[var(--color-on-surface-variant)]")}>
                    <Grid3x3 className="size-4" />
                  </button>
                </div>
                <label className="flex items-center gap-1 text-xs text-[var(--color-on-surface-variant)]">
                  {t("recruiter.assessments.bank.general.sortLabel")}
                  <select value={sort} onChange={(event) => { setSort(event.target.value as typeof sort); goToPage(0); }} className="bg-transparent font-medium text-[var(--color-on-surface)] outline-none">
                    <option value="latest">{t("recruiter.assessments.bank.general.sortLatest")}</option>
                    <option value="points">{t("recruiter.assessments.bank.general.sortPoints")}</option>
                    <option value="text">{t("recruiter.assessments.bank.general.sortText")}</option>
                  </select>
                </label>
              </div>
            </div>
          </div>

          {selected.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-primary)]/25 bg-slate-900 px-4 py-2.5 text-white shadow-lg">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="grid size-6 place-items-center rounded-full bg-[var(--color-primary)] text-xs font-bold">{selected.length}</span>
                {t("recruiter.assessments.bank.general.selectedCount", { count: selected.length })}
                <button type="button" className="text-xs text-[var(--color-primary)] brightness-125 hover:underline" onClick={() => setSelected(pageRows.map((row) => row.key))}>
                  {t("recruiter.assessments.bank.general.selectAllOnPage", { count: pageRows.length })}
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => downloadCsv(selectedRows, t)} className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium hover:bg-white/20">
                  <Download className="size-3.5" /> {t("recruiter.assessments.common.actions.exportFile")}
                </button>
                <button type="button" disabled={archiveMutation.isPending || selectedRows.some(row => !!row.testId)} onClick={archiveSelected} className="inline-flex items-center gap-1.5 rounded-lg bg-rose-400/20 px-3 py-1.5 text-xs font-medium text-rose-100 hover:bg-rose-400/30">
                  <Archive className="size-3.5" /> {collection === "archived" ? t("recruiter.assessments.bank.general.restoreAction") : t("recruiter.assessments.bank.general.archiveAction")}
                </button>
              </div>
            </div>
          )}

          <div className="relative overflow-hidden rounded-xl bg-[var(--color-surface-card)] shadow-[var(--shadow-card)]" aria-busy={isInitialLoading || isTableRefreshing}>
            <TableRefreshBar active={isTableRefreshing} />
            <div className="flex flex-wrap items-center justify-between gap-2 bg-[var(--color-surface-container-low)] px-4 py-2.5 text-xs text-[var(--color-on-surface-variant)]">
              {bankQuery.isPending ? <Skeleton className="h-4 w-52" /> : <p>
                {t("recruiter.assessments.bank.general.showingRange")} <span className="font-semibold text-[var(--color-on-surface)]">{total === 0 ? 0 : page * pageSize + 1} - {Math.min(total, page * pageSize + pageRows.length)}</span> {t("recruiter.assessments.bank.general.ofTotalQuestions", { total })}
                {bankQuery.isFetching && <span role="status"> · {t("recruiter.assessments.common.updatingEllipsis")}</span>}
              </p>}
              
            </div>

            {isInitialLoading && (
              <LoadingState label={t("recruiter.assessments.bank.general.loadingListLabel")} className="overflow-x-auto p-4">
                <TableSkeleton columns={6} rows={Math.min(pageSize, 10)} />
              </LoadingState>
            )}

            {!isInitialLoading && bankQuery.isSuccess && total === 0 && (
              <div className="flex flex-col items-start gap-2 p-8">
                <FolderOpen className="size-8 text-[var(--color-primary)]" aria-hidden="true" />
                <p className="font-semibold">{t("recruiter.assessments.bank.general.emptyTitle")}</p>
                <p className="text-sm text-[var(--color-on-surface-variant)]">{t("recruiter.assessments.bank.general.emptyDesc")}</p>
                <Link to={`${basePath}/new`} className="text-sm font-semibold text-[var(--color-primary)] hover:underline">{t("recruiter.assessments.bank.general.addQuestionBtn")}</Link>
              </div>
            )}

            {!isInitialLoading && view === "table" && pageRows.length > 0 && (
              <div className={cn("overflow-x-auto transition-opacity duration-200", isTableRefreshing && "opacity-60")}>
                <table className="w-full min-w-[860px] table-fixed border-collapse text-left text-sm">
                  <thead>
                    <tr className="bg-[var(--color-surface-container-high)]/40 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                      <th className="w-10 px-3 py-2.5">
                        <input type="checkbox" checked={allPageSelected} aria-label={t("recruiter.assessments.bank.general.selectPageCheckAria")} onChange={() => setSelected((current) => allPageSelected ? current.filter((key) => !pageKeys.includes(key)) : [...new Set([...current, ...pageKeys])])} className="size-4 accent-[var(--color-primary)]" />
                      </th>
                      <th className="w-[42%] px-2 py-2.5">{t("recruiter.assessments.bank.general.colQuestion")}</th>
                      <th className="w-[16%] px-3 py-2.5">{t("recruiter.assessments.bank.general.colSkill")}</th>
                      <th className="w-[16%] px-3 py-2.5">{t("recruiter.assessments.bank.general.colCategory")}</th>
                      <th className="w-[20%] px-3 py-2.5">{t("recruiter.assessments.bank.general.colUsage")}</th>
                      <th className="w-20 px-3 py-2.5 text-right">{t("recruiter.assessments.bank.general.colActions")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-surface-container)]">
                    {pageRows.map((row) => {
                      const meta = statusMeta(row.testStatus, !row.testId, t);
                      const inspected = activeKey === row.key;
                      return (
                        <tr key={row.key} onClick={() => openRow(row.key)} className={cn("cursor-pointer", inspected ? "bg-[var(--color-primary-subtle)]" : "hover:bg-[var(--color-surface-container-low)]")}>
                          <td className="px-3 py-2.5" onClick={(event) => event.stopPropagation()}>
                            <input type="checkbox" checked={selected.includes(row.key)} aria-label={t("recruiter.assessments.bank.general.selectCodeAria", { code: row.code })} onChange={() => toggleOne(row.key)} className="size-4 accent-[var(--color-primary)]" />
                          </td>
                          <td className="px-2 py-2.5">
                            <div className="mb-1 flex min-w-0 items-center gap-2">
                              <span className="shrink-0 font-mono text-[11px] font-bold text-[var(--color-primary)]">{row.code}</span>
                              <span className={cn("inline-flex shrink-0 items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold", meta.chip)}>
                                <span className={cn("size-1.5 rounded-full", meta.dot)} />
                                {meta.label}
                              </span>
                              {row.aiGenerated && (
                                <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--color-primary-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-primary-hover)]">
                                  <Sparkles className="size-3" aria-hidden="true" />
                                  AI
                                </span>
                              )}
                              <span className="truncate text-[11px] text-[var(--color-on-surface-variant)]">
                                {t("recruiter.assessments.bank.general.optionsCount", { count: row.question.options.length })} · {row.question.points} {t("recruiter.assessments.common.pointsUnit")}
                              </span>
                            </div>
                            <p className="truncate font-medium" title={row.question.questionText}>{row.question.questionText}</p>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex min-w-0 items-center gap-1 overflow-hidden">
                              {(row.skills.length ? row.skills : ["MCQ"]).slice(0, 2).map((item) => (
                                <span key={item} className="max-w-24 truncate rounded bg-[var(--color-surface-container)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--color-on-surface-variant)]" title={item}>{item}</span>
                              ))}
                              {row.skills.length > 2 && <span className="shrink-0 text-[11px] text-[var(--color-on-surface-variant)]">+{row.skills.length - 2}</span>}
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <p className="truncate text-xs font-medium">{row.content ? typeMeta(row.content.kind, t).label : t("recruiter.assessments.common.questionTypes.singleChoice")}</p>
                            <span className={cn("mt-0.5 inline-flex rounded px-1.5 py-0.5 text-[10px] font-medium", difficultyClass(row.difficulty))}>{difficultyLabelText(row.difficulty)}</span>
                          </td>
                          <td className="px-3 py-2.5 text-xs text-[var(--color-on-surface-variant)]">
                            <p className="truncate font-medium text-[var(--color-on-surface)]" title={row.testTitle}>{row.testTitle}</p>
                            <p className="mt-0.5 truncate" title={row.jobTitle}>{row.jobTitle}</p>
                          </td>
                          <td className="px-3 py-2.5 text-right" onClick={(event) => event.stopPropagation()}>
                            <div className="relative flex justify-end gap-1 text-[var(--color-on-surface-variant)]">
                              <Link to={editPath(row)} aria-label={t("recruiter.assessments.bank.general.editQuestionAria")} className="rounded p-1 hover:bg-[var(--color-surface-container)] hover:text-[var(--color-primary)]">
                                <Pencil className="size-4" />
                              </Link>
                              <button type="button" aria-label={t("recruiter.assessments.common.actions.moreOptions")} onClick={() => setMenuKey(menuKey === row.key ? null : row.key)} className="rounded p-1 hover:bg-[var(--color-surface-container)]">
                                <MoreVertical className="size-4" />
                              </button>
                              {menuKey === row.key && (
                                <div className="absolute right-0 top-8 z-10 w-40 rounded-lg bg-[var(--color-surface-card)] p-1 text-left text-xs shadow-lg ring-1 ring-[var(--color-border-default)]">
                                  <button type="button" className="flex w-full items-center gap-2 rounded px-2 py-1.5 hover:bg-[var(--color-surface-container-low)]" onClick={() => { void navigator.clipboard.writeText(row.question.questionText); setMenuKey(null); }}>
                                    <Copy className="size-3.5" /> {t("recruiter.assessments.bank.general.copyContent")}
                                  </button>
                                  <button type="button" className="flex w-full items-center gap-2 rounded px-2 py-1.5 hover:bg-[var(--color-surface-container-low)]" onClick={() => { toggleFavorite(row.key); setMenuKey(null); }}>
                                    <Star className="size-3.5" /> {favorites.has(row.key) ? t("recruiter.assessments.bank.general.unfavorite") : t("recruiter.assessments.bank.general.favorite")}
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {!isInitialLoading && view === "cards" && pageRows.length > 0 && (
              <div className={cn("grid gap-3 p-4 md:grid-cols-2 transition-opacity duration-200", isTableRefreshing && "opacity-60")}>
                {pageRows.map((row) => {
                  const meta = statusMeta(row.testStatus, !row.testId, t);
                  return (
                    <button key={row.key} type="button" onClick={() => openRow(row.key)} className="rounded-xl bg-[var(--color-surface-container-low)] p-4 text-left hover:bg-[var(--color-primary-subtle)]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-[var(--color-primary)]">{row.code}</span>
                        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", meta.chip)}>{meta.label}</span>
                      </div>
                      <p className="mt-2 line-clamp-3 text-sm font-semibold">{row.question.questionText}</p>
                      <p className="mt-2 text-xs text-[var(--color-on-surface-variant)]">{row.testTitle} · {row.question.points} {t("recruiter.assessments.common.pointsUnit")}</p>
                    </button>
                  );
                })}
              </div>
            )}

            {!bankQuery.isPending && (
              <div className="flex flex-col items-center justify-between gap-3 bg-[var(--color-surface-container-low)] px-4 py-3 text-sm text-[var(--color-on-surface-variant)] sm:flex-row">
                <label className="flex items-center gap-2">
                  {t("recruiter.assessments.common.pagination.showing")}
                  <select
                    value={pageSize}
                    onChange={(event) => {
                      const nextSize = Number(event.target.value);
                      setPageSize(nextSize);
                      const next = new URLSearchParams(searchParams);
                      next.set("page", "1");
                      next.set("size", String(nextSize));
                      setSearchParams(next);
                      setPage(0);
                    }}
                    className="rounded bg-[var(--color-surface-card)] px-2 py-1 font-semibold text-[var(--color-on-surface)] outline-none"
                  >
                    <option value={10}>{t("recruiter.assessments.common.pagination.rowsPerPage", { size: 10 })}</option>
                    <option value={25}>{t("recruiter.assessments.common.pagination.rowsPerPage", { size: 25 })}</option>
                    <option value={50}>{t("recruiter.assessments.common.pagination.rowsPerPage", { size: 50 })}</option>
                  </select>
                  {t("recruiter.assessments.common.pagination.onTotalResults", { total })}
                </label>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    aria-label={t("recruiter.assessments.common.pagination.prevPage")}
                    disabled={page === 0}
                    onClick={() => goToPage(page - 1)}
                    className="rounded bg-[var(--color-surface-card)] p-1.5 transition hover:bg-[var(--color-surface-container)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  {visiblePages.map((item) =>
                    typeof item === "number" ? (
                      <button
                        key={item}
                        type="button"
                        aria-label={t("recruiter.assessments.common.pagination.pageNumberAria", { page: item + 1 })}
                        aria-current={item === page ? "page" : undefined}
                        disabled={item === page}
                        onClick={() => goToPage(item)}
                        className={cn(
                          "size-8 rounded font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] disabled:cursor-default",
                          item === page
                            ? "bg-[var(--color-primary)] text-white"
                            : "bg-[var(--color-surface-card)] hover:bg-[var(--color-surface-container)] text-[var(--color-on-surface)]"
                        )}
                      >
                        {item + 1}
                      </button>
                    ) : (
                      <JumpPageInput
                        key={item}
                        pageCount={pageCount}
                        onJump={(p) => goToPage(p - 1)}
                      />
                    )
                  )}
                  <button
                    type="button"
                    aria-label={t("recruiter.assessments.common.pagination.nextPageAlt")}
                    disabled={page >= pageCount - 1}
                    onClick={() => goToPage(page + 1)}
                    className="rounded bg-[var(--color-surface-card)] p-1.5 transition hover:bg-[var(--color-surface-container)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {active && (
        <>
          <button type="button" aria-label={t("recruiter.assessments.bank.general.drawerCloseOverlayAria")} className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm" onClick={() => setActiveKey(null)} />
          <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[540px] flex-col bg-[var(--color-surface-card)] shadow-2xl" aria-label={t("recruiter.assessments.bank.general.drawerAria")}>
            <div className="flex items-center justify-between gap-2 bg-[var(--color-surface-container-low)] px-5 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-bold text-[var(--color-primary)]">{active.code}</span>
                <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold", statusMeta(active.testStatus, !active.testId, t).chip)}>
                  <span className={cn("size-1.5 rounded-full", statusMeta(active.testStatus, !active.testId, t).dot)} />
                  {statusMeta(active.testStatus, !active.testId, t).label}
                </span>
              </div>
              <button type="button" aria-label={t("recruiter.assessments.bank.general.drawerCloseAria")} onClick={() => setActiveKey(null)} className="rounded-lg p-1.5 text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)]">
                <X className="size-5" />
              </button>
            </div>
            <div className="flex border-b border-[var(--color-surface-container)] px-3">
              {([
                ["content", t("recruiter.assessments.bank.general.drawerTabContent")],
                ["usage", t("recruiter.assessments.bank.general.drawerTabUsage")],
                ["history", t("recruiter.assessments.bank.general.drawerTabHistory")],
              ] as const).map(([id, label]) => (
                <button key={id} type="button" onClick={() => setDrawerTab(id)} className={cn("px-3 py-3 text-sm", drawerTab === id ? "border-b-2 border-[var(--color-primary)] font-bold text-[var(--color-primary)]" : "font-medium text-[var(--color-on-surface-variant)]")}>
                  {label}
                </button>
              ))}
            </div>
            <div className="flex-1 space-y-5 overflow-y-auto p-5">
              {drawerTab === "content" && (
                <>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">{t("recruiter.assessments.bank.general.promptLabel")}</p>
                    <p className="mt-2 rounded-xl bg-[var(--color-surface-container-low)] p-4 text-sm leading-6">{active.question.questionText}</p>
                  </div>
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">{t("recruiter.assessments.bank.general.optionsLabel")}</p>
                    <ul className="mt-2 space-y-2">
                      {active.question.options.map((option) => (
                        <li key={option.id} className={cn("rounded-xl px-3.5 py-3 text-sm", option.correct ? "bg-emerald-50 text-emerald-950" : "bg-[var(--color-surface-container)]")}>
                          <span className="flex items-start gap-2">
                            {option.correct && <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-700" aria-hidden="true" />}
                            {option.optionText}
                          </span>
                        </li>
                      ))}
                    </ul>
                    {active.content && active.question.questionType === "ESSAY" && <div className="mt-3 space-y-3 text-sm"><p>{t("recruiter.assessments.bank.general.kindPrefix")}{typeMeta(active.content.kind, t).label}</p><p>{t("recruiter.assessments.bank.general.languagePrefix")}{active.content.language || t("recruiter.assessments.common.dash")}</p>{active.content.snippet && <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-[var(--color-surface-container)] p-3">{active.content.snippet}</pre>}<p className="whitespace-pre-wrap">{t("recruiter.assessments.bank.general.sampleAnswerPrefix")}{active.content.sample || t("recruiter.assessments.bank.general.notAvailable")}</p>{active.content.rubric.map(item => <p key={item.level} className="whitespace-pre-wrap">{item.text}</p>)}</div>}
                  </div>
                  {active.question.rubricJson && <div className="space-y-2 rounded-lg bg-[var(--color-surface-container-low)] p-3 text-sm"><h3 className="font-semibold">{t("recruiter.assessments.bank.general.rubricHeading")}</h3><p className="whitespace-pre-wrap">{active.question.rubricJson.referenceAnswer}</p>{active.question.rubricJson.criteria.map((criterion, i) => <p key={i}>{criterion.weight}% · {criterion.description}</p>)}</div>}
                  {active.question.coding && <div className="space-y-2 rounded-lg bg-[var(--color-surface-container-low)] p-3 text-sm"><h3 className="font-semibold">{t("recruiter.assessments.bank.general.codingHeading")}</h3><p>{active.question.coding.category} · {active.question.coding.timeLimitMs} ms · {active.question.coding.memoryMb} MB</p><p>{t("recruiter.assessments.bank.general.codingTestsSummary", { sample: active.question.coding.testCases.filter(test => test.sample).length, hidden: active.question.coding.testCases.filter(test => !test.sample).length })}</p>{Object.entries(active.question.coding.starterCode).map(([language, code]) => <pre key={language} className="overflow-auto whitespace-pre-wrap font-mono text-xs">{language}{"\n"}{code}</pre>)}</div>}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-[var(--color-surface-container)] p-3">
                      <p className="text-[11px] text-[var(--color-on-surface-variant)]">{t("recruiter.assessments.bank.general.pointsCardLabel")}</p>
                      <p className="text-base font-bold">{active.question.points} {t("recruiter.assessments.common.pointsUnit")}</p>
                    </div>
                    <div className="rounded-lg bg-[var(--color-surface-container)] p-3">
                      <p className="text-[11px] text-[var(--color-on-surface-variant)]">{t("recruiter.assessments.bank.general.pointsDifficultyCardLabel")}</p>
                      <p className="text-base font-bold">{difficultyLabelText(active.difficulty)}</p>
                    </div>
                  </div>
                  <div className="rounded-xl bg-[var(--color-surface-container-low)] p-4 text-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">{t("recruiter.assessments.bank.general.classificationCardTitle")}</p>
                    <dl className="mt-3 grid grid-cols-2 gap-3">
                      <div><dt className="text-xs text-[var(--color-on-surface-variant)]">{t("recruiter.assessments.bank.general.groupFieldLabel")}</dt><dd className="font-semibold">{active.department}</dd></div>
                      <div><dt className="text-xs text-[var(--color-on-surface-variant)]">{t("recruiter.assessments.bank.general.jobFieldLabel")}</dt><dd className="font-semibold">{active.jobTitle}</dd></div>
                      <div className="col-span-2">
                        <dt className="text-xs text-[var(--color-on-surface-variant)]">{t("recruiter.assessments.bank.general.detectedSkillsLabel")}</dt>
                        <dd className="mt-1 flex flex-wrap gap-1">
                          {(active.skills.length ? active.skills : [t("recruiter.assessments.bank.general.noKeywordMatch")]).map((item) => (
                            <span key={item} className="rounded bg-[var(--color-surface-card)] px-2 py-0.5 text-xs font-semibold">{item}</span>
                          ))}
                        </dd>
                      </div>
                    </dl>
                  </div>
                  {active.testStatus === "PUBLISHED" && (
                    <div className="flex gap-2 rounded-xl bg-amber-50 p-3.5 text-sm text-amber-950">
                      <Shield className="mt-0.5 size-5 shrink-0 text-amber-600" aria-hidden="true" />
                      <p>{t("recruiter.assessments.bank.general.publishedLockWarning", { title: active.testTitle })}</p>
                    </div>
                  )}
                </>
              )}
              {drawerTab === "usage" && (
                <div className="rounded-xl bg-[var(--color-surface-container-low)] p-4">
                  <p className="text-xs text-[var(--color-on-surface-variant)]">{t("recruiter.assessments.bank.general.usageAssessmentLabel")}</p>
                  <p className="mt-1 font-semibold">{active.testTitle}</p>
                  <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">{active.jobTitle}</p>
                  <Link to={editPath(active)} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-primary)] hover:underline">
                    <InfinityIcon className="size-4" /> {t("recruiter.assessments.bank.general.viewQuestionLink")}
                  </Link>
                </div>
              )}
              {drawerTab === "history" && (
                <p className="text-sm text-[var(--color-on-surface-variant)]">
                  {t("recruiter.assessments.bank.general.noHistoryMessage")}
                </p>
              )}
            </div>
            <div className="border-t border-[var(--color-surface-container)] bg-[var(--color-surface-container-low)] px-5 py-4">
              <div className="mb-2 flex items-center justify-between">
                <button type="button" onClick={() => void navigator.clipboard.writeText(active.question.questionText)} className="inline-flex items-center gap-1 rounded-lg px-2 py-2 text-xs text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)]">
                  <Copy className="size-4" /> {t("recruiter.assessments.common.actions.copy")}
                </button>
                <button type="button" onClick={() => toggleFavorite(active.key)} className="inline-flex items-center gap-1 rounded-lg px-2 py-2 text-xs text-amber-700 hover:bg-amber-50">
                  <Star className={cn("size-4", favorites.has(active.key) && "fill-amber-500")} />
                  {favorites.has(active.key) ? t("recruiter.assessments.bank.general.favorited") : t("recruiter.assessments.bank.general.favorite")}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Link to={editPath(active)} className="rounded-lg bg-[var(--color-surface-card)] px-3 py-2.5 text-center text-sm font-semibold shadow-sm">
                  {t("recruiter.assessments.bank.general.editQuestionBtn")}
                </Link>
                <Link to={basePath} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-3 py-2.5 text-sm font-semibold text-white">
                  <ClipboardList className="size-4" /> {t("recruiter.assessments.bank.general.generalBankBtn")}
                </Link>
              </div>
            </div>
          </aside>
        </>
      )}
      <AiQuestionGenerateDialog
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        defaultSkill={skill}
        defaultType={questionType === "ESSAY" ? "ESSAY" : questionType === "MULTIPLE_CHOICE" ? "MULTIPLE_CHOICE" : questionType === "CODING" ? "CODING" : "MCQ"}
        skillOptions={skillOptions.length ? skillOptions : undefined}
        onSaved={async () => {
          toast.success(t("recruiter.assessments.bank.general.aiSavedToastTitle"), t("recruiter.assessments.bank.general.aiSavedToastDesc"));
          setAiOpen(false);
          setSourceFilter("AI");
          await client.invalidateQueries({ queryKey: queryKeys.assessments.all() });
        }}
      />
    </section>
  );
}
