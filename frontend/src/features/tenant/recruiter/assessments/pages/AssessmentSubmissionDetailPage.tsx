import React from "react";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import { SubmissionGradingDetail } from "../components/SubmissionGradingDetail";
import { useRecruitmentJob } from "../../jobs/components/JobRecruitmentWorkspace";
import { Button } from "@/components/ux/Button";

interface ErrorBoundaryProps {
  children: React.ReactNode;
  backUrl: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class GradingDetailErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("GradingDetail render crash caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-xs dark:border-rose-900/50 dark:bg-slate-900 space-y-4">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
            <AlertCircle className="size-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              Không thể hiển thị chi tiết bài làm
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto">
              Đã xảy ra lỗi không mong muốn khi dựng dữ liệu bài thi. Vui lòng thử tải lại hoặc quay lại danh sách bài nộp.
            </p>
            {this.state.error?.message && (
              <p className="mt-2 text-[11px] font-mono text-rose-500 bg-rose-50/50 dark:bg-rose-950/30 p-2 rounded-lg max-w-lg mx-auto break-words">
                {this.state.error.message}
              </p>
            )}
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              variant="secondary"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Thử lại
            </Button>
            <Button onClick={() => window.location.assign(this.props.backUrl)}>
              <ArrowLeft className="size-4" /> Quay lại danh sách bài nộp
            </Button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export function AssessmentSubmissionDetailPage() {
  const job = useRecruitmentJob();
  const navigate = useNavigate();
  const { submissionId: submissionIdParam } = useParams<{ id: string; submissionId: string }>();
  const submissionId = Number(submissionIdParam);

  const backUrl = `/recruiter/jobs/${job.id}/assessments/submissions`;

  if (!submissionId || Number.isNaN(submissionId)) {
    return (
      <div className="space-y-6">
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
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 text-[#101828] dark:text-slate-100 pb-16">
      <GradingDetailErrorBoundary backUrl={backUrl}>
        <SubmissionGradingDetail
          key={submissionId}
          id={submissionId}
          onClose={() => navigate(backUrl)}
        />
      </GradingDetailErrorBoundary>
    </div>
  );
}
