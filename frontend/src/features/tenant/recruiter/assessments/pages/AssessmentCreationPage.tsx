import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, Check, ClipboardList, Plus, Settings2, Sparkles, Trash2 } from "lucide-react";
import { assessmentGenerationApi } from "@/api/tenant/assessmentGenerationApi";
import type { AssessmentConfiguration } from "@/api/types/assessmentGeneration";
import { AssessmentError } from "@/components/ux/assessmentUi";
import { Button } from "@/components/ux/Button";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { useRecruitmentJob } from "../../jobs/components/JobRecruitmentWorkspace";

const schema = z.object({
  durationMinutes: z.number().int().min(1, "Thời lượng tối thiểu 1 phút").max(480, "Tối đa 480 phút"),
  passingPercent: z.number().int().min(0).max(100, "Ngưỡng đạt tối đa 100%"),
  autoAssign: z.boolean(),
  sections: z.array(z.object({
    skill: z.string().trim().min(1, "Chọn skill của job"),
    questionType: z.enum(["MCQ", "MULTIPLE_CHOICE", "ESSAY"]),
    difficulty: z.enum(["Easy", "Medium", "Hard"]),
    count: z.number().int().min(1, "Tối thiểu 1 câu").max(100),
    points: z.number().int().min(1, "Tối thiểu 1 điểm").max(10000),
  })).min(1, "Chọn ít nhất một skill và cấu hình nhóm bài tập").max(100),
}).refine(value => value.sections.reduce((sum, row) => sum + row.count, 0) <= 100, {
  path: ["sections"], message: "Một đề có tối đa 100 câu hỏi",
});
const inputClass = "mt-1 h-10 w-full rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-card)] px-3 text-sm";
const cardClass = "rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-5 shadow-[var(--shadow-card)]";

export function AssessmentCreationPage() {
  const job = useRecruitmentJob();
  const basePath = `/recruiter/jobs/${job.id}/assessments`;
  const [mode, setMode] = useState<"manual" | "automatic">("manual");
  const config = useQuery({
    queryKey: [...queryKeys.assessments.all(), "configuration", job.id],
    queryFn: () => assessmentGenerationApi.configuration(job.id),
  });
  return <section className="space-y-6">
    <Link to={basePath} className="inline-flex items-center gap-2 text-sm text-[var(--color-primary)]"><ArrowLeft className="size-4" />Danh sách bài đánh giá</Link>
    <header><p className="text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)]">Thiết lập bài đánh giá</p><h1 className="mt-2 text-2xl font-semibold">Tạo bài assessment</h1><p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">Soạn câu hỏi thủ công hoặc tạo đề từ ngân hàng câu hỏi theo cấu trúc của vị trí tuyển dụng.</p></header>
    <div className="grid gap-4 md:grid-cols-2" role="tablist" aria-label="Cách tạo bài đánh giá">
      {([{ id: "manual", title: "Tạo thủ công", detail: "Thêm câu hỏi → Kiểm tra → Tạo bài assessment", icon: ClipboardList }, { id: "automatic", title: "Tạo tự động", detail: "Cấu hình cấu trúc → Lấy câu hỏi từ ngân hàng → Tạo đề", icon: Sparkles }] as const).map(item => <button key={item.id} type="button" role="tab" aria-selected={mode === item.id} aria-controls={`creation-${item.id}`} onClick={() => setMode(item.id)} className={cn(cardClass, "flex items-start gap-4 text-left transition-colors", mode === item.id && "border-[var(--color-primary)] bg-[var(--color-primary-soft)]")}><item.icon className="size-6 shrink-0 text-[var(--color-primary)]" /><span className="flex-1"><strong className="block">{item.title}</strong><span className="mt-1 block text-sm text-[var(--color-on-surface-variant)]">{item.detail}</span></span>{mode === item.id && <Check className="size-5 text-[var(--color-primary)]" />}</button>)}
    </div>
    {mode === "manual" ? <div id="creation-manual" role="tabpanel" className={cardClass}><h2 className="text-lg font-semibold">Bắt đầu từ câu hỏi</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-on-surface-variant)]">Soạn câu hỏi và đáp án trên bảng, kiểm tra nội dung, sau đó nhập thông tin bài assessment và lưu bản nháp để xuất bản khi sẵn sàng.</p><Link to={`${basePath}/excel-template`} className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 font-semibold text-[var(--color-on-primary)]"><Plus className="size-4" />Thêm câu hỏi thủ công</Link></div>
      : <div id="creation-automatic" role="tabpanel" className="space-y-4"><AssessmentError error={config.error} retry={() => void config.refetch()} />{config.isPending ? <p role="status">Đang tải cấu hình…</p> : config.isSuccess && <ConfigurationForm initial={config.data} />}</div>}
  </section>;
}

function ConfigurationForm({ initial }: { initial: AssessmentConfiguration | null }) {
  const job = useRecruitmentJob();
  const client = useQueryClient();
  const navigate = useNavigate();
  const [notice, setNotice] = useState("");
  const [tab, setTab] = useState<"general" | "exercise">("general");
  const status = useQuery({ queryKey: [...queryKeys.assessments.all(), "automation-status", job.id],
    queryFn: () => assessmentGenerationApi.status(job.id), refetchInterval: 15000 });
  const { register, control, handleSubmit, watch, formState: { errors } } = useForm<AssessmentConfiguration>({ resolver: zodResolver(schema), defaultValues: initial ?? {
    durationMinutes: 30, passingPercent: 70, autoAssign: true,
    sections: [{ skill: job.skills[0]?.name ?? "", questionType: "MCQ", difficulty: "Easy", count: 5, points: 2 }],
  } });
  const { fields, append, remove } = useFieldArray({ control, name: "sections" });
  const sections = watch("sections");
  const count = sections.reduce((sum, row) => sum + (Number(row.count) || 0), 0);
  const total = sections.reduce((sum, row) => sum + (Number(row.count) || 0) * (Number(row.points) || 0), 0);
  const selectedSkills = new Set(sections.map(section => section.skill));
  const toggleSkill = (skill: string) => {
    if (selectedSkills.has(skill)) {
      const indexes = sections.flatMap((section, index) => section.skill === skill ? [index] : []);
      remove(indexes);
    } else append({ skill, questionType: "MCQ", difficulty: "Easy", count: 1, points: 1 });
  };
  const mutation = useMutation({
    mutationFn: async ({ data, generate }: { data: AssessmentConfiguration; generate: boolean }) => {
      await assessmentGenerationApi.save(job.id, data);
      return generate ? assessmentGenerationApi.generate(job.id) : null;
    },
    onSuccess: async result => {
      await client.invalidateQueries({ queryKey: queryKeys.assessments.all() });
      if (result) navigate(`/recruiter/jobs/${job.id}/assessments/${result.id}`);
      else setNotice("Đã lưu cấu hình. Khi bật tự động, hệ thống sẽ tạo đề cho cả hồ sơ đã vượt AI Interview trước đó và hồ sơ mới đủ điều kiện.");
    },
  });
  const save = (generate: boolean) => handleSubmit(data => { setNotice(""); mutation.mutate({ data, generate }); }, invalid => {
    setTab(invalid.sections ? "exercise" : "general");
  });
  return <form noValidate onSubmit={save(false)} className="space-y-5">
    <div className={cardClass}>
    <h2 className="mb-5 text-lg font-semibold">Cấu hình Assessment của Job</h2>
    <div className="mb-5 flex gap-1 overflow-x-auto rounded-xl bg-[var(--color-surface-container-low)] p-1" role="tablist" aria-label="Cấu hình Assessment">
      {([{ id: "general", label: "Cấu hình chung", icon: Settings2 }, { id: "exercise", label: "Cấu hình bài tập", icon: ClipboardList }] as const).map(item => <button key={item.id} id={`assessment-config-tab-${item.id}`} type="button" role="tab" aria-selected={tab === item.id} aria-controls={`assessment-config-${item.id}`} onClick={() => setTab(item.id)} className={cn("inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl px-4 text-sm font-semibold", tab === item.id ? "bg-[var(--color-surface-card)] text-[var(--color-primary)] shadow-sm" : "text-[var(--color-on-surface-variant)]")}><item.icon className="size-4" />{item.label}</button>)}
    </div>
    <div id="assessment-config-general" role="tabpanel" aria-labelledby="assessment-config-tab-general" hidden={tab !== "general"} className="space-y-5">
    <div className="rounded-xl border border-[var(--color-border-default)] p-4"><h3 className="text-sm font-semibold">Điểm và điều kiện đạt</h3><p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">Thiết lập chung áp dụng cho toàn bộ bài tập của đề assessment.</p></div>
    <fieldset className="rounded-xl border border-[var(--color-border-default)] p-4"><legend className="px-2">Thiết lập bài đánh giá</legend>
      <label className="mb-4 flex items-start gap-3 text-sm"><input type="checkbox" {...register("autoAssign")} disabled={mutation.isPending} className="mt-1 size-4" /><span><strong className="block">Tự động tạo đề riêng khi ứng viên vượt AI Interview</strong><span className="mt-1 block text-[var(--color-on-surface-variant)]">Áp dụng cho cả hồ sơ đã vượt vòng và hồ sơ mới đủ điều kiện. Đề riêng sử dụng cùng cấu hình chung và cấu hình bài tập bên dưới, được xuất bản và gửi thông báo/email.</span></span></label>
      {!job.skills.length && <p role="alert" className="mt-3 text-sm text-[var(--color-error)]">Thêm skill cho job trước khi cấu hình tạo tự động.</p>}
      <div className="mt-5 grid gap-4 sm:grid-cols-3"><label className="text-sm font-medium">Passing Score (/100)<input type="number" {...register("passingPercent", { valueAsNumber: true })} min={0} max={100} className={inputClass} /><span className="text-xs text-[var(--color-error)]">{errors.passingPercent?.message}</span></label><label className="text-sm font-medium">Tổng số câu hỏi<input type="number" readOnly value={count} className={inputClass} /><span className="text-xs text-[var(--color-on-surface-variant)]">Theo cấu hình bài tập</span></label><label className="text-sm font-medium">Tổng thời gian (phút)<input type="number" {...register("durationMinutes", { valueAsNumber: true })} min={1} max={480} className={inputClass} /><span className="text-xs text-[var(--color-error)]">{errors.durationMinutes?.message}</span></label></div>
    </fieldset>
    <fieldset className="rounded-xl border border-[var(--color-border-default)] p-4"><legend className="px-2">Nhóm bài tập và trọng số</legend><p className="mb-4 text-sm text-[var(--color-on-surface-variant)]">Trọng số được tính từ số câu và điểm mỗi câu trong cấu hình bài tập.</p><div className="grid gap-4 sm:grid-cols-3">{([{ type: "MCQ", label: "Trắc nghiệm đơn" }, { type: "MULTIPLE_CHOICE", label: "Nhiều đáp án" }, { type: "ESSAY", label: "Tự luận / code" }] as const).map(item => {
      const points = sections.filter(row => row.questionType === item.type).reduce((sum, row) => sum + (Number(row.count) || 0) * (Number(row.points) || 0), 0);
      return <label key={item.type} className="text-sm font-medium">{item.label} (%)<input type="number" readOnly value={total ? Math.round(points / total * 10000) / 100 : 0} className={inputClass} /></label>;
    })}</div><p className="mt-3 text-xs text-[var(--color-on-surface-variant)]">Tổng điểm: {total} · Ngưỡng đạt: {Math.round(total * (Number(watch("passingPercent")) || 0)) / 100} điểm</p></fieldset>
    <fieldset className="rounded-xl border border-[var(--color-border-default)] p-4"><legend className="px-2">Job Skills cần đánh giá</legend><div className="flex flex-wrap gap-2">{job.skills.map(skill => <label key={skill.skillId} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-[var(--color-border-default)] px-3 text-sm has-[:checked]:border-[var(--color-primary)] has-[:checked]:bg-[var(--color-primary-soft)]"><input type="checkbox" checked={selectedSkills.has(skill.name)} disabled={mutation.isPending} onChange={() => toggleSkill(skill.name)} />{skill.name}</label>)}</div><p className="mt-3 text-xs text-[var(--color-on-surface-variant)]">Chọn skill để thêm nhóm bài tập tương ứng. Bỏ chọn sẽ xóa các nhóm của skill đó.</p></fieldset>
    </div>
    <div id="assessment-config-exercise" role="tabpanel" aria-labelledby="assessment-config-tab-exercise" hidden={tab !== "exercise"}><div className="flex flex-wrap items-center justify-between gap-3"><div><h3 className="font-semibold">Cấu hình bài tập assessment</h3><p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">Cấu trúc này dùng chung khi tạo đề bằng nút và khi tự tạo đề riêng cho ứng viên. Câu hỏi được chọn từ ngân hàng theo skill, loại câu và độ khó.</p></div><span className="rounded-full bg-[var(--color-primary-soft)] px-3 py-1 text-sm text-[var(--color-primary)]">{count} câu · {total} điểm</span></div><div className="mt-4 space-y-4">
      {fields.map((field, index) => <fieldset key={field.id} className="rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] p-4"><legend className="px-2 text-xs font-semibold">Nhóm câu hỏi {index + 1}</legend><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6"><label className="text-xs font-medium lg:col-span-2">Skill<select {...register(`sections.${index}.skill`)} className={inputClass}><option value="">Chọn skill</option>{job.skills.map(skill => <option key={skill.skillId} value={skill.name}>{skill.name}</option>)}</select></label><label className="text-xs font-medium">Loại câu<select {...register(`sections.${index}.questionType`)} className={inputClass}><option value="MCQ">Trắc nghiệm đơn</option><option value="MULTIPLE_CHOICE">Nhiều đáp án</option><option value="ESSAY">Tự luận / code</option></select></label><label className="text-xs font-medium">Độ khó<select {...register(`sections.${index}.difficulty`)} className={inputClass}><option value="Easy">Dễ</option><option value="Medium">Trung bình</option><option value="Hard">Khó</option></select></label><label className="text-xs font-medium">Số câu<input type="number" min={1} max={100} {...register(`sections.${index}.count`, { valueAsNumber: true })} className={inputClass} /></label><label className="text-xs font-medium">Điểm / câu<input type="number" min={1} max={10000} {...register(`sections.${index}.points`, { valueAsNumber: true })} className={inputClass} /></label></div><div className="mt-3 flex items-center justify-between gap-3"><p className="text-xs text-[var(--color-error)]">{errors.sections?.[index]?.skill?.message ?? errors.sections?.[index]?.count?.message ?? errors.sections?.[index]?.points?.message}</p><button type="button" disabled={fields.length === 1 || mutation.isPending} onClick={() => remove(index)} aria-label={`Xóa nhóm ${index + 1}`} className="rounded-lg p-2 text-[var(--color-on-surface-variant)] disabled:opacity-40"><Trash2 className="size-4" /></button></div></fieldset>)}
    </div><Button type="button" variant="secondary" disabled={fields.length >= 100 || mutation.isPending} onClick={() => append({ skill: job.skills[0]?.name ?? "", questionType: "MCQ", difficulty: "Easy", count: 1, points: 1 })}><Plus className="size-4" />Thêm nhóm câu hỏi</Button></div>
    <p role="alert" className="mt-3 text-sm text-[var(--color-error)]">{errors.sections?.root?.message ?? errors.sections?.message}</p>
    <p className="mt-5 border-t border-[var(--color-border-default)] pt-4 text-xs text-[var(--color-on-surface-variant)]">Một cấu hình chung cho cả hai cách tạo tự động. Thay đổi chỉ áp dụng cho các đề được tạo mới.</p>
    </div>
    <AssessmentError error={mutation.error} />{notice && <p role="status" className="text-sm text-[var(--color-primary)]">{notice}</p>}
    <AssessmentError error={status.error} retry={() => void status.refetch()} />
    {status.data && <div className={cardClass}><h3 className="text-sm font-semibold">Theo dõi tạo đề riêng</h3><p className="mt-2 text-sm text-[var(--color-on-surface-variant)]">{status.data.eligible} hồ sơ đủ điều kiện · {status.data.generated} đã có đề riêng · {status.data.pending} chưa có đề riêng</p>{status.data.bankError && <p role="alert" className="mt-2 text-sm text-[var(--color-error)]">Ngân hàng chưa đủ câu phù hợp: {status.data.bankError}</p>}<p className="mt-2 text-xs text-[var(--color-on-surface-variant)]">Số liệu cập nhật mỗi 15 giây. Các hồ sơ chưa có đề được xử lý khi bật tự động và ngân hàng đáp ứng cấu hình.</p></div>}
    <div className="flex flex-wrap justify-end gap-3"><Button type="submit" variant="secondary" disabled={mutation.isPending || !job.skills.length}>Lưu cấu hình</Button><Button type="button" disabled={mutation.isPending || !job.skills.length} onClick={() => void save(true)()}><Sparkles className="size-4" />{mutation.isPending ? "Đang xử lý…" : "Tạo bài assessment tự động"}</Button></div><p className="text-right text-xs text-[var(--color-on-surface-variant)]">Nút tạo tự động lưu cấu hình và tạo bản nháp để bạn kiểm tra, xuất bản.</p>
  </form>;
}
