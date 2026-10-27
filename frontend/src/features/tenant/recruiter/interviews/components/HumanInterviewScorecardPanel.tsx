import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { HumanInterview } from "@/api/types/humanInterview";

const recommendationLabels: Record<string, string> = {
  STRONG_HIRE: "Rất nên tuyển",
  HIRE: "Nên tuyển (Đậu)",
  NO_HIRE: "Không tuyển (Trượt)",
  STRONG_NO_HIRE: "Không phù hợp (Trượt)",
};

const schema = z
  .object({
    technicalScore: z.coerce.number().min(0).max(100),
    communicationScore: z.coerce.number().min(0).max(100),
    cultureScore: z.coerce.number().min(0).max(100),
    comments: z.string().max(4000),
    recommendation: z.enum(["STRONG_HIRE", "HIRE", "NO_HIRE", "STRONG_NO_HIRE"]),
    finalizeDecision: z.boolean(),
  })
  .superRefine((values, ctx) => {
    const fail = values.recommendation === "NO_HIRE" || values.recommendation === "STRONG_NO_HIRE";
    if ((fail || values.finalizeDecision) && !values.comments.trim()) {
      ctx.addIssue({
        code: "custom",
        path: ["comments"],
        message: fail
          ? "Bắt buộc nhập lý do khi đánh giá Trượt."
          : "Bắt buộc nhập nhận xét khi ra quyết định cuối cùng.",
      });
    }
  });

export type ScorecardFormValues = z.infer<typeof schema>;

type Props = {
  interview: HumanInterview;
  pending?: boolean;
  onSubmit: (values: ScorecardFormValues) => void;
};

export function HumanInterviewScorecardPanel({ interview, pending, onSubmit }: Props) {
  const form = useForm<ScorecardFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      technicalScore: 70,
      communicationScore: 70,
      cultureScore: 70,
      comments: "",
      recommendation: "HIRE",
      finalizeDecision: false,
    },
  });
  const values = form.watch();
  const fail = values.recommendation === "NO_HIRE" || values.recommendation === "STRONG_NO_HIRE";
  const closed = interview.status === "CANCELLED";
  const notEnded = new Date(interview.end).getTime() > Date.now();

  return (
    <div className="space-y-4 text-[var(--color-on-surface)]">
      <div>
        <p className="text-sm font-semibold">{interview.candidateName}</p>
        <p className="text-xs text-[var(--color-on-surface-variant)]">
          {interview.candidateEmail} · {interview.round}
        </p>
        <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">
          Hoàn thành buổi phỏng vấn và phiếu đánh giá là hai bước khác nhau. Chỉ Lead mới gắn quyết định Đậu/Trượt vào hồ sơ ứng viên.
        </p>
      </div>

      {interview.evaluations.length > 0 && (
        <ul className="space-y-2">
          {interview.evaluations.map((e) => (
            <li key={e.id} className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-alt)] p-3 text-sm">
              <p className="font-semibold">
                {e.evaluatorName}: {e.overallScore}/100 · {recommendationLabels[e.recommendation] ?? e.recommendation}
              </p>
              {e.comments && <p className="mt-1 whitespace-pre-wrap text-[var(--color-on-surface-variant)]">{e.comments}</p>}
            </li>
          ))}
        </ul>
      )}

      {closed || notEnded ? (
        <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          {closed ? "Lịch đã hủy — không thể nhập phiếu đánh giá." : "Phiếu đánh giá chỉ mở sau khi buổi phỏng vấn kết thúc."}
        </p>
      ) : (
        <form
          className="space-y-3"
          onSubmit={form.handleSubmit((data) => onSubmit(data))}
        >
          {(
            [
              ["technicalScore", "Kỹ thuật"],
              ["communicationScore", "Giao tiếp"],
              ["cultureScore", "Phù hợp văn hóa"],
            ] as const
          ).map(([name, label]) => (
            <label key={name} className="block text-sm font-medium">
              {label} (0–100)
              <input
                type="number"
                min={0}
                max={100}
                className="mt-1 w-full rounded-lg border border-[var(--color-border-default)] px-3 py-2 text-sm"
                {...form.register(name)}
              />
              {form.formState.errors[name] && (
                <span role="alert" className="mt-1 block text-xs text-red-700">
                  Nhập điểm từ 0 đến 100.
                </span>
              )}
            </label>
          ))}

          <label className="block text-sm font-medium">
            Đề xuất kết quả
            <select
              className="mt-1 w-full rounded-lg border border-[var(--color-border-default)] px-3 py-2 text-sm"
              {...form.register("recommendation")}
            >
              <option value="STRONG_HIRE">Rất nên tuyển</option>
              <option value="HIRE">Nên tuyển (Đậu)</option>
              <option value="NO_HIRE">Không tuyển (Trượt)</option>
              <option value="STRONG_NO_HIRE">Không phù hợp (Trượt)</option>
            </select>
          </label>

          <label className="block text-sm font-medium">
            Nhận xét{fail || values.finalizeDecision ? " / lý do (bắt buộc)" : " (tuỳ chọn)"}
            <textarea
              className="mt-1 min-h-24 w-full rounded-lg border border-[var(--color-border-default)] px-3 py-2 text-sm"
              maxLength={4000}
              placeholder={fail ? "Nhập lý do trượt…" : "Nhận xét cho hội đồng / hồ sơ…"}
              {...form.register("comments")}
            />
            {form.formState.errors.comments && (
              <span role="alert" className="mt-1 block text-xs text-red-700">
                {form.formState.errors.comments.message}
              </span>
            )}
          </label>

          <label className="flex items-start gap-2 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-alt)] p-3 text-sm">
            <input type="checkbox" className="mt-0.5" {...form.register("finalizeDecision")} />
            <span>
              <strong>Ra quyết định cuối cùng trên hồ sơ</strong>
              <span className="mt-0.5 block text-xs text-[var(--color-on-surface-variant)]">
                Chỉ Lead: Đậu → chuyển đơn sang Đề nghị nhận việc (OFFER); Trượt → từ chối đơn và lưu lý do.
                Bỏ chọn nếu chỉ lưu phiếu đánh giá, chưa kết luận tuyển dụng.
              </span>
            </span>
          </label>

          <div className="flex flex-wrap gap-2 pt-1">
            <button
              type="submit"
              disabled={pending}
              className="inline-flex h-10 items-center rounded-lg bg-[var(--color-primary)] px-4 text-sm font-semibold text-white disabled:opacity-50"
            >
              {pending
                ? "Đang lưu…"
                : values.finalizeDecision
                  ? fail
                    ? "Lưu phiếu & đánh Trượt"
                    : "Lưu phiếu & đánh Đậu"
                  : "Lưu phiếu đánh giá"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
