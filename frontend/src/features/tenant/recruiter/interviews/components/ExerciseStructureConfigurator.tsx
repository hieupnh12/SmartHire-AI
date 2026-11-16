import { createContext, useContext, useEffect, useId, useState, type ReactNode } from "react";
import type { InterviewProcessConfig } from "@/api/types/aiInterview";
import { ArrowRight, BadgeCheck, Braces, CheckCircle2, ClipboardCheck, Code2, FileSearch, Gauge, Lightbulb, MessageCircle, Network, ShieldCheck, Sparkles, Star, TimerReset } from "lucide-react";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";

type ExerciseId = "conceptual" | "scenario" | "experience" | "code" | "behavioral" | "communication";

void Conceptual;
void Scenario;
void Experience;
void CodeReview;
void Behavioral;
void Communication;
void TechnicalKnowledgeConfig;
void ProblemSolvingConfig;
void PracticalExperienceConfig;
void TechnicalReasoningConfig;
void BehavioralConfig;

const EXERCISE_IDS: ExerciseId[] = ["conceptual", "scenario", "experience", "code", "behavioral", "communication"];

export function ExerciseStructureConfigurator({ jobSkills = [], processes = [], onChange }: {
  jobSkills?: string[];
  processes: InterviewProcessConfig[];
  onChange: (processes: InterviewProcessConfig[]) => void;
}) {
  const t = useT();
  const safeJobSkills = Array.isArray(jobSkills) ? jobSkills : [];
  const safeProcesses = Array.isArray(processes) ? processes : [];
  const [active, setActive] = useState<ExerciseId>("communication");
  const exercises = EXERCISE_IDS.map((id) => ({
    id,
    title: t(`recruiter.interviews.ai.exercises.items.${id}.title`),
    short: t(`recruiter.interviews.ai.exercises.items.${id}.short`),
    description: t(`recruiter.interviews.ai.exercises.items.${id}.description`),
  }));
  const activeIndex = exercises.findIndex((item) => item.id === active);
  const exercise = exercises[activeIndex] ?? exercises[exercises.length - 1];

  function updateProcess(next: InterviewProcessConfig) {
    onChange(safeProcesses.map((process) => (process.key === next.key ? next : process)));
  }

  return (
    <div role="tabpanel" className="space-y-4">
      <div className="rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary-subtle)]/70 p-4">
        <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
          {t("recruiter.interviews.ai.exercises.bannerTitle")}
        </p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          {t("recruiter.interviews.ai.exercises.bannerDesc")}
        </p>
      </div>

      <div
        className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100/70 p-1 dark:bg-slate-800/60"
        role="tablist"
        aria-label={t("recruiter.interviews.ai.exercises.tablistAria")}
      >
        {exercises.map((item, index) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            disabled={item.id !== "communication"}
            title={item.id !== "communication" ? t("recruiter.interviews.ai.exercises.comingSoonTooltip") : undefined}
            aria-selected={active === item.id}
            onClick={() => setActive(item.id)}
            className={cn(
              "inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-40",
              active === item.id
                ? "bg-white text-[var(--color-primary-hover)] shadow-xs dark:bg-slate-900 dark:text-[var(--color-primary)]"
                : "text-slate-600 hover:bg-slate-200/60 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200",
            )}
          >
            <span
              className={cn(
                "grid size-4.5 place-items-center rounded-full text-[10px]",
                active === item.id
                  ? "bg-[var(--color-primary-soft)] text-[var(--color-primary-hover)] font-bold"
                  : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
              )}
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <span>{item.title}</span>
            {item.id !== "communication" && (
              <span className="text-[10px] font-normal text-slate-400">
                {t("recruiter.interviews.ai.exercises.comingSoonBadge")}
              </span>
            )}
          </button>
        ))}
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-slate-50/40 dark:border-slate-800 dark:bg-slate-900/40 shadow-2xs">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-[var(--color-primary-soft)] border border-[var(--color-primary)]/25 px-2 py-0.5 text-[10px] font-bold text-[var(--color-primary-hover)]">
                {t("recruiter.interviews.ai.exercises.processBadge", {
                  num: String(activeIndex + 1).padStart(2, "0"),
                })}
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{exercise.title.toUpperCase()}</h3>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{exercise.description}</p>
          </div>
          <span className="rounded-full bg-emerald-50 border border-emerald-200/60 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            {t("recruiter.interviews.ai.exercises.headerSummary")}
          </span>
        </header>
        <div className="space-y-4 p-4">
          <ProcessConfigScope process={findProcess(safeProcesses, "COMMUNICATION")} onChange={updateProcess}>
            <div className={active === "communication" ? undefined : "hidden"}>
              <CommunicationConfig jobSkills={safeJobSkills} />
            </div>
          </ProcessConfigScope>
        </div>
      </section>
    </div>
  );
}

type ProcessConfigContextValue = {
  read: (label: string, fallback: string | boolean, directKey?: string) => string | boolean;
  write: (label: string, value: string | boolean, directKey?: string) => void;
};

const ProcessConfigContext = createContext<ProcessConfigContextValue | null>(null);

function ProcessConfigScope({
  process,
  onChange,
  children,
}: {
  process: InterviewProcessConfig;
  onChange: (process: InterviewProcessConfig) => void;
  children: ReactNode;
}) {
  const read = (label: string, fallback: string | boolean, directKey?: string) => {
    const key = directKey ?? configKey(label);
    return key === "enabled" || label === "Enable Process"
      ? process.enabled
      : ((process.config[key] as string | boolean | undefined) ?? fallback);
  };
  const write = (label: string, value: string | boolean, directKey?: string) => {
    const key = directKey ?? configKey(label);
    onChange(
      key === "enabled" || label === "Enable Process"
        ? { ...process, enabled: Boolean(value) }
        : { ...process, config: { ...process.config, [key]: value } },
    );
  };
  return <ProcessConfigContext.Provider value={{ read, write }}>{children}</ProcessConfigContext.Provider>;
}

function findProcess(processes: InterviewProcessConfig[], key: InterviewProcessConfig["key"]): InterviewProcessConfig {
  return processes.find((process) => process.key === key) ?? { key, enabled: true, order: processes.length + 1, weight: 0, config: { questionCount: 1 } };
}

function configKey(label: string) {
  if (/Question Count|Problem Count|Main Question Count|Scenario Count|Conversation Topics/i.test(label)) return "questionCount";
  const words = label.replace(/[^a-zA-Z0-9]+/g, " ").trim().split(/\s+/);
  return words.map((word, index) => (index === 0 ? word.toLowerCase() : word[0].toUpperCase() + word.slice(1))).join("");
}

function Card({ title, icon: Icon, children }: { title: string; icon: typeof ClipboardCheck; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
      <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
        <Icon className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
        {title}
      </h4>
      {children}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-slate-200/70 bg-slate-50/60 p-3 dark:border-slate-800 dark:bg-slate-800/40">
      <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>
      <span className="mt-1 block text-xs font-bold text-slate-900 dark:text-slate-100">{value}</span>
    </div>
  );
}

function Note({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-slate-200/70 bg-slate-50/60 p-3 text-xs leading-5 text-slate-500 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400">
      {children}
    </p>
  );
}

function TechnicalKnowledgeConfig({ jobSkills }: { jobSkills: string[] }) {
  const t = useT();
  const [enabled, setEnabled] = useState(true);
  const [count, setCount] = useState(10);
  const [format, setFormat] = useState("mixed");
  const [difficulty, setDifficulty] = useState("adaptive");
  const [randomize, setRandomize] = useState(true);
  const [multipleCorrect, setMultipleCorrect] = useState(true);
  const [explanationRequired, setExplanationRequired] = useState(true);
  const [showExplanation, setShowExplanation] = useState(true);
  const [showCorrect, setShowCorrect] = useState(true);
  const mode =
    format === "mixed"
      ? t("recruiter.interviews.ai.exercises.legacy.formatMixed")
      : format === "single"
        ? t("recruiter.interviews.ai.exercises.legacy.singleChoice")
        : t("recruiter.interviews.ai.exercises.legacy.multipleChoice");
  const difficultyLabel =
    difficulty === "adaptive"
      ? t("recruiter.interviews.ai.exercises.legacy.diffAdaptive")
      : difficulty[0].toUpperCase() + difficulty.slice(1);

  return (
    <>
      <Card title={t("recruiter.interviews.ai.exercises.legacy.techCard1Title")} icon={ClipboardCheck}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Toggle
            label={t("recruiter.interviews.ai.exercises.common.enableProcessLabel")}
            directKey="enabled"
            description={t("recruiter.interviews.ai.exercises.legacy.techEnableDesc")}
            checked={enabled}
            onChange={setEnabled}
          />
          <SelectField
            label={t("recruiter.interviews.ai.exercises.legacy.questionCountLabel")}
            directKey="questionCount"
            value={String(count)}
            onChange={(value) => setCount(Number(value))}
            options={Array.from({ length: 8 }, (_, index) => ({
              value: String(index + 3),
              label: t("recruiter.interviews.ai.exercises.common.questionsCount", { count: index + 3 }),
            }))}
          />
          <ChoiceField
            label={t("recruiter.interviews.ai.exercises.legacy.questionFormatLabel")}
            directKey="questionFormat"
            value={format}
            onChange={setFormat}
            options={[
              {
                value: "single",
                label: t("recruiter.interviews.ai.exercises.legacy.formatSingle"),
                detail: t("recruiter.interviews.ai.exercises.legacy.formatSingleDetail"),
              },
              {
                value: "multiple",
                label: t("recruiter.interviews.ai.exercises.legacy.formatMultiple"),
                detail: t("recruiter.interviews.ai.exercises.legacy.formatMultipleDetail"),
              },
              {
                value: "mixed",
                label: t("recruiter.interviews.ai.exercises.legacy.formatMixed"),
                detail: t("recruiter.interviews.ai.exercises.legacy.formatMixedDetail"),
              },
            ]}
          />
          <ChoiceField
            label={t("recruiter.interviews.ai.exercises.legacy.difficultyLabel")}
            directKey="difficulty"
            value={difficulty}
            onChange={setDifficulty}
            options={[
              {
                value: "easy",
                label: t("recruiter.interviews.ai.exercises.legacy.diffEasy"),
                detail: t("recruiter.interviews.ai.exercises.legacy.diffEasyDetail"),
              },
              {
                value: "medium",
                label: t("recruiter.interviews.ai.exercises.legacy.diffMedium"),
                detail: t("recruiter.interviews.ai.exercises.legacy.diffMediumDetail"),
              },
              {
                value: "hard",
                label: t("recruiter.interviews.ai.exercises.legacy.diffHard"),
                detail: t("recruiter.interviews.ai.exercises.legacy.diffHardDetail"),
              },
              {
                value: "adaptive",
                label: t("recruiter.interviews.ai.exercises.legacy.diffAdaptive"),
                detail: t("recruiter.interviews.ai.exercises.legacy.diffAdaptiveDetail"),
              },
            ]}
          />
          <Metric
            label={t("recruiter.interviews.ai.exercises.legacy.answerOptionsLabel")}
            value={t("recruiter.interviews.ai.exercises.legacy.answerOptionsValue")}
          />
          <Metric
            label={t("recruiter.interviews.ai.exercises.legacy.timeLimitLabel")}
            value={t("recruiter.interviews.ai.exercises.common.minutesValue", { minutes: 15 })}
          />
        </div>
      </Card>
      <Card title={t("recruiter.interviews.ai.exercises.legacy.techCard2Title")} icon={Lightbulb}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle
            label={t("recruiter.interviews.ai.exercises.legacy.randomizeLabel")}
            directKey="randomizeOptions"
            description={t("recruiter.interviews.ai.exercises.legacy.randomizeDesc")}
            checked={randomize}
            onChange={setRandomize}
          />
          <Toggle
            label={t("recruiter.interviews.ai.exercises.legacy.allowMultipleLabel")}
            directKey="allowMultipleCorrectAnswers"
            description={t("recruiter.interviews.ai.exercises.legacy.allowMultipleDesc")}
            checked={multipleCorrect}
            onChange={setMultipleCorrect}
          />
          <Toggle
            label={t("recruiter.interviews.ai.exercises.legacy.explanationReqLabel")}
            directKey="explanationRequired"
            description={t("recruiter.interviews.ai.exercises.legacy.explanationReqDesc")}
            checked={explanationRequired}
            onChange={setExplanationRequired}
          />
          <Toggle
            label={t("recruiter.interviews.ai.exercises.legacy.showExplanationLabel")}
            directKey="showExplanationAfterInterview"
            description={t("recruiter.interviews.ai.exercises.legacy.showExplanationDesc")}
            checked={showExplanation}
            onChange={setShowExplanation}
          />
          <Toggle
            label={t("recruiter.interviews.ai.exercises.legacy.showCorrectLabel")}
            directKey="showCorrectAnswer"
            description={t("recruiter.interviews.ai.exercises.legacy.showCorrectDesc")}
            checked={showCorrect}
            onChange={setShowCorrect}
          />
        </div>
      </Card>
      <TechnicalPreview
        enabled={enabled}
        count={count}
        mode={mode}
        difficulty={difficultyLabel}
        randomize={randomize}
        multipleCorrect={multipleCorrect}
        explanationRequired={explanationRequired}
        showExplanation={showExplanation}
        showCorrect={showCorrect}
        skills={jobSkills}
        isSingle={format === "single"}
      />
      <Rubric
        processName="TECHNICAL KNOWLEDGE"
        items={[
          { title: "Accuracy", description: t("recruiter.interviews.ai.exercises.legacy.rubricDetails.accuracy") },
          { title: "Distractor Resistance", description: t("recruiter.interviews.ai.exercises.legacy.rubricDetails.distractorResistance") },
          { title: "Speed", description: t("recruiter.interviews.ai.exercises.legacy.rubricDetails.speed") },
          { title: "Core Understanding", description: t("recruiter.interviews.ai.exercises.legacy.rubricDetails.coreUnderstanding") },
        ]}
      />
    </>
  );
}

function TechnicalPreview({
  enabled,
  count,
  mode,
  difficulty,
  randomize,
  multipleCorrect,
  explanationRequired,
  showExplanation,
  showCorrect,
  skills,
  isSingle,
}: {
  enabled: boolean;
  count: number;
  mode: string;
  difficulty: string;
  randomize: boolean;
  multipleCorrect: boolean;
  explanationRequired: boolean;
  showExplanation: boolean;
  showCorrect: boolean;
  skills: string[];
  isSingle: boolean;
}) {
  const t = useT();
  const displaySkills = skills.slice(0, 2);
  const hasManyCorrect = multipleCorrect && !isSingle;
  return (
    <ExampleShell
      title={t("recruiter.interviews.ai.exercises.legacy.techPreviewTitle", { count })}
      meta={t("recruiter.interviews.ai.exercises.legacy.techPreviewMeta", { mode })}
    >
      <div className="mb-3 flex flex-wrap justify-between gap-2 text-[10px]">
        <span className="rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary-hover)] px-2 py-0.5 font-semibold">
          {t("recruiter.interviews.ai.exercises.legacy.difficultyPrefix", { difficulty })}
        </span>
        <span className="rounded-full bg-slate-100 text-slate-600 px-2 py-0.5">
          {randomize
            ? t("recruiter.interviews.ai.exercises.legacy.randomizedOrder")
            : t("recruiter.interviews.ai.exercises.legacy.fixedOrder")}
        </span>
        {displaySkills.map((skill) => (
          <span key={skill} className="rounded-full bg-[var(--color-primary-soft)] text-[var(--color-primary-hover)] px-2 py-0.5">
            {skill}
          </span>
        ))}
      </div>
      {!enabled ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-4 text-xs text-slate-500">
          {t("recruiter.interviews.ai.exercises.legacy.techDisabled")}
        </p>
      ) : (
        <>
          <p className="mb-3 text-xs font-semibold leading-relaxed text-slate-900 dark:text-slate-100">
            {t("recruiter.interviews.ai.exercises.legacy.springQuestion")}
          </p>
          <div className="grid gap-2 md:grid-cols-2">
            {["A", "B", "C", "D"].map((letter, index) => {
              const correct = hasManyCorrect ? index === 1 || index === 2 : index === 1;
              return (
                <div
                  key={letter}
                  className={cn(
                    "flex gap-2.5 rounded-xl border p-2.5 text-xs transition-colors",
                    showCorrect && correct
                      ? "border-emerald-300 bg-emerald-50/70 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
                      : "border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
                  )}
                >
                  <span className="grid size-5 shrink-0 place-items-center rounded bg-slate-100 font-bold dark:bg-slate-800">
                    {letter}
                  </span>
                  <span>
                    {t("recruiter.interviews.ai.exercises.legacy.simOption", { letter })}
                    {showCorrect && correct && (
                      <small className="mt-1 block font-bold text-emerald-600 dark:text-emerald-400">
                        {t("recruiter.interviews.ai.exercises.legacy.correctBadge")}
                      </small>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 border-t border-slate-200/70 dark:border-slate-800 pt-2 text-[11px] text-slate-500 dark:text-slate-400">
            {explanationRequired
              ? t("recruiter.interviews.ai.exercises.legacy.explanationReqYes")
              : t("recruiter.interviews.ai.exercises.legacy.explanationReqNo")}
            {showExplanation
              ? t("recruiter.interviews.ai.exercises.legacy.showExplanationYes")
              : t("recruiter.interviews.ai.exercises.legacy.showExplanationNo")}
            {multipleCorrect && !hasManyCorrect ? t("recruiter.interviews.ai.exercises.legacy.multipleNote") : ""}
          </div>
        </>
      )}
    </ExampleShell>
  );
}

function Conceptual({ jobSkills }: { jobSkills: string[] }) {
  const t = useT();
  const [questionCount, setQuestionCount] = useState(3);
  const [selection, setSelection] = useState<"single" | "multiple">("single");
  const [options, setOptions] = useState<4 | 5>(4);
  const [skills, setSkills] = useState<string[]>(jobSkills.slice(0, 2));
  const [showAnswers, setShowAnswers] = useState(true);
  const [reasoning, setReasoning] = useState(true);
  const [timer, setTimer] = useState(60);
  const skillChoices = jobSkills.length ? jobSkills : ["Java", "Spring", "MySQL", "Redis"];
  const toggleSkill = (skill: string) =>
    setSkills((current) => (current.includes(skill) ? current.filter((item) => item !== skill) : [...current, skill]));

  return (
    <>
      <Card title={t("recruiter.interviews.ai.exercises.legacy.conceptualCard1Title")} icon={ClipboardCheck}>
        <div className="grid gap-3 sm:grid-cols-3">
          <SelectField
            label={t("recruiter.interviews.ai.exercises.legacy.conceptualCountLabel")}
            value={String(questionCount)}
            onChange={(value) => setQuestionCount(Number(value))}
            options={Array.from({ length: 8 }, (_, index) => ({
              value: String(index + 3),
              label: t("recruiter.interviews.ai.exercises.common.questionsCount", { count: index + 3 }),
            }))}
          />
          <ChoiceField
            label={t("recruiter.interviews.ai.exercises.legacy.conceptualSelectionLabel")}
            value={selection}
            onChange={(value) => setSelection(value as "single" | "multiple")}
            options={[
              {
                value: "single",
                label: t("recruiter.interviews.ai.exercises.legacy.singleChoice"),
                detail: t("recruiter.interviews.ai.exercises.legacy.singleChoiceDetail"),
              },
              {
                value: "multiple",
                label: t("recruiter.interviews.ai.exercises.legacy.multipleChoice"),
                detail: t("recruiter.interviews.ai.exercises.legacy.multipleChoiceDetail"),
              },
            ]}
          />
          <ChoiceField
            label={t("recruiter.interviews.ai.exercises.legacy.optionsPerQuestionLabel")}
            value={String(options)}
            onChange={(value) => setOptions(Number(value) as 4 | 5)}
            options={[
              {
                value: "4",
                label: t("recruiter.interviews.ai.exercises.legacy.options4"),
                detail: t("recruiter.interviews.ai.exercises.legacy.options4Detail"),
              },
              {
                value: "5",
                label: t("recruiter.interviews.ai.exercises.legacy.options5"),
                detail: t("recruiter.interviews.ai.exercises.legacy.options5Detail"),
              },
            ]}
          />
        </div>
      </Card>
      <Card title={t("recruiter.interviews.ai.exercises.legacy.conceptualCard2Title")} icon={Network}>
        <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
          {t("recruiter.interviews.ai.exercises.legacy.conceptualCard2Desc")}
        </p>
        <div className="flex flex-wrap gap-2">
          {skillChoices.map((skill) => (
            <label
              key={skill}
              className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 has-[:checked]:border-[var(--color-primary)] has-[:checked]:bg-[var(--color-primary-soft)] has-[:checked]:text-[var(--color-primary-hover)]"
            >
              <input
                type="checkbox"
                className="accent-[var(--color-primary)] rounded"
                checked={skills.includes(skill)}
                onChange={() => toggleSkill(skill)}
              />
              {skill}
            </label>
          ))}
        </div>
      </Card>
      <Card title={t("recruiter.interviews.ai.exercises.legacy.conceptualCard3Title")} icon={Lightbulb}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle
            label={t("recruiter.interviews.ai.exercises.legacy.reviewAnswersLabel")}
            description={t("recruiter.interviews.ai.exercises.legacy.reviewAnswersDesc")}
            checked={showAnswers}
            onChange={setShowAnswers}
          />
          <Toggle
            label={t("recruiter.interviews.ai.exercises.legacy.aiDetailedExplainLabel")}
            description={t("recruiter.interviews.ai.exercises.legacy.aiDetailedExplainDesc")}
            checked={reasoning}
            onChange={setReasoning}
            disabled={!showAnswers}
          />
          <SelectField
            label={t("recruiter.interviews.ai.exercises.legacy.perQuestionTimerLabel")}
            value={String(timer)}
            onChange={(value) => setTimer(Number(value))}
            options={[
              { value: "45", label: t("recruiter.interviews.ai.exercises.common.secondsPerQuestion", { seconds: 45 }) },
              { value: "60", label: t("recruiter.interviews.ai.exercises.common.secondsPerQuestion", { seconds: 60 }) },
              { value: "90", label: t("recruiter.interviews.ai.exercises.common.secondsPerQuestion", { seconds: 90 }) },
            ]}
          />
        </div>
      </Card>
      <ConceptualExample
        questionCount={questionCount}
        selection={selection}
        options={options}
        timer={timer}
        skills={skills}
        showAnswers={showAnswers}
        reasoning={reasoning}
      />
      <Rubric
        processName="TECHNICAL KNOWLEDGE"
        items={[
          { title: "Accuracy", description: t("recruiter.interviews.ai.exercises.legacy.rubricDetails.accuracy") },
          { title: "Distractor Resistance", description: t("recruiter.interviews.ai.exercises.legacy.rubricDetails.distractorResistance") },
          { title: "Speed", description: t("recruiter.interviews.ai.exercises.legacy.rubricDetails.speed") },
          { title: "Core Understanding", description: t("recruiter.interviews.ai.exercises.legacy.rubricDetails.coreUnderstanding") },
        ]}
      />
    </>
  );
}

function ProblemSolvingConfig({ jobSkills }: { jobSkills: string[] }) {
  const t = useT();
  const [enabled, setEnabled] = useState(true);
  const [count, setCount] = useState(2);
  const [style, setStyle] = useState("mixed");
  const [difficulty, setDifficulty] = useState("adaptive");
  const [complexity, setComplexity] = useState("medium");
  const [solution, setSolution] = useState(true);
  const [explanation, setExplanation] = useState(true);
  const [hint, setHint] = useState(false);
  const [followUp, setFollowUp] = useState(true);
  const [maxFollowUp, setMaxFollowUp] = useState(2);
  const isFrontend = jobSkills.some((skill) => /react|vue|angular|typescript|javascript/i.test(skill));
  const content = isFrontend
    ? t("recruiter.interviews.ai.exercises.legacy.problemQuestionFrontend")
    : t("recruiter.interviews.ai.exercises.legacy.problemQuestionBackend");

  return (
    <>
      <Card title={t("recruiter.interviews.ai.exercises.legacy.problemCard1Title")} icon={TimerReset}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Toggle
            label={t("recruiter.interviews.ai.exercises.common.enableProcessLabel")}
            directKey="enabled"
            description={t("recruiter.interviews.ai.exercises.legacy.problemEnableDesc")}
            checked={enabled}
            onChange={setEnabled}
          />
          <SelectField
            label={t("recruiter.interviews.ai.exercises.legacy.problemCountLabel")}
            directKey="problemCount"
            value={String(count)}
            onChange={(value) => setCount(Number(value))}
            options={[
              { value: "1", label: t("recruiter.interviews.ai.exercises.legacy.problem1") },
              { value: "2", label: t("recruiter.interviews.ai.exercises.legacy.problem2") },
            ]}
          />
          <ChoiceField
            label={t("recruiter.interviews.ai.exercises.legacy.problemStyleLabel")}
            directKey="problemStyle"
            value={style}
            onChange={setStyle}
            options={[
              {
                value: "scenario",
                label: t("recruiter.interviews.ai.exercises.legacy.styleScenario"),
                detail: t("recruiter.interviews.ai.exercises.legacy.styleScenarioDetail"),
              },
              {
                value: "coding",
                label: t("recruiter.interviews.ai.exercises.legacy.styleCoding"),
                detail: t("recruiter.interviews.ai.exercises.legacy.styleCodingDetail"),
              },
              {
                value: "debugging",
                label: t("recruiter.interviews.ai.exercises.legacy.styleDebugging"),
                detail: t("recruiter.interviews.ai.exercises.legacy.styleDebuggingDetail"),
              },
              {
                value: "mixed",
                label: t("recruiter.interviews.ai.exercises.legacy.styleMixed"),
                detail: t("recruiter.interviews.ai.exercises.legacy.styleMixedDetail"),
              },
            ]}
          />
          <ChoiceField
            label={t("recruiter.interviews.ai.exercises.legacy.difficultyLabel")}
            directKey="difficulty"
            value={difficulty}
            onChange={setDifficulty}
            options={[
              {
                value: "adaptive",
                label: t("recruiter.interviews.ai.exercises.legacy.jobAdaptive"),
                detail: t("recruiter.interviews.ai.exercises.legacy.jobAdaptiveDetail"),
              },
            ]}
          />
          <ChoiceField
            label={t("recruiter.interviews.ai.exercises.legacy.complexityLabel")}
            directKey="complexity"
            value={complexity}
            onChange={setComplexity}
            options={[
              {
                value: "short",
                label: t("recruiter.interviews.ai.exercises.legacy.complexShort"),
                detail: t("recruiter.interviews.ai.exercises.legacy.complexShortDetail"),
              },
              {
                value: "medium",
                label: t("recruiter.interviews.ai.exercises.legacy.complexMedium"),
                detail: t("recruiter.interviews.ai.exercises.legacy.complexMediumDetail"),
              },
              {
                value: "complex",
                label: t("recruiter.interviews.ai.exercises.legacy.complexComplex"),
                detail: t("recruiter.interviews.ai.exercises.legacy.complexComplexDetail"),
              },
            ]}
          />
          <Metric
            label={t("recruiter.interviews.ai.exercises.legacy.timeLimitLabel")}
            value={t("recruiter.interviews.ai.exercises.common.minutesValue", { minutes: 20 })}
          />
        </div>
      </Card>
      <Card title={t("recruiter.interviews.ai.exercises.legacy.problemCard2Title")} icon={Lightbulb}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle
            label={t("recruiter.interviews.ai.exercises.legacy.requireSolutionLabel")}
            directKey="requireSolution"
            description={t("recruiter.interviews.ai.exercises.legacy.requireSolutionDesc")}
            checked={solution}
            onChange={setSolution}
          />
          <Toggle
            label={t("recruiter.interviews.ai.exercises.legacy.requireExplainLabel")}
            directKey="requireExplanation"
            description={t("recruiter.interviews.ai.exercises.legacy.requireExplainDesc")}
            checked={explanation}
            onChange={setExplanation}
          />
          <Toggle
            label={t("recruiter.interviews.ai.exercises.legacy.allowHintLabel")}
            directKey="allowHint"
            description={t("recruiter.interviews.ai.exercises.legacy.allowHintDesc")}
            checked={hint}
            onChange={setHint}
          />
          <Toggle
            label={t("recruiter.interviews.ai.exercises.communication.followUpLabel")}
            directKey="followUpEnabled"
            description={t("recruiter.interviews.ai.exercises.legacy.problemFollowUpDesc")}
            checked={followUp}
            onChange={setFollowUp}
          />
          <SelectField
            label={t("recruiter.interviews.ai.exercises.communication.maxFollowUpLabel")}
            directKey="maxFollowUp"
            value={String(maxFollowUp)}
            onChange={(value) => setMaxFollowUp(Number(value))}
            options={[
              { value: "1", label: t("recruiter.interviews.ai.exercises.common.questionsCount", { count: 1 }) },
              { value: "2", label: t("recruiter.interviews.ai.exercises.common.questionsCount", { count: 2 }) },
              { value: "3", label: t("recruiter.interviews.ai.exercises.common.questionsCount", { count: 3 }) },
            ]}
          />
        </div>
      </Card>
      <ProblemPreview
        enabled={enabled}
        count={count}
        style={style}
        complexity={complexity}
        content={content}
        isFrontend={isFrontend}
        solution={solution}
        explanation={explanation}
        hint={hint}
        followUp={followUp}
        maxFollowUp={maxFollowUp}
      />
      <Rubric
        processName="PROBLEM SOLVING"
        items={[
          { title: "Root-cause Identification", description: t("recruiter.interviews.ai.exercises.legacy.rubricDetails.rootCause") },
          { title: "Investigation Methodology", description: t("recruiter.interviews.ai.exercises.legacy.rubricDetails.methodology") },
          { title: "Trade-off Analysis", description: t("recruiter.interviews.ai.exercises.legacy.rubricDetails.tradeOff") },
          { title: "Solution Feasibility", description: t("recruiter.interviews.ai.exercises.legacy.rubricDetails.feasibility") },
        ]}
      />
    </>
  );
}

function ProblemPreview({
  enabled,
  count,
  style,
  complexity,
  content,
  isFrontend,
  solution,
  explanation,
  hint,
  followUp,
  maxFollowUp,
}: {
  enabled: boolean;
  count: number;
  style: string;
  complexity: string;
  content: string;
  isFrontend: boolean;
  solution: boolean;
  explanation: boolean;
  hint: boolean;
  followUp: boolean;
  maxFollowUp: number;
}) {
  const t = useT();
  return (
    <ExampleShell
      title={t("recruiter.interviews.ai.exercises.legacy.problemPreviewTitle", { count })}
      meta={t("recruiter.interviews.ai.exercises.legacy.problemPreviewMeta", {
        style: style[0].toUpperCase() + style.slice(1),
        complexity,
      })}
    >
      <div className="mb-3 rounded-lg bg-white p-2 text-xs text-slate-500 border border-slate-200/70 dark:bg-slate-900 dark:border-slate-800">
        {t("recruiter.interviews.ai.exercises.legacy.aiReadsJob", {
          stack: isFrontend
            ? "Frontend Developer · React · TypeScript"
            : "Backend Developer · Spring Boot · REST API · PostgreSQL",
        })}
      </div>
      {!enabled ? (
        <p className="text-xs text-slate-400">{t("recruiter.interviews.ai.exercises.legacy.processDisabledShort")}</p>
      ) : (
        <>
          <p className="text-xs font-semibold leading-relaxed text-slate-900 dark:text-slate-100">{content}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {solution && (
              <span className="rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                {t("recruiter.interviews.ai.exercises.legacy.reqSolutionBadge")}
              </span>
            )}
            {explanation && (
              <span className="rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                {t("recruiter.interviews.ai.exercises.legacy.reqRootCauseBadge")}
              </span>
            )}
            {hint && (
              <span className="rounded-lg border border-[var(--color-primary)]/25 bg-[var(--color-primary-soft)] p-2 text-xs text-[var(--color-primary-hover)]">
                {t("recruiter.interviews.ai.exercises.legacy.aiHintBadge")}
              </span>
            )}
            {followUp && (
              <span className="rounded-lg border border-[var(--color-primary)]/25 bg-[var(--color-primary-soft)] p-2 text-xs text-[var(--color-primary-hover)]">
                {t("recruiter.interviews.ai.exercises.legacy.aiFollowUpBadge", { count: maxFollowUp })}
              </span>
            )}
          </div>
        </>
      )}
    </ExampleShell>
  );
}

function Scenario() {
  const t = useT();
  const [count, setCount] = useState(1);
  const [context, setContext] = useState("latency");
  const [errorLog, setErrorLog] = useState(true);
  const [apm, setApm] = useState(true);
  const [probing, setProbing] = useState(true);
  const [reference, setReference] = useState(true);
  const contexts = [
    {
      value: "latency",
      label: t("recruiter.interviews.ai.exercises.legacy.ctxLatency"),
      detail: t("recruiter.interviews.ai.exercises.legacy.ctxLatencyDetail"),
    },
    {
      value: "deadlock",
      label: t("recruiter.interviews.ai.exercises.legacy.ctxDeadlock"),
      detail: t("recruiter.interviews.ai.exercises.legacy.ctxDeadlockDetail"),
    },
    {
      value: "inconsistency",
      label: t("recruiter.interviews.ai.exercises.legacy.ctxInconsistency"),
      detail: t("recruiter.interviews.ai.exercises.legacy.ctxInconsistencyDetail"),
    },
    {
      value: "timeout",
      label: t("recruiter.interviews.ai.exercises.legacy.ctxTimeout"),
      detail: t("recruiter.interviews.ai.exercises.legacy.ctxTimeoutDetail"),
    },
  ];
  const selected = contexts.find((item) => item.value === context)!;

  return (
    <>
      <Card title={t("recruiter.interviews.ai.exercises.legacy.scenarioCard1Title")} icon={TimerReset}>
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            label={t("recruiter.interviews.ai.exercises.legacy.scenarioCountLabel")}
            value={String(count)}
            onChange={(value) => setCount(Number(value))}
            options={[
              { value: "1", label: t("recruiter.interviews.ai.exercises.legacy.scenario1") },
              { value: "2", label: t("recruiter.interviews.ai.exercises.legacy.scenario2") },
            ]}
          />
          <ChoiceField
            label={t("recruiter.interviews.ai.exercises.legacy.scenarioContextLabel")}
            value={context}
            onChange={setContext}
            options={contexts}
          />
        </div>
      </Card>
      <Card title={t("recruiter.interviews.ai.exercises.legacy.scenarioCard2Title")} icon={Network}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle
            label={t("recruiter.interviews.ai.exercises.legacy.errorLogLabel")}
            description={t("recruiter.interviews.ai.exercises.legacy.errorLogDesc")}
            checked={errorLog}
            onChange={setErrorLog}
          />
          <Toggle
            label={t("recruiter.interviews.ai.exercises.legacy.apmLabel")}
            description={t("recruiter.interviews.ai.exercises.legacy.apmDesc")}
            checked={apm}
            onChange={setApm}
          />
        </div>
      </Card>
      <Card title={t("recruiter.interviews.ai.exercises.legacy.scenarioCard3Title")} icon={Lightbulb}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle
            label={t("recruiter.interviews.ai.exercises.legacy.probingLabel")}
            description={t("recruiter.interviews.ai.exercises.legacy.probingDesc")}
            checked={probing}
            onChange={setProbing}
          />
          <Toggle
            label={t("recruiter.interviews.ai.exercises.legacy.referenceLabel")}
            description={t("recruiter.interviews.ai.exercises.legacy.referenceDesc")}
            checked={reference}
            onChange={setReference}
          />
        </div>
      </Card>
      <ScenarioExample count={count} context={selected} errorLog={errorLog} apm={apm} probing={probing} reference={reference} />
      <Rubric
        processName="SCENARIO"
        items={[
          { title: "Root-cause Identification", description: t("recruiter.interviews.ai.exercises.legacy.rubricDetails.rootCause") },
          { title: "Investigation Methodology", description: t("recruiter.interviews.ai.exercises.legacy.rubricDetails.methodology") },
          { title: "Trade-off Analysis", description: t("recruiter.interviews.ai.exercises.legacy.rubricDetails.tradeOff") },
          { title: "Solution Feasibility", description: t("recruiter.interviews.ai.exercises.legacy.rubricDetails.feasibility") },
        ]}
      />
    </>
  );
}

function Experience() {
  const t = useT();
  const [count, setCount] = useState(1);
  const [target, setTarget] = useState("skill");
  const [rigor, setRigor] = useState("deep");
  const [consistency, setConsistency] = useState(true);

  return (
    <>
      <Card title={t("recruiter.interviews.ai.exercises.legacy.expCard1Title")} icon={FileSearch}>
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField
            label={t("recruiter.interviews.ai.exercises.legacy.expCountLabel")}
            value={String(count)}
            onChange={(value) => setCount(Number(value))}
            options={[
              { value: "1", label: t("recruiter.interviews.ai.exercises.common.questionsCount", { count: 1 }) },
              { value: "2", label: t("recruiter.interviews.ai.exercises.common.questionsCount", { count: 2 }) },
            ]}
          />
          <ChoiceField
            label={t("recruiter.interviews.ai.exercises.legacy.expRulesLabel")}
            value={target}
            onChange={setTarget}
            options={[
              {
                value: "skill",
                label: t("recruiter.interviews.ai.exercises.legacy.expRuleSkill"),
                detail: t("recruiter.interviews.ai.exercises.legacy.expRuleSkillDetail"),
              },
              {
                value: "metric",
                label: t("recruiter.interviews.ai.exercises.legacy.expRuleMetric"),
                detail: t("recruiter.interviews.ai.exercises.legacy.expRuleMetricDetail"),
              },
            ]}
          />
        </div>
      </Card>
      <Card title={t("recruiter.interviews.ai.exercises.legacy.expCard2Title")} icon={BadgeCheck}>
        <ChoiceField
          label={t("recruiter.interviews.ai.exercises.legacy.expRigorLabel")}
          value={rigor}
          onChange={setRigor}
          options={[
            {
              value: "role",
              label: t("recruiter.interviews.ai.exercises.legacy.expRigorRole"),
              detail: t("recruiter.interviews.ai.exercises.legacy.expRigorRoleDetail"),
            },
            {
              value: "deep",
              label: t("recruiter.interviews.ai.exercises.legacy.expRigorDeep"),
              detail: t("recruiter.interviews.ai.exercises.legacy.expRigorDeepDetail"),
            },
          ]}
        />
      </Card>
      <Card title={t("recruiter.interviews.ai.exercises.legacy.expCard3Title")} icon={Lightbulb}>
        <Toggle
          label={t("recruiter.interviews.ai.exercises.legacy.expConsistencyLabel")}
          description={t("recruiter.interviews.ai.exercises.legacy.expConsistencyDesc")}
          checked={consistency}
          onChange={setConsistency}
        />
      </Card>
      <ExperienceExample count={count} target={target} rigor={rigor} consistency={consistency} />
      <Rubric
        processName="PRACTICAL EXPERIENCE"
        items={[
          { title: "Project Ownership", description: t("recruiter.interviews.ai.exercises.legacy.rubricDetails.ownership") },
          { title: "Technical Depth", description: t("recruiter.interviews.ai.exercises.legacy.rubricDetails.techDepth") },
          { title: "CV Consistency", description: t("recruiter.interviews.ai.exercises.legacy.rubricDetails.cvConsistency") },
          { title: "Problem Resolution", description: t("recruiter.interviews.ai.exercises.legacy.rubricDetails.resolution") },
        ]}
      />
    </>
  );
}

function CodeReview() {
  const t = useT();
  return (
    <>
      <Card title={t("recruiter.interviews.ai.exercises.legacy.codeCard1Title")} icon={Code2}>
        <div className="flex flex-wrap gap-2">
          {["Java 17", "Spring Boot 3.x", "JPA / Hibernate"].map((item) => (
            <span
              key={item}
              className="rounded-lg bg-[var(--color-primary-soft)] border border-[var(--color-primary)]/25 px-2.5 py-1 font-mono text-xs font-semibold text-[var(--color-primary-hover)]"
            >
              {item}
            </span>
          ))}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Toggle
            label={t("recruiter.interviews.ai.exercises.legacy.codeEditorLabel")}
            description={t("recruiter.interviews.ai.exercises.legacy.codeEditorDesc")}
          />
          <Toggle
            label={t("recruiter.interviews.ai.exercises.legacy.codeBugLabel")}
            description="NullPointerException · Resource Leak · N+1 Query"
          />
        </div>
      </Card>
      <Card title={t("recruiter.interviews.ai.exercises.legacy.codeCard2Title")} icon={Braces}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle
            label={t("recruiter.interviews.ai.exercises.legacy.codeRefactorLabel")}
            description={t("recruiter.interviews.ai.exercises.legacy.codeRefactorDesc")}
          />
          <Metric
            label={t("recruiter.interviews.ai.exercises.legacy.codeTimeLabel")}
            value={t("recruiter.interviews.ai.exercises.common.minutesValue", { minutes: 2 })}
          />
        </div>
      </Card>
      <PromptExample
        title={t("recruiter.interviews.ai.exercises.legacy.codePreviewTitle")}
        prompt={t("recruiter.interviews.ai.exercises.legacy.codePreviewPrompt")}
        meta={t("recruiter.interviews.ai.exercises.legacy.codePreviewMeta")}
        code="orders.forEach(order -> order.getCustomer().getName());"
      />
      <Rubric
        processName="TECHNICAL REASONING"
        items={[
          { title: "Issue Detection Speed", description: t("recruiter.interviews.ai.exercises.legacy.rubricDetails.speed") },
          { title: "Root Cause Explanation", description: t("recruiter.interviews.ai.exercises.legacy.rubricDetails.rootCause") },
          { title: "Refactoring Quality", description: t("recruiter.interviews.ai.exercises.legacy.rubricDetails.techDepth") },
          { title: "Security & Best Practices", description: t("recruiter.interviews.ai.exercises.legacy.rubricDetails.judgment") },
        ]}
      />
    </>
  );
}

function Behavioral() {
  const t = useT();
  return (
    <>
      <Card title={t("recruiter.interviews.ai.exercises.legacy.behCard1Title")} icon={Star}>
        <div className="grid grid-cols-4 gap-2 text-center text-xs font-bold">
          <span className="rounded-xl border border-[var(--color-primary)]/25 bg-[var(--color-primary-soft)] p-2 text-[var(--color-primary-hover)]">
            S<br /><small className="font-normal text-[10px]">Situation</small>
          </span>
          <span className="rounded-xl border border-[var(--color-primary)]/25 bg-[var(--color-primary-soft)] p-2 text-[var(--color-primary-hover)]">
            T<br /><small className="font-normal text-[10px]">Task</small>
          </span>
          <span className="rounded-xl border border-[var(--color-primary)]/25 bg-[var(--color-primary-soft)] p-2 text-[var(--color-primary-hover)]">
            A<br /><small className="font-normal text-[10px]">Action</small>
          </span>
          <span className="rounded-xl border border-[var(--color-primary)]/25 bg-[var(--color-primary-soft)] p-2 text-[var(--color-primary-hover)]">
            R<br /><small className="font-normal text-[10px]">Result</small>
          </span>
        </div>
        <Note>{t("recruiter.interviews.ai.exercises.legacy.behNote")}</Note>
      </Card>
      <Card title={t("recruiter.interviews.ai.exercises.legacy.behCard2Title")} icon={ShieldCheck}>
        <Toggle
          label={t("recruiter.interviews.ai.exercises.legacy.behRoleplayLabel")}
          description={t("recruiter.interviews.ai.exercises.legacy.behRoleplayDesc")}
        />
      </Card>
      <PromptExample
        title={t("recruiter.interviews.ai.exercises.legacy.behPreviewTitle")}
        prompt={t("recruiter.interviews.ai.exercises.legacy.behPreviewPrompt")}
        meta={t("recruiter.interviews.ai.exercises.legacy.behPreviewMeta")}
      />
      <Rubric
        processName="BEHAVIORAL"
        items={[
          { title: "Situation Clarity", description: t("recruiter.interviews.ai.exercises.legacy.rubricDetails.situation") },
          { title: "Action Ownership", description: t("recruiter.interviews.ai.exercises.legacy.rubricDetails.actionOwnership") },
          { title: "Result", description: t("recruiter.interviews.ai.exercises.legacy.rubricDetails.result") },
          { title: "Reflection", description: t("recruiter.interviews.ai.exercises.legacy.rubricDetails.reflection") },
        ]}
      />
    </>
  );
}

function Communication() {
  const t = useT();
  return (
    <>
      <Card title={t("recruiter.interviews.ai.exercises.legacy.commCard1Title")} icon={MessageCircle}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric
            label={t("recruiter.interviews.ai.exercises.legacy.commCountLabel")}
            value={t("recruiter.interviews.ai.exercises.common.questionsCount", { count: 1 })}
          />
          <Metric
            label={t("recruiter.interviews.ai.exercises.legacy.commPrepLabel")}
            value={t("recruiter.interviews.ai.exercises.legacy.commPrepValue")}
          />
          <Metric
            label={t("recruiter.interviews.ai.exercises.legacy.commAnswerLabel")}
            value={t("recruiter.interviews.ai.exercises.common.minutesValue", { minutes: 2 })}
          />
        </div>
      </Card>
      <Card title={t("recruiter.interviews.ai.exercises.legacy.commCard2Title")} icon={Lightbulb}>
        <Toggle
          label={t("recruiter.interviews.ai.exercises.legacy.commProbeLabel")}
          description={t("recruiter.interviews.ai.exercises.legacy.commProbeDesc")}
        />
      </Card>
      <PromptExample
        title={t("recruiter.interviews.ai.exercises.legacy.commPreviewTitle")}
        prompt={t("recruiter.interviews.ai.exercises.legacy.commPreviewPrompt")}
        meta={t("recruiter.interviews.ai.exercises.legacy.commPreviewMeta")}
      />
      <Rubric
        processName="COMMUNICATION"
        items={[
          { title: "Clarity", description: t("recruiter.interviews.ai.exercises.legacy.rubricDetails.clarity") },
          { title: "Conciseness", description: t("recruiter.interviews.ai.exercises.legacy.rubricDetails.conciseness") },
          { title: "Audience Awareness", description: t("recruiter.interviews.ai.exercises.legacy.rubricDetails.audience") },
          { title: "Active Listening", description: t("recruiter.interviews.ai.exercises.legacy.rubricDetails.listening") },
        ]}
      />
    </>
  );
}

function ConceptualExample({
  questionCount,
  selection,
  options,
  timer,
  skills,
  showAnswers,
  reasoning,
}: {
  questionCount: number;
  selection: "single" | "multiple";
  options: 4 | 5;
  timer: number;
  skills: string[];
  showAnswers: boolean;
  reasoning: boolean;
}) {
  const t = useT();
  const correctIndexes = selection === "multiple" ? [1, 2] : [1];
  const answers = [
    ["A", t("recruiter.interviews.ai.exercises.legacy.optA")],
    ["B", t("recruiter.interviews.ai.exercises.legacy.optB")],
    ["C", t("recruiter.interviews.ai.exercises.legacy.optC")],
    ["D", t("recruiter.interviews.ai.exercises.legacy.optD")],
    ["E", t("recruiter.interviews.ai.exercises.legacy.optE")],
  ].slice(0, options);

  return (
    <ExampleShell
      title={t("recruiter.interviews.ai.exercises.legacy.techPreviewTitle", { count: questionCount })}
      meta={t("recruiter.interviews.ai.exercises.legacy.conceptualMeta", {
        mode:
          selection === "single"
            ? t("recruiter.interviews.ai.exercises.legacy.singleChoice")
            : t("recruiter.interviews.ai.exercises.legacy.multipleChoice"),
        options,
        timer,
      })}
    >
      <div className="mb-3 flex flex-wrap justify-end gap-1.5 text-[10px] font-medium text-[var(--color-primary-hover)]">
        {skills.length ? (
          skills.map((skill) => (
            <span key={skill} className="rounded-full bg-[var(--color-primary-soft)] px-2 py-0.5">
              {skill}
            </span>
          ))
        ) : (
          <span className="text-slate-400">{t("recruiter.interviews.ai.exercises.legacy.noJobSkillSelected")}</span>
        )}
      </div>
      <p className="mb-3 text-xs font-semibold leading-relaxed text-slate-900 dark:text-slate-100">
        {t("recruiter.interviews.ai.exercises.legacy.springQuestion")}
      </p>
      <div className="grid gap-2 md:grid-cols-2">
        {answers.map(([letter, text], index) => {
          const correct = correctIndexes.includes(index);
          return (
            <div
              key={letter}
              className={cn(
                "flex gap-2.5 rounded-xl border p-2.5 text-xs leading-5",
                showAnswers && correct
                  ? "border-emerald-300 bg-emerald-50/70 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200"
                  : "border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
              )}
            >
              <span
                className={cn(
                  "grid size-5 shrink-0 place-items-center text-xs font-bold rounded",
                  showAnswers && correct ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
                )}
              >
                {letter}
              </span>
              <span>
                {text}
                {showAnswers && correct && (
                  <small className="mt-1 block font-bold text-emerald-600 dark:text-emerald-400">
                    {t("recruiter.interviews.ai.exercises.legacy.keyAnswerBadge")}
                  </small>
                )}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap justify-between gap-2 border-t border-slate-200/70 dark:border-slate-800 pt-2 text-[11px] text-slate-500 dark:text-slate-400">
        <span>
          {showAnswers
            ? reasoning
              ? t("recruiter.interviews.ai.exercises.legacy.scoringShowWithExplain")
              : t("recruiter.interviews.ai.exercises.legacy.scoringShowOnly")
            : t("recruiter.interviews.ai.exercises.legacy.scoringHidden")}
        </span>
        <strong className="text-[var(--color-primary-hover)]">{t("recruiter.interviews.ai.exercises.legacy.maxScore10")}</strong>
      </div>
    </ExampleShell>
  );
}

function ScenarioExample({
  count,
  context,
  errorLog,
  apm,
  probing,
  reference,
}: {
  count: number;
  context: { value: string; label: string; detail: string };
  errorLog: boolean;
  apm: boolean;
  probing: boolean;
  reference: boolean;
}) {
  const t = useT();
  const prompts: Record<string, string> = {
    latency: t("recruiter.interviews.ai.exercises.legacy.promptLatency"),
    deadlock: t("recruiter.interviews.ai.exercises.legacy.promptDeadlock"),
    inconsistency: t("recruiter.interviews.ai.exercises.legacy.promptInconsistency"),
    timeout: t("recruiter.interviews.ai.exercises.legacy.promptTimeout"),
  };

  return (
    <ExampleShell
      title={t("recruiter.interviews.ai.exercises.legacy.scenarioPreviewTitle", { count })}
      meta={t("recruiter.interviews.ai.exercises.legacy.scenarioPreviewMeta", { context: context.label })}
    >
      <p className="mb-3 text-xs font-semibold leading-relaxed text-slate-900 dark:text-slate-100">{prompts[context.value]}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {errorLog && (
          <pre className="overflow-x-auto rounded-xl bg-slate-950 p-3 text-[11px] font-mono text-slate-100">
            <code>ERROR PaymentClient timeout after 3000ms{`\n`}traceId=acme-7f2 connectionPool=97%</code>
          </pre>
        )}
        {apm && (
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs dark:border-slate-800 dark:bg-slate-900">
            <strong className="block text-[var(--color-primary-hover)]">{t("recruiter.interviews.ai.exercises.legacy.apmSnapshot")}</strong>
            <span className="mt-1 block text-slate-500 dark:text-slate-400">CPU 89% · RAM 76% · Connection Pool 97/100</span>
          </div>
        )}
      </div>
      {probing && (
        <div className="mt-3 rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary-subtle)] p-3 text-xs text-slate-700">
          <strong>{t("recruiter.interviews.ai.exercises.legacy.scenarioFollowUpLabel")}</strong>{" "}
          {t("recruiter.interviews.ai.exercises.legacy.scenarioFollowUpText")}
        </div>
      )}
      {reference && (
        <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900">
          <strong className="text-[var(--color-primary-hover)]">{t("recruiter.interviews.ai.exercises.legacy.scenarioRefLabel")}</strong>{" "}
          {t("recruiter.interviews.ai.exercises.legacy.scenarioRefText")}
        </div>
      )}
    </ExampleShell>
  );
}

function ExperienceExample({
  count,
  target,
  rigor,
  consistency,
}: {
  count: number;
  target: string;
  rigor: string;
  consistency: boolean;
}) {
  const t = useT();
  const bySkill = target === "skill";
  const deep = rigor === "deep";
  const prompt = bySkill
    ? deep
      ? t("recruiter.interviews.ai.exercises.legacy.expPromptSkillDeep")
      : t("recruiter.interviews.ai.exercises.legacy.expPromptSkillRole")
    : deep
      ? t("recruiter.interviews.ai.exercises.legacy.expPromptMetricDeep")
      : t("recruiter.interviews.ai.exercises.legacy.expPromptMetricRole");

  return (
    <ExampleShell
      title={t("recruiter.interviews.ai.exercises.legacy.expPreviewTitle", { count })}
      meta={`${bySkill ? "Target: Job Skill" : "Target: Metric"} · ${deep ? "Deep Implementation" : "Role Clarification"}`}
    >
      <div className="mb-3 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900">
        <strong className="text-[var(--color-primary-hover)]">{t("recruiter.interviews.ai.exercises.legacy.expEvidenceLabel")}</strong>{" "}
        {t("recruiter.interviews.ai.exercises.legacy.expEvidenceQuote")}
      </div>
      <p className="text-xs font-semibold leading-relaxed text-slate-900 dark:text-slate-100">{prompt}</p>
      {consistency && (
        <div className="mt-3 rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary-subtle)] p-3 text-xs">
          <strong className="text-[var(--color-primary-hover)]">{t("recruiter.interviews.ai.exercises.legacy.expConsistencyTitle")}</strong>
          <div className="mt-2 grid gap-2 sm:grid-cols-3 text-xs">
            <span className="text-emerald-700 dark:text-emerald-400">{t("recruiter.interviews.ai.exercises.legacy.expMatchOk")}</span>
            <span className="text-amber-700 dark:text-amber-400">{t("recruiter.interviews.ai.exercises.legacy.expMatchMetric")}</span>
            <span className="text-slate-500 dark:text-slate-400">{t("recruiter.interviews.ai.exercises.legacy.expMatchUnverified")}</span>
          </div>
        </div>
      )}
    </ExampleShell>
  );
}

function PromptExample({ title, prompt, meta, code }: { title: string; prompt: string; meta: string; code?: string }) {
  const t = useT();
  return (
    <ExampleShell title={title} meta={meta}>
      {code && (
        <pre className="mb-3 overflow-x-auto rounded-xl bg-slate-950 p-3 text-xs font-mono text-slate-100">
          <code>{code}</code>
        </pre>
      )}
      <p className="text-xs font-semibold leading-relaxed text-slate-900 dark:text-slate-100">{prompt}</p>
      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-900">
        {t("recruiter.interviews.ai.exercises.common.candidateAnswerBox")}
      </div>
    </ExampleShell>
  );
}

function ExampleShell({ title, meta, children }: { title: string; meta: string; children: ReactNode }) {
  const t = useT();
  return (
    <section className="overflow-hidden rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary-subtle)]/50">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-primary)]/15 bg-[var(--color-primary-subtle)] px-4 py-2.5">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[var(--color-primary-hover)]">
          <Sparkles className="size-3.5" aria-hidden="true" />
          {title} <span className="font-normal normal-case text-slate-400">{t("recruiter.interviews.ai.exercises.common.questionPlanSeed")}</span>
        </span>
        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-[var(--color-primary-hover)] shadow-2xs border border-[var(--color-primary)]/20 dark:bg-slate-900">
          {meta}
        </span>
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

function SelectField({
  label,
  directKey,
  value,
  onChange,
  options,
}: {
  label: string;
  directKey?: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  const t = useT();
  const config = useContext(ProcessConfigContext);
  const configuredValue = String(config?.read(label, value, directKey) ?? value);
  const savedValue = configuredValue;
  useEffect(() => {
    if (savedValue !== value) onChange(savedValue);
  }, [onChange, savedValue, value]);

  return (
    <label className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-3 text-xs font-semibold text-slate-800 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-200">
      <span className="mb-1.5 block">{label}</span>
      <select
        value={savedValue}
        onChange={(event) => {
          onChange(event.target.value);
          config?.write(label, event.target.value, directKey);
        }}
        className="h-9.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-900 outline-none transition-all focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white cursor-pointer"
      >
        {!options.some((option) => option.value === savedValue) && (
          <option value={savedValue}>{t("recruiter.interviews.ai.exercises.common.savedValue", { value: savedValue })}</option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ChoiceField({
  label,
  directKey,
  value,
  onChange,
  options,
}: {
  label: string;
  directKey?: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string; detail: string }[];
}) {
  const config = useContext(ProcessConfigContext);
  const fieldId = useId();
  const configuredValue = String(config?.read(label, value, directKey) ?? value);
  const savedValue = configuredValue;
  useEffect(() => {
    if (savedValue !== value) onChange(savedValue);
  }, [onChange, savedValue, value]);

  return (
    <fieldset className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-3 dark:border-slate-800 dark:bg-slate-800/40">
      <legend className="px-1 text-xs font-bold text-slate-700 dark:text-slate-300">{label}</legend>
      <div className="space-y-1.5 mt-1">
        {options.map((option) => (
          <label
            key={option.value}
            className={cn(
              "flex cursor-pointer gap-2.5 rounded-lg border p-2 text-xs transition-all",
              savedValue === option.value
                ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary-hover)] font-semibold shadow-2xs"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300",
            )}
          >
            <input
              type="radio"
              name={fieldId}
              value={option.value}
              checked={savedValue === option.value}
              onChange={(event) => {
                onChange(event.target.value);
                config?.write(label, event.target.value, directKey);
              }}
              className="accent-[var(--color-primary)] mt-0.5"
            />
            <span>
              <strong className="block">{option.label}</strong>
              <small className="text-slate-400 font-normal">{option.detail}</small>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

function Toggle({
  label,
  directKey,
  description,
  checked = false,
  onChange,
  disabled,
}: {
  label: string;
  directKey?: string;
  description: string;
  checked?: boolean;
  onChange?: (value: boolean) => void;
  disabled?: boolean;
}) {
  const t = useT();
  const config = useContext(ProcessConfigContext);
  const unavailable = directKey === "realTimeInteraction" || label === "Real-time Interaction";
  const savedChecked = unavailable ? false : Boolean(config?.read(label, checked, directKey) ?? checked);
  useEffect(() => {
    if (savedChecked !== checked) onChange?.(savedChecked);
  }, [checked, onChange, savedChecked]);

  return (
    <label
      className={cn(
        "flex items-start justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/40 p-3 text-xs cursor-pointer dark:border-slate-800 dark:bg-slate-800/40",
        disabled && "opacity-50 cursor-not-allowed",
      )}
    >
      <div>
        <span className="block font-semibold text-slate-800 dark:text-slate-200">{label}</span>
        <span className="mt-0.5 block text-[11px] leading-4 text-slate-500 dark:text-slate-400">
          {unavailable ? t("recruiter.interviews.ai.exercises.common.unavailableDesc") : description}
        </span>
      </div>
      <input
        type="checkbox"
        checked={savedChecked}
        disabled={disabled || unavailable}
        onChange={(event) => {
          onChange?.(event.target.checked);
          config?.write(label, event.target.checked, directKey);
        }}
        className="mt-1 size-4 accent-[var(--color-primary)] rounded cursor-pointer shrink-0"
      />
    </label>
  );
}

function Rubric({ processName, items }: { processName: string; items: { title: string; description: string }[] }) {
  const t = useT();
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 px-4 py-3 bg-slate-50/60 dark:bg-slate-800/40">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
          <Gauge className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
          {t("recruiter.interviews.ai.exercises.common.rubricTitle", { process: processName })}
        </span>
        <span className="text-[10px] font-semibold text-slate-400">
          {t("recruiter.interviews.ai.exercises.common.rubricScaleCount", { count: items.length })}
        </span>
      </header>
      <div className="grid divide-y divide-slate-100 dark:divide-slate-800 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
        {items.map((item, index) => (
          <div key={item.title} className="min-h-24 p-3.5">
            <span className="text-xs font-bold text-[var(--color-primary-hover)]">
              {index + 1}. {item.title}
            </span>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{item.description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function TechnicalReasoningConfig({ jobSkills }: { jobSkills: string[] }) {
  const t = useT();
  const [enabled, setEnabled] = useState(true);
  const [count, setCount] = useState(3);
  const [complexity, setComplexity] = useState("medium");
  const [mode, setMode] = useState("speech");
  const [justification, setJustification] = useState(true);
  const [alternatives, setAlternatives] = useState(true);
  const [tradeOffs, setTradeOffs] = useState(true);
  const [challenge, setChallenge] = useState(true);
  const [depth, setDepth] = useState(2);
  const frontend = jobSkills.some((skill) => /react|vue|angular/i.test(skill));
  const domain = frontend ? "React state update" : "Redis";

  return (
    <>
      <Card title={t("recruiter.interviews.ai.exercises.legacy.reasonCard1Title")} icon={Code2}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Toggle
            label={t("recruiter.interviews.ai.exercises.common.enableProcessLabel")}
            directKey="enabled"
            description={t("recruiter.interviews.ai.exercises.legacy.reasonEnableDesc")}
            checked={enabled}
            onChange={setEnabled}
          />
          <SelectField
            label={t("recruiter.interviews.ai.exercises.legacy.reasonCountLabel")}
            directKey="scenarioCount"
            value={String(count)}
            onChange={(value) => setCount(Number(value))}
            options={[
              { value: "1", label: t("recruiter.interviews.ai.exercises.legacy.reason1") },
              { value: "2", label: t("recruiter.interviews.ai.exercises.legacy.reason2") },
              { value: "3", label: t("recruiter.interviews.ai.exercises.legacy.reason3") },
            ]}
          />
          <ChoiceField
            label={t("recruiter.interviews.ai.exercises.legacy.reasonComplexityLabel")}
            directKey="scenarioComplexity"
            value={complexity}
            onChange={setComplexity}
            options={[
              {
                value: "short",
                label: t("recruiter.interviews.ai.exercises.legacy.complexShort"),
                detail: t("recruiter.interviews.ai.exercises.legacy.reasonComplexShort"),
              },
              {
                value: "medium",
                label: t("recruiter.interviews.ai.exercises.legacy.complexMedium"),
                detail: t("recruiter.interviews.ai.exercises.legacy.reasonComplexMedium"),
              },
              {
                value: "complex",
                label: t("recruiter.interviews.ai.exercises.legacy.complexComplex"),
                detail: t("recruiter.interviews.ai.exercises.legacy.reasonComplexComplex"),
              },
            ]}
          />
          <ChoiceField
            label={t("recruiter.interviews.ai.exercises.communication.responseModeLabel")}
            directKey="responseMode"
            value={mode}
            onChange={setMode}
            options={[
              {
                value: "speech",
                label: t("recruiter.interviews.ai.exercises.communication.modeSpeech"),
                detail: t("recruiter.interviews.ai.exercises.legacy.reasonSpeechDetail"),
              },
              {
                value: "text",
                label: t("recruiter.interviews.ai.exercises.communication.modeText"),
                detail: t("recruiter.interviews.ai.exercises.legacy.reasonTextDetail"),
              },
            ]}
          />
          <Metric
            label={t("recruiter.interviews.ai.exercises.legacy.reasonTimePerScenario")}
            value={t("recruiter.interviews.ai.exercises.common.minutesValue", { minutes: 5 })}
          />
        </div>
      </Card>
      <Card title={t("recruiter.interviews.ai.exercises.legacy.reasonCard2Title")} icon={Lightbulb}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle
            label={t("recruiter.interviews.ai.exercises.legacy.reasonJustifyLabel")}
            directKey="requireJustification"
            description={t("recruiter.interviews.ai.exercises.legacy.reasonJustifyDesc")}
            checked={justification}
            onChange={setJustification}
          />
          <Toggle
            label={t("recruiter.interviews.ai.exercises.legacy.reasonAltLabel")}
            directKey="askAlternatives"
            description={t("recruiter.interviews.ai.exercises.legacy.reasonAltDesc")}
            checked={alternatives}
            onChange={setAlternatives}
          />
          <Toggle
            label={t("recruiter.interviews.ai.exercises.legacy.reasonTradeOffLabel")}
            directKey="askTradeOffs"
            description={t("recruiter.interviews.ai.exercises.legacy.reasonTradeOffDesc")}
            checked={tradeOffs}
            onChange={setTradeOffs}
          />
          <Toggle
            label={t("recruiter.interviews.ai.exercises.legacy.reasonChallengeLabel")}
            directKey="challengeCandidateAnswer"
            description={t("recruiter.interviews.ai.exercises.legacy.reasonChallengeDesc")}
            checked={challenge}
            onChange={setChallenge}
          />
          <SelectField
            label={t("recruiter.interviews.ai.exercises.legacy.reasonDepthLabel")}
            directKey="followUpDepth"
            value={String(depth)}
            onChange={(value) => setDepth(Number(value))}
            options={[
              { value: "1", label: t("recruiter.interviews.ai.exercises.legacy.reasonDepthLevel", { level: 1 }) },
              { value: "2", label: t("recruiter.interviews.ai.exercises.legacy.reasonDepthLevel", { level: 2 }) },
              { value: "3", label: t("recruiter.interviews.ai.exercises.legacy.reasonDepthLevel", { level: 3 }) },
            ]}
          />
        </div>
      </Card>
      <ExampleShell
        title={t("recruiter.interviews.ai.exercises.legacy.reasonPreviewTitle", { count })}
        meta={t("recruiter.interviews.ai.exercises.legacy.reasonPreviewMeta", { mode, complexity })}
      >
        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
          {t("recruiter.interviews.ai.exercises.legacy.reasonCandidateQuote", { domain })}
        </p>
        {enabled && (
          <div className="mt-3 space-y-2 text-xs text-slate-600 dark:text-slate-400">
            <p>{t("recruiter.interviews.ai.exercises.legacy.reasonAiWhy", { domain })}</p>
            {alternatives && <p>{t("recruiter.interviews.ai.exercises.legacy.reasonAiAlt")}</p>}
            {tradeOffs && <p>{t("recruiter.interviews.ai.exercises.legacy.reasonAiTradeOff")}</p>}
            {challenge && <p>{t("recruiter.interviews.ai.exercises.legacy.reasonAiChallenge", { domain })}</p>}
          </div>
        )}
      </ExampleShell>
      <Rubric
        processName="TECHNICAL REASONING"
        items={[
          { title: "Justification Quality", description: t("recruiter.interviews.ai.exercises.legacy.rubricDetails.justification") },
          { title: "Alternative Thinking", description: t("recruiter.interviews.ai.exercises.legacy.rubricDetails.alternative") },
          { title: "Trade-off Analysis", description: t("recruiter.interviews.ai.exercises.legacy.rubricDetails.tradeOff") },
          { title: "Technical Judgment", description: t("recruiter.interviews.ai.exercises.legacy.rubricDetails.judgment") },
        ]}
      />
    </>
  );
}

function BehavioralConfig({ jobSkills }: { jobSkills: string[] }) {
  const t = useT();
  const [enabled, setEnabled] = useState(true);
  const [count, setCount] = useState(4);
  const [mode, setMode] = useState("speech");
  const [followUp, setFollowUp] = useState(true);
  const [max, setMax] = useState(2);
  const [real, setReal] = useState(true);
  const [action, setAction] = useState(true);
  const [result, setResult] = useState(true);
  const [reflection, setReflection] = useState(true);
  const senior = jobSkills.some((skill) => /lead|architect|mentor/i.test(skill));

  return (
    <>
      <Card title={t("recruiter.interviews.ai.exercises.legacy.behConfigCard1Title")} icon={Star}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Toggle
            label={t("recruiter.interviews.ai.exercises.common.enableProcessLabel")}
            directKey="enabled"
            description={t("recruiter.interviews.ai.exercises.legacy.behConfigEnableDesc")}
            checked={enabled}
            onChange={setEnabled}
          />
          <Metric label={t("recruiter.interviews.ai.exercises.legacy.behQuestionStyleLabel")} value="STAR" />
          <SelectField
            label={t("recruiter.interviews.ai.exercises.legacy.questionCountLabel")}
            directKey="questionCount"
            value={String(count)}
            onChange={(value) => setCount(Number(value))}
            options={[1, 2, 3, 4].map((c) => ({
              value: String(c),
              label: t("recruiter.interviews.ai.exercises.common.questionsCount", { count: c }),
            }))}
          />
          <ChoiceField
            label={t("recruiter.interviews.ai.exercises.communication.responseModeLabel")}
            directKey="responseMode"
            value={mode}
            onChange={setMode}
            options={[
              {
                value: "speech",
                label: t("recruiter.interviews.ai.exercises.communication.modeSpeech"),
                detail: t("recruiter.interviews.ai.exercises.legacy.reasonSpeechDetail"),
              },
              {
                value: "text",
                label: t("recruiter.interviews.ai.exercises.communication.modeText"),
                detail: t("recruiter.interviews.ai.exercises.legacy.reasonTextDetail"),
              },
            ]}
          />
          <Metric label={t("recruiter.interviews.ai.exercises.legacy.behScenarioSourceLabel")} value="Job Context" />
          <Metric
            label={t("recruiter.interviews.ai.exercises.legacy.behAnswerTimeLabel")}
            value={t("recruiter.interviews.ai.exercises.common.minutesValue", { minutes: 3 })}
          />
        </div>
      </Card>
      <Card title={t("recruiter.interviews.ai.exercises.legacy.behConfigCard2Title")} icon={Lightbulb}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle
            label={t("recruiter.interviews.ai.exercises.communication.followUpLabel")}
            directKey="followUpEnabled"
            description={t("recruiter.interviews.ai.exercises.legacy.behFollowUpDesc")}
            checked={followUp}
            onChange={setFollowUp}
          />
          <SelectField
            label={t("recruiter.interviews.ai.exercises.communication.maxFollowUpLabel")}
            directKey="maxFollowUp"
            value={String(max)}
            onChange={(value) => setMax(Number(value))}
            options={[1, 2, 3].map((c) => ({
              value: String(c),
              label: t("recruiter.interviews.ai.exercises.common.questionsCount", { count: c }),
            }))}
          />
          <Toggle
            label={t("recruiter.interviews.ai.exercises.legacy.behRealLabel")}
            directKey="requireRealExample"
            description={t("recruiter.interviews.ai.exercises.legacy.behRealDesc")}
            checked={real}
            onChange={setReal}
          />
          <Toggle
            label={t("recruiter.interviews.ai.exercises.legacy.behActionLabel")}
            directKey="askAction"
            description={t("recruiter.interviews.ai.exercises.legacy.behActionDesc")}
            checked={action}
            onChange={setAction}
          />
          <Toggle
            label={t("recruiter.interviews.ai.exercises.legacy.behResultLabel")}
            directKey="askResult"
            description={t("recruiter.interviews.ai.exercises.legacy.behResultDesc")}
            checked={result}
            onChange={setResult}
          />
          <Toggle
            label={t("recruiter.interviews.ai.exercises.legacy.behReflectionLabel")}
            directKey="askReflection"
            description={t("recruiter.interviews.ai.exercises.legacy.behReflectionDesc")}
            checked={reflection}
            onChange={setReflection}
          />
        </div>
      </Card>
      <ExampleShell
        title={t("recruiter.interviews.ai.exercises.legacy.behPreviewStarTitle", { count })}
        meta={t("recruiter.interviews.ai.exercises.legacy.behPreviewStarMeta")}
      >
        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">
          {senior ? t("recruiter.interviews.ai.exercises.legacy.behPromptLead") : t("recruiter.interviews.ai.exercises.legacy.behPromptTeam")}
        </p>
        {followUp && (
          <p className="mt-3 text-xs text-slate-500">
            {t("recruiter.interviews.ai.exercises.legacy.behFollowUpHint", { max })}
          </p>
        )}
      </ExampleShell>
      <Rubric
        processName="BEHAVIORAL"
        items={[
          { title: "Situation Clarity", description: t("recruiter.interviews.ai.exercises.legacy.rubricDetails.situation") },
          { title: "Action Ownership", description: t("recruiter.interviews.ai.exercises.legacy.rubricDetails.actionOwnership") },
          { title: "Result", description: t("recruiter.interviews.ai.exercises.legacy.rubricDetails.result") },
          { title: "Reflection", description: t("recruiter.interviews.ai.exercises.legacy.rubricDetails.reflection") },
        ]}
      />
    </>
  );
}

function CommunicationConfig({ jobSkills = [] }: { jobSkills?: string[] }) {
  const t = useT();
  const [topic, setTopic] = useState("JOB_REQUIREMENTS");
  const [language, setLanguage] = useState("English");
  const [mode, setMode] = useState("speech");
  const [followUp, setFollowUp] = useState(true);
  const [max, setMax] = useState(2);
  const [adaptive, setAdaptive] = useState(true);
  const [audio, setAudio] = useState(true);
  const [signals, setSignals] = useState(true);
  const safeSkills = Array.isArray(jobSkills) ? jobSkills : [];

  const languageLabelMap: Record<string, string> = {
    English: t("recruiter.interviews.ai.exercises.communication.langEnglish"),
    Vietnamese: t("recruiter.interviews.ai.exercises.communication.langVietnamese"),
    Japanese: t("recruiter.interviews.ai.exercises.communication.langJapanese"),
  };

  const followUpCount = followUp ? max : 0;
  const totalQuestions = 1 + followUpCount;

  return (
    <>
      <Card title={t("recruiter.interviews.ai.exercises.communication.card1Title")} icon={MessageCircle}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Metric
            label={t("recruiter.interviews.ai.exercises.communication.statusLabel")}
            value={t("recruiter.interviews.ai.exercises.communication.statusActive")}
          />
          <SelectField
            label={t("recruiter.interviews.ai.exercises.communication.topicLabel")}
            directKey="topic"
            value={topic}
            onChange={setTopic}
            options={[
              {
                value: "JOB_REQUIREMENTS",
                label: t("recruiter.interviews.ai.exercises.communication.topicJobRequirements"),
              },
              ...safeSkills.map((skill) => ({ value: skill, label: skill })),
            ]}
          />
          <ChoiceField
            label={t("recruiter.interviews.ai.exercises.communication.responseModeLabel")}
            directKey="responseMode"
            value={mode}
            onChange={setMode}
            options={[
              {
                value: "speech",
                label: t("recruiter.interviews.ai.exercises.communication.modeSpeech"),
                detail: t("recruiter.interviews.ai.exercises.communication.modeSpeechDetail"),
              },
              {
                value: "text",
                label: t("recruiter.interviews.ai.exercises.communication.modeText"),
                detail: t("recruiter.interviews.ai.exercises.communication.modeTextDetail"),
              },
            ]}
          />
          <SelectField
            label={t("recruiter.interviews.ai.exercises.communication.languageLabel")}
            directKey="language"
            value={language}
            onChange={setLanguage}
            options={[
              { value: "English", label: t("recruiter.interviews.ai.exercises.communication.langEnglish") },
              { value: "Vietnamese", label: t("recruiter.interviews.ai.exercises.communication.langVietnamese") },
              { value: "Japanese", label: t("recruiter.interviews.ai.exercises.communication.langJapanese") },
            ]}
          />
          <Metric
            label={t("recruiter.interviews.ai.exercises.communication.interactionLabel")}
            value={t("recruiter.interviews.ai.exercises.communication.interactionTurnBased")}
          />
          <Toggle
            label={t("recruiter.interviews.ai.exercises.communication.adaptiveLabel")}
            directKey="adaptiveQuestions"
            description={t("recruiter.interviews.ai.exercises.communication.adaptiveDesc")}
            checked={adaptive}
            onChange={setAdaptive}
          />
        </div>
      </Card>
      <Card title={t("recruiter.interviews.ai.exercises.communication.card2Title")} icon={Lightbulb}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle
            label={t("recruiter.interviews.ai.exercises.communication.followUpLabel")}
            directKey="followUpEnabled"
            description={t("recruiter.interviews.ai.exercises.communication.followUpDesc")}
            checked={followUp}
            onChange={setFollowUp}
          />
          <SelectField
            label={t("recruiter.interviews.ai.exercises.communication.maxFollowUpLabel")}
            directKey="maxFollowUp"
            value={String(max)}
            onChange={(value) => setMax(Number(value))}
            options={Array.from({ length: 9 }, (_, index) => index + 2).map((value) => ({
              value: String(value),
              label: t("recruiter.interviews.ai.exercises.communication.maxFollowUpOption", { count: value }),
            }))}
          />
          <Toggle
            label={t("recruiter.interviews.ai.exercises.communication.recordAudioLabel")}
            directKey="recordAudio"
            description={t("recruiter.interviews.ai.exercises.communication.recordAudioDesc")}
            checked={audio}
            onChange={setAudio}
          />
          <Toggle
            label={t("recruiter.interviews.ai.exercises.communication.speechSignalsLabel")}
            directKey="speechSignals"
            description={t("recruiter.interviews.ai.exercises.communication.speechSignalsDesc")}
            checked={signals}
            onChange={setSignals}
          />
          <Metric
            label={t("recruiter.interviews.ai.exercises.communication.totalMaxQuestionsLabel")}
            value={t("recruiter.interviews.ai.exercises.communication.totalMaxQuestionsValue", {
              followUp: followUpCount,
              total: totalQuestions,
            })}
          />
          <Metric
            label={t("recruiter.interviews.ai.exercises.communication.estimatedTimeLabel")}
            value={t("recruiter.interviews.ai.exercises.communication.estimatedTimeValue", {
              questions: totalQuestions,
              minutes: totalQuestions * 5,
            })}
          />
          <Metric
            label={t("recruiter.interviews.ai.exercises.communication.transcriptLabel")}
            value={t("recruiter.interviews.ai.exercises.communication.transcriptValue")}
          />
          <Metric
            label={t("recruiter.interviews.ai.exercises.communication.realtimeLabel")}
            value={t("recruiter.interviews.ai.exercises.communication.realtimeValue")}
          />
        </div>
      </Card>
      <ExampleShell
        title={t("recruiter.interviews.ai.exercises.communication.flowTitle")}
        meta={`${languageLabelMap[language] ?? language} · ${safeSkills.join(", ") || t("recruiter.interviews.ai.exercises.communication.flowFallbackTopic")}`}
      >
        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
          {t("recruiter.interviews.ai.exercises.communication.flowDesc")}
        </p>
      </ExampleShell>
      <Rubric
        processName={t("recruiter.interviews.ai.exercises.communication.rubricProcess")}
        items={[
          {
            title: t("recruiter.interviews.ai.exercises.communication.rubricTechnicalKnowledge"),
            description: t("recruiter.interviews.ai.exercises.common.rubricDefaultDesc"),
          },
          {
            title: t("recruiter.interviews.ai.exercises.communication.rubricProblemSolving"),
            description: t("recruiter.interviews.ai.exercises.common.rubricDefaultDesc"),
          },
          {
            title: t("recruiter.interviews.ai.exercises.communication.rubricReasoning"),
            description: t("recruiter.interviews.ai.exercises.common.rubricDefaultDesc"),
          },
          {
            title: t("recruiter.interviews.ai.exercises.communication.rubricCommunication"),
            description: t("recruiter.interviews.ai.exercises.common.rubricDefaultDesc"),
          },
        ]}
      />
    </>
  );
}

function PracticalExperienceConfig({ jobSkills = [] }: { jobSkills?: string[] }) {
  const t = useT();
  const safeSkills = Array.isArray(jobSkills) ? jobSkills : [];
  const [enabled, setEnabled] = useState(true);
  const [count, setCount] = useState(3);
  const [response, setResponse] = useState("speech");
  const [depth, setDepth] = useState("standard");
  const [followUp, setFollowUp] = useState(true);
  const [maxFollowUp, setMaxFollowUp] = useState(2);
  const [realExample, setRealExample] = useState(true);
  const [role, setRole] = useState(true);
  const [challenges, setChallenges] = useState(true);
  const [result, setResult] = useState(true);
  const [verifyCv, setVerifyCv] = useState(true);
  const domain = safeSkills.find((skill) => /kafka|redis|rabbit/i.test(skill)) ?? safeSkills[0] ?? "Kafka";

  return (
    <>
      <Card title={t("recruiter.interviews.ai.exercises.legacy.pracCard1Title")} icon={FileSearch}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Toggle
            label={t("recruiter.interviews.ai.exercises.common.enableProcessLabel")}
            directKey="enabled"
            description={t("recruiter.interviews.ai.exercises.legacy.pracEnableDesc")}
            checked={enabled}
            onChange={setEnabled}
          />
          <SelectField
            label={t("recruiter.interviews.ai.exercises.legacy.pracCountLabel")}
            directKey="mainQuestionCount"
            value={String(count)}
            onChange={(value) => setCount(Number(value))}
            options={[1, 2, 3].map((c) => ({
              value: String(c),
              label: t("recruiter.interviews.ai.exercises.common.questionsCount", { count: c }),
            }))}
          />
          <ChoiceField
            label={t("recruiter.interviews.ai.exercises.communication.responseModeLabel")}
            directKey="responseMode"
            value={response}
            onChange={setResponse}
            options={[
              {
                value: "speech",
                label: t("recruiter.interviews.ai.exercises.communication.modeSpeech"),
                detail: t("recruiter.interviews.ai.exercises.legacy.pracSpeechDetail"),
              },
              {
                value: "text",
                label: t("recruiter.interviews.ai.exercises.communication.modeText"),
                detail: t("recruiter.interviews.ai.exercises.legacy.pracTextDetail"),
              },
            ]}
          />
          <ChoiceField
            label={t("recruiter.interviews.ai.exercises.legacy.pracDepthLabel")}
            directKey="experienceDepth"
            value={depth}
            onChange={setDepth}
            options={[
              {
                value: "basic",
                label: t("recruiter.interviews.ai.exercises.legacy.pracDepthBasic"),
                detail: t("recruiter.interviews.ai.exercises.legacy.pracDepthBasicDetail"),
              },
              {
                value: "standard",
                label: t("recruiter.interviews.ai.exercises.legacy.pracDepthStandard"),
                detail: t("recruiter.interviews.ai.exercises.legacy.pracDepthStandardDetail"),
              },
              {
                value: "deep",
                label: t("recruiter.interviews.ai.exercises.legacy.pracDepthDeep"),
                detail: t("recruiter.interviews.ai.exercises.legacy.pracDepthDeepDetail"),
              },
            ]}
          />
          <Metric
            label={t("recruiter.interviews.ai.exercises.legacy.behAnswerTimeLabel")}
            value={t("recruiter.interviews.ai.exercises.common.minutesValue", { minutes: 3 })}
          />
        </div>
      </Card>
      <Card title={t("recruiter.interviews.ai.exercises.legacy.pracCard2Title")} icon={BadgeCheck}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle
            label={t("recruiter.interviews.ai.exercises.communication.followUpLabel")}
            directKey="followUpEnabled"
            description={t("recruiter.interviews.ai.exercises.legacy.pracFollowUpDesc")}
            checked={followUp}
            onChange={setFollowUp}
          />
          <SelectField
            label={t("recruiter.interviews.ai.exercises.communication.maxFollowUpLabel")}
            directKey="maxFollowUp"
            value={String(maxFollowUp)}
            onChange={(value) => setMaxFollowUp(Number(value))}
            options={[1, 2, 3].map((c) => ({
              value: String(c),
              label: t("recruiter.interviews.ai.exercises.common.questionsCount", { count: c }),
            }))}
          />
          <Toggle
            label={t("recruiter.interviews.ai.exercises.legacy.pracRealLabel")}
            directKey="askRealExample"
            description={t("recruiter.interviews.ai.exercises.legacy.pracRealDesc")}
            checked={realExample}
            onChange={setRealExample}
          />
          <Toggle
            label={t("recruiter.interviews.ai.exercises.legacy.pracRoleLabel")}
            directKey="askCandidateRole"
            description={t("recruiter.interviews.ai.exercises.legacy.pracRoleDesc")}
            checked={role}
            onChange={setRole}
          />
          <Toggle
            label={t("recruiter.interviews.ai.exercises.legacy.pracChallengeLabel")}
            directKey="askChallenges"
            description={t("recruiter.interviews.ai.exercises.legacy.pracChallengeDesc")}
            checked={challenges}
            onChange={setChallenges}
          />
          <Toggle
            label={t("recruiter.interviews.ai.exercises.legacy.pracResultLabel")}
            directKey="askResult"
            description={t("recruiter.interviews.ai.exercises.legacy.pracResultDesc")}
            checked={result}
            onChange={setResult}
          />
          <Toggle
            label={t("recruiter.interviews.ai.exercises.legacy.pracVerifyLabel")}
            directKey="verifyAgainstCV"
            description={t("recruiter.interviews.ai.exercises.legacy.pracVerifyDesc")}
            checked={verifyCv}
            onChange={setVerifyCv}
          />
        </div>
      </Card>
      <ExperiencePreview
        enabled={enabled}
        count={count}
        response={response}
        depth={depth}
        followUp={followUp}
        maxFollowUp={maxFollowUp}
        domain={domain}
        realExample={realExample}
        role={role}
        challenges={challenges}
        result={result}
        verifyCv={verifyCv}
      />
      <Rubric
        processName="PRACTICAL EXPERIENCE"
        items={[
          { title: "Project Ownership", description: t("recruiter.interviews.ai.exercises.legacy.rubricDetails.ownership") },
          { title: "Technical Depth", description: t("recruiter.interviews.ai.exercises.legacy.rubricDetails.techDepth") },
          { title: "CV Consistency", description: t("recruiter.interviews.ai.exercises.legacy.rubricDetails.cvConsistency") },
          { title: "Problem Resolution", description: t("recruiter.interviews.ai.exercises.legacy.rubricDetails.resolution") },
        ]}
      />
    </>
  );
}

function ExperiencePreview({
  enabled,
  count,
  response,
  depth,
  followUp,
  maxFollowUp,
  domain,
  realExample,
  role,
  challenges,
  result,
  verifyCv,
}: {
  enabled: boolean;
  count: number;
  response: string;
  depth: string;
  followUp: boolean;
  maxFollowUp: number;
  domain: string;
  realExample: boolean;
  role: boolean;
  challenges: boolean;
  result: boolean;
  verifyCv: boolean;
}) {
  const t = useT();
  const probes = [
    { label: t("recruiter.interviews.ai.exercises.legacy.pracProbeReal"), enabled: realExample },
    { label: t("recruiter.interviews.ai.exercises.legacy.pracProbeRole"), enabled: role },
    { label: t("recruiter.interviews.ai.exercises.legacy.pracProbeChallenge"), enabled: challenges },
    { label: t("recruiter.interviews.ai.exercises.legacy.pracProbeResult"), enabled: result },
  ];
  const mode =
    response === "speech"
      ? t("recruiter.interviews.ai.exercises.communication.modeSpeech")
      : t("recruiter.interviews.ai.exercises.communication.modeText");

  return (
    <ExampleShell
      title={t("recruiter.interviews.ai.exercises.legacy.pracPreviewTitle", { count })}
      meta={`${mode} · ${depth} · ${t("recruiter.interviews.ai.exercises.common.minutesValue", { minutes: 3 })}`}
    >
      {!enabled ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-4 text-xs text-slate-500">
          {t("recruiter.interviews.ai.exercises.legacy.pracDisabled")}
        </p>
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-bold text-slate-900 dark:text-slate-100">
                {t("recruiter.interviews.ai.exercises.legacy.pracMapTitle")}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                {t("recruiter.interviews.ai.exercises.legacy.pracMapDesc")}
              </p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-primary-soft)] border border-[var(--color-primary)]/25 px-2.5 py-0.5 text-[10px] font-semibold text-[var(--color-primary-hover)]">
              <Sparkles className="size-3" aria-hidden="true" />{" "}
              {t("recruiter.interviews.ai.exercises.legacy.pracDepthBadge", { depth })}
            </span>
          </div>

          <div className="grid gap-2 lg:grid-cols-[1fr_auto_1.25fr_auto_1fr] lg:items-stretch">
            <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-primary-hover)]">
                {t("recruiter.interviews.ai.exercises.legacy.pracStep1")}
              </p>
              <div className="mt-2 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                <p>
                  <strong className="text-slate-800 dark:text-slate-200">Job</strong> · Backend Developer · {domain}
                </p>
                <p>
                  <strong className="text-slate-800 dark:text-slate-200">CV</strong> · E-commerce · Spring Boot · {domain}
                </p>
              </div>
            </div>
            <ArrowRight className="mx-auto hidden size-4 self-center text-slate-400 lg:block" aria-hidden="true" />
            <div className="rounded-xl border border-[var(--color-primary)]/20 bg-[var(--color-primary-subtle)] p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-primary-hover)]">
                {t("recruiter.interviews.ai.exercises.legacy.pracStep2")}
              </p>
              <p className="mt-1.5 text-xs font-semibold leading-relaxed text-slate-900 dark:text-slate-100">
                {t("recruiter.interviews.ai.exercises.legacy.pracStep2Question", { domain })}
              </p>
              <p className="mt-1 text-[10px] text-slate-500">
                {t("recruiter.interviews.ai.exercises.legacy.pracStep2Hint", { mode: mode.toLowerCase() })}
              </p>
            </div>
            <ArrowRight className="mx-auto hidden size-4 self-center text-slate-400 lg:block" aria-hidden="true" />
            <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
              <p className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-primary-hover)]">
                {t("recruiter.interviews.ai.exercises.legacy.pracStep3")}
              </p>
              <div className="mt-2 grid gap-1">
                {probes.map((probe) => (
                  <span
                    key={probe.label}
                    className={cn(
                      "flex items-center gap-1.5 text-xs",
                      probe.enabled ? "text-slate-800 dark:text-slate-200 font-medium" : "text-slate-300 dark:text-slate-600 line-through",
                    )}
                  >
                    <CheckCircle2
                      className={cn("size-3.5 shrink-0", probe.enabled ? "text-[var(--color-primary)]" : "text-slate-300")}
                      aria-hidden="true"
                    />
                    {probe.label}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <div
              className={cn(
                "rounded-xl border p-3 text-xs",
                followUp ? "border-[var(--color-primary)]/20 bg-[var(--color-primary-subtle)]/70" : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900",
              )}
            >
              <p className="font-bold text-slate-900 dark:text-slate-100">
                {followUp
                  ? t("recruiter.interviews.ai.exercises.legacy.pracStep4On", { max: maxFollowUp })
                  : t("recruiter.interviews.ai.exercises.legacy.pracStep4Off")}
              </p>
              <p className="mt-1 text-slate-500 dark:text-slate-400 leading-relaxed">
                {followUp
                  ? t("recruiter.interviews.ai.exercises.legacy.pracStep4OnDesc", { domain })
                  : t("recruiter.interviews.ai.exercises.legacy.pracStep4OffDesc")}
              </p>
            </div>
            <div
              className={cn(
                "rounded-xl border p-3 text-xs",
                verifyCv ? "border-[var(--color-primary)]/20 bg-[var(--color-primary-subtle)]/70" : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900",
              )}
            >
              <p className="font-bold text-slate-900 dark:text-slate-100">
                {verifyCv
                  ? t("recruiter.interviews.ai.exercises.legacy.pracStep5On")
                  : t("recruiter.interviews.ai.exercises.legacy.pracStep5Off")}
              </p>
              <p className="mt-1 text-slate-500 dark:text-slate-400 leading-relaxed">
                {verifyCv
                  ? t("recruiter.interviews.ai.exercises.legacy.pracStep5OnDesc")
                  : t("recruiter.interviews.ai.exercises.legacy.pracStep5OffDesc")}
              </p>
            </div>
          </div>
        </>
      )}
    </ExampleShell>
  );
}
