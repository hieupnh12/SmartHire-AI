import { useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  ClipboardCheck,
  Clock3,
  FileSearch,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Trophy,
} from "lucide-react";
import type { AvailableAssessment, SubmissionStatus } from "@/api/types/assessment";
import type { ApplicationSummary } from "@/api/types/applicant";
import { applicantApi } from "@/api/tenant/applicantApi";
import { assessmentApi } from "@/api/tenant/assessmentApi";
import { Button } from "@/components/ux/Button";
import { LoadingState, SkeletonCard } from "@/components/ux/Skeleton";
import { getApiErrorMessage } from "@/lib/axios";
import { queryKeys } from "@/lib/query-keys";
import { isDemoAssessmentTitle, shortAssessmentTitle } from "@/lib/assessmentTitle";

type Invitation = {
  application: ApplicationSummary;
  test: AvailableAssessment;
};

const STATUS_TONE: Record<string, string> = {
  NOT_STARTED: "bg-slate-100 text-slate-700",
  IN_PROGRESS: "bg-violet-50 text-violet-700",
  SUBMITTED: "bg-cyan-50 text-cyan-700",
  GRADED: "bg-emerald-50 text-emerald-700",
  EXPIRED: "bg-red-50 text-red-700",
};

const STATUS_LABEL: Record<string, string> = {
  NOT_STARTED: "Chưa làm",
  IN_PROGRESS: "Đang làm bài",
  SUBMITTED: "Đã nộp",
  GRADED: "Đã chấm",
  EXPIRED: "Hết hạn",
};

export function AssessmentsPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const filterAppId = Number(params.get("applicationId")) || 0;

  const applications = useQuery({
    queryKey: [...queryKeys.assessments.all(), "applications"],
    queryFn: applicantApi.mine,
  });
  const eligible = useMemo(
    () => (applications.data?.data ?? []).filter((a) => !a.archived && (a.status === "ASSESSMENT" || a.status === "HUMAN_INTERVIEW" || a.status === "FAILED")),
    [applications.data?.data],
  );

  const testQueries = useQueries({
    queries: eligible.map((app) => ({
      queryKey: queryKeys.assessments.available(app.id),
      queryFn: () => assessmentApi.available(app.id),
    })),
  });

  const invitations = useMemo(() => {
    const rows: Invitation[] = [];
    eligible.forEach((application, index) => {
      for (const test of testQueries[index]?.data ?? []) {
        rows.push({ application, test });
      }
    });
    return filterAppId > 0 ? rows.filter((row) => row.application.id === filterAppId) : rows;
  }, [eligible, testQueries, filterAppId]);

  const testsLoading = eligible.length > 0 && testQueries.some((q) => q.isPending);
  const testsError = testQueries.find((q) => q.isError)?.error ?? null;

  const ready = invitations.filter((item) => {
    const status = item.test.submissionStatus;
    return !status || status === "NOT_STARTED" || status === "IN_PROGRESS";
  }).length;
  const completed = invitations.filter((item) =>
    ["SUBMITTED", "GRADED", "EXPIRED"].includes(item.test.submissionStatus ?? ""),
  ).length;

  const openInvitation = (invitation: Invitation) => {
    const { test, application } = invitation;
    navigate(`/assessments/${test.id}/invite?applicationId=${application.id}`);
  };

  const openAction = (invitation: Invitation) => {
    const { test } = invitation;
    const done =
      test.submissionStatus === "SUBMITTED" ||
      test.submissionStatus === "GRADED" ||
      test.submissionStatus === "EXPIRED";
    const demo = isDemoAssessmentTitle(test.title);
    // Result only: open take. Start / continue always goes through invite (rules + device check).
    if (done && !demo && test.submissionId) {
      navigate(`/assessments/${test.submissionId}/take`);
      return;
    }
    openInvitation(invitation);
  };

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]" aria-labelledby="assessments-title">
      <header className="overflow-hidden rounded-3xl border border-[var(--color-border-default)] bg-[linear-gradient(135deg,var(--color-primary-subtle),white_62%)] px-5 py-6 shadow-[var(--shadow-card)] sm:px-7">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)]">
              Vòng đánh giá kỹ thuật
            </p>
            <h1 id="assessments-title" className="mt-2 text-3xl font-semibold tracking-tight">
              Bài đánh giá
            </h1>
            <p className="mt-2 text-sm leading-6 text-[var(--color-on-surface-variant)]">
              Mỗi hồ sơ nhận một đề riêng từ ngân hàng câu hỏi. Đề mẫu [Demo UI] dùng để xem giao diện và có thể làm lại nhiều lần, không tính vào kết quả hồ sơ.
            </p>
          </div>
          <div className="grid grid-cols-3 gap-2 sm:gap-3">
            <Metric value={invitations.length} label="Lời mời" />
            <Metric value={ready} label="Cần thực hiện" />
            <Metric value={completed} label="Đã hoàn tất" />
          </div>
        </div>
      </header>

      <div className="flex items-start gap-3 rounded-2xl border border-[var(--color-primary)]/15 bg-[var(--color-primary-subtle)] p-4 text-sm">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-[var(--color-primary)]" aria-hidden="true" />
        <p className="leading-6 text-[var(--color-on-surface-variant)]">
          <strong className="text-[var(--color-on-surface)]">Trước khi bắt đầu:</strong> mở lời mời để đọc
          quy chế và hoàn tất kiểm tra thiết bị. Đồng hồ chỉ chạy sau khi bạn vào phòng thi.
        </p>
      </div>

      {(applications.isError || testsError) && (
        <div
          role="alert"
          className="rounded-2xl border border-[var(--color-error-container)] bg-[var(--color-error-container)] p-5"
        >
          <p className="text-sm text-[var(--color-on-error-container)]">
            {getApiErrorMessage(applications.error ?? testsError)}
          </p>
          <Button
            className="mt-4"
            variant="secondary"
            onClick={() => {
              void applications.refetch();
              void Promise.all(testQueries.map((q) => q.refetch()));
            }}
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            Thử lại
          </Button>
        </div>
      )}

      {(applications.isPending || testsLoading) && (
        <LoadingState className="grid gap-4 lg:grid-cols-2" label="Đang tải lời mời bài đánh giá">
          {[0, 1, 2, 3].map((item) => (
            <SkeletonCard key={item} className="min-h-72" />
          ))}
        </LoadingState>
      )}

      {!applications.isPending && !testsLoading && invitations.length === 0 && (
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-2xl border border-dashed border-[var(--color-border-default)] bg-white p-6 shadow-[var(--shadow-card)]">
            <ClipboardCheck className="size-8 text-[var(--color-primary)]" aria-hidden="true" />
            <div>
              <p className="font-semibold">Chưa có đề được nhà tuyển dụng giao</p>
              <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
                Đề chính thức sẽ xuất hiện khi hồ sơ ứng tuyển của bạn vượt qua vòng lọc CV. Trong lúc chờ đợi, bạn có thể thử sức với đề thi mẫu kỹ thuật bên dưới.
              </p>
            </div>
          </div>

          {/* Featured Sample Card */}
          <article className="flex min-w-0 flex-col overflow-hidden rounded-2xl border-2 border-[var(--color-primary)]/30 bg-white shadow-md transition-all hover:border-[var(--color-primary)] hover:shadow-lg">
            <div className="flex-1 p-5 sm:p-6">
              <div className="flex items-start gap-4">
                <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-[var(--color-primary-subtle)] text-[var(--color-primary)]">
                  <Sparkles className="size-6" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">
                        ĐỀ THI MẪU DÀNH CHO ỨNG VIÊN
                      </p>
                      <h2 className="mt-1 text-lg font-bold leading-6 text-[var(--color-on-surface)]">
                        [Demo UI] Senior Full-Stack Engineer Technical Assessment
                      </h2>
                      <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">
                        Vị trí: Senior Full-Stack Developer (React 19 & Spring Boot 3)
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                      Làm thử miễn phí
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid gap-3 rounded-xl bg-[var(--color-surface-alt)] p-4 text-sm sm:grid-cols-2">
                <Fact icon={Clock3} label="Thời lượng" value="45 phút" />
                <Fact icon={Trophy} label="Ngưỡng đạt" value="70 / 100 điểm" />
              </div>

              <p className="mt-4 text-xs leading-5 text-[var(--color-on-surface-variant)]">
                Đề kiểm tra kỹ thuật mẫu bao gồm 5 câu trắc nghiệm khách quan, 1 câu tự luận thiết kế kiến trúc phân tán và 1 bài toán lập trình thuật toán có trình chạy code sandbox.
              </p>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border-default)]/60 pt-4">
                <span className="text-xs text-[var(--color-on-surface-variant)]">
                  Không giới hạn số lần làm thử · Không ảnh hưởng đến hồ sơ thực
                </span>
                <Link to="/assessments/sample">
                  <Button className="gap-2 font-bold">
                    Vào làm bài mẫu ngay <ArrowRight className="size-4" />
                  </Button>
                </Link>
              </div>
            </div>
          </article>
        </div>
      )}

      {invitations.length > 0 && (
        <div className="grid gap-4 lg:grid-cols-2">
          {invitations.map((invitation) => (
            <AssessmentCard
              key={`${invitation.application.id}-${invitation.test.id}`}
              invitation={invitation}
              onAction={() => openAction(invitation)}
            />
          ))}
        </div>
      )}
    </section>
  );
}

function AssessmentCard({
  invitation,
  onAction,
}: {
  invitation: Invitation;
  onAction: () => void;
}) {
  const { application, test } = invitation;
  const status = (test.submissionStatus ?? "NOT_STARTED") as SubmissionStatus | "NOT_STARTED";
  const demo = isDemoAssessmentTitle(test.title);
  const action = actionLabel(status, demo);

  return (
    <article className="flex min-w-0 flex-col overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-white shadow-[var(--shadow-card)] transition-[border-color,box-shadow] hover:border-[var(--color-primary)]/30 hover:shadow-[var(--shadow-ambient)]">
      <div className="flex-1 p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-[var(--color-primary-subtle)] text-[var(--color-primary)]">
            <ClipboardCheck className="size-6" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">
                  Lời mời Assessment
                </p>
                <h2 className="mt-1 break-words text-lg font-semibold leading-6">
                  {shortAssessmentTitle(application.jobTitle, test.title)}
                </h2>
                <p className="mt-1 truncate text-xs text-[var(--color-on-surface-variant)]">
                  {application.jobTitle}
                </p>
              </div>
              <span
                className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_TONE[status] ?? STATUS_TONE.NOT_STARTED}`}
              >
                {STATUS_LABEL[status] ?? STATUS_LABEL.NOT_STARTED}
              </span>
            </div>
          </div>
        </div>

        <div className="mt-5 grid gap-3 rounded-xl bg-[var(--color-surface-alt)] p-4 text-sm sm:grid-cols-2">
          <Fact icon={Clock3} label="Thời lượng" value={`${test.durationMinutes} phút`} />
          <Fact
            icon={Trophy}
            label="Ngưỡng đạt"
            value={test.passingScore != null ? String(test.passingScore) : "Theo đề"}
          />
          <Fact icon={FileSearch} label="Đơn ứng tuyển" value={`#${application.id}`} />
          <Fact
            icon={ClipboardCheck}
            label="Trạng thái bài"
            value={STATUS_LABEL[status] ?? "Chưa làm"}
          />
        </div>

        {test.description ? (
          <p className="mt-4 line-clamp-3 text-xs leading-5 text-[var(--color-on-surface-variant)]">
            {test.description}
          </p>
        ) : null}
      </div>

      <div className="flex flex-col gap-3 border-t border-[var(--color-border-default)] bg-[var(--color-surface-alt)] px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <span className="text-xs text-[var(--color-on-surface-variant)]">
          {status === "NOT_STARTED" || !test.submissionStatus
            ? "Xem lời mời, quy chế rồi kiểm tra thiết bị trước khi vào bài"
            : status === "IN_PROGRESS"
              ? "Bạn có thể tiếp tục phiên đang mở"
              : "Xem kết quả hoặc mở lại lời mời"}
        </span>
        <button
          type="button"
          onClick={onAction}
          className="inline-flex min-h-10 cursor-pointer items-center justify-center gap-2 rounded-xl bg-[var(--color-primary)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-primary-hover)]"
        >
          {action}
          <ArrowRight className="size-4" aria-hidden="true" />
        </button>
      </div>
    </article>
  );
}

function Metric({ value, label }: { value: number; label: string }) {
  return (
    <div className="min-w-20 rounded-2xl border border-[var(--color-primary)]/15 bg-white/80 px-3 py-3 text-center">
      <strong className="block text-xl text-[var(--color-primary)]">{value}</strong>
      <span className="mt-0.5 block text-[10px] font-medium text-[var(--color-on-surface-variant)] sm:text-xs">
        {label}
      </span>
    </div>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Clock3;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-2">
      <Icon className="mt-0.5 size-4 shrink-0 text-[var(--color-primary)]" aria-hidden="true" />
      <div>
        <p className="text-xs text-[var(--color-on-surface-variant)]">{label}</p>
        <p className="mt-0.5 font-medium">{value}</p>
      </div>
    </div>
  );
}

function actionLabel(status: SubmissionStatus | "NOT_STARTED", demo: boolean) {
  if (status === "IN_PROGRESS") return "Tiếp tục làm bài";
  if (status === "SUBMITTED" || status === "GRADED" || status === "EXPIRED") {
    return demo ? "Làm lại từ đầu" : "Xem kết quả";
  }
  return "Xem lời mời";
}
