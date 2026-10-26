export type TestStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type SubmissionStatus = "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED" | "GRADED" | "EXPIRED";
export type QuestionDifficulty = "Easy" | "Medium" | "Hard";
export type JobTest = {
  id: number;
  jobId: number;
  title: string;
  description: string | null;
  objectiveDurationMinutes?: number | null;
  durationMinutes: number;
  passingScore: number | null;
  status: TestStatus;
  createdAt: string;
  updatedAt: string | null;
  createdById: number | null;
  createdByName: string | null;
  assignedApplicationId?: number | null;
};
export type TestRequest = Pick<JobTest, "jobId" | "title" | "description" | "durationMinutes" | "passingScore" | "objectiveDurationMinutes">;
export type TestPage = { items: JobTest[]; total: number; page: number; size: number };
export type QuestionRequest = {
  questionText: string;
  points: number;
  questionOrder: number;
  difficulty: QuestionDifficulty | null;
  skill: string | null;
  explanation: string | null;
  options: { optionText: string; correct: boolean }[];
  questionType?: "MCQ" | "MULTIPLE_CHOICE" | "ESSAY" | "CODING";
  rubricJson?: EssayRubric | null;
  coding?: CodingContent | null;
};
export type Question = Omit<QuestionRequest, "options"> & {
  id: number;
  questionType: string;
  options: { id: number; optionText: string; correct: boolean }[];
};
export type CandidateQuestion = Omit<Question, "options" | "difficulty" | "skill" | "explanation" | "rubricJson"> & {
  options: { id: number; optionText: string }[];
};
export type SavedAnswer = {
  questionId: number;
  selectedOptionId?: number | null;
  selectedOptionIds?: number[] | null;
  answerText?: string | null;
  language?: string | null;
};
export type Submission = {
  id: number; testId: number; applicationId: number; title: string; status: SubmissionStatus;
  startedAt: string | null; expiresAt: string | null; submittedAt: string | null; serverTime: string;
  remainingSeconds: number; score: number | null; totalPoints: number; passed: boolean | null;
  objectiveCompletedAt?: string | null;
  objectiveExpiresAt?: string | null;
  questions: CandidateQuestion[]; answers: SavedAnswer[];
};
export type SubmissionSummary = {
  id: number; testId: number; testTitle: string; applicationId: number;
  candidateId: number; candidateName: string; candidateEmail: string; status: SubmissionStatus;
  startedAt: string | null; expiresAt: string | null; submittedAt: string | null; remainingSeconds: number;
  score: number | null; totalPoints: number; passingScore: number | null; passed: boolean | null;
};
export type SendAssessmentResult = { testId: number; applicationId: number; applicationStatus: string; emailSent: boolean };
export type AvailableAssessment = Pick<JobTest, "id" | "title" | "description" | "durationMinutes" | "passingScore"> & {
  submissionId: number | null; submissionStatus: SubmissionStatus | null;
};

export type EssayCategory = "ESSAY_CONCEPTUAL" | "ESSAY_COMPARISON" | "ESSAY_SCENARIO" | "ESSAY_ARCHITECTURE";
export type EssayRubric = { category?: EssayCategory; referenceAnswer: string; minWords?: number; criteria: { description: string; name?: string; guide?: string; weight: number; keywords?: string[] }[] };
export type CodingContent = { title?: string; category: "CODING_ALGORITHM" | "CODING_OOP" | "SQL_QUERY"; timeLimitMs: number; memoryMb: number;
  starterCode: Record<string, string>; harness: Record<string, string> | null;
  testCases: { input: string; expectedOutput: string; sample: boolean; weight?: number }[] };
export type GradingReview = { questionId: number; prompt: string; type: string; points: number; answerText: string | null;
  language: string | null; rubric: EssayRubric | null; evaluation: Record<string, unknown> | null;
  suggestedScore: number | null; score: number | null; reviewedAt: string | null };
export type SampleResult = { status: { id: number; description: string }; stdout?: string; stderr?: string; compile_output?: string };

export type ProctorEventSummary = {
  id: number;
  event: string;
  detail: string | null;
  durationSeconds: number | null;
  createdAt: string;
};

export type SubmissionGradingDetail = {
  id: number; testTitle: string; candidateName: string; candidateEmail: string | null; status: SubmissionStatus;
  score: number | null; totalPoints: number; passingScore: number | null; emailAvailable: boolean;
  objective: { correctCount: number; questionCount: number; score: number; totalPoints: number }; reviews: GradingReview[];
  proctorEvents?: ProctorEventSummary[];
};
export type GradeDecision = { questionId: number; score: number | null };
export type ResultEmailReceipt = { id: number; status: "PENDING" | "SENT" | "FAILED" };

