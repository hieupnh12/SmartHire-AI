import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, Bot, CheckCircle2, Circle, Clock3, Headphones, Info, Mic, Pause, Play, Send, ShieldCheck, Sparkles, Timer, Volume2, Wifi } from "lucide-react";
import { Button } from "@/components/ux/Button";
import { useLocale, useT } from "@/i18n";
import { cn } from "@/lib/utils";
import { getMockInterviewInvitation } from "../constants/mockInterviewInvitation";
import { getBrowserVoices, resolveBestVoice, prepareCleanSpeechText } from "../utils/speechVoiceUtils";

type Phase = "intro" | "active" | "complete";
type VoiceAnswer = { duration: number; audioUrl: string };
const bars = [20, 45, 70, 34, 82, 52, 28, 64, 38, 76, 48, 88, 30, 58, 72, 42, 80, 36, 66, 26, 74, 50, 84, 32];

export function DemoInterviewRoom() {
  const t = useT();
  const locale = useLocale();
  const invitation = useMemo(() => getMockInterviewInvitation(t), [t]);
  const questions = invitation.questions;
  const processes = useMemo(
    () => [
      t("candidate.assess.interviews.demo.processes.technicalKnowledge"),
      t("candidate.assess.interviews.demo.processes.problemSolving"),
      t("candidate.assess.interviews.demo.processes.practicalExperience"),
      t("candidate.assess.interviews.demo.processes.technicalReasoning"),
      t("candidate.assess.interviews.demo.processes.behavioral"),
      t("candidate.assess.interviews.demo.processes.communication"),
    ],
    [t],
  );
  const evalCriteria = useMemo(
    () => [
      t("candidate.assess.interviews.demo.evalCriteria.c1"),
      t("candidate.assess.interviews.demo.evalCriteria.c2"),
      t("candidate.assess.interviews.demo.evalCriteria.c3"),
      t("candidate.assess.interviews.demo.evalCriteria.c4"),
    ],
    [t],
  );
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

  async function readQuestion() {
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const voices = await getBrowserVoices();
    const speechLang = locale === "en" ? "English" : locale === "ja" ? "Japanese" : "Vietnamese";
    const resolved = resolveBestVoice(speechLang, voices);
    const cleanText = prepareCleanSpeechText(question.questionText);
    const speech = new SpeechSynthesisUtterance(cleanText);
    speech.lang = resolved.lang;
    if (resolved.voice) speech.voice = resolved.voice;
    speech.rate = resolved.rate;
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
      setMicError(t("candidate.assess.interviews.demo.micError"));
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
      <div role="status" className="flex items-center justify-between gap-3 rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary-subtle)] px-4 py-2.5 text-xs sm:text-sm">
        <span><strong>{t("candidate.assess.interviews.demo.demoBannerPrefix")}</strong> {t("candidate.assess.interviews.demo.demoBannerBody")}</span>
        <span className="hidden rounded-full bg-white px-3 py-1 font-semibold text-[var(--color-primary)] sm:inline">{t("candidate.assess.interviews.demo.demoTag")}</span>
      </div>
      <header className="rounded-2xl border border-[var(--color-border-default)] bg-white p-4 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex items-center gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--color-primary)] text-white"><Headphones className="size-5" aria-hidden="true" /></span>
            <div>
              <p className="text-xs text-[var(--color-on-surface-variant)]">{t("candidate.assess.interviews.demo.roomLabel")}</p>
              <h1 className="font-semibold">{invitation.jobTitle}</h1>
              <p className="text-xs text-[var(--color-on-surface-variant)]">{t("candidate.assess.interviews.demo.candidateMock")}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[var(--color-primary-subtle)] px-3 font-semibold text-[var(--color-primary)]">
              <Circle className="size-2.5 fill-current" aria-hidden="true" />{t("candidate.assess.interviews.demo.aiActiveBadge")}
            </span>
            <Meta icon={Timer} label={t("candidate.assess.interviews.demo.durationLabel")} value={t("candidate.assess.interviews.demo.durationValue")} />
            <Meta icon={Clock3} label={t("candidate.assess.interviews.demo.remainingLabel")} value="42:18" />
            <Button variant="danger" size="sm" onClick={() => setPhase("complete")}>{t("candidate.assess.interviews.demo.leaveRoom")}</Button>
          </div>
        </div>
      </header>

      <section className="grid gap-2 md:grid-cols-3" aria-label={t("candidate.assess.interviews.demo.recruitmentFlowAria")}>
        <Stage state="done" title={t("candidate.assess.interviews.demo.stage1Title")} detail={t("candidate.assess.interviews.demo.stage1Detail")} />
        <Stage state="active" title={t("candidate.assess.interviews.demo.stage2Title")} detail={t("candidate.assess.interviews.demo.stage2Detail")} />
        <Stage state="locked" title={t("candidate.assess.interviews.demo.stage3Title")} detail={t("candidate.assess.interviews.demo.stage3Detail")} />
      </section>

      <section className="rounded-2xl border border-[var(--color-border-default)] bg-white p-3 shadow-[var(--shadow-card)]">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-sm font-semibold">{t("candidate.assess.interviews.demo.roadmapTitle")}</h2>
            <p className="text-xs text-[var(--color-on-surface-variant)]">{t("candidate.assess.interviews.demo.roadmapSubtitle")}</p>
          </div>
          <span className="rounded-full bg-[var(--color-primary-subtle)] px-3 py-1 text-xs font-semibold text-[var(--color-primary)]">
            {t("candidate.assess.interviews.demo.processBadge", { index: processIndex + 1 })}
          </span>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-6">
          {processes.map((name, index) => (
            <div key={name} className={cn("min-h-20 rounded-xl border p-3", index === processIndex ? "border-[var(--color-primary)] bg-[var(--color-primary-subtle)] ring-1 ring-[var(--color-primary)]/20" : index < processIndex ? "border-emerald-200 bg-emerald-50/50" : "border-[var(--color-border-default)] bg-[var(--color-surface-container-low)]")}>
              <div className="flex justify-between text-[10px] font-semibold">
                <span>
                  {index === processIndex
                    ? t("candidate.assess.interviews.demo.statusActive")
                    : index < processIndex
                      ? t("candidate.assess.interviews.demo.statusDone")
                      : t("candidate.assess.interviews.demo.statusRound", { index: index + 1 })}
                </span>
                <span>0{index + 1}</span>
              </div>
              <p className="mt-2 truncate text-xs font-semibold">{name}</p>
              <p className="mt-1 text-[10px] text-[var(--color-on-surface-variant)]">
                {index < 2 ? t("candidate.assess.interviews.demo.twoQuestions") : t("candidate.assess.interviews.demo.oneQuestion")}
              </p>
            </div>
          ))}
        </div>
      </section>

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1.65fr)_minmax(300px,.75fr)]">
        <section className="space-y-4">
          <article className="overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-white shadow-[var(--shadow-card)]">
            <div className="flex flex-col gap-3 border-b border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-[var(--color-primary)] font-semibold text-white">Q{current + 1}</span>
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-primary)]">
                    {t("candidate.assess.interviews.demo.processQuestionLabel", {
                      processIndex: processIndex + 1,
                      stageTitle: question.stageTitle ?? "",
                    })}
                  </p>
                  <h2 className="text-sm font-semibold">
                    {t("candidate.assess.interviews.demo.questionProgress", { current: current + 1, total: questions.length })}
                  </h2>
                </div>
              </div>
              <span className="font-mono text-xs text-[var(--color-on-surface-variant)]">{t("candidate.assess.interviews.demo.timeMock")}</span>
            </div>
            <div className="space-y-4 p-5 sm:p-6">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">{t("candidate.assess.interviews.demo.aiReadingLabel")}</p>
                <Button variant="secondary" size="sm" onClick={readQuestion}><Volume2 className="size-4" aria-hidden="true" />{t("candidate.assess.interviews.demo.listenAgain")}</Button>
              </div>
              <p className="text-lg font-semibold leading-8">“{question.questionText}”</p>
              <div className="rounded-xl bg-[var(--color-surface-container-low)] p-3 text-xs italic leading-5 text-[var(--color-on-surface-variant)]">
                {t("candidate.assess.interviews.demo.aiEvaluationNote")}
              </div>
            </div>
          </article>

          <article className="rounded-2xl border border-[var(--color-primary)]/30 bg-white p-5 shadow-[var(--shadow-card)]">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-primary)]">{t("candidate.assess.interviews.demo.dynamicFollowupLabel")}</p>
                <h3 className="mt-1 text-sm font-semibold">{t("candidate.assess.interviews.demo.dynamicFollowupTitle")}</h3>
              </div>
              <span className="rounded-full bg-[var(--color-primary-subtle)] px-3 py-1 text-xs text-[var(--color-primary)]">{t("candidate.assess.interviews.demo.dynamicFollowupBadge")}</span>
            </div>
          </article>

          <article className="rounded-2xl border border-[var(--color-border-default)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className={cn("size-2.5 rounded-full", recording && !paused ? "animate-pulse bg-red-500" : "bg-[var(--color-outline-variant)]")} />
                <div>
                  <h3 className="text-sm font-semibold">
                    {recording
                      ? paused
                        ? t("candidate.assess.interviews.demo.recordingPaused")
                        : t("candidate.assess.interviews.demo.recordingLive")
                      : answers[question.id]
                        ? t("candidate.assess.interviews.demo.recordingSaved")
                        : t("candidate.assess.interviews.demo.recordingReady")}
                  </h3>
                  <p className="text-xs text-[var(--color-on-surface-variant)]">{t("candidate.assess.interviews.demo.micLocaleLabel")}</p>
                </div>
              </div>
              <span className="font-mono text-sm font-semibold">{formatTime(seconds || answers[question.id]?.duration || 0)} / 03:00</span>
            </div>
            <div className="mt-5 flex h-24 items-center gap-1 overflow-hidden rounded-xl bg-[var(--color-primary-subtle)] px-4" aria-label={t("candidate.assess.interviews.demo.waveformAria")}>
              {bars.map((height, index) => <span key={index} className={cn("w-full max-w-1.5 rounded-full bg-[var(--color-primary)]", recording && !paused ? "animate-pulse opacity-90" : "opacity-25")} style={{ height: `${height}%`, animationDelay: `${index * 45}ms` }} />)}
            </div>
            {answers[question.id] && !recording && <audio className="mt-4 w-full" controls src={answers[question.id].audioUrl}>{t("candidate.assess.interviews.demo.audioUnsupported")}</audio>}
            {micError && <p className="mt-3 text-sm text-[var(--color-error)]" role="alert">{micError}</p>}
            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              {!recording ? (
                <Button variant="secondary" onClick={() => void startRecording()}>
                  <Mic className="size-4" aria-hidden="true" />
                  {answers[question.id] ? t("candidate.assess.interviews.demo.recordAgain") : t("candidate.assess.interviews.demo.startAnswer")}
                </Button>
              ) : (
                <Button variant="secondary" onClick={togglePause}>
                  {paused ? <Play className="size-4" aria-hidden="true" /> : <Pause className="size-4" aria-hidden="true" />}
                  {paused ? t("candidate.assess.interviews.demo.resume") : t("candidate.assess.interviews.demo.pause")}
                </Button>
              )}
              <Button disabled={!recording || seconds < 1} onClick={submitAnswer}>
                <Send className="size-4" aria-hidden="true" />
                {t("candidate.assess.interviews.demo.submitAndNext", { current: current + 1 })}
                <ArrowRight className="size-4" aria-hidden="true" />
              </Button>
            </div>
          </article>
          <div className="flex justify-between gap-3">
            <Button variant="secondary" disabled={current === 0 || recording} onClick={() => selectQuestion(current - 1)}>
              <ArrowLeft className="size-4" aria-hidden="true" />{t("candidate.assess.interviews.demo.prevQuestion")}
            </Button>
            <Button variant="secondary" disabled={current === questions.length - 1 || recording} onClick={() => selectQuestion(current + 1)}>
              {t("candidate.assess.interviews.demo.nextQuestion")}<ArrowRight className="size-4" aria-hidden="true" />
            </Button>
          </div>
        </section>

        <aside className="space-y-4 lg:sticky lg:top-4">
          <section className="rounded-2xl border border-[var(--color-border-default)] bg-white p-6 text-center shadow-[var(--shadow-card)]">
            <span className="relative mx-auto grid size-20 place-items-center rounded-full border-2 border-[var(--color-primary)] bg-[var(--color-primary-subtle)] text-[var(--color-primary)]">
              <Bot className="size-9" aria-hidden="true" /><span className="absolute -right-1 -top-1 size-4 rounded-full border-2 border-white bg-emerald-500" />
            </span>
            <span className="mt-3 inline-flex items-center gap-1 rounded-full bg-[var(--color-primary-subtle)] px-2 py-1 text-[10px] font-semibold text-[var(--color-primary)]">
              <Sparkles className="size-3" aria-hidden="true" />Sophia 4.5
            </span>
            <h2 className="mt-3 font-semibold">AI Lead Interviewer Sophia</h2>
            <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">{t("candidate.assess.interviews.demo.aiRoleTitle")}</p>
            <div className="mt-5 grid grid-cols-2 gap-2 text-left">
              <Signal icon={Mic} label={t("candidate.assess.interviews.demo.micSignalLabel")} value={recording ? t("candidate.assess.interviews.demo.micRecordingValue") : t("candidate.assess.interviews.demo.micReadyValue")} />
              <Signal icon={Wifi} label={t("candidate.assess.interviews.demo.latencyLabel")} value={t("candidate.assess.interviews.demo.latencyValue")} />
            </div>
          </section>
          <section className="rounded-2xl border border-[var(--color-border-default)] bg-white p-5 shadow-[var(--shadow-card)]">
            <h2 className="flex items-center gap-2 text-sm font-semibold"><Info className="size-4 text-[var(--color-primary)]" aria-hidden="true" />{t("candidate.assess.interviews.demo.aiEvaluatingTitle")}</h2>
            <ul className="mt-3 space-y-3 text-xs leading-5 text-[var(--color-on-surface-variant)]">
              {evalCriteria.map(text => <li key={text} className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden="true" />{text}</li>)}
            </ul>
          </section>
          <section className="rounded-2xl border border-[var(--color-border-default)] bg-white p-4 shadow-[var(--shadow-card)]">
            <h2 className="text-sm font-semibold">{t("candidate.assess.interviews.demo.sessionQuestionsTitle")}</h2>
            <div className="mt-3 grid grid-cols-5 gap-2">
              {questions.map((item, index) => (
                <button key={item.id} type="button" disabled={recording} onClick={() => selectQuestion(index)} aria-label={t("candidate.assess.interviews.demo.openQuestionAria", { index: index + 1 })} aria-current={current === index ? "step" : undefined} className={cn("grid aspect-square place-items-center rounded-lg border text-xs font-semibold", current === index ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white" : answers[item.id] ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-[var(--color-border-default)] bg-[var(--color-surface-container-low)]")}>
                  {answers[item.id] ? <CheckCircle2 className="size-4" aria-hidden="true" /> : index + 1}
                </button>
              ))}
            </div>
          </section>
        </aside>
      </div>
    </section>
  </main>;
}

function Intro({ onStart }: { onStart: () => void }) {
  const t = useT();
  return <main className="grid min-h-[100dvh] place-items-center bg-[var(--color-surface-container-low)] p-4">
    <section className="w-full max-w-4xl overflow-hidden rounded-3xl border border-[var(--color-border-default)] bg-white shadow-[var(--shadow-ambient)]">
      <div className="bg-[linear-gradient(135deg,var(--color-primary-subtle),white_70%)] p-7 sm:p-9">
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-[var(--color-primary)]">{t("candidate.assess.interviews.demo.introBadge")}</span>
        <h1 className="mt-4 text-2xl font-semibold sm:text-3xl">{t("candidate.assess.interviews.demo.introTitle")}</h1>
        <p className="mt-2 text-[var(--color-on-surface-variant)]">{t("candidate.assess.interviews.demo.introSubtitle")}</p>
      </div>
      <div className="grid gap-6 p-7 sm:p-9 md:grid-cols-2">
        <div className="space-y-4">
          <InfoRow icon={Volume2} title={t("candidate.assess.interviews.demo.introFeat1Title")} text={t("candidate.assess.interviews.demo.introFeat1Text")} />
          <InfoRow icon={Mic} title={t("candidate.assess.interviews.demo.introFeat2Title")} text={t("candidate.assess.interviews.demo.introFeat2Text")} />
          <InfoRow icon={ShieldCheck} title={t("candidate.assess.interviews.demo.introFeat3Title")} text={t("candidate.assess.interviews.demo.introFeat3Text")} />
        </div>
        <div className="rounded-2xl bg-[var(--color-surface-container-low)] p-5">
          <h2 className="font-semibold">{t("candidate.assess.interviews.demo.introChecklistTitle")}</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-[var(--color-on-surface-variant)]">
            <li>{t("candidate.assess.interviews.demo.introCheck1")}</li>
            <li>{t("candidate.assess.interviews.demo.introCheck2")}</li>
            <li>{t("candidate.assess.interviews.demo.introCheck3")}</li>
          </ul>
          <Button className="mt-6 w-full" size="lg" onClick={onStart}>{t("candidate.assess.interviews.demo.enterRoomButton")}<ArrowRight className="size-4" aria-hidden="true" /></Button>
          <Link to="/interviews" className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-2 text-sm font-semibold"><ArrowLeft className="size-4" aria-hidden="true" />{t("candidate.assess.interviews.demo.backToList")}</Link>
        </div>
      </div>
    </section>
  </main>;
}

function Complete({ answered, total }: { answered: number; total: number }) {
  const t = useT();
  return <main className="grid min-h-[100dvh] place-items-center bg-[var(--color-surface-container-low)] p-4">
    <section className="w-full max-w-xl rounded-3xl border border-[var(--color-border-default)] bg-white p-8 text-center shadow-[var(--shadow-ambient)]">
      <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-emerald-50 text-emerald-600"><CheckCircle2 className="size-8" aria-hidden="true" /></span>
      <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-emerald-700">{t("candidate.assess.interviews.demo.completeBadge")}</p>
      <h1 className="mt-2 text-2xl font-semibold">{t("candidate.assess.interviews.demo.completeTitle")}</h1>
      <p className="mt-3 text-sm leading-6 text-[var(--color-on-surface-variant)]">{t("candidate.assess.interviews.demo.completeDesc", { answered, total })}</p>
      <Link to="/interviews" className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 text-sm font-semibold text-white">{t("candidate.assess.interviews.demo.completeBackButton")}<ArrowRight className="size-4" aria-hidden="true" /></Link>
    </section>
  </main>;
}

function Meta({ icon: Icon, label, value }: { icon: typeof Timer; label: string; value: string }) { return <span className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[var(--color-surface-container-low)] px-3"><Icon className="size-4 text-[var(--color-primary)]" aria-hidden="true" /><span><span className="block text-[9px] text-[var(--color-on-surface-variant)]">{label}</span><strong>{value}</strong></span></span>; }
function Stage({ state, title, detail }: { state: "done" | "active" | "locked"; title: string; detail: string }) { return <div className={cn("rounded-xl border p-3", state === "done" ? "border-emerald-200 bg-emerald-50/60" : state === "active" ? "border-[var(--color-primary)] bg-[var(--color-primary-subtle)]" : "border-[var(--color-border-default)] bg-white")}><p className="text-xs font-semibold uppercase">{title}</p><p className="mt-1 text-[11px] text-[var(--color-on-surface-variant)]">{detail}</p></div>; }
function Signal({ icon: Icon, label, value }: { icon: typeof Mic; label: string; value: string }) { return <div className="rounded-xl bg-[var(--color-surface-container-low)] p-3"><Icon className="size-4 text-[var(--color-primary)]" aria-hidden="true" /><p className="mt-2 text-[10px] text-[var(--color-on-surface-variant)]">{label}</p><p className="text-xs font-semibold">{value}</p></div>; }
function InfoRow({ icon: Icon, title, text }: { icon: typeof Mic; title: string; text: string }) { return <div className="flex gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--color-primary-subtle)] text-[var(--color-primary)]"><Icon className="size-5" aria-hidden="true" /></span><div><h2 className="font-semibold">{title}</h2><p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">{text}</p></div></div>; }
function formatTime(value: number) { return `${String(Math.floor(value / 60)).padStart(2, "0")}:${String(value % 60).padStart(2, "0")}`; }
