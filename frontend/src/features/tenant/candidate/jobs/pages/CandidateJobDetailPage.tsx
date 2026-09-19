import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { applicantApi } from "@/api/tenant/applicantApi";
import { cvApi } from "@/api/tenant/cvApi";
import { jobApi } from "@/api/tenant/jobApi";
import { getApiErrorMessage } from "@/lib/axios";
import { queryKeys } from "@/lib/query-keys";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { button, labels, muted, panel, primary } from "@/features/tenant/recruiter/matching/components/rankingUi";
import { ApplicationPipeline } from "@/features/tenant/recruiter/matching/components/recruitmentFlow";
import type { CvSummary } from "@/api/types/cv";

const chip = "rounded-full px-2.5 py-0.5 text-xs font-medium bg-[var(--color-surface-container-low)]";

export function CandidateJobDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const token = useAuthStore((s) => s.accessToken);
  const [applyOpen, setApplyOpen] = useState(false);
  const job = useQuery({
    queryKey: queryKeys.jobs.detail(id ?? 0),
    queryFn: () => jobApi.get(id!),
    enabled: Boolean(id) && !!token,
  });
  const mine = useQuery({ queryKey: queryKeys.applicants.mine, queryFn: applicantApi.mine, enabled: !!token });
  const application = (mine.data?.data ?? []).find((row) => String(row.jobId) === String(id));
  const data = job.data?.data;
  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <button className={button} type="button" onClick={() => navigate("/candidate/jobs")}>Quay lại danh sách</button>
      {job.isError && <p role="alert">{getApiErrorMessage(job.error)}</p>}
      {job.isPending && <p>Đang tải…</p>}
      {data && (
        <>
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className={muted}>{data.department || "Tuyển dụng"}</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">{data.title}</h1>
              <p className={`mt-2 ${muted}`}>{[data.location, data.workMode, data.employmentType].filter(Boolean).join(" · ") || "—"}</p>
            </div>
            {application ? (
              <div className="space-y-2 text-right">
                <p className="text-sm font-semibold text-[var(--color-primary)]">Đã apply · {labels[application.status] ?? application.status}</p>
                <Link className={button} to="/candidate/applications">Xem đơn của tôi</Link>
              </div>
            ) : data.acceptingApplications ? (
              <button className={primary} type="button" onClick={() => setApplyOpen(true)}>Apply</button>
            ) : (
              <p className={muted}>Job này hiện không nhận hồ sơ.</p>
            )}
          </header>
          <div className="grid gap-6 lg:grid-cols-3">
            <div className={`${panel} space-y-4 lg:col-span-2`}>
              <h2 className="font-semibold">Mô tả công việc</h2>
              <p className="whitespace-pre-wrap text-sm">{data.description}</p>
              {data.responsibilities && (
                <>
                  <h2 className="font-semibold">Yêu cầu / trách nhiệm</h2>
                  <p className="whitespace-pre-wrap text-sm">{data.responsibilities}</p>
                </>
              )}
              {data.benefits && (
                <>
                  <h2 className="font-semibold">Quyền lợi</h2>
                  <p className="whitespace-pre-wrap text-sm">{data.benefits}</p>
                </>
              )}
            </div>
            <aside className={`${panel} space-y-2 text-sm`}>
              <p><span className={muted}>Kinh nghiệm: </span>{data.minYearsExperience != null ? `${data.minYearsExperience}+ năm` : "—"}</p>
              <p><span className={muted}>Học vấn: </span>{data.educationLevel || "—"}</p>
              <p><span className={muted}>Hạn nộp: </span>{data.deadline || "—"}</p>
              <p><span className={muted}>Số lượng: </span>{data.headcount ?? "—"}</p>
            </aside>
          </div>
          {data.skills.length > 0 && (
            <div className={panel}>
              <h2 className="mb-3 font-semibold">Kỹ năng yêu cầu</h2>
              <div className="flex flex-wrap gap-2">
                {data.skills.map((skill) => (
                  <span key={skill.skillId} className={chip}>{skill.name}{skill.required ? " · bắt buộc" : ""}</span>
                ))}
              </div>
            </div>
          )}
          {application && (
            <div className={panel}>
              <h2 className="mb-3 font-semibold">Tiến trình ứng tuyển</h2>
              <ApplicationPipeline status={application.status} />
            </div>
          )}
          {applyOpen && id && (
            <ApplyCvModal jobId={Number(id)} jobTitle={data.title} onClose={() => setApplyOpen(false)} />
          )}
        </>
      )}
    </section>
  );
}

function ApplyCvModal({ jobId, jobTitle, onClose }: { jobId: number; jobTitle: string; onClose: () => void }) {
  const token = useAuthStore((s) => s.accessToken);
  const client = useQueryClient();
  const mine = useQuery({ queryKey: queryKeys.cvs.mine, queryFn: cvApi.mine, enabled: !!token });
  const cvs = mine.data?.data ?? [];
  const [selectedCvId, setSelectedCvId] = useState<number | null>(null);
  useEffect(() => {
    if (selectedCvId == null && cvs.length > 0) setSelectedCvId(cvs[0].id);
  }, [cvs, selectedCvId]);
  const apply = useMutation({
    mutationFn: (input: { file?: File; cvId?: number }) => submitApplication(jobId, input.file, input.cvId),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.applicants.mine });
      onClose();
    },
  });
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true" aria-labelledby="apply-title">
      <div className={`${panel} max-h-[90vh] w-full max-w-lg overflow-y-auto`}>
        <h2 id="apply-title" className="text-xl font-semibold">Nộp CV cho {jobTitle}</h2>
        <p className={`mt-2 ${muted}`}>Chọn CV đã có trên trang CV của tôi, hoặc tải file PDF/DOCX từ máy.</p>
        {mine.isPending && <p className="mt-4">Đang tải CV của bạn…</p>}
        {cvs.length > 0 && (
          <ul className="mt-4 space-y-2">
            {cvs.map((row: CvSummary) => (
              <li key={row.id}>
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-[var(--color-border-default)] px-3 py-2 text-sm">
                  <input
                    type="radio"
                    name="apply-cv"
                    checked={selectedCvId === row.id}
                    onChange={() => setSelectedCvId(row.id)}
                  />
                  <span>{row.originalFilename} · {row.status}</span>
                </label>
              </li>
            ))}
          </ul>
        )}
        {cvs.length === 0 && mine.isSuccess && (
          <p className={`mt-4 ${muted}`}>Bạn chưa có CV. Tải từ máy hoặc sang trang CV của tôi.</p>
        )}
        <div className="mt-5 flex flex-wrap gap-2">
          {cvs.length > 0 && (
            <button
              className={primary}
              type="button"
              disabled={apply.isPending || selectedCvId == null}
              onClick={() => selectedCvId != null && apply.mutate({ cvId: selectedCvId })}
            >
              {apply.isPending ? "Đang nộp…" : "Apply với CV đã chọn"}
            </button>
          )}
          <label className={`${button} ${apply.isPending ? "pointer-events-none opacity-50" : ""}`}>
            Tải CV từ máy
            <input
              type="file"
              className="hidden"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) apply.mutate({ file });
                e.target.value = "";
              }}
            />
          </label>
          <Link className={button} to="/candidate/cv">Tải CV trên trang của tôi</Link>
          <button className={button} type="button" onClick={onClose}>Đóng</button>
        </div>
        {apply.isError && <p role="alert" className="mt-3">{getApiErrorMessage(apply.error)}</p>}
        {apply.isSuccess && <p className="mt-3 text-sm">Đã nộp hồ sơ.</p>}
      </div>
    </div>
  );
}

async function submitApplication(jobId: number, file?: File, cvId?: number) {
  try {
    await applicantApi.apply(jobId, {
      source: "PORTAL",
      ...(cvId != null ? { cvId: String(cvId) } : {}),
    });
  } catch (err: unknown) {
    const code = (err as { response?: { data?: { code?: string } } })?.response?.data?.code;
    if (code !== "APPLICATION_EXISTS") throw err;
  }
  if (!file) return;
  const form = new FormData();
  form.append("file", file);
  form.append("jobId", String(jobId));
  await cvApi.upload(form);
}
