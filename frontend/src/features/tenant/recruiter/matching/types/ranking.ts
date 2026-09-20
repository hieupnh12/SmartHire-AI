export type ComponentKey = "skills" | "experience" | "assessment" | "interview";
export interface RankingConfig {
  weights: Record<ComponentKey, number>;
  groups: Record<string, number>;
  requiredExperienceMonths: number;
  revision: number;
}
export interface Selection { cvId: number | null; attemptId: number | null; interviewId: number | null }
export interface ScoreComponent { key: ComponentKey; score: number | null; weight: number; contribution: number | null; state: string }
export interface RankingRow {
  applicationId: number;
  candidateName: string;
  status: string;
  rank: number | null;
  result: {
    score: number | null; availableWeight: number; completedComponents: number;
    requiredComponents: number; cohort: string; complete: boolean; components: ScoreComponent[];
  };
  groups: { category: string; weight: number; score: number | null; coverage: number | null;
    matches: { requiredSkill: string; candidateSkill: string | null; similarity: number; required: boolean; evidence: string | null }[] }[];
  missingRequired: string[];
  experienceMonths: number | null;
  experienceEvidence: string[];
  notices: string[];
  sources: Selection;
  interviewFeedback: string | null;
  timeline: RankingTimelineEvent[];
  insight: RankingInsight | null;
}
export interface RankingTimelineEvent { type: string; occurredAt: string | null }
export interface RankingInsight { recommendation: string; strengths: string[]; risks: string[]; questions: string[] }
export interface RankingBoard {
  jobId: number; jobTitle: string; config: RankingConfig; rankingVersion: string; calculatedAt: string; rows: RankingRow[]; skillCategories: string[];
}
export interface RankingSummary {
  totalCandidates: number; activeCandidates: number; scoredCandidates: number; averageScore: number | null;
  topCandidateName: string | null; topScore: number | null; completeCandidates: number;
}
export interface RankingPage extends RankingBoard {
  cohorts: string[];
  summary: RankingSummary;
  page: { number: number; size: number; totalElements: number; totalPages: number };
}
export interface RankingQuery {
  page: number; size: number; search: string; status: string; cohort: string; minScore?: number; sort: string;
}
export interface RankingSources {
  cvs: SourceOption[]; attempts: SourceOption[]; interviews: SourceOption[]; selected: Selection;
}
export interface SourceOption { id: number; label: string; status: string }
