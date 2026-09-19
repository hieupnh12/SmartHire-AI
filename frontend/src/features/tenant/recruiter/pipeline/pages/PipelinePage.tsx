import { ApplicationPipeline } from "@/features/tenant/recruiter/matching/components/recruitmentFlow";
import { muted, panel } from "@/features/tenant/recruiter/matching/components/rankingUi";

export function PipelinePage() {
  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Pipeline tuyển dụng</h1>
        <p className={`mt-2 max-w-2xl ${muted}`}>
          Apply → sàng lọc CV → phỏng vấn AI → technical test (code + trắc nghiệm) → điểm tổng.
          Recruiter xem kết quả các vòng rồi quyết định phỏng vấn trực tiếp (online hoặc offline).
          Kanban kéo-thả và module interview/test sẽ làm ở sprint sau.
        </p>
      </header>
      <div className={panel}>
        <ApplicationPipeline status="NEW" />
      </div>
    </section>
  );
}
