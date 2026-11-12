import { useRecruitmentJob } from "../../jobs/components/JobRecruitmentWorkspace";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import {
  Archive,
  ArrowUpDown,
  Bot,
  Briefcase,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
  Clock,
  Copy,
  Download,
  Eye,
  FolderOpen,
  Grid3x3,
  Infinity as InfinityIcon,
  Loader2,
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
import { questionBankApi } from "@/api/tenant/questionBankApi";
import { AiQuestionGenerateDialog } from "../components/AiQuestionGenerateDialog";
import { bankQuestionAuthoring } from "../utils/bankQuestionAuthoring";
import { typeMeta, type BankQuestion as BankQuestionAuthoring } from "../constants/excelTemplateMock";
import type { Question, TestStatus } from "@/api/types/assessment";
import { AssessmentError } from "@/components/ux/assessmentUi";
import { AssessmentSubNav } from "../components/AssessmentSubNav";
import { Skeleton } from "@/components/ux/Skeleton";
import { keepPreviousForScope, TableRefreshBar } from "@/components/ux/TableRefresh";
import { Tooltip } from "@/components/ux/Tooltip";
import { SKILL_CATALOG } from "@/features/tenant/recruiter/jobs/skillCatalog";
import { queryKeys } from "@/lib/query-keys";


import { compareLocaleText, formatNumber, t as globalT, useLocale, useT, type TranslateFn } from "@/i18n";
import { cn } from "@/lib/utils";
import { toast } from "@/stores/toastStore";

const FAVORITES_KEY = "smarthire.question-bank.favorites";
const SKILLS = SKILL_CATALOG.flatMap((group) => group.skills);

type Collection = "all" | "favorites" | "ready" | "pending" | "archived";
type ViewMode = "table" | "cards";
type DrawerTab = "content" | "usage" | "history";
type Difficulty = "easy" | "medium" | "hard";

type BankRow = {
  key: string;
  testId: number | null;
  testTitle: string;
  testStatus: TestStatus;
  jobId: number | null;
  jobTitle: string;
  department: string;
  question: Question;
  content: BankQuestionAuthoring | null;
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
    { id: "pending", label: translate("recruiter.assessments.bank.collections.pendingJob"), icon: ClipboardList },
    { id: "archived", label: translate("recruiter.assessments.bank.collections.archived"), icon: Archive },
  ];
}

function normalizeDifficultyParam(raw: string | null): Difficulty | "" {
  if (!raw) return "";
  if (raw === "easy" || raw === "Cơ bản") return "easy";
  if (raw === "medium" || raw === "Vận dụng") return "medium";
  if (raw === "hard" || raw === "Nâng cao") return "hard";
  return "";
}

function loadFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return new Set<string>(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set<string>();
  }
}

function typeLabel(type: string | undefined, translate: TranslateFn = globalT): string {
  if (!type) return translate("recruiter.assessments.common.questionTypes.singleChoice");
  const t = type.toUpperCase();
  if (t === "MCQ") return translate("recruiter.assessments.common.questionTypes.singleChoice");
  if (t === "MULTIPLE_CHOICE") return translate("recruiter.assessments.common.questionTypes.multipleChoice");
  if (t === "QUIZ") return translate("recruiter.assessments.common.questionTypes.quiz");
  if (t === "CODING") return translate("recruiter.assessments.common.questionTypes.coding");
  if (t === "ESSAY") return translate("recruiter.assessments.common.questionTypes.essayTheory");
  return type;
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

function statusMeta(status: TestStatus, translate: TranslateFn = globalT) {
  if (status === "PUBLISHED") return { label: translate("recruiter.assessments.bank.status.ready"), dot: "bg-emerald-600", chip: "bg-emerald-100 text-emerald-800" };
  if (status === "DRAFT") return { label: translate("recruiter.assessments.bank.status.pendingApproval"), dot: "bg-amber-600", chip: "bg-amber-100 text-amber-900" };
  return { label: translate("recruiter.assessments.bank.status.archived"), dot: "bg-[var(--color-outline)]", chip: "bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)]" };
}

function difficultyClass(level: Difficulty) {
  if (level === "easy") return "bg-emerald-100/70 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-0";
  if (level === "hard") return "bg-rose-100/70 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-0";
  return "bg-amber-100/70 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-0";
}

function downloadCsv(rows: BankRow[], translate: TranslateFn) {
  const header = [
    translate("recruiter.assessments.bank.csvHeaders.code"),
    translate("recruiter.assessments.bank.csvHeaders.question"),
    translate("recruiter.assessments.bank.csvHeaders.test"),
    translate("recruiter.assessments.bank.csvHeaders.job"),
    translate("recruiter.assessments.bank.csvHeaders.questionType"),
    translate("recruiter.assessments.bank.csvHeaders.points"),
    translate("recruiter.assessments.bank.csvHeaders.status"),
    translate("recruiter.assessments.bank.csvHeaders.skills"),
  ];
  const body = rows.map((row) => [
    row.code,
    row.question.questionText,
    row.testTitle,
    row.jobTitle,
    row.content ? typeMeta(row.content.kind, translate).label : translate("recruiter.assessments.common.questionTypes.singleChoice"),
    String(row.question.points),
    statusMeta(row.testStatus, translate).label,
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

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100] as const;

function getPaginationItems(current: number, total: number): (number | "ellipsis-start" | "ellipsis-end")[] {
  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const showStartEllipsis = current > 4;
  const showEndEllipsis = current < total - 3;

  if (!showStartEllipsis && showEndEllipsis) {
    return [1, 2, 3, 4, 5, "ellipsis-end", total];
  }

  if (showStartEllipsis && !showEndEllipsis) {
    return [1, "ellipsis-start", total - 4, total - 3, total - 2, total - 1, total];
  }

  return [1, "ellipsis-start", current - 1, current, current + 1, "ellipsis-end", total];
}

function QuestionTableRowsSkeleton({ rows = 10 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, index) => (
        <tr key={index} className="border-b border-slate-100 dark:border-slate-800/60" aria-hidden="true">
          <td className="w-10 px-3 py-3">
            <Skeleton className="size-4 rounded" />
          </td>
          <td className="px-3 py-3 max-w-0 overflow-hidden">
            <div className="flex items-center gap-2">
              <Skeleton className="h-4 w-16 rounded" />
              <Skeleton className="h-4 w-24 rounded" />
              <Skeleton className="ml-auto h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="mt-2 h-4 w-4/5 rounded" />
            <Skeleton className="mt-1.5 h-3.5 w-3/5 rounded" />
          </td>
          <td className="w-36 px-3 py-3">
            <div className="flex flex-wrap items-center gap-1">
              <Skeleton className="h-5 w-14 rounded-full" />
              <Skeleton className="h-5 w-12 rounded-full" />
            </div>
          </td>
          <td className="w-24 px-3 py-3">
            <Skeleton className="h-5 w-16 rounded-full" />
          </td>
          <td className="w-24 px-2 py-3 text-center">
            <div className="flex items-center justify-center gap-0.5">
              <Skeleton className="size-7 rounded-lg" />
              <Skeleton className="size-7 rounded-lg" />
              <Skeleton className="size-7 rounded-lg" />
            </div>
          </td>
        </tr>
      ))}
    </>
  );
}

function QuestionCardsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-3.5 p-4 md:grid-cols-2" aria-hidden="true">
      {Array.from({ length: count }, (_, index) => (
        <div
          key={index}
          className="flex flex-col justify-between rounded-xl bg-slate-50/60 dark:bg-slate-800/40 p-4 border border-slate-100/80 dark:border-slate-800/50"
        >
          <div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Skeleton className="h-5 w-16 rounded-md" />
                <Skeleton className="h-5 w-16 rounded-full" />
              </div>
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="mt-3 h-4 w-5/6 rounded" />
            <Skeleton className="mt-1.5 h-3.5 w-3/5 rounded" />
          </div>
          <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800/60 pt-2.5">
            <Skeleton className="h-3.5 w-28 rounded" />
            <Skeleton className="h-3.5 w-24 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function QuestionBankPage() {
  const t = useT();
  const locale = useLocale();
  const collections = getCollections(t);
  const difficultyLabelText = (level: Difficulty) => t(`recruiter.assessments.common.difficulty.${level}`);
  const job = useRecruitmentJob();
  const client = useQueryClient();
  const basePath = `/recruiter/jobs/${job.id}/assessments`;


  const [params, setParams] = useSearchParams();

  const requestedPage = Math.max(1, parseInt(params.get("page") || "1", 10) || 1);
  const rawSize = parseInt(params.get("limit") || params.get("size") || "10", 10);
  const requestedSize = (PAGE_SIZE_OPTIONS as readonly number[]).includes(rawSize) ? rawSize : 10;
  const requestedTab = (params.get("tab") as Collection) ?? "all";
  const initialCollection: Collection = ["all", "favorites", "ready", "pending", "archived"].includes(requestedTab) ? requestedTab : "all";
  const requestedQ = params.get("q") ?? "";
  const requestedSkill = params.get("skill") ?? "";
  const initialDifficulty: Difficulty | "" = normalizeDifficultyParam(params.get("difficulty"));
  const requestedStatus = (params.get("status") as TestStatus | "") ?? "";
  const initialStatus: TestStatus | "" = ["PUBLISHED", "DRAFT", "ARCHIVED"].includes(requestedStatus) ? requestedStatus : "";
  const requestedSort = (params.get("sort") as "latest" | "points" | "text") ?? "latest";
  const initialSort: "latest" | "points" | "text" = ["latest", "points", "text"].includes(requestedSort) ? requestedSort : "latest";
  const requestedView = (params.get("view") as ViewMode) ?? "table";
  const initialView: ViewMode = requestedView === "cards" ? "cards" : "table";
  const requestedAiOnly = params.get("aiOnly") === "true";

  const [collection, setCollection] = useState<Collection>(initialCollection);
  const [query, setQuery] = useState(requestedQ);
  const [skill, setSkill] = useState(requestedSkill);
  const [questionType, setQuestionType] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty | "">(initialDifficulty);
  const [status, setStatus] = useState<TestStatus | "">(initialStatus);
  const [sort, setSort] = useState<"latest" | "points" | "text">(initialSort);
  const [view, setView] = useState<ViewMode>(initialView);
  const [page, setPage] = useState(requestedPage);
  const [pageSize, setPageSize] = useState(requestedSize);
  const [aiOnly, setAiOnly] = useState(requestedAiOnly);
  const [isTableTransitioning, setIsTableTransitioning] = useState(false);
  const [jumpInput, setJumpInput] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(loadFavorites);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>("content");
  const [menuKey, setMenuKey] = useState<string | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<"skill" | "type" | "difficulty" | "sort" | "export" | null>(null);
  const [skillSearchQuery, setSkillSearchQuery] = useState("");

  useEffect(() => {
    if (!activeDropdown && !menuKey) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement;
      if (activeDropdown && !target.closest("[data-dropdown-root]")) {
        setActiveDropdown(null);
      }
      if (menuKey && !target.closest("[data-action-menu]")) {
        setMenuKey(null);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setActiveDropdown(null);
        setMenuKey(null);
      }
    };
    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeDropdown, menuKey]);

  // Sync state with URL params on browser back/forward
  useEffect(() => {
    const p = Math.max(1, parseInt(params.get("page") || "1", 10) || 1);
    const raw = parseInt(params.get("limit") || params.get("size") || "10", 10);
    const s = (PAGE_SIZE_OPTIONS as readonly number[]).includes(raw) ? raw : 10;
    const tab = (params.get("tab") as Collection) ?? "all";
    const col: Collection = ["all", "favorites", "ready", "pending", "archived"].includes(tab) ? tab : "all";
    const q = params.get("q") ?? "";
    const sk = params.get("skill") ?? "";
    const diff: Difficulty | "" = normalizeDifficultyParam(params.get("difficulty"));
    const st = (params.get("status") as TestStatus | "") ?? "";
    const stat: TestStatus | "" = ["PUBLISHED", "DRAFT", "ARCHIVED"].includes(st) ? st : "";
    const so = (params.get("sort") as "latest" | "points" | "text") ?? "latest";
    const srt: "latest" | "points" | "text" = ["latest", "points", "text"].includes(so) ? so : "latest";
    const vw = (params.get("view") as ViewMode) ?? "table";
    const v: ViewMode = vw === "cards" ? "cards" : "table";
    const ai = params.get("aiOnly") === "true";

    if (p !== page) setPage(p);
    if (s !== pageSize) setPageSize(s);
    if (col !== collection) setCollection(col);
    if (q !== query) setQuery(q);
    if (sk !== skill) setSkill(sk);
    if (diff !== difficulty) setDifficulty(diff);
    if (stat !== status) setStatus(stat);
    if (srt !== sort) setSort(srt);
    if (v !== view) setView(v);
    if (ai !== aiOnly) setAiOnly(ai);
  }, [params]);

  const jobSkills = useMemo(() => job.skills?.map((item) => item.name).filter(Boolean) ?? [], [job.skills]);
  const jobContext = useMemo(() => {
    const parts = [
      t("recruiter.assessments.bank.jobBank.contextJob", { title: job.title }),
      job.department ? t("recruiter.assessments.bank.jobBank.contextDepartment", { department: job.department }) : "",
      jobSkills.length ? t("recruiter.assessments.bank.jobBank.contextSkills", { skills: jobSkills.join(", ") }) : "",
      job.description ? t("recruiter.assessments.bank.jobBank.contextJd", { jd: job.description }) : "",
    ].filter(Boolean);
    return parts.join("\n").slice(0, 1500);
  }, [job, jobSkills, t]);

  const favoriteIds = useMemo(
    () =>
      [...favorites]
        .map((key) => Number(key.split("-").pop()))
        .filter((n) => Number.isFinite(n) && n > 0)
        .sort((a, b) => a - b),
    [favorites]
  );
  const apiDifficulty = difficulty === "easy" ? "Easy" : difficulty === "medium" ? "Medium" : difficulty === "hard" ? "Hard" : undefined;

  const tests = useQuery({
    queryKey: [
      ...queryKeys.assessments.all(),
      "job-bank",
      job.id,
      page,
      pageSize,
      collection,
      query,
      skill,
      apiDifficulty,
      status,
      aiOnly,
      sort,
      favoriteIds,
    ],
    queryFn: ({ signal }) =>
      questionBankApi.list(
        {
          jobId: job.id,
          page: page - 1,
          size: pageSize,
          collection: collection === "all" ? undefined : collection,
          query: query.trim() || undefined,
          skill: skill || undefined,
          difficulty: apiDifficulty,
          status: status || undefined,
          source: aiOnly ? "AI" : undefined,
          sort,
          favoriteIds,
        },
        signal
      ),
    placeholderData: keepPreviousForScope(job.id, 4),
  });
  const isInitialLoading = tests.isPending && !tests.data;
  const isTableRefreshing = tests.isFetching && tests.isPlaceholderData;

  const rows = useMemo<BankRow[]>(() => {
    return (tests.data?.items ?? []).map((item) => ({
      key: item.testId ? `${item.testId}-${item.question.id}` : `bank-${item.question.id}`,
      testId: item.testId,
      testTitle: item.testTitle ?? t("recruiter.assessments.bank.general.generalBankTitle"),
      testStatus: item.archived ? "ARCHIVED" : item.testStatus ?? "DRAFT",
      jobId: item.jobId,
      jobTitle: item.jobTitle ?? t("recruiter.assessments.bank.jobBank.allPositions"),
      department: item.jobId === job.id ? job.department ?? "" : "",
      question: item.question,
      content: bankQuestionAuthoring(item),
      code: questionCode(item.question.id),
      skills: skillsOf(item.question.questionText, item.question.skill),
      difficulty: difficultyLabel(item.question.difficulty, item.question.points),
      aiGenerated: isAiGenerated(item.authoringMetadata),
    }));
  }, [tests.data, job, t]);
  const questionPath = (row: BankRow) => row.testId && row.jobId
    ? `/recruiter/jobs/${row.jobId}/assessments/${row.testId}`
    : `/recruiter/question-bank/${row.question.id}/edit`;

  const skillOptions = useMemo(() => {
    const list = tests.data?.skills ?? [];
    return [...new Set([...jobSkills, ...list])].filter(Boolean).sort((a, b) => compareLocaleText(a, b, locale));
  }, [tests.data?.skills, jobSkills, locale]);

  const filteredSkills = useMemo(() => {
    if (!skillSearchQuery.trim()) return skillOptions;
    const q = skillSearchQuery.toLowerCase();
    return skillOptions.filter((s) => s.toLowerCase().includes(q));
  }, [skillOptions, skillSearchQuery]);

  const questionTypeLabels: Record<string, string> = {
    MCQ: t("recruiter.assessments.common.questionTypes.singleChoice"),
    MULTIPLE_CHOICE: t("recruiter.assessments.common.questionTypes.multipleChoice"),
    QUIZ: t("recruiter.assessments.common.questionTypes.quiz"),
    ESSAY: t("recruiter.assessments.common.questionTypes.essayTheory"),
    CODING: t("recruiter.assessments.common.questionTypes.coding"),
  };

  const totalItems = tests.data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(page, totalPages);
  const startIndex = (currentPage - 1) * pageSize;
  const pageRows = rows;
  const pageItems = useMemo(() => getPaginationItems(currentPage, totalPages), [currentPage, totalPages]);
  const active = rows.find((row) => row.key === activeKey) ?? null;
  const selectedRows = rows.filter((row) => selected.includes(row.key));
  const pageKeys = useMemo(() => pageRows.map((row) => row.key), [pageRows]);
  const allPageSelected = pageKeys.length > 0 && pageKeys.every((key) => selected.includes(key));

  const counts: Record<Collection, number> = {
    all: tests.data?.counts?.all ?? 0,
    favorites: tests.data?.counts?.favorites ?? 0,
    ready: tests.data?.counts?.ready ?? 0,
    pending: tests.data?.counts?.pending ?? 0,
    archived: tests.data?.counts?.archived ?? 0,
  };
  const readyCount = counts.ready;
  const coverage = counts.all ? Math.round((readyCount / counts.all) * 100) : 0;

  // Boundary clamping if totalPages shrinks below current page
  useEffect(() => {
    if (page > totalPages && totalPages > 0) {
      setPage(totalPages);
      const nextParams = new URLSearchParams(params);
      nextParams.set("page", String(totalPages));
      setParams(nextParams, { replace: true });
    }
  }, [totalPages, page, params, setParams]);

  const triggerTableTransition = (action: () => void) => {
    setIsTableTransitioning(true);
    action();
    setTimeout(() => {
      setIsTableTransitioning(false);
    }, 220);
  };

  const goToPage = (nextPage: number, nextSize: number = pageSize) => {
    const calcTotalPages = Math.max(1, Math.ceil(totalItems / nextSize));
    const target = Math.max(1, Math.min(nextPage, calcTotalPages));
    triggerTableTransition(() => {
      setPage(target);
      if (nextSize !== pageSize) {
        setPageSize(nextSize);
      }
      const nextParams = new URLSearchParams(params);
      nextParams.set("page", String(target));
      nextParams.set("limit", String(nextSize));
      nextParams.delete("size");
      setParams(nextParams, { replace: true });
    });
  };

  const updateFilterParams = (updates: Record<string, string | null | undefined>, resetPage = false) => {
    const nextParams = new URLSearchParams(params);
    for (const [key, val] of Object.entries(updates)) {
      if (val === null || val === undefined || val === "") {
        nextParams.delete(key);
      } else {
        nextParams.set(key, val);
      }
    }
    if (resetPage) {
      nextParams.set("page", "1");
      setPage(1);
    }
    nextParams.set("limit", String(pageSize));
    nextParams.delete("size");
    setParams(nextParams, { replace: true });
  };

  const handleCollectionChange = (newCol: Collection) => {
    triggerTableTransition(() => {
      setCollection(newCol);
      updateFilterParams({ tab: newCol === "all" ? null : newCol }, true);
    });
  };

  const handleQueryChange = (newQ: string) => {
    setQuery(newQ);
    updateFilterParams({ q: newQ.trim() ? newQ.trim() : null }, true);
  };

  const handleSkillChange = (newSkill: string) => {
    triggerTableTransition(() => {
      setSkill(newSkill);
      updateFilterParams({ skill: newSkill || null }, true);
    });
  };

  const handleDifficultyChange = (newDiff: Difficulty | "") => {
    triggerTableTransition(() => {
      setDifficulty(newDiff);
      updateFilterParams({ difficulty: newDiff || null }, true);
    });
  };

  const handleStatusChange = (newStat: TestStatus | "") => {
    triggerTableTransition(() => {
      setStatus(newStat);
      updateFilterParams({ status: newStat || null }, true);
    });
  };

  const handleAiOnlyToggle = () => {
    triggerTableTransition(() => {
      const nextVal = !aiOnly;
      setAiOnly(nextVal);
      updateFilterParams({ aiOnly: nextVal ? "true" : null }, true);
    });
  };

  const handleSortChange = (newSort: "latest" | "points" | "text") => {
    triggerTableTransition(() => {
      setSort(newSort);
      updateFilterParams({ sort: newSort === "latest" ? null : newSort });
    });
  };

  const handleViewChange = (newView: ViewMode) => {
    setView(newView);
    updateFilterParams({ view: newView === "table" ? null : newView });
  };

  const chips = [
    questionType
      ? {
          id: "type",
          label: t("recruiter.assessments.bank.chipTypePrefix", {
            label: questionTypeLabels[questionType] ?? t("recruiter.assessments.common.questionTypes.essayTheory"),
          }),
        }
      : null,
    skill ? { id: "skill", label: t("recruiter.assessments.bank.chipSkillPrefix", { skill }) } : null,
    difficulty ? { id: "difficulty", label: t("recruiter.assessments.bank.chipDifficultyPrefix", { difficulty: difficultyLabelText(difficulty) }) } : null,
    status ? { id: "status", label: t("recruiter.assessments.bank.chipStatusPrefix", { status: statusMeta(status, t).label }) } : null,
    query.trim() ? { id: "query", label: t("recruiter.assessments.bank.chipQueryQuoted", { query: query.trim() }) } : null,
  ].filter((chip): chip is { id: string; label: string } => chip !== null);

  const clearChip = (id: string) => {
    if (id === "type") setQuestionType("");
    if (id === "skill") handleSkillChange("");
    if (id === "difficulty") handleDifficultyChange("");
    if (id === "status") handleStatusChange("");
    if (id === "query") handleQueryChange("");
  };

  const clearFilters = () => {
    setQuestionType("");
    triggerTableTransition(() => {
      setSkill("");
      setDifficulty("");
      setStatus("");
      setQuery("");
      setAiOnly(false);
      setCollection("all");
      setPage(1);
      const nextParams = new URLSearchParams(params);
      nextParams.delete("skill");
      nextParams.delete("difficulty");
      nextParams.delete("status");
      nextParams.delete("q");
      nextParams.delete("aiOnly");
      nextParams.delete("tab");
      nextParams.set("page", "1");
      nextParams.set("limit", String(pageSize));
      nextParams.delete("size");
      setParams(nextParams, { replace: true });
    });
  };

  const toggleFavorite = (key: string) => {
    setFavorites((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      localStorage.setItem(FAVORITES_KEY, JSON.stringify([...next]));
      return next;
    });
  };

  const toggleOne = (key: string) => {
    setSelected((current) => (current.includes(key) ? current.filter((item) => item !== key) : [...current, key]));
  };

  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 60);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const openRow = (key: string) => {
    setActiveKey(key);
    setDrawerTab("content");
    setMenuKey(null);
  };

  return (
    <section className="flex flex-col gap-3.5 text-[var(--color-on-surface)]">
      <AssessmentSubNav jobId={job.id} activeTab="bank" />

      <AssessmentError error={tests.error} retry={() => void tests.refetch()} />

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[224px_minmax(0,1fr)]">
        <aside
          className={cn(
            "flex w-full flex-col gap-3 rounded-2xl border bg-white p-3 transition-all duration-300 dark:bg-slate-900",
            "lg:sticky lg:top-[128px] lg:self-start lg:max-h-[calc(100vh-9.5rem)] lg:overflow-y-auto lg:scrollbar-thin",
            isScrolled
              ? "border-slate-300/90 shadow-md shadow-slate-200/60 dark:border-slate-700 dark:shadow-black/40"
              : "border-slate-200/80 shadow-2xs dark:border-slate-800"
          )}
        >
          {/* Widget Độ phủ đề thi - Compact Progress Card */}
          <div
            className={cn(
              "rounded-xl border p-2.5 transition-all duration-300",
              isScrolled
                ? "border-slate-200 bg-white/95 shadow-2xs dark:border-slate-700/80 dark:bg-slate-800/80"
                : "border-slate-100 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-800/40"
            )}
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-700 dark:text-slate-300">{t("recruiter.assessments.bank.jobBank.coverageTitle")}</span>
              <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">{coverage}%</span>
            </div>
            <div className="relative mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, coverage))}%` }}
              />
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              {t("recruiter.assessments.bank.jobBank.readyQuestionsCount", { count: readyCount })}
            </p>
          </div>

          {/* Danh sách Bộ sưu tập hệ thống */}
          <div className="flex flex-col gap-1">
            <p className="px-1 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              {t("recruiter.assessments.bank.general.systemCollectionsTitle")}
            </p>
            <div className="flex flex-col gap-0.5">
              {collections.map((item) => {
                const Icon = item.icon;
                const activeCollection = collection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleCollectionChange(item.id)}
                    className={cn(
                      "flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left text-xs transition-all cursor-pointer",
                      activeCollection
                        ? "bg-[var(--color-primary-soft)] font-bold text-[var(--color-primary-hover)] shadow-2xs"
                        : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-white"
                    )}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <Icon
                        className={cn(
                          "size-3.5 shrink-0",
                          item.id === "favorites" && !activeCollection
                            ? "text-amber-500"
                            : activeCollection
                              ? "text-[var(--color-primary)]"
                              : "text-slate-400"
                        )}
                        aria-hidden="true"
                      />
                      <span className="truncate">{item.label}</span>
                    </span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                        activeCollection
                          ? "bg-[var(--color-primary)]/15 text-[var(--color-primary-hover)]"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                      )}
                    >
                      {isInitialLoading ? "…" : counts[item.id]}
                    </span>
                  </button>
                );
              })}
            </div>
            <Link
              to="/recruiter"
              className="mt-2 flex items-center justify-center gap-1.5 rounded-xl border border-slate-200/80 bg-slate-50/60 px-2.5 py-2 text-xs font-semibold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary-subtle)] hover:border-[var(--color-primary)]/30 dark:border-slate-800 dark:bg-slate-800/60 dark:hover:bg-slate-800"
            >
              {t("recruiter.assessments.bank.general.manageJobsLink")}
            </Link>
          </div>
        </aside>

        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-col gap-2 rounded-2xl border border-slate-200/80 bg-white p-2.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-wrap items-center justify-between gap-2.5">
              {/* Left: Search & Consistent Dropdowns */}
              <div className="flex flex-1 flex-wrap items-center gap-2 min-w-0">
                <div className="relative flex h-9 min-w-[190px] max-w-[260px] flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-3 transition-all focus-within:border-[var(--color-primary)] focus-within:bg-white focus-within:ring-2 focus-within:ring-[var(--color-primary)]/20 dark:border-slate-700 dark:bg-slate-800/60 dark:focus-within:bg-slate-900">
                  <Search className="size-4 shrink-0 text-slate-400" aria-hidden="true" />
                  <input
                    value={query}
                    onChange={(event) => handleQueryChange(event.target.value)}
                    className="w-full bg-transparent text-xs outline-none placeholder:text-slate-400"
                    placeholder={t("recruiter.assessments.bank.jobBank.searchPlaceholder")}
                    aria-label={t("recruiter.assessments.bank.general.searchAria")}
                  />
                  {query && (
                    <button
                      type="button"
                      aria-label={t("recruiter.assessments.common.actions.clearSearchText")}
                      onClick={() => handleQueryChange("")}
                      className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>

                {/* Dropdown Kỹ năng */}
                <div className="relative" data-dropdown-root>
                  <button
                    type="button"
                    onClick={() => setActiveDropdown(activeDropdown === "skill" ? null : "skill")}
                    className={cn(
                      "inline-flex h-9 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-medium transition-all cursor-pointer whitespace-nowrap",
                      skill
                        ? "border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)] text-[var(--color-primary-hover)] font-semibold shadow-2xs"
                        : "border-slate-200 bg-slate-50/60 text-slate-700 hover:bg-slate-100 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200"
                    )}
                    aria-expanded={activeDropdown === "skill"}
                  >
                    <span className="truncate max-w-[110px]">{skill || t("recruiter.assessments.bank.jobBank.allSkills")}</span>
                    <ChevronDown className={cn("size-3.5 text-slate-400 transition-transform", activeDropdown === "skill" && "rotate-180")} />
                  </button>

                  {activeDropdown === "skill" && (
                    <div className="absolute left-0 top-full mt-1.5 z-40 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in-50 zoom-in-95">
                      <div className="relative mb-1.5">
                        <Search className="absolute left-2.5 top-2.5 size-3.5 text-slate-400" />
                        <input
                          value={skillSearchQuery}
                          onChange={(e) => setSkillSearchQuery(e.target.value)}
                          placeholder={t("recruiter.assessments.bank.jobBank.searchSkillPlaceholder")}
                          className="w-full rounded-lg bg-slate-50 dark:bg-slate-800 py-1.5 pl-8 pr-2 text-xs outline-none focus:ring-1 focus:ring-[var(--color-primary)] border border-slate-100 dark:border-slate-700"
                          autoFocus
                        />
                      </div>
                      <div className="max-h-56 overflow-y-auto space-y-0.5 pr-1">
                        <button
                          type="button"
                          onClick={() => {
                            handleSkillChange("");
                            setActiveDropdown(null);
                            setSkillSearchQuery("");
                          }}
                          className={cn(
                            "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left transition-colors cursor-pointer",
                            !skill
                              ? "bg-[var(--color-primary-soft)] font-semibold text-[var(--color-primary-hover)]"
                              : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                          )}
                        >
                          <span>{t("recruiter.assessments.bank.jobBank.allSkills")}</span>
                          {!skill && <Check className="size-3.5 text-[var(--color-primary)]" />}
                        </button>
                        {filteredSkills.map((item) => (
                          <button
                            key={item}
                            type="button"
                            onClick={() => {
                              handleSkillChange(item);
                              setActiveDropdown(null);
                              setSkillSearchQuery("");
                            }}
                            className={cn(
                              "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left transition-colors cursor-pointer",
                              skill === item
                                ? "bg-[var(--color-primary-soft)] font-semibold text-[var(--color-primary-hover)]"
                                : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                            )}
                          >
                            <span className="truncate">{item}</span>
                            {skill === item && <Check className="size-3.5 text-[var(--color-primary)]" />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Dropdown Loại câu */}
                <div className="relative" data-dropdown-root>
                  <button
                    type="button"
                    onClick={() => setActiveDropdown(activeDropdown === "type" ? null : "type")}
                    className={cn(
                      "inline-flex h-9 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-medium transition-all cursor-pointer whitespace-nowrap",
                      questionType
                        ? "border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)] text-[var(--color-primary-hover)] font-semibold shadow-2xs"
                        : "border-slate-200 bg-slate-50/60 text-slate-700 hover:bg-slate-100 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200"
                    )}
                    aria-expanded={activeDropdown === "type"}
                  >
                    <span>{questionTypeLabels[questionType] || t("recruiter.assessments.bank.jobBank.typeLabelDefault")}</span>
                    <ChevronDown className={cn("size-3.5 text-slate-400 transition-transform", activeDropdown === "type" && "rotate-180")} />
                  </button>

                  {activeDropdown === "type" && (
                    <div className="absolute left-0 top-full mt-1.5 z-40 w-52 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in-50 zoom-in-95">
                      {[
                        { value: "", label: t("recruiter.assessments.bank.jobBank.allTypesOption") },
                        { value: "MCQ", label: t("recruiter.assessments.common.questionTypes.singleChoice") },
                        { value: "MULTIPLE_CHOICE", label: t("recruiter.assessments.common.questionTypes.multipleChoice") },
                        { value: "QUIZ", label: t("recruiter.assessments.common.questionTypes.quiz") },
                        { value: "ESSAY", label: t("recruiter.assessments.common.questionTypes.essayTheory") },
                        { value: "CODING", label: t("recruiter.assessments.common.questionTypes.coding") },
                      ].map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => {
                            setQuestionType(item.value);
                            setActiveDropdown(null);
                          }}
                          className={cn(
                            "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left transition-colors cursor-pointer",
                            questionType === item.value
                              ? "bg-[var(--color-primary-soft)] font-semibold text-[var(--color-primary-hover)]"
                              : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                          )}
                        >
                          <span>{item.label}</span>
                          {questionType === item.value && <Check className="size-3.5 text-[var(--color-primary)]" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Dropdown Mức độ */}
                <div className="relative" data-dropdown-root>
                  <button
                    type="button"
                    onClick={() => setActiveDropdown(activeDropdown === "difficulty" ? null : "difficulty")}
                    className={cn(
                      "inline-flex h-9 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-medium transition-all cursor-pointer whitespace-nowrap",
                      difficulty
                        ? "border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)] text-[var(--color-primary-hover)] font-semibold shadow-2xs"
                        : "border-slate-200 bg-slate-50/60 text-slate-700 hover:bg-slate-100 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200"
                    )}
                    aria-expanded={activeDropdown === "difficulty"}
                  >
                    <span>{difficulty ? difficultyLabelText(difficulty) : t("recruiter.assessments.bank.jobBank.difficultyDefault")}</span>
                    <ChevronDown className={cn("size-3.5 text-slate-400 transition-transform", activeDropdown === "difficulty" && "rotate-180")} />
                  </button>

                  {activeDropdown === "difficulty" && (
                    <div className="absolute left-0 top-full mt-1.5 z-40 w-48 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in-50 zoom-in-95">
                      {[
                        { value: "", label: t("recruiter.assessments.bank.jobBank.allDifficultiesOption"), color: "" },
                        { value: "easy", label: t("recruiter.assessments.common.difficulty.easyRange"), color: "bg-emerald-500" },
                        { value: "medium", label: t("recruiter.assessments.common.difficulty.mediumRange"), color: "bg-amber-500" },
                        { value: "hard", label: t("recruiter.assessments.common.difficulty.hardRange"), color: "bg-rose-500" },
                      ].map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => {
                            handleDifficultyChange(item.value as Difficulty | "");
                            setActiveDropdown(null);
                          }}
                          className={cn(
                            "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left transition-colors cursor-pointer",
                            difficulty === item.value
                              ? "bg-[var(--color-primary-soft)] font-semibold text-[var(--color-primary-hover)]"
                              : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                          )}
                        >
                          <div className="flex items-center gap-2">
                            {item.color && <span className={cn("size-2 rounded-full", item.color)} />}
                            <span>{item.label}</span>
                          </div>
                          {difficulty === item.value && <Check className="size-3.5 text-[var(--color-primary)]" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="button"
                  onClick={handleAiOnlyToggle}
                  className={cn(
                    "inline-flex h-9 items-center gap-1.5 rounded-xl border px-2.5 text-xs font-medium transition-all cursor-pointer",
                    aiOnly
                      ? "border-[var(--color-primary)]/30 bg-[var(--color-primary-soft)] text-[var(--color-primary-hover)] font-semibold shadow-2xs"
                      : "border-slate-200 bg-slate-50/60 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-200"
                  )}
                >
                  <Sparkles className={cn("size-3.5", aiOnly ? "text-[var(--color-primary)]" : "text-slate-400")} />
                  <span>{t("recruiter.assessments.bank.jobBank.aiChipLabel")}</span>
                </button>
              </div>

              {/* Right: Primary Button 'Sinh bằng AI' + Secondary actions */}
              <div className="flex shrink-0 items-center gap-2">
                {/* Primary Button: Sinh bằng AI */}
                <Link
                  to={`/recruiter/jobs/${job.id}/assessments/ai-generator`}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl bg-[var(--color-primary)] px-3.5 text-xs font-semibold text-[var(--color-on-primary)] shadow-xs hover:bg-[var(--color-primary-hover)] transition-all cursor-pointer whitespace-nowrap"
                >
                  <Sparkles className="size-3.5" aria-hidden="true" />
                  <span>{t("recruiter.assessments.bank.general.aiGenerateBtn")}</span>
                </Link>

                {/* Dropdown Nhập/Xuất */}
                <div className="relative" data-dropdown-root>
                  <button
                    type="button"
                    onClick={() => setActiveDropdown(activeDropdown === "export" ? null : "export")}
                    className={cn(
                      "inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer transition-colors",
                      activeDropdown === "export" && "border-[var(--color-primary)]/40 ring-2 ring-[var(--color-primary)]/15"
                    )}
                    title={t("recruiter.assessments.bank.jobBank.importExportTooltip")}
                    aria-expanded={activeDropdown === "export"}
                  >
                    <Download className="size-3.5 text-slate-500" aria-hidden="true" />
                    <span className="hidden sm:inline">{t("recruiter.assessments.bank.jobBank.importExportBtn")}</span>
                    <ChevronDown className={cn("size-3 text-slate-400 transition-transform", activeDropdown === "export" && "rotate-180")} />
                  </button>

                  {activeDropdown === "export" && (
                    <div className="absolute right-0 top-full mt-1.5 z-40 w-64 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in-50 zoom-in-95">
                      <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                        {t("recruiter.assessments.bank.jobBank.dataTemplatesHeader")}
                      </div>
                      <Link
                        to={`${basePath}/excel-template`}
                        onClick={() => setActiveDropdown(null)}
                        className="flex items-start gap-2.5 rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      >
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 mt-0.5">
                          <Table2 className="size-4" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{t("recruiter.assessments.bank.jobBank.importExcelTitle")}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">{t("recruiter.assessments.bank.jobBank.importExcelDesc")}</p>
                        </div>
                      </Link>
                      <button
                        type="button"
                        onClick={() => {
                          downloadCsv(rows, t);
                          setActiveDropdown(null);
                        }}
                        className="flex w-full items-start gap-2.5 rounded-xl p-2 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer text-left"
                      >
                        <div className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary-soft)] text-[var(--color-primary)] mt-0.5">
                          <Download className="size-4" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-slate-800 dark:text-slate-200">{t("recruiter.assessments.bank.jobBank.exportCsvTitle", { count: rows.length })}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-400">{t("recruiter.assessments.bank.jobBank.exportCsvDesc")}</p>
                        </div>
                      </button>
                    </div>
                  )}
                </div>

                {/* Dropdown Sắp xếp */}
                <div className="relative" data-dropdown-root>
                  <button
                    type="button"
                    onClick={() => setActiveDropdown(activeDropdown === "sort" ? null : "sort")}
                    className={cn(
                      "inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors cursor-pointer whitespace-nowrap",
                      activeDropdown === "sort" && "border-[var(--color-primary)]/40 ring-2 ring-[var(--color-primary)]/15"
                    )}
                    aria-expanded={activeDropdown === "sort"}
                  >
                    <ArrowUpDown className="size-3.5 text-slate-400" />
                    <span>{sort === "latest" ? t("recruiter.assessments.bank.jobBank.sortLatestShort") : sort === "points" ? t("recruiter.assessments.bank.jobBank.sortPointsShort") : t("recruiter.assessments.bank.jobBank.sortTextShort")}</span>
                    <ChevronDown className={cn("size-3 text-slate-400 transition-transform", activeDropdown === "sort" && "rotate-180")} />
                  </button>

                  {activeDropdown === "sort" && (
                    <div className="absolute right-0 top-full mt-1.5 z-40 w-44 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in-50 zoom-in-95">
                      {[
                        { value: "latest", label: t("recruiter.assessments.bank.jobBank.sortLatestShort") },
                        { value: "points", label: t("recruiter.assessments.bank.jobBank.sortPointsShort") },
                        { value: "text", label: t("recruiter.assessments.bank.jobBank.sortTextShort") },
                      ].map((item) => (
                        <button
                          key={item.value}
                          type="button"
                          onClick={() => {
                            handleSortChange(item.value as typeof sort);
                            setActiveDropdown(null);
                          }}
                          className={cn(
                            "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-xs text-left transition-colors cursor-pointer",
                            sort === item.value
                              ? "bg-[var(--color-primary-soft)] font-semibold text-[var(--color-primary-hover)]"
                              : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                          )}
                        >
                          <span>{item.label}</span>
                          {sort === item.value && <Check className="size-3.5 text-[var(--color-primary)]" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* View Mode Switcher */}
                <div className="flex h-9 items-center rounded-xl border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-700 dark:bg-slate-800">
                  <button
                    type="button"
                    aria-label={t("recruiter.assessments.bank.general.viewTableAria")}
                    aria-pressed={view === "table"}
                    onClick={() => handleViewChange("table")}
                    className={cn(
                      "rounded-lg p-1.5 transition-colors cursor-pointer",
                      view === "table"
                        ? "bg-white text-[var(--color-primary)] shadow-2xs dark:bg-slate-900"
                        : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    )}
                  >
                    <Table2 className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label={t("recruiter.assessments.bank.general.viewCardsAria")}
                    aria-pressed={view === "cards"}
                    onClick={() => handleViewChange("cards")}
                    className={cn(
                      "rounded-lg p-1.5 transition-colors cursor-pointer",
                      view === "cards"
                        ? "bg-white text-[var(--color-primary)] shadow-2xs dark:bg-slate-900"
                        : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                    )}
                  >
                    <Grid3x3 className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {(chips.length > 0 || aiOnly) && (
              <div className="flex flex-wrap items-center gap-2 border-t border-slate-200/60 dark:border-slate-700/60 pt-2 px-1 text-xs">
                <span className="font-medium text-[var(--color-on-surface-variant)]">{t("recruiter.assessments.common.actions.activeFilters")}</span>
                {chips.map((chip) => (
                  <span
                    key={chip.id}
                    className="inline-flex items-center gap-1 rounded-full bg-[var(--color-primary-subtle)] px-2.5 py-0.5 text-xs font-medium text-[var(--color-primary)]"
                  >
                    {chip.label}
                    <button
                      type="button"
                      onClick={() => clearChip(chip.id)}
                      className="rounded-full p-0.5 hover:bg-[var(--color-primary)]/10"
                      aria-label={t("recruiter.assessments.bank.jobBank.removeChipAria", { label: chip.label })}
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
                {aiOnly && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary-hover)] px-2.5 py-0.5 text-xs font-medium">
                    <Sparkles className="size-3" /> {t("recruiter.assessments.bank.jobBank.aiOnlyChipLabel")}
                    <button
                      type="button"
                      onClick={handleAiOnlyToggle}
                      className="rounded-full p-0.5 hover:bg-[var(--color-primary)]/15"
                      aria-label={t("recruiter.assessments.bank.jobBank.removeAiFilterAria")}
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                )}
                <button
                  type="button"
                  onClick={clearFilters}
                  className="ml-auto text-xs font-semibold text-[var(--color-primary)] hover:underline"
                >
                  {t("recruiter.assessments.common.actions.clearAllFilters")}
                </button>
              </div>
            )}
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
                <Link to={basePath} className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium hover:bg-white/20">
                  <ClipboardList className="size-3.5" /> {t("recruiter.assessments.bank.jobBank.addToAssessment")}
                </Link>
                <Link to={`/recruiter/jobs/${job.id}/ai-interviews`} className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium hover:bg-white/20">
                  <Bot className="size-3.5" /> {t("recruiter.assessments.bank.jobBank.addToAiInterview")}
                </Link>
                <button type="button" onClick={() => downloadCsv(selectedRows, t)} className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium hover:bg-white/20">
                  <Download className="size-3.5" /> {t("recruiter.assessments.common.actions.exportFile")}
                </button>
                <button
                  type="button"
                  onClick={() => toast.info(t("recruiter.assessments.bank.jobBank.archiveUnavailableTitle"), t("recruiter.assessments.bank.jobBank.archiveUnavailableDesc"))}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-rose-400/20 px-3 py-1.5 text-xs font-medium text-rose-100 hover:bg-rose-400/30"
                >
                  <Archive className="size-3.5" /> {t("recruiter.assessments.bank.general.archiveAction")}
                </button>
              </div>
            </div>
          )}

          <div className="relative overflow-hidden rounded-2xl bg-[var(--color-surface-card)] shadow-xs border border-slate-100/80 dark:border-slate-800/60">
            <TableRefreshBar active={isTableRefreshing} />
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50/60 dark:bg-slate-800/30 px-4 py-2.5 text-xs text-[var(--color-on-surface-variant)] border-b border-slate-100 dark:border-slate-800/60">
              <p>
                {isInitialLoading ? (
                  <span>{t("recruiter.assessments.bank.general.loadingListLabel")}…</span>
                ) : (
                  <>
                    {t("recruiter.assessments.bank.general.showingRange")} <span className="font-semibold text-[var(--color-on-surface)]">{totalItems === 0 ? 0 : startIndex + 1} - {Math.min(totalItems, startIndex + pageRows.length)}</span> {t("recruiter.assessments.bank.general.ofTotalQuestions", { total: totalItems })}
                  </>
                )}
              </p>
              {tests.isFetching && (
                <span className="inline-flex items-center gap-1 font-medium text-[var(--color-primary)]" role="status">
                  <Loader2 className="size-3.5 animate-spin" />
                  {t("recruiter.assessments.common.syncingEllipsis")}
                </span>
              )}
            </div>

            {tests.isSuccess && !isInitialLoading && totalItems === 0 && (
              <div className="flex flex-col items-start gap-2 p-8">
                <FolderOpen className="size-8 text-[var(--color-primary)]" aria-hidden="true" />
                <p className="font-semibold">{t("recruiter.assessments.bank.general.emptyTitle")}</p>
                <p className="text-sm text-[var(--color-on-surface-variant)]">{job.skills.length ? t("recruiter.assessments.bank.jobBank.emptyWithSkillsDesc") : t("recruiter.assessments.bank.jobBank.emptyNoSkillsDesc")}</p>
                <Link to={basePath} className="text-sm font-semibold text-[var(--color-primary)] hover:underline">{t("recruiter.assessments.bank.jobBank.backToAssessmentsLink")}</Link>
              </div>
            )}

            {view === "table" && (isInitialLoading || pageRows.length > 0) && (
              <div className="w-full max-lg:overflow-x-auto lg:overflow-x-hidden">
                <table className="w-full table-fixed border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-800/20 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                      <th className="w-10 px-3 py-3">
                        <input
                          type="checkbox"
                          checked={allPageSelected}
                          aria-label={t("recruiter.assessments.bank.general.selectPageCheckAria")}
                          onChange={() => setSelected((current) => allPageSelected ? current.filter((key) => !pageKeys.includes(key)) : [...new Set([...current, ...pageKeys])])}
                          className="size-4 rounded accent-[var(--color-primary)]"
                        />
                      </th>
                      <th className="px-3 py-3">{t("recruiter.assessments.bank.jobBank.colQuestionContent")}</th>
                      <th className="w-36 px-3 py-3">{t("recruiter.assessments.bank.jobBank.colSkill")}</th>
                      <th className="w-24 px-3 py-3">{t("recruiter.assessments.bank.jobBank.colDifficulty")}</th>
                      <th className="w-24 px-2 py-3 text-center">{t("recruiter.assessments.bank.general.colActions")}</th>
                    </tr>
                  </thead>
                  <tbody className={cn("divide-y divide-slate-100 dark:divide-slate-800/60 transition-opacity duration-200", (isTableRefreshing || isTableTransitioning) && "opacity-60")}>
                    {isInitialLoading ? (
                      <QuestionTableRowsSkeleton rows={pageSize} />
                    ) : (
                      pageRows.map((row) => {
                        const meta = statusMeta(row.testStatus, t);
                        const inspected = activeKey === row.key;
                        return (
                          <tr
                            key={row.key}
                            onClick={() => openRow(row.key)}
                            className={cn(
                              "group cursor-pointer transition-colors",
                              inspected
                                ? "bg-[var(--color-primary-subtle)]"
                                : "hover:bg-slate-50/60 dark:hover:bg-slate-800/30"
                            )}
                          >
                            <td className="w-10 px-3 py-2.5" onClick={(event) => event.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={selected.includes(row.key)}
                                aria-label={t("recruiter.assessments.bank.general.selectCodeAria", { code: row.code })}
                                onChange={() => toggleOne(row.key)}
                                className="size-4 rounded accent-[var(--color-primary)]"
                              />
                            </td>
                            <td className="px-3 py-2.5 max-w-0 overflow-hidden">
                              <div className="min-w-0 overflow-hidden">
                                {/* Sub-text metadata line */}
                                <div className="flex flex-wrap items-center gap-1.5 text-xs">
                                  <span className="font-mono text-xs font-bold text-slate-800 dark:text-slate-200">
                                    {row.code}
                                  </span>
                                  <span className="text-slate-300 dark:text-slate-600 font-light">•</span>
                                  <span className="text-xs font-medium text-slate-600 dark:text-slate-400">
                                    {typeLabel(row.question.questionType, t)} ({row.question.points}{t("recruiter.assessments.common.pointsShort")})
                                  </span>
                                  {row.question.options && row.question.options.length > 0 && (
                                    <>
                                      <span className="text-slate-300 dark:text-slate-600 font-light">•</span>
                                      <span className="text-xs text-slate-500 dark:text-slate-400">
                                        {t("recruiter.assessments.bank.general.optionsCount", { count: row.question.options.length })}
                                      </span>
                                    </>
                                  )}
                                  {row.aiGenerated && (
                                    <span className="inline-flex items-center gap-0.5 rounded-md bg-[var(--color-primary-soft)] text-[var(--color-primary-hover)] px-1.5 py-0.5 text-[10px] font-semibold border border-[var(--color-primary)]/20">
                                      <Sparkles className="size-2.5" aria-hidden="true" /> AI
                                    </span>
                                  )}
                                  <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold", meta.chip)}>
                                    <span className={cn("size-1.5 rounded-full", meta.dot)} />
                                    {meta.label}
                                  </span>
                                  {row.testTitle && row.testTitle !== row.jobTitle && (
                                    <span
                                      className="inline-flex items-center rounded-md bg-[var(--color-primary-subtle)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--color-primary-hover)] border border-[var(--color-primary)]/20"
                                      title={t("recruiter.assessments.bank.jobBank.usedInTooltip", { title: row.testTitle })}
                                    >
                                      {t("recruiter.assessments.bank.jobBank.plusOneTestBadge")}
                                    </span>
                                  )}
                                </div>
                                {/* Clamped question text with Tooltip */}
                                <Tooltip
                                  content={
                                    <div className="space-y-1">
                                      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-300">
                                        <span>{row.code}</span>
                                        <span>•</span>
                                        <span>{typeLabel(row.question.questionType, t)}</span>
                                        <span>•</span>
                                        <span>{row.question.points}{t("recruiter.assessments.common.pointsShort")}</span>
                                      </div>
                                      <p className="text-xs font-medium leading-relaxed text-slate-100">
                                        {row.question.questionText}
                                      </p>
                                    </div>
                                  }
                                  side="top"
                                  className="w-full block"
                                  contentClassName="max-w-md p-3"
                                >
                                  <p className="mt-1 line-clamp-2 break-words text-sm font-medium text-slate-900 dark:text-slate-100 leading-snug group-hover:text-[var(--color-primary)] transition-colors">
                                    {row.question.questionText}
                                  </p>
                                </Tooltip>
                              </div>
                            </td>
                            <td className="w-36 px-3 py-2.5" onClick={(event) => event.stopPropagation()}>
                              <div className="flex flex-wrap items-center gap-1">
                                {(row.skills.length ? row.skills : [t("recruiter.assessments.common.dash")]).slice(0, 2).map((item) => (
                                  <button
                                    key={item}
                                    type="button"
                                    title={t("recruiter.assessments.bank.jobBank.filterBySkillTooltip", { skill: item })}
                                    onClick={() => handleSkillChange(item === t("recruiter.assessments.common.dash") ? "" : item)}
                                    className={cn(
                                      "rounded-full px-2 py-0.5 text-[11px] font-medium transition-colors border-0 cursor-pointer truncate max-w-[100px]",
                                      skill === item
                                        ? "bg-[var(--color-primary)] text-white font-semibold"
                                        : "bg-[var(--color-primary-subtle)] text-[var(--color-primary-hover)] hover:bg-[var(--color-primary-soft)]",
                                    )}
                                  >
                                    {item}
                                  </button>
                                ))}
                                {row.skills.length > 2 && (
                                  <span
                                    className="rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 dark:text-slate-300 border-0"
                                    title={row.skills.slice(2).join(", ")}
                                  >
                                    +{row.skills.length - 2}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="w-24 px-3 py-2.5">
                              <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap", difficultyClass(row.difficulty))}>
                                {difficultyLabelText(row.difficulty)}
                              </span>
                            </td>
                            <td className="w-24 px-2 py-2.5 text-center" onClick={(event) => event.stopPropagation()}>
                              <div className={cn(
                                "relative flex items-center justify-center gap-0.5 transition-opacity",
                                menuKey === row.key ? "opacity-100" : "opacity-0 group-hover:opacity-100 focus-within:opacity-100"
                              )}>
                                <Tooltip content={t("recruiter.assessments.common.actions.viewDetails")} side="top">
                                  <button
                                    type="button"
                                    aria-label={t("recruiter.assessments.common.actions.viewDetails")}
                                    onClick={() => openRow(row.key)}
                                    className="flex size-7 items-center justify-center rounded-lg text-slate-600 hover:bg-[var(--color-primary-soft)] hover:text-[var(--color-primary)] dark:text-slate-300 transition-colors cursor-pointer"
                                  >
                                    <Eye className="size-3.5" />
                                  </button>
                                </Tooltip>
                                <Tooltip content={t("recruiter.assessments.bank.general.editQuestionAria")} side="top">
                                  <Link
                                    to={questionPath(row)}
                                    aria-label={t("recruiter.assessments.bank.general.editQuestionAria")}
                                    className="flex size-7 items-center justify-center rounded-lg text-slate-600 hover:bg-amber-50 hover:text-amber-600 dark:text-slate-300 dark:hover:bg-amber-950/60 dark:hover:text-amber-300 transition-colors cursor-pointer"
                                  >
                                    <Pencil className="size-3.5" />
                                  </Link>
                                </Tooltip>
                                <div className="relative" data-action-menu>
                                  <Tooltip content={t("recruiter.assessments.common.actions.moreOptions")} side="top">
                                    <button
                                      type="button"
                                      aria-label={t("recruiter.assessments.common.actions.moreOptions")}
                                      onClick={() => setMenuKey(menuKey === row.key ? null : row.key)}
                                      className={cn(
                                        "flex size-7 items-center justify-center rounded-lg transition-colors cursor-pointer",
                                        menuKey === row.key
                                          ? "bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-white"
                                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-100"
                                      )}
                                    >
                                      <MoreVertical className="size-3.5" />
                                    </button>
                                  </Tooltip>

                                  {menuKey === row.key && (
                                    <div className="absolute right-0 top-full mt-1.5 z-40 w-48 rounded-2xl bg-white dark:bg-slate-900 p-1.5 text-left text-xs shadow-xl border border-slate-200 dark:border-slate-800 animate-in fade-in-50 zoom-in-95">
                                      <button
                                        type="button"
                                        className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                        onClick={() => { void navigator.clipboard.writeText(row.question.questionText); setMenuKey(null); }}
                                      >
                                        <Copy className="size-3.5 text-slate-500" /> {t("recruiter.assessments.bank.general.copyContent")}
                                      </button>
                                      <button
                                        type="button"
                                        className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                        onClick={() => { void navigator.clipboard.writeText(row.code); setMenuKey(null); }}
                                      >
                                        <Copy className="size-3.5 text-slate-500" /> {t("recruiter.assessments.bank.jobBank.copyCodeQb")}
                                      </button>
                                      <button
                                        type="button"
                                        className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                                        onClick={() => { toggleFavorite(row.key); setMenuKey(null); }}
                                      >
                                        <Star className={cn("size-3.5", favorites.has(row.key) && "fill-amber-500 text-amber-500")} />
                                        {favorites.has(row.key) ? t("recruiter.assessments.bank.general.unfavorite") : t("recruiter.assessments.bank.jobBank.markFavorite")}
                                      </button>
                                      <div className="my-1 border-t border-slate-100 dark:border-slate-800" />
                                      <Link
                                        to={questionPath(row)}
                                        className="flex w-full items-center gap-2 rounded-xl px-2.5 py-1.5 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                        onClick={() => setMenuKey(null)}
                                      >
                                        <Pencil className="size-3.5 text-amber-500" /> {t("recruiter.assessments.common.actions.edit")}
                                      </Link>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {view === "cards" && (isInitialLoading || pageRows.length > 0) && (
              isInitialLoading ? (
                <QuestionCardsSkeleton count={Math.min(pageSize, 6)} />
              ) : (
                <div className={cn("grid gap-3.5 p-4 md:grid-cols-2 transition-opacity duration-200", (isTableRefreshing || isTableTransitioning) && "opacity-60")}>
                  {pageRows.map((row) => {
                    const meta = statusMeta(row.testStatus, t);
                    return (
                      <button
                        key={row.key}
                        type="button"
                        onClick={() => openRow(row.key)}
                        className="flex flex-col justify-between rounded-xl bg-slate-50/60 p-4 text-left shadow-2xs transition-all hover:bg-slate-100/70 hover:shadow-xs dark:bg-slate-800/40 dark:hover:bg-slate-800/70 border border-slate-100/80 dark:border-slate-800/50"
                      >
                        <div>
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border-0">
                                {row.code}
                              </span>
                              <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold", difficultyClass(row.difficulty))}>
                                {difficultyLabelText(row.difficulty)}
                              </span>
                              {row.aiGenerated && (
                                <span className="inline-flex items-center gap-0.5 rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary-hover)] px-2 py-0.5 text-[10px] font-semibold border-0">
                                  <Sparkles className="size-2.5" aria-hidden="true" /> AI
                                </span>
                              )}
                            </div>
                            <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border-0", meta.chip)}>
                              <span className={cn("size-1.5 rounded-full", meta.dot)} />
                              {meta.label}
                            </span>
                          </div>
                          <p className="mt-2.5 line-clamp-2 text-sm font-semibold text-[var(--color-on-surface)] leading-relaxed">
                            {row.question.questionText}
                          </p>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 dark:border-slate-800/60 pt-2.5 text-xs text-[var(--color-on-surface-variant)]">
                          <span className="truncate max-w-[200px]" title={row.testTitle}>
                            {row.testTitle}
                          </span>
                          <span className="font-medium">
                            {row.question.points} {t("recruiter.assessments.common.pointsUnit")} · {typeLabel(row.question.questionType, t)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )
            )}

            <div className={cn(
              "flex flex-col gap-3 border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-800/30 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between transition-opacity text-xs text-[var(--color-on-surface-variant)]",
              isTableTransitioning && "opacity-50 pointer-events-none"
            )}>
              {/* [TRÁI]: Thông tin dữ liệu & loading */}
              <div className="flex items-center gap-2">
                <span>
                  {t("recruiter.assessments.bank.general.showingRange")} <span className="font-semibold text-[var(--color-on-surface)]">{totalItems === 0 ? 0 : startIndex + 1}–{Math.min(startIndex + pageSize, totalItems)}</span> {t("recruiter.assessments.bank.general.ofTotalQuestions", { total: formatNumber(totalItems, undefined, locale) })}
                </span>
                <span>·</span>
                <span className="tabular-nums">{t("recruiter.assessments.common.pagination.pageOf", { current: currentPage, total: totalPages })}</span>
                {tests.isFetching && !isInitialLoading && (
                  <span className="inline-flex items-center gap-1 font-medium text-[var(--color-primary)] ml-1">
                    <Loader2 className="size-3.5 animate-spin" />
                    <span className="hidden sm:inline">{t("recruiter.assessments.common.loadingEllipsis")}</span>
                  </span>
                )}
              </div>

              {/* [GIỮA]: Dropdown chọn số dòng / trang */}
              <div className="flex items-center justify-start lg:justify-center">
                <label className="flex items-center gap-1.5">
                  <span>{t("recruiter.assessments.common.pagination.showing")}</span>
                  <select
                    value={pageSize}
                    onChange={(e) => goToPage(1, Number(e.target.value))}
                    className="h-8 rounded-lg bg-white dark:bg-slate-800 px-2 text-xs font-semibold text-[var(--color-on-surface)] outline-none shadow-2xs hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 cursor-pointer"
                  >
                    {PAGE_SIZE_OPTIONS.map((s) => (
                      <option key={s} value={s}>{t("recruiter.assessments.common.pagination.perPage", { size: s })}</option>
                    ))}
                  </select>
                </label>
              </div>

              {/* [PHẢI]: Nút điều hướng + Nhập trang nhanh */}
              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                <nav className="flex items-center gap-1" aria-label={t("recruiter.assessments.common.pagination.pageWord")}>
                  <button
                    type="button"
                    title={t("recruiter.assessments.common.pagination.firstPage")}
                    aria-label={t("recruiter.assessments.common.pagination.firstPage")}
                    disabled={currentPage === 1}
                    onClick={() => goToPage(1)}
                    className="grid size-8 place-items-center rounded-lg border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-[var(--color-on-surface)] shadow-2xs transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronsLeft className="size-4" />
                  </button>
                  <button
                    type="button"
                    title={t("recruiter.assessments.common.pagination.prevPage")}
                    aria-label={t("recruiter.assessments.common.pagination.prevPage")}
                    disabled={currentPage === 1}
                    onClick={() => goToPage(currentPage - 1)}
                    className="grid size-8 place-items-center rounded-lg border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-[var(--color-on-surface)] shadow-2xs transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronLeft className="size-4" />
                  </button>

                  {pageItems.map((item, idx) => {
                    if (typeof item === "string") {
                      return (
                        <span key={`${item}-${idx}`} className="grid size-8 place-items-center text-xs text-slate-400 select-none">
                          …
                        </span>
                      );
                    }
                    const isActive = item === currentPage;
                    return (
                      <button
                        key={item}
                        type="button"
                        aria-label={t("recruiter.assessments.common.pagination.pageNumberAria", { page: item })}
                        aria-current={isActive ? "page" : undefined}
                        onClick={() => goToPage(item)}
                        className={cn(
                          "grid size-8 place-items-center rounded-lg text-xs font-semibold transition-all cursor-pointer",
                          isActive
                            ? "bg-[var(--color-primary)] text-white shadow-xs font-bold"
                            : "border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-[var(--color-on-surface)] hover:bg-slate-100 dark:hover:bg-slate-700"
                        )}
                      >
                        {item}
                      </button>
                    );
                  })}

                  <button
                    type="button"
                    title={t("recruiter.assessments.common.pagination.nextPageAlt")}
                    aria-label={t("recruiter.assessments.common.pagination.nextPageAlt")}
                    disabled={currentPage >= totalPages}
                    onClick={() => goToPage(currentPage + 1)}
                    className="grid size-8 place-items-center rounded-lg border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-[var(--color-on-surface)] shadow-2xs transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                  <button
                    type="button"
                    title={t("recruiter.assessments.common.pagination.lastPage")}
                    aria-label={t("recruiter.assessments.common.pagination.lastPage")}
                    disabled={currentPage >= totalPages}
                    onClick={() => goToPage(totalPages)}
                    className="grid size-8 place-items-center rounded-lg border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-[var(--color-on-surface)] shadow-2xs transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronsRight className="size-4" />
                  </button>
                </nav>

                <div className="h-4 w-px bg-slate-300/60 dark:bg-slate-700 mx-1 hidden sm:block" />

                {/* Page Jumper */}
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const p = parseInt(jumpInput, 10);
                    if (!isNaN(p) && p >= 1 && p <= totalPages) {
                      goToPage(p);
                      setJumpInput("");
                    }
                  }}
                  className="flex items-center gap-1.5 text-xs text-[var(--color-on-surface-variant)]"
                >
                  <span>{t("recruiter.assessments.common.pagination.goTo")}</span>
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    placeholder={String(currentPage)}
                    value={jumpInput}
                    onChange={(e) => setJumpInput(e.target.value)}
                    aria-label={t("recruiter.assessments.common.pagination.jumpInputAria")}
                    className="h-8 w-11 rounded-lg border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-center text-xs font-semibold text-[var(--color-on-surface)] outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                  />
                  <span>{t("recruiter.assessments.common.pagination.pageWord")}</span>
                  <button
                    type="submit"
                    disabled={!jumpInput || Number(jumpInput) < 1 || Number(jumpInput) > totalPages}
                    className="inline-flex h-8 items-center rounded-lg border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-xs font-semibold text-[var(--color-on-surface)] hover:bg-slate-100 dark:hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {t("recruiter.assessments.common.pagination.goBtn")}
                  </button>
                </form>
              </div>
            </div>
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
                <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold", statusMeta(active.testStatus, t).chip)}>
                  <span className={cn("size-1.5 rounded-full", statusMeta(active.testStatus, t).dot)} />
                  {statusMeta(active.testStatus, t).label}
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
                  {active.question.options.length > 0 && (
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
                    </div>
                  )}
                  {active.content && active.question.questionType === "ESSAY" && (
                    <div className="mt-3 space-y-3 text-sm">
                      <p>{t("recruiter.assessments.bank.general.kindPrefix")}{typeMeta(active.content.kind, t).label}</p>
                      <p>{t("recruiter.assessments.bank.general.languagePrefix")}{active.content.language || t("recruiter.assessments.common.dash")}</p>
                      {active.content.snippet && (
                        <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-[var(--color-surface-container)] p-3">{active.content.snippet}</pre>
                      )}
                      <p className="whitespace-pre-wrap">{t("recruiter.assessments.bank.general.sampleAnswerPrefix")}{active.content.sample || t("recruiter.assessments.bank.general.notAvailable")}</p>
                      {active.content.rubric.map((item) => (
                        <p key={item.level} className="whitespace-pre-wrap">{item.text}</p>
                      ))}
                    </div>
                  )}
                  {active.question.rubricJson && (
                    <div className="space-y-2 rounded-lg bg-[var(--color-surface-container-low)] p-3 text-sm">
                      <h3 className="font-semibold">{t("recruiter.assessments.bank.general.rubricHeading")}</h3>
                      <p className="whitespace-pre-wrap">{active.question.rubricJson.referenceAnswer}</p>
                      {active.question.rubricJson.criteria.map((criterion, i) => (
                        <p key={i}>{criterion.weight}% · {criterion.description}</p>
                      ))}
                    </div>
                  )}
                  {active.question.coding && (
                    <div className="space-y-2 rounded-lg bg-[var(--color-surface-container-low)] p-3 text-sm">
                      <h3 className="font-semibold">{t("recruiter.assessments.bank.general.codingHeading")}</h3>
                      <p>{active.question.coding.category} · {active.question.coding.timeLimitMs} ms · {active.question.coding.memoryMb} MB</p>
                      <p>{t("recruiter.assessments.bank.general.codingTestsSummary", { sample: active.question.coding.testCases.filter(test => test.sample).length, hidden: active.question.coding.testCases.filter(test => !test.sample).length })}</p>
                      {Object.entries(active.question.coding.starterCode).map(([language, code]) => (
                        <pre key={language} className="overflow-auto whitespace-pre-wrap font-mono text-xs">{language}{"\n"}{code}</pre>
                      ))}
                    </div>
                  )}
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
                <div className="space-y-3.5">
                  <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <Briefcase className="size-4 text-[var(--color-primary)]" /> {t("recruiter.assessments.bank.general.jobFieldLabel")}
                    </div>
                    <p className="mt-2 text-sm font-bold text-slate-900 dark:text-slate-100">{active.jobTitle || job.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{t("recruiter.assessments.bank.jobBank.contextDepartment", { department: active.department || job.department || t("recruiter.assessments.bank.jobBank.departmentFallback") })}</p>
                    <div className="mt-3 flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                        <CheckCircle2 className="size-3" /> {t("recruiter.assessments.bank.jobBank.openHiringBadge")}
                      </span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <ClipboardList className="size-4 text-[var(--color-primary)]" /> {t("recruiter.assessments.bank.jobBank.linkedAssessmentHeading")}
                    </div>
                    <p className="mt-2 text-sm font-bold text-slate-900 dark:text-slate-100">{active.testTitle}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold", statusMeta(active.testStatus, t).chip)}>
                        <span className={cn("size-1.5 rounded-full", statusMeta(active.testStatus, t).dot)} />
                        {statusMeta(active.testStatus, t).label}
                      </span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">
                        {active.question.points} {t("recruiter.assessments.common.pointsUnit")} · {typeLabel(active.question.questionType, t)}
                      </span>
                    </div>
                    <Link
                      to={questionPath(active)}
                      className="mt-3.5 inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-1.5 text-xs font-semibold text-[var(--color-primary)] shadow-2xs hover:bg-[var(--color-primary-subtle)] border border-slate-200 dark:bg-slate-900 dark:border-slate-700 dark:hover:bg-slate-800 transition-colors"
                    >
                      <InfinityIcon className="size-3.5" /> {active.testId ? t("recruiter.assessments.bank.jobBank.openAssessmentLink") : t("recruiter.assessments.bank.jobBank.openGeneralQuestionLink")}
                    </Link>
                  </div>

                  <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      <Bot className="size-4 text-[var(--color-primary)]" /> {t("recruiter.assessments.bank.jobBank.voiceMatchHeading")}
                    </div>
                    <p className="mt-1.5 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
                      {t("recruiter.assessments.bank.jobBank.voiceMatchDesc")}
                    </p>
                    <Link
                      to={`/recruiter/jobs/${job.id}/ai-interviews`}
                      className="mt-2.5 inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-primary)] hover:underline"
                    >
                      {t("recruiter.assessments.bank.jobBank.configureAiInterviewLink")} <ChevronRight className="size-3.5" />
                    </Link>
                  </div>
                </div>
              )}
              {drawerTab === "history" && (
                <div className="space-y-3.5">
                  <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                    <p className="text-xs font-bold text-slate-900 dark:text-slate-100">{t("recruiter.assessments.bank.jobBank.activityTimelineTitle")}</p>
                    <div className="mt-4 relative pl-6 border-l-2 border-slate-200 dark:border-slate-700 space-y-6 text-xs">
                      <div className="relative">
                        <span className="absolute -left-[31px] top-0.5 flex size-4 items-center justify-center rounded-full bg-[var(--color-primary)] text-white ring-4 ring-white dark:ring-slate-900">
                          <Check className="size-2.5" />
                        </span>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{t("recruiter.assessments.bank.jobBank.timelineUpdatedTitle")}</p>
                        <p className="mt-0.5 text-slate-500 dark:text-slate-400">{t("recruiter.assessments.bank.jobBank.timelineUpdatedMeta", { status: statusMeta(active.testStatus, t).label, difficulty: difficultyLabelText(active.difficulty) })}</p>
                        <span className="mt-1 inline-flex items-center gap-1 text-[11px] text-slate-400">
                          <Clock className="size-3" /> {t("recruiter.assessments.bank.jobBank.timelineLatest")}
                        </span>
                      </div>

                      <div className="relative">
                        <span className="absolute -left-[31px] top-0.5 flex size-4 items-center justify-center rounded-full bg-[var(--color-primary)]/80 text-white ring-4 ring-white dark:ring-slate-900">
                          <ClipboardList className="size-2.5" />
                        </span>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">{t("recruiter.assessments.bank.jobBank.timelineLinkedTitle")}</p>
                        <p className="mt-0.5 text-slate-500 dark:text-slate-400">{t("recruiter.assessments.bank.jobBank.timelineLinkedDesc", { title: active.testTitle })}</p>
                      </div>

                      <div className="relative">
                        <span className="absolute -left-[31px] top-0.5 flex size-4 items-center justify-center rounded-full bg-emerald-500 text-white ring-4 ring-white dark:ring-slate-900">
                          <Sparkles className="size-2.5" />
                        </span>
                        <p className="font-semibold text-slate-900 dark:text-slate-100">
                          {active.aiGenerated ? t("recruiter.assessments.bank.jobBank.timelineCreatedAi") : t("recruiter.assessments.bank.jobBank.timelineCreatedManual")}
                        </p>
                        <p className="mt-0.5 text-slate-500 dark:text-slate-400">
                          {t("recruiter.assessments.bank.jobBank.timelineQuestionCode")}<span className="font-mono font-semibold">{active.code}</span>
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
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
                <Link to={questionPath(active)} className="rounded-lg bg-[var(--color-surface-card)] px-3 py-2.5 text-center text-sm font-semibold shadow-sm">
                  {t("recruiter.assessments.bank.general.editQuestionBtn")}
                </Link>
                <Link to={basePath} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-3 py-2.5 text-sm font-semibold text-white">
                  <ClipboardList className="size-4" /> {t("recruiter.assessments.bank.jobBank.backToAssessmentBtn")}
                </Link>
              </div>
            </div>
          </aside>
        </>
      )}
      <AiQuestionGenerateDialog
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        defaultSkill={skill || jobSkills[0] || ""}
        skillOptions={jobSkills.length ? jobSkills : skillOptions}
        defaultTopic={job.title}
        jobContext={jobContext}
        onSaved={async () => {
          toast.success(t("recruiter.assessments.bank.jobBank.aiSavedTitle"), t("recruiter.assessments.bank.jobBank.aiSavedDesc"));
          setAiOpen(false);
          setAiOnly(true);
          await client.invalidateQueries({ queryKey: queryKeys.assessments.all() });
        }}
      />
    </section>
  );
}
