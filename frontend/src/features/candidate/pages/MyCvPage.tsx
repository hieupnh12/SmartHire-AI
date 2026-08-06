export function MyCvPage() {
  return (
    <section className="space-y-2">
      <h1 className="font-display text-3xl font-bold text-[var(--color-text-primary)]">
        My CV
      </h1>
      <p className="max-w-2xl text-[var(--color-text-secondary)]">
        Upload CV and watch AI analysis status.
      </p>
      <p className="text-sm text-[var(--color-text-secondary)]">cvApi.upload · analyze (RabbitMQ)</p>
    </section>
  );
}
