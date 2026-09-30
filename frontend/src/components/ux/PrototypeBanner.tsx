export function PrototypeBanner({ note }: { note?: string }) {
  return (
    <p className="rounded-xl border border-dashed border-[var(--color-outline-variant)] bg-[var(--color-surface-alt)] px-4 py-2 text-sm text-[var(--color-on-surface-variant)]">
      UI sơ khai · mock data · chưa nối API
      {note ? ` · ${note}` : ""}
    </p>
  );
}
