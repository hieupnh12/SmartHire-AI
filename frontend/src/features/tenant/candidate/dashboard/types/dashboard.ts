export type CandidateApplicationStageState = "done" | "active" | "next" | "idle";

export type CandidateApplicationStage = {
  label: string;
  state: CandidateApplicationStageState;
};

export type CandidateTaskIcon = "assessment" | "interview" | "cv";

export type CandidateTask = {
  title: string;
  meta: string;
  icon: CandidateTaskIcon;
  to: string;
};

export type CandidateStatIcon = "applications" | "cv" | "practice";

export type CandidateStat = {
  label: string;
  value: string;
  icon: CandidateStatIcon;
};