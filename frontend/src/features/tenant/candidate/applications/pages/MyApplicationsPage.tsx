import { useMutation, useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { applicantApi } from "@/api/tenant/applicantApi";
import { getApiErrorMessage } from "@/lib/axios";
import { queryKeys } from "@/lib/query-keys";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { button, labels, muted, panel } from "@/features/tenant/recruiter/matching/components/rankingUi";
import { ApplicationPipeline } from "@/features/tenant/recruiter/matching/components/recruitmentFlow";

export function MyApplicationsPage() {
  const token = useAuthStore((s) => s.accessToken);
  const mine = useQuery({ queryKey: queryKeys.applicants.mine, queryFn: applicantApi.mine, enabled: !!token });
  const withdraw = useMutation({
    mutationFn: (id: number) => applicantApi.withdraw(id),
    onSuccess: () => void mine.refetch(),
  });
  const rows = mine.data?.data ?? [];
  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Đơn của tôi</h1>
        <p className={`mt-2 max-w-2xl ${muted}`}>Công việc đã apply, vòng hiện tại, và rút đơn. Đơn đã rút không còn hiện ở đây.</p>
      </header>
      {mine.isPending && <p>Đang tải…</p>}
      {mine.isError && <p role="alert">{getApiErrorMessage(mine.error)}</p>}
      {withdraw.isError && <p role="alert">{getApiErrorMessage(withdraw.error)}</p>}
      {rows.length === 0 && mine.isSuccess && <p className={muted}>Bạn chưa apply job nào.</p>}
      <ul className="space-y-4">
        {rows.map((row) => (
          <li key={row.id} className={`${panel} space-y-4`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-lg font-semibold">{row.jobTitle}</p>
                <p className={muted}>
                  {[row.jobDepartment, row.jobLocation, row.jobWorkMode, row.jobEmploymentType].filter(Boolean).join(" · ") || "Chi tiết công việc"}
                </p>
                <p className={`mt-1 ${muted}`}>
                  {labels[row.status] ?? row.status} · Apply {new Date(row.createdAt).toLocaleString("vi-VN")}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Link className={button} to={`/candidate/jobs/${row.jobId}`}>Xem việc</Link>
                {row.status !== "HIRED" && (
                  <button className={button} type="button" disabled={withdraw.isPending} onClick={() => {
                    if (window.confirm("Rút đơn ứng tuyển này? Đơn sẽ biến mất khỏi danh sách.")) withdraw.mutate(row.id);
                  }}>Rút đơn</button>
                )}
              </div>
            </div>
            <ApplicationPipeline status={row.status} />
          </li>
        ))}
      </ul>
    </section>
  );
}
