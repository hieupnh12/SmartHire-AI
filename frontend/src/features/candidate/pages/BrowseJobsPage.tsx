export function BrowseJobsPage() {
  return (
    <section className="space-y-2">
      <h1 className="font-display text-3xl font-bold text-[var(--color-text-primary)]">
        Browse jobs
      </h1>
      <p className="max-w-2xl text-[var(--color-text-secondary)]">
        Discover published roles and apply.
      </p>
      <p className="text-sm text-[var(--color-text-secondary)]">jobApi.list · applicantApi.apply</p>
    </section>
  );
}
