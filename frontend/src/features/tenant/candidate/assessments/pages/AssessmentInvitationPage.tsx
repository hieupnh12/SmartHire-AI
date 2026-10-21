import { useMemo, useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { applicantApi } from "@/api/tenant/applicantApi";
import { assessmentApi } from "@/api/tenant/assessmentApi";
import { Button } from "@/components/ux/Button";
import { LoadingState, SkeletonCard } from "@/components/ux/Skeleton";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { getApiErrorMessage } from "@/lib/axios";
import { isDemoAssessmentTitle } from "@/lib/assessmentTitle";
import { queryKeys } from "@/lib/query-keys";
import { getTenantIdFromWindow } from "@/lib/tenant";
import { getTenantTheme } from "@/lib/tenantTheme";
import { AssessmentInvitationView } from "../components/AssessmentInvitationView";
import type { ProctorSession } from "../components/AssessmentProctorGate";
import {
  commitAssessmentProctor,
  discardPendingAssessmentProctor,
  handoffAssessmentProctor,
} from "../utils/assessmentProctorHandoff";

const OPEN_ASSESSMENT = new Set(["ASSESSMENT", "HUMAN_INTERVIEW", "FAILED"]);

/** Career header is h-[76px]; cancel CareerNavigationLayout padding so this page fills one frame. */
const roomShell =
  "-mx-4 -my-6 flex h-[calc(100dvh-76px)] flex-col overflow-hidden px-4 py-3 text-[var(--color-on-surface)] sm:-mx-6 sm:-my-8 sm:px-6 sm:py-4 lg:-mx-10 lg:px-8";

export function AssessmentInvitationPage() {
  const { testId: testIdParam } = useParams();
  const [params, setParams] = useSearchParams();
  const testId = Number(testIdParam);
  const applicationId = Number(params.get("applicationId")) || 0;
  const navigate = useNavigate();
  const client = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [acceptRules, setAcceptRules] = useState(false);
  const companyName = getTenantTheme(getTenantIdFromWindow() || "acme").name;

  const applications = useQuery({
    queryKey: [...queryKeys.assessments.all(), "applications"],
    queryFn: applicantApi.mine,
  });

  const eligible = useMemo(
    () => (applications.data?.data ?? []).filter((a) => !a.archived && OPEN_ASSESSMENT.has(a.status)),
    [applications.data?.data],
  );

  const resolvedApplicationId = useMemo(() => {
    if (applicationId > 0 && eligible.some((a) => a.id === applicationId)) return applicationId;
    return eligible[0]?.id ?? 0;
  }, [applicationId, eligible]);

  const available = useQuery({
    queryKey: queryKeys.assessments.available(resolvedApplicationId),
    queryFn: () => assessmentApi.available(resolvedApplicationId),
    enabled: resolvedApplicationId > 0 && Number.isSafeInteger(testId) && testId > 0,
  });

  const application = eligible.find((a) => a.id === resolvedApplicationId) ?? null;
  const test = available.data?.find((item) => item.id === testId) ?? null;
  const allowRetake = !!test && isDemoAssessmentTitle(test.title);

  const start = useMutation({
    mutationFn: () => assessmentApi.start(testId, resolvedApplicationId),
    onSuccess: (result) => {
      commitAssessmentProctor(result.id);
      client.setQueryData(queryKeys.assessments.submission(result.id), result);
      void client.invalidateQueries({ queryKey: queryKeys.assessments.available(result.applicationId) });
      navigate(`/assessments/${result.id}/take`, { replace: true });
    },
  });

  const onProctorReady = async (session: ProctorSession) => {
    handoffAssessmentProctor(session);
    // Continue an open attempt: reuse submission, only re-bind proctor from this page.
    if (test?.submissionStatus === "IN_PROGRESS" && test.submissionId) {
      commitAssessmentProctor(test.submissionId);
      navigate(`/assessments/${test.submissionId}/take`, { replace: true });
      return;
    }
    try {
      await start.mutateAsync();
    } catch (error) {
      discardPendingAssessmentProctor();
      throw error;
    }
  };

  const onContinue = () => {
    if (!test?.submissionId) return;
    // Results only — never enter /take for an active attempt without device check here.
    navigate(`/assessments/${test.submissionId}/take`);
  };

  const back = `/assessments${applicationId > 0 ? `?applicationId=${applicationId}` : ""}`;

  if (!Number.isSafeInteger(testId) || testId <= 0) {
    return <p role="alert">Mã bài kiểm tra không hợp lệ.</p>;
  }

  return (
    <section className={roomShell}>
      <div className="flex shrink-0 items-center justify-between gap-3 pb-2">
        <Link className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--color-primary)] hover:underline" to={back}>
          <ArrowLeft className="size-4" aria-hidden="true" />
          Bài đánh giá
        </Link>
        {(applications.isError || available.isError || start.isError) && (
          <p role="alert" className="truncate text-sm text-[var(--color-status-danger)]">
            {getApiErrorMessage(applications.error ?? available.error ?? start.error)}
          </p>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-hidden">
        {(applications.isError || available.isError) && (
          <Panel>
            <Button
              variant="secondary"
              onClick={() => {
                void applications.refetch();
                void available.refetch();
              }}
            >
              <RefreshCw className="size-4" aria-hidden="true" />
              Thử lại
            </Button>
          </Panel>
        )}

        {(applications.isPending || (resolvedApplicationId > 0 && available.isPending)) && (
          <LoadingState className="h-full" label="Đang tải lời mời bài đánh giá">
            <SkeletonCard className="h-full min-h-0" />
          </LoadingState>
        )}

        {!applications.isPending && eligible.length === 0 && (
          <Panel>
            <p className="font-semibold">Không có đơn đang ở vòng đánh giá</p>
            <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
              Lời mời chỉ mở khi hồ sơ đang ở giai đoạn Assessment.
            </p>
          </Panel>
        )}

        {!available.isPending && resolvedApplicationId > 0 && !test && (
          <Panel>
            <p className="font-semibold">Không tìm thấy lời mời bài này</p>
            <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
              Bài #{testId} không thuộc đơn đang chọn hoặc chưa được gửi tới bạn.
            </p>
          </Panel>
        )}

        {application && test && (
          <AssessmentInvitationView
            application={application}
            test={test}
            user={user ?? null}
            companyName={companyName}
            acceptRules={acceptRules}
            onAcceptRulesChange={setAcceptRules}
            starting={start.isPending}
            allowRetake={allowRetake}
            onContinue={onContinue}
            onProctorReady={onProctorReady}
            applications={eligible}
            onSelectApplication={(id) => {
              setAcceptRules(false);
              setParams(id > 0 ? { applicationId: String(id) } : {});
            }}
          />
        )}
      </div>
    </section>
  );
}

function Panel({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-[var(--color-border-default)] bg-white p-6">
      <div className="max-w-md text-center">{children}</div>
    </div>
  );
}
