import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { CircleHelp, Sparkles, TriangleAlert, X } from "lucide-react";
import { questionBankApi } from "@/api/tenant/questionBankApi";
import type { BankQuestionRequest } from "@/api/types/questionBank";
import type { CodingContent, QuestionRequest } from "@/api/types/assessment";
import { AssessmentError, assessmentInput, FieldError } from "@/components/ux/assessmentUi";
import { Button } from "@/components/ux/Button";
import { SKILL_CATALOG } from "@/features/tenant/recruiter/jobs/skillCatalog";
import { cn } from "@/lib/utils";

const SKILLS = SKILL_CATALOG.flatMap((group) => group.skills);
const HELP =
  "AI chỉ tạo nháp cho ngân hàng. Sửa preview rồi lưu; đề ứng viên vẫn rút từ ngân hàng. Câu code cần kiểm tra lời giải/testcase sau khi lưu.";

type QuestionKind = "MCQ" | "MULTIPLE_CHOICE" | "ESSAY" | "CODING";
type CodingLanguage = "java" | "python" | "javascript" | "sql";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  defaultSkill?: string;
  defaultType?: QuestionKind;
  skillOptions?: string[];
  defaultTopic?: string;
  jobContext?: string;
};

type Rubric = { referenceAnswer?: string; criteria?: { description: string; weight: number }[] };

function asRubric(value: unknown): Rubric | null {
  return value && typeof value === "object" ? (value as Rubric) : null;
}

function similarIds(meta: Record<string, unknown> | null | undefined): number[] {
  const raw = meta?.similarQuestionIds;
  return Array.isArray(raw) ? raw.filter((id): id is number => typeof id === "number") : [];
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollCodingDrafts(body: {
  skill: string;
  difficulty: "Easy" | "Medium" | "Hard";
  count: number;
  language: CodingLanguage;
  instructions: string;
}): Promise<BankQuestionRequest[]> {
  const started = await questionBankApi.generate({
    skill: body.skill,
    questionType: "CODING",
    difficulty: body.difficulty,
    count: Math.max(1, Math.min(5, body.count)),
    language: body.language,
    instructions: body.instructions,
  });
  for (let attempt = 0; attempt < 90; attempt++) {
    const status = await questionBankApi.generationStatus(started.id);
    if (status.status === "READY") {
      return status.questions.map((question) => ({
        question,
        authoringMetadata: { aiGenerated: true, source: "AI" },
      }));
    }
    if (status.status === "FAILED") {
      throw new Error(status.error || "AI chưa tạo được câu code hợp lệ.");
    }
    await sleep(2000);
  }
  throw new Error("Hết thời gian chờ AI tạo câu code. Thử lại với ít câu hơn.");
}

function codingSummary(coding: CodingContent | null | undefined) {
  if (!coding) return null;
  const langs = Object.keys(coding.starterCode ?? {});
  const sample = (coding.testCases ?? []).filter((item) => item.sample).length;
  const hidden = (coding.testCases ?? []).filter((item) => !item.sample).length;
  return {
    title: coding.title || "Bài code",
    category: coding.category,
    langs: langs.join(", ") || "—",
    sample,
    hidden,
  };
}

export function AiQuestionGenerateDialog({
  open, onClose, onSaved, defaultSkill = "", defaultType = "MCQ",
  skillOptions, defaultTopic = "", jobContext = "",
}: Props) {
  const skills = skillOptions?.length ? skillOptions : SKILLS;
  const [skill, setSkill] = useState(defaultSkill || skills[0] || "Java");
  const [difficulty, setDifficulty] = useState<"Easy" | "Medium" | "Hard">("Medium");
  const [questionType, setQuestionType] = useState<QuestionKind>(defaultType);
  const [count, setCount] = useState(3);
  const [topic, setTopic] = useState(defaultTopic);
  const [language, setLanguage] = useState<"vi" | "en">("vi");
  const [codingLanguage, setCodingLanguage] = useState<CodingLanguage>("java");
  const [drafts, setDrafts] = useState<BankQuestionRequest[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [notice, setNotice] = useState("");

  useEffect(() => {
    if (!open) return;
    setSkill(defaultSkill || skills[0] || "Java");
    setQuestionType(defaultType);
    setTopic(defaultTopic);
  }, [open, defaultSkill, defaultType, defaultTopic, skills]);

  const coding = questionType === "CODING";
  const maxCount = coding ? 5 : 10;

  const patchDraft = (index: number, patch: Partial<QuestionRequest>) => {
    setDrafts((prev) => prev.map((draft, i) => i === index ? { ...draft, question: { ...draft.question, ...patch } } : draft));
  };

  const patchOption = (index: number, optionIndex: number, patch: { optionText?: string; correct?: boolean }) => {
    setDrafts((prev) => prev.map((draft, i) => {
      if (i !== index) return draft;
      const options = (draft.question.options ?? []).map((option, j) => {
        if (j !== optionIndex) {
          if (patch.correct === true && draft.question.questionType === "MCQ") return { ...option, correct: false };
          return option;
        }
        return { ...option, ...patch };
      });
      return { ...draft, question: { ...draft.question, options } };
    }));
  };

  const generate = useMutation({
    mutationFn: async () => {
      if (coding) {
        const instructions = [topic.trim(), jobContext.trim()].filter(Boolean).join("\n\n");
        return pollCodingDrafts({
          skill,
          difficulty,
          count,
          language: codingLanguage,
          instructions,
        });
      }
      return questionBankApi.generateDrafts({
        skill,
        difficulty,
        questionType,
        count,
        topic: topic.trim() || undefined,
        language,
        context: jobContext.trim() || undefined,
      });
    },
    onSuccess: (items) => {
      setDrafts(items);
      setSelected(new Set(items.map((_, index) => index)));
      const dupes = items.filter((item) => similarIds(item.authoringMetadata).length > 0).length;
      const codingHint = items.some((item) => item.question.questionType === "CODING")
        ? " Với câu code, kiểm tra lời giải và testcase sau khi lưu."
        : "";
      setNotice(dupes
        ? `AI đã soạn ${items.length} câu nháp. ${dupes} câu có cảnh báo trùng gần giống — chỉnh sửa trước khi lưu.${codingHint}`
        : `AI đã soạn ${items.length} câu nháp.${codingHint}`);
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const picked = drafts.filter((_, index) => selected.has(index));
      if (!picked.length) throw new Error("Chọn ít nhất một câu để lưu.");
      return questionBankApi.create(picked);
    },
    onSuccess: (saved) => {
      setNotice(`Đã lưu ${saved.length} câu vào ngân hàng.`);
      setDrafts([]);
      setSelected(new Set());
      onSaved();
    },
  });

  const busy = generate.isPending || save.isPending;
  const selectedCount = selected.size;
  const preview = useMemo(() => drafts.map((draft, index) => ({ draft, index })), [drafts]);
  const helpText = jobContext.trim()
    ? `${HELP} Đang kèm ngữ cảnh JD của vị trí.`
    : HELP;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="ai-gen-title">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-[var(--color-surface-card)] shadow-2xl">
        <header className="flex items-start justify-between gap-3 border-b border-[var(--color-border-default)] p-4 sm:p-5">
          <div className="flex min-w-0 items-center gap-2">
            <h2 id="ai-gen-title" className="flex items-center gap-2 text-lg font-semibold">
              <Sparkles className="size-5 text-[var(--color-primary)]" aria-hidden="true" />
              Sinh câu hỏi bằng AI
            </h2>
            <button
              type="button"
              className="rounded-full p-1 text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container-low)] hover:text-[var(--color-on-surface)]"
              title={helpText}
              aria-label={helpText}
            >
              <CircleHelp className="size-4" aria-hidden="true" />
            </button>
          </div>
          <button type="button" className="rounded-lg p-2 hover:bg-[var(--color-surface-container-low)]" onClick={onClose} aria-label="Đóng">
            <X className="size-5" aria-hidden="true" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          <AssessmentError error={generate.error || save.error} />
          {notice && <p role="status" className="rounded-lg bg-[var(--color-primary-subtle)] px-3 py-2 text-sm text-[var(--color-primary)]">{notice}</p>}

          <fieldset disabled={busy} className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">Kỹ năng
              <select className={assessmentInput} value={skill} onChange={(e) => setSkill(e.target.value)}>
                {skills.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </label>
            <label className="block text-sm">Độ khó
              <select className={assessmentInput} value={difficulty} onChange={(e) => setDifficulty(e.target.value as typeof difficulty)}>
                <option value="Easy">Easy</option>
                <option value="Medium">Medium</option>
                <option value="Hard">Hard</option>
              </select>
            </label>
            <label className="block text-sm">Loại câu
              <select
                className={assessmentInput}
                value={questionType}
                onChange={(e) => {
                  const next = e.target.value as QuestionKind;
                  setQuestionType(next);
                  setCount((prev) => Math.min(prev, next === "CODING" ? 5 : 10));
                }}
              >
                <option value="MCQ">Trắc nghiệm 1 đáp án</option>
                <option value="MULTIPLE_CHOICE">Nhiều đáp án đúng</option>
                <option value="ESSAY">Tự luận + rubric</option>
                <option value="CODING">Bài lập trình</option>
              </select>
            </label>
            <label className="block text-sm">Số câu (1–{maxCount})
              <input
                type="number"
                min={1}
                max={maxCount}
                className={assessmentInput}
                value={count}
                onChange={(e) => setCount(Math.max(1, Math.min(maxCount, Number(e.target.value) || 1)))}
              />
            </label>
            <label className="block text-sm sm:col-span-2">Chủ đề / yêu cầu bổ sung (tuỳ chọn)
              <textarea
                rows={2}
                maxLength={2000}
                className={assessmentInput}
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder={coding ? "Ví dụ: Two Sum, SQL join báo cáo doanh thu…" : "Ví dụ: Spring Boot REST, transaction isolation…"}
              />
            </label>
            {coding ? (
              <label className="block text-sm">Ngôn ngữ lập trình
                <select className={assessmentInput} value={codingLanguage} onChange={(e) => setCodingLanguage(e.target.value as CodingLanguage)}>
                  <option value="java">Java</option>
                  <option value="python">Python</option>
                  <option value="javascript">JavaScript</option>
                  <option value="sql">SQL</option>
                </select>
              </label>
            ) : (
              <label className="block text-sm">Ngôn ngữ đề
                <select className={assessmentInput} value={language} onChange={(e) => setLanguage(e.target.value as "vi" | "en")}>
                  <option value="vi">Tiếng Việt</option>
                  <option value="en">English</option>
                </select>
              </label>
            )}
          </fieldset>

          {preview.length > 0 && (
            <ul className="space-y-3">
              {preview.map(({ draft, index }) => {
                const q = draft.question;
                const checked = selected.has(index);
                const dups = similarIds(draft.authoringMetadata);
                const rubric = asRubric(q.rubricJson);
                const code = codingSummary(q.coding);
                return (
                  <li key={index} className={cn("space-y-2 rounded-xl border p-3", checked ? "border-[var(--color-primary)] bg-[var(--color-primary-subtle)]/40" : "border-[var(--color-border-default)]")}>
                    <div className="flex items-start gap-3">
                      <input
                        type="checkbox"
                        className="mt-2"
                        checked={checked}
                        disabled={busy}
                        aria-label={`Chọn câu nháp ${index + 1}`}
                        onChange={() => {
                          setSelected((prev) => {
                            const next = new Set(prev);
                            if (next.has(index)) next.delete(index);
                            else next.add(index);
                            return next;
                          });
                        }}
                      />
                      <div className="min-w-0 flex-1 space-y-2">
                        {dups.length > 0 && (
                          <p className="flex items-start gap-1.5 text-xs text-amber-800">
                            <TriangleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                            Có thể trùng với câu đã có: {dups.map((id) => `#QB-${String(id).padStart(3, "0")}`).join(", ")}
                          </p>
                        )}
                        <label className="block text-sm">Nội dung câu
                          <textarea
                            rows={3}
                            disabled={busy}
                            className={assessmentInput}
                            value={q.questionText}
                            onChange={(e) => patchDraft(index, { questionText: e.target.value })}
                          />
                        </label>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <label className="text-sm">Điểm
                            <input type="number" min={1} max={100} disabled={busy} className={assessmentInput} value={q.points}
                              onChange={(e) => patchDraft(index, { points: Math.max(1, Math.min(100, Number(e.target.value) || 1)) })} />
                          </label>
                          <p className="self-end text-xs text-[var(--color-on-surface-variant)]">{q.questionType} · {q.difficulty} · {q.skill}</p>
                        </div>
                        {code && (
                          <div className="rounded-lg bg-[var(--color-surface-container-low)] px-3 py-2 text-xs text-[var(--color-on-surface-variant)]">
                            <p className="font-medium text-[var(--color-on-surface)]">{code.title}</p>
                            <p>{code.category} · {code.langs} · {code.sample} sample / {code.hidden} hidden</p>
                          </div>
                        )}
                        {(q.options ?? []).map((option, optionIndex) => (
                          <div key={optionIndex} className="flex items-center gap-2">
                            <input
                              type={q.questionType === "MCQ" ? "radio" : "checkbox"}
                              name={`draft-${index}-correct`}
                              checked={!!option.correct}
                              disabled={busy}
                              aria-label={`Đáp án đúng ${optionIndex + 1}`}
                              onChange={(e) => patchOption(index, optionIndex, { correct: e.target.checked })}
                            />
                            <input
                              className={cn(assessmentInput, "flex-1 text-sm")}
                              disabled={busy}
                              value={option.optionText}
                              onChange={(e) => patchOption(index, optionIndex, { optionText: e.target.value })}
                            />
                          </div>
                        ))}
                        {q.questionType === "ESSAY" && rubric && (
                          <label className="block text-sm">Đáp án tham khảo
                            <textarea
                              rows={2}
                              disabled={busy}
                              className={assessmentInput}
                              value={rubric.referenceAnswer ?? ""}
                              onChange={(e) => patchDraft(index, { rubricJson: { ...rubric, referenceAnswer: e.target.value, criteria: rubric.criteria ?? [] } })}
                            />
                          </label>
                        )}
                        <label className="block text-sm">{q.questionType === "CODING" ? "Lời giải mẫu" : "Giải thích (tuỳ chọn)"}
                          <textarea
                            rows={2}
                            disabled={busy}
                            className={assessmentInput}
                            value={q.explanation ?? ""}
                            onChange={(e) => patchDraft(index, { explanation: e.target.value })}
                          />
                        </label>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
          {!preview.length && !generate.isPending && (
            <p className="text-sm text-[var(--color-on-surface-variant)]">Chưa có nháp. Chọn tham số rồi bấm Sinh nháp.</p>
          )}
          {generate.isPending && (
            <p role="status" className="text-sm">
              {coding ? "Đang xếp hàng và chờ AI soạn câu code…" : "Đang gọi AI soạn câu…"}
            </p>
          )}
          {selectedCount === 0 && drafts.length > 0 && <FieldError message="Chọn ít nhất một câu để lưu." />}
        </div>

        <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-[var(--color-border-default)] p-4">
          <Button variant="ghost" disabled={busy} onClick={onClose}>Đóng</Button>
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" disabled={busy} onClick={() => generate.mutate()}>
              <Sparkles className="size-4" aria-hidden="true" />
              {generate.isPending ? "Đang sinh…" : drafts.length ? "Sinh lại" : "Sinh nháp"}
            </Button>
            <Button disabled={busy || selectedCount === 0} onClick={() => save.mutate()}>
              {save.isPending ? "Đang lưu…" : `Lưu ${selectedCount || ""} câu vào ngân hàng`}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}
