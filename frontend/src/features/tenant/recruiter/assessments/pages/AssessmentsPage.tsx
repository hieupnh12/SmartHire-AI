import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, ClipboardList, Plus } from "lucide-react";
import { assessmentApi } from "@/api/tenant/assessmentApi";
import { jobApi } from "@/api/tenant/jobApi";
import { queryKeys } from "@/lib/query-keys";
import { Button } from "@/components/ux/Button";
import { AssessmentError, assessmentLink, assessmentMuted as muted, assessmentStatus } from "@/components/ux/assessmentUi";

export function AssessmentsPage() {
  const { id } = useParams<{ id: string }>();
  const jobId = Number(id);
  const [page, setPage] = useState(0);
  const tests = useQuery({ queryKey: queryKeys.assessments.list(page), queryFn: () => assessmentApi.list(page) });
  const jobs = useQuery({ queryKey: [...queryKeys.assessments.all(), "jobs"], queryFn: jobApi.options });
  const scopedTests = tests.data?.items.filter((test) => test.jobId === jobId) ?? [];
  return <section className="space-y-6 text-[var(--color-on-surface)]">
    <header className="flex flex-wrap items-center justify-between gap-3"><div><p className={muted}>Tuyển dụng / Đánh giá kỹ thuật</p><h1 className="mt-1 text-2xl font-semibold">Đề kiểm tra</h1></div><Link to="new" className={assessmentLink}><Plus className="size-4" aria-hidden="true" />Tạo đề mới</Link></header>
    <AssessmentError error={tests.error} retry={() => void tests.refetch()} />
    {tests.isPending && <p role="status">Đang tải đề kiểm tra…</p>}
    {tests.data && <>
      <div className="overflow-x-auto border-y border-[var(--color-outline-variant)]"><table className="w-full min-w-[600px] text-left text-sm">
        <thead className="bg-[var(--color-surface-container-low)]"><tr>{["Tên đề", "Vị trí", "Trạng thái", "Thời lượng", "Điểm đạt"].map(label => <th key={label} className="px-3 py-3 font-medium">{label}</th>)}</tr></thead>
        <tbody>{scopedTests.map(test => <tr key={test.id} className="border-t border-[var(--color-border-default)] hover:bg-[var(--color-surface-container-low)]">
          <td className="max-w-sm px-3 py-4"><Link className="font-semibold text-[var(--color-primary)] hover:underline break-words" to={String(test.id)}>{test.title}</Link><p className={muted}>#{test.id}</p></td>
          <td className="px-3 py-4">{jobs.data?.data.find(job => job.id === test.jobId)?.title ?? `Job #${test.jobId}`}</td>
          <td className="px-3 py-4">{assessmentStatus[test.status]}</td><td className="px-3 py-4">{test.durationMinutes} phút</td><td className="px-3 py-4">{test.passingScore ?? "Không đặt"}</td>
        </tr>)}</tbody>
      </table></div>
      {!scopedTests.length && <div className="flex items-center gap-3 py-8"><ClipboardList className="size-8 text-[var(--color-primary)]" aria-hidden="true" /><p>Chưa có đề kiểm tra cho công việc này.</p></div>}
      <div className="flex flex-wrap items-center justify-between gap-3"><p className={muted}>{tests.data.total} đề · Trang {page + 1}</p><div className="flex gap-2">
        <Button variant="secondary" disabled={page === 0} aria-label="Trang trước" title="Trang trước" onClick={() => setPage(p => p - 1)}><ArrowLeft className="size-4" aria-hidden="true" /></Button>
        <Button variant="secondary" disabled={(page + 1) * 20 >= tests.data.total} aria-label="Trang sau" title="Trang sau" onClick={() => setPage(p => p + 1)}><ArrowRight className="size-4" aria-hidden="true" /></Button>
      </div></div>
    </>}
  </section>;
}
