export const panel = "rounded-3xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-6";
export const input = "w-full rounded-lg border border-[var(--color-outline-variant)] bg-[var(--color-surface-alt)] px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]";
export const button = "inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--color-outline-variant)] px-4 py-2 text-sm font-semibold hover:bg-[var(--color-surface-container-low)] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]";
export const primary = `${button} border-transparent bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary-hover)]`;
export const muted = "text-sm text-[var(--color-on-surface-variant)]";
export const labels: Record<string, string> = {
  skills: "Kỹ năng", experience: "Kinh nghiệm", assessment: "Assessment", interview: "AI Interview",
  backend: "Backend", frontend: "Frontend", database: "Database", devops: "DevOps", other: "Khác",
  READY: "Có kết quả", DISABLED: "Không tính", MISSING: "Chưa có", PROCESSING: "Đang xử lý", FAILED: "Xử lý lỗi",
  SELECT_SOURCE: "Cần chọn nguồn", NEEDS_REVIEW: "Cần xác minh", NEW: "Đã apply", IN_REVIEW: "Sàng lọc CV",
  ASSESSMENT: "Technical test", INTERVIEW: "Phỏng vấn AI", OFFER: "Đề nghị", HIRED: "Đã tuyển", REJECTED: "Đã từ chối", WITHDRAWN: "Đã rút",
};
export const scoreText = (value: number | null) => value === null ? "—" : value.toLocaleString("vi-VN", { maximumFractionDigits: 2 });
