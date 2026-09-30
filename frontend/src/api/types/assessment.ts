export type TestStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type SubmissionStatus = "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED" | "GRADED" | "EXPIRED";
export type QuestionDifficulty = "Easy" | "Medium" | "Hard";
export type JobTest = {
  id: number;
  jobId: number;
  title: string;
  description: string | null;
  durationMinutes: number;
  passingScore: number | null;
  status: TestStatus;
  createdAt: string;
  updatedAt: string | null;
  createdById: number | null;
  createdByName: string | null;
};
export type TestRequest = Pick<JobTest, "jobId" | "title" | "description" | "durationMinutes" | "passingScore">;
export type TestPage = { items: JobTest[]; total: number; page: number; size: number };
export type QuestionRequest = {
  questionText: string;
  points: number;
  questionOrder: number;
  difficulty: QuestionDifficulty | null;
  skill: string | null;
  explanation: string | null;
  options: { optionText: string; correct: boolean }[];
  questionType?: "MCQ" | "MULTIPLE_CHOICE" | "ESSAY";
};
export type Question = Omit<QuestionRequest, "options"> & {
  id: number;
  questionType: string;
  options: { id: number; optionText: string; correct: boolean }[];
};
export type CandidateQuestion = Omit<Question, "options" | "difficulty" | "skill" | "explanation"> & {
  options: { id: number; optionText: string }[];
};
export type SavedAnswer = {
  questionId: number;
  selectedOptionId?: number | null;
  selectedOptionIds?: number[] | null;
  answerText?: string | null;
};
export type Submission = {
  id: number; testId: number; applicationId: number; title: string; status: SubmissionStatus;
  startedAt: string | null; expiresAt: string | null; submittedAt: string | null; serverTime: string;
  remainingSeconds: number; score: number | null; totalPoints: number; passed: boolean | null;
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
