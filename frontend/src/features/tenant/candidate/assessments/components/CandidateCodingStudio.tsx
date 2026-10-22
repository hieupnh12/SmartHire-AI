import { useEffect, useRef, useState } from "react";
import Editor, { loader, type OnMount } from "@monaco-editor/react";
import * as monaco from "monaco-editor/editor/editor.api";
import "monaco-editor/languages/definitions/java/register.js";
import "monaco-editor/languages/definitions/python/register.js";
import "monaco-editor/languages/definitions/javascript/register.js";
import "monaco-editor/languages/definitions/sql/register.js";
import "monaco-editor/languages/definitions/cpp/register.js";
import EditorWorker from "monaco-editor/editor/editor.worker.js?worker";
import { useMutation } from "@tanstack/react-query";
import { CheckCircle2, CircleAlert, Clock, Play, RotateCcw, Save, XCircle } from "lucide-react";
import { assessmentApi } from "@/api/tenant/assessmentApi";
import type { CandidateQuestion, SavedAnswer } from "@/api/types/assessment";
import { Button } from "@/components/ux/Button";
import { AssessmentError, assessmentInput, FieldError } from "@/components/ux/assessmentUi";
import { useUiStore } from "@/stores/uiStore";
import { ExamMarkdown } from "./ExamMarkdown";

self.MonacoEnvironment = { getWorker: () => new EditorWorker() };
loader.config({ monaco });
const languageLabels: Record<string, string> = { java: "Java", python: "Python", javascript: "JavaScript", cpp: "C++", sql: "SQL" };

export function CandidateCodingStudio({ submissionId, question, answer, locked, onChange, onSave, saving = false }: {
  submissionId: number; question: CandidateQuestion; answer?: SavedAnswer; locked: boolean; onChange: (answer: SavedAnswer) => void;
  onSave?: () => Promise<void>; saving?: boolean;
}) {
  const askConfirm = useUiStore(state => state.askConfirm);
  const starters = question.coding?.starterCode ?? {};
  const languages = Object.keys(starters);
  const language = answer?.language && Object.hasOwn(starters, answer.language) ? answer.language : languages[0] ?? "";
  const source = answer?.answerText ?? starters[language] ?? "";
  const samples = question.coding?.testCases.filter(test => test.sample).slice(0, 5) ?? [];
  const [sampleIndex, setSampleIndex] = useState(0);
  const [saveError, setSaveError] = useState<unknown>();
  const [saved, setSaved] = useState(false);
  const [sourceTooLong, setSourceTooLong] = useState(false);
  const editorInstance = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const safeIndex = Math.min(sampleIndex, Math.max(0, samples.length - 1));
  const sample = samples[safeIndex];
  const run = useMutation({ mutationFn: () => assessmentApi.runSamples(submissionId, question.id, source, language) });
  const latest = useRef({ locked, pending: run.isPending, source, language, run: () => run.mutate() });
  latest.current = { locked, pending: run.isPending, source, language, run: () => run.mutate() };
  const action = useRef<monaco.IDisposable | undefined>(undefined);
  useEffect(() => () => action.current?.dispose(), []);
  const onMount: OnMount = editor => {
    editorInstance.current = editor;
    action.current?.dispose();
    action.current = editor.addAction({ id: "run-assessment-samples", label: "Run sample test cases", keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter], run: () => {
      const state = latest.current;
      if (!state.locked && !state.pending && state.source.trim() && state.language) state.run();
    } });
  };
  const changeCode = (nextSource: string, nextLanguage = language) => {
    if (locked) return;
    onChange({ questionId: question.id, answerText: nextSource, language: nextLanguage });
    run.reset(); setSaved(false); setSaveError(undefined); setSourceTooLong(false);
  };
  const save = async () => {
    if (locked || saving) return;
    onChange({ questionId: question.id, answerText: source, language });
    try { await onSave?.(); setSaved(true); setSaveError(undefined); }
    catch (error) { setSaveError(error); setSaved(false); }
  };
  const result = run.data?.[safeIndex];
  const status = result?.status?.id;
  const passed = status === 3;
  const executionError = status != null && status >= 5;
  const processing = status == null || status < 3;
  const ResultIcon = passed ? CheckCircle2 : processing ? Clock : executionError ? CircleAlert : XCircle;
  return (
    <div className="grid h-full min-h-0 min-w-0 gap-3 max-lg:grid-rows-[minmax(7.5rem,0.3fr)_minmax(0,1fr)] lg:grid-cols-[minmax(17rem,0.34fr)_minmax(0,1fr)] lg:grid-rows-1">
      <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)]">
        <div className="shrink-0 border-b border-[var(--color-border-default)] px-4 py-3">
          <h2 className="text-lg font-semibold">{question.coding?.title ?? "Thử thách lập trình"} · {question.points} điểm</h2>
        </div>
        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          <ExamMarkdown text={question.questionText} />
          <div className="flex flex-wrap gap-3 rounded-lg bg-[var(--color-primary-subtle)] p-3 text-sm">
            <span className="inline-flex items-center gap-2">
              <Clock className="size-4" aria-hidden="true" />
              {question.coding?.timeLimitMs} ms
            </span>
            <span>{question.coding?.memoryMb} MB</span>
          </div>
          <h3 className="font-medium">Ví dụ Input / Output</h3>
          {samples.map((test, index) => (
            <details key={index} open={index === 0} className="rounded-lg bg-[var(--color-surface-container-low)] p-3 text-sm">
              <summary className="cursor-pointer font-medium">Ví dụ {index + 1}</summary>
              <pre className="mt-3 overflow-auto whitespace-pre-wrap break-words">
                Input: {test.input}{"\n"}Output: {test.expectedOutput}
              </pre>
            </details>
          ))}
          <p className="text-xs leading-5 text-[var(--color-on-surface-variant)]">
            Chạy thử tối đa 5 test công khai. Test ẩn chỉ được dùng khi chấm bài. Mã nguồn tối đa 10.000 ký tự.
          </p>
          <section className="space-y-3" aria-label="Console test cases">
            <h3 className="font-semibold">Console · Test cases mẫu</h3>
            <nav aria-label="Test case đang xem" className="flex flex-wrap gap-2">
              {samples.map((_, index) => (
                <Button
                  key={index}
                  variant={safeIndex === index ? "primary" : "secondary"}
                  aria-pressed={safeIndex === index}
                  onClick={() => setSampleIndex(index)}
                >
                  Test Case {index + 1}
                </Button>
              ))}
            </nav>
            <AssessmentError error={run.error} />
            {run.isPending && <p role="status">Đang thực thi mã nguồn trong sandbox…</p>}
            {result && (
              <p
                role="status"
                className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                  passed
                    ? "bg-emerald-50 text-emerald-800"
                    : executionError || processing
                      ? "bg-amber-50 text-amber-900"
                      : "bg-[var(--color-error-container)] text-[var(--color-on-error-container)]"
                }`}
              >
                <ResultIcon className="size-4" aria-hidden="true" />
                {passed ? "Passed" : processing ? "Đang xử lý" : executionError ? "Time Limit / Runtime / Compile Error" : "Failed"} ·{" "}
                {result.status?.description}
              </p>
            )}
            {sample && (
              <div className="space-y-3 text-xs">
                {(
                  [
                    ["Input", sample.input],
                    ["Expected Output", sample.expectedOutput],
                    ["Actual Output", result?.stdout ?? "Chưa có kết quả chạy"],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label}>
                    <h4 className="mb-1 font-medium">{label}</h4>
                    <pre className="overflow-auto whitespace-pre-wrap break-words rounded-lg bg-[var(--color-surface-container-low)] p-3 font-mono">{value}</pre>
                  </div>
                ))}
                {(result?.stderr || result?.compile_output) && (
                  <div>
                    <h4 className="mb-1 font-medium">Terminal</h4>
                    <pre className="overflow-auto whitespace-pre-wrap break-words rounded-lg bg-[var(--color-error-container)] p-3">
                      {result.stderr || result.compile_output}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      </section>
      <section className="grid h-full min-h-0 min-w-0 grid-rows-[auto_minmax(0,1fr)_auto] gap-3 overflow-hidden">
        <div className="contents">
          <div className="flex shrink-0 flex-wrap items-end justify-between gap-3 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-3">
            <label className="min-w-36 text-sm font-medium">
              Ngôn ngữ
              <select
                className={assessmentInput}
                value={language}
                disabled={locked || run.isPending}
                onChange={(event) => {
                  const next = event.target.value;
                  const switchLanguage = () => {
                    if (!latest.current.locked) changeCode(starters[next] ?? "", next);
                  };
                  if (source !== (starters[language] ?? "")) {
                    askConfirm({
                      title: "Đổi ngôn ngữ?",
                      description: "Mã hiện tại sẽ được thay bằng starter code của ngôn ngữ mới.",
                      confirmLabel: "Đổi ngôn ngữ",
                      onConfirm: switchLanguage,
                    });
                  } else switchLanguage();
                }}
              >
                {languages.map((item) => (
                  <option key={item} value={item}>
                    {languageLabels[item] ?? item}
                  </option>
                ))}
              </select>
            </label>
            <Button
              variant="secondary"
              disabled={locked || run.isPending || !language}
              onClick={() =>
                askConfirm({
                  title: "Khôi phục code ban đầu?",
                  description: "Thao tác này thay mã đang viết bằng starter code. Bạn sẽ cần viết lại các thay đổi.",
                  confirmLabel: "Khôi phục",
                  onConfirm: () => {
                    if (!latest.current.locked) changeCode(starters[language] ?? "");
                  },
                })
              }
            >
              <RotateCcw className="size-4" aria-hidden="true" />
              Khôi phục code ban đầu
            </Button>
          </div>
          <div className="h-full min-h-0 select-text overflow-hidden rounded-xl border border-[var(--color-border-default)] bg-white">
            <Editor
              height="100%"
              language={language}
              value={source}
              onMount={onMount}
              options={{
                readOnly: locked,
                minimap: { enabled: false },
                fontSize: 14,
                automaticLayout: true,
                wordWrap: "on",
                scrollBeyondLastLine: false,
                accessibilitySupport: "on",
                ariaLabel: "Mã nguồn bài làm",
                tabFocusMode: true,
              }}
              onChange={(value) => {
                if (locked) return;
                if ((value ?? "") === source) return;
                if ((value?.length ?? 0) > 10000) {
                  editorInstance.current?.setValue(source);
                  setSourceTooLong(true);
                } else {
                  changeCode(value ?? "");
                  setSourceTooLong(false);
                }
              }}
            />
          </div>
          <div className="space-y-2 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-3">
            <FieldError message={sourceTooLong ? "Mã nguồn tối đa 10.000 ký tự. Phần nhập vượt giới hạn chưa được áp dụng." : undefined} />
            <p className="text-xs text-[var(--color-on-surface-variant)]">
              {source.length}/10.000 ký tự · Ctrl+Enter / ⌘+Enter: chạy test mẫu. Tab: di chuyển giữa các điều khiển.
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                disabled={locked || run.isPending || !language || !source.trim() || !samples.length}
                onClick={() => run.mutate()}
              >
                <Play className="size-4" aria-hidden="true" />
                {run.isPending ? "Đang chạy…" : "Chạy thử Test Case"}
              </Button>
              <Button disabled={locked || saving || !language} onClick={() => void save()}>
                <Save className="size-4" aria-hidden="true" />
                {saving ? "Đang lưu…" : "Lưu bài làm"}
              </Button>
            </div>
            {saved && (
              <p role="status" className="text-sm text-[var(--color-primary)]">
                {onSave
                  ? "Đã lưu mã nguồn lên máy chủ. Bấm Nộp bài để hoàn tất toàn bài thi."
                  : "Đã cập nhật mã nguồn. Bấm Nộp bài để hoàn tất toàn bài thi."}
              </p>
            )}
            <AssessmentError error={saveError} />
          </div>
        </div>
      </section>
    </div>
  );
}
