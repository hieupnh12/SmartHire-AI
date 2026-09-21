import { Link } from "react-router-dom";
import { Bot } from "lucide-react";
import { PrototypeBanner } from "@/components/ux/PrototypeBanner";
import { button, muted, panel } from "@/features/tenant/recruiter/matching/components/rankingUi";

/** Placeholder — AI intake interview after CV screen; build after MCQ + official schedule. */
export function InterviewsPage() {
  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Đánh giá AI</h1>
        <p className={`mt-2 max-w-2xl ${muted}`}>
          Vòng phỏng vấn AI đầu vào (text hoặc voice — chưa chốt). Khi có phiên, bạn bắt đầu / tiếp tục / trả lời tại đây.
        </p>
      </header>

      <PrototypeBanner note="giữ chỗ · Practice chưa làm ở giai đoạn này" />

      <div className={`${panel} flex flex-col items-start gap-4`}>
        <Bot className="size-8 text-[var(--color-primary)]" aria-hidden="true" />
        <p className={muted}>
          Chưa có phiên AI. Theo dõi tiến độ trong chi tiết đơn ứng tuyển. Bài technical test và lịch interview chính thức đã có UI sơ khai.
        </p>
        <div className="flex flex-wrap gap-2">
          <Link className={button} to="/candidate/assessments">
            Bài kiểm tra
          </Link>
          <Link className={button} to="/candidate/schedules">
            Lịch phỏng vấn
          </Link>
          <Link className={button} to="/candidate/applications">
            Đơn của tôi
          </Link>
        </div>
      </div>
    </section>
  );
}
