export type TestStatus = "DRAFT" | "PUBLISHED" | "ARCHIVED";
export type SubmissionStatus = "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED" | "GRADED" | "EXPIRED";
export type JobTest = {
  id: number; jobId: number; title: string; description: string | null;
  durationMinutes: number; passingScore: number | null; status: TestStatus; createdAt: string;
};
export type TestRequest = Pick<JobTest, "jobId" | "title" | "description" | "durationMinutes" | "passingScore">;
export type TestPage = { items: JobTest[]; total: number; page: number; size: number };
export type QuestionRequest = {
  questionText: string; points: number; questionOrder: number;
  options: { optionText: string; correct: boolean }[];
};
export type Question = Omit<QuestionRequest, "options"> & {
  id: number; questionType: string; options: { id: number; optionText: string; correct: boolean }[];
};
export type CandidateQuestion = Omit<Question, "options"> & { options: { id: number; optionText: string }[] };
export type SavedAnswer = { questionId: number; selectedOptionId: number | null };
export type Submission = {
  id: number; testId: number; applicationId: number; title: string; status: SubmissionStatus;
  startedAt: string | null; expiresAt: string | null; submittedAt: string | null; serverTime: string;
  remainingSeconds: number; score: number | null; totalPoints: number; passed: boolean | null;
  questions: CandidateQuestion[]; answers: SavedAnswer[];
};
export type AvailableAssessment = Pick<JobTest, "id" | "title" | "description" | "durationMinutes" | "passingScore"> & {
  submissionId: number | null; submissionStatus: SubmissionStatus | null;
};
