import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { applicantApi } from "@/api/tenant/applicantApi";
import { cvApi } from "@/api/tenant/cvApi";
import { EmptyState } from "@/components/ux/EmptyState";
import { StatusPill } from "@/components/ux/StatusPill";
import { Button } from "@/components/ux/Button";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { CandidateWelcomePanel } from "@/features/tenant/candidate/dashboard/components/CandidateWelcomePanel";
import { applicationStatusLabels } from "@/features/tenant/candidate/applications/constants/applicationStatus";
import { button, muted, panel, primary } from "@/features/tenant/recruiter/matching/components/rankingUi";
import { getApiErrorMessage } from "@/lib/axios";
import { queryKeys } from "@/lib/query-keys";

export function HomePage() {
  const navigate = useNavigate();
  const token = useAuthStore((state) => state.accessToken);
  const user = useAuthStore((state) => state.user);
  const applicationsQuery = useQuery({
    queryKey: queryKeys.applicants.mine,
    queryFn: applicantApi.mine,
    enabled: Boolean(token),
  });
  const cvsQuery = useQuery({
    queryKey: queryKeys.cvs.mine,
    queryFn: cvApi.mine,
    enabled: Boolean(token),
  });
  const applications = applicationsQuery.data?.data ?? [];
  const cvs = cvsQuery.data?.data ?? [];

  if (!token) {
    return <EmptyState title="Đăng nhập để xem workspace" description="Đăng nhập để theo dõi đơn ứng tuyển và CV của bạn." />;
  }

  return (
    <section className="candidate-dashboard space-y-6" aria-labelledby="candidate-dashboard-title">
      <CandidateWelcomePanel candidateName={user?.fullName} />
      <div className="grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(18rem,1fr)]">
        <section className={`${panel} min-w-0`} aria-labelledby="recent-applications-title">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="recent-applications-title" className="text-lg font-semibold">Đơn ứng tuyển gần đây</h2>
              <p className={`mt-1 ${muted}`}>{applications.length} đơn đang hiển thị từ hồ sơ của bạn</p>
            </div>
            <Link className={button} to="/candidate/applications">Tất cả đơn</Link>
          </div>

          {applicationsQuery.isPending && <p className="mt-5" role="status">Đang tải đơn ứng tuyển…</p>}
          {applicationsQuery.isError && (
            <div className="mt-5 space-y-3" role="alert">
              <p>{getApiErrorMessage(applicationsQuery.error)}</p>
              <Button variant="secondary" onClick={() => void applicationsQuery.refetch()}>Thử lại</Button>
            </div>
          )}
          {applicationsQuery.isSuccess && applications.length === 0 && (
            <EmptyState
              className="mt-5 border-0 bg-[var(--color-surface-alt)] py-10"
              title="Chưa có đơn ứng tuyển"
              description="Khi bạn ứng tuyển công việc, trạng thái và các vòng tuyển dụng sẽ xuất hiện tại đây."
              actionLabel="Tìm việc"
              onAction={() => navigate("/candidate/jobs")}
            />
          )}
          <ul className="mt-4 divide-y divide-[var(--color-border-default)]">
            {applications.slice(0, 4).map((application) => (
              <li key={application.id} className="flex min-w-0 flex-wrap items-center justify-between gap-3 py-4 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <Link className="break-words font-semibold text-[var(--color-on-surface)] hover:text-brand-primary" to={`/candidate/applications/${application.id}`}>
                    {application.jobTitle}
                  </Link>
                  <p className={`mt-1 ${muted}`}>{new Date(application.createdAt).toLocaleDateString("vi-VN")}</p>
                </div>
                <StatusPill status={application.status} label={applicationStatusLabels[application.status]} />
              </li>
            ))}
          </ul>
        </section>

        <aside className="space-y-5">
          <section className={`${panel} space-y-4`} aria-labelledby="candidate-cv-title">
            <div className="flex items-center justify-between gap-3">
              <h2 id="candidate-cv-title" className="text-lg font-semibold">CV của tôi</h2>
              <span className="text-sm font-medium text-[var(--color-on-surface-variant)]">
                {cvsQuery.isSuccess ? cvs.length : "—"}
              </span>
            </div>
            {cvsQuery.isPending && <p className={muted} role="status">Đang tải CV…</p>}
            {cvsQuery.isError && (
              <div className="space-y-2" role="alert">
                <p className={muted}>{getApiErrorMessage(cvsQuery.error)}</p>
                <Button variant="secondary" onClick={() => void cvsQuery.refetch()}>Thử lại</Button>
              </div>
            )}
            {cvsQuery.isSuccess && cvs.length === 0 && <p className={muted}>Bạn chưa tải CV lên.</p>}
            {cvs.slice(0, 2).map((cv) => (
              <p key={cv.id} className="break-all text-sm">{cv.originalFilename}</p>
            ))}
            <Link className={primary} to="/candidate/cv">Quản lý CV</Link>
          </section>

          <section className={`${panel} space-y-3`} aria-labelledby="job-discovery-title">
            <h2 id="job-discovery-title" className="text-lg font-semibold">Tìm cơ hội tiếp theo</h2>
            <p className={muted}>Xem các vị trí đang tuyển và trạng thái nhận hồ sơ.</p>
            <Link className={`${primary} w-full`} to="/candidate/jobs">Tìm việc</Link>
          </section>
        </aside>
      </div>
    </section>
  );
}