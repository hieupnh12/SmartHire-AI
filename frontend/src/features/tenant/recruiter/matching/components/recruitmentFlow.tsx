import { muted } from "@/features/tenant/recruiter/matching/components/rankingUi";

export const PIPELINE_STEPS = [
  { id: "cv", label: "Sàng lọc CV", statuses: ["NEW", "IN_REVIEW"] },
  { id: "ai", label: "Phỏng vấn AI", statuses: ["INTERVIEW"] },
  { id: "test", label: "Technical test", statuses: ["ASSESSMENT"] },
  { id: "decision", label: "Đánh giá chung", statuses: ["OFFER", "HIRED"] },
] as const;

export function pipelineIndex(status: string) {
  if (status === "REJECTED" || status === "WITHDRAWN") return -1;
  const index = PIPELINE_STEPS.findIndex((step) => (step.statuses as readonly string[]).includes(status));
  return index < 0 ? 0 : index;
}

export function ApplicationPipeline({ status }: { status: string }) {
  const current = pipelineIndex(status);
  return (
    <ol className="grid gap-2 sm:grid-cols-4">
      {PIPELINE_STEPS.map((step, index) => {
        const active = current === index;
        const done = current > index;
        return (
          <li
            key={step.id}
            className={`rounded-lg border px-2 py-2 text-xs ${
              active ? "border-[var(--color-primary)] font-semibold" : "border-[var(--color-border-default)]"
            } ${done ? "bg-[var(--color-surface-container-low)]" : ""}`}
          >
            <span className={muted}>{index + 1}. {step.label}</span>
          </li>
        );
      })}
    </ol>
  );
}
