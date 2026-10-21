import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { humanInterviewApi as api } from "@/api/tenant/humanInterviewApi";
import { getApiErrorMessage } from "@/lib/axios";
import { DetailDialog } from "@/components/ux/DetailDialog";
import { EmptyState } from "@/components/ux/EmptyState";
import { LoadingState, SkeletonCard } from "@/components/ux/Skeleton";
import { button, input, muted, primary } from "@/features/tenant/recruiter/matching/components/rankingUi";
import { downloadInterview } from "@/components/ux/humanInterviewUtilities";
import { HumanInterviewCard } from "./HumanInterviewCard";

const schema = z.object({ start: z.string().min(1, "Chọn thời gian bắt đầu."), end: z.string().min(1, "Chọn thời gian kết thúc."), reason: z.string().trim().min(1, "Nhập lý do đổi lịch.").max(2000) }).refine(v => { const start = new Date(v.start).getTime(), end = new Date(v.end).getTime(); return start > Date.now() && end-start >= 900000 && end-start <= 14400000; }, { message: "Chọn lịch tương lai dài 15–240 phút.", path: ["start"] });
type Notice = { tone: "success" | "error"; text: string };
const errorBox = "rounded-xl bg-[var(--color-error-container)] p-4 text-sm text-[var(--color-on-error-container)]";
const fieldError = "mt-1 text-xs text-[var(--color-error)]";

export function HumanInterviewActions() {
  const client = useQueryClient(); const [notice,setNotice] = useState<Notice | null>(null); const [editing,setEditing] = useState<number | null>(null);
  const rows = useQuery({ queryKey: ["human-interviews","mine"], queryFn: api.mine });
  const form = useForm<z.infer<typeof schema>>({ resolver: zodResolver(schema), defaultValues: { start:"",end:"",reason:"" } });
  const mutation = useMutation({ mutationFn: (fn:()=>Promise<unknown>)=>fn(), onSuccess:()=>{void client.invalidateQueries({queryKey:["human-interviews"]});setEditing(null);setNotice({tone:"success",text:"Đã cập nhật lịch phỏng vấn."});}, onError:e=>setNotice({tone:"error",text:getApiErrorMessage(e)}) });
  const { upcoming, past } = useMemo(() => {
    const now = Date.now(); const all = rows.data ?? [];
    return {
      upcoming: all.filter(r => new Date(r.end).getTime() >= now && r.status !== "CANCELLED" && r.status !== "DONE").sort((a,b) => new Date(a.start).getTime() - new Date(b.start).getTime()),
      past: all.filter(r => new Date(r.end).getTime() < now || r.status === "CANCELLED" || r.status === "DONE").sort((a,b) => new Date(b.start).getTime() - new Date(a.start).getTime()),
    };
  }, [rows.data]);
  const pendingCount = upcoming.filter(r => r.status === "PROPOSED").length;
  const errors = form.formState.errors;
  const renderList = (items: typeof upcoming) => <ul className="grid gap-4 lg:grid-cols-2">{items.map(row => <HumanInterviewCard key={row.id} row={row} busy={mutation.isPending}
    onConfirm={() => mutation.mutate(() => api.confirm(row.id))}
    onReschedule={() => { form.reset(); setEditing(row.id); }}
    onDownload={() => void api.calendar(row.id).then(blob => downloadInterview(blob, `interview-${row.id}.ics`)).catch(e => setNotice({ tone: "error", text: getApiErrorMessage(e) }))} />)}</ul>;

  return <section className="space-y-6 text-[var(--color-on-surface)]" aria-labelledby="interview-schedules-title">
    <header className="rounded-3xl border border-[var(--color-border-default)] bg-[linear-gradient(135deg,var(--color-primary-subtle),white_58%)] px-5 py-6 shadow-[var(--shadow-card)] sm:px-7">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)]">Phỏng vấn với nhà tuyển dụng</p>
      <div className="mt-2 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><h1 id="interview-schedules-title" className="text-3xl font-semibold tracking-tight">Lịch phỏng vấn trực tiếp</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-on-surface-variant)]">Xác nhận tham dự, thêm vào lịch cá nhân hoặc đề nghị đổi giờ với nhà tuyển dụng.</p></div>
        {rows.isSuccess && <div className="flex gap-3">
          <div className="rounded-2xl border border-[var(--color-primary)]/15 bg-white/80 px-4 py-3 text-right"><strong className="block text-2xl text-[var(--color-primary)]">{upcoming.length}</strong><span className="text-xs text-[var(--color-on-surface-variant)]">lịch sắp tới</span></div>
          {pendingCount > 0 && <div className="rounded-2xl border border-amber-200 bg-amber-50/90 px-4 py-3 text-right"><strong className="block text-2xl text-amber-700">{pendingCount}</strong><span className="text-xs text-amber-800">chờ xác nhận</span></div>}
        </div>}
      </div>
    </header>

    {notice && <p role={notice.tone === "error" ? "alert" : "status"} className={notice.tone === "error" ? errorBox : "rounded-xl bg-[var(--color-primary-subtle)] p-4 text-sm text-[var(--color-primary-hover)]"}>{notice.text}</p>}
    {rows.isPending && <LoadingState className="grid gap-4 lg:grid-cols-2" label="Đang tải lịch phỏng vấn">{[0,1].map(i => <SkeletonCard key={i} className="min-h-64" />)}</LoadingState>}
    {rows.isError && <div role="alert" className={`${errorBox} flex flex-wrap items-center justify-between gap-3`}><span>{getApiErrorMessage(rows.error)}</span><button type="button" className={button} onClick={() => void rows.refetch()}>Thử lại</button></div>}
    {rows.isSuccess && rows.data.length === 0 && <EmptyState title="Chưa có lịch phỏng vấn" description="Khi nhà tuyển dụng mời bạn phỏng vấn trực tiếp, lịch hẹn sẽ xuất hiện tại đây." />}

    {upcoming.length > 0 && <div className="space-y-3"><h2 className="text-lg font-semibold">Sắp tới</h2>{renderList(upcoming)}</div>}
    {past.length > 0 && <div className="space-y-3"><h2 className="text-lg font-semibold text-[var(--color-on-surface-variant)]">Đã qua / Đã hủy</h2>{renderList(past)}</div>}

    <DetailDialog open={editing !== null} title="Đề nghị đổi lịch" onClose={()=>setEditing(null)}>
      <form noValidate className="space-y-4" onSubmit={form.handleSubmit(v=>mutation.mutate(()=>api.requestChange(editing!,{start:new Date(v.start).toISOString(),end:new Date(v.end).toISOString(),reason:v.reason})))}>
        <div className="grid gap-4 sm:grid-cols-2">
          <div><label htmlFor="reschedule-start" className="mb-1.5 block text-sm font-medium">Bắt đầu</label><input id="reschedule-start" className={input} type="datetime-local" aria-invalid={Boolean(errors.start)} aria-describedby={errors.start ? "reschedule-start-error" : undefined} {...form.register("start")}/>{errors.start && <p id="reschedule-start-error" role="alert" className={fieldError}>{errors.start.message}</p>}</div>
          <div><label htmlFor="reschedule-end" className="mb-1.5 block text-sm font-medium">Kết thúc</label><input id="reschedule-end" className={input} type="datetime-local" aria-invalid={Boolean(errors.end)} aria-describedby={errors.end ? "reschedule-end-error" : undefined} {...form.register("end")}/>{errors.end && <p id="reschedule-end-error" role="alert" className={fieldError}>{errors.end.message}</p>}</div>
        </div>
        <div><label htmlFor="reschedule-reason" className="mb-1.5 block text-sm font-medium">Lý do đổi lịch</label><textarea id="reschedule-reason" rows={4} className={input} placeholder="Ví dụ: Trùng lịch học, mong được dời sang buổi chiều…" aria-invalid={Boolean(errors.reason)} aria-describedby={errors.reason ? "reschedule-reason-error" : undefined} {...form.register("reason")}/>{errors.reason && <p id="reschedule-reason-error" role="alert" className={fieldError}>{errors.reason.message}</p>}</div>
        <p className={muted}>Thời lượng 15–240 phút. Lịch hiện tại được giữ cho đến khi nhà tuyển dụng duyệt và dời lịch.</p>
        <div className="flex justify-end gap-2 border-t border-[var(--color-border-default)] pt-4"><button type="button" className={button} onClick={()=>setEditing(null)}>Hủy</button><button type="submit" className={primary} disabled={mutation.isPending}>{mutation.isPending ? "Đang gửi…" : "Gửi đề nghị"}</button></div>
      </form>
    </DetailDialog>
  </section>;
}
