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
  options?: string[] | null;
  stageTitle?: string | null;
  competencies?: string[] | null;
  skills?: string[] | null;
  correctOption?: number | null;
  explanation?: string | null;
};

export type AiInterview = {
  jobTitle: string | null;
  passingScore: number | null;
  errorMessage: string | null;
  questionCount: number;
  expiresAt?: string | null;
  attemptNumber?: number;
  canRetry?: boolean;
  reportJson?: string | null;
  durationMinutes?: number | null;
  roadmap?: RoadmapStep[] | null;
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

export type RoadmapStep = { title: string; kind: "OPEN" | "MCQ"; questionCount: number };

export type AiInterviewPage = { items: AiInterview[]; total: number; page: number; size: number };

export type AiInterviewLog = { id: number; aiInterviewId: number; event: string; status: AiInterviewStatus; detail: string | null; createdAt: string };
export type CompetencyKey = "TECHNICAL_KNOWLEDGE" | "PROBLEM_SOLVING" | "PRACTICAL_EXPERIENCE" | "COMMUNICATION" | "BEHAVIORAL_SITUATIONAL";

export type InterviewStage = { title: string; questionCount: number; competencies: string[]; skills: string[] };

export type InterviewPolicy = {
  durationMinutes: number;
  maxAttempts: number;
  miniAssessmentEnabled: boolean;
  miniQuestionCount: number;
  miniWeight: number;
  miniAfterStage: number;
  weights: Record<CompetencyKey, number>;
  selectedSkills: string[];
  stages: InterviewStage[];
};

export type AiInterviewConfig = {
  enabled: boolean;
  passingScore: number;
  questionCount: number;
  availableUntil: string | null;
  policy: InterviewPolicy;
};

export type AiInterviewReport = {
  overallScore: number;
  weights?: Partial<Record<CompetencyKey, number>>;
  miniAssessmentScore?: number;
  competencies: Partial<Record<CompetencyKey, number>>;
  skills: Record<string, { score: number | null; evidenceCount: number; miniAssessmentTested?: boolean; questionIds?: number[] }>;
};

export const COMPETENCY_LABELS: Record<CompetencyKey, string> = {
  TECHNICAL_KNOWLEDGE: "Technical Knowledge",
  PROBLEM_SOLVING: "Problem Solving",
  PRACTICAL_EXPERIENCE: "Practical Experience",
  COMMUNICATION: "Communication",
  BEHAVIORAL_SITUATIONAL: "Behavioral / Situational",
};

export const WEIGHT_PRESETS: Record<"default" | "junior" | "senior", InterviewPolicy["weights"]> = {
  default: { TECHNICAL_KNOWLEDGE: 35, PROBLEM_SOLVING: 25, PRACTICAL_EXPERIENCE: 20, COMMUNICATION: 10, BEHAVIORAL_SITUATIONAL: 10 },
  junior: { TECHNICAL_KNOWLEDGE: 45, PROBLEM_SOLVING: 20, PRACTICAL_EXPERIENCE: 15, COMMUNICATION: 10, BEHAVIORAL_SITUATIONAL: 10 },
  senior: { TECHNICAL_KNOWLEDGE: 20, PROBLEM_SOLVING: 35, PRACTICAL_EXPERIENCE: 25, COMMUNICATION: 10, BEHAVIORAL_SITUATIONAL: 10 },
};

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
