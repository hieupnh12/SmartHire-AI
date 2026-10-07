export type ApplicationStatus =
  | "NEW"
  | "IN_REVIEW"
  | "ASSESSMENT"
  | "INTERVIEW"
  | "HUMAN_INTERVIEW"
  | "OFFER"
  | "HIRED"
  | "REJECTED"
  | "WITHDRAWN";

export type Application = {
  id: number;
  jobId: number;
  candidateId: number;
  stageId?: number | null;
  status: ApplicationStatus;
  source?: string | null;
  notes?: string | null;
};

export type ApplicationSummary = {
  id: number;
  jobId: number;
  jobTitle: string;
  candidateId: number;
  candidateName: string;
  candidateEmail: string;
  stageId: number | null;
  status: ApplicationStatus;
  source: string | null;
  referralCode: string | null;
  tags: string | null;
  assigneeName: string | null;
  archived: boolean;
  duplicate: boolean;
  createdAt: string;
  jobLocation: string | null;
  jobDepartment: string | null;
  jobWorkMode: string | null;
  jobEmploymentType: string | null;
};

export type CvRef = {
  id: number;
  originalFilename: string;
  status: string;
  createdAt: string;
  retainUntil: string | null;
  expired: boolean;
};

export type HistoryView = {
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
  createdAt: string;
  changedBy: number | null;
};

export type ApplicationDetail = ApplicationSummary & {
  notes: string | null;
  rejectReason: string | null;
  assigneeId: number | null;
  archivedAt: string | null;
  withdrawnAt: string | null;
  candidateApplicationCount: number;
  cvs: CvRef[];
  history: HistoryView[];
  gateScore?: GateScoreView | null;
  rounds?: ScreeningRoundsView | null;
  cvScreeningStatus?: "PENDING" | "PASSED" | "FAILED" | null;
  screeningMode?: "AUTO" | "MANUAL" | null;
};

export type CvEvaluationView = {
  score: number;
  threshold: number | null;
  passed: boolean;
  explanation: string | null;
  matchedSkills: string[];
  partialSkills: string[];
  missingSkills: string[];
  requiredMissingSkills: string[];
  requiredYears: number | null;
  candidateYears: number | null;
  requiredEducation: string | null;
  candidateEducation: string | null;
};

export type AiInterviewEvaluationView = {
  id: number;
  attemptNumber: number;
  status: string;
  score: number | null;
  passingScore: number | null;
  passed: boolean | null;
  completedAt: string | null;
  summary: string | null;
  strengths: string | null;
  weaknesses: string | null;
  criteria: Record<string, number>;
};

export type AssessmentEvaluationView = {
  id: number;
  testTitle: string;
  status: string;
  score: number | null;
  passingScore: number | null;
  passed: boolean | null;
  submittedAt: string | null;
};

export type CandidateEvaluationView = {
  cv: CvEvaluationView | null;
  aiInterviews: AiInterviewEvaluationView[];
  assessments: AssessmentEvaluationView[];
};

export type RoundItemView = {
  status: string;
  score: number | null;
  threshold: number | null;
  passed: boolean | null;
  weight: number | null;
};

export type ScreeningRoundsView = {
  cv: RoundItemView;
  aiInterview: RoundItemView;
  assessment: RoundItemView;
  aiInterviewInvitedAt: string | null;
};

export type GateScoreView = {
  score: number;
  passed: boolean;
  complete: boolean;
  cvScore: number | null;
  aiInterviewScore: number | null;
  assessmentScore: number | null;
  cvWeight: number | null;
  aiInterviewWeight: number | null;
  assessmentWeight: number | null;
  passThreshold: number | null;
};

export type ApplicationPage = {
  items: ApplicationSummary[];
  page: number;
  size: number;
  total: number;
};
