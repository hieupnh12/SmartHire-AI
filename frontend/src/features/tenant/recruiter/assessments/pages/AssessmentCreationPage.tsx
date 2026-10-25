import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Check, ClipboardList, Plus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import { useRecruitmentJob } from "../../jobs/components/JobRecruitmentWorkspace";
import { AutomaticAssessmentCandidateAssigner } from "../components/AutomaticAssessmentCandidateAssigner";

const cardClass = "rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-5 shadow-[var(--shadow-card)]";

export function AssessmentCreationPage() {
  const job = useRecruitmentJob();
  const basePath = `/recruiter/jobs/${job.id}/assessments`;
  const [mode, setMode] = useState<"manual" | "automatic">("manual");

  return (
    <section className="space-y-6">
      <Link to={basePath} className="inline-flex items-center gap-2 text-sm text-[var(--color-primary)] hover:underline">
        <ArrowLeft className="size-4" />
        Danh sách bài đánh giá
      </Link>
      <header>
        <p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)]">Thiết lập bài đánh giá</p>
        <h1 className="mt-2 text-2xl font-semibold">Tạo bài assessment</h1>
        <p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">
          Soạn câu hỏi thủ công hoặc tạo đề tự động cho ứng viên theo cấu hình bài tập của vị trí tuyển dụng.
        </p>
      </header>

      <div className="grid gap-4 md:grid-cols-2" role="tablist" aria-label="Cách tạo bài đánh giá">
        {([
          { id: "manual", title: "Tạo thủ công", detail: "Thêm câu hỏi → Kiểm tra → Tạo bài assessment", icon: ClipboardList },
          { id: "automatic", title: "Tạo tự động", detail: "Bốc đề từ ngân hàng câu hỏi → Chọn ứng viên giao bài", icon: Sparkles },
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
              "flex items-start gap-4 text-left transition-colors",
              mode === item.id && "border-[var(--color-primary)] bg-[var(--color-primary-soft)]",
            )}
          >
            <item.icon className="size-6 shrink-0 text-[var(--color-primary)]" />
            <span className="flex-1">
              <strong className="block">{item.title}</strong>
              <span className="mt-1 block text-sm text-[var(--color-on-surface-variant)]">{item.detail}</span>
            </span>
            {mode === item.id && <Check className="size-5 text-[var(--color-primary)]" />}
          </button>
        ))}
      </div>

      {mode === "manual" ? (
        <div id="creation-manual" role="tabpanel" className={cardClass}>
          <h2 className="text-lg font-semibold">Bắt đầu từ câu hỏi</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-on-surface-variant)]">
            Soạn câu hỏi và đáp án trên bảng, kiểm tra nội dung, sau đó nhập thông tin bài assessment và lưu bản nháp để xuất bản khi sẵn sàng.
          </p>
          <Link
            to={`${basePath}/excel-template`}
            className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 font-semibold text-[var(--color-on-primary)] shadow-sm hover:bg-[var(--color-primary-hover)]"
          >
            <Plus className="size-4" />
            Thêm câu hỏi thủ công
          </Link>
        </div>
      ) : (
        <div id="creation-automatic" role="tabpanel" className="space-y-4">
          <AutomaticAssessmentCandidateAssigner />
        </div>
      )}
    </section>
  );
}
