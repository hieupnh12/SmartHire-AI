export type AssessmentSection = {
  skill: string;
  questionType: "MCQ" | "MULTIPLE_CHOICE" | "ESSAY" | "CODING";
  difficulty: "Easy" | "Medium" | "Hard";
  count: number;
  points: number;
};
export type RubricCriterionConfig = {
  name: string;
  weight: number;
  guide?: string;
};

export type AssessmentConfiguration = {
  objectiveDurationMinutes?: number | null;
  durationMinutes: number;
  passingPercent: number;
  autoAssign: boolean;
  sections: AssessmentSection[];
  codingTestWeightPercent?: number;
  codingAiWeightPercent?: number;
  essayCriteria?: RubricCriterionConfig[];
  essayGradingGuide?: string;
};
