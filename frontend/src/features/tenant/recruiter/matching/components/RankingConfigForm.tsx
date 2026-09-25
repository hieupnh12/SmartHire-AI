import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { matchingApi } from "@/api/tenant/matchingApi";
import { getApiErrorMessage } from "@/lib/axios";
import type { RankingBoard, RankingConfig } from "../types/ranking";
import { input, labels, primary } from "./rankingUi";

const weight = z.coerce.number().int().min(0).max(100);
const schema = z.object({
  weights: z.object({ skills: weight, experience: weight, assessment: weight, interview: weight })
    .refine((v) => Object.values(v).reduce((a, b) => a + b, 0) === 100, "Tổng trọng số thành phần phải bằng 100%"),
  groups: z.record(weight).refine((v) => Object.values(v).reduce((a, b) => a + b, 0) === 100, "Tổng trọng số nhóm phải bằng 100%"),
  requiredExperienceMonths: z.coerce.number().int().min(0).max(1200),
  revision: z.number(),
}).refine((v) => v.weights.experience === 0 || v.requiredExperienceMonths > 0,
  { message: "Nhập số tháng kinh nghiệm yêu cầu hoặc đặt trọng số kinh nghiệm bằng 0", path: ["requiredExperienceMonths"] });

export function RankingConfigForm({ jobId, config, onSaved, compact = false }: { jobId: number; config: RankingConfig; onSaved: (board: RankingBoard) => void; compact?: boolean }) {
  const form = useForm<RankingConfig>({ resolver: zodResolver(schema), defaultValues: config, shouldFocusError: true });
  const save = useMutation({ mutationFn: (value: RankingConfig) => matchingApi.configure(jobId, value),
    onSuccess: (response) => { if (response.data) onSaved(response.data); } });
  const values = form.watch();
  const componentTotal = Object.values(values.weights).reduce((a, b) => a + Number(b), 0);
  const groupTotal = Object.values(values.groups).reduce((a, b) => a + Number(b), 0);
  const totalTone = (total: number) => total === 100 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700";
  return <form onSubmit={form.handleSubmit((value) => save.mutate(value))} className={compact ? "space-y-4" : "mt-5 space-y-5"}>
    <div className="rounded-xl border border-[var(--color-primary-soft)] bg-[var(--color-primary-subtle)] p-3 text-xs leading-5 text-[var(--color-on-surface-variant)]">Lưu cấu hình sẽ tính lại điểm và thứ hạng của toàn bộ ứng viên trong công việc này.</div>
    <fieldset disabled={save.isPending} className="space-y-4">
      <section className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-alt)]/55 p-3">
      <div className="mb-3 flex items-center justify-between gap-3"><h3 className="text-sm font-semibold">Trọng số thành phần</h3><span className={`rounded-full px-2 py-1 text-[10px] font-bold tabular-nums ${totalTone(componentTotal)}`}>{componentTotal}/100%</span></div>
      <div className={compact ? "grid gap-2.5" : "grid gap-4 sm:grid-cols-2 lg:grid-cols-4"}>
        {(["skills", "experience", "assessment", "interview"] as const).map((key) => <label key={key} className="space-y-2 text-sm">
          <span className="flex items-center justify-between text-xs font-medium"><span>{labels[key]}</span><span className="text-[var(--color-outline)]">%</span></span><input className={`${input} bg-white text-right font-semibold tabular-nums`} type="number" inputMode="numeric" min={0} max={100} step={1} aria-invalid={!!form.formState.errors.weights?.[key]} aria-describedby={form.formState.errors.weights?.[key] ? `weight-${key}-error` : undefined} {...form.register(`weights.${key}`)} />
          {form.formState.errors.weights?.[key] && <span id={`weight-${key}-error`} role="alert" className="block text-red-700">Nhập số nguyên từ 0 đến 100.</span>}
        </label>)}
      </div>
      {form.formState.errors.weights?.message && <p role="alert">{form.formState.errors.weights.message}</p>}
      </section>
      <section className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-alt)]/55 p-3">
      <div className="mb-3 flex items-center justify-between gap-3"><h3 className="text-sm font-semibold">Nhóm kỹ năng</h3><span className={`rounded-full px-2 py-1 text-[10px] font-bold tabular-nums ${totalTone(groupTotal)}`}>{groupTotal}/100%</span></div>
      <div className={compact ? "grid gap-2.5" : "grid gap-4 sm:grid-cols-2 lg:grid-cols-4"}>
        {Object.keys(config.groups).map((key) => <label key={key} className="space-y-2 text-sm"><span>{labels[key] ?? key} (%)</span>
          <input className={`${input} bg-white text-right font-semibold tabular-nums`} type="number" inputMode="numeric" min={0} max={100} step={1} aria-invalid={!!form.formState.errors.groups?.[key]} aria-describedby={form.formState.errors.groups?.[key] ? `group-${key}-error` : undefined} {...form.register(`groups.${key}`)} />
          {form.formState.errors.groups?.[key] && <span id={`group-${key}-error`} role="alert" className="block text-red-700">Nhập số nguyên từ 0 đến 100.</span>}
        </label>)}
      </div>
      {form.formState.errors.groups?.message && <p role="alert">{String(form.formState.errors.groups.message)}</p>}
      </section>
      <section className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-alt)]/55 p-3"><label className="block space-y-2 text-sm"><span className="text-xs font-semibold">Kinh nghiệm yêu cầu</span>
        <span className="relative block"><input className={`${input} bg-white pr-16 text-right font-semibold tabular-nums`} type="number" inputMode="numeric" min={0} max={1200} aria-invalid={!!form.formState.errors.requiredExperienceMonths} aria-describedby={form.formState.errors.requiredExperienceMonths ? "experience-error" : undefined} {...form.register("requiredExperienceMonths")} /><span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[var(--color-on-surface-variant)]">tháng</span></span>
      </label>
      {form.formState.errors.requiredExperienceMonths && <p id="experience-error" role="alert" className="text-sm text-red-700">{form.formState.errors.requiredExperienceMonths.message}</p>}
      </section>
      <div className="sticky bottom-0 -mx-4 border-t border-[var(--color-border-default)] bg-white/95 px-4 pb-1 pt-3 backdrop-blur"><button className={`${primary} w-full`} type="submit">{save.isPending ? "Đang lưu và tính lại…" : "Lưu và tính lại"}</button>{save.isSuccess && <p role="status" className="mt-2 text-center text-xs font-medium text-emerald-700">Đã lưu cấu hình thành công.</p>}</div>
    </fieldset>
    {save.isError && <p role="alert">{getApiErrorMessage(save.error)}</p>}
  </form>;
}
