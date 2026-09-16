
type CandidateWelcomePanelProps = { candidateName?: string };

export function CandidateWelcomePanel({ candidateName }: CandidateWelcomePanelProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4 py-4 sm:py-6">
      <div className="min-w-0">
        <div className="min-w-0 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-brand-primary">Hành trình sự nghiệp</p>
          <h1 id="candidate-dashboard-title" className="mt-5 max-w-[28ch] break-words text-balance font-[var(--font-family)] text-2xl font-semibold leading-8 tracking-[-0.02em] text-[var(--color-on-surface)] sm:text-3xl sm:leading-[38px]">
            Chào {candidateName ?? "bạn"}.
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-on-surface-variant)]">
            Theo dõi hồ sơ ứng tuyển, hoàn thành bài đánh giá và chuẩn bị phỏng vấn AI trong cùng một workspace.
          </p>
        </div>
      </div>
      <span className="rounded-md border border-[var(--color-border-default)] bg-white px-3 py-2 text-xs text-[var(--color-on-surface-variant)]">Dữ liệu minh họa</span>
    </header>
  );
}
