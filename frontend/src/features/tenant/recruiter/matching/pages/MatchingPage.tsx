import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { matchingApi } from "@/api/tenant/matchingApi";
import { getApiErrorMessage } from "@/lib/axios";
import { getTenantIdFromWindow } from "@/lib/tenant";
import { RankingConfigForm } from "../components/RankingConfigForm";
import { RankingDetail } from "../components/RankingDetail";
import { button, input, labels, muted, panel, scoreText } from "../components/rankingUi";
import { useRankingStore } from "../stores/useRankingStore";
import type { RankingBoard, RankingRow } from "../types/ranking";
import type { ApiResponse } from "@/types/api";

const terminal = new Set(["REJECTED", "WITHDRAWN", "HIRED"]);
const pageSize = 20;
const componentScore = (row: RankingRow, key: string) => row.result.components.find((c) => c.key === key)?.score ?? null;
export function MatchingPage() {
  const state = useRankingStore();
  const token = useAuthStore((s) => s.accessToken);
  // Keep cached applicant data isolated across login sessions without using tokens as cache keys.
  const sessionKey = useMemo(() => crypto.randomUUID(), [token]);
  const tenantKey = `${getTenantIdFromWindow() ?? ""}:${sessionKey}`;
  const client = useQueryClient();
  const jobs = useQuery({ queryKey: ["ranking-jobs", tenantKey], queryFn: matchingApi.jobs, enabled: !!token });
  const jobId = state.jobId;
  const query = useQuery({ queryKey: ["rankings", tenantKey, jobId], queryFn: () => matchingApi.rankings(jobId!), enabled: jobId !== null && !!token,
    refetchInterval: 30_000, refetchOnWindowFocus: true });
  const board = query.data?.data;
  const categories = board?.skillCategories ?? [];
  const groupMismatch = board && categories.length > 0 && [...Object.keys(board.config.groups)].sort().join("|") !== [...categories].sort().join("|");
  const formConfig = board && groupMismatch ? { ...board.config, groups: Object.fromEntries(categories.map((category, index) =>
    [category, Math.floor(100 / categories.length) + (index < 100 % categories.length ? 1 : 0)])) } : board?.config;
  const saved = (value: RankingBoard) => client.setQueryData<ApiResponse<RankingBoard>>(["rankings", tenantKey, value.jobId], { success: true, message: "OK", data: value });
  const recompute = useMutation({ mutationFn: (id: number) => matchingApi.recompute(id), onSuccess: (response) => saved(response.data) });
  const cohorts = [...new Set(board?.rows.map((row) => row.result.cohort).filter(Boolean) ?? [])];
  const filtered = (board?.rows ?? []).filter((row) =>
    (state.cohort === "ALL" || (state.cohort === "COMPLETE" ? row.result.complete : row.result.cohort === state.cohort)) &&
    (state.status === "ALL" || (state.status === "ACTIVE" ? !terminal.has(row.status) : row.status === state.status)) &&
    row.candidateName.toLocaleLowerCase().includes(state.search.toLocaleLowerCase()) &&
    (state.minimum === "" || (row.result.score !== null && row.result.score >= Number(state.minimum))))
    .sort((a, b) => {
      const left = state.sort === "score" ? a.result.score : componentScore(a, state.sort);
      const right = state.sort === "score" ? b.result.score : componentScore(b, state.sort);
      return (right ?? -1) - (left ?? -1) || a.applicationId - b.applicationId;
    });
  const page = Math.min(state.page, Math.max(0, Math.ceil(filtered.length / pageSize) - 1));
  const selected = board?.rows.find((row) => row.applicationId === state.selectedId);
  return <section className="space-y-6 text-[var(--color-on-surface)]">
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div><p className={muted}>Tuyển dụng / Đánh giá ứng viên</p><h1 className="mt-1 text-3xl font-semibold tracking-tight">Bảng xếp hạng ứng viên</h1>
        <p className={`mt-2 max-w-2xl ${muted}`}>Đối chiếu kỹ năng và kinh nghiệm với Job, kết hợp assessment và AI interview để hỗ trợ quyết định tuyển dụng.</p></div>
      <button className={button} disabled={!jobId || recompute.isPending} onClick={() => jobId && recompute.mutate(jobId)}>{recompute.isPending ? "Đang tính lại…" : "Cập nhật xếp hạng"}</button>
    </header>
    {!token && <p role="status" className={panel}>Đăng nhập bằng tài khoản Recruiter để xem bảng xếp hạng.</p>}
    <div className={panel}><label className="block max-w-xl space-y-2"><span className="text-sm font-semibold">Vị trí tuyển dụng</span>
      <select className={input} value={jobId ?? ""} onChange={(e) => state.setJob(e.target.value ? Number(e.target.value) : null)} disabled={jobs.isPending}>
        <option value="">Chọn Job để xem xếp hạng</option>{jobs.data?.data.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}
      </select></label>
      {jobs.isPending && token && <p role="status" className="mt-3">Đang tải Job…</p>}
      {jobs.isError && <p role="alert" className="mt-3">{getApiErrorMessage(jobs.error)} <button className={button} onClick={() => void jobs.refetch()}>Thử lại</button></p>}
      {jobs.isSuccess && jobs.data.data.length === 0 && <p className={`mt-3 ${muted}`}>Bạn chưa có Job được giao quyền quản lý.</p>}
    </div>
    {!jobId && <div className={`${panel} py-12 text-center`}>Chọn một Job để xem ứng viên, cấu hình trọng số và phân tích điểm.</div>}
    {jobId && token && query.isPending && <div className={panel} role="status">Đang tải và tính điểm ứng viên…</div>}
    {jobId && query.isError && <div className={panel} role="alert">{getApiErrorMessage(query.error)} <button className={button} onClick={() => void query.refetch()}>Thử lại</button></div>}
    {recompute.isError && <p role="alert">{getApiErrorMessage(recompute.error)}</p>}
    {board && <>
      <div className="grid gap-4 sm:grid-cols-3">
        {[{ label: "Tổng ứng viên", value: board.rows.length }, { label: "Đủ kết quả", value: board.rows.filter((r) => r.result.complete).length },
          { label: "Chờ bổ sung đánh giá", value: board.rows.filter((r) => !r.result.complete).length }].map((stat) =>
          <div key={stat.label} className={panel}><p className={muted}>{stat.label}</p><p className="mt-2 text-3xl font-semibold">{stat.value}</p></div>)}
      </div>
      <details key={board.jobId} className={panel} open={board.config.revision === 0 ? true : undefined}>
        <summary className="cursor-pointer font-semibold">Cấu hình điểm và trọng số{board.config.revision === 0 ? " · Cần hoàn tất trước khi xếp hạng" : ""}</summary>
        {formConfig && <RankingConfigForm key={`${board.jobId}:${board.config.revision}:${categories.join("|")}`} jobId={board.jobId} config={formConfig} onSaved={saved} />}
      </details>
      {board.rows.some((r) => r.notices.includes("JOB_SKILLS_CHANGED")) && <p role="alert" className={panel}>Yêu cầu nhóm kỹ năng chưa có hoặc đã thay đổi. Cập nhật yêu cầu Job và cấu hình trọng số trước khi dùng điểm kỹ năng.</p>}
      <div className={panel}>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <label className="space-y-2 text-sm"><span>Tìm ứng viên</span><input className={input} value={state.search} onChange={(e) => state.filter({ search: e.target.value })} placeholder="Nhập tên ứng viên" /></label>
          <label className="space-y-2 text-sm"><span>Nhóm đánh giá</span><select className={input} value={state.cohort} onChange={(e) => state.filter({ cohort: e.target.value })}>
            <option value="ALL">Tất cả · không so hạng chung</option><option value="COMPLETE">Đủ kết quả</option>
            {cohorts.map((cohort) => <option key={cohort} value={cohort}>{cohort.split("+").map((c) => labels[c]).join(" + ")}</option>)}
          </select></label>
          <label className="space-y-2 text-sm"><span>Trạng thái</span><select className={input} value={state.status} onChange={(e) => state.filter({ status: e.target.value })}>
            <option value="ACTIVE">Đang xét tuyển</option><option value="ALL">Tất cả trạng thái</option>
            {["NEW", "IN_REVIEW", "ASSESSMENT", "INTERVIEW", "OFFER", "HIRED", "REJECTED", "WITHDRAWN"].map((s) => <option key={s} value={s}>{labels[s]}</option>)}
          </select></label>
          <label className="space-y-2 text-sm"><span>Điểm tối thiểu</span><input className={input} type="number" min={0} max={100} value={state.minimum} onChange={(e) => state.filter({ minimum: e.target.value })} /></label>
          <label className="space-y-2 text-sm"><span>Sắp xếp giảm dần</span><select className={input} value={state.sort} onChange={(e) => state.filter({ sort: e.target.value })}>
            <option value="score">Điểm rank</option>{["skills", "experience", "assessment", "interview"].map((s) => <option key={s} value={s}>{labels[s]}</option>)}
          </select></label>
        </div>
        <p className={`my-4 ${muted}`} role="status">{query.isFetching ? "Đang cập nhật…" : `Cập nhật ${new Date(board.calculatedAt).toLocaleTimeString("vi-VN")}`} · {filtered.length} ứng viên. Hạng được giữ nguyên khi lọc và phân trang.</p>
        <div className="overflow-x-auto"><table className="w-full min-w-[900px] text-left text-sm">
          <caption className="sr-only">Điểm ứng viên cho {board.jobTitle}; thứ hạng chỉ so sánh trong cùng nhóm thành phần.</caption>
          <thead className="bg-[var(--color-surface-container-low)]"><tr>{["Hạng", "Ứng viên", "Kỹ năng", "Kinh nghiệm", "Assessment", "AI Interview", "Điểm rank", "Tiến độ"].map((title) => <th key={title} scope="col" className="px-3 py-3 font-semibold">{title}</th>)}</tr></thead>
          <tbody>{filtered.slice(page * pageSize, (page + 1) * pageSize).map((row) => <tr key={row.applicationId} className="hover:bg-[var(--container-blue)]">
            <td className="px-3 py-4">{state.cohort === "ALL" ? "—" : row.rank ?? "—"}</td>
            <td className="px-3 py-4"><button onClick={() => state.select(row.applicationId)} className="text-left font-semibold underline decoration-[var(--color-outline-variant)] underline-offset-4">{row.candidateName}</button>
              <p className={muted}>{labels[row.status] ?? row.status}</p>{row.missingRequired.length > 0 && <p className="mt-1 text-xs">Thiếu {row.missingRequired.length} kỹ năng bắt buộc</p>}</td>
            {row.result.components.map((part) => <td key={part.key} className="px-3 py-4 tabular-nums">{scoreText(part.score)}{part.score === null && <span className={`block ${muted}`}>{labels[part.state] ?? part.state}</span>}</td>)}
            <td className="px-3 py-4 tabular-nums"><strong>{scoreText(row.result.score)}</strong>{!row.result.complete && <span className={`block ${muted}`}>Tạm tính</span>}</td>
            <td className="px-3 py-4"><span>{row.result.completedComponents}/{row.result.requiredComponents} thành phần</span><span className={`block ${muted}`}>{row.result.availableWeight}% trọng số</span></td>
          </tr>)}</tbody>
        </table></div>
        {filtered.length === 0 && <p className="py-12 text-center">{board.rows.length === 0 ? "Job chưa có ứng viên." : "Không có ứng viên phù hợp bộ lọc."}</p>}
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><p className={muted}>Trang {page + 1}/{Math.max(1, Math.ceil(filtered.length / pageSize))} · {pageSize} ứng viên/trang</p>
          <div className="flex gap-2"><button className={button} disabled={page === 0} onClick={() => state.setPage(page - 1)}>Trước</button>
            <button className={button} disabled={(page + 1) * pageSize >= filtered.length} onClick={() => state.setPage(page + 1)}>Sau</button></div></div>
      </div>
      {selected && <RankingDetail key={`${tenantKey}:${selected.applicationId}`} row={selected} tenantKey={tenantKey} onClose={() => state.select(null)} onSaved={saved} />}
    </>}
  </section>;
}
