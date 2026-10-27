import { useState } from "react";
import { Link } from "react-router-dom";
import { Check, ClipboardList, Plus, Sparkles, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Breadcrumb } from "@/components/ux/Breadcrumb";
import { useRecruitmentJob } from "../../jobs/components/JobRecruitmentWorkspace";
import { AutomaticAssessmentCandidateAssigner } from "../components/AutomaticAssessmentCandidateAssigner";
import { JobAssessmentConfiguration } from "../components/JobAssessmentConfiguration";

const cardClass = "rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-5 shadow-[var(--shadow-card)]";

export function AssessmentCreationPage() {
  const job = useRecruitmentJob();
  const basePath = `/recruiter/jobs/${job.id}/assessments`;
  const [mode, setMode] = useState<"config" | "assign" | "manual">("config");

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <Breadcrumb
        items={[
          { label: "Tuyển dụng", to: "/recruiter" },
          { label: job.title, to: `/recruiter/jobs/${job.id}` },
          { label: "Bài đánh giá năng lực", to: basePath },
          { label: "Cấu hình tạo đề" },
        ]}
      />

      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Cấu hình &amp; Tạo bài đánh giá</h1>
        <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
          Thiết lập cấu trúc đề tự động theo kỹ năng của vị trí tuyển dụng, giao đề cho ứng viên hoặc soạn đề thủ công.
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-3" role="tablist" aria-label="Tùy chọn tạo bài đánh giá">
        {([
          {
            id: "config",
            title: "Cấu hình bài tập & đề tự động",
            detail: "Cấu trúc đề theo skill, độ khó và tự động tạo đề riêng",
            icon: Sparkles,
          },
          {
            id: "assign",
            title: "Giao đề cho ứng viên",
            detail: "Bốc đề từ ngân hàng câu hỏi và gửi tới ứng viên",
            icon: Users,
          },
          {
            id: "manual",
            title: "Soạn đề thủ công",
            detail: "Nhập câu hỏi từ bảng tính hoặc file Excel mẫu",
            icon: ClipboardList,
          },
        ] as const).map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={mode === item.id}
            aria-controls={`creation-${item.id}`}
            onClick={() => setMode(item.id)}
            className={cn(
              cardClass,
              "flex items-start gap-3.5 text-left transition-all cursor-pointer",
              mode === item.id
                ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] ring-1 ring-[var(--color-primary)]"
                : "hover:border-[var(--color-outline-variant)]",
            )}
          >
            <item.icon className={cn("size-5 shrink-0 mt-0.5", mode === item.id ? "text-[var(--color-primary)]" : "text-[var(--color-outline)]")} />
            <span className="flex-1 min-w-0">
              <strong className="block text-sm font-semibold">{item.title}</strong>
              <span className="mt-1 block text-xs leading-5 text-[var(--color-on-surface-variant)]">{item.detail}</span>
            </span>
            {mode === item.id && <Check className="size-4 shrink-0 text-[var(--color-primary)]" />}
          </button>
        ))}
      </div>

      {mode === "config" && (
        <div id="creation-config" role="tabpanel">
          <JobAssessmentConfiguration />
    </div>
      )}

      {mode === "assign" && (
        <div id="creation-assign" role="tabpanel" className="space-y-4">
          <AutomaticAssessmentCandidateAssigner />
    </div>
      )}

      {mode === "manual" && (
        <div id="creation-manual" role="tabpanel" className={cardClass}>
          <h2 className="text-lg font-semibold">Bắt đầu từ câu hỏi</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-on-surface-variant)]">
            Soạn câu hỏi và đáp án trên bảng, kiểm tra nội dung, sau đó nhập thông tin bài assessment và lưu bản nháp để xuất bản khi sẵn sàng.
          </p>
          <Link
            to={`${basePath}/excel-template`}
            className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 text-sm font-semibold text-[var(--color-on-primary)] shadow-sm hover:bg-[var(--color-primary-hover)]"
          >
            <Plus className="size-4" />
            Thêm câu hỏi thủ công
          </Link>
    </div>
      )}
    </section>
  );
}
