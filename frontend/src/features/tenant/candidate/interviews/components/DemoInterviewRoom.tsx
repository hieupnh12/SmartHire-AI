import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Bot, CheckCircle2, Circle, Clock3, Headphones, Info, Mic, Pause, Play, Send, ShieldCheck, Sparkles, Timer, Volume2, Wifi } from "lucide-react";
import { Button } from "@/components/ux/Button";
import { cn } from "@/lib/utils";
import { mockInterviewInvitation } from "../constants/mockInterviewInvitation";

type Phase = "intro" | "active" | "complete";
type VoiceAnswer = { duration: number; audioUrl: string };
const processes = ["Technical Knowledge", "Problem Solving", "Practical Experience", "Technical Reasoning", "Behavioral", "Communication"];
const bars = [20, 45, 70, 34, 82, 52, 28, 64, 38, 76, 48, 88, 30, 58, 72, 42, 80, 36, 66, 26, 74, 50, 84, 32];

export function DemoInterviewRoom() {
  const questions = mockInterviewInvitation.questions;
  const [phase, setPhase] = useState<Phase>("intro");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, VoiceAnswer>>({});
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const [micError, setMicError] = useState<string | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const stream = useRef<MediaStream | null>(null);
  const chunks = useRef<Blob[]>([]);
  const question = questions[current];
  const saved = Object.keys(answers).length;
  const processIndex = current < 2 ? 0 : current < 4 ? 1 : 2;

  useEffect(() => {
    if (!recording || paused) return;
    const timer = window.setInterval(() => setSeconds(value => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [paused, recording]);

  useEffect(() => () => {
    window.speechSynthesis?.cancel();
    stream.current?.getTracks().forEach(track => track.stop());
  }, []);

  function readQuestion() {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const speech = new SpeechSynthesisUtterance(question.questionText);
    speech.lang = "vi-VN";
    speech.rate = 0.92;
    window.speechSynthesis.speak(speech);
  }

  async function startRecording() {
    setMicError(null);
    try {
      const media = await navigator.mediaDevices.getUserMedia({ audio: true });
      const nextRecorder = new MediaRecorder(media);
      stream.current = media;
      recorder.current = nextRecorder;
      chunks.current = [];
      setSeconds(0);
      nextRecorder.ondataavailable = event => { if (event.data.size) chunks.current.push(event.data); };
      nextRecorder.start();
      setRecording(true);
      setPaused(false);
    } catch {
      setMicError("Không thể mở microphone. Hãy cấp quyền mic cho trình duyệt rồi thử lại.");
    }
  }

  function togglePause() {
    if (!recorder.current) return;
    if (paused) recorder.current.resume(); else recorder.current.pause();
    setPaused(value => !value);
  }

  function submitAnswer() {
    const active = recorder.current;
    if (!active) return;
    active.onstop = () => {
      const blob = new Blob(chunks.current, { type: active.mimeType || "audio/webm" });
      const oldUrl = answers[question.id]?.audioUrl;
      if (oldUrl) URL.revokeObjectURL(oldUrl);
      setAnswers(previous => ({ ...previous, [question.id]: { duration: seconds, audioUrl: URL.createObjectURL(blob) } }));
      stream.current?.getTracks().forEach(track => track.stop());
      recorder.current = null;
      stream.current = null;
      setRecording(false);
      setPaused(false);
      if (current < questions.length - 1) setCurrent(value => value + 1);
    };
    active.stop();
  }

  function selectQuestion(index: number) {
    if (recording) return;
    window.speechSynthesis?.cancel();
    setCurrent(index);
    setSeconds(0);
  }

  if (phase === "intro") return <Intro onStart={() => setPhase("active")} />;
  if (phase === "complete") return <Complete answered={saved} total={questions.length} />;

  return <main className="min-h-[100dvh] bg-[var(--color-surface-container-low)] p-3 text-[var(--color-on-surface)] sm:p-5">
    <section className="mx-auto max-w-[1500px] space-y-3">
      <div role="status" className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary-subtle)] px-4 py-2.5 text-xs sm:text-sm"><span><strong>Bản xem trước Voice Interview:</strong> âm thanh chỉ lưu cục bộ trên trình duyệt.</span><span className="hidden rounded-full bg-white px-3 py-1 font-semibold text-[var(--color-primary)] sm:inline">DEMO</span></div>
      <header className="rounded-2xl border border-[var(--color-border-default)] bg-white p-4 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"><div className="flex items-center gap-3"><span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--color-primary)] text-white"><Headphones className="size-5" aria-hidden="true" /></span><div><p className="text-xs text-[var(--color-on-surface-variant)]">Phòng phỏng vấn AI</p><h1 className="font-semibold">{mockInterviewInvitation.jobTitle}</h1><p className="text-xs text-[var(--color-on-surface-variant)]">Ứng viên: Nguyễn Văn An · Java Backend Engineer</p></div></div><div className="flex flex-wrap items-center gap-2 text-xs"><span className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[var(--color-primary-subtle)] px-3 font-semibold text-[var(--color-primary)]"><Circle className="size-2.5 fill-current" aria-hidden="true" />Sophia AI 4.5 · Đang phỏng vấn</span><Meta icon={Timer} label="Thời lượng" value="45 phút" /><Meta icon={Clock3} label="Còn lại" value="42:18" /><Button variant="danger" size="sm" onClick={() => setPhase("complete")}>Rời phòng</Button></div></div>
      </header>

      <section className="grid gap-2 md:grid-cols-3" aria-label="Quy trình tuyển dụng"><Stage state="done" title="Vòng 1: CV Screening" detail="Khớp hồ sơ · 82/100" /><Stage state="active" title="Vòng 2: AI Interview" detail="Đang thực hiện · Voice mode" /><Stage state="locked" title="Vòng 3: Assessment" detail="Mở sau khi AI Interview đạt" /></section>

      <section className="rounded-2xl border border-[var(--color-border-default)] bg-white p-3 shadow-[var(--shadow-card)]">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-sm font-semibold">Lộ trình AI Interview · 6 quy trình</h2><p className="text-xs text-[var(--color-on-surface-variant)]">AI đọc câu hỏi, lắng nghe và tạo câu hỏi bám đuổi.</p></div><span className="rounded-full bg-[var(--color-primary-subtle)] px-3 py-1 text-xs font-semibold text-[var(--color-primary)]">Quy trình {processIndex + 1}</span></div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">{processes.map((name, index) => <div key={name} className={cn("min-h-20 rounded-xl border p-3", index === processIndex ? "border-[var(--color-primary)] bg-[var(--color-primary-subtle)] ring-1 ring-[var(--color-primary)]/20" : index < processIndex ? "border-emerald-200 bg-emerald-50/50" : "border-[var(--color-border-default)] bg-[var(--color-surface-container-low)]")}><div className="flex justify-between text-[10px] font-semibold"><span>{index === processIndex ? "ĐANG THI" : index < processIndex ? "HOÀN TẤT" : `VÒNG ${index + 1}`}</span><span>0{index + 1}</span></div><p className="mt-2 truncate text-xs font-semibold">{name}</p><p className="mt-1 text-[10px] text-[var(--color-on-surface-variant)]">{index < 2 ? "2 câu hỏi" : "1 câu hỏi"}</p></div>)}</div>
      </section>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(300px,.75fr)]">
        <section className="space-y-4">
          <article className="overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-white shadow-[var(--shadow-card)]"><div className="flex flex-col gap-3 border-b border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[var(--color-primary)] font-semibold text-white">Q{current + 1}</span><div><p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-primary)]">Quy trình {processIndex + 1}: {question.stageTitle}</p><h2 className="text-sm font-semibold">Câu hỏi {current + 1}/{questions.length}</h2></div></div><span className="font-mono text-xs text-[var(--color-on-surface-variant)]">Thời gian: 02:45</span></div><div className="space-y-4 p-5 sm:p-6"><div className="flex items-center justify-between gap-3"><p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">Câu hỏi được AI đọc</p><Button variant="secondary" size="sm" onClick={readQuestion}><Volume2 className="size-4" aria-hidden="true" />Nghe lại</Button></div><p className="text-lg font-semibold leading-8">“{question.questionText}”</p><div className="rounded-xl bg-[var(--color-surface-container-low)] p-3 text-xs italic leading-5 text-[var(--color-on-surface-variant)]">AI phân tích độ rõ ràng, chiều sâu kỹ thuật, ví dụ thực tế và cách lập luận về trade-off.</div></div></article>
          <article className="rounded-2xl border border-[var(--color-primary)]/30 bg-white p-5 shadow-[var(--shadow-card)]"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">Dynamic follow-up</p><h3 className="mt-1 text-sm font-semibold">Sophia AI sẽ tạo câu hỏi bám đuổi từ câu trả lời của bạn.</h3></div><span className="rounded-full bg-[var(--color-primary-subtle)] px-3 py-1 text-xs text-[var(--color-primary)]">Speech-to-Speech</span></div></article>
          <article className="rounded-2xl border border-[var(--color-border-default)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><span className={cn("size-2.5 rounded-full", recording && !paused ? "animate-pulse bg-red-500" : "bg-[var(--color-outline-variant)]")} /><div><h3 className="text-sm font-semibold">{recording ? paused ? "Đã tạm dừng ghi âm" : "Đang thu âm giọng nói trực tiếp" : answers[question.id] ? "Đã lưu câu trả lời bằng giọng nói" : "Sẵn sàng ghi âm câu trả lời"}</h3><p className="text-xs text-[var(--color-on-surface-variant)]">Microphone · Tiếng Việt</p></div></div><span className="font-mono text-sm font-semibold">{formatTime(seconds || answers[question.id]?.duration || 0)} / 03:00</span></div>
            <div className="mt-5 flex h-24 items-center gap-1 overflow-hidden rounded-xl bg-[var(--color-primary-subtle)] px-4" aria-label="Dạng sóng âm thanh">{bars.map((height, index) => <span key={index} className={cn("w-full max-w-1.5 rounded-full bg-[var(--color-primary)]", recording && !paused ? "animate-pulse opacity-90" : "opacity-25")} style={{ height: `${height}%`, animationDelay: `${index * 45}ms` }} />)}</div>
            {answers[question.id] && !recording && <audio className="mt-4 w-full" controls src={answers[question.id].audioUrl}>Trình duyệt không hỗ trợ âm thanh.</audio>}
            {micError && <p className="mt-3 text-sm text-[var(--color-error)]" role="alert">{micError}</p>}
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">{!recording ? <Button variant="secondary" onClick={() => void startRecording()}><Mic className="size-4" aria-hidden="true" />{answers[question.id] ? "Thu âm lại" : "Bắt đầu trả lời"}</Button> : <Button variant="secondary" onClick={togglePause}>{paused ? <Play className="size-4" aria-hidden="true" /> : <Pause className="size-4" aria-hidden="true" />}{paused ? "Tiếp tục" : "Tạm dừng"}</Button>}<Button disabled={!recording || seconds < 1} onClick={submitAnswer}><Send className="size-4" aria-hidden="true" />Nộp câu {current + 1} & tiếp tục<ArrowRight className="size-4" aria-hidden="true" /></Button></div>
          </article>
          <div className="flex justify-between gap-3"><Button variant="secondary" disabled={current === 0 || recording} onClick={() => selectQuestion(current - 1)}><ArrowLeft className="size-4" aria-hidden="true" />Câu trước</Button><Button variant="secondary" disabled={current === questions.length - 1 || recording} onClick={() => selectQuestion(current + 1)}>Câu tiếp theo<ArrowRight className="size-4" aria-hidden="true" /></Button></div>
        </section>

        <aside className="space-y-4 lg:sticky lg:top-4">
          <section className="rounded-2xl border border-[var(--color-border-default)] bg-white p-6 text-center shadow-[var(--shadow-card)]"><span className="relative mx-auto grid size-20 place-items-center rounded-full border-2 border-[var(--color-primary)] bg-[var(--color-primary-subtle)] text-[var(--color-primary)]"><Bot className="size-9" aria-hidden="true" /><span className="absolute -right-1 -top-1 size-4 rounded-full border-2 border-white bg-emerald-500" /></span><span className="mt-3 inline-flex items-center gap-1 rounded-full bg-[var(--color-primary-subtle)] px-2 py-1 text-[10px] font-semibold text-[var(--color-primary)]"><Sparkles className="size-3" aria-hidden="true" />Sophia 4.5</span><h2 className="mt-3 font-semibold">AI Lead Interviewer Sophia</h2><p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">Chuyên gia Kiến trúc Hệ thống & Giám định Năng lực CV</p><div className="mt-5 grid grid-cols-2 gap-2 text-left"><Signal icon={Mic} label="Tín hiệu mic" value={recording ? "Đang thu" : "Sẵn sàng"} /><Signal icon={Wifi} label="Độ trễ mạng" value="22 ms · Tốt" /></div></section>
          <section className="rounded-2xl border border-[var(--color-border-default)] bg-white p-5 shadow-[var(--shadow-card)]"><h2 className="flex items-center gap-2 text-sm font-semibold"><Info className="size-4 text-[var(--color-primary)]" aria-hidden="true" />AI đang đánh giá</h2><ul className="mt-3 space-y-3 text-xs leading-5 text-[var(--color-on-surface-variant)]">{["Độ chính xác và chiều sâu kỹ thuật", "Cấu trúc lập luận và trade-off", "Kinh nghiệm thực tế đối chiếu CV", "Giao tiếp rõ ràng bằng giọng nói"].map(text => <li key={text} className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden="true" />{text}</li>)}</ul></section>
          <section className="rounded-2xl border border-[var(--color-border-default)] bg-white p-4 shadow-[var(--shadow-card)]"><h2 className="text-sm font-semibold">Các câu trong phiên</h2><div className="mt-3 grid grid-cols-5 gap-2">{questions.map((item, index) => <button key={item.id} type="button" disabled={recording} onClick={() => selectQuestion(index)} aria-label={`Mở câu ${index + 1}`} aria-current={current === index ? "step" : undefined} className={cn("grid aspect-square place-items-center rounded-lg border text-xs font-semibold", current === index ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white" : answers[item.id] ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-[var(--color-border-default)] bg-[var(--color-surface-container-low)]")}>{answers[item.id] ? <CheckCircle2 className="size-4" aria-hidden="true" /> : index + 1}</button>)}</div></section>
        </aside>
      </div>
    </section>
  </main>;
}

function Intro({ onStart }: { onStart: () => void }) { return <main className="grid min-h-[100dvh] place-items-center bg-[var(--color-surface-container-low)] p-4"><section className="w-full max-w-4xl overflow-hidden rounded-3xl border border-[var(--color-border-default)] bg-white shadow-[var(--shadow-ambient)]"><div className="bg-[linear-gradient(135deg,var(--color-primary-subtle),white_70%)] p-7 sm:p-9"><span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[var(--color-primary)]">VOICE INTERVIEW DEMO</span><h1 className="mt-4 text-2xl font-semibold sm:text-3xl">Phỏng vấn trực tiếp với Sophia AI</h1><p className="mt-2 text-[var(--color-on-surface-variant)]">AI đọc câu hỏi và ứng viên trả lời bằng giọng nói.</p></div><div className="grid gap-6 p-7 sm:p-9 md:grid-cols-2"><div className="space-y-4"><InfoRow icon={Volume2} title="AI đọc câu hỏi" text="Có thể nghe lại trước khi trả lời" /><InfoRow icon={Mic} title="Trả lời bằng giọng nói" text="Mic chỉ bật khi bạn cho phép" /><InfoRow icon={ShieldCheck} title="Demo cục bộ" text="Không tải âm thanh lên backend" /></div><div className="rounded-2xl bg-[var(--color-surface-container-low)] p-5"><h2 className="font-semibold">Kiểm tra trước khi vào phòng</h2><ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-[var(--color-on-surface-variant)]"><li>Cho phép microphone khi được hỏi.</li><li>Dùng tai nghe để nghe AI rõ hơn.</li><li>Mỗi câu trả lời tối đa 3 phút.</li></ul><Button className="mt-6 w-full" size="lg" onClick={onStart}>Vào phòng phỏng vấn<ArrowRight className="size-4" aria-hidden="true" /></Button><Link to="/interviews" className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 text-sm font-semibold"><ArrowLeft className="size-4" aria-hidden="true" />Quay lại danh sách</Link></div></div></section></main>; }
function Complete({ answered, total }: { answered: number; total: number }) { return <main className="grid min-h-[100dvh] place-items-center bg-[var(--color-surface-container-low)] p-4"><section className="w-full max-w-xl rounded-3xl border border-[var(--color-border-default)] bg-white p-8 text-center shadow-[var(--shadow-ambient)]"><span className="mx-auto grid size-16 place-items-center rounded-2xl bg-emerald-50 text-emerald-600"><CheckCircle2 className="size-8" aria-hidden="true" /></span><p className="mt-5 text-xs font-semibold uppercase tracking-wider text-emerald-700">Voice Interview hoàn tất</p><h1 className="mt-2 text-2xl font-semibold">AI đang phân tích câu trả lời</h1><p className="mt-3 text-sm leading-6 text-[var(--color-on-surface-variant)]">Đã ghi nhận {answered}/{total} câu. Phiên thật sẽ Speech-to-Text, phân tích và chấm điểm năng lực.</p><Link to="/interviews" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 text-sm font-semibold text-white">Về danh sách<ArrowRight className="size-4" aria-hidden="true" /></Link></section></main>; }
function Meta({ icon: Icon, label, value }: { icon: typeof Timer; label: string; value: string }) { return <span className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[var(--color-surface-container-low)] px-3"><Icon className="size-4 text-[var(--color-primary)]" aria-hidden="true" /><span><span className="block text-[9px] text-[var(--color-on-surface-variant)]">{label}</span><strong>{value}</strong></span></span>; }
function Stage({ state, title, detail }: { state: "done" | "active" | "locked"; title: string; detail: string }) { return <div className={cn("rounded-xl border p-3", state === "done" ? "border-emerald-200 bg-emerald-50/60" : state === "active" ? "border-[var(--color-primary)] bg-[var(--color-primary-subtle)]" : "border-[var(--color-border-default)] bg-white")}><p className="text-xs font-semibold uppercase">{title}</p><p className="mt-1 text-[11px] text-[var(--color-on-surface-variant)]">{detail}</p></div>; }
function Signal({ icon: Icon, label, value }: { icon: typeof Mic; label: string; value: string }) { return <div className="rounded-xl bg-[var(--color-surface-container-low)] p-3"><Icon className="size-4 text-[var(--color-primary)]" aria-hidden="true" /><p className="mt-2 text-[10px] text-[var(--color-on-surface-variant)]">{label}</p><p className="text-xs font-semibold">{value}</p></div>; }
function InfoRow({ icon: Icon, title, text }: { icon: typeof Mic; title: string; text: string }) { return <div className="flex gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--color-primary-subtle)] text-[var(--color-primary)]"><Icon className="size-5" aria-hidden="true" /></span><div><h2 className="font-semibold">{title}</h2><p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">{text}</p></div></div>; }
function formatTime(value: number) { return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`; }
