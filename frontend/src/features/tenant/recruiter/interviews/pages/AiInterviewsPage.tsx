import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Bot,
  CheckCircle2,
  Clock3,
  Eye,
  MessageSquareText,
  PlayCircle,
  Plus,
  Search,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { PrototypeBanner } from "@/components/ux/PrototypeBanner";
import { cn } from "@/lib/utils";

type SessionStatus = "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "NEEDS_REVIEW";

type AiSession = {
  id: string;
  candidate: string;
  job: string;
  status: SessionStatus;
  score: number | null;
  durationMin: number;
  questions: number;
  answered: number;
  scheduledAt: string;
  strengths: string[];
};

const sessions: AiSession[] = [
  {
    id: "AI-INT-1042",
    candidate: "Nguyễn Minh Anh",
    job: "Java Backend Developer",
    status: "COMPLETED",
    score: 86,
    durationMin: 28,
    questions: 8,
    answered: 8,
    scheduledAt: "2026-09-24T09:30:00+07:00",
    strengths: ["System design", "SQL", "Communication"],
  },
  {
    id: "AI-INT-1041",
    candidate: "Trần Hoàng Long",
    job: "Frontend React & TypeScript",
    status: "NEEDS_REVIEW",
    score: 74,
    durationMin: 32,
    questions: 7,
    answered: 7,
    scheduledAt: "2026-09-23T15:00:00+07:00",
    strengths: ["React hooks", "UI polish"],
  },
  {
    id: "AI-INT-1040",
    candidate: "Lê Thu Hà",
    job: "Data Engineer",
    status: "IN_PROGRESS",
    score: null,
    durationMin: 25,
    questions: 6,
    answered: 3,
    scheduledAt: "2026-09-24T20:15:00+07:00",
    strengths: [],
  },
  {
    id: "AI-INT-1039",
    candidate: "Phạm Quốc Bảo",
    job: "DevOps & Cloud Engineer",
    status: "SCHEDULED",
    score: null,
    durationMin: 30,
    questions: 8,
    answered: 0,
    scheduledAt: "2026-09-25T10:00:00+07:00",
    strengths: [],
  },
  {
    id: "AI-INT-1038",
    candidate: "Võ Gia Hân",
    job: "Product Manager",
    status: "COMPLETED",
    score: 91,
    durationMin: 26,
    questions: 6,
    answered: 6,
    scheduledAt: "2026-09-22T14:20:00+07:00",
    strengths: ["Prioritization", "Stakeholder clarity"],
  },
];

const statusLabel: Record<SessionStatus, string> = {
  SCHEDULED: "Đã lên lịch",
  IN_PROGRESS: "Đang diễn ra",
  COMPLETED: "Hoàn thành",
  NEEDS_REVIEW: "Cần xem xét",
};

function statusTone(status: SessionStatus) {
  if (status === "COMPLETED") return "bg-emerald-50 text-emerald-700";
  if (status === "NEEDS_REVIEW") return "bg-amber-50 text-amber-800";
  if (status === "IN_PROGRESS") return "bg-[var(--color-primary-soft)] text-[var(--color-primary-hover)]";
  return "bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)]";
}

function formatWhen(iso: string) {
  return new Date(iso).toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function initials(name: string) {
  return name
    .split(" ")
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

type Tab = "ALL" | SessionStatus;

/** Sample recruiter AI Interview workspace (AI ↔ candidate) — mock data, not wired to API yet. */
export function AiInterviewsPage() {
  const [tab, setTab] = useState<Tab>("ALL");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(sessions[0]?.id ?? "");

  const counts = useMemo(
    () => ({
      all: sessions.length,
      scheduled: sessions.filter((s) => s.status === "SCHEDULED").length,
      live: sessions.filter((s) => s.status === "IN_PROGRESS").length,
      review: sessions.filter((s) => s.status === "NEEDS_REVIEW").length,
      done: sessions.filter((s) => s.status === "COMPLETED").length,
    }),
    [],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return sessions.filter((session) => {
      if (tab !== "ALL" && session.status !== tab) return false;
      if (!q) return true;
      return (
        session.candidate.toLowerCase().includes(q) ||
        session.job.toLowerCase().includes(q) ||
        session.id.toLowerCase().includes(q)
      );
    });
  }, [tab, query]);

  const selected = sessions.find((s) => s.id === selectedId) ?? filtered[0] ?? null;
  const avgScore =
    sessions.filter((s) => s.score != null).reduce((sum, s) => sum + (s.score ?? 0), 0) /
    Math.max(1, sessions.filter((s) => s.score != null).length);

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "ALL", label: "Tất cả phiên", count: counts.all },
    { id: "IN_PROGRESS", label: "Đang diễn ra", count: counts.live },
    { id: "NEEDS_REVIEW", label: "Cần xem xét", count: counts.review },
    { id: "COMPLETED", label: "Hoàn thành", count: counts.done },
    { id: "SCHEDULED", label: "Đã lên lịch", count: counts.scheduled },
  ];

  return (
    <section className="flex flex-col gap-8 text-[var(--color-on-surface)]">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <nav className="flex flex-wrap items-center gap-1 text-xs text-[var(--color-on-surface-variant)]" aria-label="Breadcrumb">
            <span>Tuyển dụng</span>
            <span className="text-[var(--color-outline)]">/</span>
            <span className="font-semibold text-[var(--color-primary)]">AI Interview</span>
          </nav>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">Phỏng vấn AI đầu vào</h1>
            <span className="inline-flex items-center rounded-full border border-[var(--color-primary)] bg-[var(--color-primary-subtle)] px-3.5 py-1 text-sm font-semibold text-[var(--color-primary-hover)]">
              AI Interview
            </span>
          </div>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-on-surface-variant)]">
            Theo dõi phiên phỏng vấn AI: câu hỏi sinh theo job, ghi nhận câu trả lời, điểm NLP và báo cáo gợi ý cho recruiter.
          </p>
        </div>
        <button
          type="button"
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 self-start rounded-[var(--radius-md)] bg-[var(--color-primary)] px-4 text-sm font-semibold text-[var(--color-on-primary)] shadow-sm hover:bg-[var(--color-primary-hover)] md:self-auto"
        >
          <Plus className="size-4" aria-hidden="true" />
          Tạo phiên AI
        </button>
      </header>

      <PrototypeBanner note="giao diện mẫu · dữ liệu giả · chưa nối API scoring/STT" />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric
          label="Phiên hôm nay"
          value={String(counts.all)}
          hint="+2 so với hôm qua"
          icon={Users}
          tone="primary"
        />
        <Metric
          label="Đang diễn ra"
          value={String(counts.live)}
          hint="Realtime session"
          icon={PlayCircle}
          tone="live"
        />
        <Metric
          label="Cần xem xét"
          value={String(counts.review)}
          hint="Chờ recruiter duyệt"
          icon={MessageSquareText}
          tone="warning"
        />
        <Metric
          label="Điểm AI trung bình"
          value={avgScore.toFixed(0)}
          hint="Trên phiên đã chấm"
          icon={Sparkles}
          tone="success"
        />
      </div>

      <div className="flex flex-col items-start justify-between gap-4 rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-gradient-to-r from-[var(--color-surface-container-low)] via-[var(--color-surface-card)] to-[var(--color-surface-container-low)] p-5 shadow-[var(--shadow-card)] lg:flex-row lg:items-center">
        <div className="flex items-start gap-4">
          <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-[var(--color-primary)] text-[var(--color-on-primary)] shadow-sm">
            <Bot className="size-6" aria-hidden="true" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold">Luồng AI Interview chuẩn</h2>
              <span className="rounded-full bg-[var(--color-primary-soft)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-primary-hover)]">
                INT-01 → INT-04
              </span>
            </div>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-[var(--color-on-surface-variant)]">
              <strong className="text-[var(--color-on-surface)]">1. Gắn đơn & job</strong>
              {" → "}
              <strong className="text-[var(--color-on-surface)]">2. AI sinh câu hỏi</strong>
              {" → "}
              <strong className="text-[var(--color-on-surface)]">3. Ứng viên trả lời (text/voice)</strong>
              {" → "}
              <strong className="text-[var(--color-on-surface)]">4. NLP + scoring + báo cáo</strong>
            </p>
          </div>
        </div>
        <Link
          to="/recruiter/interviews"
          className="inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-card)] px-4 text-sm font-semibold text-[var(--color-on-surface)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
        >
          Interview người–người
        </Link>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.4fr)_minmax(18rem,0.85fr)]">
        <div className="flex flex-col gap-4">
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-4 shadow-[var(--shadow-card)]">
            <div className="flex flex-wrap items-center gap-1 rounded-xl bg-[var(--color-surface-container-low)]/80 p-1">
              {tabs.map((item) => {
                const active = tab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setTab(item.id)}
                    className={cn(
                      "inline-flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm transition-colors",
                      active
                        ? "bg-[var(--color-surface-card)] font-semibold text-[var(--color-primary)] shadow-sm"
                        : "text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)]",
                    )}
                  >
                    {item.label}
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                        active
                          ? "bg-[var(--color-primary-soft)] text-[var(--color-primary-hover)]"
                          : "bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)]",
                      )}
                    >
                      {item.count}
                    </span>
                  </button>
                );
              })}
            </div>
            <label className="relative mt-3 block">
              <span className="sr-only">Tìm phiên AI Interview</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-outline)]" aria-hidden="true" />
              <input
                className="h-10 w-full rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] pl-10 pr-3 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
                placeholder="Tìm theo ứng viên, vị trí, mã phiên…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </label>
          </div>

          <div className="overflow-hidden rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-[var(--color-surface-card)] shadow-[var(--shadow-card)]">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] border-collapse text-left text-sm">
                <thead>
                  <tr className="h-11 bg-[var(--color-surface-container-low)] text-[11px] font-semibold uppercase tracking-wider text-[var(--color-outline)]">
                    <th className="px-4 py-2">Ứng viên & mã phiên</th>
                    <th className="px-4 py-2">Vị trí</th>
                    <th className="px-4 py-2">Tiến độ</th>
                    <th className="px-4 py-2">Điểm AI</th>
                    <th className="px-4 py-2">Trạng thái</th>
                    <th className="px-4 py-2 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-surface-container-low)]">
                  {filtered.map((session) => {
                    const active = selected?.id === session.id;
                    return (
                      <tr
                        key={session.id}
                        className={cn(
                          "cursor-pointer transition-colors hover:bg-[var(--color-primary-subtle)]",
                          active && "bg-[var(--color-primary-subtle)]",
                        )}
                        onClick={() => setSelectedId(session.id)}
                      >
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-3">
                            <div className="grid size-9 place-items-center rounded-full bg-[var(--color-primary-soft)] text-xs font-bold text-[var(--color-primary-hover)]">
                              {initials(session.candidate)}
                            </div>
                            <div>
                              <p className="font-semibold">{session.candidate}</p>
                              <p className="font-mono text-[11px] text-[var(--color-outline)]">{session.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <span className="font-medium">{session.job}</span>
                          <p className="mt-0.5 text-[11px] text-[var(--color-outline)]">{formatWhen(session.scheduledAt)}</p>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5">
                          <span className="font-semibold">
                            {session.answered}/{session.questions}
                          </span>
                          <p className="text-[11px] text-[var(--color-outline)]">{session.durationMin} phút</p>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5">
                          {session.score == null ? (
                            <span className="text-[var(--color-outline)]">—</span>
                          ) : (
                            <span className="inline-flex items-center gap-1 font-bold text-[var(--color-primary)]">
                              <Sparkles className="size-3.5" aria-hidden="true" />
                              {session.score}
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5">
                          <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs font-semibold", statusTone(session.status))}>
                            {statusLabel[session.status]}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3.5 text-right">
                          <button
                            type="button"
                            className="inline-flex h-8 items-center gap-1 rounded-lg bg-[var(--color-primary-soft)] px-2.5 text-xs font-medium text-[var(--color-primary)] hover:bg-[var(--color-primary)]/20"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedId(session.id);
                            }}
                          >
                            <Eye className="size-3.5" aria-hidden="true" />
                            Xem
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-sm text-[var(--color-on-surface-variant)]">
                        Không có phiên phù hợp bộ lọc.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <aside className="flex flex-col gap-4">
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-5 shadow-[var(--shadow-card)]">
            {selected ? (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-outline)]">Chi tiết phiên</p>
                    <h2 className="mt-1 text-lg font-semibold">{selected.candidate}</h2>
                    <p className="text-sm text-[var(--color-on-surface-variant)]">{selected.job}</p>
                  </div>
                  <span className={cn("rounded-full px-2.5 py-1 text-xs font-semibold", statusTone(selected.status))}>
                    {statusLabel[selected.status]}
                  </span>
                </div>

                <dl className="mt-5 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl bg-[var(--color-surface-container-low)] p-3">
                    <dt className="text-[11px] text-[var(--color-outline)]">Mã phiên</dt>
                    <dd className="mt-1 font-mono font-semibold">{selected.id}</dd>
                  </div>
                  <div className="rounded-xl bg-[var(--color-surface-container-low)] p-3">
                    <dt className="text-[11px] text-[var(--color-outline)]">Thời lượng</dt>
                    <dd className="mt-1 flex items-center gap-1 font-semibold">
                      <Clock3 className="size-3.5 text-[var(--color-outline)]" aria-hidden="true" />
                      {selected.durationMin} phút
                    </dd>
                  </div>
                  <div className="rounded-xl bg-[var(--color-surface-container-low)] p-3">
                    <dt className="text-[11px] text-[var(--color-outline)]">Câu hỏi</dt>
                    <dd className="mt-1 font-semibold">
                      {selected.answered}/{selected.questions}
                    </dd>
                  </div>
                  <div className="rounded-xl bg-[var(--color-surface-container-low)] p-3">
                    <dt className="text-[11px] text-[var(--color-outline)]">Điểm AI</dt>
                    <dd className="mt-1 font-semibold text-[var(--color-primary)]">
                      {selected.score ?? "Chưa chấm"}
                    </dd>
                  </div>
                </dl>

                {selected.strengths.length > 0 && (
                  <div className="mt-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-outline)]">Điểm mạnh (AI)</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {selected.strengths.map((item) => (
                        <span
                          key={item}
                          className="rounded-full bg-[var(--color-primary-soft)] px-2.5 py-1 text-xs font-medium text-[var(--color-primary-hover)]"
                        >
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-5 space-y-2 rounded-xl border border-dashed border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)]/50 p-4 text-sm text-[var(--color-on-surface-variant)]">
                  <p className="flex items-center gap-2 font-semibold text-[var(--color-on-surface)]">
                    <TrendingUp className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
                    Gợi ý mẫu
                  </p>
                  <p>
                    {selected.status === "NEEDS_REVIEW"
                      ? "Điểm giao tiếp ổn nhưng cần xác minh kinh nghiệm cloud trên vòng người thật."
                      : selected.status === "COMPLETED"
                        ? "Ứng viên đạt ngưỡng kỹ thuật — có thể chuyển lịch phỏng vấn chính thức."
                        : "Phiên chưa có báo cáo đầy đủ. Dữ liệu STT/NLP sẽ hiện sau khi hoàn tất."}
                  </p>
                </div>

                <button
                  type="button"
                  className="mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-primary)] text-sm font-semibold text-[var(--color-on-primary)] hover:bg-[var(--color-primary-hover)]"
                >
                  <CheckCircle2 className="size-4" aria-hidden="true" />
                  Mở báo cáo chi tiết
                </button>
              </>
            ) : (
              <p className="text-sm text-[var(--color-on-surface-variant)]">Chọn một phiên để xem chi tiết.</p>
            )}
          </div>

          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-gradient-to-br from-[var(--color-surface-card)] to-[var(--color-surface-container-low)] p-5 shadow-[var(--shadow-card)]">
            <div className="flex items-center gap-2">
              <Sparkles className="size-5 text-[var(--color-primary)]" aria-hidden="true" />
              <h3 className="text-base font-semibold">Năng lực AI đang theo dõi</h3>
            </div>
            <ul className="mt-4 space-y-3 text-sm">
              {[
                ["Sinh câu hỏi theo JD", "Question Generation"],
                ["Speech-to-Text", "INT-02"],
                ["Phân tích NLP", "INT-03"],
                ["Chấm điểm tổng hợp", "INT-04"],
              ].map(([label, code]) => (
                <li key={code} className="flex items-center justify-between gap-2 rounded-lg bg-[var(--color-surface-card)] px-3 py-2">
                  <span className="font-medium">{label}</span>
                  <span className="text-[11px] font-semibold text-[var(--color-outline)]">{code}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </section>
  );
}

function Metric({
  label,
  value,
  hint,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  icon: typeof Users;
  tone: "primary" | "live" | "warning" | "success";
}) {
  const tones = {
    primary: "bg-[var(--color-primary-soft)] text-[var(--color-primary)]",
    live: "bg-[var(--color-primary-soft)] text-[var(--color-primary-hover)]",
    warning: "bg-amber-50 text-amber-700",
    success: "bg-emerald-50 text-emerald-700",
  }[tone];

  return (
    <div className="rounded-[var(--radius-lg)] border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-outline)]">{label}</p>
          <p className="mt-1 text-3xl font-semibold tracking-tight">{value}</p>
        </div>
        <div className={cn("grid size-11 place-items-center rounded-xl", tones)}>
          <Icon className="size-5" aria-hidden="true" />
        </div>
      </div>
      <p className="mt-3 text-xs text-[var(--color-on-surface-variant)]">{hint}</p>
    </div>
  );
}
