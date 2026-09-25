export type TopicWeight = {
  percent: number;
  title: string;
  description: string;
  barClass: string;
  badgeClass: string;
};

export const ASSESSMENT_TOPICS: TopicWeight[] = [
  {
    percent: 30,
    title: "Java Core & Multithreading",
    description: "OOP, Thread Lifecycle, Memory Model (JVM), Concurrency utilities.",
    barClass: "bg-[var(--color-primary)]",
    badgeClass: "bg-[var(--color-primary-fixed,#d8e2ff)] text-[var(--color-primary)]",
  },
  {
    percent: 20,
    title: "Collections Framework & DSA",
    description: "List, Map, Set complexities, Hash collision handling, Stream API.",
    barClass: "bg-[var(--color-tertiary-container)]",
    badgeClass: "bg-[var(--color-tertiary-fixed,#ffdcc6)] text-[var(--color-tertiary)]",
  },
  {
    percent: 25,
    title: "Spring Framework & DI",
    description: "IoC Container, Bean Scopes, Spring Boot Auto-config, Spring Data JPA.",
    barClass: "bg-[var(--color-primary-container)]",
    badgeClass: "bg-[var(--color-secondary-container,#d0e1fb)] text-[var(--color-primary)]",
  },
  {
    percent: 25,
    title: "RESTful API & Exception Handling",
    description: "HTTP standards, ControllerAdvice, Custom Exceptions, Payload validation.",
    barClass: "bg-[var(--color-tertiary)]",
    badgeClass: "bg-[var(--color-surface-container-highest)] text-[var(--color-on-surface-variant)]",
  },
];

export const ASSESSMENT_GUIDELINES = [
  {
    title: "Đồng hồ đếm ngược liên tục:",
    body: "Khi bạn nhấn bắt đầu, thời gian làm bài sẽ chạy liên tục và không thể tạm dừng vì bất kỳ lý do nào.",
  },
  {
    title: "Đồng bộ tự động tức thì (Real-time Cloud Sync):",
    body: "Mỗi khi chọn một phương án hoặc chỉnh sửa mã lệnh, hệ thống sẽ lưu ngay lập tức lên máy chủ trung tâm.",
  },
  {
    title: "Cơ chế phục hồi ngắt kết nối (Network Resilience):",
    body: "Nếu mạng bị ngắt quãng, bài thi vẫn giữ nguyên tiến độ đã làm và tự đồng bộ trở lại khi có tín hiệu.",
  },
] as const;

export const ASSESSMENT_REGULATIONS = [
  {
    icon: "tab" as const,
    title: "1 Tab trình duyệt duy nhất",
    body: "Rời khỏi màn hình hoặc chuyển tab quá 3 lần sẽ tự động khóa bài thi.",
  },
  {
    icon: "terminal" as const,
    title: "Không sử dụng DevTools & AI ngoài",
    body: "Mọi hành vi mở F12, sao chép câu hỏi hoặc dùng extension hỗ trợ sẽ bị ghi lại.",
  },
  {
    icon: "devices" as const,
    title: "Yêu cầu thiết bị khuyến nghị",
    body: "Trình duyệt Google Chrome, Edge hoặc Safari phiên bản mới nhất trên máy tính (PC/Laptop).",
  },
] as const;

/** Demo invite metadata when API does not yet expose invitation codes / topic matrices. */
export const INVITE_META = {
  codePrefix: "INV",
  standardLabel: "Tiêu chuẩn TechTrack v2.1",
  monitoringLabel: "Focus Shield",
  monitoringHint: "Chống chuyển tab & lưu vết",
  questionMixHint: "Trắc nghiệm + code snippet",
  shieldLevel: "Bảo chứng cấp độ 4.2 • Giám sát toàn vẹn",
  supportPhone: "1900 8899 (Ext 2)",
  supportEmail: "assessment-support@smarthire.ai",
  /** Invitation acceptance window after application created (ms). */
  acceptWindowMs: (2 * 24 + 14) * 3600 * 1000 + 18 * 60 * 1000 + 25 * 1000,
};
