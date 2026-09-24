export type TestStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type SubmissionStatus = "ASSIGNED" | "IN_PROGRESS" | "SUBMITTED" | "GRADED";

export type MockQuestion = {
  id: number;
  text: string;
  points: number;
  options: { id: number; text: string; correct?: boolean }[];
};

export type MockSubmission = {
  id: number;
  applicationId: number;
  candidateName: string;
  jobTitle: string;
  status: SubmissionStatus;
  score: number | null;
  startedAt: string | null;
  submittedAt: string | null;
};

export type MockTest = {
  id: number;
  jobId: number;
  jobTitle: string;
  title: string;
  description: string;
  durationMinutes: number;
  passingScore: number;
  status: TestStatus;
  questionCount: number;
  assignedCount: number;
  submittedCount: number;
  createdAt: string;
  questions: MockQuestion[];
  submissions: MockSubmission[];
};

export const mockTests: MockTest[] = [
  {
    id: 1,
    jobId: 101,
    jobTitle: "Backend Engineer",
    title: "Java & SQL — vòng kỹ thuật",
    description: "Trắc nghiệm kiến thức Java, Spring và SQL cơ bản. Thời gian 45 phút.",
    durationMinutes: 45,
    passingScore: 70,
    status: "PUBLISHED",
    questionCount: 3,
    assignedCount: 2,
    submittedCount: 1,
    createdAt: "2026-09-18T09:00:00Z",
    questions: [
      {
        id: 1,
        text: "Annotation nào đánh dấu bean Spring được quản lý theo singleton mặc định?",
        points: 10,
        options: [
          { id: 1, text: "@Component", correct: true },
          { id: 2, text: "@Transient" },
          { id: 3, text: "@Override" },
          { id: 4, text: "@Deprecated" },
        ],
      },
      {
        id: 2,
        text: "SQL nào lấy ứng viên có điểm >= 70?",
        points: 10,
        options: [
          { id: 5, text: "SELECT * FROM submissions WHERE score >= 70", correct: true },
          { id: 6, text: "SELECT * FROM submissions HAVING score > 70" },
          { id: 7, text: "GET submissions score 70" },
          { id: 8, text: "FIND submissions WHERE score" },
        ],
      },
      {
        id: 3,
        text: "Trong multi-tenant DATABASE strategy, tenant được chọn bằng gì?",
        points: 10,
        options: [
          { id: 9, text: "TenantContext / X-Tenant-ID", correct: true },
          { id: 10, text: "Cookie language" },
          { id: 11, text: "CSS theme" },
          { id: 12, text: "Vite env only" },
        ],
      },
    ],
    submissions: [
      {
        id: 11,
        applicationId: 501,
        candidateName: "Nguyễn An",
        jobTitle: "Backend Engineer",
        status: "GRADED",
        score: 86.7,
        startedAt: "2026-09-20T08:00:00Z",
        submittedAt: "2026-09-20T08:32:00Z",
      },
      {
        id: 12,
        applicationId: 502,
        candidateName: "Trần Bình",
        jobTitle: "Backend Engineer",
        status: "ASSIGNED",
        score: null,
        startedAt: null,
        submittedAt: null,
      },
    ],
  },
  {
    id: 2,
    jobId: 102,
    jobTitle: "Frontend Engineer",
    title: "React fundamentals (nháp)",
    description: "Đề đang soạn — chưa publish.",
    durationMinutes: 30,
    passingScore: 60,
    status: "DRAFT",
    questionCount: 1,
    assignedCount: 0,
    submittedCount: 0,
    createdAt: "2026-09-19T14:20:00Z",
    questions: [
      {
        id: 4,
        text: "Hook nào dùng để lấy server state trong dự án này?",
        points: 10,
        options: [
          { id: 13, text: "TanStack Query", correct: true },
          { id: 14, text: "useState only" },
          { id: 15, text: "Redux bắt buộc" },
          { id: 16, text: "localStorage sync" },
        ],
      },
    ],
    submissions: [],
  },
];

export const testStatusLabel: Record<TestStatus, string> = {
  DRAFT: "Nháp",
  PUBLISHED: "Đã publish",
  ARCHIVED: "Đã lưu trữ",
};

export const submissionStatusLabel: Record<SubmissionStatus, string> = {
  ASSIGNED: "Đã giao",
  IN_PROGRESS: "Đang làm",
  SUBMITTED: "Đã nộp",
  GRADED: "Đã chấm",
};
