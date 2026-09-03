import type {
  CandidateApplicationStage,
  CandidateStat,
  CandidateTask,
} from "@/features/tenant/candidate/dashboard/types/dashboard";

export const CANDIDATE_COMPANY_NAME = "ACME Enterprise IT";
export const FEATURED_APPLICATION_ROLE = "Senior Java Backend Engineer";
export const FEATURED_APPLICATION_STATUS = "Đang đánh giá";
export const NEXT_INTERVIEW_DATE = "07/09/2026";

export const candidateApplicationStages: CandidateApplicationStage[] = [
  { label: "Đã nộp CV", state: "done" },
  { label: "AI screening", state: "done" },
  { label: "Technical test", state: "active" },
  { label: "AI interview", state: "next" },
  { label: "Offer", state: "idle" },
];

export const candidateTasks: CandidateTask[] = [
  {
    title: "Hoàn thành bài Technical Assessment",
    meta: "Senior Java Backend Engineer · hạn 06/09/2026",
    icon: "assessment",
    to: "/candidate/assessments",
  },
  {
    title: "Chuẩn bị phiên AI Interview",
    meta: "30 phút · ghi âm câu trả lời và nhận phân tích",
    icon: "interview",
    to: "/candidate/interviews",
  },
  {
    title: "Cập nhật CV mới nhất",
    meta: "PDF hoặc DOCX · hệ thống sẽ phân tích lại kỹ năng",
    icon: "cv",
    to: "/candidate/cv",
  },
];

export const candidateStats: CandidateStat[] = [
  { label: "Ứng tuyển", value: "3", icon: "applications" },
  { label: "CV score", value: "86%", icon: "cv" },
  { label: "AI practice", value: "5 lượt", icon: "practice" },
];