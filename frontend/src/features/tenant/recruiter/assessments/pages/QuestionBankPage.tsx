import { useRecruitmentJob } from "../../jobs/components/JobRecruitmentWorkspace";
import { useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Archive,
  Bot,
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
import { assessmentApi } from "@/api/tenant/assessmentApi";
import type { Question, TestStatus } from "@/api/types/assessment";
import { AssessmentError } from "@/components/ux/assessmentUi";
import { SKILL_CATALOG } from "@/features/tenant/recruiter/jobs/skillCatalog";
import { queryKeys } from "@/lib/query-keys";
import { getTenantIdFromWindow } from "@/lib/tenant";
import { getTenantTheme } from "@/lib/tenantTheme";
import { cn } from "@/lib/utils";

const FAVORITES_KEY = "smarthire.question-bank.favorites";
const SKILLS = SKILL_CATALOG.flatMap((group) => group.skills);

type Collection = "all" | "favorites" | "ready" | "pending" | "archived";
type ViewMode = "table" | "cards";
type DrawerTab = "content" | "usage" | "history";
type Difficulty = "Cơ bản" | "Vận dụng" | "Nâng cao";

type BankRow = {
  key: string;
  testId: number;
  testTitle: string;
  testStatus: TestStatus;
  jobId: number;
  jobTitle: string;
  department: string;
  question: Question;
  code: string;
  skills: string[];
  difficulty: Difficulty;
};

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

function questionCode(id: number) {
  return `#QB-${String(id).padStart(3, "0")}`;
}

function difficultyOf(points: number): Difficulty {
  if (points <= 5) return "Cơ bản";
  if (points <= 15) return "Vận dụng";
  return "Nâng cao";
}

function skillsOf(text: string) {
  const haystack = text.toLowerCase();
  const matched = SKILLS.filter((skill) => haystack.includes(skill.toLowerCase()));
  return matched.slice(0, 4);
}

function statusMeta(status: TestStatus) {
  if (status === "PUBLISHED") return { label: "Sẵn sàng", dot: "bg-emerald-600", chip: "bg-emerald-100 text-emerald-800" };
  if (status === "DRAFT") return { label: "Chờ duyệt", dot: "bg-amber-600", chip: "bg-amber-100 text-amber-900" };
  return { label: "Đã lưu trữ", dot: "bg-[var(--color-outline)]", chip: "bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)]" };
}

function difficultyClass(level: Difficulty) {
  if (level === "Cơ bản") return "bg-emerald-50 text-emerald-700";
  if (level === "Nâng cao") return "bg-rose-50 text-rose-700";
  return "bg-amber-50 text-amber-700";
}

function matchesCollection(row: BankRow, collection: Collection, favorites: Set<string>) {
  if (collection === "favorites") return favorites.has(row.key);
  if (collection === "ready") return row.testStatus === "PUBLISHED";
  if (collection === "pending") return row.testStatus === "DRAFT";
  if (collection === "archived") return row.testStatus === "ARCHIVED";
  return true;
}

function downloadCsv(rows: BankRow[]) {
  const header = ["Mã", "Câu hỏi", "Đề", "Vị trí", "Điểm", "Trạng thái", "Kỹ năng"];
  const body = rows.map((row) => [
    row.code,
    row.question.questionText,
    row.testTitle,
    row.jobTitle,
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

export function QuestionBankPage() {
  const job = useRecruitmentJob();
  const basePath = `/recruiter/jobs/${job.id}/assessments`;
  const workspace = getTenantTheme(getTenantIdFromWindow() ?? "acme").name;
  const [collection, setCollection] = useState<Collection>("all");
  const [query, setQuery] = useState("");
  const [skill, setSkill] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty | "">("");
  const [status, setStatus] = useState<TestStatus | "">("");
  const [sort, setSort] = useState<"latest" | "points" | "text">("latest");
  const [view, setView] = useState<ViewMode>("table");
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [selected, setSelected] = useState<string[]>([]);
  const [favorites, setFavorites] = useState<Set<string>>(loadFavorites);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [drawerTab, setDrawerTab] = useState<DrawerTab>("content");
  const [menuKey, setMenuKey] = useState<string | null>(null);
  const [notice, setNotice] = useState("");

  const tests = useQuery({
    queryKey: [...queryKeys.assessments.all(), "job", job.id],
    queryFn: () => assessmentApi.listForJob(job.id),
  });
  const items = tests.data?.items ?? [];
  const questionQueries = useQueries({
    queries: items.map((test) => ({
      queryKey: queryKeys.assessments.questions(test.id),
      queryFn: () => assessmentApi.questions(test.id),
      enabled: tests.isSuccess,
    })),
  });
  const loadingQuestions = questionQueries.some((item) => item.isPending);
  const questionError = questionQueries.find((item) => item.isError)?.error;
  const jobMap = useMemo(() => new Map([[job.id, { title: job.title, department: job.department ?? "" }]]), [job]);

  const rows = useMemo<BankRow[]>(() => {
    return items.flatMap((test, index) => {
      const questions = questionQueries[index]?.data ?? [];
      const job = jobMap.get(test.jobId);
      return questions.map((question) => ({
        key: `${test.id}-${question.id}`,
        testId: test.id,
        testTitle: test.title,
        testStatus: test.status,
        jobId: test.jobId,
        jobTitle: job?.title ?? `Vị trí #${test.jobId}`,
        department: job?.department ?? "Chưa phân nhóm",
        question,
        code: questionCode(question.id),
        skills: skillsOf(question.questionText),
        difficulty: difficultyOf(question.points),
      }));
    });
  }, [items, questionQueries, jobMap]);

  const skillOptions = useMemo(() => {
    const set = new Set<string>();
    for (const row of rows) row.skills.forEach((item) => set.add(item));
    return [...set].sort((a, b) => a.localeCompare(b, "vi"));
  }, [rows]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const next = rows.filter((row) => {
      if (!matchesCollection(row, collection, favorites)) return false;
      if (skill && !row.skills.includes(skill)) return false;
      if (difficulty && row.difficulty !== difficulty) return false;
      if (status && row.testStatus !== status) return false;
      if (!q) return true;
      return (
        row.question.questionText.toLowerCase().includes(q) ||
        row.code.toLowerCase().includes(q) ||
        row.testTitle.toLowerCase().includes(q) ||
        row.jobTitle.toLowerCase().includes(q) ||
        row.skills.some((item) => item.toLowerCase().includes(q))
      );
    });
    next.sort((a, b) => {
      if (sort === "points") return b.question.points - a.question.points;
      if (sort === "text") return a.question.questionText.localeCompare(b.question.questionText, "vi");
      return b.question.id - a.question.id;
    });
    return next;
  }, [rows, collection, favorites, skill, difficulty, status, query, sort]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount - 1);
  const pageRows = filtered.slice(safePage * pageSize, safePage * pageSize + pageSize);
  const readyCount = rows.filter((row) => row.testStatus === "PUBLISHED").length;
  const coverage = rows.length ? Math.round((readyCount / rows.length) * 100) : 0;
  const active = rows.find((row) => row.key === activeKey) ?? null;
  const selectedRows = rows.filter((row) => selected.includes(row.key));
  const pageKeys = pageRows.map((row) => row.key);
  const allPageSelected = pageKeys.length > 0 && pageKeys.every((key) => selected.includes(key));

  const counts: Record<Collection, number> = {
    all: rows.length,
    favorites: rows.filter((row) => favorites.has(row.key)).length,
    ready: readyCount,
    pending: rows.filter((row) => row.testStatus === "DRAFT").length,
    archived: rows.filter((row) => row.testStatus === "ARCHIVED").length,
  };

  const chips = [
    skill ? { id: "skill", label: `Kỹ năng: ${skill}` } : null,
    difficulty ? { id: "difficulty", label: `Độ khó: ${difficulty}` } : null,
    status ? { id: "status", label: `Trạng thái: ${statusMeta(status).label}` } : null,
    query.trim() ? { id: "query", label: query.trim() } : null,
  ].filter((chip): chip is { id: string; label: string } => chip !== null);

  const clearChip = (id: string) => {
    setPage(0);
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
    setCollection("all");
    setPage(0);
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
      <header className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[var(--color-on-surface-variant)]">
          <nav className="flex flex-wrap items-center gap-2" aria-label="Breadcrumb">
            <Link to={basePath} className="hover:text-[var(--color-primary)]">Kho tài nguyên</Link>
            <span>/</span>
            <span className="font-semibold text-[var(--color-on-surface)]">Ngân hàng câu hỏi</span>
            <span className="rounded-full bg-[var(--color-surface-container-high)] px-2 py-0.5 text-[11px] font-semibold">
              Workspace: {workspace}
            </span>
          </nav>
          <p className="inline-flex items-center gap-1.5">
            <span className="size-2 rounded-full bg-emerald-500" />
            {readyCount} câu sẵn sàng trên đề đã xuất bản
          </p>
        </div>
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-3xl font-semibold tracking-tight">Ngân hàng câu hỏi</h1>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary-subtle)] px-3 py-1 text-xs font-semibold text-[var(--color-primary)]">
                <ClipboardList className="size-3.5" aria-hidden="true" />
                {rows.length.toLocaleString("vi-VN")} câu hỏi đang lưu hành
              </span>
            </div>
            <p className="mt-2 text-sm leading-6 text-[var(--color-on-surface-variant)]">
              Tra cứu, phân loại theo vị trí và xem chi tiết câu hỏi trắc nghiệm đang dùng trong các bài đánh giá của workspace.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to={`/recruiter/jobs/${job.id}/ai-interviews`}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 px-4 text-sm font-semibold text-white shadow-md"
            >
              <Sparkles className="size-4 text-amber-200" aria-hidden="true" />
              Đề xuất bằng AI
              <span className="rounded bg-white/20 px-1.5 py-0.5 text-[10px] uppercase tracking-widest">GenAI</span>
            </Link>
            <Link
              to={`${basePath}/excel-template`}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--color-surface-card)] px-4 text-sm font-medium shadow-sm ring-1 ring-[var(--color-border-default)] hover:bg-[var(--color-surface-container-low)]"
            >
              <Table2 className="size-4 text-emerald-600" aria-hidden="true" />
              Nhập Excel
            </Link>
            <button
              type="button"
              onClick={() => downloadCsv(filtered)}
              className="inline-flex h-10 items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 text-sm font-semibold text-white shadow-sm hover:bg-[var(--color-primary-hover)]"
            >
              <Download className="size-4" aria-hidden="true" />
              Xuất ngân hàng
            </button>
          </div>
        </div>
      </header>

      <AssessmentError error={tests.error} retry={() => void tests.refetch()} />
      <AssessmentError error={questionError} retry={() => void Promise.all(questionQueries.filter(item => item.isError).map(item => item.refetch()))} />
      {notice && <p role="status" className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">{notice}</p>}

      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-12">
        <aside className="flex flex-col gap-4 xl:col-span-3">
          <div className="rounded-xl bg-[var(--color-surface-card)] p-3 shadow-[var(--shadow-card)]">
            <p className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Bộ sưu tập hệ thống</p>
            {collections.map((item) => {
              const Icon = item.icon;
              const activeCollection = collection === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => { setCollection(item.id); setPage(0); }}
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
            <Link to="/recruiter/jobs" className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-[var(--color-surface-container)] px-3 py-2 text-sm font-semibold text-[var(--color-primary)] hover:bg-[var(--color-surface-container-high)]">
              Quản lý vị trí tuyển dụng
            </Link>
          </div>
          <div className="rounded-xl bg-gradient-to-br from-[var(--color-surface-card)] to-[var(--color-surface-container-low)] p-4 shadow-[var(--shadow-card)]">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold">Độ phủ ngân hàng đề</h2>
              <Sparkles className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
            </div>
            <p className="mt-2 text-xs leading-5 text-[var(--color-on-surface-variant)]">
              {coverage}% câu hỏi nằm trên đề đã xuất bản và có thể giao cho ứng viên.
            </p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--color-surface-container-high)]">
              <div className="h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${coverage}%` }} />
            </div>
            <p className="mt-2 flex justify-between text-[11px] text-[var(--color-on-surface-variant)]">
              <span>Sẵn sàng</span>
              <span className="font-semibold text-[var(--color-primary)]">{readyCount} / {rows.length}</span>
            </p>
          </div>
        </aside>

        <div className="flex flex-col gap-3 xl:col-span-9">
          <div className="flex flex-col gap-3 rounded-xl bg-[var(--color-surface-card)] p-4 shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-2 rounded-lg bg-[var(--color-surface-container-low)] px-3.5 py-2.5 focus-within:bg-[var(--color-surface-card)] focus-within:ring-2 focus-within:ring-[var(--color-primary)]">
              <Search className="size-5 text-[var(--color-on-surface-variant)]" aria-hidden="true" />
              <input
                value={query}
                onChange={(event) => { setQuery(event.target.value); setPage(0); }}
                className="w-full bg-transparent text-sm outline-none placeholder:text-[var(--color-outline)]"
                placeholder="Tra cứu câu hỏi theo mã, từ khóa, đề hoặc vị trí..."
                aria-label="Tìm câu hỏi"
              />
              {query && (
                <button type="button" aria-label="Xóa nội dung tìm kiếm" onClick={() => setQuery("")} className="text-[var(--color-on-surface-variant)]">
                  <X className="size-4" />
                </button>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
              <label className="flex min-w-0 items-center gap-2 rounded-lg bg-[var(--color-surface-container)] px-3 py-1.5 text-xs">
                <span className="shrink-0 text-[var(--color-on-surface-variant)]">Kỹ năng</span>
                <select aria-label="Lọc kỹ năng" value={skill} onChange={(event) => { setSkill(event.target.value); setPage(0); }} className="min-w-0 flex-1 bg-transparent font-semibold text-[var(--color-primary)] outline-none">
                  <option value="">Tất cả</option>
                  {skillOptions.map((item) => <option key={item} value={item}>{item}</option>)}
                </select>
              </label>
              <div className="flex items-center rounded-lg bg-[var(--color-surface-container)] px-3 py-1.5 text-xs">
                Loại câu: <strong className="ml-1 font-normal text-[var(--color-on-surface-variant)]">Trắc nghiệm</strong>
              </div>
              <label className="flex min-w-0 items-center gap-2 rounded-lg bg-[var(--color-surface-container)] px-3 py-1.5 text-xs">
                <span className="shrink-0 text-[var(--color-on-surface-variant)]">Độ khó</span>
                <select aria-label="Lọc độ khó" value={difficulty} onChange={(event) => { setDifficulty(event.target.value as Difficulty | ""); setPage(0); }} className="min-w-0 flex-1 bg-transparent font-semibold outline-none">
                  <option value="">Tất cả</option>
                  <option>Cơ bản</option>
                  <option>Vận dụng</option>
                  <option>Nâng cao</option>
                </select>
              </label>
              <label className="flex min-w-0 items-center gap-2 rounded-lg bg-[var(--color-surface-container)] px-3 py-1.5 text-xs">
                <span className="shrink-0 text-[var(--color-on-surface-variant)]">Trạng thái</span>
                <select aria-label="Lọc trạng thái" value={status} onChange={(event) => { setStatus(event.target.value as TestStatus | ""); setPage(0); }} className="min-w-0 flex-1 bg-transparent font-semibold text-emerald-700 outline-none">
                  <option value="">Tất cả</option>
                  <option value="PUBLISHED">Sẵn sàng</option>
                  <option value="DRAFT">Chờ duyệt</option>
                  <option value="ARCHIVED">Đã lưu trữ</option>
                </select>
              </label>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-[var(--color-on-surface-variant)]">Bộ lọc đang bật:</span>
                {chips.length === 0 && <span className="text-[var(--color-on-surface-variant)]">Không có</span>}
                {chips.map((chip) => (
                  <button key={chip.id} type="button" onClick={() => clearChip(chip.id)} className="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-container)] px-2.5 py-1 font-medium">
                    {chip.label}
                    <X className="size-3.5" aria-hidden="true" />
                  </button>
                ))}
                {chips.length > 0 && (
                  <button type="button" onClick={clearFilters} className="font-semibold text-[var(--color-primary)] hover:underline">Xóa tất cả bộ lọc</button>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex rounded-lg bg-[var(--color-surface-container)] p-0.5">
                  <button type="button" aria-label="Dạng bảng" aria-pressed={view === "table"} onClick={() => setView("table")} className={cn("rounded-md p-1.5", view === "table" ? "bg-[var(--color-surface-card)] text-[var(--color-primary)] shadow-sm" : "text-[var(--color-on-surface-variant)]")}>
                    <Table2 className="size-4" />
                  </button>
                  <button type="button" aria-label="Dạng thẻ" aria-pressed={view === "cards"} onClick={() => setView("cards")} className={cn("rounded-md p-1.5", view === "cards" ? "bg-[var(--color-surface-card)] text-[var(--color-primary)] shadow-sm" : "text-[var(--color-on-surface-variant)]")}>
                    <Grid3x3 className="size-4" />
                  </button>
                </div>
                <label className="flex items-center gap-1 text-xs text-[var(--color-on-surface-variant)]">
                  Sắp xếp:
                  <select value={sort} onChange={(event) => setSort(event.target.value as typeof sort)} className="bg-transparent font-medium text-[var(--color-on-surface)] outline-none">
                    <option value="latest">Mới cập nhật gần nhất</option>
                    <option value="points">Điểm cao nhất</option>
                    <option value="text">Nội dung A-Z</option>
                  </select>
                </label>
              </div>
            </div>
          </div>

          {selected.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[#213145] px-4 py-2.5 text-white shadow-lg">
              <div className="flex flex-wrap items-center gap-3 text-sm">
                <span className="grid size-6 place-items-center rounded-full bg-[var(--color-primary)] text-xs font-bold">{selected.length}</span>
                Đã chọn {selected.length} câu hỏi
                <button type="button" className="text-xs text-sky-200 hover:underline" onClick={() => setSelected(filtered.map((row) => row.key))}>
                  Chọn toàn bộ {filtered.length} câu
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
                <button type="button" onClick={() => setNotice("Lưu trữ từng câu chưa có API riêng. Mở đề ở trạng thái nháp để sửa hoặc xóa câu hỏi.")} className="inline-flex items-center gap-1.5 rounded-lg bg-rose-400/20 px-3 py-1.5 text-xs font-medium text-rose-100 hover:bg-rose-400/30">
                  <Archive className="size-3.5" /> Lưu trữ
                </button>
              </div>
            </div>
          )}

          <div className="overflow-hidden rounded-xl bg-[var(--color-surface-card)] shadow-[var(--shadow-card)]">
            <div className="flex flex-wrap items-center justify-between gap-2 bg-[var(--color-surface-container-low)] px-4 py-2.5 text-xs text-[var(--color-on-surface-variant)]">
              <p>
                Hiển thị <span className="font-semibold text-[var(--color-on-surface)]">{filtered.length === 0 ? 0 : safePage * pageSize + 1} - {Math.min(filtered.length, safePage * pageSize + pageRows.length)}</span> trên <span className="font-semibold text-[var(--color-on-surface)]">{filtered.length}</span> câu hỏi
              </p>
              {(tests.isPending || loadingQuestions) && <span role="status">Đang tải câu hỏi…</span>}
            </div>

            {tests.isSuccess && !loadingQuestions && filtered.length === 0 && (
              <div className="flex flex-col items-start gap-2 p-8">
                <FolderOpen className="size-8 text-[var(--color-primary)]" aria-hidden="true" />
                <p className="font-semibold">Không có câu hỏi phù hợp</p>
                <p className="text-sm text-[var(--color-on-surface-variant)]">Đổi bộ lọc hoặc tạo câu hỏi trong một bài đánh giá.</p>
                <Link to={basePath} className="text-sm font-semibold text-[var(--color-primary)] hover:underline">Về danh sách bài đánh giá</Link>
              </div>
            )}

            {view === "table" && pageRows.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] border-collapse text-left text-sm">
                  <thead>
                    <tr className="bg-[var(--color-surface-container-high)]/40 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">
                      <th className="w-10 px-4 py-3">
                        <input type="checkbox" checked={allPageSelected} aria-label="Chọn các câu trên trang" onChange={() => setSelected((current) => allPageSelected ? current.filter((key) => !pageKeys.includes(key)) : [...new Set([...current, ...pageKeys])])} className="size-4 accent-[var(--color-primary)]" />
                      </th>
                      <th className="px-2 py-3">Mã & trạng thái</th>
                      <th className="min-w-72 px-4 py-3">Nội dung câu hỏi</th>
                      <th className="px-4 py-3">Kỹ năng</th>
                      <th className="px-4 py-3">Phân loại</th>
                      <th className="px-4 py-3">Mục đích</th>
                      <th className="px-4 py-3">Nơi dùng</th>
                      <th className="px-4 py-3 text-right">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--color-surface-container)]">
                    {pageRows.map((row) => {
                      const meta = statusMeta(row.testStatus);
                      const inspected = activeKey === row.key;
                      return (
                        <tr key={row.key} onClick={() => openRow(row.key)} className={cn("cursor-pointer", inspected ? "bg-[var(--color-primary-subtle)]" : "hover:bg-[var(--color-surface-container-low)]")}>
                          <td className="px-4 py-3.5" onClick={(event) => event.stopPropagation()}>
                            <input type="checkbox" checked={selected.includes(row.key)} aria-label={`Chọn ${row.code}`} onChange={() => toggleOne(row.key)} className="size-4 accent-[var(--color-primary)]" />
                          </td>
                          <td className="px-2 py-3.5">
                            <p className="font-mono text-xs font-bold text-[var(--color-primary)]">{row.code}</p>
                            <span className={cn("mt-1 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold", meta.chip)}>
                              <span className={cn("size-1.5 rounded-full", meta.dot)} />
                              {meta.label}
                            </span>
                          </td>
                          <td className="px-4 py-3.5">
                            <p className="line-clamp-2 font-semibold">{row.question.questionText}</p>
                            <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">
                              {row.question.options.length} phương án · {row.question.points} điểm
                            </p>
                          </td>
                          <td className="px-4 py-3.5">
                            <div className="flex flex-wrap gap-1">
                              {(row.skills.length ? row.skills : ["MCQ"]).slice(0, 3).map((item) => (
                                <span key={item} className="rounded bg-[var(--color-surface-container)] px-2 py-0.5 text-[11px] font-medium text-[var(--color-on-surface-variant)]">{item}</span>
                              ))}
                            </div>
                          </td>
                          <td className="px-4 py-3.5">
                            <p className="font-medium">Trắc nghiệm đơn</p>
                            <span className={cn("mt-1 inline-flex rounded px-2 py-0.5 text-[11px] font-medium", difficultyClass(row.difficulty))}>{row.difficulty}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[11px] font-semibold text-blue-700">
                              <ClipboardList className="size-3.5" /> Assessment
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-xs text-[var(--color-on-surface-variant)]">
                            <p className="font-medium text-[var(--color-on-surface)]">{row.testTitle}</p>
                            <p>{row.jobTitle}</p>
                          </td>
                          <td className="px-4 py-3.5 text-right" onClick={(event) => event.stopPropagation()}>
                            <div className="relative flex justify-end gap-1 text-[var(--color-on-surface-variant)]">
                              <Link to={`${basePath}/${row.testId}`} aria-label="Chỉnh sửa câu hỏi" className="rounded p-1 hover:bg-[var(--color-surface-container)] hover:text-[var(--color-primary)]">
                                <Pencil className="size-4" />
                              </Link>
                              <button type="button" aria-label="Tùy chọn khác" onClick={() => setMenuKey(menuKey === row.key ? null : row.key)} className="rounded p-1 hover:bg-[var(--color-surface-container)]">
                                <MoreVertical className="size-4" />
                              </button>
                              {menuKey === row.key && (
                                <div className="absolute right-0 top-8 z-10 w-40 rounded-lg bg-[var(--color-surface-card)] p-1 text-left text-xs shadow-lg ring-1 ring-[var(--color-border-default)]">
                                  <button type="button" className="flex w-full items-center gap-2 rounded px-2 py-1.5 hover:bg-[var(--color-surface-container-low)]" onClick={() => { void navigator.clipboard.writeText(row.question.questionText); setMenuKey(null); }}>
                                    <Copy className="size-3.5" /> Sao chép nội dung
                                  </button>
                                  <button type="button" className="flex w-full items-center gap-2 rounded px-2 py-1.5 hover:bg-[var(--color-surface-container-low)]" onClick={() => { toggleFavorite(row.key); setMenuKey(null); }}>
                                    <Star className="size-3.5" /> {favorites.has(row.key) ? "Bỏ yêu thích" : "Yêu thích"}
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

            {view === "cards" && pageRows.length > 0 && (
              <div className="grid gap-3 p-4 md:grid-cols-2">
                {pageRows.map((row) => {
                  const meta = statusMeta(row.testStatus);
                  return (
                    <button key={row.key} type="button" onClick={() => openRow(row.key)} className="rounded-xl bg-[var(--color-surface-container-low)] p-4 text-left hover:bg-[var(--color-primary-subtle)]">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-xs font-bold text-[var(--color-primary)]">{row.code}</span>
                        <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-semibold", meta.chip)}>{meta.label}</span>
                      </div>
                      <p className="mt-2 line-clamp-3 text-sm font-semibold">{row.question.questionText}</p>
                      <p className="mt-2 text-xs text-[var(--color-on-surface-variant)]">{row.testTitle} · {row.question.points} điểm</p>
                    </button>
                  );
                })}
              </div>
            )}

            <div className="flex flex-col items-center justify-between gap-3 bg-[var(--color-surface-container-low)] px-4 py-3 text-sm text-[var(--color-on-surface-variant)] sm:flex-row">
              <label className="flex items-center gap-2">
                Hiển thị
                <select value={pageSize} onChange={(event) => { setPageSize(Number(event.target.value)); setPage(0); }} className="rounded bg-[var(--color-surface-card)] px-2 py-1 font-semibold text-[var(--color-on-surface)] outline-none">
                  <option value={10}>10 hàng / trang</option>
                  <option value={25}>25 hàng / trang</option>
                  <option value={50}>50 hàng / trang</option>
                </select>
                trên {filtered.length} kết quả
              </label>
              <div className="flex items-center gap-1">
                <button type="button" aria-label="Trang trước" disabled={safePage === 0} onClick={() => setPage(safePage - 1)} className="rounded bg-[var(--color-surface-card)] p-1.5 disabled:opacity-40">
                  <ChevronLeft className="size-4" />
                </button>
                {Array.from({ length: pageCount }, (_, index) => index).slice(0, 5).map((index) => (
                  <button key={index} type="button" onClick={() => setPage(index)} className={cn("size-8 rounded font-semibold", index === safePage ? "bg-[var(--color-primary)] text-white" : "bg-[var(--color-surface-card)]")}>
                    {index + 1}
                  </button>
                ))}
                <button type="button" aria-label="Trang tiếp" disabled={safePage >= pageCount - 1} onClick={() => setPage(safePage + 1)} className="rounded bg-[var(--color-surface-card)] p-1.5 disabled:opacity-40">
                  <ChevronRight className="size-4" />
                </button>
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
                  <Link to={`${basePath}/${active.testId}`} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-[var(--color-primary)] hover:underline">
                    <InfinityIcon className="size-4" /> Mở đề
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
                <Link to={`${basePath}/${active.testId}`} className="rounded-lg bg-[var(--color-surface-card)] px-3 py-2.5 text-center text-sm font-semibold shadow-sm">
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
    </section>
  );
}
