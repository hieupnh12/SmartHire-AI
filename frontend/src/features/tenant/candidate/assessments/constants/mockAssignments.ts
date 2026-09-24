export type AssignmentStatus = "ASSIGNED" | "IN_PROGRESS" | "SUBMITTED" | "GRADED";

export type MockAssignment = {
  id: number;
  applicationId: number;
  testId: number;
  testTitle: string;
  jobTitle: string;
  durationMinutes: number;
  status: AssignmentStatus;
  score: number | null;
  dueHint: string;
  questions: {
    id: number;
    text: string;
    options: { id: number; text: string }[];
  }[];
};

export const mockAssignments: MockAssignment[] = [
  {
    id: 12,
    applicationId: 501,
    testId: 1,
    testTitle: "Java & SQL — vòng kỹ thuật",
    jobTitle: "Backend Engineer",
    durationMinutes: 45,
    status: "ASSIGNED",
    score: null,
    dueHint: "Làm trong vòng 3 ngày sau khi nhận",
    questions: [
      {
        id: 1,
        text: "Annotation nào đánh dấu bean Spring được quản lý theo singleton mặc định?",
        options: [
          { id: 1, text: "@Component" },
          { id: 2, text: "@Transient" },
          { id: 3, text: "@Override" },
          { id: 4, text: "@Deprecated" },
        ],
      },
      {
        id: 2,
        text: "SQL nào lấy ứng viên có điểm >= 70?",
        options: [
          { id: 5, text: "SELECT * FROM submissions WHERE score >= 70" },
          { id: 6, text: "SELECT * FROM submissions HAVING score > 70" },
          { id: 7, text: "GET submissions score 70" },
          { id: 8, text: "FIND submissions WHERE score" },
        ],
      },
      {
        id: 3,
        text: "Trong multi-tenant DATABASE strategy, tenant được chọn bằng gì?",
        options: [
          { id: 9, text: "TenantContext / X-Tenant-ID" },
          { id: 10, text: "Cookie language" },
          { id: 11, text: "CSS theme" },
          { id: 12, text: "Vite env only" },
        ],
      },
    ],
  },
  {
    id: 11,
    applicationId: 501,
    testId: 1,
    testTitle: "Java & SQL — vòng kỹ thuật (lượt demo đã nộp)",
    jobTitle: "Backend Engineer",
    durationMinutes: 45,
    status: "GRADED",
    score: 86.7,
    dueHint: "Đã hoàn thành",
    questions: [],
  },
];

export const assignmentStatusLabel: Record<AssignmentStatus, string> = {
  ASSIGNED: "Chưa bắt đầu",
  IN_PROGRESS: "Đang làm",
  SUBMITTED: "Đã nộp",
  GRADED: "Đã có điểm",
};
