import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { humanInterviewApi as api } from "@/api/tenant/humanInterviewApi";
import { applicantApi } from "@/api/tenant/applicantApi";
import { cvApi } from "@/api/tenant/cvApi";
import type { HumanInterview, InterviewFilters } from "@/api/types/humanInterview";
import { getApiErrorMessage } from "@/lib/axios";
import { DetailDialog } from "@/components/ux/DetailDialog";
import { useRecruitmentJob } from "../../jobs/components/JobRecruitmentWorkspace";
import { HumanInterviewWorkspace, type InterviewAction } from "../components/HumanInterviewWorkspace";
import { HumanInterviewScheduleDialog } from "../components/HumanInterviewScheduleDialog";
import { downloadInterview } from "../components/humanInterviewUi";
import "../styles/human-interview-reference.css";

async function allRows(filters: InterviewFilters) {
  const rows: HumanInterview[] = [];
  for (let page = 0; ; page++) {
    const result = await api.list({ ...filters, page, size: 100 });
    rows.push(...result.items);
    if (rows.length >= result.total || !result.items.length) return rows;
  }
}
const scoreSchema = z.object({ technicalScore: z.coerce.number().min(0).max(100), communicationScore: z.coerce.number().min(0).max(100), cultureScore: z.coerce.number().min(0).max(100), comments: z.string().max(4000), recommendation: z.enum(["STRONG_HIRE", "HIRE", "NO_HIRE", "STRONG_NO_HIRE"]) });
type Scores = z.infer<typeof scoreSchema>;
export function InterviewsPage() {
  const job = useRecruitmentJob(); const navigate = useNavigate(); const client = useQueryClient();
  const [filters, setFilters] = useState({ search: "", round: "", mode: "", status: "", page: 0, size: 10 });
  const [view, setView] = useState<"list" | "calendar">("list");
  const [week, setWeek] = useState(() => { const d = new Date(); d.setDate(d.getDate() - (d.getDay()+6)%7); d.setHours(0,0,0,0); return d; });
  const [selected, setSelected] = useState<number[]>([]); const [editor, setEditor] = useState<HumanInterview | "new" | null>(null);
  const [detail, setDetail] = useState<{ action: "scorecard" | "preview" | "cancel" | "shift" | "profile"; row?: HumanInterview; applicationId?: number } | null>(null);
  const [shift, setShift] = useState(60); const [message, setMessage] = useState("");
  const params = { jobId: Number(job.id), q: filters.search || undefined, round: filters.round || undefined, mode: filters.mode || undefined, status: filters.status || undefined, page: filters.page, size: filters.size };
  const list = useQuery({ queryKey: ["human-interviews", "list", params], queryFn: () => api.list(params) });
  const summary = useQuery({ queryKey: ["human-interviews", "summary", job.id], queryFn: () => api.summary(Number(job.id)) });
  const options = useQuery({ queryKey: ["human-interviews", "options", job.id], queryFn: () => api.options(Number(job.id)) });
  const end = new Date(week); end.setDate(end.getDate()+7);
  const calendar = useQuery({ queryKey: ["human-interviews", "calendar", params, week.toISOString()], queryFn: () => allRows({ ...params, from: week.toISOString(), to: end.toISOString() }), enabled: view === "calendar" });
  const preview = useQuery({ queryKey: ["human-interviews", "preview", detail?.row?.id], queryFn: () => api.preview(detail!.row!.id), enabled: detail?.action === "preview" });
  const applicant = useQuery({ queryKey: ["applications", detail?.applicationId], queryFn: () => applicantApi.get(detail!.applicationId!), enabled: detail?.action === "profile" });
  const refresh = useCallback(() => { void client.invalidateQueries({ queryKey: ["human-interviews"] }); setSelected([]); }, [client]);
  const closeEditor = useCallback(() => setEditor(null), []);
  const mutation = useMutation({ mutationFn: (operation: () => Promise<unknown>) => operation(), onSuccess: () => { refresh(); setDetail(null); setMessage("Đã cập nhật lịch phỏng vấn."); }, onError: e => setMessage(getApiErrorMessage(e)) });
  const run = (operation: () => Promise<unknown>) => mutation.mutate(operation);
  const scores = useForm<Scores>({ resolver: zodResolver(scoreSchema), defaultValues: { technicalScore: 0, communicationScore: 0, cultureScore: 0, comments: "", recommendation: "HIRE" } });
  useEffect(() => { const font = document.createElement("link"); font.rel = "stylesheet"; font.href = "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"; document.head.appendChild(font); return () => font.remove(); }, []);
  const profile = (applicationId: number) => setDetail({ action: "profile", applicationId });
  const action = (action: InterviewAction, row: HumanInterview) => {
    if (action === "edit") setEditor(row);
    else if (action === "profile") profile(row.applicationId);
    else if (action === "remind" || action === "complete") run(() => api[action](row.id));
    else { if (action === "scorecard") scores.reset(); setDetail({ action, row }); }
  };
  const exportFile = async (format: "ics" | "csv") => {
    try {
      if (format === "ics") downloadInterview(await api.export(Number(job.id)), `interviews-${job.id}.ics`);
      else {
        const rows = await allRows(params);
        const cell = (value: string) => `"${value.replace(/^[=+@-]/, "'$&").replaceAll('"', '""')}"`;
        const lines = [["Candidate", "Email", "Round", "Mode", "Start", "End", "Status"], ...rows.map(r => [r.candidateName, r.candidateEmail, r.round, r.mode, r.start, r.end, r.status])];
        downloadInterview(new Blob(["\uFEFF" + lines.map(r => r.map(cell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" }), `interviews-${job.id}.csv`);
      }
    } catch(e) { setMessage(getApiErrorMessage(e)); }
  };
  return <>
    {message && <p role="status" className="mb-3 rounded-xl border p-3">{message}</p>}
    {[list, summary, options, calendar].some(q => q.isError) && <p role="alert" className="mb-3">{getApiErrorMessage(list.error ?? summary.error ?? options.error ?? calendar.error)} <button onClick={refresh}>Thử lại</button></p>}
    <HumanInterviewWorkspace jobTitle={job.title} data={list.data} summary={summary.data} calendarRows={calendar.data ?? []} view={view} week={week} {...filters} selected={selected} pending={mutation.isPending} loading={list.isLoading || (view === "calendar" && calendar.isLoading)} onFilter={(name,value)=>{setFilters(f=>({...f,[name]:value,page:0}));setSelected([]);}} onView={setView} onWeek={offset=>setWeek(d=>{const n=new Date(d);n.setDate(n.getDate()+offset*7);return n;})} onSelect={setSelected} onPage={page=>{setFilters(f=>({...f,page}));setSelected([]);}} onSize={size=>{setFilters(f=>({...f,size,page:0}));setSelected([]);}} onNew={()=>setEditor("new")} onAi={()=>navigate(`/recruiter/jobs/${job.id}/ai-interviews`)} onExport={format=>void exportFile(format)} onBulk={kind=>kind === "RESCHEDULE" ? setDetail({action:"shift"}) : run(()=>api.bulk(selected,"REMIND"))} onRemindPending={()=>run(async()=>{const rows=await allRows({jobId:Number(job.id),status:"PROPOSED"}); for(let i=0;i<rows.length;i+=100) await api.bulk(rows.slice(i,i+100).map(r=>r.id),"REMIND");})} onAction={action}/>
    {editor && options.data && <HumanInterviewScheduleDialog key={editor === "new" ? "new" : editor.id} jobId={Number(job.id)} options={options.data} existing={editor === "new" ? undefined : editor} variant={editor === "new" ? "modal" : "drawer"} onClose={closeEditor} onSaved={()=>{closeEditor();refresh();setMessage("Đã lưu lịch phỏng vấn.");}} onProfile={profile} onAiReport={()=>navigate(`/recruiter/jobs/${job.id}/cvs`)}/>}
    {editor && !options.data && <p role="status">Đang tải lựa chọn ứng viên và hội đồng…</p>}
    <DetailDialog open={!!detail} title={detail?.action === "profile" ? "Hồ sơ ứng viên" : detail?.action === "scorecard" ? "Scorecard phỏng vấn" : detail?.action === "preview" ? "Nội dung email" : detail?.action === "shift" ? "Đổi lịch hàng loạt" : "Hủy lịch phỏng vấn"} onClose={()=>setDetail(null)}>
      {detail?.action === "profile" && (applicant.isPending ? <p>Đang tải hồ sơ…</p> : applicant.error ? <p role="alert">{getApiErrorMessage(applicant.error)}</p> : <div className="space-y-3"><h3>{applicant.data?.data.candidateName}</h3><p>{applicant.data?.data.candidateEmail}</p><p>CV Screening: {applicant.data?.data.cvScreeningStatus ?? "Chưa có kết quả"}</p>{applicant.data?.data.cvs.map(cv=><div key={cv.id} className="flex items-center justify-between rounded-xl border p-3"><span>{cv.originalFilename} · {cv.status}</span><button disabled={cv.expired} onClick={()=>void cvApi.file(cv.id).then(blob=>downloadInterview(blob,cv.originalFilename)).catch(e=>setMessage(getApiErrorMessage(e)))}>Tải CV</button></div>)}{!applicant.data?.data.cvs.length && <p>Chưa có CV.</p>}</div>)}
      {detail?.action === "preview" && <>{preview.isPending ? <p>Đang tải…</p> : preview.error ? <p role="alert">{getApiErrorMessage(preview.error)}</p> : <><h3>{preview.data?.subject}</h3><pre className="whitespace-pre-wrap">{preview.data?.body}</pre></>}</>}
      {detail?.action === "cancel" && <><p>Hủy lịch của {detail.row?.candidateName}? Người tham gia sẽ nhận thông báo.</p><button disabled={mutation.isPending} onClick={()=>run(()=>api.cancel(detail.row!.id))}>Xác nhận hủy</button></>}
      {detail?.action === "shift" && <><label>Số phút dịch lịch (âm để sớm hơn)<input type="number" min={-10080} max={10080} value={shift} onChange={e=>setShift(Number(e.target.value))}/></label><button disabled={mutation.isPending || !Number.isInteger(shift)} onClick={()=>run(()=>api.bulk(selected,"RESCHEDULE",shift))}>Áp dụng cho {selected.length} lịch</button></>}
      {detail?.action === "scorecard" && <div className="space-y-4">{detail.row?.evaluations.map(e=><div key={e.id} className="rounded-xl border p-3"><b>{e.evaluatorName}: {e.overallScore}/100 · {e.recommendation}</b><p>{e.comments}</p></div>)}<form className="space-y-3" onSubmit={scores.handleSubmit(values=>run(()=>api.evaluate(detail.row!.id,values)))}>{(["technicalScore","communicationScore","cultureScore"] as const).map((name,index)=><label key={name} className="block">{["Kỹ thuật", "Giao tiếp", "Phù hợp văn hóa"][index]} (0–100)<input className="ml-3 rounded border p-2" type="number" min={0} max={100} {...scores.register(name)}/>{scores.formState.errors[name] && <span role="alert">Nhập điểm 0–100.</span>}</label>)}<textarea className="w-full rounded border p-2" placeholder="Nhận xét" maxLength={4000} {...scores.register("comments")}/><select {...scores.register("recommendation")}><option value="STRONG_HIRE">Rất nên tuyển</option><option value="HIRE">Nên tuyển</option><option value="NO_HIRE">Không tuyển</option><option value="STRONG_NO_HIRE">Không phù hợp</option></select><button className="ml-4 rounded border p-2" disabled={mutation.isPending}>Lưu Scorecard</button><p className="text-sm">Người thuộc hội đồng phỏng vấn lưu đánh giá sau khi buổi phỏng vấn kết thúc.</p></form></div>}
    </DetailDialog>
  </>;
}
