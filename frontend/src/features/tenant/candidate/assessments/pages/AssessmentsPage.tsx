import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { applicantApi } from "@/api/tenant/applicantApi";
import { queryKeys } from "@/lib/query-keys";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { button, labels, muted, panel } from "@/features/tenant/recruiter/matching/components/rankingUi";

export function AssessmentsPage() {
  const token = useAuthStore((s) => s.accessToken);
  const mine = useQuery({ queryKey: queryKeys.applicants.mine, queryFn: applicantApi.mine, enabled: !!token });
  const ready = (mine.data?.data ?? []).filter((row) =>
    ["ASSESSMENT", "OFFER", "HIRED"].includes(row.status),
  );
  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Technical test</h1>
        <p className={`mt-2 max-w-2xl ${muted}`}>
          Code + trắc nghiệm mở sau vòng phỏng vấn AI. Module này chưa triển khai xong.
        </p>
      </header>
      <div className={panel}>
        {mine.isPending && <p>Đang tải…</p>}
        {ready.length === 0 && mine.isSuccess && (
          <p className={muted}>Chưa có bài test. Cần hoàn thành sàng lọc CV và phỏng vấn AI trước.</p>
        )}
        <ul className="space-y-3">
          {ready.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border-default)] pb-3">
              <div>
                <p className="font-medium">{row.jobTitle}</p>
                <p className={muted}>{labels[row.status] ?? row.status}</p>
              </div>
              <Link className={button} to="/candidate/applications">Đơn của tôi</Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
