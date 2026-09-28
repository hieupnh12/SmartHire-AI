import { Link } from "react-router-dom";
import {
  AppWindow,
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  ExternalLink,
  Home,
  Hourglass,
  IdCard,
  Info,
  Monitor,
  Network,
  PlayCircle,
  Scale,
  Terminal,
  Timer,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import type { AvailableAssessment } from "@/api/types/assessment";
import type { ApplicationSummary } from "@/api/types/applicant";
import type { UserProfile } from "@/features/tenant/auth/types";
import { Button } from "@/components/ux/Button";
import { assessmentMuted as muted } from "@/components/ux/assessmentUi";
import { ASSESSMENT_GUIDELINES, ASSESSMENT_REGULATIONS } from "../constants/invitationContent";
import { maskPhone } from "../utils/formatCountdown";

const regulationIcons: Record<(typeof ASSESSMENT_REGULATIONS)[number]["icon"], LucideIcon> = {
  tab: AppWindow,
  terminal: Terminal,
  devices: Monitor,
};

type Props = {
  application: ApplicationSummary;
  test: AvailableAssessment;
  user: UserProfile | null;
  companyName: string;
  acceptRules: boolean;
  onAcceptRulesChange: (value: boolean) => void;
  starting: boolean;
  onStart: () => void;
  onSelectApplication?: (applicationId: number) => void;
  applications?: ApplicationSummary[];
};

export function AssessmentInvitationView({
  application,
  test,
  user,
  companyName,
  acceptRules,
  onAcceptRulesChange,
  starting,
  onStart,
  applications,
  onSelectApplication,
}: Props) {
  const testCode = `ASM-${test.id.toString().padStart(3, "0")}`;
  const candidateCode = `CAN-${String(user?.id ?? application.candidateId).padStart(4, "0")}`;
  const done =
    test.submissionStatus === "GRADED" ||
    test.submissionStatus === "EXPIRED" ||
    test.submissionStatus === "SUBMITTED";
  const inProgress = test.submissionStatus === "IN_PROGRESS";
  const ctaLabel = starting
    ? "Đang mở…"
    : done
      ? "Xem kết quả bài làm"
      : inProgress
        ? "Tiếp tục làm bài"
        : "Bắt đầu làm bài";

  return (
    <div className="relative w-full overflow-hidden">
      <div className="pointer-events-none absolute -left-20 -top-24 h-96 w-96 rounded-full bg-[var(--color-primary)]/5 blur-3xl" />
      <div className="pointer-events-none absolute -right-24 top-48 h-80 w-80 rounded-full bg-[var(--color-primary-soft)] blur-3xl" />

      <div className="relative flex flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <nav aria-label="Breadcrumb" className={`flex flex-wrap items-center gap-1 ${muted}`}>
            <Link className="inline-flex items-center gap-1 hover:text-[var(--color-primary)]" to="/candidate">
              <Home className="size-4" aria-hidden="true" />
              <span>Cổng thông tin Ứng viên</span>
            </Link>
            <ChevronRight className="size-3.5 text-[var(--color-outline-variant)]" aria-hidden="true" />
            <Link className="hover:text-[var(--color-primary)]" to="/candidate/assessments">
              Lời mời làm bài kiểm tra
            </Link>
            <ChevronRight className="size-3.5 text-[var(--color-outline-variant)]" aria-hidden="true" />
            <span className="max-w-xs truncate font-semibold text-[var(--color-on-surface)] md:max-w-none">{test.title}</span>
          </nav>
          <div className="inline-flex items-center gap-2 rounded-full bg-[var(--color-surface-container)] px-3 py-1 text-xs font-semibold text-[var(--color-on-surface)] shadow-sm">
            <span className="inline-block size-2 animate-pulse rounded-full bg-[var(--color-primary)]" />
            {done ? "Đã hoàn thành bài" : inProgress ? "Đang làm bài" : "Đang mở nhận bài"}
          </div>
        </div>

        {!!applications?.length && applications.length > 1 && onSelectApplication && (
          <label className="block max-w-lg space-y-1 text-sm">
            <span className={muted}>Đơn ứng tuyển</span>
            <select
              className="min-h-11 w-full rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-card)] px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]"
              value={application.id}
              disabled={starting}
              onChange={(event) => onSelectApplication(Number(event.target.value))}
            >
              {applications.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.jobTitle} · Đơn #{item.id}
                </option>
              ))}
            </select>
          </label>
        )}

        <div className="relative overflow-hidden rounded-2xl bg-[var(--color-surface-card)] p-6 shadow-sm md:p-8">
          <div className="pointer-events-none absolute bottom-0 right-0 top-0 w-1/3 bg-gradient-to-l from-[var(--color-primary)]/5 via-transparent to-transparent" />
          <div className="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
            <div className="flex items-start gap-4">
              <div className="flex size-14 shrink-0 items-center justify-center rounded-xl bg-[var(--color-primary-fixed,#d8e2ff)] text-[var(--color-primary)] shadow-sm">
                <Building2 className="size-8" aria-hidden="true" />
              </div>
              <div className="flex min-w-0 flex-col gap-0.5">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-semibold uppercase tracking-wider text-[var(--color-primary)]">Lời mời chính thức</span>
                  <span className="text-[var(--color-outline-variant)]">•</span>
                  <span className={`font-mono ${muted}`}>Đơn #{application.id}</span>
                </div>
                <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-on-surface)] md:text-[30px] md:leading-[38px]">
                  Lời mời tham gia Đánh giá năng lực chuyên môn
                </h1>
                <p className={`mt-1 ${muted}`}>
                  Được gửi từ <strong className="font-semibold text-[var(--color-on-surface)]">{companyName}</strong> dành riêng cho ứng viên{" "}
                  <span className="font-semibold text-[var(--color-primary)]">{user?.fullName ?? application.candidateName}</span>.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          <div className="flex flex-col gap-6 lg:col-span-8">
            <div className="flex flex-col gap-8 rounded-2xl bg-[var(--color-surface-card)] p-6 shadow-sm md:p-8">
              <div className="flex flex-col gap-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-md bg-[var(--color-primary-fixed,#d8e2ff)] px-2.5 py-0.5 font-mono text-xs font-semibold text-[var(--color-primary)]">
                    Mã đề: {testCode}
                  </span>
                </div>
                <h2 className="mt-1 text-xl font-bold tracking-tight text-[var(--color-on-surface)] md:text-2xl">{test.title}</h2>
                <div className={`flex flex-wrap items-center gap-x-4 gap-y-1 pt-1 ${muted}`}>
                  <span className="inline-flex items-center gap-1.5">
                    <Building2 className="size-[18px] text-[var(--color-primary)]" aria-hidden="true" />
                    {companyName}
                  </span>
                  <span className="hidden text-[var(--color-outline-variant)] sm:inline">•</span>
                  <span className="inline-flex items-center gap-1.5">
                    <IdCard className="size-[18px] text-[var(--color-tertiary)]" aria-hidden="true" />
                    Vị trí: <span className="font-medium text-[var(--color-on-surface)]">{application.jobTitle}</span>
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-center justify-between gap-4 rounded-xl bg-gradient-to-r from-[var(--color-primary)]/10 via-[var(--color-surface-container-low)] to-[var(--color-surface-container)] p-4 md:flex-row">
                <div className="flex w-full items-center gap-4 md:w-auto">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[var(--color-primary)] text-[var(--color-on-primary,#fff)] shadow-sm">
                    <Timer className="size-6" aria-hidden="true" />
                  </div>
                  <div className="flex flex-col">
                    <span className={`text-xs uppercase tracking-wider ${muted}`}>Thời lượng làm bài</span>
                    <span className="text-base font-semibold text-[var(--color-on-surface)]">{test.durationMinutes} phút liên tục</span>
                  </div>
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <span className={`text-xs font-semibold uppercase tracking-wider ${muted}`}>Thông số bài kiểm tra</span>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  <SpecCard icon={Hourglass} label="Thời lượng" value={`${test.durationMinutes} phút`} hint="Chạy liên tục khi bắt đầu" />
                  <SpecCard icon={ClipboardList} label="Hình thức" value="Trắc nghiệm" hint="Theo đề đã xuất bản" />
                  <SpecCard
                    icon={Trophy}
                    label="Ngưỡng đạt"
                    value={test.passingScore != null ? `${test.passingScore}` : "Theo đề"}
                    hint={test.passingScore != null ? `Điểm đạt tối thiểu: ${test.passingScore}` : "Theo cấu hình của nhà tuyển dụng"}
                    hintClass="font-medium text-emerald-700"
                  />
                </div>
              </div>

              {test.description ? (
                <div className="flex flex-col gap-2">
                  <h3 className="text-base font-bold text-[var(--color-on-surface)]">Mô tả bài kiểm tra</h3>
                  <p className={`whitespace-pre-wrap break-words text-sm ${muted}`}>{test.description}</p>
                </div>
              ) : null}

              <div className="flex flex-col gap-3 rounded-xl bg-[var(--color-surface-container)] p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-primary)]">
                  <Info className="size-5" aria-hidden="true" />
                  <span>Lưu ý quan trọng trong bài thi</span>
                </div>
                <ul className={`flex list-disc flex-col gap-2 pl-6 text-xs ${muted}`}>
                  {ASSESSMENT_GUIDELINES.map((item) => (
                    <li key={item.title}>
                      <strong className="text-[var(--color-on-surface)]">{item.title}</strong>{" "}
                      {item.title.startsWith("Đồng hồ")
                        ? `Khi bạn nhấn bắt đầu, thời gian ${test.durationMinutes} phút sẽ chạy liên tục và không thể tạm dừng vì bất kỳ lý do nào.`
                        : item.body}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="flex flex-col items-center justify-between gap-4 rounded-2xl bg-[var(--color-surface-card)] p-6 shadow-sm sm:flex-row">
              <div className="flex items-center gap-4">
                <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-container-low)] text-[var(--color-primary)]">
                  <Network className="size-7" aria-hidden="true" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-[var(--color-on-surface)]">Quy trình tuyển dụng tại {companyName}</h4>
                  <p className={`text-xs ${muted}`}>
                    Vòng hiện tại: <span className="font-semibold text-[var(--color-primary)]">Bài test chuyên môn</span>
                  </p>
                </div>
              </div>
              <Link
                className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[var(--color-surface-container-low)] px-4 py-2 text-sm font-medium text-[var(--color-primary)] transition-colors hover:bg-[var(--color-surface-container)]"
                to={`/candidate/applications/${application.id}`}
              >
                <span>Xem chi tiết đơn</span>
                <ExternalLink className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <div className="flex flex-col gap-6 lg:col-span-4">
            <div className="flex flex-col gap-4 rounded-2xl bg-[var(--color-surface-card)] p-6 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <span className={`text-xs font-semibold uppercase tracking-wider ${muted}`}>Xác nhận tư cách dự thi</span>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[var(--color-primary-fixed,#d8e2ff)] shadow-sm">
                  {user?.avatarUrl ? (
                    <img className="size-full object-cover" src={user.avatarUrl} alt="" />
                  ) : (
                    <span className="text-lg font-semibold text-[var(--color-primary)]">
                      {(user?.fullName ?? application.candidateName).trim().charAt(0).toLocaleUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex min-w-0 flex-col overflow-hidden">
                  <div className="flex items-center gap-1">
                    <span className="truncate text-sm font-bold text-[var(--color-on-surface)]">{user?.fullName ?? application.candidateName}</span>
                    <CheckCircle2 className="size-4 shrink-0 text-[var(--color-primary)]" aria-hidden="true" />
                  </div>
                  <span className="font-mono text-xs font-semibold text-[var(--color-primary)]">Mã ứng viên: {candidateCode}</span>
                  <span className={`truncate text-xs ${muted}`}>{user?.email ?? application.candidateEmail}</span>
                </div>
              </div>
              <div className={`space-y-1 pt-1 text-xs ${muted}`}>
                <div className="flex items-center justify-between gap-2">
                  <span>Số điện thoại:</span>
                  <span className="font-mono font-medium text-[var(--color-on-surface)]">{maskPhone(user?.phone)}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span>Địa điểm:</span>
                  <span className="font-medium text-[var(--color-on-surface)]">
                    {application.jobLocation ?? "—"}
                    {application.jobWorkMode ? ` (${application.jobWorkMode})` : ""}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span>Thời gian ứng tuyển:</span>
                  <span className="font-mono text-[12px]">
                    {new Date(application.createdAt).toLocaleString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit",
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>
            </div>

            <div className="relative flex flex-col gap-4 overflow-hidden rounded-2xl bg-[var(--color-surface-card)] p-6 shadow-md">
              <div className="absolute left-0 right-0 top-0 h-1.5 bg-[var(--color-primary)]" />
              <div className="flex flex-col gap-1">
                <div className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-primary)]">
                  <PlayCircle className="size-4" aria-hidden="true" />
                  <span>BƯỚC TIẾP THEO</span>
                </div>
                <h3 className="text-sm font-bold text-[var(--color-on-surface)]">Sẵn sàng vào bài kiểm tra?</h3>
                <p className={`text-xs ${muted}`}>
                  Sau khi bắt đầu, đồng hồ {test.durationMinutes} phút chạy liên tục. Bạn có thể lưu đáp án và nộp bài trong phiên làm bài.
                </p>
              </div>
              {!done && !inProgress && (
                <label className="-ml-1 flex cursor-pointer items-start gap-3 rounded p-1 transition-colors hover:bg-[var(--color-surface-container-low)]">
                  <input
                    className="mt-1 size-4 cursor-pointer accent-[var(--color-primary)]"
                    type="checkbox"
                    checked={acceptRules}
                    onChange={(event) => onAcceptRulesChange(event.target.checked)}
                    id="accept-rules"
                  />
                  <span className="text-xs leading-snug text-[var(--color-on-surface)]">
                    Tôi xác nhận thông tin cá nhân chính xác và cam kết tuân thủ Quy chế giám sát thi trực tuyến.
                  </span>
                </label>
              )}
              <Button
                className="h-11 w-full shadow-sm active:scale-[0.99]"
                disabled={starting || (!done && !inProgress && !acceptRules)}
                onClick={onStart}
              >
                <span>{ctaLabel}</span>
                <ArrowRight className="size-5" aria-hidden="true" />
              </Button>
            </div>

            <div className="flex flex-col gap-4 rounded-2xl bg-[var(--color-surface-card)] p-6 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-[var(--color-on-surface)]">
                <Scale className="size-5 text-[var(--color-status-danger)]" aria-hidden="true" />
                <span className="font-bold">Quy chế phòng thi</span>
              </div>
              <div className="flex flex-col gap-3">
                {ASSESSMENT_REGULATIONS.map((rule) => {
                  const Icon = regulationIcons[rule.icon];
                  return (
                    <div key={rule.title} className="flex items-start gap-3">
                      <Icon className="mt-0.5 size-[18px] shrink-0 text-[var(--color-primary)]" aria-hidden="true" />
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-[var(--color-on-surface)]">{rule.title}</span>
                        <span className={`text-xs ${muted}`}>{rule.body}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SpecCard({
  icon: Icon,
  label,
  value,
  hint,
  hintClass,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint: string;
  hintClass?: string;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-[var(--color-surface-container-low)] p-4">
      <div className={`flex items-center gap-1.5 text-xs ${muted}`}>
        <Icon className="size-[18px] text-[var(--color-primary)]" aria-hidden="true" />
        <span>{label}</span>
      </div>
      <div className="text-xl font-bold text-[var(--color-on-surface)]">{value}</div>
      <div className={`text-xs leading-tight ${hintClass ?? muted}`}>{hint}</div>
    </div>
  );
}
