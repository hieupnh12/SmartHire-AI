import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { assessmentApi } from "@/api/tenant/assessmentApi";
import type { CandidateQuestion, SavedAnswer } from "@/api/types/assessment";
import { Button } from "@/components/ux/Button";
import { AssessmentError, assessmentInput } from "@/components/ux/assessmentUi";
import { useUiStore } from "@/stores/uiStore";
import { MonacoCodeEditor } from "@/components/shared/MonacoCodeEditor";

export function CodingAnswerInput({ submissionId, question, answer, locked, onChange }: {
  submissionId: number; question: CandidateQuestion; answer?: SavedAnswer; locked: boolean; onChange: (answer: SavedAnswer) => void;
}) {
  const askConfirm = useUiStore((s) => s.askConfirm);
  const starters = question.coding?.starterCode ?? {};
  const language = answer?.language ?? Object.keys(starters)[0] ?? "python";
  const [edited, setEdited] = useState(false);
  const source = answer?.answerText ?? starters[language] ?? "";
  const run = useMutation({ mutationFn: () => assessmentApi.runSamples(submissionId, question.id, source, language) });
  const switchLanguage = (next: string) => {
    setEdited(false);
    onChange({ questionId: question.id, language: next, answerText: starters[next] ?? "" });
    run.reset();
  };
  return <div className="space-y-4">
    <label className="block text-sm font-medium">Ngôn ngữ<select value={language} disabled={locked || run.isPending} className={assessmentInput}
      onChange={event => {
        const next = event.target.value;
        if (next === language) return;
        if (!edited) { switchLanguage(next); return; }
        event.target.value = language;
        askConfirm({
          title: "Đổi ngôn ngữ?",
          description: "Mã hiện tại sẽ được thay bằng starter code của ngôn ngữ mới.",
          confirmLabel: "Đổi ngôn ngữ",
          onConfirm: () => switchLanguage(next),
        });
      }}>{Object.keys(starters).map(item => <option key={item}>{item}</option>)}</select></label>
    <p className="text-sm text-[var(--color-on-surface-variant)]">Giới hạn: {question.coding?.timeLimitMs} ms · {question.coding?.memoryMb} MB · Mã tối đa 10.000 ký tự</p>
    <MonacoCodeEditor
      height="360px"
      language={language}
      value={source}
      readOnly={locked}
      onChange={value => {
        if (!locked && (value.length) <= 10000) {
          setEdited(true);
          onChange({ questionId: question.id, language, answerText: value });
        }
      }}
      placeholder="// Viết mã nguồn bài làm của bạn..."
    />
    <div className="space-y-2">{question.coding?.testCases.map((sample, i) => <details key={i} className="rounded-lg bg-[var(--color-surface-container-low)] p-3 text-sm">
      <summary>Ví dụ {i + 1}</summary><pre className="mt-2 overflow-auto">Input: {sample.input}{"\n"}Output: {sample.expectedOutput}</pre>
    </details>)}</div>
    <Button variant="secondary" disabled={locked || run.isPending} onClick={() => run.mutate()}>{run.isPending ? "Đang chạy…" : "Chạy test mẫu"}</Button>
    <AssessmentError error={run.error} />
    {run.data && <div role="status" className="space-y-2 rounded-lg bg-[var(--color-surface-container-low)] p-3 font-mono text-xs">
      {run.data.map((result, i) => <pre key={i} className="overflow-auto whitespace-pre-wrap">Test {i + 1}: {result.status.description}{"\n"}{result.stdout ?? result.compile_output ?? result.stderr ?? ""}</pre>)}
    </div>}
  </div>;
}
