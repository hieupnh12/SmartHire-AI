import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { applicantApi } from "@/api/tenant/applicantApi";
import { assessmentApi } from "@/api/tenant/assessmentApi";
import { AssessmentError, assessmentMuted as muted } from "@/components/ux/assessmentUi";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { getTenantIdFromWindow } from "@/lib/tenant";
import { getTenantTheme } from "@/lib/tenantTheme";
import { queryKeys } from "@/lib/query-keys";
import { AssessmentInvitationView } from "../components/AssessmentInvitationView";

export function AssessmentsPage() {
  const navigate = useNavigate();
  const client = useQueryClient();
  const [params, setParams] = useSearchParams();
  const [acceptRules, setAcceptRules] = useState(true);
  const [selectedTestId, setSelectedTestId] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const authUser = useAuthStore((s) => s.user);
  const companyName = getTenantTheme(getTenantIdFromWindow() ?? "acme").name;

  const applications = useQuery({
    queryKey: [...queryKeys.assessments.all(), "applications"],
    queryFn: applicantApi.mine,
  });
  const eligible = (applications.data?.data ?? []).filter(
    (a) => !a.archived && ["ASSESSMENT", "INTERVIEW"].includes(a.status),
  );
  const requested = Number(params.get("applicationId"));
  const application = eligible.find((a) => a.id === requested) ?? eligible[0] ?? null;
  const applicationId = application?.id ?? 0;

  const tests = useQuery({
    queryKey: queryKeys.assessments.available(applicationId),
    queryFn: () => assessmentApi.available(applicationId),
    enabled: applicationId > 0,
  });
  const activeTest =
    tests.data?.find((t) => t.id === selectedTestId) ?? tests.data?.[0] ?? null;

  const start = useMutation({
    mutationFn: (testId: number) => assessmentApi.start(testId, applicationId),
    onSuccess: (result) => {
      client.setQueryData(queryKeys.assessments.submission(result.id), result);
      navigate(`/candidate/assessments/${result.id}/take`);
    },
  });

  const flash = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2800);
  };

  const openOrStart = () => {
    if (!activeTest || !application) return;
    if (activeTest.submissionId && activeTest.submissionStatus && activeTest.submissionStatus !== "NOT_STARTED") {
      navigate(`/candidate/assessments/${activeTest.submissionId}/take`);
      return;
    }
    if (!acceptRules) {
      flash("Vui lòng xác nhận quy chế giám sát trước khi bắt đầu.");
      return;
    }
    if (
      !window.confirm(
        `Bắt đầu "${activeTest.title}"? Thời gian làm bài là ${activeTest.durationMinutes} phút và tiếp tục chạy khi rời trang.`,
      )
    ) {
      return;
    }
    start.mutate(activeTest.id);
  };

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      {toast && (
        <p
          className="rounded-xl bg-[var(--color-primary-subtle)] px-4 py-2 text-sm text-[var(--color-primary-hover)]"
          role="status"
        >
          {toast}
        </p>
      )}

      <AssessmentError error={applications.error} retry={() => void applications.refetch()} />
      <AssessmentError error={tests.error} retry={() => void tests.refetch()} />
      <AssessmentError error={start.error} />

      {applications.isPending && <p role="status">Đang tải đơn ứng tuyển…</p>}

      {applications.isSuccess && !eligible.length && (
        <div className="flex items-center gap-3 border-y border-[var(--color-border-default)] py-8">
          <ClipboardCheck className="size-8 text-[var(--color-primary)]" aria-hidden="true" />
          <div>
            <p className="font-semibold">Chưa có lời mời bài kiểm tra</p>
            <p className={muted}>Đơn ứng tuyển cần ở vòng Assessment hoặc Interview mới hiện tại đây.</p>
          </div>
        </div>
      )}

      {application && !!tests.data?.length && activeTest && (
        <>
          {tests.data.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {tests.data.map((test) => (
                <button
                  key={test.id}
                  type="button"
                  className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                    test.id === activeTest.id
                      ? "bg-[var(--color-primary)] text-[var(--color-on-primary,#fff)]"
                      : "bg-[var(--color-surface-container-low)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)]"
                  }`}
                  onClick={() => {
                    setSelectedTestId(test.id);
                    setAcceptRules(true);
                    start.reset();
                  }}
                >
                  {test.title}
                </button>
              ))}
            </div>
          )}

          <AssessmentInvitationView
            application={application}
            test={activeTest}
            user={authUser}
            companyName={companyName}
            acceptRules={acceptRules}
            onAcceptRulesChange={setAcceptRules}
            starting={start.isPending}
            onStart={openOrStart}
            applications={eligible}
            onSelectApplication={(id) => {
              setParams({ applicationId: String(id) });
              setSelectedTestId(null);
              setAcceptRules(true);
              start.reset();
            }}
          />
        </>
      )}

      {application && tests.isPending && <p role="status">Đang tải bài kiểm tra…</p>}
      {application && tests.isSuccess && tests.data.length === 0 && (
        <p className={muted}>Chưa có đề được xuất bản cho vị trí này.</p>
      )}
    </section>
  );
}
