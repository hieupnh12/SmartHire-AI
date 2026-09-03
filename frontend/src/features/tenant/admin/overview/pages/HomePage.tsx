export function HomePage() {
  return (
    <section className="space-y-2">
      <h1 className="font-display text-3xl font-bold text-[var(--color-text-primary)]">
        Admin overview
      </h1>
      <p className="max-w-2xl text-[var(--color-text-secondary)]">
        Platform health and high-level controls.
      </p>
      <p className="text-sm text-[var(--color-text-secondary)]">Module /health + future admin APIs</p>
    </section>
  );
}
