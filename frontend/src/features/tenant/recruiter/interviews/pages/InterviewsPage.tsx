import { Link } from "react-router-dom";
import { Bot } from "lucide-react";
import { PrototypeBanner } from "@/components/ux/PrototypeBanner";
import { button, muted, panel } from "@/features/tenant/recruiter/matching/components/rankingUi";

/** Placeholder for AI screening interview — implemented after technical test + official schedule. */
export function InterviewsPage() {
  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header>
        <p className={muted}>Tuyển dụng / AI interview</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Phỏng vấn AI đầu vào</h1>
        <p className={`mt-2 max-w-2xl ${muted}`}>
          Tạo phiên gắn đơn ứng tuyển, AI sinh câu theo job, lưu trả lời và báo cáo. Sẽ làm sau technical test & lịch interview chính thức.
        </p>
      </header>

      <PrototypeBanner note="chưa chốt text hay voice — ảnh hưởng khối lượng công việc" />

      <div className={`${panel} flex flex-col items-start gap-4`}>
        <Bot className="size-8 text-[var(--color-primary)]" aria-hidden="true" />
        <p className={muted}>
          Trang này giữ chỗ cho recruiter xem phiên AI và báo cáo. Lịch với người thật nằm ở{" "}
          <Link className="font-medium underline" to="/recruiter/schedules">
            Lịch phỏng vấn
          </Link>
          .
        </p>
        <Link className={button} to="/recruiter/schedules">
          Đi tới lịch interview chính thức
        </Link>
      </div>
    </section>
  );
}
