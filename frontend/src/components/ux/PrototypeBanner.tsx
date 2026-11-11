import { useT } from "@/i18n";

export function PrototypeBanner({ note }: { note?: string }) {
  const t = useT();
  return (
    <p className="rounded-xl border border-dashed border-[var(--color-outline-variant)] bg-[var(--color-surface-alt)] px-4 py-2 text-sm text-[var(--color-on-surface-variant)]">
      {t("ux.prototypeBanner")}
      {note ? ` · ${note}` : ""}
    </p>
  );
}
