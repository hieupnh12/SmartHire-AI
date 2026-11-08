import { createContext, useContext, useEffect, useId, useState, type ReactNode } from "react";
import type { InterviewProcessConfig } from "@/api/types/aiInterview";
import { ArrowRight, BadgeCheck, Braces, CheckCircle2, ClipboardCheck, Code2, FileSearch, Gauge, Lightbulb, MessageCircle, Network, ShieldCheck, Sparkles, Star, TimerReset } from "lucide-react";
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

const exercises: { id: ExerciseId; title: string; short: string; description: string; weight: string }[] = [
  { id: "conceptual", title: "Technical Knowledge", short: "Trắc nghiệm đáp án", description: "Kiểm tra nền tảng lý thuyết, kiến trúc và bản chất hoạt động của công nghệ.", weight: "20%" },
  { id: "scenario", title: "Problem Solving", short: "Tình huống hệ thống", description: "Đánh giá cách phân tích sự cố, lập luận và quyết định dưới áp lực.", weight: "20%" },
  { id: "experience", title: "Practical Experience", short: "Kinh nghiệm từ CV", description: "Bóc tách kinh nghiệm thực tế và đối soát thông tin ứng viên cung cấp.", weight: "15%" },
  { id: "code", title: "Technical Reasoning", short: "Code review", description: "Phân tích mã nguồn, phát hiện lỗi và đề xuất hướng cải thiện.", weight: "20%" },
  { id: "behavioral", title: "Behavioral Competency", short: "Hành vi", description: "Đánh giá kỹ năng hành vi, xử lý xung đột và tinh thần chịu trách nhiệm.", weight: "15%" },
  { id: "communication", title: "Communication", short: "Giao tiếp kỹ thuật", description: "Đánh giá khả năng truyền đạt kỹ thuật rõ ràng cho từng nhóm người nghe.", weight: "10%" },
];

export function ExerciseStructureConfigurator({ jobSkills, processes, onChange }: {
  jobSkills: string[];
  processes: InterviewProcessConfig[];
  onChange: (processes: InterviewProcessConfig[]) => void;
}) {
  const [active, setActive] = useState<ExerciseId>("communication");
  const exercise = exercises.find(item => item.id === active)!;
  function updateProcess(next: InterviewProcessConfig) {
    onChange(processes.map(process => process.key === next.key ? next : process));
  }

  return (
    <div role="tabpanel" className="space-y-4">
      <div className="rounded-xl border border-blue-200/70 bg-blue-50/50 p-4 dark:border-blue-900/50 dark:bg-blue-950/30">
        <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Cấu trúc bài tập chuyên biệt</p>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Communication đang hoạt động. Các quy trình khác sẽ phát triển mở rộng trong tương lai và chưa thể sử dụng.</p>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-xl bg-slate-100/70 p-1 dark:bg-slate-800/60" role="tablist" aria-label="Quy trình bài tập">
        {exercises.map((item, index) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            disabled={item.id !== "communication"}
            title={item.id !== "communication" ? "Sẽ phát triển trong tương lai" : undefined}
            aria-selected={active === item.id}
            onClick={() => setActive(item.id)}
            className={cn(
              "inline-flex h-9 shrink-0 items-center gap-2 rounded-lg px-3 text-xs font-semibold transition-all cursor-pointer disabled:cursor-not-allowed disabled:opacity-40",
              active === item.id
                ? "bg-white text-[#0066FF] shadow-xs dark:bg-slate-900 dark:text-blue-400"
                : "text-slate-600 hover:bg-slate-200/60 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
            )}
          >
            <span className={cn(
              "grid size-4.5 place-items-center rounded-full text-[10px]",
              active === item.id ? "bg-blue-100 text-[#0066FF] font-bold" : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
            )}>
              {String(index + 1).padStart(2, "0")}
            </span>
            <span>{item.title}</span>
            {item.id !== "communication" && <span className="text-[10px] font-normal text-slate-400">Sắp ra mắt</span>}
          </button>
        ))}
      </div>

      <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-slate-50/40 dark:border-slate-800 dark:bg-slate-900/40 shadow-2xs">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-blue-50 border border-blue-200/60 px-2 py-0.5 text-[10px] font-bold text-[#0066FF] dark:bg-blue-950 dark:text-blue-300">
                QUY TRÌNH {String(exercises.indexOf(exercise) + 1).padStart(2, "0")}
              </span>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{exercise.title.toUpperCase()}</h3>
            </div>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{exercise.description}</p>
          </div>
          <span className="rounded-full bg-emerald-50 border border-emerald-200/60 px-2.5 py-1 text-xs font-semibold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
            Trọng số 100% · Ngưỡng đạt theo cấu hình chung
          </span>
        </header>
        <div className="space-y-4 p-4">
          <ProcessConfigScope process={findProcess(processes, "COMMUNICATION")} onChange={updateProcess}>
            <div className={active === "communication" ? undefined : "hidden"}>
              <CommunicationConfig jobSkills={jobSkills} />
            </div>
          </ProcessConfigScope>
        </div>
      </section>
    </div>
  );
}

type ProcessConfigContextValue = {
  read: (label: string, fallback: string | boolean) => string | boolean;
  write: (label: string, value: string | boolean) => void;
};

const ProcessConfigContext = createContext<ProcessConfigContextValue | null>(null);

function ProcessConfigScope({ process, onChange, children }: { process: InterviewProcessConfig; onChange: (process: InterviewProcessConfig) => void; children: ReactNode }) {
  const read = (label: string, fallback: string | boolean) => label === "Enable Process" ? process.enabled : (process.config[configKey(label)] as string | boolean | undefined) ?? fallback;
  const write = (label: string, value: string | boolean) => onChange(label === "Enable Process"
    ? { ...process, enabled: Boolean(value) }
    : { ...process, config: { ...process.config, [configKey(label)]: value } });
  return <ProcessConfigContext.Provider value={{ read, write }}>{children}</ProcessConfigContext.Provider>;
}

function findProcess(processes: InterviewProcessConfig[], key: InterviewProcessConfig["key"]): InterviewProcessConfig {
  return processes.find(process => process.key === key) ?? { key, enabled: true, order: processes.length + 1, weight: 0, config: { questionCount: 1 } };
}

function configKey(label: string) {
  if (label === "Chủ đề") return "topic";
  if (/Question Count|Problem Count|Main Question Count|Scenario Count|Conversation Topics|Số câu hỏi/i.test(label)) return "questionCount";
  const words = label.replace(/[^a-zA-Z0-9]+/g, " ").trim().split(/\s+/);
  return words.map((word, index) => index === 0 ? word.toLowerCase() : word[0].toUpperCase() + word.slice(1)).join("");
}

function Card({ title, icon: Icon, children }: { title: string; icon: typeof ClipboardCheck; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
      <h4 className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
        <Icon className="size-4 text-[#0066FF]" aria-hidden="true" />
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
  const [enabled, setEnabled] = useState(true);
  const [count, setCount] = useState(10);
  const [format, setFormat] = useState("mixed");
  const [difficulty, setDifficulty] = useState("adaptive");
  const [randomize, setRandomize] = useState(true);
  const [multipleCorrect, setMultipleCorrect] = useState(true);
  const [explanationRequired, setExplanationRequired] = useState(true);
  const [showExplanation, setShowExplanation] = useState(true);
  const [showCorrect, setShowCorrect] = useState(true);
  const mode = format === "mixed" ? "Mixed" : format === "single" ? "Single-choice" : "Multiple-choice";
  const difficultyLabel = difficulty === "adaptive" ? "Adaptive to Job Level" : difficulty[0].toUpperCase() + difficulty.slice(1);

  return (
    <>
      <Card title="1. Cấu hình câu hỏi Technical Knowledge" icon={ClipboardCheck}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Toggle label="Enable Process" description="Bật quy trình Technical Knowledge cho AI Interview." checked={enabled} onChange={setEnabled} />
          <SelectField label="Question Count" value={String(count)} onChange={value => setCount(Number(value))} options={Array.from({ length: 8 }, (_, index) => ({ value: String(index + 3), label: `${index + 3} câu` }))} />
          <ChoiceField label="Question Format" value={format} onChange={setFormat} options={[{ value: "single", label: "Single", detail: "Một đáp án đúng" }, { value: "multiple", label: "Multiple", detail: "Nhiều đáp án đúng" }, { value: "mixed", label: "Mixed", detail: "AI phối hợp hai dạng" }]} />
          <ChoiceField label="Difficulty" value={difficulty} onChange={setDifficulty} options={[{ value: "easy", label: "Easy", detail: "Kiến thức nền tảng" }, { value: "medium", label: "Medium", detail: "Áp dụng kiến thức" }, { value: "hard", label: "Hard", detail: "Phân tích sâu" }, { value: "adaptive", label: "Adaptive to Job Level", detail: "Tự điều chỉnh theo cấp bậc Job" }]} />
          <Metric label="Answer Options" value="4 phương án (A, B, C, D)" />
          <Metric label="Time Limit" value="15 phút" />
        </div>
      </Card>
      <Card title="2. Quy tắc tạo và review đáp án" icon={Lightbulb}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle label="Randomize Options" description="Xáo trộn vị trí phương án cho mỗi ứng viên." checked={randomize} onChange={setRandomize} />
          <Toggle label="Allow Multiple Correct Answers" description="Cho phép AI sinh câu có nhiều phương án đúng." checked={multipleCorrect} onChange={setMultipleCorrect} />
          <Toggle label="Explanation Required" description="Yêu cầu ứng viên giải thích lựa chọn khi cần." checked={explanationRequired} onChange={setExplanationRequired} />
          <Toggle label="Show Explanation After Interview" description="Hiển thị phần AI giải thích sau khi hoàn thành." checked={showExplanation} onChange={setShowExplanation} />
          <Toggle label="Show Correct Answer" description="Hiển thị hoặc giữ kín đáp án chuẩn sau phỏng vấn." checked={showCorrect} onChange={setShowCorrect} />
        </div>
      </Card>
      <TechnicalPreview enabled={enabled} count={count} mode={mode} difficulty={difficultyLabel} randomize={randomize} multipleCorrect={multipleCorrect} explanationRequired={explanationRequired} showExplanation={showExplanation} showCorrect={showCorrect} skills={jobSkills} />
      <Rubric items={["Accuracy · Độ chính xác", "Distractor Resistance", "Speed", "Core Understanding"]} />
    </>
  );
}

function TechnicalPreview({ enabled, count, mode, difficulty, randomize, multipleCorrect, explanationRequired, showExplanation, showCorrect, skills }: { enabled: boolean; count: number; mode: string; difficulty: string; randomize: boolean; multipleCorrect: boolean; explanationRequired: boolean; showExplanation: boolean; showCorrect: boolean; skills: string[] }) {
  const displaySkills = skills.slice(0, 2);
  const hasManyCorrect = multipleCorrect && mode !== "Single-choice";
  return (
    <ExampleShell title={`Mẫu câu hỏi AI giao · Câu 01/${count}`} meta={`${mode} · 4 lựa chọn · Tổng 15 phút`}>
      <div className="mb-3 flex flex-wrap justify-between gap-2 text-[10px]">
        <span className="rounded-full bg-blue-50 text-[#0066FF] px-2 py-0.5 font-semibold">Difficulty: {difficulty}</span>
        <span className="rounded-full bg-slate-100 text-slate-600 px-2 py-0.5">{randomize ? "Đảo đáp án ngẫu nhiên" : "Giữ thứ tự đáp án"}</span>
        {displaySkills.map(skill => <span key={skill} className="rounded-full bg-blue-50 text-[#0066FF] px-2 py-0.5">{skill}</span>)}
      </div>
      {!enabled ? <p className="rounded-xl border border-dashed border-slate-300 p-4 text-xs text-slate-500">Quy trình đang tắt — AI sẽ không sinh câu hỏi Technical Knowledge.</p> : <>
        <p className="mb-3 text-xs font-semibold leading-relaxed text-slate-900 dark:text-slate-100">“Trong Spring Framework, Bean có scope là ‘prototype’ sẽ có vòng đời và cơ chế khởi tạo như thế nào so với ‘singleton’ mặc định?”</p>
        <div className="grid gap-2 md:grid-cols-2">
          {["A", "B", "C", "D"].map((letter, index) => {
            const correct = hasManyCorrect ? index === 1 || index === 2 : index === 1;
            return (
              <div key={letter} className={cn("flex gap-2.5 rounded-xl border p-2.5 text-xs transition-colors", showCorrect && correct ? "border-emerald-300 bg-emerald-50/70 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200" : "border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300")}>
                <span className="grid size-5 shrink-0 place-items-center rounded bg-slate-100 font-bold dark:bg-slate-800">{letter}</span>
                <span>Phương án mô phỏng {letter}.{showCorrect && correct && <small className="mt-1 block font-bold text-emerald-600 dark:text-emerald-400">✓ Đáp án đúng</small>}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-3 border-t border-slate-200/70 dark:border-slate-800 pt-2 text-[11px] text-slate-500 dark:text-slate-400">
          {explanationRequired ? "Ứng viên cần giải thích lựa chọn. " : "Không bắt buộc giải thích. "}
          {showExplanation ? "Sau phỏng vấn, AI hiển thị giải thích chi tiết." : "AI không hiển thị giải thích sau phỏng vấn."}
          {multipleCorrect && !hasManyCorrect ? " Multiple Correct Answers chỉ áp dụng cho câu Multiple hoặc Mixed." : ""}
        </div>
      </>}
    </ExampleShell>
  );
}

function Conceptual({ jobSkills }: { jobSkills: string[] }) {
  const [questionCount, setQuestionCount] = useState(3);
  const [selection, setSelection] = useState<"single" | "multiple">("single");
  const [options, setOptions] = useState<4 | 5>(4);
  const [skills, setSkills] = useState<string[]>(jobSkills.slice(0, 2));
  const [showAnswers, setShowAnswers] = useState(true);
  const [reasoning, setReasoning] = useState(true);
  const [timer, setTimer] = useState(60);
  const skillChoices = jobSkills.length ? jobSkills : ["Java", "Spring", "MySQL", "Redis"];
  const toggleSkill = (skill: string) => setSkills(current => current.includes(skill) ? current.filter(item => item !== skill) : [...current, skill]);

  return (
    <>
      <Card title="1. Số lượng câu hỏi và định dạng lựa chọn" icon={ClipboardCheck}>
        <div className="grid gap-3 sm:grid-cols-3">
          <SelectField label="Số lượng câu hỏi sinh ra" value={String(questionCount)} onChange={value => setQuestionCount(Number(value))} options={Array.from({ length: 8 }, (_, index) => ({ value: String(index + 3), label: `${index + 3} câu` }))} />
          <ChoiceField label="Định dạng lựa chọn" value={selection} onChange={value => setSelection(value as "single" | "multiple")} options={[{ value: "single", label: "Single-choice", detail: "Chỉ 1 đáp án đúng" }, { value: "multiple", label: "Multiple-choice", detail: "Nhiều đáp án đúng" }]} />
          <ChoiceField label="Số phương án mỗi câu" value={String(options)} onChange={value => setOptions(Number(value) as 4 | 5)} options={[{ value: "4", label: "4 phương án", detail: "A, B, C, D" }, { value: "5", label: "5 phương án", detail: "Có thêm phương án bẫy" }]} />
        </div>
      </Card>
      <Card title="2. Phân bổ Job Skills" icon={Network}>
        <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">Chọn kỹ năng AI sẽ sử dụng để sinh câu hỏi Technical Knowledge ở quy trình này.</p>
        <div className="flex flex-wrap gap-2">
          {skillChoices.map(skill => (
            <label key={skill} className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-700 has-[:checked]:border-[#0066FF] has-[:checked]:bg-blue-50 has-[:checked]:text-[#0066FF]">
              <input type="checkbox" className="accent-[#0066FF] rounded" checked={skills.includes(skill)} onChange={() => toggleSkill(skill)} />
              {skill}
            </label>
          ))}
        </div>
      </Card>
      <Card title="3. Quyền xem đáp án và giới hạn thời gian" icon={Lightbulb}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle label="Cho phép ứng viên xem lại đáp án" description="Sau khi nộp bài, ứng viên biết câu nào đúng hoặc sai." checked={showAnswers} onChange={setShowAnswers} />
          <Toggle label="AI sinh giải thích chi tiết" description="Giải thích vì sao các phương án còn lại không phù hợp." checked={reasoning} onChange={setReasoning} disabled={!showAnswers} />
          <SelectField label="Thời gian giới hạn từng câu" value={String(timer)} onChange={value => setTimer(Number(value))} options={[{ value: "45", label: "45 giây / câu" }, { value: "60", label: "60 giây / câu" }, { value: "90", label: "90 giây / câu" }]} />
        </div>
      </Card>
      <ConceptualExample questionCount={questionCount} selection={selection} options={options} timer={timer} skills={skills} showAnswers={showAnswers} reasoning={reasoning} />
      <Rubric items={["Accuracy · Độ chính xác", "Distractor Resistance", "Speed", "Core Understanding"]} />
    </>
  );
}

function ProblemSolvingConfig({ jobSkills }: { jobSkills: string[] }) {
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
  const isFrontend = jobSkills.some(skill => /react|vue|angular|typescript|javascript/i.test(skill));
  const content = isFrontend ? "React application re-render quá nhiều khi state thay đổi. Bạn sẽ xác định và xử lý vấn đề như thế nào?" : "API response time tăng từ 200ms → 4 seconds. Hãy xác định nguyên nhân có thể xảy ra và đề xuất cách xử lý.";

  return (
    <>
      <Card title="1. Cấu hình Problem Solving" icon={TimerReset}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Toggle label="Enable Process" description="Bật quy trình đánh giá xử lý vấn đề." checked={enabled} onChange={setEnabled} />
          <SelectField label="Problem Count" value={String(count)} onChange={value => setCount(Number(value))} options={[{ value: "1", label: "1 problem" }, { value: "2", label: "2 problems" }]} />
          <ChoiceField label="Problem Style" value={style} onChange={setStyle} options={[{ value: "scenario", label: "Scenario", detail: "Tình huống hệ thống" }, { value: "coding", label: "Coding", detail: "Đề xuất đoạn xử lý" }, { value: "debugging", label: "Debugging", detail: "Tìm và sửa lỗi" }, { value: "mixed", label: "Mixed", detail: "AI phối hợp các dạng" }]} />
          <ChoiceField label="Difficulty" value={difficulty} onChange={setDifficulty} options={[{ value: "adaptive", label: "Job Adaptive", detail: "Tự phù hợp cấp bậc Job" }]} />
          <ChoiceField label="Complexity" value={complexity} onChange={setComplexity} options={[{ value: "short", label: "Short", detail: "Vấn đề trọng tâm" }, { value: "medium", label: "Medium", detail: "Có nhiều giả thuyết" }, { value: "complex", label: "Complex", detail: "Nhiều lớp hệ thống" }]} />
          <Metric label="Time Limit" value="20 phút" />
        </div>
      </Card>
      <Card title="2. Yêu cầu trả lời và AI Follow-up" icon={Lightbulb}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle label="Require Solution" description="Ứng viên phải nêu giải pháp xử lý." checked={solution} onChange={setSolution} />
          <Toggle label="Require Explanation" description="Ứng viên phải giải thích nguyên nhân và lựa chọn." checked={explanation} onChange={setExplanation} />
          <Toggle label="Allow Hint" description="Cho phép AI cung cấp gợi ý khi ứng viên bế tắc." checked={hint} onChange={setHint} />
          <Toggle label="Follow-up Enabled" description="AI hỏi sâu thêm khi cần làm rõ." checked={followUp} onChange={setFollowUp} />
          <SelectField label="Max Follow-up" value={String(maxFollowUp)} onChange={value => setMaxFollowUp(Number(value))} options={[{ value: "1", label: "1 câu" }, { value: "2", label: "2 câu" }, { value: "3", label: "3 câu" }]} />
        </div>
      </Card>
      <ProblemPreview enabled={enabled} count={count} style={style} complexity={complexity} content={content} isFrontend={isFrontend} solution={solution} explanation={explanation} hint={hint} followUp={followUp} maxFollowUp={maxFollowUp} />
      <Rubric items={["Root-cause Identification", "Investigation Methodology", "Trade-off Analysis", "Solution Feasibility"]} />
    </>
  );
}

function ProblemPreview({ enabled, count, style, complexity, content, isFrontend, solution, explanation, hint, followUp, maxFollowUp }: { enabled: boolean; count: number; style: string; complexity: string; content: string; isFrontend: boolean; solution: boolean; explanation: boolean; hint: boolean; followUp: boolean; maxFollowUp: number }) {
  return (
    <ExampleShell title={`Mẫu Problem AI giao · Case 01/${count}`} meta={`${style[0].toUpperCase() + style.slice(1)} · Job Adaptive · ${complexity} · 20 phút`}>
      <div className="mb-3 rounded-lg bg-white p-2 text-xs text-slate-500 border border-slate-200/70 dark:bg-slate-900 dark:border-slate-800">AI đọc Job: {isFrontend ? "Frontend Developer · React · TypeScript" : "Backend Developer · Spring Boot · REST API · PostgreSQL"}</div>
      {!enabled ? <p className="text-xs text-slate-400">Quy trình đang tắt.</p> : <>
        <p className="text-xs font-semibold leading-relaxed text-slate-900 dark:text-slate-100">{content}</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {solution && <span className="rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">✓ Yêu cầu đề xuất solution</span>}
          {explanation && <span className="rounded-lg border border-slate-200 bg-white p-2 text-xs text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">✓ Yêu cầu giải thích root cause</span>}
          {hint && <span className="rounded-lg border border-blue-200 bg-blue-50/60 p-2 text-xs text-[#0066FF]">AI Hint có thể được sử dụng</span>}
          {followUp && <span className="rounded-lg border border-blue-200 bg-blue-50/60 p-2 text-xs text-[#0066FF]">AI follow-up: tối đa {maxFollowUp} câu</span>}
        </div>
      </>}
    </ExampleShell>
  );
}

function Scenario() {
  const [count, setCount] = useState(1);
  const [context, setContext] = useState("latency");
  const [errorLog, setErrorLog] = useState(true);
  const [apm, setApm] = useState(true);
  const [probing, setProbing] = useState(true);
  const [reference, setReference] = useState(true);
  const contexts = [{ value: "latency", label: "High Latency / Traffic spike", detail: "Hiệu năng quá tải" }, { value: "deadlock", label: "DB Deadlock", detail: "Khoá dữ liệu" }, { value: "inconsistency", label: "Data Inconsistency", detail: "Mất nhất quán dữ liệu" }, { value: "timeout", label: "Third-party Timeout", detail: "Lỗi dịch vụ bên thứ ba" }];
  const selected = contexts.find(item => item.value === context)!;

  return (
    <>
      <Card title="1. Số lượng và bối cảnh tình huống" icon={TimerReset}>
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField label="Số lượng tình huống sinh ra" value={String(count)} onChange={value => setCount(Number(value))} options={[{ value: "1", label: "1 tình huống lớn" }, { value: "2", label: "2 tình huống lớn" }]} />
          <ChoiceField label="Bối cảnh tình huống ưu tiên" value={context} onChange={setContext} options={contexts} />
        </div>
      </Card>
      <Card title="2. Dữ liệu đính kèm đề bài" icon={Network}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle label="AI sinh kèm Error Log / StackTrace" description="Ứng viên đọc và phân tích đoạn log lỗi mô phỏng Production." checked={errorLog} onChange={setErrorLog} />
          <Toggle label="AI sinh kèm chỉ số APM" description="Hiển thị CPU, RAM và Connection Pool để tạo bối cảnh sự cố thật." checked={apm} onChange={setApm} />
        </div>
      </Card>
      <Card title="3. AI Probing và review sau phỏng vấn" icon={Lightbulb}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle label="Bật câu hỏi phụ nếu trả lời chung chung" description="AI yêu cầu ứng viên giải trình sâu hơn thay vì chỉ nêu giải pháp chung chung." checked={probing} onChange={setProbing} />
          <Toggle label="Cung cấp giải pháp tham chiếu chuẩn" description="Sau khi kết thúc, ứng viên xem hướng xử lý mẫu của Senior / Architect." checked={reference} onChange={setReference} />
        </div>
      </Card>
      <ScenarioExample count={count} context={selected} errorLog={errorLog} apm={apm} probing={probing} reference={reference} />
      <Rubric items={["Root-cause Identification", "Investigation Methodology", "Trade-off Analysis", "Solution Feasibility"]} />
    </>
  );
}

function Experience() {
  const [count, setCount] = useState(1);
  const [target, setTarget] = useState("skill");
  const [rigor, setRigor] = useState("deep");
  const [consistency, setConsistency] = useState(true);

  return (
    <>
      <Card title="1. Số câu và mục tiêu bóc tách CV" icon={FileSearch}>
        <div className="grid gap-3 sm:grid-cols-2">
          <SelectField label="Số lượng câu hỏi khai thác" value={String(count)} onChange={value => setCount(Number(value))} options={[{ value: "1", label: "1 câu" }, { value: "2", label: "2 câu" }]} />
          <ChoiceField label="Target Extraction Rules" value={target} onChange={setTarget} options={[{ value: "skill", label: "Theo kỹ năng bắt buộc", detail: "Chỉ bóc tách dự án có Redis, RabbitMQ…" }, { value: "metric", label: "Theo chỉ số định lượng", detail: "Ưu tiên thành tựu có số liệu cụ thể" }]} />
        </div>
      </Card>
      <Card title="2. Mức độ kiểm chứng" icon={BadgeCheck}>
        <ChoiceField label="Verification Rigor" value={rigor} onChange={setRigor} options={[{ value: "role", label: "Mức 1 · Role Clarification", detail: "Xác nhận vai trò cụ thể trong team" }, { value: "deep", label: "Mức 2 · Deep Implementation", detail: "Hỏi cấu hình, thông số và công thức đo lường" }]} />
      </Card>
      <Card title="3. Fact-checking Feedback" icon={Lightbulb}>
        <Toggle label="Hiển thị CV Consistency Score" description="Sau khi thi, hiển thị điểm khớp, mâu thuẫn hoặc mập mờ giữa câu trả lời và CV." checked={consistency} onChange={setConsistency} />
      </Card>
      <ExperienceExample count={count} target={target} rigor={rigor} consistency={consistency} />
      <Rubric items={["Project Ownership", "Technical Depth", "CV Consistency", "Problem Resolution"]} />
    </>
  );
}

function CodeReview() {
  return (
    <>
      <Card title="1. Ngôn ngữ và loại lỗi cài cắm" icon={Code2}>
        <div className="flex flex-wrap gap-2">
          {["Java 17", "Spring Boot 3.x", "JPA / Hibernate"].map(item => (
            <span key={item} className="rounded-lg bg-blue-50 border border-blue-200/60 px-2.5 py-1 font-mono text-xs font-semibold text-[#0066FF] dark:bg-blue-950 dark:text-blue-300">
              {item}
            </span>
          ))}
        </div>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          <Toggle label="Code editor tương tác" description="Syntax highlighting và số dòng" />
          <Toggle label="Bug injection strategy" description="NullPointerException · Resource Leak · N+1 Query" />
        </div>
      </Card>
      <Card title="2. Yêu cầu refactor và rubric" icon={Braces}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle label="Yêu cầu refactor trực tiếp" description="Ứng viên sửa hoặc đọc code cải tiến" />
          <Metric label="Thời gian rà soát mã nguồn" value="2 phút" />
        </div>
      </Card>
      <PromptExample title="Mẫu code review AI giao" prompt="Đoạn service dưới đây tải danh sách đơn hàng rồi truy cập customer trong vòng lặp. Hãy chỉ ra vấn đề hiệu năng, nguyên nhân và cách refactor an toàn." meta="Java / Spring Boot · N+1 Query · 2 phút" code="orders.forEach(order -> order.getCustomer().getName());" />
      <Rubric items={["Issue Detection Speed", "Root Cause Explanation", "Refactoring Quality", "Security & Best Practices"]} />
    </>
  );
}

function Behavioral() {
  return (
    <>
      <Card title="1. Mô hình STAR và chủ đề tình huống" icon={Star}>
        <div className="grid grid-cols-4 gap-2 text-center text-xs font-bold">
          <span className="rounded-xl border border-blue-200/60 bg-blue-50 p-2 text-[#0066FF] dark:bg-blue-950 dark:text-blue-300">S<br /><small className="font-normal text-[10px]">Situation</small></span>
          <span className="rounded-xl border border-blue-200/60 bg-blue-50 p-2 text-[#0066FF] dark:bg-blue-950 dark:text-blue-300">T<br /><small className="font-normal text-[10px]">Task</small></span>
          <span className="rounded-xl border border-blue-200/60 bg-blue-50 p-2 text-[#0066FF] dark:bg-blue-950 dark:text-blue-300">A<br /><small className="font-normal text-[10px]">Action</small></span>
          <span className="rounded-xl border border-blue-200/60 bg-blue-50 p-2 text-[#0066FF] dark:bg-blue-950 dark:text-blue-300">R<br /><small className="font-normal text-[10px]">Result</small></span>
        </div>
        <Note>Chủ đề: bất đồng kỹ thuật với Tech Lead, áp lực deadline Sprint và tiếp nhận code feedback gay gắt.</Note>
      </Card>
      <Card title="2. AI Roleplay Probing" icon={ShieldCheck}>
        <Toggle label="AI Roleplay Stakeholder / Lead" description="Tạo tình huống dồn ép nhẹ để kiểm chứng thái độ và sự minh bạch." />
      </Card>
      <PromptExample title="Mẫu tình huống STAR" prompt="Hãy kể về lần bạn không đồng ý với Tech Lead về một quyết định kỹ thuật. Bạn đã trao đổi thế nào, hành động gì và kết quả ra sao?" meta="STAR response · AI roleplay · Follow-up phản biện" />
      <Rubric items={["Emotional Intelligence", "Conflict Resolution", "Transparent Communication", "Accountability & Teamwork"]} />
    </>
  );
}

function Communication() {
  return (
    <>
      <Card title="1. Hình thức đánh giá và thời lượng nói" icon={MessageCircle}>
        <div className="grid gap-3 sm:grid-cols-3">
          <Metric label="Số câu kiểm tra" value="1 câu" />
          <Metric label="Thời gian chuẩn bị" value="45 giây" />
          <Metric label="Thời lượng trả lời" value="2 phút" />
        </div>
      </Card>
      <Card title="2. AI Dynamic Probing và thử thách diễn đạt" icon={Lightbulb}>
        <Toggle label="Clarity Probe · Bật" description="AI yêu cầu ứng viên giải thích một khái niệm kỹ thuật cho khách hàng không biết code." />
      </Card>
      <PromptExample title="Mẫu thử thách diễn đạt" prompt="Hãy giải thích Redis Cache cho một quản lý sản phẩm không có nền tảng kỹ thuật, dùng một hình tượng dễ hiểu và nêu rõ khi nào không nên dùng cache." meta="Communication · Audience awareness · 2 phút" />
      <Rubric items={["Clarity · Độ rõ ràng", "Conciseness · Tính cô đọng", "Empathy & Audience Awareness", "Active Listening"]} />
    </>
  );
}

function ConceptualExample({ questionCount, selection, options, timer, skills, showAnswers, reasoning }: { questionCount: number; selection: "single" | "multiple"; options: 4 | 5; timer: number; skills: string[]; showAnswers: boolean; reasoning: boolean }) {
  const correctIndexes = selection === "multiple" ? [1, 2] : [1];
  const answers = [
    ["A", "Được khởi tạo một lần duy nhất tại ApplicationContext startup và chia sẻ dùng chung toàn ứng dụng."],
    ["B", "Một instance mới hoàn toàn được tạo ra mỗi khi có yêu cầu (getBean hoặc injection)."],
    ["C", "Chỉ khởi tạo trong phạm vi một phiên HTTP Session duy nhất của người dùng web."],
    ["D", "Spring container chịu trách nhiệm gọi destroy callback khi giải phóng prototype."],
    ["E", "Bean prototype luôn được Spring tự động cache để tái sử dụng."],
  ].slice(0, options);

  return (
    <ExampleShell title={`Mẫu câu hỏi AI giao · Câu 01/${questionCount}`} meta={`Định dạng: ${selection === "single" ? "Single-choice" : "Multiple-choice"} · ${options} lựa chọn · ${timer}s/câu`}>
      <div className="mb-3 flex flex-wrap justify-end gap-1.5 text-[10px] font-medium text-[#0066FF]">
        {skills.length ? skills.map(skill => <span key={skill} className="rounded-full bg-blue-50 px-2 py-0.5">{skill}</span>) : <span className="text-slate-400">Chưa chọn Job Skill</span>}
      </div>
      <p className="mb-3 text-xs font-semibold leading-relaxed text-slate-900 dark:text-slate-100">“Trong Spring Framework, Bean có scope là ‘prototype’ sẽ có vòng đời và cơ chế khởi tạo như thế nào so với ‘singleton’ mặc định?”</p>
      <div className="grid gap-2 md:grid-cols-2">
        {answers.map(([letter, text], index) => {
          const correct = correctIndexes.includes(index);
          return (
            <div key={letter} className={cn("flex gap-2.5 rounded-xl border p-2.5 text-xs leading-5", showAnswers && correct ? "border-emerald-300 bg-emerald-50/70 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-200" : "border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300")}>
              <span className={cn("grid size-5 shrink-0 place-items-center text-xs font-bold rounded", showAnswers && correct ? "bg-emerald-500 text-white" : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300")}>{letter}</span>
              <span>{text}{showAnswers && correct && <small className="mt-1 block font-bold text-emerald-600 dark:text-emerald-400">✓ Đáp án đúng (Key Answer)</small>}</span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap justify-between gap-2 border-t border-slate-200/70 dark:border-slate-800 pt-2 text-[11px] text-slate-500 dark:text-slate-400">
        <span>{showAnswers ? reasoning ? "Cơ chế chấm: hiển thị đáp án và AI giải thích vì sao các phương án khác không phù hợp." : "Cơ chế chấm: hiển thị đúng/sai sau khi ứng viên nộp bài." : "Cơ chế chấm: đáp án được giữ kín sau khi ứng viên nộp bài."}</span>
        <strong className="text-[#0066FF]">Score: Max 10 pts</strong>
      </div>
    </ExampleShell>
  );
}

function ScenarioExample({ count, context, errorLog, apm, probing, reference }: { count: number; context: { label: string; detail: string }; errorLog: boolean; apm: boolean; probing: boolean; reference: boolean }) {
  const prompts: Record<string, string> = {
    "Hiệu năng quá tải": "API thanh toán có p95 latency tăng từ 180ms lên 4.2s khi traffic tăng đột biến. Bạn sẽ khoanh vùng nguyên nhân và đề xuất hotfix nào?",
    "Khoá dữ liệu": "Trong giờ cao điểm, nhiều giao dịch thanh toán bị rollback do deadlock. Bạn sẽ điều tra thứ tự lock và xử lý thế nào?",
    "Mất nhất quán dữ liệu": "Số dư đơn hàng hiển thị khác nhau giữa Order Service và Payment Service. Bạn sẽ xác định nguồn sai lệch ra sao?",
    "Lỗi dịch vụ bên thứ ba": "Cổng thanh toán bên thứ ba timeout ngẫu nhiên khiến request bị treo. Bạn sẽ thiết kế retry, timeout và fallback thế nào?",
  };

  return (
    <ExampleShell title={`Mẫu tình huống AI giao · Case 01/${count}`} meta={`${context.label} · 3 phút trình bày`}>
      <p className="mb-3 text-xs font-semibold leading-relaxed text-slate-900 dark:text-slate-100">{prompts[context.detail]}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {errorLog && (
          <pre className="overflow-x-auto rounded-xl bg-slate-950 p-3 text-[11px] font-mono text-slate-100">
            <code>ERROR PaymentClient timeout after 3000ms{`\n`}traceId=acme-7f2 connectionPool=97%</code>
          </pre>
        )}
        {apm && (
          <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs dark:border-slate-800 dark:bg-slate-900">
            <strong className="block text-[#0066FF]">APM snapshot</strong>
            <span className="mt-1 block text-slate-500 dark:text-slate-400">CPU 89% · RAM 76% · Connection Pool 97/100</span>
          </div>
        )}
      </div>
      {probing && <div className="mt-3 rounded-xl border border-blue-200/60 bg-blue-50/50 p-3 text-xs text-slate-700 dark:border-blue-900/40 dark:bg-blue-950/30 dark:text-slate-200"><strong>AI Follow-up:</strong> Nếu ứng viên chỉ đề xuất “restart server”, AI sẽ hỏi bắt buộc về root cause và cách xác minh giả thuyết.</div>}
      {reference && <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900"><strong className="text-[#0066FF]">Sau khi nộp:</strong> hiển thị Reference Architecture Solution theo từng bước điều tra, hotfix và phòng ngừa dài hạn.</div>}
    </ExampleShell>
  );
}

function ExperienceExample({ count, target, rigor, consistency }: { count: number; target: string; rigor: string; consistency: boolean }) {
  const bySkill = target === "skill";
  const deep = rigor === "deep";
  const prompt = bySkill
    ? deep
      ? "Trong CV bạn ghi nhận giảm 40% độ trễ truy vấn bằng Redis. Hãy mô tả cache key, TTL, eviction policy, cách invalidation và cách bạn đo kết quả đó."
      : "Trong dự án dùng Redis, vai trò cụ thể của bạn trong team là gì và quyết định kỹ thuật nào do bạn trực tiếp thực hiện?"
    : deep
    ? "CV đề cập tăng 40% performance. Hãy giải thích baseline, công thức đo, môi trường benchmark và thay đổi kỹ thuật tạo ra kết quả này."
    : "Hãy làm rõ đóng góp của bạn vào kết quả tăng 40% performance được ghi trong CV.";

  return (
    <ExampleShell title={`Mẫu câu hỏi bóc tách CV · Câu 01/${count}`} meta={`${bySkill ? "Target: Job Skill" : "Target: Metric"} · ${deep ? "Deep Implementation" : "Role Clarification"}`}>
      <div className="mb-3 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-900">
        <strong className="text-[#0066FF]">CV evidence:</strong> “Tối ưu caching Redis, giúp giảm 40% response time cho API sản phẩm.”
      </div>
      <p className="text-xs font-semibold leading-relaxed text-slate-900 dark:text-slate-100">{prompt}</p>
      {consistency && (
        <div className="mt-3 rounded-xl border border-blue-200/60 bg-blue-50/50 p-3 text-xs dark:border-blue-900/40 dark:bg-blue-950/30">
          <strong className="text-[#0066FF]">Sau khi nộp · CV Consistency Score</strong>
          <div className="mt-2 grid gap-2 sm:grid-cols-3 text-xs">
            <span className="text-emerald-700 dark:text-emerald-400">✓ Khớp CV evidence</span>
            <span className="text-amber-700 dark:text-amber-400">! Cần làm rõ metric</span>
            <span className="text-slate-500 dark:text-slate-400">? Chi tiết chưa xác thực</span>
          </div>
        </div>
      )}
    </ExampleShell>
  );
}

function PromptExample({ title, prompt, meta, code }: { title: string; prompt: string; meta: string; code?: string }) {
  return (
    <ExampleShell title={title} meta={meta}>
      {code && (
        <pre className="mb-3 overflow-x-auto rounded-xl bg-slate-950 p-3 text-xs font-mono text-slate-100">
          <code>{code}</code>
        </pre>
      )}
      <p className="text-xs font-semibold leading-relaxed text-slate-900 dark:text-slate-100">{prompt}</p>
      <div className="mt-3 rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-400 dark:border-slate-800 dark:bg-slate-900">
        Khu vực trả lời của ứng viên · AI sẽ đặt câu hỏi follow-up theo cấu hình.
      </div>
    </ExampleShell>
  );
}

function ExampleShell({ title, meta, children }: { title: string; meta: string; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-blue-200/70 bg-blue-50/40 dark:border-blue-900/50 dark:bg-blue-950/20">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-blue-200/60 bg-blue-50/70 px-4 py-2.5 dark:border-blue-900/60 dark:bg-blue-950/40">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-[#0066FF] dark:text-blue-400">
          <Sparkles className="size-3.5" aria-hidden="true" />
          {title} <span className="font-normal normal-case text-slate-400">(Question Plan Seed)</span>
        </span>
        <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold text-[#0066FF] shadow-2xs border border-blue-100 dark:bg-slate-900 dark:border-slate-800">
          {meta}
        </span>
      </header>
      <div className="p-4">{children}</div>
    </section>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string }[] }) {
  const config = useContext(ProcessConfigContext);
  const configuredValue = String(config?.read(label, value) ?? value);
  const savedValue = configuredValue;
  useEffect(() => { if (savedValue !== value) onChange(savedValue); }, [onChange, savedValue, value]);

  return (
    <label className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-3 text-xs font-semibold text-slate-800 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-200">
      <span className="mb-1.5 block">{label}</span>
      <select
        value={savedValue}
        onChange={event => { onChange(event.target.value); config?.write(label, event.target.value); }}
        className="h-9.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-medium text-slate-900 outline-none transition-all focus:border-[#0066FF] focus:ring-2 focus:ring-blue-500/20 dark:border-slate-700 dark:bg-slate-900 dark:text-white cursor-pointer"
      >
        {!options.some(option => option.value === savedValue) && <option value={savedValue}>{savedValue} (Đã lưu)</option>}
        {options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
    </label>
  );
}

function ChoiceField({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: { value: string; label: string; detail: string }[] }) {
  const config = useContext(ProcessConfigContext);
  const fieldId = useId();
  const configuredValue = String(config?.read(label, value) ?? value);
  const savedValue = configuredValue;
  useEffect(() => { if (savedValue !== value) onChange(savedValue); }, [onChange, savedValue, value]);

  return (
    <fieldset className="rounded-xl border border-slate-200/80 bg-slate-50/40 p-3 dark:border-slate-800 dark:bg-slate-800/40">
      <legend className="px-1 text-xs font-bold text-slate-700 dark:text-slate-300">{label}</legend>
      <div className="space-y-1.5 mt-1">
        {options.map(option => (
          <label
            key={option.value}
            className={cn(
              "flex cursor-pointer gap-2.5 rounded-lg border p-2 text-xs transition-all",
              savedValue === option.value
                ? "border-[#0066FF] bg-blue-50 text-[#0066FF] font-semibold dark:bg-blue-950/60 dark:text-blue-300 shadow-2xs"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            )}
          >
            <input
              type="radio"
              name={fieldId}
              value={option.value}
              checked={savedValue === option.value}
              onChange={event => { onChange(event.target.value); config?.write(label, event.target.value); }}
              className="accent-[#0066FF] mt-0.5"
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

function Toggle({ label, description, checked = false, onChange, disabled }: { label: string; description: string; checked?: boolean; onChange?: (value: boolean) => void; disabled?: boolean }) {
  const config = useContext(ProcessConfigContext);
  const unavailable = label === "Real-time Interaction";
  const savedChecked = unavailable ? false : Boolean(config?.read(label, checked) ?? checked);
  useEffect(() => { if (savedChecked !== checked) onChange?.(savedChecked); }, [checked, onChange, savedChecked]);

  return (
    <label className={cn("flex items-start justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/40 p-3 text-xs cursor-pointer dark:border-slate-800 dark:bg-slate-800/40", disabled && "opacity-50 cursor-not-allowed")}>
      <div>
        <span className="block font-semibold text-slate-800 dark:text-slate-200">{label}</span>
        <span className="mt-0.5 block text-[11px] leading-4 text-slate-500 dark:text-slate-400">
          {unavailable ? "Chưa khả dụng. Phiên hiện dùng Text hoặc Speech-to-Text, không lưu audio." : description}
        </span>
      </div>
      <input
        type="checkbox"
        checked={savedChecked}
        disabled={disabled || unavailable}
        onChange={event => { onChange?.(event.target.checked); config?.write(label, event.target.checked); }}
        className="mt-1 size-4 accent-[#0066FF] rounded cursor-pointer shrink-0"
      />
    </label>
  );
}

function Rubric({ items }: { items: string[] }) {
  const process = items[0]?.includes("Accuracy") ? "TECHNICAL KNOWLEDGE" : items[0]?.includes("Root-cause") ? "SCENARIO" : items[0]?.includes("Project Ownership") ? "PRACTICAL EXPERIENCE" : items[0]?.includes("Justification") ? "TECHNICAL REASONING" : items[0]?.includes("Situation") ? "BEHAVIORAL" : "COMMUNICATION";
  const details: Record<string, string> = {
    "Accuracy · Độ chính xác": "Nắm đúng kiến thức cốt lõi và phân biệt được phương án nhiễu.",
    "Distractor Resistance": "Lý giải được vì sao các phương án còn lại không phù hợp.",
    "Speed": "Hoàn thành trong thời lượng quy định mà vẫn giữ được độ chính xác.",
    "Core Understanding": "Diễn giải được nguyên lý, không chỉ chọn đáp án theo cảm tính.",
    "Root-cause Identification": "Xác định đúng nguyên nhân gốc thay vì chỉ xử lý triệu chứng.",
    "Investigation Methodology": "Đưa ra trình tự điều tra, dữ liệu cần kiểm tra và cách xác minh.",
    "Trade-off Analysis": "Cân nhắc ảnh hưởng của giải pháp tới hiệu năng, chi phí và rủi ro.",
    "Solution Feasibility": "Đề xuất có thể triển khai trong bối cảnh hệ thống thực tế.",
    "Project Ownership": "Làm rõ phần việc và quyết định mà ứng viên trực tiếp chịu trách nhiệm.",
    "Technical Depth": "Mô tả được cách triển khai, thông số và lý do chọn giải pháp.",
    "CV Consistency": "Mức độ khớp giữa câu trả lời, số liệu và bằng chứng trong CV.",
    "Problem Resolution": "Cách xử lý khó khăn và kiểm chứng kết quả sau triển khai.",
    "Justification Quality": "Lý giải rõ cơ sở kỹ thuật phía sau quyết định.",
    "Alternative Thinking": "Chủ động nêu phương án thay thế và điều kiện sử dụng.",
    "Technical Judgment": "Đánh giá đúng bối cảnh áp dụng và giới hạn của giải pháp.",
    "Situation Clarity": "Trình bày đủ bối cảnh, mục tiêu và thách thức của tình huống.",
    "Action Ownership": "Nêu cụ thể hành động cá nhân, không quy kết chung cho cả nhóm.",
    "Result": "Kết quả có số liệu, tác động hoặc bài học có thể kiểm chứng.",
    "Reflection": "Rút ra bài học và hướng cải thiện cho tình huống tương tự.",
    "Clarity": "Diễn đạt mạch lạc, đúng trọng tâm và dễ theo dõi.",
    "Conciseness": "Truyền đạt đủ ý trong thời lượng cho phép, không lan man.",
    "Audience Awareness": "Điều chỉnh ngôn ngữ, ví dụ và độ sâu theo người nghe.",
    "Active Listening": "Phản hồi đúng trọng tâm trước các câu hỏi gợi mở của AI.",
  };

  return (
    <section className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-2xs dark:border-slate-800 dark:bg-slate-900">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 px-4 py-3 bg-slate-50/60 dark:bg-slate-800/40">
        <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
          <Gauge className="size-4 text-[#0066FF]" aria-hidden="true" />
          Adaptive Rubric Matrix · {process}
        </span>
        <span className="text-[10px] font-semibold text-slate-400">{items.length} thang đo độc lập</span>
      </header>
      <div className="grid divide-y divide-slate-100 dark:divide-slate-800 sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4">
        {items.map((item, index) => (
          <div key={item} className="min-h-24 p-3.5">
            <span className="text-xs font-bold text-[#0066FF] dark:text-blue-400">{index + 1}. {item}</span>
            <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{details[item] ?? "Tiêu chí độc lập AI dùng để đánh giá câu trả lời."}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function TechnicalReasoningConfig({ jobSkills }: { jobSkills: string[] }) {
  const [enabled, setEnabled] = useState(true);
  const [count, setCount] = useState(3);
  const [complexity, setComplexity] = useState("medium");
  const [mode, setMode] = useState("speech");
  const [justification, setJustification] = useState(true);
  const [alternatives, setAlternatives] = useState(true);
  const [tradeOffs, setTradeOffs] = useState(true);
  const [challenge, setChallenge] = useState(true);
  const [depth, setDepth] = useState(2);
  const frontend = jobSkills.some(skill => /react|vue|angular/i.test(skill));
  const domain = frontend ? "React state update" : "Redis";

  return (
    <>
      <Card title="1. Cấu hình Technical Reasoning" icon={Code2}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Toggle label="Enable Process" description="Bật quy trình technical reasoning." checked={enabled} onChange={setEnabled} />
          <SelectField label="Scenario Count" value={String(count)} onChange={value => setCount(Number(value))} options={[{ value: "1", label: "1 scenario" }, { value: "2", label: "2 scenarios" }, { value: "3", label: "3 scenarios" }]} />
          <ChoiceField label="Scenario Complexity" value={complexity} onChange={setComplexity} options={[{ value: "short", label: "Short", detail: "Một quyết định chính" }, { value: "medium", label: "Medium", detail: "Nhiều yếu tố" }, { value: "complex", label: "Complex", detail: "Trade-off đa tầng" }]} />
          <ChoiceField label="Response Mode" value={mode} onChange={setMode} options={[{ value: "speech", label: "Speech", detail: "Trả lời giọng nói" }, { value: "text", label: "Text", detail: "Trả lời văn bản" }]} />
          <Metric label="Time per Scenario" value="5 phút" />
        </div>
      </Card>
      <Card title="2. Chuỗi probing của AI" icon={Lightbulb}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle label="Require Justification" description="Hỏi vì sao chọn giải pháp." checked={justification} onChange={setJustification} />
          <Toggle label="Ask Alternatives" description="Yêu cầu phương án thay thế." checked={alternatives} onChange={setAlternatives} />
          <Toggle label="Ask Trade-offs" description="Yêu cầu phân tích đánh đổi." checked={tradeOffs} onChange={setTradeOffs} />
          <Toggle label="Challenge Candidate Answer" description="AI phản biện lời giải ứng viên." checked={challenge} onChange={setChallenge} />
          <SelectField label="Follow-up Depth" value={String(depth)} onChange={value => setDepth(Number(value))} options={[{ value: "1", label: "Mức 1" }, { value: "2", label: "Mức 2" }, { value: "3", label: "Mức 3" }]} />
        </div>
      </Card>
      <ExampleShell title={`Mẫu reasoning · Case 01/${count}`} meta={`${mode} · ${complexity} · 5 phút`}>
        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">Candidate: “Tôi sử dụng {domain}.”</p>
        {enabled && (
          <div className="mt-3 space-y-2 text-xs text-slate-600 dark:text-slate-400">
            <p>AI: Tại sao {domain} phù hợp?</p>
            {alternatives && <p>AI: Phương án thay thế nào bạn cân nhắc?</p>}
            {tradeOffs && <p>AI: Trade-off của giải pháp này là gì?</p>}
            {challenge && <p>AI: Trong trường hợp nào bạn sẽ không sử dụng {domain}?</p>}
          </div>
        )}
      </ExampleShell>
      <Rubric items={["Justification Quality", "Alternative Thinking", "Trade-off Analysis", "Technical Judgment"]} />
    </>
  );
}

function BehavioralConfig({ jobSkills }: { jobSkills: string[] }) {
  const [enabled, setEnabled] = useState(true);
  const [count, setCount] = useState(4);
  const [mode, setMode] = useState("speech");
  const [followUp, setFollowUp] = useState(true);
  const [max, setMax] = useState(2);
  const [real, setReal] = useState(true);
  const [action, setAction] = useState(true);
  const [result, setResult] = useState(true);
  const [reflection, setReflection] = useState(true);
  const senior = jobSkills.some(skill => /lead|architect|mentor/i.test(skill));

  return (
    <>
      <Card title="1. Cấu hình Behavioral Competency" icon={Star}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Toggle label="Enable Process" description="Bật đánh giá hành vi theo Job Context." checked={enabled} onChange={setEnabled} />
          <Metric label="Question Style" value="STAR" />
          <SelectField label="Question Count" value={String(count)} onChange={value => setCount(Number(value))} options={[{ value: "1", label: "1 câu" }, { value: "2", label: "2 câu" }, { value: "3", label: "3 câu" }, { value: "4", label: "4 câu" }]} />
          <ChoiceField label="Response Mode" value={mode} onChange={setMode} options={[{ value: "speech", label: "Speech", detail: "Trả lời giọng nói" }, { value: "text", label: "Text", detail: "Trả lời văn bản" }]} />
          <Metric label="Scenario Source" value="Job Context" />
          <Metric label="Answer Time" value="3 phút" />
        </div>
      </Card>
      <Card title="2. STAR follow-up" icon={Lightbulb}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle label="Follow-up Enabled" description="AI hỏi sâu theo STAR." checked={followUp} onChange={setFollowUp} />
          <SelectField label="Max Follow-up" value={String(max)} onChange={value => setMax(Number(value))} options={[{ value: "1", label: "1 câu" }, { value: "2", label: "2 câu" }, { value: "3", label: "3 câu" }]} />
          <Toggle label="Require Real Example" description="Bắt buộc ví dụ thực tế." checked={real} onChange={setReal} />
          <Toggle label="Ask Action" description="Khai thác hành động cụ thể." checked={action} onChange={setAction} />
          <Toggle label="Ask Result" description="Khai thác kết quả." checked={result} onChange={setResult} />
          <Toggle label="Ask Reflection" description="Yêu cầu bài học rút ra." checked={reflection} onChange={setReflection} />
        </div>
      </Card>
      <ExampleShell title={`Mẫu STAR · Câu 01/${count}`} meta="Job Context · Speech · 3 phút">
        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{senior ? "Hãy kể về một lần bạn không đồng ý với technical decision của một thành viên khác trong team." : "Hãy kể về một lần bạn phối hợp với đồng đội để hoàn thành một nhiệm vụ khó."}</p>
        {followUp && <p className="mt-3 text-xs text-slate-500">AI follow-up tối đa {max} câu về Action, Result và Reflection.</p>}
      </ExampleShell>
      <Rubric items={["Situation Clarity", "Action Ownership", "Result", "Reflection"]} />
    </>
  );
}

function CommunicationConfig({ jobSkills }: { jobSkills: string[] }) {
  const [topic, setTopic] = useState("JOB_REQUIREMENTS");
  const [language, setLanguage] = useState("English");
  const [mode, setMode] = useState("speech");
  const [followUp, setFollowUp] = useState(true);
  const [max, setMax] = useState(2);
  const [adaptive, setAdaptive] = useState(true);
  const [audio, setAudio] = useState(true);
  const [signals, setSignals] = useState(true);

  return (
    <>
      <Card title="1. Hội thoại Communication" icon={MessageCircle}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Metric label="Enable Process" value="Đang hoạt động" />
          <SelectField label="Chủ đề" value={topic} onChange={setTopic} options={[{ value: "JOB_REQUIREMENTS", label: "Yêu cầu công việc" }, ...jobSkills.map(skill => ({ value: skill, label: skill }))]} />
          <ChoiceField label="Response Mode" value={mode} onChange={setMode} options={[{ value: "speech", label: "Giọng nói", detail: "STT và bản ghi âm" }, { value: "text", label: "Văn bản", detail: "Không có tín hiệu lời nói" }]} />
          <SelectField label="Language" value={language} onChange={setLanguage} options={[{ value: "English", label: "English" }, { value: "Vietnamese", label: "Tiếng Việt" }, { value: "Japanese", label: "日本語" }]} />
          <Metric label="Interaction" value="Hội thoại theo lượt" />
          <Toggle label="Adaptive Questions" description="AI điều chỉnh câu tiếp theo từ yêu cầu công việc và câu trả lời vừa gửi." checked={adaptive} onChange={setAdaptive} />
        </div>
      </Card>
      <Card title="2. Hỏi bồi, ghi âm và cách trình bày" icon={Lightbulb}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle label="Follow-up Enabled" description="Sau câu mở đầu, AI hỏi thêm dựa trên câu trả lời trước; tất cả câu trả lời góp vào điểm tổng." checked={followUp} onChange={setFollowUp} />
          <SelectField label="Max Follow-up" value={String(max)} onChange={value => setMax(Number(value))} options={Array.from({ length: 9 }, (_, index) => index + 2).map(value => ({ value: String(value), label: `Tối đa ${value} câu hỏi thêm` }))} />
          <Toggle label="Record Audio" description="Lưu bản ghi riêng tư sau khi ứng viên đồng ý; Recruiter nghe lại sau phiên." checked={audio} onChange={setAudio} />
          <Toggle label="Speech Signals" description="Đo thời gian phản hồi, thời lượng nói và khoảng dừng từ micro; chỉ hỗ trợ Recruiter xem xét." checked={signals} onChange={setSignals} />
          <Metric label="Tổng số câu hỏi tối đa" value={`1 câu mở đầu + ${followUp ? max : 0} câu hỏi thêm = ${1 + (followUp ? max : 0)} câu`} />
          <Metric label="Thời gian dự kiến" value={`${1 + (followUp ? max : 0)} câu × 5 phút = ${(1 + (followUp ? max : 0)) * 5} phút`} />
          <Metric label="Transcript" value="STT → transcript → NLP/LLM" />
          <Metric label="Real-time Interaction" value="Streaming hai chiều: sẽ mở rộng" />
        </div>
      </Card>
      <ExampleShell title="Luồng hội thoại" meta={`${language} · ${jobSkills.join(", ") || "Theo yêu cầu Job"}`}>
        <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">AI đặt câu hỏi → ứng viên nói → STT tạo transcript → gửi câu trả lời → NLP/LLM đánh giá và chọn câu tiếp theo. Recruiter xem điểm, transcript, audio và phản hồi sau phiên.</p>
      </ExampleShell>
      <Rubric items={["Kiến thức chuyên môn", "Giải quyết vấn đề", "Lập luận", "Kỹ năng giao tiếp"]} />
    </>
  );
}

function PracticalExperienceConfig({ jobSkills }: { jobSkills: string[] }) {
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
  const domain = jobSkills.find(skill => /kafka|redis|rabbit/i.test(skill)) ?? jobSkills[0] ?? "Kafka";

  return (
    <>
      <Card title="1. Cấu hình khai thác kinh nghiệm thực tế" icon={FileSearch}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <Toggle label="Enable Process" description="Bật quy trình bóc tách kinh nghiệm từ CV." checked={enabled} onChange={setEnabled} />
          <SelectField label="Main Question Count" value={String(count)} onChange={value => setCount(Number(value))} options={[{ value: "1", label: "1 câu" }, { value: "2", label: "2 câu" }, { value: "3", label: "3 câu" }]} />
          <ChoiceField label="Response Mode" value={response} onChange={setResponse} options={[{ value: "speech", label: "Speech", detail: "Ứng viên trả lời bằng giọng nói" }, { value: "text", label: "Text", detail: "Ứng viên trả lời bằng văn bản" }]} />
          <ChoiceField label="Experience Depth" value={depth} onChange={setDepth} options={[{ value: "basic", label: "Basic", detail: "Tổng quan dự án" }, { value: "standard", label: "Standard", detail: "Vai trò và quyết định" }, { value: "deep", label: "Deep", detail: "Kiến trúc, metric, trade-off" }]} />
          <Metric label="Answer Time" value="3 phút" />
        </div>
      </Card>
      <Card title="2. Điểm AI cần khai thác và đối soát" icon={BadgeCheck}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle label="Follow-up Enabled" description="AI hỏi bồi khi cần làm rõ trải nghiệm thật." checked={followUp} onChange={setFollowUp} />
          <SelectField label="Max Follow-up" value={String(maxFollowUp)} onChange={value => setMaxFollowUp(Number(value))} options={[{ value: "1", label: "1 câu" }, { value: "2", label: "2 câu" }, { value: "3", label: "3 câu" }]} />
          <Toggle label="Ask Real Example" description="Yêu cầu ứng viên nêu tình huống đã trực tiếp trải qua." checked={realExample} onChange={setRealExample} />
          <Toggle label="Ask Candidate Role" description="Yêu cầu làm rõ trách nhiệm riêng trong team." checked={role} onChange={setRole} />
          <Toggle label="Ask Challenges" description="Yêu cầu nêu khó khăn và cách xử lý." checked={challenges} onChange={setChallenges} />
          <Toggle label="Ask Result" description="Yêu cầu nêu kết quả hoặc metric đạt được." checked={result} onChange={setResult} />
          <Toggle label="Verify Against CV" description="AI đối chiếu câu trả lời với evidence trong CV." checked={verifyCv} onChange={setVerifyCv} />
        </div>
      </Card>
      <ExperiencePreview enabled={enabled} count={count} response={response} depth={depth} followUp={followUp} maxFollowUp={maxFollowUp} domain={domain} realExample={realExample} role={role} challenges={challenges} result={result} verifyCv={verifyCv} />
      <Rubric items={["Project Ownership", "Technical Depth", "CV Consistency", "Problem Resolution"]} />
    </>
  );
}

function ExperiencePreview({ enabled, count, response, depth, followUp, maxFollowUp, domain, realExample, role, challenges, result, verifyCv }: { enabled: boolean; count: number; response: string; depth: string; followUp: boolean; maxFollowUp: number; domain: string; realExample: boolean; role: boolean; challenges: boolean; result: boolean; verifyCv: boolean }) {
  const probes = [
    { label: "Ví dụ thực tế", enabled: realExample },
    { label: "Vai trò cá nhân", enabled: role },
    { label: "Thách thức", enabled: challenges },
    { label: "Kết quả / metric", enabled: result },
  ];
  const mode = response === "speech" ? "Giọng nói" : "Văn bản";

  return (
    <ExampleShell title={`Mẫu câu hỏi AI giao · Câu 01/${count}`} meta={`${mode} · ${depth} · 3 phút`}>
      {!enabled ? <p className="rounded-xl border border-dashed border-slate-300 p-4 text-xs text-slate-500">Quy trình đang tắt — AI sẽ không tạo câu hỏi khai thác kinh nghiệm.</p> : <>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-bold text-slate-900 dark:text-slate-100">Bản đồ câu hỏi & cấu hình AI</p>
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Các bước đang bật được hiển thị theo đúng thứ tự AI xử lý.</p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 border border-blue-200/60 px-2.5 py-0.5 text-[10px] font-semibold text-[#0066FF] dark:bg-blue-950 dark:text-blue-300">
            <Sparkles className="size-3" aria-hidden="true" /> {depth} depth
          </span>
        </div>

        <div className="grid gap-2 lg:grid-cols-[1fr_auto_1.25fr_auto_1fr] lg:items-stretch">
          <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#0066FF]">01 · AI đọc ngữ cảnh</p>
            <div className="mt-2 space-y-1 text-xs text-slate-500 dark:text-slate-400">
              <p><strong className="text-slate-800 dark:text-slate-200">Job</strong> · Backend Developer · {domain}</p>
              <p><strong className="text-slate-800 dark:text-slate-200">CV</strong> · E-commerce · Spring Boot · {domain}</p>
            </div>
          </div>
          <ArrowRight className="mx-auto hidden size-4 self-center text-slate-400 lg:block" aria-hidden="true" />
          <div className="rounded-xl border border-blue-200/60 bg-blue-50/50 p-3 dark:border-blue-900/40 dark:bg-blue-950/30">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#0066FF]">02 · Câu hỏi chính</p>
            <p className="mt-1.5 text-xs font-semibold leading-relaxed text-slate-900 dark:text-slate-100">Bạn đã sử dụng {domain} trong E-commerce project như thế nào?</p>
            <p className="mt-1 text-[10px] text-slate-500">Ứng viên trả lời bằng {mode.toLowerCase()} · tối đa 3 phút</p>
          </div>
          <ArrowRight className="mx-auto hidden size-4 self-center text-slate-400 lg:block" aria-hidden="true" />
          <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
            <p className="text-[10px] font-bold uppercase tracking-wider text-[#0066FF]">03 · AI khai thác</p>
            <div className="mt-2 grid gap-1">
              {probes.map(probe => (
                <span key={probe.label} className={cn("flex items-center gap-1.5 text-xs", probe.enabled ? "text-slate-800 dark:text-slate-200 font-medium" : "text-slate-300 dark:text-slate-600 line-through")}>
                  <CheckCircle2 className={cn("size-3.5 shrink-0", probe.enabled ? "text-[#0066FF]" : "text-slate-300")} aria-hidden="true" />
                  {probe.label}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <div className={cn("rounded-xl border p-3 text-xs", followUp ? "border-blue-200/60 bg-blue-50/40 dark:border-blue-900/40 dark:bg-blue-950/20" : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900")}>
            <p className="font-bold text-slate-900 dark:text-slate-100">04 · AI Follow-up {followUp ? `· tối đa ${maxFollowUp} câu` : "· tắt"}</p>
            <p className="mt-1 text-slate-500 dark:text-slate-400 leading-relaxed">{followUp ? `Ví dụ: “Tại sao team chọn ${domain} thay vì xử lý synchronous?”` : "AI kết thúc sau câu trả lời chính."}</p>
          </div>
          <div className={cn("rounded-xl border p-3 text-xs", verifyCv ? "border-blue-200/60 bg-blue-50/40 dark:border-blue-900/40 dark:bg-blue-950/20" : "border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900")}>
            <p className="font-bold text-slate-900 dark:text-slate-100">05 · Đối soát & đánh giá {verifyCv ? "· bật" : "· tắt"}</p>
            <p className="mt-1 text-slate-500 dark:text-slate-400 leading-relaxed">{verifyCv ? "So sánh câu trả lời với CV evidence để tạo CV Consistency Score." : "Chấm theo rubric, không đối chiếu bằng chứng trong CV."}</p>
          </div>
        </div>
      </>}
    </ExampleShell>
  );
}
