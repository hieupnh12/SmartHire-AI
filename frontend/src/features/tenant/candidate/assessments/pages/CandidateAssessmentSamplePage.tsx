import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Clock3,
  Code2,
  Cpu,
  FileCode,
  FileQuestion,
  FileText,
  Laptop,
  Layers,
  Mic,
  Play,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Trophy,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ux/Button";
import { MonacoCodeEditor } from "@/components/shared/MonacoCodeEditor";
import { formatTime as formatClockTime, useLocale, useT } from "@/i18n";

type Stage = "invitation" | "mcq" | "essay" | "coding" | "result";

interface QuestionOption {
  id: string;
  label: string;
  text: string;
  explanation?: string;
}

interface McqItem {
  id: number;
  skill: string;
  difficulty: string;
  points: number;
  question: string;
  options: QuestionOption[];
}

function renderWithHighlight(template: string, token: string, highlight: ReactNode) {
  const parts = template.split(token);
  if (parts.length !== 2) return template;
  return (
    <>
      {parts[0]}
      {highlight}
      {parts[1]}
    </>
  );
}

const SAMPLE_STARTER_CODE: Record<string, string> = {
  javascript: `/**
 * Bài toán: Tối ưu phân bổ lịch phỏng vấn (Merge Overlapping Intervals)
 * 
 * @param {number[][]} intervals - Mảng các khoảng thời gian [start, end]
 * @return {number[][]} Mảng các khoảng thời gian đã được gộp
 */
function mergeIntervals(intervals) {
  if (!intervals || intervals.length <= 1) return intervals;

  // Sắp xếp các ca phỏng vấn theo thời gian bắt đầu
  intervals.sort((a, b) => a[0] - b[0]);

  const result = [intervals[0]];

  for (let i = 1; i < intervals.length; i++) {
    const current = intervals[i];
    const previous = result[result.length - 1];

    if (current[0] <= previous[1]) {
      // Có giao thoa thời gian -> gộp khoảng
      previous[1] = Math.max(previous[1], current[1]);
    } else {
      // Không giao thoa -> thêm vào kết quả
      result.push(current);
    }
  }

  return result;
}

// Chạy thử với dữ liệu mẫu
const sampleInput = [[9, 10], [9.5, 11], [13, 15], [14.5, 16]];
console.log("Kết quả:", mergeIntervals(sampleInput));
`,
  python: `def merge_intervals(intervals: list[list[float]]) -> list[list[float]]:
    """
    Bài toán: Tối ưu phân bổ lịch phỏng vấn (Merge Overlapping Intervals)
    """
    if not intervals or len(intervals) <= 1:
        return intervals

    # Sắp xếp theo thời gian bắt đầu
    intervals.sort(key=lambda x: x[0])
    merged = [intervals[0]]

    for current in intervals[1:]:
        prev = merged[-1]
        if current[0] <= prev[1]:
            # Giao thoa thời gian -> gộp khoảng
            prev[1] = max(prev[1], current[1])
        else:
            merged.append(current)

    return merged

# Test mẫu
test_intervals = [[9, 10], [9.5, 11], [13, 15], [14.5, 16]]
print("Kết quả:", merge_intervals(test_intervals))
`,
  java: `import java.util.*;

public class Solution {
    public static int[][] mergeIntervals(int[][] intervals) {
        if (intervals.length <= 1) return intervals;

        Arrays.sort(intervals, (a, b) -> Integer.compare(a[0], b[0]));
        List<int[]> result = new ArrayList<>();
        int[] current = intervals[0];
        result.add(current);

        for (int[] interval : intervals) {
            if (interval[0] <= current[1]) {
                current[1] = Math.max(current[1], interval[1]);
            } else {
                current = interval;
                result.add(current);
            }
        }

        return result.toArray(new int[result.size()][]);
    }
}
`,
};

export function CandidateAssessmentSamplePage() {
  const t = useT();
  const locale = useLocale();
  const [currentStage, setCurrentStage] = useState<Stage>("invitation");

  // Timer simulation
  const [secondsLeft, setSecondsLeft] = useState(42 * 60 + 35);
  const [timerRunning, setTimerRunning] = useState(true);

  // Invitation & Device check state
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const micVolume = 68;

  // MCQ state
  const sampleMcqQuestions: McqItem[] = useMemo(
    () => [
      {
        id: 1,
        skill: "Spring Boot 3",
        difficulty: t("candidate.assess.sample.difficulty.medium"),
        points: 10,
        question: t("candidate.assess.sample.mcq.q1Question"),
        options: [
          { id: "A", label: "A", text: t("candidate.assess.sample.mcq.q1OptA") },
          { id: "B", label: "B", text: t("candidate.assess.sample.mcq.q1OptB") },
          { id: "C", label: "C", text: t("candidate.assess.sample.mcq.q1OptC") },
          { id: "D", label: "D", text: t("candidate.assess.sample.mcq.q1OptD") },
        ],
      },
      {
        id: 2,
        skill: "React 19 & Next.js",
        difficulty: t("candidate.assess.sample.difficulty.medium"),
        points: 10,
        question: t("candidate.assess.sample.mcq.q2Question"),
        options: [
          { id: "A", label: "A", text: "`useFormStatus`" },
          { id: "B", label: "B", text: "`useActionState`" },
          { id: "C", label: "C", text: "`useAsyncTransition`" },
          { id: "D", label: "D", text: "`useServerAction`" },
        ],
      },
      {
        id: 3,
        skill: "Database & Performance",
        difficulty: t("candidate.assess.sample.difficulty.hard"),
        points: 10,
        question: t("candidate.assess.sample.mcq.q3Question"),
        options: [
          { id: "A", label: "A", text: t("candidate.assess.sample.mcq.q3OptA") },
          { id: "B", label: "B", text: t("candidate.assess.sample.mcq.q3OptB") },
          { id: "C", label: "C", text: t("candidate.assess.sample.mcq.q3OptC") },
          { id: "D", label: "D", text: t("candidate.assess.sample.mcq.q3OptD") },
        ],
      },
      {
        id: 4,
        skill: "Multi-Tenancy & Security",
        difficulty: t("candidate.assess.sample.difficulty.hard"),
        points: 10,
        question: t("candidate.assess.sample.mcq.q4Question"),
        options: [
          { id: "A", label: "A", text: t("candidate.assess.sample.mcq.q4OptA") },
          { id: "B", label: "B", text: t("candidate.assess.sample.mcq.q4OptB") },
          { id: "C", label: "C", text: t("candidate.assess.sample.mcq.q4OptC") },
          { id: "D", label: "D", text: t("candidate.assess.sample.mcq.q4OptD") },
        ],
      },
      {
        id: 5,
        skill: "Concurrency & Distributed Systems",
        difficulty: t("candidate.assess.sample.difficulty.hard"),
        points: 10,
        question: t("candidate.assess.sample.mcq.q5Question"),
        options: [
          { id: "A", label: "A", text: t("candidate.assess.sample.mcq.q5OptA") },
          { id: "B", label: "B", text: t("candidate.assess.sample.mcq.q5OptB") },
          { id: "C", label: "C", text: t("candidate.assess.sample.mcq.q5OptC") },
          { id: "D", label: "D", text: t("candidate.assess.sample.mcq.q5OptD") },
        ],
      },
    ],
    [t],
  );

  const [mcqAnswers, setMcqAnswers] = useState<Record<number, string>>({
    1: "A",
    2: "B",
    3: "B",
  });
  const [currentMcqIndex, setCurrentMcqIndex] = useState(0);

  // Essay state (derive default from active locale when unedited)
  const [customEssayAnswer, setCustomEssayAnswer] = useState<string | null>(null);
  const essayAnswer = customEssayAnswer ?? t("candidate.assess.sample.essay.defaultAnswer");

  // Coding state
  const [selectedLanguage, setSelectedLanguage] = useState("javascript");
  const [codeSource, setCodeSource] = useState(SAMPLE_STARTER_CODE["javascript"]);
  const [codeRunOutput, setCodeRunOutput] = useState<{
    status: "idle" | "running" | "success" | "error";
    passed: number;
    total: number;
    executionTimeMs: number;
    memoryMb: number;
  }>({
    status: "idle",
    passed: 0,
    total: 3,
    executionTimeMs: 0,
    memoryMb: 0,
  });

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${rem.toString().padStart(2, "0")}`;
  };

  // Timer countdown effect in exam rooms
  useEffect(() => {
    if (!timerRunning || currentStage === "invitation" || currentStage === "result") return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning, currentStage]);

  // Handle language switch
  const handleLanguageChange = (lang: string) => {
    setSelectedLanguage(lang);
    setCodeSource(SAMPLE_STARTER_CODE[lang] ?? "");
    setCodeRunOutput({ status: "idle", passed: 0, total: 3, executionTimeMs: 0, memoryMb: 0 });
  };

  // Run test cases simulation
  const handleRunCode = () => {
    setCodeRunOutput({ status: "running", passed: 0, total: 3, executionTimeMs: 0, memoryMb: 0 });
    setTimeout(() => {
      setCodeRunOutput({
        status: "success",
        passed: 3,
        total: 3,
        executionTimeMs: 42,
        memoryMb: 18.2,
      });
    }, 900);
  };

  const stagesMeta: { id: Stage; label: string; desc: string; icon: typeof ShieldCheck }[] = [
    { id: "invitation", label: t("candidate.assess.sample.stages.invitationLabel"), desc: t("candidate.assess.sample.stages.invitationDesc"), icon: ShieldCheck },
    { id: "mcq", label: t("candidate.assess.sample.stages.mcqLabel"), desc: t("candidate.assess.sample.stages.mcqDesc"), icon: FileQuestion },
    { id: "essay", label: t("candidate.assess.sample.stages.essayLabel"), desc: t("candidate.assess.sample.stages.essayDesc"), icon: FileText },
    { id: "coding", label: t("candidate.assess.sample.stages.codingLabel"), desc: t("candidate.assess.sample.stages.codingDesc"), icon: Code2 },
    { id: "result", label: t("candidate.assess.sample.stages.resultLabel"), desc: t("candidate.assess.sample.stages.resultDesc"), icon: Trophy },
  ];

  const codeLogs =
    codeRunOutput.status === "running"
      ? t("candidate.assess.sample.coding.runningLogs")
      : codeRunOutput.status === "success"
        ? t("candidate.assess.sample.coding.successLogs")
        : "";

  return (
    <div className="min-h-screen bg-[var(--color-surface)] text-[var(--color-on-surface)]">
      {/* TOP CONTROLS & DEMO BAR */}
      <header className="sticky top-0 z-40 border-b border-[var(--color-border-default)] bg-white/95 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              to="/assessments"
              className="inline-flex size-9 items-center justify-center rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] text-[var(--color-on-surface-variant)] transition-colors hover:bg-[var(--color-surface-container)] hover:text-[var(--color-primary)]"
              title={t("candidate.assess.sample.header.backTitle")}
            >
              <ArrowLeft className="size-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary-subtle)] px-2.5 py-0.5 text-xs font-bold text-[var(--color-primary)]">
                  <Sparkles className="size-3" /> {t("candidate.assess.sample.header.badge")}
                </span>
                <span className="hidden text-xs text-[var(--color-on-surface-variant)] sm:inline">
                  {t("candidate.assess.sample.header.simulationNote")}
                </span>
              </div>
              <h1 className="text-sm font-semibold tracking-tight text-[var(--color-on-surface)] sm:text-base">
                {t("candidate.assess.sample.header.title")}
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Live timer simulation badge */}
            {currentStage !== "invitation" && currentStage !== "result" && (
              <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-900 shadow-sm">
                <Clock3 className="size-4 animate-pulse text-amber-600" />
                <span className="font-mono text-base">{formatTimer(secondsLeft)}</span>
                <button
                  type="button"
                  onClick={() => setTimerRunning(!timerRunning)}
                  className="ml-1 text-xs text-amber-700 underline hover:text-amber-900"
                >
                  {timerRunning ? t("candidate.assess.sample.header.pauseTimer") : t("candidate.assess.sample.header.resumeTimer")}
                </button>
              </div>
            )}

            {/* Quick reset */}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setCurrentStage("invitation");
                setSecondsLeft(45 * 60);
                setRulesAccepted(false);
                setCurrentMcqIndex(0);
                setCustomEssayAnswer(null);
                setCodeRunOutput({ status: "idle", passed: 0, total: 3, executionTimeMs: 0, memoryMb: 0 });
              }}
              className="gap-1.5 text-xs font-medium"
            >
              <RotateCcw className="size-3.5" /> {t("candidate.assess.sample.header.resetSample")}
            </Button>
          </div>
        </div>

        {/* STAGE SELECTOR TABS */}
        <div className="border-t border-[var(--color-border-default)]/60 bg-[var(--color-surface-container-low)] px-4 sm:px-6">
          <nav
            aria-label={t("candidate.assess.sample.header.stagesAria")}
            className="mx-auto flex max-w-7xl space-x-1 overflow-x-auto py-2 scrollbar-none"
          >
            {stagesMeta.map((s) => {
              const Icon = s.icon;
              const isActive = currentStage === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setCurrentStage(s.id)}
                  className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-left text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-[var(--color-primary)] text-white shadow-sm"
                      : "text-[var(--color-on-surface-variant)] hover:bg-white hover:text-[var(--color-on-surface)]"
                  }`}
                >
                  <Icon className={`size-4 ${isActive ? "text-white" : "text-[var(--color-primary)]"}`} />
                  <div>
                    <span className="block">{s.label}</span>
                    <span className={`text-[10px] font-normal ${isActive ? "text-white/80" : "text-[var(--color-on-surface-variant)]"}`}>
                      {s.desc}
                    </span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        {/* ========================================================= */}
        {/* STAGE 1: INVITATION & DEVICE CHECK                        */}
        {/* ========================================================= */}
        {currentStage === "invitation" && (
          <section className="space-y-6" aria-labelledby="invitation-heading">
            {/* Header Card */}
            <div className="overflow-hidden rounded-3xl border border-[var(--color-border-default)] bg-[linear-gradient(135deg,var(--color-primary-subtle),white_65%)] p-6 shadow-sm sm:p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-3xl space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                      {t("candidate.assess.sample.invitation.readyBadge")}
                    </span>
                    <span className="text-xs font-semibold text-[var(--color-primary)]">
                      {t("candidate.assess.sample.invitation.companyLabel")}
                    </span>
                  </div>
                  <h2 id="invitation-heading" className="text-2xl font-bold tracking-tight sm:text-3xl">
                    {t("candidate.assess.sample.invitation.heading")}
                  </h2>
                  <p className="text-sm leading-6 text-[var(--color-on-surface-variant)]">
                    {renderWithHighlight(
                      t("candidate.assess.sample.invitation.introTemplate"),
                      "{role}",
                      <strong>{t("candidate.assess.sample.invitation.introRole")}</strong>,
                    )}
                  </p>
                </div>

                {/* Facts badge */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-[var(--color-border-default)] bg-white p-3.5 text-center shadow-xs">
                    <span className="text-xs font-medium text-[var(--color-on-surface-variant)]">{t("candidate.assess.sample.invitation.durationLabel")}</span>
                    <p className="mt-1 text-lg font-bold text-[var(--color-primary)]">{t("candidate.assess.sample.invitation.durationValue")}</p>
                  </div>
                  <div className="rounded-2xl border border-[var(--color-border-default)] bg-white p-3.5 text-center shadow-xs">
                    <span className="text-xs font-medium text-[var(--color-on-surface-variant)]">{t("candidate.assess.sample.invitation.passingLabel")}</span>
                    <p className="mt-1 text-lg font-bold text-emerald-700">{t("candidate.assess.sample.invitation.passingValue")}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Structure & Auto-Audio Device Check */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Exam parts breakdown */}
              <div className="space-y-4 rounded-2xl border border-[var(--color-border-default)] bg-white p-6 shadow-sm">
                <h3 className="flex items-center gap-2 text-base font-bold text-[var(--color-on-surface)]">
                  <Layers className="size-5 text-[var(--color-primary)]" /> {t("candidate.assess.sample.invitation.structureTitle")}
                </h3>
                <ul className="space-y-3.5 text-sm">
                  <li className="rounded-xl bg-[var(--color-surface-container-low)] p-3">
                    <strong className="block font-semibold">{t("candidate.assess.sample.invitation.part1Title")}</strong>
                    <span className="text-xs text-[var(--color-on-surface-variant)]">{t("candidate.assess.sample.invitation.part1Desc")}</span>
                  </li>
                  <li className="rounded-xl bg-[var(--color-surface-container-low)] p-3">
                    <strong className="block font-semibold">{t("candidate.assess.sample.invitation.part2Title")}</strong>
                    <span className="text-xs text-[var(--color-on-surface-variant)]">{t("candidate.assess.sample.invitation.part2Desc")}</span>
                  </li>
                  <li className="rounded-xl bg-[var(--color-surface-container-low)] p-3">
                    <strong className="block font-semibold">{t("candidate.assess.sample.invitation.part3Title")}</strong>
                    <span className="text-xs text-[var(--color-on-surface-variant)]">{t("candidate.assess.sample.invitation.part3Desc")}</span>
                  </li>
                </ul>
              </div>

              {/* Hardware & Auto Audio Proctoring Check */}
              <div className="space-y-4 rounded-2xl border border-[var(--color-border-default)] bg-white p-6 shadow-sm">
                <h3 className="flex items-center gap-2 text-base font-bold text-[var(--color-on-surface)]">
                  <Mic className="size-5 text-[var(--color-primary)]" /> {t("candidate.assess.sample.invitation.deviceTitle")}
                </h3>

                {/* Auto audio notice */}
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs leading-5 text-emerald-950 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm text-emerald-900">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
                      <Mic className="size-4" />
                    </span>
                    <span>{t("candidate.assess.sample.invitation.autoAudioTitle")}</span>
                  </div>
                  <p>
                    {t("candidate.assess.sample.invitation.autoAudioDescPrefix")}
                    <strong>{t("candidate.assess.sample.invitation.autoAudioDescStrong")}</strong>
                    {t("candidate.assess.sample.invitation.autoAudioDescSuffix")}
                  </p>
                </div>

                {/* Mic level */}
                <div className="space-y-2 rounded-2xl bg-[var(--color-surface-container-low)] p-4 text-xs">
                  <div className="flex items-center justify-between font-medium">
                    <span className="flex items-center gap-1.5 font-bold text-[var(--color-on-surface)]">
                      <Volume2 className="size-4 text-emerald-600" /> {t("candidate.assess.sample.invitation.micDeviceLabel")}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                      <span className="size-1.5 rounded-full bg-emerald-600 animate-pulse" />
                      {t("candidate.assess.sample.invitation.micReady", { volume: micVolume })}
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                      style={{ width: `${micVolume}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-[var(--color-on-surface-variant)]">
                    {t("candidate.assess.sample.invitation.micHelp")}
                  </p>
                </div>

                {/* Browser & Anti-cheat checks */}
                <div className="space-y-2 pt-1 text-xs">
                  <div className="flex items-center justify-between text-[var(--color-on-surface-variant)]">
                    <span className="flex items-center gap-1.5">
                      <Laptop className="size-3.5 text-[var(--color-primary)]" /> {t("candidate.assess.sample.invitation.browserCheckLabel")}
                    </span>
                    <span className="flex items-center gap-1 font-semibold text-emerald-700">
                      <CheckCircle2 className="size-3.5" /> {t("candidate.assess.sample.invitation.browserCheckValue")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[var(--color-on-surface-variant)]">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="size-3.5 text-[var(--color-primary)]" /> {t("candidate.assess.sample.invitation.tabCheckLabel")}
                    </span>
                    <span className="flex items-center gap-1 font-semibold text-emerald-700">
                      <CheckCircle2 className="size-3.5" /> {t("candidate.assess.sample.invitation.tabCheckValue")}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Agreement & CTA */}
            <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-[var(--color-primary)]/20 bg-[var(--color-primary-subtle)] p-5 sm:flex-row sm:p-6">
              <label className="flex cursor-pointer items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={rulesAccepted}
                  onChange={(e) => setRulesAccepted(e.target.checked)}
                  className="mt-1 size-4 rounded border-gray-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                />
                <span className="text-[var(--color-on-surface)]">
                  {t("candidate.assess.sample.invitation.rulesAgreement")}
                </span>
              </label>

              <Button
                size="lg"
                disabled={!rulesAccepted}
                onClick={() => setCurrentStage("mcq")}
                className="w-full shrink-0 gap-2 font-bold sm:w-auto"
              >
                {t("candidate.assess.sample.invitation.enterRoomButton")} <ArrowRight className="size-4" />
              </Button>
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* STAGE 2: MCQ QUIZ ROOM                                    */}
        {/* ========================================================= */}
        {currentStage === "mcq" && (
          <section className="space-y-6" aria-labelledby="mcq-heading">
            {/* Header info */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-border-default)] bg-white p-4 shadow-sm sm:px-6">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)]">
                  {t("candidate.assess.sample.mcqStage.eyebrow")}
                </span>
                <h2 id="mcq-heading" className="text-lg font-bold sm:text-xl">
                  {t("candidate.assess.sample.mcqStage.heading", { current: currentMcqIndex + 1, total: sampleMcqQuestions.length })}
                </h2>
              </div>

              {/* AI Proctor live badge */}
              <div className="flex items-center gap-3">
                <div className="hidden items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 sm:flex">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{t("candidate.assess.sample.mcqStage.proctorStatus")}</span>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCurrentStage("essay")}
                  className="gap-1.5"
                >
                  {t("candidate.assess.sample.mcqStage.goToEssay")} <ArrowRight className="size-3.5" />
                </Button>
              </div>
            </div>

            {/* Question Navigator */}
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--color-border-default)] bg-white p-3 shadow-xs">
              <span className="mr-2 text-xs font-semibold text-[var(--color-on-surface-variant)]">{t("candidate.assess.sample.mcqStage.navigatorLabel")}</span>
              {sampleMcqQuestions.map((q, idx) => {
                const isAnswered = !!mcqAnswers[q.id];
                const isCurrent = idx === currentMcqIndex;
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentMcqIndex(idx)}
                    className={`flex size-9 items-center justify-center rounded-xl text-xs font-bold transition-all ${
                      isCurrent
                        ? "bg-[var(--color-primary)] text-white shadow-sm ring-2 ring-[var(--color-primary)]/30"
                        : isAnswered
                        ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                        : "bg-[var(--color-surface-container-low)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)]"
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Current Question Body */}
            {(() => {
              const currentQ = sampleMcqQuestions[currentMcqIndex];
              const selectedOption = mcqAnswers[currentQ.id];

              return (
                <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
                  {/* Left: Question & Options */}
                  <div className="space-y-6 rounded-3xl border border-[var(--color-border-default)] bg-white p-6 shadow-sm sm:p-8">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border-default)]/60 pb-4">
                      <div className="flex items-center gap-2">
                        <span className="rounded-lg bg-[var(--color-primary-subtle)] px-2.5 py-1 text-xs font-bold text-[var(--color-primary)]">
                          {currentQ.skill}
                        </span>
                        <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                          {currentQ.difficulty}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-[var(--color-on-surface-variant)]">
                        {t("candidate.assess.sample.mcqStage.valueLabel")}{" "}
                        <strong>{t("candidate.assess.sample.mcqStage.pointsValue", { points: currentQ.points })}</strong>
                      </span>
                    </div>

                    <h3 className="text-base font-semibold leading-7 text-[var(--color-on-surface)] sm:text-lg">
                      {currentQ.question}
                    </h3>

                    {/* Radio Options */}
                    <div className="space-y-3" role="radiogroup" aria-label={t("candidate.assess.sample.mcqStage.optionsAria")}>
                      {currentQ.options.map((opt) => {
                        const isSelected = selectedOption === opt.id;
                        return (
                          <div
                            key={opt.id}
                            onClick={() =>
                              setMcqAnswers({
                                ...mcqAnswers,
                                [currentQ.id]: opt.id,
                              })
                            }
                            className={`group flex cursor-pointer items-start gap-4 rounded-2xl border p-4.5 transition-all ${
                              isSelected
                                ? "border-[var(--color-primary)] bg-[var(--color-primary-subtle)]/60 shadow-xs ring-1 ring-[var(--color-primary)]"
                                : "border-[var(--color-border-default)] bg-white hover:border-slate-400 hover:bg-slate-50/60"
                            }`}
                          >
                            <span
                              className={`flex size-7 shrink-0 items-center justify-center rounded-xl text-xs font-bold transition-colors ${
                                isSelected
                                  ? "bg-[var(--color-primary)] text-white"
                                  : "bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)] group-hover:bg-slate-200"
                              }`}
                            >
                              {opt.label}
                            </span>
                            <span className="text-sm leading-6 text-[var(--color-on-surface)]">
                              {opt.text}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Stepper Buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border-default)]/60 pt-4">
                      <Button
                        variant="secondary"
                        disabled={currentMcqIndex === 0}
                        onClick={() => setCurrentMcqIndex((prev) => Math.max(0, prev - 1))}
                        className="gap-2"
                      >
                        <ArrowLeft className="size-4" /> {t("candidate.assess.sample.mcqStage.prevQuestion")}
                      </Button>

                      {currentMcqIndex < sampleMcqQuestions.length - 1 ? (
                        <Button
                          onClick={() => setCurrentMcqIndex((prev) => Math.min(sampleMcqQuestions.length - 1, prev + 1))}
                          className="gap-2"
                        >
                          {t("candidate.assess.sample.mcqStage.nextQuestion")} <ArrowRight className="size-4" />
                        </Button>
                      ) : (
                        <Button
                          onClick={() => setCurrentStage("essay")}
                          className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                        >
                          {t("candidate.assess.sample.mcqStage.finishMcqToEssay")} <ArrowRight className="size-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Right: Audio Proctor Monitor & Summary */}
                  <div className="space-y-4">
                    <div className="overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-slate-950 p-4 text-white shadow-sm">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                          <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
                          {t("candidate.assess.sample.mcqStage.autoAudioTitle")}
                        </span>
                        <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">
                          {t("candidate.assess.sample.mcqStage.micRunning")}
                        </span>
                      </div>
                      <div className="py-3 text-center">
                        <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-slate-900 text-emerald-400 shadow-inner ring-1 ring-emerald-500/30">
                          <Mic className="size-6 animate-pulse" />
                        </div>
                        <div className="mt-2.5 flex items-center justify-center gap-1">
                          {[30, 60, 25, 80, 50, 40, 70, 45, 55, 30].map((h, i) => (
                            <span
                              key={i}
                              className="w-1 rounded-full bg-emerald-400/80 transition-all duration-300"
                              style={{ height: `${h * 0.22}px` }}
                            />
                          ))}
                        </div>
                        <p className="mt-2 text-[11px] text-slate-400">
                          {t("candidate.assess.sample.mcqStage.ambientRecordingNote")}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[var(--color-border-default)] bg-white p-4 text-xs shadow-xs space-y-2.5">
                      <strong className="block font-semibold text-[var(--color-on-surface)]">
                        {t("candidate.assess.sample.mcqStage.progressTitle")}
                      </strong>
                      <div className="flex justify-between text-[var(--color-on-surface-variant)]">
                        <span>{t("candidate.assess.sample.mcqStage.answeredLabel")}</span>
                        <strong className="text-emerald-700">
                          {t("candidate.assess.sample.mcqStage.answeredCount", {
                            answered: Object.keys(mcqAnswers).length,
                            total: sampleMcqQuestions.length,
                          })}
                        </strong>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full bg-emerald-500 transition-all"
                          style={{
                            width: `${(Object.keys(mcqAnswers).length / sampleMcqQuestions.length) * 100}%`,
                          }}
                        />
                      </div>
                      <p className="text-[11px] text-[var(--color-on-surface-variant)] leading-4">
                        {t("candidate.assess.sample.mcqStage.autoSaveNote")}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </section>
        )}

        {/* ========================================================= */}
        {/* STAGE 3: TECHNICAL ESSAY WORKSPACE                        */}
        {/* ========================================================= */}
        {currentStage === "essay" && (
          <section className="space-y-6" aria-labelledby="essay-heading">
            {/* Header info */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-border-default)] bg-white p-4 shadow-sm sm:px-6">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)]">
                  {t("candidate.assess.sample.essay.eyebrow")}
                </span>
                <h2 id="essay-heading" className="text-lg font-bold sm:text-xl">
                  {t("candidate.assess.sample.essay.heading")}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCurrentStage("mcq")}
                >
                  {t("candidate.assess.sample.essay.reviewMcq")}
                </Button>
                <Button
                  size="sm"
                  onClick={() => setCurrentStage("coding")}
                  className="gap-1.5"
                >
                  {t("candidate.assess.sample.essay.goToCoding")} <ArrowRight className="size-3.5" />
                </Button>
              </div>
            </div>

            <div className="mx-auto max-w-5xl">
              {/* Prompt & Rich Editor */}
              <div className="space-y-5 rounded-3xl border border-[var(--color-border-default)] bg-white p-6 shadow-sm sm:p-8">
                {/* Question Prompt */}
                <div className="space-y-3 rounded-2xl bg-[var(--color-surface-container-low)] p-5 text-sm leading-6">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[var(--color-primary)]">{t("candidate.assess.sample.essay.promptBadge")}</span>
                    <span className="text-xs text-[var(--color-on-surface-variant)]">{t("candidate.assess.sample.essay.recommendedTime")}</span>
                  </div>
                  <p className="font-medium text-[var(--color-on-surface)]">
                    {t("candidate.assess.sample.essay.promptText")}
                  </p>
                </div>

                {/* Workspace Textarea */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-[var(--color-on-surface-variant)]">
                    <span className="font-semibold text-[var(--color-on-surface)]">
                      {t("candidate.assess.sample.essay.answerHeading")}
                    </span>
                    <span className="flex items-center gap-1.5 text-emerald-700">
                      <Check className="size-3.5" /> {t("candidate.assess.sample.essay.autoSavedAgo")}
                    </span>
                  </div>

                  <textarea
                    rows={15}
                    value={essayAnswer}
                    onChange={(e) => setCustomEssayAnswer(e.target.value)}
                    className="w-full rounded-2xl border border-[var(--color-border-default)] p-4 font-mono text-sm leading-6 text-[var(--color-on-surface)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                    placeholder={t("candidate.assess.sample.essay.placeholder")}
                  />

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--color-on-surface-variant)]">
                    <span>
                      {t("candidate.assess.sample.essay.wordCountPrefix")}{" "}
                      <strong>
                        {t("candidate.assess.sample.essay.wordCountValue", {
                          count: essayAnswer.trim().split(/\s+/).filter(Boolean).length,
                        })}
                      </strong>{" "}
                      {t("candidate.assess.sample.essay.minWordsHint")}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setCustomEssayAnswer(t("candidate.assess.sample.essay.shortSolution"))}
                      className="text-xs text-[var(--color-primary)]"
                    >
                      {t("candidate.assess.sample.essay.fillShortSample")}
                    </Button>
                  </div>
                </div>

                {/* Navigation CTA */}
                <div className="flex justify-between border-t border-[var(--color-border-default)]/60 pt-4">
                  <Button variant="secondary" onClick={() => setCurrentStage("mcq")}>
                    <ArrowLeft className="size-4" /> {t("candidate.assess.sample.essay.backToMcq")}
                  </Button>
                  <Button onClick={() => setCurrentStage("coding")} className="gap-2">
                    {t("candidate.assess.sample.essay.confirmToCoding")} <ArrowRight className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* STAGE 4: CANDIDATE CODING STUDIO                          */}
        {/* ========================================================= */}
        {currentStage === "coding" && (
          <section className="space-y-4" aria-labelledby="coding-heading">
            {/* Header info */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-border-default)] bg-white p-4 shadow-sm sm:px-6">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)]">
                  {t("candidate.assess.sample.coding.eyebrow")}
                </span>
                <h2 id="coding-heading" className="text-lg font-bold sm:text-xl">
                  {t("candidate.assess.sample.coding.heading")}
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCurrentStage("essay")}
                >
                  {t("candidate.assess.sample.coding.reviewEssay")}
                </Button>
                <Button
                  size="sm"
                  onClick={() => setCurrentStage("result")}
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 font-bold"
                >
                  <Send className="size-3.5" /> {t("candidate.assess.sample.coding.submitExam")}
                </Button>
              </div>
            </div>

            {/* Split Screen Studio (HackerRank / LeetCode style) */}
            <div className="grid min-h-[620px] gap-4 lg:grid-cols-2">
              {/* Left Panel: Problem Statement */}
              <div className="flex flex-col overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-white shadow-sm">
                <div className="border-b border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] px-5 py-3.5 font-bold text-sm text-[var(--color-on-surface)]">
                  {t("candidate.assess.sample.coding.problemStatementBar")}
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto p-5 text-sm leading-6 text-[var(--color-on-surface)]">
                  <div>
                    <h3 className="font-bold text-base text-[var(--color-on-surface)]">{t("candidate.assess.sample.coding.problemTitle")}</h3>
                    <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
                      {t("candidate.assess.sample.coding.problemBodyBeforeCode1")}
                      <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-rose-600 font-mono">intervals</code>
                      {t("candidate.assess.sample.coding.problemBodyBetweenCodes")}
                      <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-rose-600 font-mono">[start, end]</code>
                      {t("candidate.assess.sample.coding.problemBodyAfterCode2")}
                    </p>
                  </div>

                  {/* Resource constraints */}
                  <div className="flex flex-wrap gap-3 rounded-xl bg-[var(--color-surface-container-low)] p-3 text-xs">
                    <span className="flex items-center gap-1.5 font-semibold text-[var(--color-on-surface)]">
                      <Clock className="size-3.5 text-[var(--color-primary)]" /> {t("candidate.assess.sample.coding.timeLimit")}
                    </span>
                    <span className="flex items-center gap-1.5 font-semibold text-[var(--color-on-surface)]">
                      <Cpu className="size-3.5 text-[var(--color-primary)]" /> {t("candidate.assess.sample.coding.memoryLimit")}
                    </span>
                    <span className="font-semibold text-emerald-700">{t("candidate.assess.sample.coding.maxPoints")}</span>
                  </div>

                  {/* Examples */}
                  <div className="space-y-3">
                    <div className="rounded-xl border border-[var(--color-border-default)] bg-slate-50 p-3.5 font-mono text-xs">
                      <strong className="block text-slate-800 font-sans mb-1">{t("candidate.assess.sample.coding.example1Title")}</strong>
                      <p>{t("candidate.assess.sample.coding.example1Input")}</p>
                      <p>{t("candidate.assess.sample.coding.example1Output")}</p>
                      <p className="text-slate-500 font-sans mt-1">{t("candidate.assess.sample.coding.example1Explanation")}</p>
                    </div>

                    <div className="rounded-xl border border-[var(--color-border-default)] bg-slate-50 p-3.5 font-mono text-xs">
                      <strong className="block text-slate-800 font-sans mb-1">{t("candidate.assess.sample.coding.example2Title")}</strong>
                      <p>{t("candidate.assess.sample.coding.example2Input")}</p>
                      <p>{t("candidate.assess.sample.coding.example2Output")}</p>
                      <p className="text-slate-500 font-sans mt-1">{t("candidate.assess.sample.coding.example2Explanation")}</p>
                    </div>
                  </div>

                  {/* Constraints */}
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-[var(--color-on-surface-variant)]">{t("candidate.assess.sample.coding.constraintsHeading")}</h4>
                    <ul className="mt-1 list-disc pl-5 text-xs text-[var(--color-on-surface-variant)] space-y-1 font-mono">
                      <li>1 ≤ intervals.length ≤ 10,000</li>
                      <li>intervals[i].length == 2</li>
                      <li>0 ≤ start &lt; end ≤ 24</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Right Panel: Code Editor & Console Runner */}
              <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 text-white shadow-sm">
                {/* Editor Top Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-900 px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <FileCode className="size-4 text-[var(--color-primary-fixed-dim)]" />
                    <select
                      value={selectedLanguage}
                      onChange={(e) => handleLanguageChange(e.target.value)}
                      className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-semibold text-white focus:outline-none"
                    >
                      <option value="javascript">JavaScript (Node.js 20)</option>
                      <option value="python">Python 3.12</option>
                      <option value="java">Java 21 (OpenJDK)</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCodeSource(SAMPLE_STARTER_CODE[selectedLanguage] ?? "")}
                      className="rounded-md px-2 py-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-white"
                      title={t("candidate.assess.sample.coding.resetTitle")}
                    >
                      {t("candidate.assess.sample.coding.resetButton")}
                    </button>
                    <Button
                      size="sm"
                      onClick={handleRunCode}
                      disabled={codeRunOutput.status === "running"}
                      className="gap-1.5 bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-700"
                    >
                      <Play className="size-3" />
                      {codeRunOutput.status === "running"
                        ? t("candidate.assess.sample.coding.runningButton")
                        : t("candidate.assess.sample.coding.runCodeButton")}
                    </Button>
                  </div>
                </div>

                {/* Editor Content Area */}
                <div className="relative flex-1 bg-[#1e1e1e]">
                  <MonacoCodeEditor
                    height="360px"
                    language={selectedLanguage}
                    value={codeSource}
                    onChange={(val) => setCodeSource(val)}
                    placeholder={t("candidate.assess.sample.coding.editorPlaceholder")}
                    className="rounded-none border-0"
                  />
                </div>

                {/* Test Cases & Console Output Panel */}
                <div className="border-t border-slate-800 bg-slate-900 p-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-300">{t("candidate.assess.sample.coding.consoleTitle")}</span>
                    {codeRunOutput.status === "success" && (
                      <span className="flex items-center gap-1 font-semibold text-emerald-400">
                        <CheckCircle2 className="size-3.5" /> {t("candidate.assess.sample.coding.passedBadge", { ms: codeRunOutput.executionTimeMs })}
                      </span>
                    )}
                  </div>

                  <div className="mt-2.5 rounded-xl bg-slate-950 p-3 font-mono text-xs leading-5">
                    {codeRunOutput.status === "idle" && (
                      <p className="text-slate-500">
                        {renderWithHighlight(
                          t("candidate.assess.sample.coding.consoleIdleHintTemplate"),
                          "{button}",
                          <strong>{t("candidate.assess.sample.coding.consoleIdleHintButton")}</strong>,
                        )}
                      </p>
                    )}
                    {codeRunOutput.status === "running" && (
                      <p className="text-amber-400 animate-pulse">
                        {t("candidate.assess.sample.coding.consoleRunning")}
                      </p>
                    )}
                    {codeRunOutput.status === "success" && (
                      <pre className="whitespace-pre-wrap text-emerald-400">
                        {codeLogs}
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* STAGE 5: RESULT & PERFORMANCE ANALYSIS                    */}
        {/* ========================================================= */}
        {currentStage === "result" && (
          <section className="space-y-6" aria-labelledby="result-heading">
            {/* Congratulation & Status Card */}
            <div className="overflow-hidden rounded-3xl border border-emerald-200 bg-[linear-gradient(135deg,#ecfdf5,white_70%)] p-6 shadow-sm sm:p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow-xs">
                      <CheckCircle2 className="size-3.5" /> {t("candidate.assess.sample.result.passedBadge")}
                    </span>
                    <span className="text-xs text-[var(--color-on-surface-variant)]">
                      {t("candidate.assess.sample.result.submittedAt", {
                        time: formatClockTime(new Date(), { hour: "2-digit", minute: "2-digit" }, locale),
                      })}
                    </span>
                  </div>
                  <h2 id="result-heading" className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                    {t("candidate.assess.sample.result.heading")}
                  </h2>
                  <p className="max-w-2xl text-sm leading-6 text-[var(--color-on-surface-variant)]">
                    {t("candidate.assess.sample.result.summary")}
                  </p>
                </div>

                {/* Score summary badge */}
                <div className="flex items-center gap-4 rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
                  <div className="grid size-16 place-items-center rounded-2xl bg-emerald-600 font-bold text-2xl text-white shadow-md">
                    88%
                  </div>
                  <div>
                    <span className="text-xs font-semibold uppercase text-emerald-800">{t("candidate.assess.sample.result.rankEyebrow")}</span>
                    <p className="text-lg font-bold text-slate-900">{t("candidate.assess.sample.result.rankValue")}</p>
                    <span className="text-xs text-slate-500">{t("candidate.assess.sample.result.thresholdNote")}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section Breakdown Grid */}
            <div className="grid gap-6 md:grid-cols-3">
              {/* Part 1 */}
              <div className="space-y-3 rounded-2xl border border-[var(--color-border-default)] bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--color-primary)]">{t("candidate.assess.sample.result.part1Tag")}</span>
                  <span className="rounded-lg bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                    {t("candidate.assess.sample.result.part1Score")}
                  </span>
                </div>
                <h3 className="font-bold text-base text-[var(--color-on-surface)]">{t("candidate.assess.sample.result.part1Title")}</h3>
                <p className="text-xs text-[var(--color-on-surface-variant)] leading-5">
                  {t("candidate.assess.sample.result.part1Desc")}
                </p>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full bg-emerald-500" style={{ width: "100%" }} />
                </div>
              </div>

              {/* Part 2 */}
              <div className="space-y-3 rounded-2xl border border-[var(--color-border-default)] bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--color-primary)]">{t("candidate.assess.sample.result.part2Tag")}</span>
                  <span className="rounded-lg bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                    {t("candidate.assess.sample.result.part2Score")}
                  </span>
                </div>
                <h3 className="font-bold text-base text-[var(--color-on-surface)]">{t("candidate.assess.sample.result.part2Title")}</h3>
                <p className="text-xs text-[var(--color-on-surface-variant)] leading-5">
                  {t("candidate.assess.sample.result.part2Desc")}
                </p>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full bg-emerald-500" style={{ width: "86.6%" }} />
                </div>
              </div>

              {/* Part 3 */}
              <div className="space-y-3 rounded-2xl border border-[var(--color-border-default)] bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--color-primary)]">{t("candidate.assess.sample.result.part3Tag")}</span>
                  <span className="rounded-lg bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                    {t("candidate.assess.sample.result.part3Score")}
                  </span>
                </div>
                <h3 className="font-bold text-base text-[var(--color-on-surface)]">{t("candidate.assess.sample.result.part3Title")}</h3>
                <p className="text-xs text-[var(--color-on-surface-variant)] leading-5">
                  {t("candidate.assess.sample.result.part3Desc")}
                </p>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full bg-emerald-500" style={{ width: "84%" }} />
                </div>
              </div>
            </div>

            {/* Actions CTA */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--color-border-default)]/60 pt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setCurrentStage("invitation");
                  setSecondsLeft(45 * 60);
                  setRulesAccepted(false);
                }}
                className="gap-2"
              >
                <RotateCcw className="size-4" /> {t("candidate.assess.sample.result.retakeButton")}
              </Button>

              <Link to="/assessments">
                <Button className="gap-2 font-bold">
                  {t("candidate.assess.sample.result.backToListButton")} <ArrowRight className="size-4" />
                </Button>
              </Link>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
