import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { CANDIDATE_COMPANY_NAME } from "@/features/tenant/candidate/dashboard/constants/candidateDashboard";

type CandidateWelcomePanelProps = {
  candidateName?: string;
};

export function CandidateWelcomePanel({ candidateName }: CandidateWelcomePanelProps) {
  return (
    <div className="rounded-[8px] border border-[#dbeafe] bg-white p-6 shadow-sm sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-[#ecfeff] px-3 py-1 text-xs font-semibold text-[#0f766e]">
            <Sparkles className="h-4 w-4" aria-hidden="true" />
            {CANDIDATE_COMPANY_NAME}
          </span>
          <h1 className="mt-4 font-display text-2xl font-bold tracking-normal text-[#0f172a] sm:text-3xl">
            Chào mừng {candidateName ?? "ứng viên"}, hồ sơ của bạn đang tiến triển tốt.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#475569]">
            Đây là trang ứng viên sau đăng nhập demo Google. Bạn có thể theo dõi trạng thái ứng tuyển, làm bài đánh giá và chuẩn bị phỏng vấn AI trong cùng một workspace.
          </p>
        </div>
        <Link
          to="/candidate/applications"
          className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-[8px] bg-[#0f766e] px-4 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#115e59]"
        >
          Xem hồ sơ
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </div>
  );
}