import { useMemo, useState } from "react";
import { Archive, ArrowRight, BriefcaseBusiness, CheckCircle2, FilterX, LayoutGrid, List, MoreHorizontal, Search, SlidersHorizontal, Sparkles, UserRoundCheck, Users, Video, X, type LucideIcon } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { cn } from "@/lib/utils";

type ViewMode = "detail" | "compact";
type StageId = "applied" | "screening" | "shortlisted" | "testing" | "interviewing" | "accepted" | "hired";
type Candidate = { id: number; name: string; role: string; score: number; stage: StageId; meta: string; note: string; action: string };
type Stage = { id: StageId; label: string; count: number; color: string; icon: LucideIcon };

const stages: Stage[] = [
  { id: "applied", label: "Đã ứng tuyển", count: 22, color: "bg-slate-400", icon: Users },
  { id: "screening", label: "Sàng lọc", count: 18, color: "bg-blue-600", icon: Sparkles },
  { id: "shortlisted", label: "Danh sách chọn", count: 14, color: "bg-cyan-600", icon: UserRoundCheck },
  { id: "testing", label: "Bài đánh giá", count: 12, color: "bg-amber-600", icon: SlidersHorizontal },
  { id: "interviewing", label: "Phỏng vấn", count: 8, color: "bg-indigo-600", icon: Video },
  { id: "accepted", label: "Đã nhận offer", count: 3, color: "bg-sky-300", icon: CheckCircle2 },
  { id: "hired", label: "Đã tuyển", count: 2, color: "bg-brand-primary", icon: BriefcaseBusiness },
];

const candidates: Candidate[] = [
  { id: 1, name: "Nguyễn Minh Anh", role: "Backend Developer · 4 năm", score: 91, stage: "applied", meta: "Ứng tuyển 2 giờ trước", note: "Java, Spring Boot, Kafka", action: "Xem hồ sơ" },
  { id: 2, name: "Trần Quốc Bảo", role: "Java Engineer · Fintech", score: 86, stage: "applied", meta: "Nguồn: LinkedIn", note: "Thiếu thông tin mức lương", action: "Xem hồ sơ" },
  { id: 3, name: "Lê Thanh Hà", role: "Software Engineer · 5 năm", score: 89, stage: "screening", meta: "AI đang phân tích", note: "8/10 kỹ năng phù hợp", action: "Xem kết quả AI" },
  { id: 4, name: "Phạm Gia Huy", role: "Backend Engineer · 3 năm", score: 77, stage: "screening", meta: "Cần recruiter xác minh", note: "Kinh nghiệm cloud chưa rõ", action: "Kiểm tra bằng chứng" },
  { id: 5, name: "Đỗ Khánh Linh", role: "Senior Java Developer", score: 94, stage: "shortlisted", meta: "Top 5% ứng viên", note: "Đề xuất chuyển technical test", action: "Chuyển vòng" },
  { id: 6, name: "Vũ Hoàng Long", role: "Platform Engineer", score: 88, stage: "shortlisted", meta: "Đã được duyệt", note: "Có kinh nghiệm hệ thống lớn", action: "Chuyển vòng" },
  { id: 7, name: "Bùi Ngọc Mai", role: "Java Core Engineer", score: 85, stage: "testing", meta: "Hạn nộp: hôm nay 18:00", note: "Coding 72/100 · MCQ 18/20", action: "Xem bài làm" },
  { id: 8, name: "Đặng Đức Nam", role: "Backend Developer", score: 79, stage: "testing", meta: "Đang làm bài", note: "Còn 42 phút", action: "Theo dõi bài thi" },
  { id: 9, name: "Nguyễn Thu Trang", role: "Tech Lead · OneMount", score: 84, stage: "interviewing", meta: "Hôm nay · 14:00", note: "Vòng 2 · Technical", action: "Vào phòng" },
  { id: 10, name: "Trần Tuấn Kiệt", role: "Java Core Engineer", score: 81, stage: "interviewing", meta: "Ngày mai · 10:30", note: "Cultural fit", action: "Xem bộ câu hỏi" },
  { id: 11, name: "Đặng Hữu Phúc", role: "Staff Java Backend", score: 92, stage: "accepted", meta: "Offer 3.200 USD net", note: "Đã ký và gửi lại", action: "Đánh dấu đã tuyển" },
  { id: 12, name: "Nguyễn Minh Trí", role: "Staff Java Backend", score: 96, stage: "hired", meta: "Bắt đầu: 02/10/2026", note: "Đã gửi onboarding", action: "Xem onboarding" },
  { id: 13, name: "Vũ Mỹ Duyên", role: "Mid Java Backend", score: 90, stage: "hired", meta: "Bắt đầu: 12/10/2026", note: "Sẵn sàng ngày đầu", action: "Xem onboarding" },
  ...(["applied", "screening", "shortlisted", "testing"] as const).flatMap((stage, stageIndex) =>
    [
      ["Đinh Tuấn Anh", "Java Developer · 3 năm", 82],
      ["Phan Ngọc Bích", "Backend Engineer · E-commerce", 88],
      ["Lương Quốc Cường", "Spring Boot Developer · 4 năm", 76],
      ["Tạ Minh Đức", "Software Engineer · Fintech", 91],
      ["Đỗ Thu Hương", "Java Engineer · 5 năm", 85],
      ["Ngô Hoàng Khang", "Platform Developer · Cloud", 79],
      ["Bùi Hải Yến", "Backend Developer · Banking", 87],
    ].map(([name, role, score], candidateIndex) => ({
      id: 100 + stageIndex * 10 + candidateIndex,
      name: name as string,
      role: role as string,
      score: score as number,
      stage,
      meta: stage === "applied" ? "Ứng tuyển trong hôm nay" : stage === "screening" ? "Đang chờ xác minh hồ sơ" : stage === "shortlisted" ? "Được đề xuất vào vòng tiếp theo" : "Đang thực hiện bài đánh giá",
      note: "Java · Spring Boot · Microservices",
      action: stage === "testing" ? "Xem bài đánh giá" : "Xem hồ sơ",
    })),
  ),
  ...[
    ["Nguyễn Hải Nam", "Senior Backend Engineer", 89],
    ["Trịnh Lan Phương", "Java Technical Lead", 93],
    ["Hà Anh Quân", "Backend Developer · 5 năm", 84],
    ["Võ Thanh Tâm", "Software Engineer · Banking", 81],
    ["Mai Đức Thịnh", "Java Platform Engineer", 86],
  ].map(([name, role, score], index) => ({
    id: 200 + index,
    name: name as string,
    role: role as string,
    score: score as number,
    stage: "interviewing" as const,
    meta: `Lịch phỏng vấn · ${9 + index}:30`,
    note: "Vòng Technical · Phỏng vấn trực tuyến",
    action: "Xem lịch phỏng vấn",
  })),
];

const archived = [
  ["Hoàng Nam", "Điểm technical thấp", "Coding 41/100 · concurrency chưa đạt"],
  ["Lê Thành Đạt", "Ứng viên rút hồ sơ", "Đã nhận offer khác tại Singapore"],
  ["Phan Bảo Châu", "Không phù hợp thời gian", "Không thể đáp ứng lịch onboard"],
];

const initials = (name: string) => name.split(" ").slice(-2).map((part) => part[0]).join("");

function CandidateCard({ candidate, compact }: { candidate: Candidate; compact: boolean }) {
  return <article className="group rounded-xl border border-[var(--color-border-default)] bg-white p-3 shadow-sm transition-[border-color,box-shadow,transform] duration-200 motion-reduce:transition-none hover:-translate-y-0.5 hover:border-brand-primary/45 hover:shadow-md motion-reduce:hover:transform-none">
    <div className="flex items-start gap-2.5"><span className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--color-primary-soft)] text-[11px] font-bold text-brand-primary">{initials(candidate.name)}</span><div className="min-w-0 flex-1"><h3 className="truncate text-sm font-semibold">{candidate.name}</h3><p className="mt-0.5 truncate text-[11px] text-[var(--color-on-surface-variant)]">{candidate.role}</p></div><span className="shrink-0 rounded-full bg-[var(--color-primary-soft)] px-2 py-1 text-[10px] font-bold text-brand-primary">{candidate.score}%</span></div>
    {!compact && <div className="mt-3 space-y-2"><div className="rounded-lg bg-[var(--color-surface-alt)] p-2 text-[11px]"><p className="font-semibold">{candidate.meta}</p><p className="mt-0.5 text-[var(--color-on-surface-variant)]">{candidate.note}</p></div><button type="button" className="inline-flex min-h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-[var(--color-border-default)] text-[11px] font-semibold text-brand-primary hover:bg-[var(--color-primary-subtle)]">{candidate.action}<ArrowRight className="size-3" aria-hidden="true" /></button></div>}
  </article>;
}

export function PipelinePage() {
  const { id } = useParams<{ id: string }>();
  const [view, setView] = useState<ViewMode>("detail");
  const [query, setQuery] = useState("");
  const [minimumScore, setMinimumScore] = useState(60);
  const [stageFilter, setStageFilter] = useState<"all" | StageId>("all");
  const [archiveOpen, setArchiveOpen] = useState(false);
  const filtered = useMemo(() => candidates.filter((candidate) => candidate.score >= minimumScore && (stageFilter === "all" || candidate.stage === stageFilter) && (!query.trim() || `${candidate.name} ${candidate.role}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()))), [minimumScore, query, stageFilter]);

  return <section className="grid items-start gap-4 text-[var(--color-on-surface)] xl:h-full xl:min-h-0 xl:grid-cols-[260px_minmax(0,1fr)] xl:overflow-hidden">
    <aside className="-ml-4 w-[calc(100%+1rem)] overflow-hidden rounded-r-2xl border border-l-0 border-[var(--color-border-default)] bg-white shadow-sm sm:-ml-6 sm:w-[calc(100%+1.5rem)] xl:fixed xl:bottom-0 xl:left-0 xl:top-[7.5rem] xl:z-30 xl:grid xl:h-auto xl:w-[300px] xl:ml-0 xl:grid-rows-[auto_minmax(0,1fr)_auto] xl:rounded-r-none" aria-label="Tìm kiếm và bộ lọc pipeline">
      <div className="border-b border-[var(--color-border-default)] bg-[var(--color-surface-alt)]/65 p-4">
        <div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--color-primary-soft)] text-brand-primary"><SlidersHorizontal className="size-4" aria-hidden="true" /></span><div><h2 className="text-sm font-semibold">Tìm kiếm và bộ lọc</h2><p className="mt-1 text-[11px] leading-4 text-[var(--color-on-surface-variant)]">Áp dụng trên toàn bộ pipeline.</p></div></div>
        <div className="mt-3 flex items-center rounded-xl border border-[var(--color-border-default)] bg-white p-1" role="toolbar" aria-label="Điều khiển hiển thị pipeline">
          <button type="button" onClick={() => setView("detail")} aria-pressed={view === "detail"} className={cn("inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30", view === "detail" ? "bg-[var(--color-primary-soft)] text-brand-primary" : "text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-alt)] hover:text-brand-primary")}><LayoutGrid className="size-3.5" aria-hidden="true" />Chi tiết</button>
          <button type="button" onClick={() => setView("compact")} aria-pressed={view === "compact"} className={cn("inline-flex min-h-9 flex-1 items-center justify-center gap-1.5 rounded-lg px-2 text-[11px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30", view === "compact" ? "bg-[var(--color-primary-soft)] text-brand-primary" : "text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-alt)] hover:text-brand-primary")}><List className="size-3.5" aria-hidden="true" />Thu gọn</button>
          <Link to={`/recruiter/jobs/${id}/applicants`} aria-label="Mở danh sách ứng viên" title="Ứng viên" className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-primary text-white transition-colors hover:bg-brand-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"><Users className="size-3.5" aria-hidden="true" /></Link>
        </div>
      </div>
      <div className="flex min-h-0 flex-col gap-5 p-4">
        <label className="block"><span className="mb-1.5 block text-xs font-semibold">Tìm ứng viên</span><span className="relative block"><Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-outline)]" aria-hidden="true" /><input value={query} onChange={(event) => setQuery(event.target.value)} className="min-h-10 w-full rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-alt)] pl-9 pr-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15" placeholder="Tên, chức danh..." /></span></label>
        <label className="block"><span className="mb-1.5 block text-xs font-semibold">Giai đoạn</span><select value={stageFilter} onChange={(event) => setStageFilter(event.target.value as "all" | StageId)} className="min-h-10 w-full rounded-lg border border-[var(--color-border-default)] bg-white px-3 text-sm outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15"><option value="all">Tất cả giai đoạn</option>{stages.map((stage) => <option key={stage.id} value={stage.id}>{stage.label}</option>)}</select></label>
        <label className="block"><span className="flex items-center justify-between text-xs font-semibold"><span>Điểm AI tối thiểu</span><strong className="rounded-md bg-[var(--color-primary-soft)] px-2 py-1 text-brand-primary">{minimumScore}+</strong></span><input className="mt-3 w-full accent-[var(--color-primary)]" type="range" min="0" max="100" value={minimumScore} onChange={(event) => setMinimumScore(Number(event.target.value))} /><span className="mt-1 flex justify-between text-[10px] text-[var(--color-outline)]"><span>0</span><span>50</span><span>100</span></span></label>
        <div className="mt-auto rounded-xl border border-brand-primary/15 bg-[var(--color-primary-subtle)] p-3"><div className="flex items-end justify-between gap-3"><div><p className="text-[11px] font-medium text-[var(--color-on-surface-variant)]">Kết quả phù hợp</p><p className="mt-1 text-2xl font-semibold text-brand-primary">{filtered.length}</p></div><Users className="mb-1 size-5 text-brand-primary/65" aria-hidden="true" /></div></div>
        <button type="button" onClick={() => { setQuery(""); setMinimumScore(60); setStageFilter("all"); }} className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg border border-[var(--color-border-default)] text-xs font-semibold text-[var(--color-on-surface-variant)] transition-colors hover:border-brand-primary/35 hover:bg-[var(--color-primary-subtle)] hover:text-brand-primary"><FilterX className="size-4" aria-hidden="true" />Xóa toàn bộ bộ lọc</button>
      </div>
      <div className="border-t border-[var(--color-border-default)] p-3"><button type="button" onClick={() => setArchiveOpen(true)} className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-red-50 px-3 text-xs font-semibold text-red-700 transition-colors hover:bg-red-100"><Archive className="size-4" aria-hidden="true" />Lưu trữ / Đã loại <span className="rounded-full bg-white px-1.5 py-0.5 text-[10px]">15</span></button></div>
    </aside>

    <div className="min-w-0 py-4 sm:py-6 xl:col-start-2 xl:h-full xl:min-h-0">
    <div className="-mr-4 overflow-x-auto overflow-y-hidden overscroll-contain sm:-mr-6 lg:-mr-10 xl:h-full [scrollbar-color:var(--color-outline-variant)_transparent] [scrollbar-width:thin]"><div className="flex h-[calc(100dvh-9rem)] min-h-[480px] min-w-max items-stretch gap-3 pb-3 xl:h-full xl:min-h-0">{stages.map((stage) => { const StageIcon = stage.icon; const rows = filtered.filter((candidate) => candidate.stage === stage.id); return <section key={stage.id} className={cn("flex h-full w-[276px] flex-col overflow-hidden rounded-xl border border-[var(--color-border-default)] p-2.5 last:rounded-r-none", stage.id === "hired" ? "bg-[var(--color-primary-soft)]/55" : "bg-[var(--color-surface-container-low)]/75")}><header className="mb-2 flex shrink-0 items-center gap-2 px-1 py-1"><span className={cn("grid size-7 place-items-center rounded-lg text-white", stage.color)}><StageIcon className="size-3.5" /></span><h2 className="flex-1 text-sm font-semibold">{stage.label}</h2><span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold">{rows.length}/{stage.count}</span><button type="button" className="grid size-7 place-items-center rounded-md text-[var(--color-outline)] hover:bg-white" aria-label={`Tùy chọn ${stage.label}`}><MoreHorizontal className="size-4" /></button></header><div className="min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pr-1 [scrollbar-color:var(--color-outline-variant)_transparent] [scrollbar-width:thin]">{rows.map((candidate) => <CandidateCard key={candidate.id} candidate={candidate} compact={view === "compact"} />)}{rows.length === 0 && <div className="grid min-h-28 place-items-center rounded-xl border border-dashed border-[var(--color-outline-variant)] bg-white/55 px-4 text-center text-[11px] text-[var(--color-on-surface-variant)]">Không có ứng viên phù hợp</div>}</div></section>; })}</div></div>
    </div>

    {archiveOpen && <div className="fixed inset-0 z-50 bg-slate-950/25 backdrop-blur-[2px]" onMouseDown={() => setArchiveOpen(false)}><aside role="dialog" aria-modal="true" aria-labelledby="archive-title" className="absolute inset-y-0 right-0 flex w-[min(390px,100vw)] flex-col bg-white p-5 shadow-2xl" onMouseDown={(event) => event.stopPropagation()}><header className="flex items-start justify-between gap-3 border-b border-[var(--color-border-default)] pb-4"><div><div className="flex items-center gap-2"><Archive className="size-5 text-red-600" /><h2 id="archive-title" className="font-semibold">Đã loại và lưu trữ</h2></div><p className="mt-1 text-xs leading-5 text-[var(--color-on-surface-variant)]">Ứng viên không phù hợp hoặc chủ động rút hồ sơ.</p></div><button type="button" onClick={() => setArchiveOpen(false)} className="grid size-9 place-items-center rounded-lg hover:bg-[var(--color-surface-alt)]" aria-label="Đóng"><X className="size-4" /></button></header><div className="mt-4 space-y-3 overflow-y-auto">{archived.map(([name, reason, detail]) => <article key={name} className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-alt)] p-3"><div className="flex items-start justify-between gap-2"><h3 className="text-sm font-semibold">{name}</h3><span className="rounded-full bg-red-100 px-2 py-1 text-[10px] font-semibold text-red-700">{reason}</span></div><p className="mt-2 text-xs text-[var(--color-on-surface-variant)]">{detail}</p><button type="button" className="mt-2 text-xs font-semibold text-brand-primary hover:underline">Khôi phục vào pipeline</button></article>)}</div></aside></div>}
  </section>;
}
