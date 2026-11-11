export type AnalyticsRange = "LAST_30_DAYS" | "CURRENT_QUARTER" | "LAST_12_MONTHS";
export type AnalyticsFilter = { from: string; to: string; jobId?: number };

export type WorkloadData = {
  actions: {
    cvsToScreen: number;
    candidatesOverSla: number;
    assessmentsPendingReview: number;
    upcomingInterviews: number;
  };
  jobs: Array<{
    jobId: number;
    title: string;
    candidateCount: number;
    currentFocusStage: string | null;
    overdueCount: number;
    healthScore: number;
  }>;
};

export type JobOverviewData = {
  jobId: number;
  title: string;
  status: string;
  department: string | null;
  screeningMode: string;
  headcount: number | null;
  hiredCount: number;
  pendingOfferCount: number;
  totalApplications: number;
  allTimeApplications: number;
  conversionRate: number;
  averageOverallScore: number | null;
  overdueCount: number;
  cvsToScreen: number;
  pendingAssessments: number;
  upcomingInterviews: number;
  publishedAt: string | null;
  deadline: string | null;
};

export type StageDropOff = {
  stageCode: string;
  stageLabel: string;
  rejectedCount: number;
  failedCount: number;
  withdrawnCount: number;
  totalDropOff: number;
};

export type PipelineData = {
  totalCandidates: number;
  activeJobs: number;
  stages: Array<{
    code: string;
    label: string;
    count: number;
    reachedCount: number;
    conversionRate: number | null;
    avgHoursInStage: number | null;
  }>;
  slaAlerts: Array<{
    stageCode: string;
    stageLabel: string;
    candidateCount: number;
    oldestWaitingMinutes: number;
    thresholdMinutes: number;
  }>;
  dropOffs: StageDropOff[];
};

export type ScoreDistributionType = "OVERALL" | "CV_MATCH" | "ASSESSMENT" | "AI_INTERVIEW";

export type ScoreBucket = {
  label: string;
  count: number;
  minInclusive: number;
  maxInclusive: number;
};

export type ScoreDistribution = {
  type: ScoreDistributionType;
  count: number;
  average: number | null;
  min: number | null;
  max: number | null;
  passRate: number | null;
  buckets: ScoreBucket[];
};

export type QualityData = {
  talentQualityIndex: number | null;
  sources: Array<{
    code: string;
    label: string;
    candidateCount: number;
    averageQualityScore: number | null;
    conversionRate: number | null;
  }>;
  trend: Array<{
    period: string;
    score: number | null;
    applications: number;
    hired: number;
  }>;
  insight: { title: string; message: string } | null;
  scoreDistributions: ScoreDistribution[];
};

export type PerformanceData = {
  metrics: Array<{
    code: string;
    value: number | null;
    unit: "HOURS" | "DAYS" | "PERCENT";
    target: number;
    comparison: "LTE" | "GTE";
    achieved: boolean | null;
  }>;
  achievedTargets: number;
  totalTargets: number;
  recommendation: string | null;
};

export type SkillGapItem = {
  skillName: string;
  category: string;
  required: boolean;
  weight: number;
  minLevel: string | null;
  matchedCandidates: number;
  totalCandidates: number;
  coveragePercent: number;
  gapPercent: number;
};

export type ReasonStat = {
  reason: string;
  count: number;
  sharePercent: number;
};

export type JobInsightsData = {
  jobId: number;
  evaluatedCvCount: number;
  skillGaps: SkillGapItem[];
  lossAnalysis: {
    totalRejected: number;
    totalFailed: number;
    totalWithdrawn: number;
    rejectReasons: ReasonStat[];
    withdrawReasons: ReasonStat[];
  };
  proctoring: {
    totalSubmissions: number;
    reportsCount: number;
    lowRiskCount: number;
    mediumRiskCount: number;
    highRiskCount: number;
    averageRiskScore: number | null;
    topEvents: Array<{ eventType: string; count: number }>;
  };
  humanInterviews: {
    evaluationCount: number;
    avgTechnicalScore: number | null;
    avgCommunicationScore: number | null;
    avgCultureScore: number | null;
    avgOverallScore: number | null;
    recommendations: Record<string, number>;
  };
  aiInterviews: {
    totalSessions: number;
    completedSessions: number;
    passedCount: number;
    averageScore: number | null;
    passingScore: number | null;
  };
};
