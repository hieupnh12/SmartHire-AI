import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Brain,
  Check,
  CheckCircle2,
  Cloud,
  HelpCircle,
  Hourglass,
  Lightbulb,
  RotateCcw,
  Star,
  User,
} from "lucide-react";
import { Button } from "@/components/ux/Button";
import { assessmentMuted as muted } from "@/components/ux/assessmentUi";
import {
  MOCK_EXAM_META,
  formatExamClock,
  type MockExamQuestion,
} from "../constants/mockExam";

type Props = {
  questions: MockExamQuestion[];
  index: number;
  answers: Record<number, string | null>;
  bookmarked: Set<number>;
  remainingSeconds: number;
  lastSavedLabel: string;
  candidateName: string;
  candidateCode: string;
  onSelect: (questionId: number, optionId: string) => void;
  onClear: (questionId: number) => void;
  onToggleBookmark: (questionId: number) => void;
  onGo: (index: number) => void;
  onSubmitClick: () => void;
};

export function AssessmentExamRoomView({
  questions,
  index,
  answers,
  bookmarked,
  remainingSeconds,
  lastSavedLabel,
  candidateName,
  candidateCode,
  onSelect,
  onClear,
  onToggleBookmark,
  onGo,
  onSubmitClick,
}: Props) {
  const question = questions[index];
  const answeredCount = questions.filter((q) => answers[q.id] != null).length;
  const flaggedCount = questions.filter((q) => bookmarked.has(q.id)).length;
  const unansweredCount = questions.length - answeredCount;
  const pct = Math.round((answeredCount / questions.length) * 100);
  const selected = question ? answers[question.id] : null;
  const isBookmarked = question ? bookmarked.has(question.id) : false;
  const lowTime = remainingSeconds < 60;

  if (!question) return null;

  return (
    <div className="flex w-full flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[var(--color-surface-card)] px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-[var(--color-primary)] text-[var(--color-on-primary,#fff)] shadow-sm">
            <Brain className="size-5" aria-hidden="true" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold tracking-tight text-[var(--color-on-surface)]">SmartHire-AI</span>
            <span className={`text-[11px] font-semibold uppercase tracking-wider ${muted}`}>Candidate Examination</span>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="hidden items-center gap-2 rounded-full bg-[var(--color-surface-container-low)] px-3 py-1.5 md:flex">
            <span className="size-2 animate-pulse rounded-full bg-[var(--color-primary)]" />
            <span className={`text-xs font-medium ${muted}`}>Bài thi chuyên môn</span>
            <span className="font-mono text-xs text-[var(--color-outline-variant)]">•</span>
            <span className="text-xs font-semibold text-[var(--color-primary)]">Đang diễn ra</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg bg-[var(--color-surface-container)] px-3 py-1.5">
            <Hourglass className={`size-[18px] ${lowTime ? "text-[#ba1a1a]" : "text-[var(--color-primary)]"}`} aria-hidden="true" />
            <span className={`font-mono text-sm font-semibold tracking-wide ${lowTime ? "text-[#ba1a1a]" : "text-[var(--color-on-surface)]"}`}>
              {formatExamClock(remainingSeconds)}
            </span>
            <span className={`text-[11px] ${muted}`}>còn lại</span>
          </div>
          <div className="hidden text-right lg:block">
            <div className="text-sm font-semibold leading-tight text-[var(--color-on-surface)]">Ứng viên: {candidateName}</div>
            <div className={`font-mono text-xs ${muted}`}>MS: {candidateCode}</div>
          </div>
          <div className="flex size-8 items-center justify-center rounded-full bg-[var(--color-primary)] text-[var(--color-on-primary,#fff)] shadow-sm">
            <User className="size-[18px]" aria-hidden="true" />
          </div>
          <Button onClick={onSubmitClick}>
            <CheckCircle2 className="size-[18px]" aria-hidden="true" />
            Nộp bài
          </Button>
        </div>
      </div>

      <section className="rounded-xl bg-[var(--color-surface-card)] px-4 py-3 shadow-sm">
        <div className="flex flex-col items-center justify-between gap-3 md:flex-row">
          <div className="flex w-full flex-wrap items-center gap-3 md:w-auto">
            <div className="flex items-center gap-2 rounded-lg bg-[var(--color-surface-container)] px-3 py-1.5 shadow-sm">
              <Hourglass className={`size-[22px] animate-pulse ${lowTime ? "text-[#ba1a1a]" : "text-[var(--color-primary)]"}`} aria-hidden="true" />
              <div className="flex flex-col">
                <span className={`text-[11px] leading-none ${muted}`}>Thời gian còn lại</span>
                <span
                  className={`text-xl font-bold leading-none tracking-tight ${lowTime ? "text-[#ba1a1a]" : "text-[var(--color-primary)]"}`}
                  role="timer"
                  aria-label="Thời gian làm bài còn lại"
                >
                  {formatExamClock(remainingSeconds)}
                </span>
              </div>
            </div>
            <div className="hidden h-6 w-px bg-[var(--color-surface-container-high)] sm:block" />
            <div className={`inline-flex items-center gap-2 rounded-full bg-[var(--color-surface-container-low)] px-3 py-1 text-[11px] ${muted}`}>
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--color-primary)] opacity-75" />
                <span className="relative inline-flex size-2.5 rounded-full bg-[var(--color-primary)]" />
              </span>
              <span>
                Kết nối: <strong className="font-semibold text-[var(--color-on-surface)]">Ổn định</strong> (Ping {MOCK_EXAM_META.pingMs}ms)
              </span>
            </div>
            <div className={`inline-flex items-center gap-1.5 text-[11px] ${muted}`}>
              <Cloud className="size-[18px] text-[var(--color-primary)]" aria-hidden="true" />
              <span className="hidden sm:inline">
                Đã lưu tự động lúc <span className="font-mono font-medium text-[var(--color-on-surface)]">{lastSavedLabel}</span>
              </span>
              <span className="rounded bg-[var(--color-surface-container)] px-1.5 py-0.5 text-[10px] font-semibold uppercase text-[var(--color-on-surface-variant)]">
                Chống mất dữ liệu
              </span>
            </div>
          </div>
          <div className="flex w-full items-center justify-between gap-3 md:w-auto md:justify-end">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary-fixed,#d8e2ff)] px-3 py-1.5 text-xs font-semibold text-[var(--color-on-primary-fixed,#00174b)]">
              <CheckCircle2 className="size-4" aria-hidden="true" />
              Đã trả lời: {answeredCount}/{questions.length} câu ({pct}%)
            </div>
            <Button onClick={onSubmitClick}>
              <CheckCircle2 className="size-[18px]" aria-hidden="true" />
              Nộp bài thi
            </Button>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="flex min-w-0 flex-col gap-5 lg:col-span-8">
          <article className="flex flex-col gap-5 rounded-xl bg-[var(--color-surface-card)] p-6 shadow-md md:p-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-[var(--color-primary)] px-3 py-1 text-sm font-bold text-[var(--color-on-primary,#fff)] shadow-sm">
                  Câu {index + 1} / {questions.length}
                </span>
                <span className={`rounded-md bg-[var(--color-surface-container)] px-2 py-1 text-[11px] font-medium ${muted}`}>
                  Trắc nghiệm 1 đáp án
                </span>
                <span className="rounded-md bg-[var(--color-surface-container)] px-2 py-1 text-[11px] font-semibold text-[var(--color-primary)]">
                  Thang điểm: {question.points} điểm
                </span>
                <span className="rounded-md bg-[var(--color-surface-container-high)] px-2 py-1 text-[11px] text-[var(--color-on-surface)]">
                  Chủ đề: {question.topic}
                </span>
              </div>
              <button
                type="button"
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold shadow-sm transition-colors ${
                  isBookmarked
                    ? "bg-[var(--color-secondary-container,#dae2fd)] text-[var(--color-on-secondary-fixed,#131b2e)]"
                    : "bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)]"
                }`}
                onClick={() => onToggleBookmark(question.id)}
              >
                <Star className={`size-[18px] ${isBookmarked ? "fill-[var(--color-primary)] text-[var(--color-primary)]" : ""}`} aria-hidden="true" />
                <span>{isBookmarked ? "Đang đánh dấu xem lại" : "Đánh dấu câu này để xem lại"}</span>
              </button>
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-xl font-semibold leading-snug tracking-tight text-[var(--color-on-surface)]">{renderStem(question.stem)}</p>
              {question.hint && <p className={`text-sm ${muted}`}>{question.hint}</p>}
            </div>

            <div className="mt-1 flex flex-col gap-3" role="radiogroup" aria-label="Danh sách phương án trả lời">
              {question.options.map((option) => {
                const active = selected === option.id;
                return (
                  <label
                    key={option.id}
                    className={`group relative flex cursor-pointer items-start gap-4 rounded-xl p-5 shadow-sm transition-all ${
                      active
                        ? "bg-[var(--color-surface-container-low)] hover:bg-[var(--color-surface-container)]"
                        : "bg-[var(--color-surface-card)] hover:bg-[var(--color-surface-container-low)] ring-1 ring-[var(--color-outline-variant)]/30"
                    }`}
                  >
                    <input
                      className="sr-only"
                      type="radio"
                      name={`question-${question.id}`}
                      checked={active}
                      onChange={() => onSelect(question.id, option.id)}
                    />
                    <div
                      className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full shadow-sm ${
                        active
                          ? "bg-[var(--color-primary)] text-[var(--color-on-primary,#fff)]"
                          : "bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)] group-hover:bg-[var(--color-primary-fixed,#d8e2ff)]"
                      }`}
                    >
                      {active ? <Check className="size-4" aria-hidden="true" /> : <span className="text-[11px] font-bold">{option.label}</span>}
                    </div>
                    <div className="flex min-w-0 flex-col gap-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-sm font-bold ${active ? "text-[var(--color-primary)]" : "text-[var(--color-on-surface)]"}`}>
                          {option.label}.
                        </span>
                        <span
                          className={`text-[11px] font-semibold uppercase tracking-wide ${
                            active ? "text-[var(--color-primary)]" : muted
                          }`}
                        >
                          {option.subtitle}
                        </span>
                      </div>
                      <p className={`text-base leading-relaxed ${active ? "font-medium text-[var(--color-on-surface)]" : "text-[var(--color-on-surface)]"}`}>
                        {option.body}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
              <Button variant="secondary" disabled={index === 0} onClick={() => onGo(index - 1)}>
                <ArrowLeft className="size-[18px]" aria-hidden="true" />
                Câu trước {index > 0 ? `(Câu ${index})` : ""}
              </Button>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="ghost" disabled={selected == null} onClick={() => onClear(question.id)}>
                  <RotateCcw className="size-[18px]" aria-hidden="true" />
                  Xóa lựa chọn
                </Button>
                <Button disabled={index >= questions.length - 1} onClick={() => onGo(index + 1)}>
                  Câu tiếp theo {index < questions.length - 1 ? `(Câu ${index + 2})` : ""}
                  <ArrowRight className="size-[18px]" aria-hidden="true" />
                </Button>
              </div>
            </div>
          </article>

          <div className="flex items-start gap-4 rounded-xl bg-[var(--color-surface-card)] p-5 shadow-sm">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-primary-fixed,#d8e2ff)] text-[var(--color-on-primary-fixed,#00174b)]">
              <Lightbulb className="size-[22px]" aria-hidden="true" />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[var(--color-on-surface)]">Mẹo làm bài chuyên môn</h4>
              <p className={`text-sm ${muted}`}>
                Lựa chọn của bạn sẽ được lưu tức thì lên hệ thống đám mây. Bạn có thể thay đổi đáp án hoặc quay lại bất kỳ lúc nào trước khi bấm{" "}
                <strong>Nộp bài</strong>. Nếu gặp vấn đề kết nối, hệ thống sẽ lưu offline trên trình duyệt và tự động đồng bộ khi khôi phục mạng.
              </p>
            </div>
          </div>

          {question.code && (
            <div className="flex flex-col gap-2 rounded-xl bg-[var(--color-inverse-surface,#213145)] p-5 text-[var(--color-inverse-on-surface,#eaf1ff)] shadow-md">
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-xs font-semibold text-[var(--color-tertiary-fixed,#c9e6ff)]">
                  Minh họa mã nguồn (Code Context Reference)
                </span>
                <span className={`font-mono text-[11px] text-[var(--color-outline-variant)]`}>{question.language ?? "Java"}</span>
              </div>
              <pre className="overflow-x-auto rounded-lg bg-white/5 p-4 font-mono text-[13px] leading-relaxed text-[var(--color-inverse-on-surface,#eaf1ff)]/90">
                <code>{question.code}</code>
              </pre>
            </div>
          )}
        </div>

        <aside className="flex flex-col gap-5 lg:sticky lg:top-4 lg:col-span-4">
          <div className="flex flex-col gap-4 rounded-xl bg-[var(--color-surface-card)] p-5 shadow-md">
            <div className="flex items-center justify-between gap-2">
              <div>
                <span className={`text-[11px] uppercase tracking-wider ${muted}`}>Thông tin bài thi</span>
                <h3 className="text-sm font-bold text-[var(--color-on-surface)]">{MOCK_EXAM_META.title}</h3>
              </div>
              <span className="rounded bg-[var(--color-surface-container)] px-1.5 py-0.5 font-mono text-[11px] font-semibold text-[var(--color-primary)]">
                {MOCK_EXAM_META.code}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-[var(--color-surface-container-low)] p-3 text-xs">
              <div>
                <span className={`block ${muted}`}>Ứng viên:</span>
                <strong className="text-[var(--color-on-surface)]">{candidateName}</strong>
              </div>
              <div>
                <span className={`block ${muted}`}>Mã ứng viên:</span>
                <span className="font-mono font-semibold text-[var(--color-on-surface)]">{candidateCode}</span>
              </div>
              <div>
                <span className={`block ${muted}`}>Thời lượng:</span>
                <span className="font-semibold text-[var(--color-on-surface)]">
                  {MOCK_EXAM_META.durationMinutes} phút ({questions.length} câu)
                </span>
              </div>
              <div>
                <span className={`block ${muted}`}>Thang điểm:</span>
                <span className="font-semibold text-[var(--color-on-surface)]">{MOCK_EXAM_META.totalPoints} điểm</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-5 rounded-xl bg-[var(--color-surface-card)] p-5 shadow-md">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-[var(--color-on-surface)]">Tiến độ bài thi</span>
                <span className="font-mono font-bold text-[var(--color-primary)]">
                  {answeredCount}/{questions.length} câu ({pct}%)
                </span>
              </div>
              <div className="h-2.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-container)]">
                <div className="h-full rounded-full bg-[var(--color-primary)] transition-all duration-500" style={{ width: `${pct}%` }} />
              </div>
            </div>

            <div className={`grid grid-cols-2 gap-2 rounded-lg bg-[var(--color-surface-container-low)] p-2 text-[11px] ${muted}`}>
              <div className="flex items-center gap-2">
                <span className="size-3.5 shrink-0 rounded bg-[var(--color-primary)]" />
                Đã trả lời ({answeredCount})
              </div>
              <div className="flex items-center gap-2">
                <span className="flex size-3.5 shrink-0 items-center justify-center rounded bg-[var(--color-secondary-container,#dae2fd)] text-[10px] font-bold text-[var(--color-primary)]">
                  ★
                </span>
                Đánh dấu ({flaggedCount})
              </div>
              <div className="flex items-center gap-2">
                <span className="size-3.5 shrink-0 rounded bg-[var(--color-surface-container)]" />
                Chưa trả lời ({unansweredCount})
              </div>
              <div className="flex items-center gap-2">
                <span className="flex size-3.5 shrink-0 items-center justify-center rounded bg-[var(--color-surface-card)] text-[10px] font-bold text-[var(--color-primary)] ring-2 ring-[var(--color-primary)]">
                  •
                </span>
                Đang xem (Câu {index + 1})
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className={`text-[11px] font-semibold uppercase tracking-wider ${muted}`}>Ma trận câu hỏi</span>
              <nav aria-label="Danh sách câu hỏi" className="grid grid-cols-5 gap-2">
                {questions.map((q, i) => {
                  const answered = answers[q.id] != null;
                  const flagged = bookmarked.has(q.id);
                  const current = i === index;
                  let className =
                    "relative flex h-10 items-center justify-center rounded-lg font-mono text-sm font-bold transition-opacity";
                  if (current) {
                    className +=
                      " bg-[var(--color-primary-fixed,#d8e2ff)] text-[var(--color-on-primary-fixed,#00174b)] shadow-md";
                  } else if (flagged) {
                    className +=
                      " bg-[var(--color-secondary-container,#dae2fd)] text-[var(--color-on-secondary-fixed,#131b2e)] shadow-sm hover:opacity-90";
                  } else if (answered) {
                    className += " bg-[var(--color-primary)] text-[var(--color-on-primary,#fff)] shadow-sm hover:opacity-90";
                  } else {
                    className +=
                      " bg-[var(--color-surface-container)] font-semibold text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-high)]";
                  }
                  return (
                    <button
                      key={q.id}
                      type="button"
                      className={className}
                      aria-current={current ? "step" : undefined}
                      title={`Câu ${q.id}${current ? ": Đang làm" : answered ? ": Đã trả lời" : ": Chưa trả lời"}${flagged ? " • Đánh dấu" : ""}`}
                      onClick={() => onGo(i)}
                    >
                      {q.id}
                      {flagged && <span className="absolute right-1 top-1 text-[10px] leading-none text-[var(--color-primary)]">★</span>}
                    </button>
                  );
                })}
              </nav>
            </div>

            <div className="flex flex-col gap-1.5 pt-1">
              <button
                type="button"
                className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-lg bg-[var(--color-surface-container-low)] text-xs font-semibold text-[var(--color-on-surface)] transition-colors hover:bg-[var(--color-surface-container)]"
              >
                <AlertTriangle className="size-[18px] text-[var(--color-primary)]" aria-hidden="true" />
                Báo sự cố kỹ thuật bài thi
              </button>
              <button
                type="button"
                className={`inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-lg text-xs transition-colors hover:text-[var(--color-on-surface)] ${muted}`}
              >
                <HelpCircle className="size-4" aria-hidden="true" />
                Quy chế & Hướng dẫn làm bài
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

function renderStem(stem: string) {
  const parts = stem.split(/\b(volatile)\b/g);
  if (parts.length === 1) return stem;
  return parts.map((part, i) =>
    part === "volatile" ? (
      <code key={i} className="rounded bg-[var(--color-surface-container)] px-2 py-0.5 font-mono text-sm font-bold text-[var(--color-primary)]">
        volatile
      </code>
    ) : (
      <span key={i}>{part}</span>
    ),
  );
}
