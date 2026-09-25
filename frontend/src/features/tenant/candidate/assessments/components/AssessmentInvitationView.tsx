import { Link } from "react-router-dom";
import {
  AppWindow,
  ArrowRight,
  Building2,
  CalendarClock,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Eye,
  ExternalLink,
  Headphones,
  Home,
  Hourglass,
  IdCard,
  Info,
  Mail,
  MessageCircle,
  Monitor,
  Network,
  Phone,
  PlayCircle,
  Scale,
  ShieldCheck,
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
import {
  ASSESSMENT_GUIDELINES,
  ASSESSMENT_REGULATIONS,
  ASSESSMENT_TOPICS,
  INVITE_META,
} from "../constants/invitationContent";
import { useCountdown } from "../hooks/useCountdown";
import { formatDeadline, maskPhone } from "../utils/formatCountdown";

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
  const deadline = new Date(new Date(application.createdAt).getTime() + INVITE_META.acceptWindowMs);
  const { label: countdownLabel, expired } = useCountdown(deadline);
  const inviteCode = `${INVITE_META.codePrefix}-${String(application.id).padStart(4, "0")}-${test.id}`;
  const testCode = `ASM-${test.id.toString().padStart(3, "0")}`;
  const candidateCode = `CAN-${String(user?.id ?? application.candidateId).padStart(4, "0")}`;
  const done = test.submissionStatus === "GRADED" || test.submissionStatus === "EXPIRED" || test.submissionStatus === "SUBMITTED";
  const inProgress = test.submissionStatus === "IN_PROGRESS";
  const ctaLabel = starting
    ? "Đang mở…"
    : done
      ? "Xem kết quả bài làm"
      : inProgress
        ? "Tiếp tục làm bài"
        : "Tiếp nhận & Đến bước kiểm tra thiết bị";

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
            <span className={`inline-block size-2 rounded-full ${expired ? "bg-[var(--color-status-danger)]" : "animate-pulse bg-[var(--color-primary)]"}`} />
            {expired ? "Đã hết hạn nhận bài" : "Đang mở nhận bài • Phiên làm việc hợp lệ"}
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
                  <span className={`font-mono ${muted}`}>{inviteCode}</span>
                </div>
                <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-on-surface)] md:text-[30px] md:leading-[38px]">
                  Lời mời tham gia Đánh giá năng lực chuyên môn
                </h1>
                <p className={`mt-1 ${muted}`}>
                  Được gửi trực tiếp từ <strong className="font-semibold text-[var(--color-on-surface)]">{companyName}</strong> dành riêng cho ứng viên{" "}
                  <span className="font-semibold text-[var(--color-primary)]">{user?.fullName ?? application.candidateName}</span>.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-start gap-4 rounded-xl bg-[var(--color-surface-container-low)] px-4 py-3 sm:flex-row sm:items-center">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-6 text-[var(--color-primary)]" aria-hidden="true" />
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-[var(--color-on-surface)]">SmartHire-AI Examination Shield</span>
                  <span className="font-mono text-[11px] text-[var(--color-tertiary)]">{INVITE_META.shieldLevel}</span>
                </div>
              </div>
              <div className="hidden h-6 w-px bg-[var(--color-outline-variant)] sm:block" />
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                <span className="size-1.5 rounded-full bg-emerald-600" />
                Đã xác thực chữ ký số
              </span>
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
                  <span className={`rounded-md bg-[var(--color-surface-container)] px-2.5 py-0.5 text-xs ${muted}`}>
                    {INVITE_META.standardLabel}
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
                    <span className={`text-xs uppercase tracking-wider ${muted}`}>Thời hạn hoàn thành</span>
                    <span className="text-base font-semibold text-[var(--color-on-surface)]">{formatDeadline(deadline)}</span>
                  </div>
                </div>
                <div className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--color-surface-card)] px-4 py-2 shadow-sm md:w-auto">
                  <Timer className={`size-5 ${expired ? "text-[var(--color-status-danger)]" : "animate-pulse text-[var(--color-status-danger)]"}`} aria-hidden="true" />
                  <span className={`text-xs ${muted}`}>Còn hiệu lực:</span>
                  <span className="font-mono text-base font-bold text-[var(--color-status-danger)]" role="timer" aria-label="Thời hạn nhận bài còn lại">
                    {countdownLabel}
                  </span>
                </div>
              </div>

              <div>
                <div className="mb-3 flex items-center justify-between">
                  <span className={`text-xs font-semibold uppercase tracking-wider ${muted}`}>Thông số kỹ thuật bài kiểm tra</span>
                  <span className="text-xs font-medium text-[var(--color-primary)]">Quy chuẩn chuẩn hoá</span>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <SpecCard icon={Hourglass} label="Thời lượng" value={`${test.durationMinutes} Phút`} hint="Làm bài liên tục không gián đoạn" />
                  <SpecCard icon={ClipboardList} label="Số lượng câu" value="Theo đề xuất bản" hint={INVITE_META.questionMixHint} />
                  <SpecCard
                    icon={Trophy}
                    label="Thang điểm"
                    value="100 Điểm"
                    hint={test.passingScore != null ? `Ngưỡng đạt: ≥ ${test.passingScore}/100` : "Ngưỡng đạt theo cấu hình đề"}
                    hintClass="font-medium text-emerald-700"
                  />
                  <SpecCard icon={Eye} label="Giám sát AI" value={INVITE_META.monitoringLabel} hint={INVITE_META.monitoringHint} />
                </div>
              </div>

              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-base font-bold text-[var(--color-on-surface)]">Ma trận đề thi & Cấu trúc kiến thức</h3>
                    <p className={`text-xs ${muted}`}>Phân bố trọng số các chuyên đề theo tiêu chuẩn Backend Engineer</p>
                  </div>
                  <span className="shrink-0 font-mono text-xs font-medium text-[var(--color-primary)]">Tổng: 100%</span>
                </div>
                <div className="flex h-3 w-full overflow-hidden rounded-full bg-[var(--color-surface-container-high)]">
                  {ASSESSMENT_TOPICS.map((topic) => (
                    <div key={topic.title} className={`h-full transition-all ${topic.barClass}`} style={{ width: `${topic.percent}%` }} title={`${topic.title}: ${topic.percent}%`} />
                  ))}
                </div>
                <div className="grid grid-cols-1 gap-4 pt-1 sm:grid-cols-2">
                  {ASSESSMENT_TOPICS.map((topic) => (
                    <div key={topic.title} className="flex items-start gap-4 rounded-xl bg-[var(--color-surface-card)] p-4 shadow-sm ring-1 ring-[var(--color-outline-variant)]/40">
                      <div className={`flex size-10 shrink-0 items-center justify-center rounded-lg font-mono text-sm font-bold ${topic.badgeClass}`}>
                        {topic.percent}%
                      </div>
                      <div className="flex min-w-0 flex-col">
                        <span className="text-sm font-semibold text-[var(--color-on-surface)]">{topic.title}</span>
                        <span className={`text-xs ${muted}`}>{topic.description}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col gap-3 rounded-xl bg-[var(--color-surface-container)] p-4">
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-primary)]">
                  <Info className="size-5" aria-hidden="true" />
                  <span>Cơ chế bảo vệ & Lưu ý quan trọng trong bài thi</span>
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
                    Vòng 1: Lọc CV (Đạt) → <span className="font-semibold text-[var(--color-primary)]">Vòng 2: Bài test chuyên môn (Hiện tại)</span> → Vòng 3: Phỏng vấn Kỹ thuật sâu.
                  </p>
                </div>
              </div>
              <Link
                className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[var(--color-surface-container-low)] px-4 py-2 text-sm font-medium text-[var(--color-primary)] transition-colors hover:bg-[var(--color-surface-container)]"
                to={`/candidate/applications/${application.id}`}
              >
                <span>Xem mô tả công việc (JD)</span>
                <ExternalLink className="size-4" aria-hidden="true" />
              </Link>
            </div>
          </div>

          <div className="flex flex-col gap-6 lg:col-span-4">
            <div className="flex flex-col gap-4 rounded-2xl bg-[var(--color-surface-card)] p-6 shadow-sm">
              <div className="flex items-center justify-between gap-2">
                <span className={`text-xs font-semibold uppercase tracking-wider ${muted}`}>Xác nhận tư cách dự thi</span>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                  <span className="size-1.5 rounded-full bg-emerald-600" />
                  Đã duyệt hồ sơ
                </span>
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
                  <span>Địa điểm phỏng vấn:</span>
                  <span className="font-medium text-[var(--color-on-surface)]">
                    {application.jobLocation ?? "—"}
                    {application.jobWorkMode ? ` (${application.jobWorkMode})` : ""}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span>Thời gian gửi lời mời:</span>
                  <span className="font-mono text-[12px]">
                    {new Date(application.createdAt).toLocaleString("vi-VN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit", year: "numeric" })}
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
                <h3 className="text-sm font-bold text-[var(--color-on-surface)]">Bạn đã sẵn sàng bước vào bài kiểm tra?</h3>
                <p className={`text-xs ${muted}`}>
                  Sau khi tiếp nhận, hệ thống sẽ đưa bạn vào phiên làm bài có đồng hồ đếm ngược. Thời gian {test.durationMinutes} phút chạy liên tục khi bắt đầu.
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
                    Tôi xác nhận thông tin cá nhân chính xác và cam kết tuân thủ nghiêm ngặt Quy chế giám sát thi trực tuyến.
                  </span>
                </label>
              )}
              <div className="flex flex-col gap-3 pt-1">
                <Button
                  className="h-11 w-full shadow-sm active:scale-[0.99]"
                  disabled={starting || (!done && !inProgress && !acceptRules)}
                  onClick={onStart}
                >
                  <span>{ctaLabel}</span>
                  <ArrowRight className="size-5" aria-hidden="true" />
                </Button>
                <Button variant="secondary" className="w-full" type="button" disabled>
                  <CalendarClock className="size-[18px] text-[var(--color-on-surface-variant)]" aria-hidden="true" />
                  <span>Yêu cầu đổi lịch thi</span>
                </Button>
              </div>
              <div className="text-center">
                <a className={`inline-flex items-center gap-1 text-xs hover:text-[var(--color-primary)] ${muted}`} href={`mailto:hr@${companyName.replace(/\s+/g, "").toLowerCase()}.io`}>
                  <span>Liên hệ bộ phận tuyển dụng {companyName}</span>
                  <ExternalLink className="size-3.5" aria-hidden="true" />
                </a>
              </div>
            </div>

            <div className="flex flex-col gap-4 rounded-2xl bg-[var(--color-surface-card)] p-6 shadow-sm">
              <div className="flex items-center gap-2 text-sm text-[var(--color-on-surface)]">
                <Scale className="size-5 text-[var(--color-status-danger)]" aria-hidden="true" />
                <span className="font-bold">Quy chế phòng thi nghiêm ngặt</span>
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

            <div className="flex flex-col gap-3 rounded-2xl bg-[var(--color-surface-container-low)] p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-semibold text-[var(--color-on-surface)]">
                  <Headphones className="size-[18px] text-[var(--color-tertiary)]" aria-hidden="true" />
                  <span>Hỗ trợ kỹ thuật kỳ thi 24/7</span>
                </div>
                <span className="size-2 animate-pulse rounded-full bg-emerald-500" title="Sẵn sàng trực tuyến" />
              </div>
              <p className={`text-xs ${muted}`}>
                Nếu gặp trục trặc đường truyền hoặc lỗi thiết bị trước/trong bài thi, vui lòng liên hệ ngay với đội ngũ giám sát:
              </p>
              <div className="grid grid-cols-1 gap-2 pt-1 text-xs">
                <a className="flex items-center justify-between rounded-lg bg-[var(--color-surface-card)] p-2 text-[var(--color-on-surface)] transition-colors hover:text-[var(--color-primary)]" href="tel:19008899">
                  <span className="inline-flex items-center gap-1.5">
                    <Phone className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
                    Tổng đài khẩn cấp:
                  </span>
                  <span className="font-mono font-bold text-[var(--color-primary)]">{INVITE_META.supportPhone}</span>
                </a>
                <button type="button" className="flex items-center justify-between rounded-lg bg-[var(--color-surface-card)] p-2 text-left text-[var(--color-on-surface)] transition-colors hover:text-[var(--color-primary)]">
                  <span className="inline-flex items-center gap-1.5">
                    <MessageCircle className="size-4 text-[var(--color-tertiary)]" aria-hidden="true" />
                    Live Chat trực tiếp:
                  </span>
                  <span className="font-medium text-[var(--color-tertiary)]">Kết nối giám thị ngay</span>
                </button>
                <a className="flex items-center justify-between rounded-lg bg-[var(--color-surface-card)] p-2 text-[var(--color-on-surface)] transition-colors hover:text-[var(--color-primary)]" href={`mailto:${INVITE_META.supportEmail}`}>
                  <span className="inline-flex items-center gap-1.5">
                    <Mail className="size-4 text-[var(--color-outline)]" aria-hidden="true" />
                    Email phản hồi:
                  </span>
                  <span className="max-w-[160px] truncate font-mono text-[12px]">{INVITE_META.supportEmail}</span>
                </a>
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
