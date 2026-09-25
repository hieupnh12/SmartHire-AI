import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Bot, CheckCircle2, CircleHelp, FileText, Headphones, Keyboard, LogOut, Mic, PauseCircle, PlayCircle, ShieldCheck, Timer, UserRound, Volume2 } from "lucide-react";
import { Button } from "@/components/ux/Button";
import { useUiStore } from "@/stores/uiStore";
import { interviewQuestions, mockAiInterview } from "../constants/mockAiInterview";
import { InterviewProgress } from "./InterviewProgress";

const card = "rounded-xl bg-surface-card p-5 shadow-sm sm:p-6";
const muted = "text-[var(--color-on-surface-variant)]";
const time = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;

export function AiInterviewRoom() {
  const [current, setCurrent] = useState(2);
  const [remaining, setRemaining] = useState(18 * 60 + 45);
  const [elapsed, setElapsed] = useState(78);
  const [recording, setRecording] = useState(true);
  const [textMode, setTextMode] = useState(false);
  const [answer, setAnswer] = useState(interviewQuestions[2].answer);
  const [answers, setAnswers] = useState<string[]>(interviewQuestions.slice(0, 2).map(q => q.answer));
  const [finished, setFinished] = useState(false);
  const [notice, setNotice] = useState("");
  const askConfirm = useUiStore(s => s.askConfirm);
  const question = interviewQuestions[current];

  useEffect(() => {
    if (finished) return;
    const interval = window.setInterval(() => {
      setRemaining(value => Math.max(0, value - 1));
      if (recording && !textMode) setElapsed(value => value + 1);
    }, 1000);
    return () => window.clearInterval(interval);
  }, [finished, recording, textMode]);
  useEffect(() => {
    if (remaining === 0) { setFinished(true); setRecording(false); }
  }, [remaining]);
  useEffect(() => () => { window.speechSynthesis?.cancel(); }, []);

  function speak(text: string) {
    if (!("speechSynthesis" in window)) { setNotice("Trình duyệt chưa hỗ trợ đọc văn bản. Bạn có thể đọc nội dung trên màn hình."); return; }
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "vi-VN";
    utterance.onerror = () => setNotice("Không phát được giọng đọc. Bạn có thể đọc nội dung trên màn hình.");
    window.speechSynthesis.speak(utterance);
  }
  function finish() {
    window.speechSynthesis?.cancel();
    setRecording(false);
    setFinished(true);
  }
  function submit() {
    if (!answer.trim()) return;
    setAnswers(previous => [...previous, answer.trim()]);
    window.speechSynthesis?.cancel();
    if (current === interviewQuestions.length - 1) { finish(); return; }
    setCurrent(current + 1);
    setAnswer(interviewQuestions[current + 1].answer);
    setElapsed(0);
    setRecording(!textMode);
    setNotice(`Đã lưu câu ${current + 1} trong phiên mẫu.`);
  }

  if (finished) return <section className={`${card} mx-auto my-8 max-w-2xl space-y-5 text-center`}>
    <CheckCircle2 className="mx-auto size-12 text-brand-primary" aria-hidden="true" />
    <h1 className="text-2xl font-semibold">{remaining === 0 ? "Đã hết thời gian phiên mẫu" : "Đã kết thúc phiên phỏng vấn mẫu"}</h1>
    <p className={muted}>Đã trả lời {answers.length}/6 câu hỏi (bao gồm 2 câu mẫu có sẵn). Dữ liệu chưa được gửi lên hệ thống.</p>
    <div className="space-y-2 text-left">{answers.map((value, index) => <details key={index} className="rounded-lg bg-surface-muted p-3"><summary className="cursor-pointer text-sm font-medium">0{index + 1}. {interviewQuestions[index].topic}</summary><p className={`mt-3 text-sm leading-6 ${muted}`}>{value}</p></details>)}</div>
    <Link to="/candidate/interviews" className="inline-flex min-h-11 items-center rounded-xl bg-brand-primary px-5 text-sm text-[var(--color-on-primary)]">Về lịch AI Interview</Link>
  </section>;

  return <div className="space-y-5 text-[var(--color-on-surface)]">
    <header className={`${card} flex flex-wrap items-center justify-between gap-5`}>
      <div className="flex flex-wrap items-center gap-4">
        <span className="inline-flex items-center gap-2 rounded-lg bg-[var(--color-primary-soft)] px-3 py-2 font-semibold text-brand-primary"><ShieldCheck className="size-5" aria-hidden="true" />SmartHire·AI</span>
        <div><h1 className="text-base font-semibold">{mockAiInterview.title}</h1><p className={`mt-1 text-xs ${muted}`}>#{mockAiInterview.id} · Phòng phỏng vấn độc lập</p></div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 rounded-lg bg-surface-muted px-3 py-2"><Timer className="size-5 text-brand-primary" aria-hidden="true" /><div><p className={`text-[10px] uppercase tracking-wider ${muted}`}>Thời gian còn lại</p><p className="font-semibold tabular-nums text-brand-primary">{time(remaining)} <span className={`text-xs font-normal ${muted}`}>/ 25:00</span></p></div></div>
        <Button variant="secondary" aria-label="Hỗ trợ phiên mẫu" onClick={() => setNotice("Hướng dẫn: tạm dừng để nghe transcript mẫu, hoặc chuyển sang nhập văn bản. Bấm Gửi câu trả lời để sang câu tiếp theo.")}><CircleHelp className="size-5" aria-hidden="true" /></Button>
        <Button variant="secondary" onClick={() => askConfirm({ title: "Kết thúc phiên mẫu?", description: "Câu trả lời hiện tại chưa gửi sẽ không được tính. Bạn có thể mở lại phiên mẫu từ lịch AI Interview.", confirmLabel: "Kết thúc", danger: true, onConfirm: finish })}><LogOut className="size-4" aria-hidden="true" />Kết thúc</Button>
      </div>
    </header>
    <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-[var(--color-primary-soft)] px-4 py-2 text-xs text-brand-primary"><span>DỮ LIỆU MẪU · Đang xem từ câu 03 theo giao diện minh họa</span><span>Micro, transcript và thông tin ứng viên được mô phỏng</span></div>
    {notice && <p role="status" className="rounded-lg border border-[var(--color-border-default)] bg-surface-card p-3 text-sm">{notice}</p>}
    <div className="grid items-start gap-5 lg:grid-cols-12">
      <div className="min-w-0 space-y-5 lg:col-span-8">
        <section className={`${card} flex flex-wrap items-center justify-between gap-4`}>
          <div><p className="text-xs font-semibold uppercase tracking-wider text-brand-primary">Tiến độ câu hỏi</p><h2 className="mt-1 text-xl font-semibold">Câu hỏi chính 0{current + 1} <span className={`font-normal ${muted}`}>/ 06</span></h2></div>
          <div className="flex flex-wrap gap-2 text-xs"><span className="rounded-full bg-[var(--color-primary-soft)] px-3 py-2 text-brand-primary">{question.topic}</span><span className={`rounded-full bg-surface-muted px-3 py-2 ${muted}`}>Độ khó: Khá</span></div>
        </section>
        <section className={`${card} space-y-5`}>
          <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><span className="rounded-full bg-brand-primary p-2 text-[var(--color-on-primary)]"><Bot className="size-5" aria-hidden="true" /></span><div><h2 className="text-sm font-semibold text-brand-primary">AI Interviewer · Lượt phỏng vấn chính</h2><p className={`mt-1 text-xs ${muted}`}>Câu hỏi mẫu · Giọng đọc từ trình duyệt</p></div></div><Button variant="secondary" size="sm" onClick={() => speak(question.question)}><Volume2 className="size-4" aria-hidden="true" />Nghe lại câu hỏi</Button></div>
          <p className="rounded-lg bg-surface-muted p-5 text-base font-medium leading-8">“{question.question}”</p>
        </section>
        <section className={`${card} space-y-5`}>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface-muted p-4">
            <div className="flex items-center gap-2 text-sm font-semibold"><span className={`size-2.5 rounded-full ${recording && !textMode ? "bg-brand-primary motion-safe:animate-pulse" : "bg-[var(--color-outline)]"}`} /><span>{textMode ? "Chế độ nhập văn bản" : recording ? "Đang ghi âm mô phỏng..." : "Đã tạm dừng mô phỏng"}</span><span className={`text-xs font-normal tabular-nums ${muted}`}>{time(elapsed)}</span></div>
            <div aria-hidden="true" className="flex h-7 items-center gap-1 rounded-md bg-[var(--color-primary-soft)] px-3">{["h-3", "h-5", "h-2", "h-6", "h-4", "h-5", "h-3", "h-6", "h-2"].map((height, index) => <span key={index} className={`w-1 rounded-full bg-brand-primary ${recording && !textMode ? `${height} motion-safe:animate-pulse` : "h-1"}`} />)}</div>
          </div>
          <div className="space-y-3"><label htmlFor="interview-answer" className="flex items-center gap-2 text-sm font-semibold"><FileText className="size-4 text-brand-primary" aria-hidden="true" />{textMode ? "Câu trả lời của bạn" : "Live Transcript (bản mô phỏng)"}</label><textarea id="interview-answer" value={answer} readOnly={!textMode} onChange={event => setAnswer(event.target.value)} className="min-h-44 w-full resize-y rounded-lg border border-transparent bg-surface-muted p-4 text-base leading-7 outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/20" /><p className={`text-xs ${muted}`}>Bản nháp trong phiên mẫu · Chuyển sang nhập văn bản để chỉnh sửa câu trả lời.</p></div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">{!textMode && <Button variant="secondary" size="sm" onClick={() => { setRecording(!recording); if (recording) speak(answer); else window.speechSynthesis?.cancel(); }}>{recording ? <PauseCircle className="size-4" aria-hidden="true" /> : <PlayCircle className="size-4" aria-hidden="true" />}{recording ? "Dừng & nghe transcript" : "Tiếp tục mô phỏng"}</Button>}<Button variant="ghost" size="sm" onClick={() => { setTextMode(!textMode); setRecording(textMode); window.speechSynthesis?.cancel(); }}>{textMode ? <Mic className="size-4" aria-hidden="true" /> : <Keyboard className="size-4" aria-hidden="true" />}{textMode ? "Chuyển mô phỏng giọng nói" : "Chuyển nhập văn bản"}</Button></div>
            <Button onClick={submit} disabled={!answer.trim()}>{current === 5 ? "Gửi & hoàn thành" : "Gửi câu trả lời & Tiếp tục"}<ArrowRight className="size-4 shrink-0" aria-hidden="true" /></Button>
          </div>
          <p className={`flex items-start gap-2 rounded-lg bg-surface-muted p-3 text-xs leading-5 ${muted}`}><Headphones className="mt-0.5 size-4 shrink-0 text-brand-primary" aria-hidden="true" />Bạn đang trải nghiệm giao diện mẫu. Chưa có ghi âm, đồng bộ âm thanh hoặc chấm điểm AI thực tế.</p>
        </section>
        <div className={`${card} flex items-center gap-4`}><span className="grid size-14 shrink-0 place-items-center rounded-xl bg-[var(--color-primary-soft)] text-brand-primary"><UserRound className="size-8" aria-hidden="true" /></span><div><p className="font-semibold">{mockAiInterview.candidate}</p><p className={`mt-1 text-xs ${muted}`}>Mã hồ sơ: #{mockAiInterview.candidateId} · Ứng viên mẫu</p></div><span className="ml-auto hidden rounded-lg bg-surface-muted px-3 py-2 text-xs sm:block">Thông tin minh họa</span></div>
      </div>
      <div className="min-w-0 lg:col-span-4"><InterviewProgress current={current} recording={recording && !textMode} /></div>
    </div>
  </div>;
}

