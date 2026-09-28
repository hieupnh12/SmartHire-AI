export type AiInterviewStatus = "CREATED" | "GENERATING" | "QUESTIONS_READY" | "IN_PROGRESS" | "SCORING" | "SCORED" | "PASSED" | "FAILED" | "ERROR";

export type AiFeedback = {
  id: number;
  aiAnswerId: number;
  score: number | null;
  feedbackText: string | null;
  strengths: string | null;
  weaknesses: string | null;
  createdAt: string;
};

export type AiAnswer = {
  id: number;
  aiQuestionId: number;
  answerText: string | null;
  answerDuration: number | null;
  answeredAt: string | null;
  feedback: AiFeedback | null;
};

export type AiQuestion = {
  id: number;
  aiInterviewId: number;
  questionText: string;
  questionType: string;
  questionOrder: number;
  createdAt: string;
  answer: AiAnswer | null;
};

export type AiInterview = {
  jobTitle: string | null;
  passingScore: number | null;
  errorMessage: string | null;
  questionCount: number;
  id: number;
  applicationId: number;
  jobId: number | null;
  candidateId: number | null;
  workflowStageId: number | null;
  startedAt: string | null;
  completedAt: string | null;
  overallScore: number | null;
  status: AiInterviewStatus;
  createdAt: string;
  questions: AiQuestion[];
};

export type AiInterviewPage = { items: AiInterview[]; total: number; page: number; size: number };

export type AiInterviewLog = { id: number; aiInterviewId: number; event: string; status: AiInterviewStatus; detail: string | null; createdAt: string };
export type AiInterviewConfig = { enabled: boolean; passingScore: number; questionCount: number; availableUntil: string | null };

export type CreateAiInterviewRequest = { applicationId: number; workflowStageId?: number | null };

export type UpdateAiInterviewRequest = {
  workflowStageId?: number | null;
  status?: AiInterviewStatus | null;
  startedAt?: string | null;
  completedAt?: string | null;
  overallScore?: number | null;
};

export type AiQuestionRequest = { questionText: string; questionType: string; questionOrder: number };

export type UpsertAiFeedbackRequest = {
  score: number | null;
  feedbackText: string | null;
  strengths: string | null;
  weaknesses: string | null;
};
