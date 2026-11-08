import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { HumanInterview } from "@/api/types/humanInterview";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { cn } from "@/lib/utils";

/** Likert 1–5 → DB 0–100 (×20). */
const SCORE_BY_RATING = [0, 20, 40, 60, 80, 100] as const;
const ANCHORS = ["", "Dưới kỳ vọng rõ", "Chưa đạt", "Đạt kỳ vọng", "Vượt kỳ vọng", "Xuất sắc"] as const;

const COMPETENCIES = [
  { key: "technicalRating" as const, label: "Năng lực chuyên môn", hint: "Kiến thức, giải quyết vấn đề, độ sâu theo JD" },
  { key: "communicationRating" as const, label: "Giao tiếp & làm việc nhóm", hint: "Diễn đạt, lắng nghe, cấu trúc câu trả lời" },
  { key: "cultureRating" as const, label: "Phù hợp văn hóa & động lực", hint: "Ownership, học hỏi — tránh thiên kiến không liên quan công việc" },
] as const;

const RECOMMENDATIONS = [
  { value: "STRONG_HIRE" as const, label: "Strong hire", desc: "Ưu tiên offer", on: "bg-emerald-600 text-white border-emerald-700" },
  { value: "HIRE" as const, label: "Hire", desc: "Nên tuyển", on: "bg-emerald-50 text-emerald-900 border-emerald-300" },
  { value: "NO_HIRE" as const, label: "No hire", desc: "Không tuyển", on: "bg-amber-50 text-amber-950 border-amber-300" },
  { value: "STRONG_NO_HIRE" as const, label: "Strong no-hire", desc: "Loại rõ ràng", on: "bg-red-50 text-red-900 border-red-300" },
] as const;

const rating = () =>
  z.number({ required_error: "Chọn mức 1–5", invalid_type_error: "Chọn mức 1–5" }).int().min(1).max(5);

const schema = z
  .object({
    technicalRating: rating(),
    communicationRating: rating(),
    cultureRating: rating(),
    comments: z.string().max(4000),
    recommendation: z.enum(["STRONG_HIRE", "HIRE", "NO_HIRE", "STRONG_NO_HIRE"], {
      required_error: "Chọn đề xuất tuyển dụng",
      invalid_type_error: "Chọn đề xuất tuyển dụng",
    }),
    finalizeDecision: z.boolean(),
  })
  .superRefine((v, ctx) => {
    const text = v.comments.trim();
    const reject = v.recommendation === "NO_HIRE" || v.recommendation === "STRONG_NO_HIRE";
    if (!text) {
      ctx.addIssue({ code: "custom", path: ["comments"], message: "Bắt buộc evidence / nhận xét có căn cứ." });
    } else if ((reject || v.finalizeDecision) && text.length < 20) {
      ctx.addIssue({
        code: "custom",
        path: ["comments"],
        message: reject ? "Lý do không tuyển cần ≥ 20 ký tự." : "Khi finalize, nhận xét cần ≥ 20 ký tự.",
      });
    }
  });

type FormValues = z.infer<typeof schema>;

export type ScorecardFormValues = {
  technicalScore: number;
  communicationScore: number;
  cultureScore: number;
  comments: string;
  recommendation: FormValues["recommendation"];
  finalizeDecision: boolean;
};

type Props = {
  interview: HumanInterview;
  pending?: boolean;
  onSubmit: (values: ScorecardFormValues) => void;
};

function scoreToRating(score: number | null | undefined) {
  if (score == null || Number.isNaN(score)) return undefined;
  return [1, 2, 3, 4, 5].reduce((best, n) =>
    Math.abs(SCORE_BY_RATING[n] - score) < Math.abs(SCORE_BY_RATING[best] - score) ? n : best,
  );
}

function RatingRow({
  label,
  hint,
  value,
  invalid,
  onChange,
}: {
  label: string;
  hint: string;
  value: number | undefined;
  invalid?: boolean;
  onChange: (n: number) => void;
}) {
  return (
    <fieldset className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface)] p-3">
      <legend className="px-1 text-sm font-semibold">{label}</legend>
      <p className="mb-2 text-[11px] leading-snug text-[var(--color-on-surface-variant)]">{hint}</p>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            role="radio"
            aria-checked={value === n}
            title={ANCHORS[n]}
            onClick={() => onChange(n)}
            className={cn(
              "min-h-10 min-w-10 rounded-lg border px-2 text-sm font-semibold",
              value === n
                ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white"
                : "border-[var(--color-border-default)] bg-[var(--color-surface-alt)] hover:border-[var(--color-primary)]/50",
              invalid && value == null && "border-red-400",
            )}
          >
            {n}
          </button>
        ))}
      </div>
      <p className="mt-1.5 text-[11px] text-[var(--color-on-surface-variant)]">
        {value != null ? (
          <>
            <span className="font-medium text-[var(--color-on-surface)]">{ANCHORS[value]}</span>
            {" · "}
            {SCORE_BY_RATING[value]}/100
          </>
        ) : (
          "1 (yếu) → 5 (xuất sắc)"
        )}
      </p>
    </fieldset>
  );
}

export function HumanInterviewScorecardPanel({ interview, pending, onSubmit }: Props) {
  const user = useAuthStore((s) => s.user);
  const myRole = interview.participants.find((p) => p.userId === user?.id)?.role;
  const isLead = myRole === "LEAD";
  const mine = interview.evaluations.find((e) => e.evaluatorId === user?.id);
  const closed = interview.status === "CANCELLED";
  const now = Date.now();
  const notStarted = new Date(interview.start).getTime() > now;
  const inProgress = !notStarted && new Date(interview.end).getTime() > now;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      technicalRating: scoreToRating(mine?.technicalScore) as FormValues["technicalRating"],
      communicationRating: scoreToRating(mine?.communicationScore) as FormValues["communicationRating"],
      cultureRating: scoreToRating(mine?.cultureScore) as FormValues["cultureRating"],
      comments: mine?.comments ?? "",
      recommendation: mine?.recommendation as FormValues["recommendation"],
      finalizeDecision: false,
    },
  });
  const values = form.watch();
  const reject = values.recommendation === "NO_HIRE" || values.recommendation === "STRONG_NO_HIRE";
  const { errors } = form.formState;
  const overall =
    values.technicalRating && values.communicationRating && values.cultureRating
      ? Math.round(
          (SCORE_BY_RATING[values.technicalRating] +
            SCORE_BY_RATING[values.communicationRating] +
            SCORE_BY_RATING[values.cultureRating]) /
            3,
        )
      : null;

  if (myRole === "NOTE_TAKER") {
    return (
      <p role="status" className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
        Note-taker không nhập scorecard. Chỉ Lead / Co-interviewer được chấm.
      </p>
    );
  }

  return (
    <div className="space-y-4 text-[var(--color-on-surface)]">
      <header>
        <p className="text-[11px] font-semibold uppercase tracking-wide text-sky-800">Structured scorecard</p>
        <p className="text-sm font-semibold">{interview.candidateName}</p>
        <p className="text-xs text-[var(--color-on-surface-variant)]">
          {interview.candidateEmail} · {interview.round}
          {interview.configuration?.rubric ? ` · Rubric ${interview.configuration.rubric}` : ""}
          {myRole ? ` · ${myRole.replaceAll("_", " ")}` : ""}
        </p>
        {inProgress && (
          <p className="mt-2 rounded-lg bg-sky-50 px-3 py-2 text-xs font-medium text-sky-800">
            Đang trong buổi — lưu phiếu không đóng lịch cho đến hết giờ hoặc Lead finalize.
          </p>
        )}
      </header>

      {interview.evaluations.length > 0 && (
        <div className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-alt)] p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-on-surface-variant)]">
            Hội đồng đã nộp ({interview.evaluations.length})
          </p>
          <ul className="mt-2 space-y-2">
            {interview.evaluations.map((e) => {
              const rec = RECOMMENDATIONS.find((r) => r.value === e.recommendation);
              return (
                <li key={e.id} className="text-sm">
                  <p className="font-semibold">
                    {e.evaluatorName}
                    <span className="font-normal text-[var(--color-on-surface-variant)]">
                      {" "}
                      · {e.overallScore}/100 · {rec?.label ?? e.recommendation}
                    </span>
                  </p>
                  {e.comments && (
                    <p className="mt-0.5 line-clamp-3 whitespace-pre-wrap text-xs text-[var(--color-on-surface-variant)]">
                      {e.comments}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {closed || notStarted ? (
        <p role="status" className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          {closed ? "Lịch đã hủy — không thể nhập scorecard." : "Scorecard mở khi buổi bắt đầu."}
        </p>
      ) : (
        <form
          className="space-y-3"
          onSubmit={form.handleSubmit((data) =>
            onSubmit({
              technicalScore: SCORE_BY_RATING[data.technicalRating],
              communicationScore: SCORE_BY_RATING[data.communicationRating],
              cultureScore: SCORE_BY_RATING[data.cultureRating],
              comments: data.comments.trim(),
              recommendation: data.recommendation,
              finalizeDecision: Boolean(data.finalizeDecision && isLead),
            }),
          )}
        >
          {COMPETENCIES.map((c) => (
            <RatingRow
              key={c.key}
              label={c.label}
              hint={c.hint}
              value={values[c.key]}
              invalid={Boolean(errors[c.key])}
              onChange={(n) => form.setValue(c.key, n, { shouldValidate: true, shouldDirty: true })}
            />
          ))}
          {(errors.technicalRating || errors.communicationRating || errors.cultureRating) && (
            <p role="alert" className="text-xs text-red-700">
              Chấm đủ 3 năng lực (1–5).
            </p>
          )}

          <div>
            <p className="mb-1.5 text-sm font-semibold">Đề xuất tuyển dụng</p>
            <div className="grid grid-cols-2 gap-2">
              {RECOMMENDATIONS.map((r) => {
                const selected = values.recommendation === r.value;
                return (
                  <button
                    key={r.value}
                    type="button"
                    onClick={() => form.setValue("recommendation", r.value, { shouldValidate: true })}
                    className={cn(
                      "rounded-xl border px-3 py-2.5 text-left",
                      selected ? cn(r.on, "ring-2 ring-offset-1 ring-[var(--color-primary)]") : "border-[var(--color-border-default)] bg-white hover:bg-slate-50",
                    )}
                  >
                    <span className="block text-sm font-semibold">{r.label}</span>
                    <span className={cn("block text-[11px]", selected ? "opacity-90" : "text-[var(--color-on-surface-variant)]")}>
                      {r.desc}
                    </span>
                  </button>
                );
              })}
            </div>
            {errors.recommendation && (
              <p role="alert" className="mt-1 text-xs text-red-700">
                Chọn một mức đề xuất.
              </p>
            )}
          </div>

          <label className="block text-sm font-medium">
            Evidence / nhận xét (bắt buộc)
            <textarea
              className="mt-1 min-h-28 w-full rounded-lg border border-[var(--color-border-default)] px-3 py-2 text-sm"
              maxLength={4000}
              placeholder="Bằng chứng cụ thể: điểm mạnh, điểm yếu, ví dụ câu trả lời…"
              {...form.register("comments")}
            />
            {errors.comments && (
              <span role="alert" className="mt-1 block text-xs text-red-700">
                {errors.comments.message}
              </span>
            )}
          </label>

          {overall != null && values.recommendation && (
            <p className="rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-alt)] px-3 py-2 text-sm">
              Tổng dự kiến: <strong>{overall}/100</strong>
              <span className="text-[var(--color-on-surface-variant)]">
                {" "}
                · {RECOMMENDATIONS.find((r) => r.value === values.recommendation)?.label}
              </span>
            </p>
          )}

          {isLead ? (
            <div className="space-y-2 rounded-xl border border-red-200 bg-red-50/80 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-red-800">Hiring decision (Lead)</p>
              <p className="text-xs text-red-900/80">
                Nộp phiếu không đổi đơn. Tick để gắn Đậu → OFFER hoặc Trượt → REJECTED.
                {inProgress ? " Nên finalize sau khi hội đồng thống nhất." : ""}
              </p>
              <label className="flex items-start gap-2 text-sm">
                <input type="checkbox" className="mt-0.5" {...form.register("finalizeDecision")} />
                <span>
                  <strong>Ra quyết định cuối trên hồ sơ</strong>
                  <span className="mt-0.5 block text-xs text-red-900/70">
                    {reject ? "Trượt → REJECTED." : "Đậu → OFFER."}
                  </span>
                </span>
              </label>
            </div>
          ) : myRole ? (
            <p className="text-xs text-[var(--color-on-surface-variant)]">
              Không phải Lead — chỉ nộp phiếu đề xuất.
            </p>
          ) : null}

          <button
            type="submit"
            disabled={pending}
            className="inline-flex h-10 items-center rounded-lg bg-[var(--color-primary)] px-4 text-sm font-semibold text-white disabled:opacity-50"
          >
            {pending
              ? "Đang lưu…"
              : values.finalizeDecision && isLead
                ? reject
                  ? "Nộp phiếu & đánh Trượt"
                  : "Nộp phiếu & đánh Đậu"
                : mine
                  ? "Cập nhật scorecard"
                  : "Nộp scorecard"}
          </button>
        </form>
      )}
    </div>
  );
}
