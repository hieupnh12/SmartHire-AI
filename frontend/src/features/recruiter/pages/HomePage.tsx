export function HomePage() {
  return (
    <section className="space-y-2">
      <h1 className="font-display text-3xl font-bold text-[var(--color-text-primary)]">
        Recruiter dashboard
      </h1>
      <p className="max-w-2xl text-[var(--color-text-secondary)]">
        KPIs for open jobs, applicants, and interviews.
      </p>
      <p className="text-sm text-[var(--color-text-secondary)]">dashboardApi.summary (Redis-cached)</p>
    </section>
  );
}
