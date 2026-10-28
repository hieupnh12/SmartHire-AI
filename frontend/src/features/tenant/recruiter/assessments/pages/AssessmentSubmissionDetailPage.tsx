import { ArrowLeft, ChevronRight, FileCheck2 } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { SubmissionGradingDetail } from "../components/SubmissionGradingDetail";
import { useRecruitmentJob } from "../../jobs/components/JobRecruitmentWorkspace";
import { Button } from "@/components/ux/Button";

export function AssessmentSubmissionDetailPage() {
  const job = useRecruitmentJob();
  const navigate = useNavigate();
  const { submissionId: submissionIdParam } = useParams<{ id: string; submissionId: string }>();
  const submissionId = Number(submissionIdParam);

  const backUrl = `/recruiter/jobs/${job.id}/assessments/submissions`;

  if (!submissionId || Number.isNaN(submissionId)) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
        <p className="text-base font-semibold text-slate-800 dark:text-slate-100">
          Không tìm thấy bài làm
        </p>
        <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
          Mã bài làm không hợp lệ hoặc đã bị xóa.
        </p>
        <Button className="mt-4" onClick={() => navigate(backUrl)}>
          <ArrowLeft className="size-4" /> Quay lại danh sách
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 text-[var(--color-on-surface)] pb-12">
      {/* 1. Header Navigation & Breadcrumbs */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
          <Link
            to={backUrl}
            className="inline-flex items-center gap-1 font-medium text-slate-600 hover:text-[var(--color-primary)] transition-colors dark:text-slate-300"
          >
            <ArrowLeft className="size-3.5" />
            Danh sách bài nộp
          </Link>
          <ChevronRight className="size-3 text-slate-400" />
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            Bài làm #{submissionId}
          </span>
        </div>

        <button
          type="button"
          onClick={() => navigate(backUrl)}
          className="inline-flex items-center gap-2 self-start sm:self-auto rounded-xl border border-slate-200/80 bg-white px-3.5 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-[var(--color-primary)] dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800 transition-all cursor-pointer"
        >
          <ArrowLeft className="size-3.5" />
          Quay lại danh sách
        </button>
      </div>

      {/* 2. Main Submission Grading Card */}
      <SubmissionGradingDetail
        key={submissionId}
        id={submissionId}
        onClose={() => navigate(backUrl)}
      />
    </div>
  );
}
