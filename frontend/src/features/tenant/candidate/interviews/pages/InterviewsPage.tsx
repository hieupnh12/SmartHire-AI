import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { applicantApi } from "@/api/tenant/applicantApi";
import { queryKeys } from "@/lib/query-keys";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { button, labels, muted, panel } from "@/features/tenant/recruiter/matching/components/rankingUi";

export function InterviewsPage() {
  const token = useAuthStore((s) => s.accessToken);
  const mine = useQuery({ queryKey: queryKeys.applicants.mine, queryFn: applicantApi.mine, enabled: !!token });
  const ready = (mine.data?.data ?? []).filter((row) =>
    ["INTERVIEW", "ASSESSMENT", "OFFER", "HIRED"].includes(row.status),
  );
  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Phỏng vấn AI</h1>
        <p className={`mt-2 max-w-2xl ${muted}`}>
          Vòng này mở sau khi CV đạt sàng lọc. Module phỏng vấn AI chưa triển khai xong; khi xong bạn sẽ làm bài tại đây.
        </p>
      </header>
      <div className={panel}>
        {mine.isPending && <p>Đang tải…</p>}
        {ready.length === 0 && mine.isSuccess && (
          <p className={muted}>Chưa có job nào qua vòng sàng lọc CV. Theo dõi đơn ở Đơn của tôi.</p>
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
