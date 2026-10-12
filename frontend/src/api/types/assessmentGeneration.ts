export type AssessmentSection = {
  skill: string;
  questionType: "MCQ" | "MULTIPLE_CHOICE" | "ESSAY";
  difficulty: "Easy" | "Medium" | "Hard";
  count: number;
  points: number;
};
export type AssessmentConfiguration = {
  durationMinutes: number;
  passingPercent: number;
  autoAssign: boolean;
  sections: AssessmentSection[];
};
