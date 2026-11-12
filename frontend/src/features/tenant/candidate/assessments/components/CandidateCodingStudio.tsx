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
import { CheckCircle2, CircleAlert, Clock, Play, RotateCcw, Save, Sparkles, XCircle } from "lucide-react";
import { assessmentApi } from "@/api/tenant/assessmentApi";
import type { CandidateQuestion, SavedAnswer, SampleResult } from "@/api/types/assessment";
import { Button } from "@/components/ux/Button";
import { AssessmentError, assessmentInput, FieldError } from "@/components/ux/assessmentUi";
import { formatNumber, useLocale, useT } from "@/i18n";
import { useUiStore } from "@/stores/uiStore";
import { toast } from "@/stores/toastStore";
import { ExamMarkdown } from "./ExamMarkdown";

self.MonacoEnvironment = { getWorker: () => new EditorWorker() };
loader.config({ monaco });
const languageLabels: Record<string, string> = { java: "Java", python: "Python", javascript: "JavaScript", cpp: "C++", sql: "SQL" };

function isAccepted(result?: SampleResult) {
  return result?.status?.id === 3;
}

export function CandidateCodingStudio({ submissionId, question, answer, locked, onChange, onSave, saving = false, isDemo = false }: {
  submissionId: number; question: CandidateQuestion; answer?: SavedAnswer; locked: boolean; onChange: (answer: SavedAnswer) => void;
  onSave?: () => Promise<void>; saving?: boolean; isDemo?: boolean;
}) {
  const t = useT();
  const locale = useLocale();
  const askConfirm = useUiStore(state => state.askConfirm);
  const starters = question.coding?.starterCode ?? {};
  const languages = Object.keys(starters);
  const language = answer?.language && Object.hasOwn(starters, answer.language) ? answer.language : languages[0] ?? "";
  const source = answer?.answerText ?? starters[language] ?? "";
  const samples = question.coding?.testCases.filter(test => test.sample).slice(0, 5) ?? [];
  const [sampleIndex, setSampleIndex] = useState(0);
  const [consoleTab, setConsoleTab] = useState<"samples" | "custom">("samples");
  const [customInput, setCustomInput] = useState(samples[0]?.input ?? "");
  const [saveError, setSaveError] = useState<unknown>();
  const [saved, setSaved] = useState(false);
  const [sourceTooLong, setSourceTooLong] = useState(false);
  const editorInstance = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const safeIndex = Math.min(sampleIndex, Math.max(0, samples.length - 1));
  const sample = samples[safeIndex];

  const sampleComment = t("candidate.assess.coding.sampleComment");
  const sampleSolutions: Record<string, string> = {
    python: `def solve(n):\n    # ${sampleComment}\n    return n * (n + 1) // 2\n`,
    javascript: `function solve(n) {\n  // ${sampleComment}\n  return (n * (n + 1)) / 2;\n}\n`,
    java: `public class Solution {\n    // ${sampleComment}\n    public static int solve(int n) {\n        return n * (n + 1) / 2;\n    }\n}\n`,
    cpp: `#include <iostream>\nusing namespace std;\n\nint solve(int n) {\n    return n * (n + 1) / 2;\n}\n`,
  };

  const run = useMutation({ mutationFn: () => assessmentApi.runSamples(submissionId, question.id, source, language) });
  const custom = useMutation({ mutationFn: () => assessmentApi.runCustom(submissionId, question.id, source, language, customInput) });
  const latest = useRef({ locked, pending: run.isPending, source, language, run: () => run.mutate() });
  latest.current = { locked, pending: run.isPending, source, language, run: () => run.mutate() };
  const action = useRef<monaco.IDisposable | undefined>(undefined);
  useEffect(() => () => action.current?.dispose(), []);
  const onMount: OnMount = editor => {
    editorInstance.current = editor;
    action.current?.dispose();
    action.current = editor.addAction({ id: "run-assessment-samples", label: t("candidate.assess.coding.runSamplesAction"), keybindings: [monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter], run: () => {
      const state = latest.current;
      if (!state.locked && !state.pending && state.source.trim() && state.language) state.run();
    } });
  };
  const changeCode = (nextSource: string, nextLanguage = language) => {
    if (locked) return;
    onChange({ questionId: question.id, answerText: nextSource, language: nextLanguage });
    run.reset(); custom.reset(); setSaved(false); setSaveError(undefined); setSourceTooLong(false);
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
  const sampleSummary = run.data
    ? t("candidate.assess.coding.sampleSummary", { passed: run.data.filter(isAccepted).length, total: run.data.length })
    : null;
  const customResult = custom.data;
  const customAccepted = isAccepted(customResult);
  return (
    <div className="grid h-full min-h-0 min-w-0 gap-3 max-lg:grid-rows-[minmax(7.5rem,0.3fr)_minmax(0,1fr)] lg:grid-cols-[minmax(17rem,0.34fr)_minmax(0,1fr)] lg:grid-rows-1">
      <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)]">
        <div className="shrink-0 border-b border-[var(--color-border-default)] px-4 py-3">
          <h2 className="text-lg font-semibold">
            {t("candidate.assess.coding.defaultTitle", {
              title: question.coding?.title ?? t("candidate.assess.coding.fallbackTitleName"),
              points: question.points,
            })}
          </h2>
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
          {question.coding?.constraints?.trim() && (
            <div className="space-y-2">
              <h3 className="font-medium">{t("candidate.assess.coding.constraintsHeading")}</h3>
              <pre className="overflow-auto whitespace-pre-wrap break-words rounded-lg bg-[var(--color-surface-container-low)] p-3 text-sm">{question.coding.constraints}</pre>
            </div>
          )}
          <h3 className="font-medium">{t("candidate.assess.coding.examplesHeading")}</h3>
          {samples.map((test, index) => (
            <details key={index} open={index === 0} className="rounded-lg bg-[var(--color-surface-container-low)] p-3 text-sm">
              <summary className="cursor-pointer font-medium">{t("candidate.assess.coding.exampleItem", { index: index + 1 })}</summary>
              <pre className="mt-3 overflow-auto whitespace-pre-wrap break-words">
                {t("candidate.assess.coding.exampleIo", { input: test.input, output: test.expectedOutput })}
              </pre>
              {test.explanation?.trim() && (
                <p className="mt-2 text-xs leading-5 text-[var(--color-on-surface-variant)]">
                  {t("candidate.assess.coding.exampleExplanation", { text: test.explanation })}
                </p>
              )}
            </details>
          ))}
          <p className="text-xs leading-5 text-[var(--color-on-surface-variant)]">
            {t("candidate.assess.coding.sandboxHint")}
          </p>
          <section className="space-y-3" aria-label={t("candidate.assess.coding.consoleAria")}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">{t("candidate.assess.coding.consoleHeading")}</h3>
              {sampleSummary && consoleTab === "samples" && (
                <p role="status" className="text-sm font-medium text-[var(--color-primary)]">{sampleSummary}</p>
              )}
            </div>
            <nav aria-label={t("candidate.assess.coding.consoleModesAria")} className="flex flex-wrap gap-2">
              <Button variant={consoleTab === "samples" ? "primary" : "secondary"} aria-pressed={consoleTab === "samples"} onClick={() => setConsoleTab("samples")}>
                {t("candidate.assess.coding.sampleTestsTab")}
              </Button>
              <Button variant={consoleTab === "custom" ? "primary" : "secondary"} aria-pressed={consoleTab === "custom"} onClick={() => setConsoleTab("custom")}>
                {t("candidate.assess.coding.customInputTab")}
              </Button>
            </nav>
            {consoleTab === "samples" ? (
              <>
                <nav aria-label={t("candidate.assess.coding.sampleCaseNavAria")} className="flex flex-wrap gap-2">
                  {samples.map((_, index) => {
                    const caseResult = run.data?.[index];
                    const casePassed = isAccepted(caseResult);
                    return (
                      <Button
                        key={index}
                        variant={safeIndex === index ? "primary" : "secondary"}
                        aria-pressed={safeIndex === index}
                        onClick={() => setSampleIndex(index)}
                      >
                        {t("candidate.assess.coding.testCaseButton", { index: index + 1 })}{caseResult ? (casePassed ? " · ✓" : " · ✗") : ""}
                      </Button>
                    );
                  })}
                </nav>
                <AssessmentError error={run.error} />
                {run.isPending && <p role="status">{t("candidate.assess.coding.runningInSandbox")}</p>}
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
                    {passed
                      ? t("candidate.assess.coding.statusPassed")
                      : processing
                        ? t("candidate.assess.coding.statusProcessing")
                        : executionError
                          ? t("candidate.assess.coding.statusExecError")
                          : t("candidate.assess.coding.statusFailed")}{" "}
                    · {result.status?.description}
                  </p>
                )}
                {sample && (
                  <div className="space-y-3 text-xs">
                    {(
                      [
                        [t("candidate.assess.coding.inputLabel"), sample.input],
                        [t("candidate.assess.coding.expectedOutputLabel"), sample.expectedOutput],
                        [t("candidate.assess.coding.actualOutputLabel"), result?.stdout ?? t("candidate.assess.coding.noOutputYet")],
                      ] as const
                    ).map(([label, value]) => (
                      <div key={label}>
                        <h4 className="mb-1 font-medium">{label}</h4>
                        <pre className="overflow-auto whitespace-pre-wrap break-words rounded-lg bg-[var(--color-surface-container-low)] p-3 font-mono">{value}</pre>
                      </div>
                    ))}
                    {(result?.stderr || result?.compile_output) && (
                      <div>
                        <h4 className="mb-1 font-medium">{t("candidate.assess.coding.terminalLabel")}</h4>
                        <pre className="overflow-auto whitespace-pre-wrap break-words rounded-lg bg-[var(--color-error-container)] p-3">
                          {result.stderr || result.compile_output}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-[var(--color-on-surface-variant)]">{t("candidate.assess.coding.customStdinHint")}</p>
                <label className="block text-sm font-medium">
                  {t("candidate.assess.coding.customStdinLabel")}
                  <textarea
                    rows={4}
                    maxLength={10000}
                    spellCheck={false}
                    className={`${assessmentInput} font-mono text-xs`}
                    value={customInput}
                    disabled={locked || custom.isPending}
                    onChange={event => { setCustomInput(event.target.value); custom.reset(); }}
                  />
                </label>
                <Button
                  variant="secondary"
                  disabled={locked || custom.isPending || run.isPending || !language || !source.trim()}
                  onClick={() => custom.mutate()}
                >
                  <Play className="size-4" aria-hidden="true" />
                  {custom.isPending ? t("candidate.assess.coding.runningCustom") : t("candidate.assess.coding.runCustomButton")}
                </Button>
                <AssessmentError error={custom.error} />
                {customResult && (
                  <p
                    role="status"
                    className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${
                      customAccepted ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"
                    }`}
                  >
                    {customAccepted ? t("candidate.assess.coding.customCompleted") : t("candidate.assess.coding.customError")} · {customResult.status?.description}
                  </p>
                )}
                {customResult && (
                  <div className="space-y-3 text-xs">
                    <div>
                      <h4 className="mb-1 font-medium">{t("candidate.assess.coding.stdoutLabel")}</h4>
                      <pre className="overflow-auto whitespace-pre-wrap break-words rounded-lg bg-[var(--color-surface-container-low)] p-3 font-mono">{customResult.stdout || t("candidate.assess.coding.emptyOutput")}</pre>
                    </div>
                    {(customResult.stderr || customResult.compile_output) && (
                      <div>
                        <h4 className="mb-1 font-medium">{t("candidate.assess.coding.terminalLabel")}</h4>
                        <pre className="overflow-auto whitespace-pre-wrap break-words rounded-lg bg-[var(--color-error-container)] p-3">
                          {customResult.stderr || customResult.compile_output}
                        </pre>
                      </div>
                    )}
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
              {t("candidate.assess.coding.languageLabel")}
              <select
                className={assessmentInput}
                value={language}
                disabled={locked || run.isPending || custom.isPending}
                onChange={(event) => {
                  const next = event.target.value;
                  const switchLanguage = () => {
                    if (!latest.current.locked) changeCode(starters[next] ?? "", next);
                  };
                  if (source !== (starters[language] ?? "")) {
                    askConfirm({
                      title: t("candidate.assess.coding.switchLangTitle"),
                      description: t("candidate.assess.coding.switchLangDesc"),
                      confirmLabel: t("candidate.assess.coding.switchLangConfirm"),
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
            <div className="flex items-center gap-2">
              {isDemo && (
                <Button
                  variant="secondary"
                  disabled={locked || run.isPending || custom.isPending || !language}
                  onClick={() => {
                    const solution = sampleSolutions[language] ?? t("candidate.assess.coding.sampleFallbackComment");
                    changeCode(solution);
                    toast.success(t("candidate.assess.coding.sampleCodeInserted"));
                  }}
                  title={t("candidate.assess.coding.insertSampleTitle")}
                >
                  <Sparkles className="size-4 text-amber-500" aria-hidden="true" />
                  {t("candidate.assess.coding.insertSampleButton")}
                </Button>
              )}
              <Button
                variant="secondary"
                disabled={locked || run.isPending || custom.isPending || !language}
                onClick={() =>
                  askConfirm({
                    title: t("candidate.assess.coding.resetCodeTitle"),
                    description: t("candidate.assess.coding.resetCodeDesc"),
                    confirmLabel: t("candidate.assess.coding.resetCodeConfirm"),
                    onConfirm: () => {
                      if (!latest.current.locked) changeCode(starters[language] ?? "");
                    },
                  })
                }
              >
                <RotateCcw className="size-4" aria-hidden="true" />
                {t("candidate.assess.coding.resetCodeButton")}
              </Button>
            </div>
          </div>
          <div className="h-full min-h-0 select-text overflow-hidden rounded-xl border border-slate-700 bg-[#1e1e1e]">
            <Editor
              height="100%"
              language={language}
              theme="vs-dark"
              value={source}
              onMount={onMount}
              options={{
                readOnly: locked,
                minimap: { enabled: false },
                fontSize: 13,
                lineHeight: 20,
                fontFamily: "'Fira Code', 'Cascadia Code', 'JetBrains Mono', Consolas, monospace",
                fontLigatures: true,
                automaticLayout: true,
                wordWrap: "on",
                scrollBeyondLastLine: false,
                accessibilitySupport: "on",
                ariaLabel: t("candidate.assess.coding.editorAriaLabel"),
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
            <FieldError message={sourceTooLong ? t("candidate.assess.coding.sourceTooLongError") : undefined} />
            <p className="text-xs text-[var(--color-on-surface-variant)]">
              {t("candidate.assess.coding.editorFooterHint", {
                count: formatNumber(source.length, undefined, locale),
                max: formatNumber(10000, undefined, locale),
              })}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="secondary"
                disabled={locked || run.isPending || custom.isPending || !language || !source.trim() || !samples.length}
                onClick={() => { setConsoleTab("samples"); run.mutate(); }}
              >
                <Play className="size-4" aria-hidden="true" />
                {run.isPending ? t("candidate.assess.coding.runningSamples") : t("candidate.assess.coding.runSamplesButton")}
              </Button>
              <Button disabled={locked || saving || !language} onClick={() => void save()}>
                <Save className="size-4" aria-hidden="true" />
                {saving ? t("candidate.assess.coding.saving") : t("candidate.assess.coding.saveButton")}
              </Button>
            </div>
            {saved && (
              <p role="status" className="text-sm text-[var(--color-primary)]">
                {onSave
                  ? t("candidate.assess.coding.savedToServer")
                  : t("candidate.assess.coding.updatedLocally")}
              </p>
            )}
            <AssessmentError error={saveError} />
          </div>
        </div>
      </section>
    </div>
  );
}
