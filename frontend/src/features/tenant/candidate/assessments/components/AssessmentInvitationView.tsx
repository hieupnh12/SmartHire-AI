import { Link } from "react-router-dom";
import {
  AppWindow,
  ArrowRight,
  Check,
  ClipboardCheck,
  Clock3,
  ExternalLink,
  Monitor,
  Scale,
  Terminal,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import type { AvailableAssessment } from "@/api/types/assessment";
import type { ApplicationSummary } from "@/api/types/applicant";
import type { UserProfile } from "@/features/tenant/auth/types";
import { Button } from "@/components/ux/Button";
import { AssessmentProctorGate, type ProctorSession } from "./AssessmentProctorGate";
import { ASSESSMENT_REGULATIONS } from "../constants/invitationContent";

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
  allowRetake?: boolean;
  onContinue: () => void;
  onProctorReady: (session: ProctorSession) => void | Promise<void>;
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
  allowRetake = false,
  onContinue,
  onProctorReady,
  applications,
  onSelectApplication,
}: Props) {
  const done =
    test.submissionStatus === "GRADED" ||
    test.submissionStatus === "EXPIRED" ||
    test.submissionStatus === "SUBMITTED";
  const inProgress = test.submissionStatus === "IN_PROGRESS";
  /** Rules + device check always happen here (start, continue, demo retake) — never again on /take. */
  const needsGate = !done || (done && allowRetake);
  const candidateName = user?.fullName ?? application.candidateName;
  const gateLabel = starting
    ? "Đang mở…"
    : inProgress
      ? "Tiếp tục làm bài"
      : allowRetake && done
        ? "Làm lại từ đầu"
        : "Bắt đầu làm bài";
  const ctaLabel = starting ? "Đang mở…" : "Xem kết quả";

  return (
    <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
      {!!applications?.length && applications.length > 1 && onSelectApplication && (
        <label className="flex shrink-0 flex-wrap items-center gap-2 text-sm">
          <span className="font-medium">Đơn ứng tuyển</span>
          <select
            className="min-h-10 min-w-64 flex-1 rounded-lg border border-[var(--color-border-default)] bg-white px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]"
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

      <article className="grid h-full min-h-0 flex-1 overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-white shadow-[var(--shadow-card)] max-lg:overflow-y-auto lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <section className="flex min-h-0 flex-col border-b border-[var(--color-border-default)] lg:border-b-0 lg:border-r">
          <header className="shrink-0 border-b border-[var(--color-border-default)] bg-[linear-gradient(135deg,var(--color-primary-subtle),white_72%)] px-5 py-4 sm:px-6">
            <div className="flex items-start gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--color-primary)] text-white">
                <ClipboardCheck className="size-5" aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-primary)]">
                  Lời mời · {companyName}
                </p>
                <h1 className="mt-1 truncate text-xl font-semibold tracking-tight sm:text-2xl">{test.title}</h1>
                <p className="mt-1 truncate text-sm text-[var(--color-on-surface-variant)]">
                  {application.jobTitle} · {candidateName}
                </p>
              </div>
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-2">
              <Fact icon={Clock3} label="Thời lượng" value={`${test.durationMinutes} phút`} />
              <Fact
                icon={Trophy}
                label="Ngưỡng đạt"
                value={test.passingScore != null ? String(test.passingScore) : "Theo đề"}
              />
              <Fact icon={ClipboardCheck} label="Trạng thái" value={done ? "Đã nộp" : inProgress ? "Đang làm" : "Chưa làm"} />
            </dl>
          </header>

          <div className="flex min-h-0 flex-1 flex-col gap-3 p-4 sm:p-5">
            {test.description ? (
              <p className="shrink-0 text-sm leading-6 text-[var(--color-on-surface-variant)] line-clamp-2">
                {test.description}
              </p>
            ) : null}

            <div className="flex min-h-0 flex-1 flex-col">
              <div className="mb-2 flex shrink-0 items-center gap-2">
                <Scale className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
                <h2 className="text-sm font-semibold">Quy chế phòng thi</h2>
              </div>
              <ul className="grid min-h-0 flex-1 gap-2 sm:grid-cols-1 xl:auto-rows-fr">
                {ASSESSMENT_REGULATIONS.map((rule) => {
                  const Icon = regulationIcons[rule.icon];
                  return (
                    <li
                      key={rule.title}
                      className="flex gap-3 rounded-xl bg-[var(--color-surface-alt)] px-3 py-2.5 text-sm"
                    >
                      <Icon className="mt-0.5 size-4 shrink-0 text-[var(--color-primary)]" aria-hidden="true" />
                      <div className="min-w-0">
                        <p className="font-medium">{rule.title}</p>
                        <p className="mt-0.5 text-xs leading-5 text-[var(--color-on-surface-variant)]">{rule.body}</p>
                      </div>
                    </li>
                  );
                })}
              </ul>
              <p className="mt-2 shrink-0 text-xs text-[var(--color-on-surface-variant)]">
                Đồng hồ {test.durationMinutes} phút chạy liên tục sau khi bắt đầu · đáp án tự lưu.
              </p>
            </div>

            <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-[var(--color-border-default)] pt-3 text-xs text-[var(--color-on-surface-variant)]">
              <span>Đơn #{application.id}</span>
              <Link
                className="inline-flex items-center gap-1 font-medium text-[var(--color-primary)] hover:underline"
                to={`/applications/${application.id}`}
              >
                Chi tiết đơn
                <ExternalLink className="size-3.5" aria-hidden="true" />
              </Link>
            </footer>
          </div>
        </section>

        <aside className="flex min-h-0 flex-col gap-3 bg-[var(--color-surface-alt)]/40 p-4 sm:p-5">
          {needsGate ? (
            <>
              <div className="shrink-0">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-primary)]">
                  Bước tiếp theo
                </p>
                <h2 className="mt-1 text-lg font-semibold">
                  {inProgress ? "Tiếp tục phiên đang mở" : allowRetake && done ? "Làm lại bài demo" : "Vào bài kiểm tra"}
                </h2>
                <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
                  Đồng ý quy chế và kiểm tra thiết bị tại đây — sau đó vào thẳng phòng thi.
                </p>
              </div>

              <label
                htmlFor="accept-rules"
                className={`flex shrink-0 cursor-pointer items-start gap-3 rounded-2xl border-2 p-4 transition-colors ${
                  acceptRules
                    ? "border-[var(--color-primary)] bg-[var(--color-primary-subtle)]"
                    : "border-[var(--color-primary)]/45 bg-white shadow-[0_0_0_4px_color-mix(in_srgb,var(--color-primary)_12%,transparent)] hover:border-[var(--color-primary)]"
                }`}
              >
                <span
                  className={`mt-0.5 grid size-6 shrink-0 place-items-center rounded-md border-2 ${
                    acceptRules
                      ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                      : "border-[var(--color-primary)] bg-white"
                  }`}
                  aria-hidden="true"
                >
                  {acceptRules ? <Check className="size-4" strokeWidth={3} /> : null}
                </span>
                <input
                  id="accept-rules"
                  className="sr-only"
                  type="checkbox"
                  checked={acceptRules}
                  onChange={(event) => onAcceptRulesChange(event.target.checked)}
                />
                <span className="min-w-0">
                  <span className="block font-semibold">Tôi đồng ý quy chế phòng thi</span>
                  <span className="mt-1 block text-sm text-[var(--color-on-surface-variant)]">
                    Cam kết làm bài trung thực và chấp nhận giám sát thiết bị.
                  </span>
                  {!acceptRules && (
                    <span className="mt-1.5 block text-sm font-semibold text-[var(--color-primary)]">
                      Bấm để đồng ý và mở kiểm tra thiết bị
                    </span>
                  )}
                </span>
              </label>

              <div className="min-h-0 flex-1 overflow-hidden">
                {acceptRules ? (
                  <div className="h-full min-h-0 overflow-y-auto">
                    <AssessmentProctorGate busy={starting} label={gateLabel} onReady={onProctorReady} />
                  </div>
                ) : (
                  <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-[var(--color-border-default)] bg-white/70 px-4 text-center text-sm text-[var(--color-on-surface-variant)]">
                    Đồng ý quy chế bên trên để kiểm tra microphone và chia sẻ tab.
                  </div>
                )}
              </div>

              {done && allowRetake && test.submissionId && (
                <Button variant="secondary" className="w-full shrink-0" disabled={starting} onClick={onContinue}>
                  Xem kết quả lần làm trước
                </Button>
              )}
            </>
          ) : (
            <div className="flex h-full flex-col justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-primary)]">
                  Bước tiếp theo
                </p>
                <h2 className="mt-1 text-lg font-semibold">Xem kết quả</h2>
                <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
                  Bài đã nộp. Bạn có thể xem kết quả.
                </p>
              </div>
              <Button className="w-full" disabled={starting} onClick={onContinue}>
                {ctaLabel}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            </div>
          )}
        </aside>
      </article>
    </div>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 gap-2 rounded-xl bg-white/85 px-2.5 py-2">
      <Icon className="mt-0.5 size-4 shrink-0 text-[var(--color-primary)]" aria-hidden="true" />
      <div className="min-w-0">
        <dt className="text-[11px] text-[var(--color-on-surface-variant)]">{label}</dt>
        <dd className="truncate text-sm font-semibold">{value}</dd>
      </div>
    </div>
  );
}
