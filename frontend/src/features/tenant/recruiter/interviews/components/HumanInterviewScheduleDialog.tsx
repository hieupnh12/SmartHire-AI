import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { humanInterviewApi } from "@/api/tenant/humanInterviewApi";
import { applicantApi } from "@/api/tenant/applicantApi";
import type { HumanInterview, InterviewOptions, SaveInterview } from "@/api/types/humanInterview";
import { useT, type TranslateFn } from "@/i18n";
import { getApiErrorMessage } from "@/lib/axios";
import { input } from "../../matching/components/rankingUi";
import { InterviewIcon as Icon, localDate, localTime } from "./humanInterviewUi";

function createSchema(t: TranslateFn) {
  return z.object({
    applicationId: z.coerce.number().positive(t("recruiter.interviews.human.scheduleDialog.schemaCandidate")),
    round: z.string().min(1),
    rubric: z.string().min(1),
    mode: z.enum(["ONLINE", "OFFLINE"]),
    provider: z.string().min(1),
    meetingUrl: z.string(),
    location: z.string(),
    date: z.string().min(1, t("recruiter.interviews.human.scheduleDialog.schemaDate")),
    time: z.string().min(1, t("recruiter.interviews.human.scheduleDialog.schemaTime")),
    duration: z.coerce.number().min(15).max(240),
    emailTemplate: z.string().min(1),
    notes: z.string().max(2000),
    attachCalendar: z.boolean(),
    participants: z
      .array(z.object({ userId: z.number().positive(), role: z.enum(["LEAD", "CO_INTERVIEWER", "NOTE_TAKER"]) }))
      .min(1, t("recruiter.interviews.human.scheduleDialog.schemaParticipants"))
      .max(10),
  }).superRefine((v, ctx) => {
    const start = new Date(`${v.date}T${v.time}`).getTime();
    if (!Number.isFinite(start) || start <= Date.now()) {
      ctx.addIssue({ code: "custom", path: ["date"], message: t("recruiter.interviews.human.scheduleDialog.schemaFuture") });
    }
    if (v.mode === "ONLINE" && v.provider !== "SMARTHIRE") {
      try {
        const url = new URL(v.meetingUrl);
        if (!["http:", "https:"].includes(url.protocol)) throw new Error();
      } catch {
        ctx.addIssue({ code: "custom", path: ["meetingUrl"], message: t("recruiter.interviews.human.scheduleDialog.schemaMeetingUrl") });
      }
    }
    if (v.mode === "OFFLINE" && !v.location.trim()) {
      ctx.addIssue({ code: "custom", path: ["location"], message: t("recruiter.interviews.human.scheduleDialog.schemaLocation") });
    }
    if (v.participants.filter((p) => p.role === "LEAD").length !== 1) {
      ctx.addIssue({ code: "custom", path: ["participants"], message: t("recruiter.interviews.human.scheduleDialog.schemaLead") });
    }
  });
}
type FormValues = z.infer<ReturnType<typeof createSchema>>;
type Props = {
  jobId: number;
  options: InterviewOptions;
  existing?: HumanInterview;
  /** When set (e.g. from Ranking), lock the candidate picker to this application. */
  lockedApplicationId?: number;
  variant?: "modal" | "drawer";
  onClose: () => void;
  onSaved: (draft: boolean) => void;
  onProfile: (id: number) => void;
  onAiReport: () => void;
};

export function HumanInterviewScheduleDialog({ jobId, options, existing, lockedApplicationId, variant = "modal", onClose, onSaved, onProfile, onAiReport }: Props) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const schema = useMemo(() => createSchema(t), [t]);
  const start = existing ? new Date(existing.configuration.requestedStart ?? existing.start) : new Date(Date.now() + 86400000);
  const lockedId = existing?.applicationId ?? lockedApplicationId;
  const form = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: {
    applicationId: lockedId ?? options.candidates[0]?.applicationId ?? 0,
    round: existing?.round ?? "TECHNICAL", rubric: existing?.configuration.rubric ?? "TECHNICAL", mode: existing?.mode ?? "ONLINE",
    provider: existing?.configuration.provider === "OFFICE" ? "SMARTHIRE" : existing?.configuration.provider ?? "SMARTHIRE",
    meetingUrl: existing?.meetingUrl ?? "", location: existing?.location ?? "", date: localDate(start), time: localTime(start),
    duration: existing ? Math.round((new Date(existing.end).getTime() - new Date(existing.start).getTime()) / 60000) : 60,
    emailTemplate: existing?.configuration.emailTemplate ?? "STANDARD", notes: existing?.configuration.notes ?? "", attachCalendar: existing?.configuration.attachCalendar ?? true,
    participants: existing?.participants.map(p => ({ userId:p.userId, role:p.role })) ?? (options.interviewers[0] ? [{ userId:options.interviewers[0].userId, role:"LEAD" }] : []),
  } });
  const values = form.watch();
  const candidate = options.candidates.find(c => c.applicationId === values.applicationId);
  const profile = useQuery({ queryKey:["applications",values.applicationId], queryFn:() => applicantApi.get(values.applicationId), enabled:!!values.applicationId });
  const save = useMutation({
    mutationFn: ({ body }: { body: SaveInterview }) => humanInterviewApi.save(body, existing?.id),
    onSuccess: (_data, vars) => onSaved(vars.body.draft),
    onError: e => setError(getApiErrorMessage(e)),
  });
  const check = useMutation({ mutationFn:() => {
    const start = new Date(`${values.date}T${values.time}`);
    return humanInterviewApi.availability({ jobId, start:start.toISOString(), end:new Date(start.getTime()+values.duration*60000).toISOString(), userIds:[...values.participants.map(p => p.userId), ...(candidate ? [candidate.candidateId] : [])], excludeId:existing?.id });
  }, onError:e => setError(getApiErrorMessage(e)) });
  const resetAvailability = check.reset;
  useEffect(() => { resetAvailability(); }, [values.date, values.time, values.duration, values.applicationId, resetAvailability]);
  const previewPlace = values.mode === "ONLINE"
    ? (values.provider === "SMARTHIRE" ? t("recruiter.interviews.human.scheduleDialog.smartHireWebRoom") : values.meetingUrl)
    : values.location;
  const preview = t("recruiter.interviews.human.scheduleDialog.previewBody", {
    name: candidate?.name ?? t("recruiter.interviews.human.scheduleDialog.candidatePlaceholderName"),
    round: options.rounds.find((r) => r.code === values.round)?.label ?? t("recruiter.interviews.human.scheduleDialog.genericRound"),
    jobTitle: candidate?.jobTitle ?? "",
    time: values.time,
    date: values.date,
    place: previewPlace,
  });
  const [showPreview, setShowPreview] = useState(false);
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow; document.body.style.overflow="hidden";
    ref.current?.querySelector<HTMLButtonElement>("button")?.focus();
    const onKey = (e:KeyboardEvent) => {
      if (document.querySelector('[aria-labelledby="detail-dialog-title"]')) return;
      if (e.key === "Escape") onClose();
      if (e.key !== "Tab") return;
      const nodes = Array.from(ref.current?.querySelectorAll<HTMLElement>("button, input, select, textarea, a[href]") ?? []).filter(n => !n.hasAttribute("disabled") && n.getClientRects().length > 0);
      const first = nodes[0], last = nodes[nodes.length-1];
      if (e.shiftKey && document.activeElement===first) { e.preventDefault();last?.focus(); }
      if (!e.shiftKey && document.activeElement===last) { e.preventDefault();first?.focus(); }
    };
    document.addEventListener("keydown",onKey);
    return () => { document.removeEventListener("keydown",onKey); document.body.style.overflow=overflow;previous?.focus(); };
  },[onClose]);
  const submit = (draft:boolean) => void form.handleSubmit(v => {
    setError(null); const start = new Date(`${v.date}T${v.time}`);
    const provider = v.mode === "OFFLINE" ? "OFFICE" : v.provider;
    save.mutate({ body:{ jobId, applicationId:v.applicationId, round:v.round, rubric:v.rubric, mode:v.mode, provider,
      start:start.toISOString(),end:new Date(start.getTime()+v.duration*60000).toISOString(),
      meetingUrl: provider === "SMARTHIRE" ? "" : v.meetingUrl, location:v.location, emailTemplate:v.emailTemplate, notes:v.notes, attachCalendar:v.attachCalendar, smsReminder:false, draft, participants:v.participants } });
  })();
  const section = "bg-surface-container-lowest p-space-lg rounded-xl shadow-sm flex flex-col gap-space-md";
  const heading = (number:number, title:string) => <h3 className="flex items-center gap-space-sm font-headline-sm text-headline-sm"><span className="w-6 h-6 rounded-full bg-primary-fixed text-primary text-label-sm flex items-center justify-center">{number}</span>{title}</h3>;
  const err = (name:keyof FormValues) => form.formState.errors[name] && <p role="alert" className="text-error text-body-sm">{form.formState.errors[name]?.message}</p>;
  return <div className="human-interview-reference"><div className={`fixed inset-0 z-[100] flex ${variant==="drawer"?"justify-end":"items-center justify-center p-space-md sm:p-space-lg"} bg-inverse-surface/40 backdrop-blur-md`} onClick={e => { if (e.target===e.currentTarget && !save.isPending) onClose(); }}>
    <div ref={ref} role="dialog" aria-modal="true" aria-labelledby="human-schedule-title" className={`w-full ${variant==="drawer"?"max-w-[620px] h-full":"max-w-4xl max-h-[90vh] rounded-2xl"} bg-surface-container-lowest shadow-2xl overflow-hidden flex flex-col text-on-surface`}>
      <header className="px-space-xl py-space-lg flex items-start justify-between gap-space-md"><div className="flex items-start gap-space-md"><span className="w-12 h-12 rounded-xl bg-tertiary-fixed text-tertiary flex items-center justify-center shrink-0"><Icon name="calendar_add_on" className="text-[28px]" /></span><div><div className="flex flex-wrap items-center gap-space-xs"><h2 id="human-schedule-title" className="font-headline-lg text-headline-lg">{existing ? t("recruiter.interviews.human.scheduleDialog.titleEdit") : t("recruiter.interviews.human.scheduleDialog.titleCreate")}</h2><span className="px-space-xs py-0.5 rounded-full bg-surface-container-high text-primary text-label-sm">{t("recruiter.interviews.human.scheduleDialog.badge")}</span></div><p className="text-body-md text-on-surface-variant">{t("recruiter.interviews.human.scheduleDialog.subtitle")}</p></div></div><button type="button" aria-label={t("recruiter.interviews.human.scheduleDialog.closeAria")} onClick={onClose} disabled={save.isPending}><Icon name="close" className="text-[22px]" /></button></header>
      <form className="p-space-xl overflow-y-auto flex flex-col gap-space-xl bg-surface" onSubmit={e => { e.preventDefault();submit(false); }}>
        {error && <p role="alert" className="p-space-md rounded-lg bg-error-container text-on-error-container">{error}</p>}
        <section className={section}>{heading(1, t("recruiter.interviews.human.scheduleDialog.sec1Title"))}
          <label className="text-label-lg font-semibold">{t("recruiter.interviews.human.scheduleDialog.candidateLabel")}<select aria-label={t("recruiter.interviews.human.scheduleDialog.candidateLabel")} disabled={!!existing || !!lockedApplicationId} className={`${input} mt-1`} {...form.register("applicationId", { valueAsNumber: true })}>{!options.candidates.length && <option value={0}>{t("recruiter.interviews.human.scheduleDialog.noEligibleOption")}</option>}{options.candidates.map(c => <option key={c.applicationId} value={c.applicationId}>{c.name} — {c.jobTitle}</option>)}</select>{err("applicationId")}{lockedApplicationId && !options.candidates.some(c => c.applicationId === lockedApplicationId) && <p role="alert" className="text-error text-body-sm">{t("recruiter.interviews.human.scheduleDialog.ineligibleWarning")}</p>}</label>
          <div className="p-space-md bg-surface-container-low rounded-xl flex flex-wrap items-center justify-between gap-space-md"><div className="flex items-center gap-space-md"><span className="w-12 h-12 rounded-full bg-primary text-on-primary flex items-center justify-center">{candidate?.name.split(" ").map(n=>n[0]).slice(-2).join("") ?? "—"}</span><div><p className="font-headline-sm text-headline-sm font-semibold">{candidate?.name ?? t("recruiter.interviews.human.scheduleDialog.selectCandidatePlaceholder")}</p><span className="text-primary text-label-sm">{t("recruiter.interviews.human.scheduleDialog.cvScreeningPrefix", { status: profile.data?.data.cvScreeningStatus ?? t("recruiter.interviews.human.scheduleDialog.noResult") })}{profile.data?.data.gateScore ? ` · ${profile.data.data.gateScore.score}/100` : ""}</span><p className="text-body-sm text-on-surface-variant">{candidate?.email} · {candidate?.jobTitle}</p></div></div><div className="flex gap-space-xs"><button type="button" className="px-space-sm py-1 rounded bg-surface-container text-label-sm" onClick={()=>onProfile(values.applicationId)} disabled={!candidate}><Icon name="visibility" /> {t("recruiter.interviews.human.scheduleDialog.cvProfileBtn")}</button><button type="button" className="px-space-sm py-1 rounded bg-surface-container text-tertiary text-label-sm" onClick={onAiReport}><Icon name="smart_toy" /> {t("recruiter.interviews.human.scheduleDialog.aiReportBtn")}</button></div></div>
          <div className="grid md:grid-cols-2 gap-space-md"><label className="text-label-lg font-semibold">{t("recruiter.interviews.human.scheduleDialog.roundLabel")}<select className={input} {...form.register("round")}>{options.rounds.map(r=><option key={r.code} value={r.code}>{r.label}</option>)}</select></label><label className="text-label-lg font-semibold">{t("recruiter.interviews.human.scheduleDialog.rubricLabel")}<select className={input} {...form.register("rubric")}>{options.rubrics.map(r=><option key={r.code} value={r.code}>{r.label}</option>)}</select><span className="text-body-sm text-outline">{t("recruiter.interviews.human.scheduleDialog.rubricHint")}</span></label></div>
        </section>
        <section className={section}>{heading(2, t("recruiter.interviews.human.scheduleDialog.sec2Title"))}<p className="text-label-sm text-tertiary">{t("recruiter.interviews.human.scheduleDialog.timezoneLabel", { tz: Intl.DateTimeFormat().resolvedOptions().timeZone })}</p>
          <div className="grid md:grid-cols-2 gap-space-md">{(["ONLINE","OFFLINE"] as const).map(mode=><label key={mode} className={`cursor-pointer p-space-md rounded-xl bg-surface-container-low ${values.mode===mode?"ring-2 ring-primary":""}`}><input type="radio" value={mode} {...form.register("mode")} /> <Icon name={mode==="ONLINE"?"videocam":"apartment"} /> <span className="font-semibold">{mode==="ONLINE" ? t("recruiter.interviews.human.scheduleDialog.modeOnlineTitle") : t("recruiter.interviews.human.scheduleDialog.modeOfflineTitle")}</span><p className="text-body-sm text-outline">{mode==="ONLINE" ? t("recruiter.interviews.human.scheduleDialog.modeOnlineDesc") : t("recruiter.interviews.human.scheduleDialog.modeOfflineDesc")}</p></label>)}</div>
          {values.mode==="ONLINE"?<div className="p-space-md bg-surface-container-low rounded-xl space-y-space-sm"><div className="flex flex-wrap justify-between gap-space-sm"><label htmlFor="human-meeting" className="text-label-md font-semibold">{t("recruiter.interviews.human.scheduleDialog.onlineRoomLabel")}</label><select aria-label={t("recruiter.interviews.human.scheduleDialog.providerAria")} {...form.register("provider")} className="rounded bg-surface-container-lowest text-label-sm"><option value="SMARTHIRE">{t("recruiter.interviews.human.scheduleDialog.providerSmartHire")}</option><option value="GOOGLE_MEET">{t("recruiter.interviews.human.scheduleDialog.providerGoogleMeet")}</option><option value="ZOOM">{t("recruiter.interviews.human.scheduleDialog.providerZoom")}</option><option value="TEAMS">{t("recruiter.interviews.human.scheduleDialog.providerTeams")}</option></select></div>{values.provider==="SMARTHIRE"?<p className="text-body-sm text-outline">{t("recruiter.interviews.human.scheduleDialog.smartHireRoomHint")}</p>:<><div className="flex gap-space-xs mt-2"><input id="human-meeting" className={input} placeholder={t("recruiter.interviews.human.scheduleDialog.meetingPlaceholder")} {...form.register("meetingUrl")} /><button type="button" aria-label={t("recruiter.interviews.human.scheduleDialog.copyLinkAria")} onClick={()=>void navigator.clipboard?.writeText(values.meetingUrl).catch(()=>setError(t("recruiter.interviews.human.scheduleDialog.copyLinkError")))}><Icon name="content_copy" /></button></div>{err("meetingUrl")}<p className="text-body-sm text-outline">{t("recruiter.interviews.human.scheduleDialog.externalLinkHint")}</p></>}</div>:<label className="text-label-lg">{t("recruiter.interviews.human.scheduleDialog.locationLabel")}<input className={input} {...form.register("location")} />{err("location")}</label>}
          <div className="grid md:grid-cols-3 gap-space-md"><label className="text-label-lg">{t("recruiter.interviews.human.scheduleDialog.dateLabel")}<input type="date" className={input} {...form.register("date")} />{err("date")}</label><label className="text-label-lg">{t("recruiter.interviews.human.scheduleDialog.timeLabel")}<input type="time" className={input} {...form.register("time")} /></label><label className="text-label-lg">{t("recruiter.interviews.human.scheduleDialog.durationLabel")}<input type="number" min={15} max={240} className={input} {...form.register("duration", { valueAsNumber: true })} /><div className="flex gap-1 mt-1">{[30,45,60,90].map(d=><button type="button" key={d} className={`px-2 py-1 rounded text-label-sm ${values.duration===d?"bg-primary text-on-primary":"bg-surface-container-low"}`} onClick={()=>form.setValue("duration",d)}>{t("recruiter.interviews.human.scheduleDialog.minuteShort", { minutes: d })}</button>)}</div>{err("duration")}</label></div>
        </section>
        <section className={section}>{heading(3, t("recruiter.interviews.human.scheduleDialog.sec3Title"))}
          <select aria-label={t("recruiter.interviews.human.scheduleDialog.addParticipantAria")} className={input} value="" onChange={e=>{ const id=Number(e.target.value);if(id && !values.participants.some(p=>p.userId===id)) { form.setValue("participants",[...values.participants,{userId:id,role:values.participants.length?"CO_INTERVIEWER":"LEAD"}]);check.reset(); } }}><option value="">{t("recruiter.interviews.human.scheduleDialog.addParticipantOption")}</option>{options.interviewers.filter(p=>!values.participants.some(v=>v.userId===p.userId)).map(p=><option key={p.userId} value={p.userId}>{p.name} — {p.email}</option>)}</select>
          {values.participants.map((p,index)=>{ const user=options.interviewers.find(u=>u.userId===p.userId);return <div key={p.userId} className="p-space-sm bg-surface-container-low rounded-xl flex flex-wrap items-center justify-between gap-space-sm"><div><p className="font-semibold">{user?.name ?? t("recruiter.interviews.human.scheduleDialog.userFallback", { id: p.userId })}</p><p className="text-body-sm text-outline">{user?.email}</p></div><div className="flex items-center gap-space-sm"><select className="rounded bg-surface-container-lowest text-label-sm" {...form.register(`participants.${index}.role`)}><option value="LEAD">{t("recruiter.interviews.human.scheduleDialog.roleLead")}</option><option value="CO_INTERVIEWER">{t("recruiter.interviews.human.scheduleDialog.roleCoInterviewer")}</option><option value="NOTE_TAKER">{t("recruiter.interviews.human.scheduleDialog.roleNoteTaker")}</option></select><span className="text-label-sm text-primary">{check.data ? check.data.conflicts.some(c=>c.userIds.includes(p.userId)) ? t("recruiter.interviews.human.scheduleDialog.statusConflict") : t("recruiter.interviews.human.scheduleDialog.statusAvailable") : t("recruiter.interviews.human.scheduleDialog.statusUnchecked")}</span><button type="button" aria-label={t("recruiter.interviews.human.scheduleDialog.removeParticipantAria", { name: user?.name ?? p.userId })} onClick={()=>{form.setValue("participants",values.participants.filter(v=>v.userId!==p.userId));check.reset();}}><Icon name="remove_circle_outline" /></button></div></div>;})}{err("participants")}
          <button type="button" className="text-primary text-label-sm font-semibold" disabled={check.isPending || !candidate || !values.participants.length} onClick={()=>{setError(null);if(Number.isFinite(new Date(`${values.date}T${values.time}`).getTime())) check.mutate();else setError(t("recruiter.interviews.human.scheduleDialog.invalidDateTimeError"));}}>{t("recruiter.interviews.human.scheduleDialog.checkAvailabilityBtn")}</button>
          {check.data && <p role="status" className={check.data.available?"text-primary text-body-sm":"text-error text-body-sm"}>{check.data.available ? t("recruiter.interviews.human.scheduleDialog.availabilityAllFree") : t("recruiter.interviews.human.scheduleDialog.availabilityConflict")}</p>}
        </section>
        <section className={section}>{heading(4, t("recruiter.interviews.human.scheduleDialog.sec4Title"))}<label className="text-label-lg font-semibold">{t("recruiter.interviews.human.scheduleDialog.emailTemplateLabel")}<select className={input} {...form.register("emailTemplate")}>{options.emailTemplates.map(tpl=><option key={tpl.code} value={tpl.code}>{tpl.label}</option>)}</select></label><button type="button" className="text-primary text-label-sm" onClick={()=>setShowPreview(!showPreview)}><Icon name="visibility" /> {t("recruiter.interviews.human.scheduleDialog.previewEmailBtn")}</button>{showPreview && <pre className="whitespace-pre-wrap rounded-lg bg-surface-container-low p-space-md text-body-sm">{preview}</pre>}
          <label className="text-label-lg font-semibold">{t("recruiter.interviews.human.scheduleDialog.notesLabel")}<textarea className={`${input} min-h-24`} {...form.register("notes")} placeholder={t("recruiter.interviews.human.scheduleDialog.notesPlaceholder")} />{err("notes")}</label>
          <label className="flex items-center gap-space-sm text-body-md"><input type="checkbox" {...form.register("attachCalendar")} />{t("recruiter.interviews.human.scheduleDialog.attachCalendarLabel")}</label><label className="flex items-center gap-space-sm text-body-md text-outline"><input type="checkbox" disabled />{t("recruiter.interviews.human.scheduleDialog.znsSmsDisabledLabel")}</label>
        </section>
      </form>
      <footer className="px-space-xl py-space-md flex flex-wrap justify-between items-center gap-space-md border-t border-[var(--color-border-default)]"><span className="text-body-sm text-outline"><Icon name="verified_user" /> {t("recruiter.interviews.human.scheduleDialog.securityNote")}</span><div className="flex flex-wrap gap-space-sm"><button type="button" disabled={save.isPending} className="h-10 px-space-md rounded-lg text-on-surface-variant hover:bg-surface-container" onClick={onClose}>{t("recruiter.interviews.human.scheduleDialog.cancelBtn")}</button><button type="button" disabled={save.isPending || !candidate} className="h-10 px-space-md rounded-lg bg-surface-container disabled:opacity-50" onClick={()=>submit(true)}>{t("recruiter.interviews.human.scheduleDialog.saveDraftBtn")}</button><button type="button" disabled={save.isPending || !candidate} className="h-10 px-space-lg rounded-lg bg-primary text-on-primary font-semibold disabled:opacity-50" onClick={()=>submit(false)}><Icon name="send" /> {save.isPending ? t("recruiter.interviews.human.scheduleDialog.savingBtn") : t("recruiter.interviews.human.scheduleDialog.confirmSendBtn")}</button></div></footer>
    </div>
  </div></div>;
}
