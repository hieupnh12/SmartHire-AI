import { Check, Circle, Info, Mic, Radio } from "lucide-react";
import { interviewQuestions } from "../constants/mockAiInterview";

export function InterviewProgress({ current, recording }: { current: number; recording: boolean }) {
  return <aside className="space-y-5">
    <section className="rounded-xl bg-surface-card p-5 shadow-sm">
      <div className="mb-5 flex items-center justify-between gap-2"><h2 className="font-semibold">Lộ trình phỏng vấn</h2><span className="text-xs text-brand-primary">{current}/06 hoàn thành</span></div>
      <ol className="space-y-3">
        {interviewQuestions.map((question, index) => {
          const Icon = index < current ? Check : index === current ? Radio : Circle;
          return <li key={question.topic} aria-current={index === current ? "step" : undefined} className={`flex items-start gap-3 rounded-lg p-3 ${index === current ? "bg-[var(--color-primary-soft)] ring-1 ring-inset ring-brand-primary/30" : "bg-surface-muted"}`}>
            <Icon aria-hidden="true" className={`mt-0.5 size-5 shrink-0 ${index <= current ? "text-brand-primary" : "text-[var(--color-outline)]"}`} />
            <div className="min-w-0 flex-1"><p className="text-sm font-medium">0{index + 1}. {question.topic}</p><p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">{index < current ? "Đã trả lời" : index === current ? "Đang trả lời" : `Ước tính: ~${question.duration}`}</p></div>
          </li>;
        })}
      </ol>
    </section>
    <section className="space-y-3 rounded-xl bg-surface-card p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-sm font-semibold"><Mic className="size-5 text-brand-primary" aria-hidden="true" />Mức tín hiệu Micro <span className="ml-auto text-xs text-brand-primary">Mô phỏng</span></h2>
      <p className="text-xs text-[var(--color-on-surface-variant)]">Thiết bị mẫu: Headset Realtek Audio HD Mic</p>
      <div className="h-3 overflow-hidden rounded-full bg-surface-muted"><div className={`h-full rounded-full bg-brand-primary transition-all ${recording ? "w-3/4 motion-safe:animate-pulse" : "w-0"}`} /></div>
      <div className="flex justify-between text-xs text-[var(--color-on-surface-variant)]"><span>-60 dB</span><span>-24 dB</span><span>-12 dB</span><span>0 dBFS</span></div>
    </section>
    <section className="space-y-3 rounded-xl bg-surface-card p-5 shadow-sm">
      <h2 className="flex items-center gap-2 text-sm font-semibold"><Info className="size-5 text-brand-primary" aria-hidden="true" />Quy định phòng phỏng vấn AI</h2>
      <p className="text-sm leading-6 text-[var(--color-on-surface-variant)]">Trả lời rõ ràng, tập trung vào kinh nghiệm thực tế. Phiên mẫu không chấm điểm và không thu âm hay truy cập camera. Nội dung chỉ được giữ trong phiên này, tải lại trang sẽ đặt lại dữ liệu.</p>
    </section>
  </aside>;
}
