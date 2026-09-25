import { Link } from "react-router-dom";
import { ArrowRight, Bot, CalendarDays, Clock3 } from "lucide-react";
import { mockAiInterview } from "../constants/mockAiInterview";

export function InterviewsPage() {
  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header><h1 className="text-3xl font-semibold tracking-tight">AI Interview</h1><p className="mt-2 text-[var(--color-on-surface-variant)]">Lịch phỏng vấn AI và phiên phỏng vấn của bạn.</p></header>
      <p className="rounded-xl bg-[var(--color-primary-soft)] p-4 text-sm text-brand-primary">Bản trải nghiệm · Lịch, câu hỏi và transcript bên dưới là dữ liệu mẫu.</p>
      <article className="rounded-2xl border border-[var(--color-border-default)] bg-surface-card p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-3"><span className="rounded-xl bg-[var(--color-primary-soft)] p-3 text-brand-primary"><Bot aria-hidden="true" /></span><div><p className="text-sm text-brand-primary">AI Interview · #{mockAiInterview.id}</p><h2 className="mt-1 text-xl font-semibold">{mockAiInterview.title}</h2></div></div>
          <span className="rounded-full bg-[var(--color-primary-soft)] px-3 py-1 text-xs font-medium text-brand-primary">Sẵn sàng trải nghiệm</span>
        </div>
        <div className="my-6 flex flex-wrap gap-5 text-sm text-[var(--color-on-surface-variant)]"><span className="flex items-center gap-2"><CalendarDays className="size-4" aria-hidden="true" />{mockAiInterview.schedule}</span><span className="flex items-center gap-2"><Clock3 className="size-4" aria-hidden="true" />25 phút · 6 câu hỏi · Tiếng Việt</span></div>
        <Link to="/candidate/interviews/demo" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-brand-primary px-5 py-3 text-sm font-medium text-[var(--color-on-primary)] hover:bg-brand-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary">Vào AI Interview<ArrowRight className="size-4" aria-hidden="true" /></Link>
      </article>
    </section>
  );
}
