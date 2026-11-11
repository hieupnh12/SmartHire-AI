import { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Play } from "lucide-react";
import { questionBankApi } from "@/api/tenant/questionBankApi";
import { Button } from "@/components/ux/Button";
import { AssessmentError, assessmentInput } from "@/components/ux/assessmentUi";
import { useT } from "@/i18n";
import { createCodingSchema } from "../utils/questionContentValidation";

export function CodingTestVerification({ value, solution }: { value: string; solution: string }) {
  const t = useT();
  const codingSchema = useMemo(() => createCodingSchema(t), [t]);
  const [language, setLanguage] = useState("");
  const parsed = codingSchema.safeParse((() => { try { return JSON.parse(value); } catch { return null; } })());
  const languages = parsed.success ? Object.keys(parsed.data.starterCode) : [];
  const selected = languages.includes(language) ? language : languages[0] ?? "";
  const snapshot = JSON.stringify([value, solution, selected]);
  const verify = useMutation({ mutationFn: async () => ({
    snapshot,
    results: await questionBankApi.verifyCoding({ coding: codingSchema.parse(JSON.parse(value)), language: selected, source: solution }),
  }) });
  const current = verify.data?.snapshot === snapshot ? verify.data.results : null;
  return <section className="space-y-3 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] p-4">
    <h4 className="text-sm font-semibold">{t("recruiter.assessments.coding.verificationPanel.heading")}</h4>
    <p className="text-xs text-[var(--color-on-surface-variant)]">{t("recruiter.assessments.coding.verificationPanel.desc")}</p>
    <label className="block text-sm">{t("recruiter.assessments.coding.verificationPanel.languageLabel")}<select className={assessmentInput} value={selected} disabled={verify.isPending} onChange={event => { setLanguage(event.target.value); verify.reset(); }}>
      {!languages.length && <option value="">{t("recruiter.assessments.coding.verificationPanel.noLanguagesOption")}</option>}
      {languages.map(item => <option key={item} value={item}>{item.toUpperCase()}</option>)}
    </select></label>
    {!parsed.success && <p className="text-xs text-[var(--color-on-surface-variant)]">{parsed.error.issues[0]?.message}</p>}
    <Button type="button" variant="secondary" disabled={!parsed.success || !selected || !solution.trim() || verify.isPending} onClick={() => verify.mutate()}><Play className="size-4" aria-hidden="true" />{verify.isPending ? t("recruiter.assessments.coding.verificationPanel.runningBtn") : t("recruiter.assessments.coding.verificationPanel.runBtn")}</Button>
    <AssessmentError error={verify.error} />
    {current && <div role="status" className="space-y-2 text-sm">{current.map((result, index) => <div key={index}>{t("recruiter.assessments.coding.verificationPanel.resultLine", { index: index + 1, status: result.status?.description ?? t("recruiter.assessments.coding.verificationPanel.noResult") })}{(result.stderr || result.compile_output) && <pre className="overflow-auto whitespace-pre-wrap text-xs">{result.stderr || result.compile_output}</pre>}</div>)}</div>}
  </section>;
}
