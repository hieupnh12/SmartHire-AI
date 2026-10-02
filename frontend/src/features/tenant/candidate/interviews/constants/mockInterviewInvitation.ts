import type { CandidateInterview } from "../api/candidateInterviewApi";

const now = Date.now();

export const mockInterviewInvitation: CandidateInterview = {
  id: -1,
  applicationId: 1024,
  jobId: 128,
  jobTitle: "Senior Backend Engineer",
  candidateId: null,
  workflowStageId: null,
  status: "QUESTIONS_READY",
  createdAt: new Date(now - 2 * 60 * 60 * 1000).toISOString(),
  availableFrom: new Date(now).toISOString(),
  availableUntil: new Date(now + 5 * 24 * 60 * 60 * 1000).toISOString(),
  startedAt: null,
  completedAt: null,
  overallScore: null,
  passingScore: 70,
  errorMessage: null,
  questionCount: 12,
  durationMinutes: 45,
  maxAttempts: 1,
  attemptNumber: 1,
  canRetry: false,
  roadmap: [
    { title: "Kiến thức kỹ thuật", kind: "MCQ", questionCount: 2 },
    { title: "Giải quyết vấn đề", kind: "OPEN", questionCount: 2 },
    { title: "Kinh nghiệm thực tế", kind: "OPEN", questionCount: 1 },
  ],
  questions: [
    {
      id: -101, aiInterviewId: -1, questionOrder: 1, questionType: "MCQ", createdAt: new Date(now).toISOString(), answer: null,
      stageTitle: "Kiến thức kỹ thuật", skills: ["Java", "Spring Boot"], competencies: ["TECHNICAL_KNOWLEDGE"],
      questionText: "Trong Spring Boot, annotation nào phù hợp nhất để đánh dấu một service chứa business logic?",
      options: ["@RestController", "@Service", "@Repository", "@Configuration"],
    },
    {
      id: -102, aiInterviewId: -1, questionOrder: 2, questionType: "MCQ", createdAt: new Date(now).toISOString(), answer: null,
      stageTitle: "Kiến thức kỹ thuật", skills: ["Database", "Multi-tenant"], competencies: ["TECHNICAL_KNOWLEDGE"],
      questionText: "Với mô hình database-per-tenant, biện pháp nào quan trọng nhất để tránh truy cập nhầm dữ liệu giữa các tenant?",
      options: ["Dùng một cache chung", "Resolve tenant context trước mọi truy vấn", "Tăng connection pool", "Tắt transaction"],
    },
    {
      id: -103, aiInterviewId: -1, questionOrder: 3, questionType: "OPEN", createdAt: new Date(now).toISOString(), answer: null,
      stageTitle: "Giải quyết vấn đề", skills: ["System Design", "Redis"], competencies: ["PROBLEM_SOLVING"],
      questionText: "API tìm kiếm ứng viên tăng từ 200ms lên 4 giây khi lượng dữ liệu tăng gấp 10 lần. Bạn sẽ điều tra nguyên nhân và ưu tiên giải pháp như thế nào?",
    },
    {
      id: -104, aiInterviewId: -1, questionOrder: 4, questionType: "OPEN", createdAt: new Date(now).toISOString(), answer: null,
      stageTitle: "Giải quyết vấn đề", skills: ["RabbitMQ", "Reliability"], competencies: ["PROBLEM_SOLVING"],
      questionText: "Một RabbitMQ consumer xử lý cùng một CV hai lần. Hãy mô tả cách bạn thiết kế xử lý idempotent và theo dõi lỗi.",
    },
    {
      id: -105, aiInterviewId: -1, questionOrder: 5, questionType: "OPEN", createdAt: new Date(now).toISOString(), answer: null,
      stageTitle: "Kinh nghiệm thực tế", skills: ["Leadership", "Delivery"], competencies: ["PRACTICAL_EXPERIENCE"],
      questionText: "Hãy kể về một quyết định kỹ thuật khó mà bạn từng chịu trách nhiệm. Bạn đã cân nhắc trade-off và đo lường kết quả ra sao?",
    },
  ],
};
