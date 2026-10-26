export type InterviewMode = "ONLINE" | "OFFLINE";
export type InterviewStatus = "PENDING" | "CONFIRMED" | "CANCELLED" | "DONE";
export type InterviewRound = "TECHNICAL" | "CULTURE" | "EXECUTIVE" | "AI_INTERVIEW";

export type MockInterview = {
  id: number;
  applicationId: number;
  candidateName: string;
  candidateEmail?: string;
  candidatePhone?: string;
  jobId?: number;
  jobTitle: string;
  round: InterviewRound;
  mode: InterviewMode;
  status: InterviewStatus;
  startsAt: string;
  durationMinutes: number;
  interviewerName: string;
  locationOrLink: string;
  note?: string;
};

export const interviewStatusLabel: Record<InterviewStatus, string> = {
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  CANCELLED: "Đã hủy",
  DONE: "Hoàn thành",
};

export const interviewModeLabel: Record<InterviewMode, string> = {
  ONLINE: "Trực tuyến (Online)",
  OFFLINE: "Trực tiếp (Offline)",
};

export const interviewRoundLabel: Record<InterviewRound, string> = {
  TECHNICAL: "Phỏng vấn Kỹ thuật",
  CULTURE: "Phỏng vấn Văn hóa & Đội ngũ",
  EXECUTIVE: "Phỏng vấn Lãnh đạo",
  AI_INTERVIEW: "Phỏng vấn AI",
};

export const roundMeta: Record<InterviewRound, { label: string; dot: string; chip: string; tone: string }> = {
  TECHNICAL: {
    label: "Kỹ thuật",
    dot: "bg-emerald-500",
    chip: "bg-emerald-50 text-emerald-800 border-emerald-200",
    tone: "text-emerald-700 bg-emerald-50",
  },
  CULTURE: {
    label: "Văn hóa",
    dot: "bg-sky-500",
    chip: "bg-sky-50 text-sky-800 border-sky-200",
    tone: "text-sky-700 bg-sky-50",
  },
  EXECUTIVE: {
    label: "Lãnh đạo",
    dot: "bg-indigo-500",
    chip: "bg-indigo-50 text-indigo-800 border-indigo-200",
    tone: "text-indigo-700 bg-indigo-50",
  },
  AI_INTERVIEW: {
    label: "Phỏng vấn AI",
    dot: "bg-violet-500",
    chip: "bg-violet-50 text-violet-800 border-violet-200",
    tone: "text-violet-700 bg-violet-50",
  },
};

export const mockInterviews: MockInterview[] = [
  {
    id: 101,
    applicationId: 501,
    candidateName: "Nguyễn Văn An",
    candidateEmail: "an.nguyen@gmail.com",
    candidatePhone: "0912 345 678",
    jobId: 1,
    jobTitle: "Senior Java / Spring Boot Engineer",
    round: "TECHNICAL",
    mode: "ONLINE",
    status: "CONFIRMED",
    startsAt: "2026-10-26T09:30:00+07:00",
    durationMinutes: 60,
    interviewerName: "Lê Minh (Tech Lead) · Trần Quân (Senior Architect)",
    locationOrLink: "https://meet.google.com/smarthire-tech-interview",
    note: "Kiểm tra kiến thức Multi-Tenancy, Distributed Caching và tối ưu MySQL.",
  },
  {
    id: 102,
    applicationId: 502,
    candidateName: "Trần Bảo Bình",
    candidateEmail: "binh.tran@outlook.com",
    candidatePhone: "0988 765 432",
    jobId: 1,
    jobTitle: "Senior Java / Spring Boot Engineer",
    round: "AI_INTERVIEW",
    mode: "ONLINE",
    status: "CONFIRMED",
    startsAt: "2026-10-26T14:00:00+07:00",
    durationMinutes: 45,
    interviewerName: "AI Interviewer (SmartHire Bot)",
    locationOrLink: "https://se36.smarthire.top/interview/ai/session-502",
    note: "Phiên phỏng vấn AI tự động 5 câu hỏi tình huống thiết kế hệ thống.",
  },
  {
    id: 103,
    applicationId: 503,
    candidateName: "Phạm Minh Châu",
    candidateEmail: "chau.pham@gmail.com",
    candidatePhone: "0903 112 233",
    jobId: 2,
    jobTitle: "Lead Frontend React Engineer",
    round: "CULTURE",
    mode: "OFFLINE",
    status: "PENDING",
    startsAt: "2026-10-27T10:00:00+07:00",
    durationMinutes: 45,
    interviewerName: "Hoàng My (Head of HR) · Đỗ Tuấn (Product Lead)",
    locationOrLink: "Tầng 8, Phòng họp Sáng Tạo (Phòng 802) — Tòa nhà SmartHire Tower",
    note: "Trao đổi về phong cách làm việc Agile, tinh thần đồng đội và kế hoạch phát triển.",
  },
  {
    id: 104,
    applicationId: 504,
    candidateName: "Hoàng Minh Đức",
    candidateEmail: "duc.hoang@devops.vn",
    candidatePhone: "0934 556 789",
    jobId: 3,
    jobTitle: "DevOps / SRE Specialist",
    round: "TECHNICAL",
    mode: "ONLINE",
    status: "CONFIRMED",
    startsAt: "2026-10-27T15:30:00+07:00",
    durationMinutes: 60,
    interviewerName: "Vũ Hưng (DevOps Lead)",
    locationOrLink: "https://meet.google.com/smarthire-infra-review",
    note: "Đánh giá kinh nghiệm Kubernetes, GCP Compute Engine, Docker Swarm và CI/CD GitHub Actions.",
  },
  {
    id: 105,
    applicationId: 505,
    candidateName: "Vũ Quốc Huy",
    candidateEmail: "huy.vu@product.org",
    candidatePhone: "0945 678 901",
    jobId: 4,
    jobTitle: "Product Manager (SaaS Enterprise)",
    round: "EXECUTIVE",
    mode: "OFFLINE",
    status: "PENDING",
    startsAt: "2026-10-28T09:00:00+07:00",
    durationMinutes: 60,
    interviewerName: "CEO Nguyễn Văn Nam · CPO Đặng Thanh Vân",
    locationOrLink: "Phòng họp Hội đồng Quản trị — Tầng 12",
    note: "Vòng phỏng vấn chiến lược định hướng sản phẩm B2B Multi-Tenant toàn cầu.",
  },
  {
    id: 106,
    applicationId: 506,
    candidateName: "Đặng Thu Hà",
    candidateEmail: "ha.dang@data.io",
    candidatePhone: "0977 123 999",
    jobId: 5,
    jobTitle: "Data Analyst & AI Researcher",
    round: "TECHNICAL",
    mode: "ONLINE",
    status: "CONFIRMED",
    startsAt: "2026-10-29T11:00:00+07:00",
    durationMinutes: 50,
    interviewerName: "TS. Ngô Bảo (AI Research Lead)",
    locationOrLink: "https://meet.google.com/ai-data-team",
    note: "Thảo luận về NLP scoring, prompt engineering và pipeline ranking CV.",
  },
  {
    id: 107,
    applicationId: 507,
    candidateName: "Lê Hoàng Nam",
    candidateEmail: "nam.le@mobile.dev",
    candidatePhone: "0966 888 777",
    jobId: 6,
    jobTitle: "Mobile Developer (React Native / Flutter)",
    round: "AI_INTERVIEW",
    mode: "ONLINE",
    status: "CONFIRMED",
    startsAt: "2026-10-30T14:30:00+07:00",
    durationMinutes: 45,
    interviewerName: "AI Interviewer (SmartHire Bot)",
    locationOrLink: "https://se36.smarthire.top/interview/ai/session-507",
    note: "Kiểm tra kỹ năng mobile lifecycle, offline caching và UI performance.",
  },
];
