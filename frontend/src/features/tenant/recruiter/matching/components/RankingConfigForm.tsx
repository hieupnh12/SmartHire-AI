import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { matchingApi } from "@/api/tenant/matchingApi";
import { getApiErrorMessage } from "@/lib/axios";
import type { RankingBoard, RankingConfig } from "../types/ranking";
import { input, labels, muted, primary } from "./rankingUi";

const weight = z.coerce.number().int().min(0).max(100);
const schema = z.object({
  weights: z.object({ skills: weight, experience: weight, assessment: weight, interview: weight })
    .refine((v) => Object.values(v).reduce((a, b) => a + b, 0) === 100, "Tổng trọng số thành phần phải bằng 100%"),
  groups: z.record(weight).refine((v) => Object.values(v).reduce((a, b) => a + b, 0) === 100, "Tổng trọng số nhóm phải bằng 100%"),
  requiredExperienceMonths: z.coerce.number().int().min(0).max(1200),
  revision: z.number(),
}).refine((v) => v.weights.experience === 0 || v.requiredExperienceMonths > 0,
  { message: "Nhập số tháng kinh nghiệm yêu cầu hoặc đặt trọng số kinh nghiệm bằng 0", path: ["requiredExperienceMonths"] });

export function RankingConfigForm({ jobId, config, onSaved }: { jobId: number; config: RankingConfig; onSaved: (board: RankingBoard) => void }) {
  const form = useForm<RankingConfig>({ resolver: zodResolver(schema), defaultValues: config });
  const save = useMutation({ mutationFn: (value: RankingConfig) => matchingApi.configure(jobId, value),
    onSuccess: (response) => { if (response.data) onSaved(response.data); } });
  const values = form.watch();
  return <form onSubmit={form.handleSubmit((value) => save.mutate(value))} className="mt-5 space-y-5">
    <p className={muted}>Áp dụng cho toàn bộ ứng viên của Job. Lưu cấu hình sẽ tính lại điểm và thứ hạng. Nhóm kỹ năng lấy từ yêu cầu đã khai báo trong Job.</p>
    <fieldset disabled={save.isPending} className="space-y-5">
      <legend className="font-semibold">Trọng số thành phần · {Object.values(values.weights).reduce((a, b) => a + Number(b), 0)}%</legend>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {(["skills", "experience", "assessment", "interview"] as const).map((key) => <label key={key} className="space-y-2 text-sm">
          <span>{labels[key]} (%)</span><input className={input} type="number" min={0} max={100} step={1} {...form.register(`weights.${key}`)} />
          {form.formState.errors.weights?.[key] && <span role="alert">Nhập số nguyên từ 0 đến 100.</span>}
        </label>)}
      </div>
      {form.formState.errors.weights?.message && <p role="alert">{form.formState.errors.weights.message}</p>}
      <p className="font-semibold">Trọng số nhóm kỹ năng · {Object.values(values.groups).reduce((a, b) => a + Number(b), 0)}%</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Object.keys(config.groups).map((key) => <label key={key} className="space-y-2 text-sm"><span>{labels[key] ?? key} (%)</span>
          <input className={input} type="number" min={0} max={100} step={1} {...form.register(`groups.${key}`)} />
          {form.formState.errors.groups?.[key] && <span role="alert">Nhập số nguyên từ 0 đến 100.</span>}
        </label>)}
      </div>
      {form.formState.errors.groups?.message && <p role="alert">{String(form.formState.errors.groups.message)}</p>}
      <label className="block max-w-sm space-y-2 text-sm"><span>Kinh nghiệm liên quan yêu cầu (tháng)</span>
        <input className={input} type="number" min={0} max={1200} {...form.register("requiredExperienceMonths")} />
      </label>
      {form.formState.errors.requiredExperienceMonths && <p role="alert">{form.formState.errors.requiredExperienceMonths.message}</p>}
      <button className={primary} type="submit">{save.isPending ? "Đang tính lại…" : "Lưu và tính lại toàn bộ"}</button>
    </fieldset>
    {save.isError && <p role="alert">{getApiErrorMessage(save.error)}</p>}
  </form>;
}
