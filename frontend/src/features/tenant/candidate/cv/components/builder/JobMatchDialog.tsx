import { useState } from "react";
import { createPortal } from "react-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, Loader2, Target, XCircle } from "lucide-react";
import { cvApi } from "@/api/tenant/cvApi";
import { jobApi } from "@/api/tenant/jobApi";
import type { BuilderSkillHit, CvBuilderData } from "@/api/types/cv";
import { DetailDialog } from "@/components/ux/DetailDialog";
import { getApiErrorMessage } from "@/lib/axios";

const fieldClass = "min-h-10 flex-1 rounded-lg border border-slate-200 bg-white px-3 text-sm text-slate-700 focus:border-[var(--color-primary)] focus:outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--color-primary)_25%,white)]";

function scoreTone(score: number) {
  if (score >= 75) return "text-emerald-600";
  if (score >= 50) return "text-amber-600";
  return "text-red-600";
}

function SkillChips({ items, matched }: { items: BuilderSkillHit[]; matched: boolean }) {
  const Icon = matched ? CheckCircle2 : XCircle;
  return (
    <ul className="mt-2 flex flex-wrap gap-2">
      {items.map((skill) => (
        <li key={skill.name} className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold ${matched ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-red-200 bg-red-50 text-red-700"}`}>
          <Icon className="size-3.5" aria-hidden="true" />{skill.name}{skill.required ? " · bắt buộc" : ""}
        </li>
      ))}
    </ul>
  );
}

export function JobMatchDialog({ cv, onClose }: { cv: CvBuilderData; onClose: () => void }) {
  const [jobId, setJobId] = useState("");
  const jobs = useQuery({ queryKey: ["public-jobs", ""], queryFn: () => jobApi.publicList() });
  const check = useMutation({ mutationFn: (id: number) => cvApi.jobMatch(id, { ...cv, accentColor: null }) });
  const result = check.data?.data;
  const nameMissing = !cv.personalInfo.fullName.trim();

  return createPortal(
    <div className="cv-print-hidden">
      <DetailDialog open title="Chấm CV theo tin tuyển dụng" onClose={onClose}>
        <p className="text-sm text-slate-500">So kỹ năng yêu cầu của tin tuyển dụng với nội dung CV đang soạn (mục ẩn không tính). Kết quả chỉ để bạn tham khảo, không gửi cho nhà tuyển dụng.</p>
        <form
          className="mt-4 flex flex-wrap gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (jobId) check.mutate(Number(jobId));
          }}
        >
          <select value={jobId} onChange={(event) => setJobId(event.target.value)} className={fieldClass} aria-label="Tin tuyển dụng" disabled={jobs.isLoading}>
            <option value="">{jobs.isLoading ? "Đang tải tin tuyển dụng…" : "Chọn tin tuyển dụng…"}</option>
            {jobs.data?.data.map((job) => <option key={job.id} value={job.id}>{job.title}</option>)}
          </select>
          <button type="submit" disabled={!jobId || nameMissing || check.isPending} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-primary-hover)] disabled:opacity-60">
            {check.isPending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Target className="size-4" aria-hidden="true" />}Chấm điểm
          </button>
        </form>
        {nameMissing && <p className="mt-3 text-sm text-amber-700">Nhập họ và tên trên CV trước khi chấm.</p>}
        {jobs.isError && <p role="alert" className="mt-3 text-sm text-red-700">{getApiErrorMessage(jobs.error)}</p>}
        {check.isError && <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{getApiErrorMessage(check.error)}</p>}
        {result && (
          <div className="mt-5 space-y-4">
            <div className="flex items-end gap-3">
              <span className={`text-4xl font-bold ${scoreTone(result.score)}`}>{result.score}%</span>
              <span className="pb-1 text-sm text-slate-600">kỹ năng khớp với <strong>{result.jobTitle}</strong></span>
            </div>
            {result.matched.length + result.missing.length === 0 && <p className="text-sm text-slate-500">Tin tuyển dụng này chưa khai báo kỹ năng yêu cầu.</p>}
            {result.matched.length > 0 && <section><h3 className="text-sm font-semibold text-slate-800">Đã có trong CV</h3><SkillChips items={result.matched} matched /></section>}
            {result.missing.length > 0 && (
              <section>
                <h3 className="text-sm font-semibold text-slate-800">Chưa thấy trong CV</h3>
                <SkillChips items={result.missing} matched={false} />
                <p className="mt-2 text-xs text-slate-500">Nếu bạn thực sự có các kỹ năng này, hãy thêm vào mục Kỹ năng hoặc mô tả kinh nghiệm.</p>
              </section>
            )}
            {(result.minYearsExperience != null || result.educationLevel) && (
              <p className="text-sm text-slate-600">
                Yêu cầu khác:{result.minYearsExperience != null && <> tối thiểu {result.minYearsExperience} năm kinh nghiệm</>}
                {result.minYearsExperience != null && result.educationLevel && ";"}
                {result.educationLevel && <> trình độ {result.educationLevel}</>}.
              </p>
            )}
          </div>
        )}
      </DetailDialog>
    </div>,
    document.body,
  );
}
