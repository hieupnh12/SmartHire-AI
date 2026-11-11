import { useEffect, useRef, useState } from "react";
import { AlertTriangle, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ux/Button";
import { useT } from "@/i18n";
import { getApiErrorMessage } from "@/lib/axios";

const REASON_KEYS = [
  "acceptedElsewhere",
  "notSuitable",
  "personalPlan",
  "anotherRole",
] as const;
const OTHER = "OTHER";
const MAX_REASON = 255;

type Props = {
  jobTitle: string | null;
  onClose: () => void;
  onConfirm: (reason: string | undefined) => Promise<unknown>;
};

export function WithdrawDialog({ jobTitle, onClose, onConfirm }: Props) {
  const t = useT();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const [choice, setChoice] = useState<string>("");
  const [other, setOther] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const open = jobTitle !== null;

  useEffect(() => {
    if (!open) return;
    setChoice("");
    setOther("");
    setError(null);
    cancelRef.current?.focus();
  }, [open]);

  if (!open) return null;

  const close = () => { if (!pending) onClose(); };
  const submit = async () => {
    const reason = choice === OTHER ? other.trim() : choice;
    setPending(true);
    setError(null);
    try {
      await onConfirm(reason || undefined);
      onClose();
    } catch (cause) {
      setError(getApiErrorMessage(cause));
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm" role="presentation" onClick={close}>
      <div role="alertdialog" aria-modal="true" aria-labelledby="withdraw-title" aria-describedby="withdraw-desc"
        className="relative w-full max-w-[420px] rounded-[20px] border border-[var(--color-border-default)] bg-surface-card p-6 shadow-xl"
        onClick={(event) => event.stopPropagation()}>
        <div className="flex items-start gap-4">
          <span className="grid size-11 shrink-0 place-items-center rounded-full bg-red-50 text-red-600"><AlertTriangle className="size-5" aria-hidden="true" /></span>
          <div className="min-w-0 flex-1">
            <h2 id="withdraw-title" className="font-display text-lg font-bold leading-tight text-slate-900">{t("candidate.core.applications.withdraw.title")}</h2>
            <p id="withdraw-desc" className="mt-1.5 text-sm leading-relaxed text-slate-500">
              {t("candidate.core.applications.withdraw.description", { jobTitle: jobTitle ?? "" })}
            </p>
          </div>
        </div>

        <fieldset className="mt-5 space-y-2">
          <legend className="mb-2 text-sm font-medium text-[var(--color-on-surface)]">{t("candidate.core.applications.withdraw.legend")}</legend>
          {REASON_KEYS.map((reasonKey) => {
            const label = t(`candidate.core.applications.withdraw.reasons.${reasonKey}`);
            return (
              <label key={reasonKey} className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg px-2 text-sm hover:bg-[var(--color-surface-alt)]">
                <input type="radio" name="withdraw-reason" value={label} checked={choice === label} onChange={() => setChoice(label)} className="size-4 accent-[var(--color-primary)]" />
                {label}
              </label>
            );
          })}
          <label className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg px-2 text-sm hover:bg-[var(--color-surface-alt)]">
            <input type="radio" name="withdraw-reason" value={OTHER} checked={choice === OTHER} onChange={() => setChoice(OTHER)} className="size-4 accent-[var(--color-primary)]" />
            {t("candidate.core.applications.withdraw.otherLabel")}
          </label>
          {choice === OTHER && (
            <label className="block">
              <span className="sr-only">{t("candidate.core.applications.withdraw.otherSr")}</span>
              <textarea value={other} onChange={(event) => setOther(event.target.value.slice(0, MAX_REASON))} rows={2} maxLength={MAX_REASON}
                placeholder={t("candidate.core.applications.withdraw.otherPlaceholder")}
                className="w-full rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-alt)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15" />
            </label>
          )}
        </fieldset>

        {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Button ref={cancelRef} variant="secondary" onClick={close} disabled={pending} className="w-full">{t("common.cancel")}</Button>
          <Button variant="danger" onClick={() => void submit()} disabled={pending} className="w-full">
            {pending && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
            {t("candidate.core.applications.withdraw.submit")}
          </Button>
        </div>
      </div>
    </div>
  );
}
