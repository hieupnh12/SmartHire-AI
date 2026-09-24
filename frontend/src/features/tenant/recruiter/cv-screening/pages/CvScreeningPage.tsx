import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { cvApi } from "@/api/tenant/cvApi";
import { jobApi } from "@/api/tenant/jobApi";
import { getApiErrorMessage } from "@/lib/axios";
import { queryKeys } from "@/lib/query-keys";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { button, input, muted, panel } from "@/features/tenant/recruiter/matching/components/rankingUi";
import { CvFilePreview } from "@/components/shared/CvFilePreview";
import { ScreeningBreakdown } from "@/features/tenant/recruiter/cv-screening/components/ScreeningBreakdown";
import type { CvDetail, MatchBreakdown } from "@/api/types/cv";

const chip = "rounded-full px-2.5 py-0.5 text-xs font-medium";
const jobOptionsKey = ["screening-jobs"] as const;

export function CvScreeningPage() {
  const token = useAuthStore((s) => s.accessToken);
  const client = useQueryClient();
  const [jobId, setJobId] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const jobs = useQuery({ queryKey: jobOptionsKey, queryFn: jobApi.options, enabled: !!token });
  const list = useQuery({
    queryKey: queryKeys.cvs.byJob(jobId ?? 0),
    queryFn: () => cvApi.listByJob(jobId!),
    enabled: jobId !== null && !!token,
    refetchInterval: 5_000,
  });
  const detail = useQuery({
    queryKey: queryKeys.cvs.detail(selectedId ?? 0),
    queryFn: () => cvApi.get(selectedId!),
    enabled: selectedId !== null,
    refetchInterval: 4_000,
  });
  const skills = useQuery({ queryKey: ["job-skills", jobId], queryFn: () => jobApi.skills(jobId!), enabled: jobId !== null });
  const retryParse = useMutation({
    mutationFn: (cvId: number) => cvApi.parse(cvId),
    onSuccess: (response, cvId) => {
      client.setQueryData(queryKeys.cvs.detail(cvId), response);
      void list.refetch();
      void detail.refetch();
    },
  });
  const remove = useMutation({
    mutationFn: (cvId: number) => cvApi.remove(cvId),
    onSuccess: (_response, cvId) => {
      setSelectedId(null);
      client.removeQueries({ queryKey: queryKeys.cvs.detail(cvId) });
      void list.refetch();
    },
  });
  const rows = list.data?.data ?? [];
  const cv = detail.data?.data;
  const breakdown = cv?.match?.breakdown;
  const jobList = jobs.data?.data ?? [];
  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header>
        <p className={muted}>Tuyển dụng / Sàng lọc CV</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">CV Screening</h1>
        <p className={`mt-2 max-w-2xl ${muted}`}>
          Hybrid screening: taxonomy + Jaccard + Gemini semantic. Điểm ≥ 60 và không thiếu skill bắt buộc → đạt chuẩn CV, chuyển phỏng vấn AI. Recruiter quyết định vòng Human-to-Human sau các vòng đánh giá.
        </p>
      </header>
      <div className={panel}>
        <label className="block max-w-xl space-y-2">
          <span className="text-sm font-semibold">Vị trí tuyển dụng</span>
          <select className={input} value={jobId ?? ""} onChange={(e) => { setJobId(e.target.value ? Number(e.target.value) : null); setSelectedId(null); }}>
            <option value="">Chọn Job</option>
            {jobList.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}
          </select>
        </label>
        {jobs.isPending && token && <p className={`mt-3 ${muted}`}>Đang tải danh sách job…</p>}
        {jobs.isError && <p role="alert" className="mt-3">{getApiErrorMessage(jobs.error)}</p>}
        {jobs.isSuccess && jobList.length === 0 && (
          <p className={`mt-3 ${muted}`}>Chưa có job. Tạo tin tuyển ở trang Quản lý job; ứng viên apply rồi nộp CV mới hiện ở đây.</p>
        )}
      </div>
      {jobId && skills.data?.data && skills.data.data.length > 0 && (
        <div className={panel}>
          <p className="mb-2 text-sm font-semibold">Yêu cầu kỹ năng của job</p>
          <div className="flex flex-wrap gap-2">
            {skills.data.data.map((skill) => (
              <span key={skill.skillId} className={`${chip} bg-[var(--color-surface-container-low)]`}>
                {skill.name}{skill.required ? " · bắt buộc" : ""}
              </span>
            ))}
          </div>
        </div>
      )}
      {jobId && (
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,32rem)]">
          <div className={`${panel} overflow-x-auto`}>
            {list.isPending && <p>Đang tải CV…</p>}
            {list.isError && <p role="alert">{getApiErrorMessage(list.error)}</p>}
            {rows.length === 0 && list.isSuccess && (
              <p className={muted}>Chưa có CV cho job này. Recruiter không tải CV hộ — chỉ CV ứng viên apply mới hiện.</p>
            )}
            {rows.length > 0 && (
              <table className="w-full text-left text-sm">
                <thead><tr className={muted}><th className="py-2">Ứng viên</th><th>File</th><th>Trạng thái</th><th>Điểm sàng lọc</th></tr></thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.id} className={`cursor-pointer border-t border-[var(--color-border-default)] ${selectedId === row.id ? "bg-[var(--color-surface-container-low)]" : ""}`}
                      onClick={() => setSelectedId(row.id)}>
                      <td className="py-2 font-medium">{row.candidateName}</td>
                      <td>{row.originalFilename}</td>
                      <td>{row.status}</td>
                      <td className="font-mono">{row.matchScore ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <aside className={panel}>
            {!cv && <p className={muted}>Chọn một CV để xem file và đánh giá theo JD.</p>}
            {cv && <CvDetailPanel
              cv={cv}
              breakdown={breakdown}
              onRetry={() => retryParse.mutate(cv.id)}
              retryPending={retryParse.isPending}
              onDelete={() => {
                if (window.confirm("Xóa CV này khỏi job? Không thể hoàn tác.")) remove.mutate(cv.id);
              }}
              deletePending={remove.isPending}
            />}
            {retryParse.isError && <p role="alert" className="mt-3">{getApiErrorMessage(retryParse.error)}</p>}
            {remove.isError && <p role="alert" className="mt-3">{getApiErrorMessage(remove.error)}</p>}
          </aside>
        </div>
      )}
    </section>
  );
}

function CvDetailPanel({ cv, breakdown, onRetry, retryPending, onDelete, deletePending }: {
  cv: CvDetail;
  breakdown: MatchBreakdown | null | undefined;
  onRetry: () => void;
  retryPending: boolean;
  onDelete: () => void;
  deletePending: boolean;
}) {
  const chips = useMemo(() => cv.skills, [cv.skills]);
  const stuck = cv.status === "UPLOADED" || cv.status === "FAILED";
  const analyzed = cv.status === "ANALYZED";
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{cv.candidateName}</h2>
        <p className={muted}>{cv.originalFilename} · {cv.status}{cv.errorMessage ? ` · ${cv.errorMessage}` : ""}</p>
        <p className={muted}>Model: {cv.extractionModel ?? "chưa phân tích"}{cv.match?.modelVersion ? ` · điểm ${cv.match.modelVersion}` : ""}</p>
      </div>
      <CvFilePreview cvId={cv.id} mimeType={cv.mimeType} filename={cv.originalFilename} />
      <div className="flex flex-wrap gap-2">
        {(stuck || analyzed) && (
          <button className={button} disabled={retryPending || deletePending} onClick={onRetry}>
            {retryPending ? "Đang phân tích…" : analyzed ? "Phân tích lại bằng AI" : "Phân tích CV"}
          </button>
        )}
        <button className={button} disabled={deletePending} onClick={onDelete}>
          {deletePending ? "Đang xóa…" : "Xóa CV"}
        </button>
      </div>
      {cv.match && (
        <ScreeningBreakdown score={cv.match.score} modelVersion={cv.match.modelVersion} breakdown={breakdown} />
      )}
      {cv.analysis?.yearsExperience != null && (
        <p className={muted}>{cv.analysis.yearsExperience} năm kinh nghiệm (trích từ CV)</p>
      )}
      <div className="flex flex-wrap gap-2">
        {chips.map((skill) => <span key={skill.canonicalName} className={`${chip} bg-[var(--color-primary-container)] text-[var(--color-on-primary)]`}>{skill.skillName}</span>)}
      </div>
    </div>
  );
}

