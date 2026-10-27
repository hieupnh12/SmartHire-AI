import { useRecruitmentJob } from "../../jobs/components/JobRecruitmentWorkspace";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useSearchParams } from "react-router-dom";
import {
  Archive,
  Bot,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ClipboardList,
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
import { Breadcrumb } from "@/components/ux/Breadcrumb";
import { Skeleton } from "@/components/ux/Skeleton";
import { SKILL_CATALOG } from "@/features/tenant/recruiter/jobs/skillCatalog";
import { queryKeys } from "@/lib/query-keys";
import { getTenantIdFromWindow } from "@/lib/tenant";
import { getTenantTheme } from "@/lib/tenantTheme";
import { cn } from "@/lib/utils";
import { toast } from "@/stores/toastStore";

const FAVORITES_KEY = "smarthire.question-bank.favorites";
const SKILLS = SKILL_CATALOG.flatMap((group) => group.skills);

type Collection = "all" | "favorites" | "ready" | "pending" | "archived";
type ViewMode = "table" | "cards";
type DrawerTab = "content" | "usage" | "history";
type Difficulty = "Cơ bản" | "Vận dụng" | "Nâng cao";

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

const collections: { id: Collection; label: string; icon: typeof FolderOpen }[] = [
  { id: "all", label: "Tất cả câu hỏi", icon: FolderOpen },
  { id: "favorites", label: "Yêu thích của tôi", icon: Star },
  { id: "ready", label: "Câu hỏi phụ trách", icon: UserRound },
  { id: "pending", label: "Chờ phê duyệt", icon: ClipboardList },
  { id: "archived", label: "Đã lưu trữ", icon: Archive },
];

function loadFavorites() {
  try {
    const raw = localStorage.getItem(FAVORITES_KEY);
    return new Set<string>(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set<string>();
  }
}

function typeLabel(type?: string): string {
  if (!type) return "Trắc nghiệm đơn";
  const t = type.toUpperCase();
  if (t === "MCQ") return "Trắc nghiệm đơn";
  if (t === "MULTIPLE_CHOICE") return "Nhiều đáp án";
  if (t === "QUIZ") return "Trắc nghiệm";
  if (t === "CODING") return "Bài tập Code";
  if (t === "ESSAY") return "Tự luận lý thuyết";
  return type;
}

function questionCode(id: number) {
  return `#QB-${String(id).padStart(3, "0")}`;
}

function difficultyOf(points: number): Difficulty {
  if (points <= 5) return "Cơ bản";
  if (points <= 15) return "Vận dụng";
  return "Nâng cao";
}

function difficultyLabel(value: string | null | undefined, points: number): Difficulty {
  const key = (value ?? "").trim().toLowerCase();
  if (key === "easy") return "Cơ bản";
  if (key === "medium") return "Vận dụng";
  if (key === "hard") return "Nâng cao";
  return difficultyOf(points);
}

function skillsOf(text: string, skill: string | null | undefined) {
  const tagged = (skill ?? "").trim();
  if (tagged) return [tagged];
  const haystack = text.toLowerCase();
  const matched = SKILLS.filter((item) => haystack.includes(item.toLowerCase()));
  return matched.slice(0, 4);
}

function statusMeta(status: TestStatus) {
  if (status === "PUBLISHED") return { label: "Sẵn sàng", dot: "bg-emerald-600", chip: "bg-emerald-100 text-emerald-800" };
  if (status === "DRAFT") return { label: "Chờ duyệt", dot: "bg-amber-600", chip: "bg-amber-100 text-amber-900" };
  return { label: "Đã lưu trữ", dot: "bg-[var(--color-outline)]", chip: "bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)]" };
}

function difficultyClass(level: Difficulty) {
  if (level === "Cơ bản") return "bg-emerald-100/70 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-0";
  if (level === "Nâng cao") return "bg-rose-100/70 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-0";
  return "bg-amber-100/70 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-0";
}

function downloadCsv(rows: BankRow[]) {
  const header = ["Mã", "Câu hỏi", "Đề", "Vị trí", "Loại câu", "Điểm", "Trạng thái", "Kỹ năng"];
  const body = rows.map((row) => [
    row.code,
    row.question.questionText,
    row.testTitle,
    row.jobTitle,
    row.content ? typeMeta(row.content.kind).label : "Trắc nghiệm đơn",
    String(row.question.points),
    statusMeta(row.testStatus).label,
    row.skills.join("; "),
  ]);
  const csv = [header, ...body]
    .map((line) => line.map((cell) => `"${cell.replaceAll('"', '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "ngan-hang-cau-hoi.csv";
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
          <td className="w-[45%] px-3 py-3">
            <div className="flex flex-wrap items-center gap-1.5">
              <Skeleton className="h-5 w-16 rounded-md" />
              <Skeleton className="h-5 w-20 rounded-full" />
              <Skeleton className="h-5 w-20 rounded-md" />
              <Skeleton className="h-5 w-14 rounded-md" />
            </div>
            <Skeleton className="mt-2 h-4 w-4/5 rounded" />
            <Skeleton className="mt-1.5 h-3.5 w-3/5 rounded" />
          </td>
          <td className="w-[15%] px-3 py-3">
            <div className="flex flex-wrap items-center gap-1">
              <Skeleton className="h-5 w-14 rounded-md" />
              <Skeleton className="h-5 w-12 rounded-md" />
            </div>
          </td>
          <td className="w-[14%] px-3 py-3">
            <div className="flex flex-col items-start gap-1.5">
              <Skeleton className="h-5 w-16 rounded-full" />
              <Skeleton className="h-3.5 w-20 rounded" />
            </div>
          </td>
          <td className="w-[16%] px-3 py-3">
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-4 w-28 rounded" />
              <Skeleton className="h-3 w-20 rounded" />
            </div>
          </td>
          <td className="w-24 px-3 py-3 text-center">
            <div className="flex items-center justify-center gap-1">
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
  const job = useRecruitmentJob();
  const client = useQueryClient();
  const basePath = `/recruiter/jobs/${job.id}/assessments`;
  const workspace = getTenantTheme(getTenantIdFromWindow() ?? "acme").name;

  const [params, setParams] = useSearchParams();

  const requestedPage = Math.max(1, parseInt(params.get("page") || "1", 10) || 1);
  const rawSize = parseInt(params.get("limit") || params.get("size") || "10", 10);
  const requestedSize = (PAGE_SIZE_OPTIONS as readonly number[]).includes(rawSize) ? rawSize : 10;
  const requestedTab = (params.get("tab") as Collection) ?? "all";
  const initialCollection: Collection = ["all", "favorites", "ready", "pending", "archived"].includes(requestedTab) ? requestedTab : "all";
  const requestedQ = params.get("q") ?? "";
  const requestedSkill = params.get("skill") ?? "";
  const requestedDifficulty = (params.get("difficulty") as Difficulty | "") ?? "";
  const initialDifficulty: Difficulty | "" = ["Cơ bản", "Vận dụng", "Nâng cao"].includes(requestedDifficulty) ? requestedDifficulty : "";
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

  // Sync state with URL params on browser back/forward
  useEffect(() => {
    const p = Math.max(1, parseInt(params.get("page") || "1", 10) || 1);
    const raw = parseInt(params.get("limit") || params.get("size") || "10", 10);
    const s = (PAGE_SIZE_OPTIONS as readonly number[]).includes(raw) ? raw : 10;
    const tab = (params.get("tab") as Collection) ?? "all";
    const col: Collection = ["all", "favorites", "ready", "pending", "archived"].includes(tab) ? tab : "all";
    const q = params.get("q") ?? "";
    const sk = params.get("skill") ?? "";
    const df = (params.get("difficulty") as Difficulty | "") ?? "";
    const diff: Difficulty | "" = ["Cơ bản", "Vận dụng", "Nâng cao"].includes(df) ? df : "";
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
      `Vị trí: ${job.title}`,
      job.department ? `Phòng ban: ${job.department}` : "",
      jobSkills.length ? `Kỹ năng: ${jobSkills.join(", ")}` : "",
      job.description ? `JD: ${job.description}` : "",
    ].filter(Boolean);
    return parts.join("\n").slice(0, 1500);
  }, [job, jobSkills]);

  const favoriteIds = useMemo(
    () =>
      [...favorites]
        .map((key) => Number(key.split("-").pop()))
        .filter((n) => Number.isFinite(n) && n > 0)
        .sort((a, b) => a - b),
    [favorites]
  );
  const apiDifficulty = difficulty === "Cơ bản" ? "Easy" : difficulty === "Vận dụng" ? "Medium" : difficulty === "Nâng cao" ? "Hard" : undefined;

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
    placeholderData: (previousData) => previousData,
  });
  const isInitialLoading = tests.isLoading;

  const rows = useMemo<BankRow[]>(() => {
    return (tests.data?.items ?? []).map((item) => ({
      key: item.testId ? `${item.testId}-${item.question.id}` : `bank-${item.question.id}`,
      testId: item.testId,
      testTitle: item.testTitle ?? "Ngân hàng chung",
      testStatus: item.archived ? "ARCHIVED" : item.testStatus ?? "DRAFT",
      jobId: item.jobId,
      jobTitle: item.jobTitle ?? "Tất cả vị trí",
      department: item.jobId === job.id ? job.department ?? "" : "",
      question: item.question,
      content: bankQuestionAuthoring(item),
      code: questionCode(item.question.id),
      skills: skillsOf(item.question.questionText, item.question.skill),
      difficulty: difficultyLabel(item.question.difficulty, item.question.points),
      aiGenerated: isAiGenerated(item.authoringMetadata),
    }));
  }, [tests.data, job]);
  const questionPath = (row: BankRow) => row.testId && row.jobId
    ? `/recruiter/jobs/${row.jobId}/assessments/${row.testId}`
    : `/recruiter/question-bank/${row.question.id}/edit`;

  const skillOptions = useMemo(() => {
    const list = tests.data?.skills ?? [];
    return [...new Set([...jobSkills, ...list])].filter(Boolean).sort((a, b) => a.localeCompare(b, "vi"));
  }, [tests.data?.skills, jobSkills]);

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
          label: `Loại câu: ${
            questionType === "MCQ"
              ? "Trắc nghiệm đơn"
              : questionType === "MULTIPLE_CHOICE"
              ? "Nhiều đáp án"
              : questionType === "QUIZ"
              ? "Trắc nghiệm"
              : questionType === "CODING"
              ? "Bài tập Code"
              : "Tự luận lý thuyết"
          }`,
        }
      : null,
    skill ? { id: "skill", label: `Kỹ năng: ${skill}` } : null,
    difficulty ? { id: "difficulty", label: `Độ khó: ${difficulty}` } : null,
    status ? { id: "status", label: `Trạng thái: ${statusMeta(status).label}` } : null,
    query.trim() ? { id: "query", label: `Từ khóa: "${query.trim()}"` } : null,
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

  const openRow = (key: string) => {
    setActiveKey(key);
    setDrawerTab("content");
    setMenuKey(null);
  };

  return (
    <section className="flex flex-col gap-5 text-[var(--color-on-surface)]">
      <header>
        <Breadcrumb
          items={[
            { label: "Kho tài nguyên", to: basePath },
            { label: "Ngân hàng câu hỏi" },
          ]}
          meta={
            <span className="rounded-full bg-[var(--color-surface-container-high)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-on-surface-variant)]">
              Workspace: {workspace}
            </span>
          }
          actions={
            <>
              <button
                type="button"
                onClick={() => setAiOpen(true)}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 px-3 text-sm font-semibold text-white shadow-md"
              >
                <Sparkles className="size-4 text-amber-200" aria-hidden="true" />
                Sinh bằng AI
                <span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px] uppercase tracking-widest">GenAI</span>
              </button>
              <Link
                to={`${basePath}/excel-template`}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-slate-100 hover:bg-slate-200/70 dark:bg-slate-800 dark:hover:bg-slate-700 px-3 text-sm font-medium text-slate-700 dark:text-slate-200 shadow-2xs transition-colors"
              >
                <Table2 className="size-4 text-emerald-600" aria-hidden="true" />
                Nhập Excel
              </Link>
              <button
                type="button"
                onClick={() => downloadCsv(rows)}
                className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--color-primary)] px-3 text-sm font-semibold text-white shadow-sm hover:bg-[var(--color-primary-hover)]"
              >
                <Download className="size-4" aria-hidden="true" />
                Xuất ngân hàng
              </button>
            </>
          }
        />
      </header>

      <AssessmentError error={tests.error} retry={() => void tests.refetch()} />

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[224px_minmax(0,1fr)]">
        <aside className="flex w-full flex-col gap-3 rounded-2xl bg-slate-50/70 dark:bg-slate-900/40 p-2.5">
          <div className="flex flex-col gap-1">
            <p className="px-2.5 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Bộ sưu tập hệ thống</p>
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
                      "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition-colors",
                      activeCollection
                        ? "bg-[var(--color-primary)] font-semibold text-white shadow-xs"
                        : "text-[var(--color-on-surface-variant)] hover:bg-slate-200/60 dark:hover:bg-slate-800/60 hover:text-[var(--color-on-surface)]",
                    )}
                  >
                    <span className="flex items-center gap-2 truncate">
                      <Icon className={cn("size-3.5 shrink-0", item.id === "favorites" && !activeCollection && "text-amber-500")} aria-hidden="true" />
                      <span className="truncate">{item.label}</span>
                    </span>
                    <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-semibold", activeCollection ? "bg-white/20 text-white" : "bg-slate-200/60 dark:bg-slate-800 text-slate-600 dark:text-slate-300")}>
                      {isInitialLoading ? "…" : counts[item.id]}
                    </span>
                  </button>
                );
              })}
            </div>
            <Link to="/recruiter" className="mt-2 flex items-center justify-center gap-1.5 rounded-lg bg-slate-200/50 dark:bg-slate-800/60 px-2.5 py-1.5 text-xs font-semibold text-[var(--color-primary)] hover:bg-slate-200/80 dark:hover:bg-slate-800 transition-colors">
              Quản lý vị trí tuyển dụng
            </Link>
          </div>

          <div className="overflow-hidden rounded-xl bg-white/80 dark:bg-slate-800/50 p-3.5 shadow-2xs">
            <div className="flex items-center justify-between gap-1">
              <h2 className="text-xs font-semibold">Độ phủ ngân hàng đề</h2>
              <Sparkles className="size-3.5 shrink-0 text-[var(--color-primary)]" aria-hidden="true" />
            </div>
            {isInitialLoading ? (
              <div className="mt-2.5 space-y-2">
                <Skeleton className="h-3 w-3/4 rounded" />
                <Skeleton className="h-1.5 w-full rounded-full" />
                <Skeleton className="h-3 w-1/2 rounded" />
              </div>
            ) : (
              <>
                <p className="mt-1.5 text-[11px] leading-relaxed text-[var(--color-on-surface-variant)]">
                  {coverage}% câu hỏi nằm trên đề đã xuất bản và có thể giao cho ứng viên.
                </p>
                <div className="relative mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${Math.min(100, Math.max(0, coverage))}%` }}
                  />
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-[var(--color-on-surface-variant)]">
                  <span>Sẵn sàng</span>
                  <span className="font-semibold text-emerald-700 dark:text-emerald-400">
                    {readyCount} / {rows.length} ({coverage}%)
                  </span>
                </div>
              </>
            )}
          </div>
        </aside>

        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-2.5 rounded-2xl bg-slate-100/70 dark:bg-slate-800/50 p-2 sm:p-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl bg-white dark:bg-slate-900 px-3 py-1.5 shadow-2xs focus-within:ring-2 focus-within:ring-[var(--color-primary)]">
                <Search className="size-4 shrink-0 text-[var(--color-on-surface-variant)]" aria-hidden="true" />
                <input
                  value={query}
                  onChange={(event) => handleQueryChange(event.target.value)}
                  className="w-full bg-transparent text-xs outline-none placeholder:text-[var(--color-outline)]"
                  placeholder="Tra cứu theo mã #QB-..., từ khóa câu hỏi, kỹ năng..."
                  aria-label="Tìm câu hỏi"
                />
                {query && (
                  <button type="button" aria-label="Xóa nội dung tìm kiếm" onClick={() => handleQueryChange("")} className="text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]">
                    <X className="size-3.5" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-1">
                <select
                  aria-label="Lọc kỹ năng"
                  value={skill}
                  onChange={(event) => handleSkillChange(event.target.value)}
                  className={cn(
                    "h-8 rounded-lg px-2 text-xs outline-none transition-colors cursor-pointer border-0",
                    skill
                      ? "bg-white/80 dark:bg-slate-900/80 font-semibold text-[var(--color-primary)] shadow-2xs"
                      : "bg-transparent text-[var(--color-on-surface-variant)] hover:bg-white/50 dark:hover:bg-slate-700/40 hover:text-[var(--color-on-surface)]"
                  )}
                >
                  <option value="">Tất cả kỹ năng</option>
                  {(jobSkills.length ? [...new Set([...jobSkills, ...skillOptions])] : skillOptions).map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>

                <select
                  aria-label="Lọc loại câu hỏi"
                  value={questionType}
                  onChange={(event) => setQuestionType(event.target.value)}
                  className={cn(
                    "h-8 rounded-lg px-2 text-xs outline-none transition-colors cursor-pointer border-0",
                    questionType
                      ? "bg-white/80 dark:bg-slate-900/80 font-semibold text-[var(--color-primary)] shadow-2xs"
                      : "bg-transparent text-[var(--color-on-surface-variant)] hover:bg-white/50 dark:hover:bg-slate-700/40 hover:text-[var(--color-on-surface)]"
                  )}
                >
                  <option value="">Tất cả loại câu</option>
                  <option value="MCQ">Trắc nghiệm đơn</option>
                  <option value="MULTIPLE_CHOICE">Nhiều đáp án</option>
                  <option value="QUIZ">Trắc nghiệm</option>
                  <option value="ESSAY">Tự luận lý thuyết</option>
                  <option value="CODING">Bài tập Code</option>
                </select>

                <select
                  aria-label="Lọc độ khó"
                  value={difficulty}
                  onChange={(event) => handleDifficultyChange(event.target.value as Difficulty | "")}
                  className={cn(
                    "h-8 rounded-lg px-2 text-xs outline-none transition-colors cursor-pointer border-0",
                    difficulty
                      ? "bg-white/80 dark:bg-slate-900/80 font-semibold text-[var(--color-primary)] shadow-2xs"
                      : "bg-transparent text-[var(--color-on-surface-variant)] hover:bg-white/50 dark:hover:bg-slate-700/40 hover:text-[var(--color-on-surface)]"
                  )}
                >
                  <option value="">Tất cả độ khó</option>
                  <option value="Cơ bản">Cơ bản</option>
                  <option value="Vận dụng">Vận dụng</option>
                  <option value="Nâng cao">Nâng cao</option>
                </select>

                <select
                  aria-label="Lọc trạng thái"
                  value={status}
                  onChange={(event) => handleStatusChange(event.target.value as TestStatus | "")}
                  className={cn(
                    "h-8 rounded-lg px-2 text-xs outline-none transition-colors cursor-pointer border-0",
                    status
                      ? "bg-white/80 dark:bg-slate-900/80 font-semibold text-[var(--color-primary)] shadow-2xs"
                      : "bg-transparent text-[var(--color-on-surface-variant)] hover:bg-white/50 dark:hover:bg-slate-700/40 hover:text-[var(--color-on-surface)]"
                  )}
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="PUBLISHED">Sẵn sàng</option>
                  <option value="DRAFT">Chờ duyệt</option>
                  <option value="ARCHIVED">Đã lưu trữ</option>
                </select>

                <button
                  type="button"
                  onClick={handleAiOnlyToggle}
                  className={cn(
                    "inline-flex h-8 items-center gap-1.5 rounded-lg px-2.5 text-xs font-medium transition-colors",
                    aiOnly
                      ? "bg-violet-100 text-violet-700 font-semibold dark:bg-violet-950/60 dark:text-violet-300 shadow-2xs"
                      : "bg-transparent text-[var(--color-on-surface-variant)] hover:bg-white/60 dark:hover:bg-slate-700/50 hover:text-[var(--color-on-surface)]"
                  )}
                >
                  <Sparkles className={cn("size-3.5", aiOnly ? "text-violet-600" : "text-[var(--color-outline)]")} />
                  Chỉ câu AI
                </button>
              </div>

              <div className="hidden h-4 w-px bg-slate-300/60 dark:bg-slate-700 xl:block" />

              <div className="flex items-center gap-1.5">
                <select
                  aria-label="Sắp xếp"
                  value={sort}
                  onChange={(event) => handleSortChange(event.target.value as typeof sort)}
                  className="h-8 rounded-lg bg-transparent hover:bg-white/60 dark:hover:bg-slate-700/50 px-2.5 text-xs font-medium text-[var(--color-on-surface)] outline-none transition-colors cursor-pointer"
                >
                  <option value="latest">Mới cập nhật</option>
                  <option value="points">Điểm cao nhất</option>
                  <option value="text">Nội dung A-Z</option>
                </select>

                <div className="flex items-center rounded-lg bg-slate-200/60 dark:bg-slate-700/50 p-0.5">
                  <button
                    type="button"
                    aria-label="Dạng bảng"
                    aria-pressed={view === "table"}
                    onClick={() => handleViewChange("table")}
                    className={cn(
                      "rounded-md p-1.5 transition-colors",
                      view === "table"
                        ? "bg-white dark:bg-slate-900 text-[var(--color-primary)] shadow-2xs"
                        : "text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]"
                    )}
                  >
                    <Table2 className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Dạng thẻ"
                    aria-pressed={view === "cards"}
                    onClick={() => handleViewChange("cards")}
                    className={cn(
                      "rounded-md p-1.5 transition-colors",
                      view === "cards"
                        ? "bg-white dark:bg-slate-900 text-[var(--color-primary)] shadow-2xs"
                        : "text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]"
                    )}
                  >
                    <Grid3x3 className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {(chips.length > 0 || aiOnly) && (
              <div className="flex flex-wrap items-center gap-2 border-t border-slate-200/60 dark:border-slate-700/60 pt-2 px-1 text-xs">
                <span className="font-medium text-[var(--color-on-surface-variant)]">Bộ lọc đang bật:</span>
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
                      aria-label={`Xóa bộ lọc ${chip.label}`}
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
                {aiOnly && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300 px-2.5 py-0.5 text-xs font-medium">
                    <Sparkles className="size-3" /> Chỉ câu AI
                    <button
                      type="button"
                      onClick={handleAiOnlyToggle}
                      className="rounded-full p-0.5 hover:bg-violet-200/50 dark:hover:bg-violet-900"
                      aria-label="Bỏ lọc chỉ câu AI"
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
                  Xóa tất cả bộ lọc
                </button>
              </div>
            )}
          </div>

          {selected.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#213145] px-4 py-2.5 text-white shadow-lg">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="grid size-6 place-items-center rounded-full bg-[var(--color-primary)] text-xs font-bold">{selected.length}</span>
                Đã chọn {selected.length} câu hỏi
                <button type="button" className="text-xs text-sky-200 hover:underline" onClick={() => setSelected(pageRows.map((row) => row.key))}>
                  Chọn toàn bộ {pageRows.length} câu trên trang
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link to={basePath} className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium hover:bg-white/20">
                  <ClipboardList className="size-3.5" /> Thêm vào Assessment
                </Link>
                <Link to={`/recruiter/jobs/${job.id}/ai-interviews`} className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium hover:bg-white/20">
                  <Bot className="size-3.5" /> Thêm vào AI Interview
                </Link>
                <button type="button" onClick={() => downloadCsv(selectedRows)} className="inline-flex items-center gap-1.5 rounded-lg bg-white/10 px-3 py-1.5 text-xs font-medium hover:bg-white/20">
                  <Download className="size-3.5" /> Xuất file
                </button>
                <button
                  type="button"
                  onClick={() => toast.info("Lưu trữ từng câu chưa có API riêng", "Mở đề ở trạng thái nháp để sửa hoặc xóa câu hỏi.")}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-rose-400/20 px-3 py-1.5 text-xs font-medium text-rose-100 hover:bg-rose-400/30"
                >
                  <Archive className="size-3.5" /> Lưu trữ
                </button>
              </div>
            </div>
          )}

          <div className={cn(
            "overflow-hidden rounded-2xl bg-[var(--color-surface-card)] shadow-xs border border-slate-100/80 dark:border-slate-800/60 transition-opacity",
            tests.isFetching && !isInitialLoading && "opacity-75"
          )}>
            <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50/60 dark:bg-slate-800/30 px-4 py-2.5 text-xs text-[var(--color-on-surface-variant)] border-b border-slate-100 dark:border-slate-800/60">
              <p>
                {isInitialLoading ? (
                  <span>Đang tải danh sách câu hỏi…</span>
                ) : (
                  <>
                    Hiển thị <span className="font-semibold text-[var(--color-on-surface)]">{totalItems === 0 ? 0 : startIndex + 1} - {Math.min(totalItems, startIndex + pageRows.length)}</span> trên <span className="font-semibold text-[var(--color-on-surface)]">{totalItems}</span> câu hỏi
                  </>
                )}
              </p>
              {tests.isFetching && (
                <span className="inline-flex items-center gap-1 font-medium text-[var(--color-primary)]" role="status">
                  <Loader2 className="size-3.5 animate-spin" />
                  Đang đồng bộ…
                </span>
              )}
            </div>

            {tests.isSuccess && !isInitialLoading && !isTableTransitioning && totalItems === 0 && (
              <div className="flex flex-col items-start gap-2 p-8">
                <FolderOpen className="size-8 text-[var(--color-primary)]" aria-hidden="true" />
                <p className="font-semibold">Không có câu hỏi phù hợp</p>
                <p className="text-sm text-[var(--color-on-surface-variant)]">{job.skills.length ? "Đổi bộ lọc hoặc thêm câu hỏi vào ngân hàng chung với skill phù hợp với job." : "Job chưa có skill. Thêm skill cho job để hiển thị câu hỏi phù hợp từ ngân hàng chung."}</p>
                <Link to={basePath} className="text-sm font-semibold text-[var(--color-primary)] hover:underline">Về danh sách bài đánh giá</Link>
              </div>
            )}

            {view === "table" && (isInitialLoading || isTableTransitioning || pageRows.length > 0) && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[860px] table-fixed border-collapse text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/40 dark:bg-slate-800/20 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                      <th className="w-10 px-3 py-3">
                        <input
                          type="checkbox"
                          checked={allPageSelected}
                          aria-label="Chọn các câu trên trang"
                          onChange={() => setSelected((current) => allPageSelected ? current.filter((key) => !pageKeys.includes(key)) : [...new Set([...current, ...pageKeys])])}
                          className="size-4 rounded accent-[var(--color-primary)]"
                        />
                      </th>
                      <th className="w-[45%] px-3 py-3">Câu hỏi & Nội dung</th>
                      <th className="w-[15%] px-3 py-3">Kỹ năng</th>
                      <th className="w-[14%] px-3 py-3">Độ khó</th>
                      <th className="w-[16%] px-3 py-3">Nơi sử dụng</th>
                      <th className="w-24 px-3 py-3 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                    {isInitialLoading || isTableTransitioning ? (
                      <QuestionTableRowsSkeleton rows={pageSize} />
                    ) : (
                      pageRows.map((row) => {
                        const meta = statusMeta(row.testStatus);
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
                            <td className="px-3 py-3" onClick={(event) => event.stopPropagation()}>
                              <input
                                type="checkbox"
                                checked={selected.includes(row.key)}
                                aria-label={`Chọn ${row.code}`}
                                onChange={() => toggleOne(row.key)}
                                className="size-4 rounded accent-[var(--color-primary)]"
                              />
                            </td>
                            <td className="px-3 py-3">
                              <div className="flex flex-wrap items-center gap-1.5">
                                <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-slate-200/90 text-slate-900 dark:bg-slate-800 dark:text-slate-100 border-0">
                                  {row.code}
                                </span>
                                <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border-0", meta.chip)}>
                                  <span className={cn("size-1.5 rounded-full", meta.dot)} />
                                  {meta.label}
                                </span>
                                <span className="rounded-md bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:text-slate-400 border-0">
                                  {typeLabel(row.question.questionType)}
                                </span>
                                <span className="rounded-md bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:text-slate-400 border-0">
                                  {row.question.points} điểm
                                </span>
                                {row.question.options && row.question.options.length > 0 && (
                                  <span className="rounded-md bg-slate-100 dark:bg-slate-800/80 px-2 py-0.5 text-[11px] font-medium text-slate-600 dark:text-slate-400 border-0">
                                    {row.question.options.length} phương án
                                  </span>
                                )}
                                {row.aiGenerated && (
                                  <span className="inline-flex items-center gap-0.5 rounded-full bg-violet-100/70 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300 px-2 py-0.5 text-[10px] font-semibold border-0">
                                    <Sparkles className="size-2.5" aria-hidden="true" /> AI
                                  </span>
                                )}
                              </div>
                              <p
                                className="mt-1.5 line-clamp-2 text-sm font-medium text-[var(--color-on-surface)] leading-relaxed group-hover:text-[var(--color-primary)] transition-colors"
                                title={row.question.questionText}
                              >
                                {row.question.questionText}
                              </p>
                            </td>
                            <td className="px-3 py-3" onClick={(event) => event.stopPropagation()}>
                              <div className="flex flex-wrap items-center gap-1">
                                {(row.skills.length ? row.skills : ["—"]).slice(0, 2).map((item) => (
                                  <button
                                    key={item}
                                    type="button"
                                    title={`Lọc theo ${item}`}
                                    onClick={() => handleSkillChange(item === "—" ? "" : item)}
                                    className={cn(
                                      "rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors border-0",
                                      skill === item
                                        ? "bg-[var(--color-primary)] text-white font-semibold"
                                        : "bg-[#E0F2FE] text-[#0369A1] hover:bg-sky-200/80 dark:bg-sky-950/60 dark:text-sky-300",
                                    )}
                                  >
                                    {item}
                                  </button>
                                ))}
                                {row.skills.length > 2 && (
                                  <span
                                    className="rounded-md bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-[11px] font-medium text-slate-600 dark:text-slate-300 border-0"
                                    title={row.skills.slice(2).join(", ")}
                                  >
                                    +{row.skills.length - 2}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-3 py-3">
                              <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold", difficultyClass(row.difficulty))}>
                                {row.difficulty}
                              </span>
                            </td>
                            <td className="px-3 py-3 text-xs">
                              {row.testTitle && row.testTitle !== row.jobTitle ? (
                                <>
                                  <p className="truncate font-medium text-[var(--color-on-surface)]" title={row.testTitle}>
                                    {row.testTitle}
                                  </p>
                                  <p className="mt-0.5 truncate text-[var(--color-on-surface-variant)] text-[11px]" title={row.jobTitle}>
                                    {row.jobTitle}
                                  </p>
                                </>
                              ) : (
                                <p className="truncate font-medium text-[var(--color-on-surface)]" title={row.jobTitle || row.testTitle || "—"}>
                                  {row.jobTitle || row.testTitle || "—"}
                                </p>
                              )}
                            </td>
                            <td className="px-3 py-3 text-center" onClick={(event) => event.stopPropagation()}>
                              <div className="relative flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  title="Xem chi tiết câu hỏi"
                                  aria-label="Xem chi tiết"
                                  onClick={() => openRow(row.key)}
                                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[var(--color-primary)] transition-colors"
                                >
                                  <Eye className="size-4" />
                                </button>
                                <Link
                                  to={questionPath(row)}
                                  title="Chỉnh sửa câu hỏi"
                                  aria-label="Chỉnh sửa câu hỏi"
                                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[var(--color-primary)] transition-colors"
                                >
                                  <Pencil className="size-4" />
                                </Link>
                                <button
                                  type="button"
                                  title="Tùy chọn khác"
                                  aria-label="Tùy chọn khác"
                                  onClick={() => setMenuKey(menuKey === row.key ? null : row.key)}
                                  className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-[var(--color-on-surface)] transition-colors"
                                >
                                  <MoreVertical className="size-4" />
                                </button>

                                {menuKey === row.key && (
                                  <div className="absolute right-0 top-8 z-20 w-44 rounded-xl bg-white dark:bg-slate-900 p-1 text-left text-xs shadow-xl border border-slate-100 dark:border-slate-800">
                                    <button
                                      type="button"
                                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[var(--color-on-surface)] hover:bg-slate-100 dark:hover:bg-slate-800"
                                      onClick={() => { void navigator.clipboard.writeText(row.question.questionText); setMenuKey(null); }}
                                    >
                                      <Copy className="size-3.5" /> Sao chép nội dung
                                    </button>
                                    <button
                                      type="button"
                                      className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[var(--color-on-surface)] hover:bg-slate-100 dark:hover:bg-slate-800"
                                      onClick={() => { toggleFavorite(row.key); setMenuKey(null); }}
                                    >
                                      <Star className={cn("size-3.5", favorites.has(row.key) && "fill-amber-500 text-amber-500")} />
                                      {favorites.has(row.key) ? "Bỏ yêu thích" : "Đánh dấu yêu thích"}
                                    </button>
                                  </div>
                                )}
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

            {view === "cards" && (isInitialLoading || isTableTransitioning || pageRows.length > 0) && (
              isInitialLoading || isTableTransitioning ? (
                <QuestionCardsSkeleton count={Math.min(pageSize, 6)} />
              ) : (
                <div className="grid gap-3.5 p-4 md:grid-cols-2">
                  {pageRows.map((row) => {
                    const meta = statusMeta(row.testStatus);
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
                                {row.difficulty}
                              </span>
                              {row.aiGenerated && (
                                <span className="inline-flex items-center gap-0.5 rounded-full bg-violet-100/70 text-violet-700 dark:bg-violet-950/50 dark:text-violet-300 px-2 py-0.5 text-[10px] font-semibold border-0">
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
                            {row.question.points} điểm · {typeLabel(row.question.questionType)}
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
                  Hiển thị <span className="font-semibold text-[var(--color-on-surface)]">{totalItems === 0 ? 0 : startIndex + 1}–{Math.min(startIndex + pageSize, totalItems)}</span> trên <span className="font-semibold text-[var(--color-on-surface)]">{totalItems}</span> câu hỏi
                </span>
                <span>·</span>
                <span className="tabular-nums">Trang {currentPage} / {totalPages}</span>
                {tests.isFetching && !isInitialLoading && (
                  <span className="inline-flex items-center gap-1 font-medium text-[var(--color-primary)] ml-1">
                    <Loader2 className="size-3.5 animate-spin" />
                    <span className="hidden sm:inline">Đang tải…</span>
                  </span>
                )}
              </div>

              {/* [GIỮA]: Dropdown chọn số dòng / trang */}
              <div className="flex items-center justify-start lg:justify-center">
                <label className="flex items-center gap-1.5">
                  <span>Hiển thị</span>
                  <select
                    value={pageSize}
                    onChange={(e) => goToPage(1, Number(e.target.value))}
                    className="h-8 rounded-lg bg-white dark:bg-slate-800 px-2 text-xs font-semibold text-[var(--color-on-surface)] outline-none shadow-2xs hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200/80 dark:border-slate-700 cursor-pointer"
                  >
                    {PAGE_SIZE_OPTIONS.map((s) => (
                      <option key={s} value={s}>{s} / trang</option>
                    ))}
                  </select>
                </label>
              </div>

              {/* [PHẢI]: Nút điều hướng + Nhập trang nhanh */}
              <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                <nav className="flex items-center gap-1" aria-label="Phân trang câu hỏi">
                  <button
                    type="button"
                    title="Về trang đầu"
                    aria-label="Về trang đầu"
                    disabled={currentPage === 1}
                    onClick={() => goToPage(1)}
                    className="grid size-8 place-items-center rounded-lg border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-[var(--color-on-surface)] shadow-2xs transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronsLeft className="size-4" />
                  </button>
                  <button
                    type="button"
                    title="Trang trước"
                    aria-label="Trang trước"
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
                        aria-label={`Trang ${item}`}
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
                    title="Trang tiếp"
                    aria-label="Trang tiếp"
                    disabled={currentPage >= totalPages}
                    onClick={() => goToPage(currentPage + 1)}
                    className="grid size-8 place-items-center rounded-lg border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-[var(--color-on-surface)] shadow-2xs transition-colors hover:bg-slate-100 dark:hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                  <button
                    type="button"
                    title="Đến trang cuối"
                    aria-label="Đến trang cuối"
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
                  <span>Đi đến:</span>
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    placeholder={String(currentPage)}
                    value={jumpInput}
                    onChange={(e) => setJumpInput(e.target.value)}
                    className="h-8 w-11 rounded-lg border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 text-center text-xs font-semibold text-[var(--color-on-surface)] outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                  />
                  <span>Trang</span>
                  <button
                    type="submit"
                    disabled={!jumpInput || Number(jumpInput) < 1 || Number(jumpInput) > totalPages}
                    className="inline-flex h-8 items-center rounded-lg border border-slate-200/80 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-xs font-semibold text-[var(--color-on-surface)] hover:bg-slate-100 dark:hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Đi
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      {active && (
        <>
          <button type="button" aria-label="Đóng chi tiết câu hỏi" className="fixed inset-0 z-40 bg-[#213145]/40 backdrop-blur-sm" onClick={() => setActiveKey(null)} />
          <aside className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[540px] flex-col bg-[var(--color-surface-card)] shadow-2xl" aria-label="Chi tiết câu hỏi">
            <div className="flex items-center justify-between gap-2 bg-[var(--color-surface-container-low)] px-5 py-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-bold text-[var(--color-primary)]">{active.code}</span>
                <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold", statusMeta(active.testStatus).chip)}>
                  <span className={cn("size-1.5 rounded-full", statusMeta(active.testStatus).dot)} />
                  {statusMeta(active.testStatus).label}
                </span>
              </div>
              <button type="button" aria-label="Đóng panel" onClick={() => setActiveKey(null)} className="rounded-lg p-1.5 text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)]">
                <X className="size-5" />
              </button>
            </div>
            <div className="flex border-b border-[var(--color-surface-container)] px-3">
              {([
                ["content", "Nội dung chi tiết"],
                ["usage", "Nơi sử dụng"],
                ["history", "Lịch sử"],
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
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Đề bài câu hỏi</p>
                    <p className="mt-2 rounded-xl bg-[var(--color-surface-container-low)] p-4 text-sm leading-6">{active.question.questionText}</p>
                  </div>
                  {active.question.options.length > 0 && (
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Phương án</p>
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
                      <p>Loại câu: {typeMeta(active.content.kind).label}</p>
                      <p>Ngôn ngữ: {active.content.language || "—"}</p>
                      {active.content.snippet && (
                        <pre className="overflow-x-auto whitespace-pre-wrap rounded-lg bg-[var(--color-surface-container)] p-3">{active.content.snippet}</pre>
                      )}
                      <p className="whitespace-pre-wrap">Đáp án mẫu: {active.content.sample || "Chưa có"}</p>
                      {active.content.rubric.map((item) => (
                        <p key={item.level} className="whitespace-pre-wrap">{item.text}</p>
                      ))}
                    </div>
                  )}
                  {active.question.rubricJson && (
                    <div className="space-y-2 rounded-lg bg-[var(--color-surface-container-low)] p-3 text-sm">
                      <h3 className="font-semibold">Rubric chấm điểm</h3>
                      <p className="whitespace-pre-wrap">{active.question.rubricJson.referenceAnswer}</p>
                      {active.question.rubricJson.criteria.map((criterion, i) => (
                        <p key={i}>{criterion.weight}% · {criterion.description}</p>
                      ))}
                    </div>
                  )}
                  {active.question.coding && (
                    <div className="space-y-2 rounded-lg bg-[var(--color-surface-container-low)] p-3 text-sm">
                      <h3 className="font-semibold">Bài lập trình</h3>
                      <p>{active.question.coding.category} · {active.question.coding.timeLimitMs} ms · {active.question.coding.memoryMb} MB</p>
                      <p>{active.question.coding.testCases.filter(test => test.sample).length} test công khai · {active.question.coding.testCases.filter(test => !test.sample).length} test ẩn</p>
                      {Object.entries(active.question.coding.starterCode).map(([language, code]) => (
                        <pre key={language} className="overflow-auto whitespace-pre-wrap font-mono text-xs">{language}{"\n"}{code}</pre>
                      ))}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-[var(--color-surface-container)] p-3">
                      <p className="text-[11px] text-[var(--color-on-surface-variant)]">Điểm số</p>
                      <p className="text-base font-bold">{active.question.points} điểm</p>
                    </div>
                    <div className="rounded-lg bg-[var(--color-surface-container)] p-3">
                      <p className="text-[11px] text-[var(--color-on-surface-variant)]">Độ khó theo điểm</p>
                      <p className="text-base font-bold">{active.difficulty}</p>
                    </div>
                  </div>
                  <div className="rounded-xl bg-[var(--color-surface-container-low)] p-4 text-sm">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Phân loại</p>
                    <dl className="mt-3 grid grid-cols-2 gap-3">
                      <div><dt className="text-xs text-[var(--color-on-surface-variant)]">Nhóm</dt><dd className="font-semibold">{active.department}</dd></div>
                      <div><dt className="text-xs text-[var(--color-on-surface-variant)]">Vị trí</dt><dd className="font-semibold">{active.jobTitle}</dd></div>
                      <div className="col-span-2">
                        <dt className="text-xs text-[var(--color-on-surface-variant)]">Kỹ năng nhận diện</dt>
                        <dd className="mt-1 flex flex-wrap gap-1">
                          {(active.skills.length ? active.skills : ["Chưa khớp từ khóa"]).map((item) => (
                            <span key={item} className="rounded bg-[var(--color-surface-card)] px-2 py-0.5 text-xs font-semibold">{item}</span>
                          ))}
                        </dd>
                      </div>
                    </dl>
                  </div>
                  {active.testStatus === "PUBLISHED" && (
                    <div className="flex gap-2 rounded-xl bg-amber-50 p-3.5 text-sm text-amber-950">
                      <Shield className="mt-0.5 size-5 shrink-0 text-amber-600" aria-hidden="true" />
                      <p>Câu hỏi đang nằm trong đề đã xuất bản <strong>{active.testTitle}</strong>. Nội dung đã khóa cho đến khi đề được đưa về nháp.</p>
                    </div>
                  )}
                </>
              )}
              {drawerTab === "usage" && (
                <div className="rounded-xl bg-[var(--color-surface-container-low)] p-4">
                  <p className="text-xs text-[var(--color-on-surface-variant)]">Bài đánh giá</p>
                  <p className="mt-1 font-semibold">{active.testTitle}</p>
                  <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">{active.jobTitle}</p>
                  <Link to={questionPath(active)} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-primary)] hover:underline">
                    <InfinityIcon className="size-4" /> {active.testId ? "Mở đề" : "Mở câu hỏi chung"}
                  </Link>
                </div>
              )}
              {drawerTab === "history" && (
                <p className="text-sm text-[var(--color-on-surface-variant)]">
                  Câu hỏi thuộc đề hiện tại. Hệ thống chưa lưu các phiên bản nội dung trước đó.
                </p>
              )}
            </div>
            <div className="border-t border-[var(--color-surface-container)] bg-[var(--color-surface-container-low)] px-5 py-4">
              <div className="mb-2 flex items-center justify-between">
                <button type="button" onClick={() => void navigator.clipboard.writeText(active.question.questionText)} className="inline-flex items-center gap-1 rounded-lg px-2 py-2 text-xs text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)]">
                  <Copy className="size-4" /> Sao chép
                </button>
                <button type="button" onClick={() => toggleFavorite(active.key)} className="inline-flex items-center gap-1 rounded-lg px-2 py-2 text-xs text-amber-700 hover:bg-amber-50">
                  <Star className={cn("size-4", favorites.has(active.key) && "fill-amber-500")} />
                  {favorites.has(active.key) ? "Đã yêu thích" : "Yêu thích"}
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Link to={questionPath(active)} className="rounded-lg bg-[var(--color-surface-card)] px-3 py-2.5 text-center text-sm font-semibold shadow-sm">
                  Chỉnh sửa câu hỏi
                </Link>
                <Link to={basePath} className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[var(--color-primary)] px-3 py-2.5 text-sm font-semibold text-white">
                  <ClipboardList className="size-4" /> Về Assessment
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
          toast.success("Đã lưu câu hỏi AI vào ngân hàng", "Câu hỏi đã được tạo theo ngữ cảnh JD của vị trí tuyển dụng.");
          setAiOpen(false);
          setAiOnly(true);
          await client.invalidateQueries({ queryKey: queryKeys.assessments.all() });
        }}
      />
    </section>
  );
}
