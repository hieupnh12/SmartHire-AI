import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  BookOpen,
  Check,
  Gauge,
  Headset,
  PlayCircle,
  RefreshCw,
  Scale,
  Terminal,
  Timer,
} from "lucide-react";
import { Button } from "@/components/ux/Button";
import { assessmentMuted as muted } from "@/components/ux/assessmentUi";
import type { UserProfile } from "@/features/tenant/auth/types";
import {
  PREP_DIAGNOSTICS,
  PREP_HONOR_ITEMS,
  PREP_MECHANICS,
  PREP_ROOM_META,
  PREP_SAMPLE_QUESTION,
  PREP_STEPS,
} from "../constants/prepRoomContent";

type Props = {
  user: UserProfile;
  companyName: string;
  durationMinutes: number;
  candidateCode: string;
  backTo: string;
  starting: boolean;
  onStart: () => void;
};

export function AssessmentPrepRoomView({
  user,
  companyName,
  durationMinutes,
  candidateCode,
  backTo,
  starting,
  onStart,
}: Props) {
  const [scanning, setScanning] = useState(false);
  const [sampleAnswer, setSampleAnswer] = useState(PREP_SAMPLE_QUESTION.correctId);
  const [agreements, setAgreements] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(PREP_HONOR_ITEMS.map((item) => [item.id, true])),
  );

  const allAgreed = useMemo(
    () => PREP_HONOR_ITEMS.every((item) => agreements[item.id]),
    [agreements],
  );

  const handleRecheck = () => {
    if (scanning) return;
    setScanning(true);
    window.setTimeout(() => setScanning(false), 900);
  };

  const durationLabel = `${String(durationMinutes).padStart(2, "0")}:00`;

  return (
    <div className="flex w-full flex-col">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[var(--color-surface-container-low)] px-5 py-4">
        <div className="flex items-center gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary-container)] text-[var(--color-on-primary,#fff)] shadow-sm">
            <Terminal className="size-5" aria-hidden="true" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm font-semibold text-[var(--color-on-surface)]">{PREP_ROOM_META.portalTitle}</span>
              <span className="size-1.5 rounded-full bg-[var(--color-outline-variant)]" />
              <span className={`text-xs ${muted}`}>{PREP_ROOM_META.roomCode}</span>
            </div>
            <p className={`text-xs ${muted}`}>{PREP_ROOM_META.portalSubtitle}</p>
          </div>
        </div>
        <div className="inline-flex items-center gap-3 rounded-full bg-[var(--color-surface-card)] px-3 py-1.5 shadow-sm">
          <span className="relative flex size-2.5">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-[var(--color-primary)] opacity-75" />
            <span className="relative inline-flex size-2.5 rounded-full bg-[var(--color-primary)]" />
          </span>
          <span className="text-xs text-[var(--color-on-surface)]">
            {PREP_ROOM_META.shieldLabel}:{" "}
            <span className="font-semibold text-[var(--color-primary)]">Sẵn sàng giám sát</span>
          </span>
        </div>
      </div>

      <div className="mt-6 rounded-xl bg-[var(--color-surface-card)] p-5 shadow-sm">
        <div className="relative grid grid-cols-1 gap-4 md:grid-cols-3">
          {PREP_STEPS.map((step) => {
            const active = step.state === "active";
            const done = step.state === "done";
            return (
              <div
                key={step.step}
                className={`flex items-center gap-4 p-2 ${active ? "rounded-lg bg-[var(--color-surface-container-low)]" : ""} ${step.state === "upcoming" ? "opacity-60" : ""}`}
              >
                <div
                  className={`flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold shadow-sm ${
                    done
                      ? "bg-emerald-600 text-white"
                      : active
                        ? "bg-[var(--color-primary-container)] text-[var(--color-on-primary,#fff)]"
                        : "bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)]"
                  }`}
                >
                  {done ? <Check className="size-5" aria-hidden="true" /> : step.step}
                </div>
                <div className="min-w-0">
                  <span
                    className={`text-[11px] font-semibold uppercase tracking-wider ${
                      done ? "text-emerald-700" : active ? "text-[var(--color-primary)]" : muted
                    }`}
                  >
                    {step.badge}
                  </span>
                  <h4 className={`truncate text-sm font-semibold ${active ? "text-[var(--color-primary)]" : "text-[var(--color-on-surface)]"}`}>
                    {step.title}
                  </h4>
                  <p className={`truncate text-xs ${active ? "text-[var(--color-on-surface)]" : muted}`}>{step.hint}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="flex flex-col gap-6 lg:col-span-7">
          <div className="rounded-2xl bg-[var(--color-surface-card)] p-6 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4">
              <div className="flex items-center gap-3">
                <Gauge className="size-7 text-[var(--color-primary)]" aria-hidden="true" />
                <div>
                  <h2 className="text-xl font-semibold text-[var(--color-on-surface)]">Kiểm tra điều kiện môi trường thi</h2>
                  <p className={`text-xs ${muted}`}>Tất cả thông số kỹ thuật được SmartHire quét thời gian thực</p>
                </div>
              </div>
              <button
                type="button"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--color-surface-container-low)] px-3 py-1.5 text-xs font-medium text-[var(--color-primary)] transition-colors hover:bg-[var(--color-surface-container)] disabled:opacity-60"
                onClick={handleRecheck}
                disabled={scanning}
              >
                <RefreshCw className={`size-4 ${scanning ? "animate-spin" : ""}`} aria-hidden="true" />
                <span>Quét lại</span>
              </button>
            </div>

            <div className="space-y-3.5 pt-2">
              {PREP_DIAGNOSTICS.map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[var(--color-surface-container-low)] p-4 transition-all hover:shadow-sm"
                  >
                    <div className="flex min-w-0 items-start gap-3.5">
                      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg bg-[var(--color-surface-card)] text-[var(--color-primary)] shadow-sm">
                        <Icon className="size-5" aria-hidden="true" />
                      </div>
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-[var(--color-on-surface)]">{item.title}</h4>
                        <p className={`text-xs ${muted}`}>{item.detail}</p>
                      </div>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-emerald-800">
                      <span className="size-2 rounded-full bg-emerald-500" />
                      <span className="text-[11px] font-semibold">{item.statusLabel}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl bg-[var(--color-surface-card)] p-6 shadow-sm">
            <div className="flex items-center gap-3 pb-4">
              <BookOpen className="size-7 text-[var(--color-primary)]" aria-hidden="true" />
              <div>
                <h3 className="text-xl font-semibold text-[var(--color-on-surface)]">Hướng dẫn làm bài & Thao tác trong phòng thi</h3>
                <p className={`text-xs ${muted}`}>Làm quen với các công cụ tương tác trên màn hình thi chính thức</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4 pt-2 md:grid-cols-3">
              {PREP_MECHANICS.map((card) => {
                const Icon = card.icon;
                return (
                  <div key={card.title} className="flex flex-col justify-between gap-3 rounded-xl bg-[var(--color-surface-container-low)] p-4">
                    <div className="flex size-8 items-center justify-center rounded-lg bg-[var(--color-primary-container)] text-[var(--color-on-primary,#fff)]">
                      <Icon className="size-[18px]" aria-hidden="true" />
                    </div>
                    <div>
                      <h5 className="text-sm font-semibold text-[var(--color-on-surface)]">{card.title}</h5>
                      <p className={`mt-1 text-xs ${muted}`}>{card.body}</p>
                    </div>
                    <span className="text-[11px] font-semibold text-[var(--color-primary)]">{card.hint}</span>
                  </div>
                );
              })}
            </div>

            <div className="mt-6 rounded-xl bg-[var(--color-surface-container-low)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-[var(--color-primary-container)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-on-primary,#fff)]">
                    Ví dụ minh họa
                  </span>
                  <span className={`text-xs ${muted}`}>Thao tác chọn & hiển thị trạng thái</span>
                </div>
                <span className={`text-xs ${muted}`}>Không tính điểm</span>
              </div>
              <p className="text-sm font-semibold text-[var(--color-on-surface)]">{PREP_SAMPLE_QUESTION.prompt}</p>
              <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {PREP_SAMPLE_QUESTION.options.map((option) => {
                  const selected = sampleAnswer === option.id;
                  return (
                    <label
                      key={option.id}
                      className={`flex cursor-pointer items-center rounded-lg p-3 transition-all ${
                        selected
                          ? "bg-[var(--color-surface-card)] ring-1 ring-[var(--color-primary)]"
                          : "bg-[var(--color-surface-card)] hover:bg-[var(--color-surface-container)]"
                      }`}
                    >
                      <input
                        className="size-4 accent-[var(--color-primary)]"
                        type="radio"
                        name="sample_answer"
                        checked={selected}
                        onChange={() => setSampleAnswer(option.id)}
                      />
                      <span className={`ml-3 text-sm ${selected ? "font-semibold text-[var(--color-primary)]" : "text-[var(--color-on-surface)]"}`}>
                        {option.label}. {option.text}
                        {selected ? " (Đang chọn)" : ""}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-6 lg:col-span-5">
          <div className="rounded-2xl bg-[var(--color-surface-card)] p-6 shadow-sm">
            <div className="flex items-center gap-4 pb-4">
              <div className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--color-primary-fixed,#d8e2ff)] shadow-sm">
                {user.avatarUrl ? (
                  <img className="size-full object-cover" src={user.avatarUrl} alt="" />
                ) : (
                  <span className="text-lg font-semibold text-[var(--color-primary)]">
                    {user.fullName.trim().charAt(0).toLocaleUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-primary)]">Ứng viên đã định danh</span>
                <h3 className="text-xl font-semibold text-[var(--color-on-surface)]">{user.fullName}</h3>
                <p className={`font-mono text-xs ${muted}`}>
                  Mã dự thi: {candidateCode} • ID: {PREP_ROOM_META.candidateExamId}
                </p>
              </div>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-3 rounded-xl bg-[var(--color-surface-container-low)] p-4">
              <div>
                <span className={`text-[11px] ${muted}`}>Bài kiểm tra</span>
                <p className="text-sm font-semibold text-[var(--color-on-surface)]">{PREP_ROOM_META.examTitleShort}</p>
              </div>
              <div>
                <span className={`text-[11px] ${muted}`}>Thời lượng tối đa</span>
                <p className="flex items-center gap-1 text-sm font-semibold text-[var(--color-primary)]">
                  <Timer className="size-[18px]" aria-hidden="true" />
                  <span>{durationLabel} phút</span>
                </p>
              </div>
              <div className="pt-2">
                <span className={`text-[11px] ${muted}`}>Quy mô đề thi</span>
                <p className="text-sm font-semibold text-[var(--color-on-surface)]">{PREP_ROOM_META.questionCountLabel}</p>
              </div>
              <div className="pt-2">
                <span className={`text-[11px] ${muted}`}>Hình thức tính điểm</span>
                <p className="text-sm font-semibold text-[var(--color-on-surface)]">{PREP_ROOM_META.passingLabel}</p>
              </div>
            </div>

            <div className={`mt-4 flex flex-wrap items-center justify-between gap-2 px-1 text-xs ${muted}`}>
              <span>
                Ngôn ngữ đề thi: <strong className="text-[var(--color-on-surface)]">{PREP_ROOM_META.languageLabel}</strong>
              </span>
              <span>
                Số lần làm bài: <strong className="text-[var(--color-on-surface)]">{PREP_ROOM_META.attemptLabel}</strong>
              </span>
            </div>
          </div>

          <div className="rounded-2xl bg-[var(--color-surface-card)] p-6 shadow-sm">
            <div className="flex items-center gap-2.5 pb-4">
              <Scale className="size-6 text-[var(--color-primary)]" aria-hidden="true" />
              <h3 className="text-sm font-semibold text-[var(--color-on-surface)]">Cam kết trung thực & Quy chế phòng thi</h3>
            </div>
            <p className={`pb-4 text-xs ${muted}`}>
              Vui lòng đọc kỹ và xác nhận cả 3 điều khoản bảo mật bên dưới để kích hoạt nút bắt đầu:
            </p>

            <div className="space-y-3.5">
              {PREP_HONOR_ITEMS.map((item) => (
                <label
                  key={item.id}
                  className="flex cursor-pointer items-start gap-3 rounded-xl bg-[var(--color-surface-container-low)] p-3 transition-colors hover:bg-[var(--color-surface-container)]"
                >
                  <input
                    className="mt-1 size-4 cursor-pointer accent-[var(--color-primary)]"
                    type="checkbox"
                    checked={!!agreements[item.id]}
                    onChange={(event) =>
                      setAgreements((prev) => ({ ...prev, [item.id]: event.target.checked }))
                    }
                  />
                  <span className="text-xs leading-snug text-[var(--color-on-surface)]">
                    {item.before}
                    <strong className="font-semibold">{item.strong}</strong>
                    {item.after}
                  </span>
                </label>
              ))}
            </div>

            <div className="mt-5 flex items-start gap-3 rounded-xl bg-amber-50 p-4">
              <AlertTriangle className="mt-0.5 size-[22px] shrink-0 text-amber-600" aria-hidden="true" />
              <div className="min-w-0">
                <h5 className="text-sm font-semibold text-amber-900">Lưu ý trước khi bấm bắt đầu</h5>
                <p className="mt-0.5 text-xs text-amber-800">
                  Khi bấm <strong>&quot;Bắt đầu làm bài ngay&quot;</strong>, đồng hồ đếm ngược {durationMinutes} phút sẽ kích hoạt ngay lập tức và không thể tạm dừng. Hãy chắc chắn bạn đang ở không gian yên tĩnh và không bị gián đoạn.
                </p>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              <Button
                className="h-14 w-full text-base shadow-md active:scale-[0.99]"
                disabled={!allAgreed || starting}
                onClick={onStart}
              >
                {starting ? (
                  <>
                    <RefreshCw className="size-6 animate-spin" aria-hidden="true" />
                    <span>Đang khởi tạo phòng thi toàn màn hình...</span>
                  </>
                ) : (
                  <>
                    <PlayCircle className="size-6" aria-hidden="true" />
                    <span>Bắt đầu làm bài ngay ({durationLabel})</span>
                  </>
                )}
              </Button>
              <Link
                to={backTo}
                className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--color-surface-container-low)] text-sm font-medium text-[var(--color-on-surface-variant)] transition-colors hover:bg-[var(--color-surface-container)] hover:text-[var(--color-on-surface)]"
              >
                <ArrowLeft className="size-[18px]" aria-hidden="true" />
                <span>Quay lại thông tin bài thi</span>
              </Link>
            </div>

            <div className={`mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-outline-variant)]/40 pt-4 text-xs ${muted}`}>
              <span className="inline-flex items-center gap-1.5">
                <Headset className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
                Gặp sự cố kỹ thuật?
              </span>
              <a className="font-medium text-[var(--color-primary)] hover:underline" href={`tel:${PREP_ROOM_META.supportHotline.replace(/-/g, "")}`}>
                Hỗ trợ khẩn cấp: {PREP_ROOM_META.supportHotline}
              </a>
            </div>
            <p className={`mt-2 text-center text-[11px] ${muted}`}>Kỳ thi do {companyName} tổ chức qua SmartHire-AI</p>
          </div>
        </div>
      </div>
    </div>
  );
}
