import { useEffect, useRef, useState } from "react";
import { AlertTriangle, LoaderCircle } from "lucide-react";
import { Button } from "@/components/ux/Button";
import { getApiErrorMessage } from "@/lib/axios";

const REASONS = [
  "Đã nhận việc ở nơi khác",
  "Vị trí không còn phù hợp với tôi",
  "Thay đổi kế hoạch cá nhân",
  "Muốn ứng tuyển vị trí khác tại công ty",
] as const;
const OTHER = "OTHER";
const MAX_REASON = 255;

type Props = {
  jobTitle: string | null;
  onClose: () => void;
  onConfirm: (reason: string | undefined) => Promise<unknown>;
};

export function WithdrawDialog({ jobTitle, onClose, onConfirm }: Props) {
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
            <h2 id="withdraw-title" className="font-display text-lg font-bold leading-tight text-slate-900">Rút đơn ứng tuyển?</h2>
            <p id="withdraw-desc" className="mt-1.5 text-sm leading-relaxed text-slate-500">
              Đơn “{jobTitle}” sẽ được rút. Sau khi rút, bạn có thể ứng tuyển vị trí khác.
            </p>
          </div>
        </div>

        <fieldset className="mt-5 space-y-2">
          <legend className="mb-2 text-sm font-medium text-[var(--color-on-surface)]">Lý do rút đơn (không bắt buộc)</legend>
          {[...REASONS, OTHER].map((value) => (
            <label key={value} className="flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg px-2 text-sm hover:bg-[var(--color-surface-alt)]">
              <input type="radio" name="withdraw-reason" value={value} checked={choice === value} onChange={() => setChoice(value)} className="size-4 accent-[var(--color-primary)]" />
              {value === OTHER ? "Lý do khác" : value}
            </label>
          ))}
          {choice === OTHER && (
            <label className="block">
              <span className="sr-only">Nhập lý do khác</span>
              <textarea value={other} onChange={(event) => setOther(event.target.value.slice(0, MAX_REASON))} rows={2} maxLength={MAX_REASON}
                placeholder="Nhập lý do của bạn"
                className="w-full rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-alt)] px-3 py-2 text-sm outline-none focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15" />
            </label>
          )}
        </fieldset>

        {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
        <div className="mt-6 grid grid-cols-2 gap-3">
          <Button ref={cancelRef} variant="secondary" onClick={close} disabled={pending} className="w-full">Huỷ</Button>
          <Button variant="danger" onClick={() => void submit()} disabled={pending} className="w-full">
            {pending && <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />}
            Rút đơn
          </Button>
        </div>
      </div>
    </div>
  );
}
