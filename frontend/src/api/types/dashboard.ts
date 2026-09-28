export type DashboardSummary = {
  openJobs: number;
  newApplicants: number;
  interviewsScheduled: number;
  hireRate?: number;
  avgMatchScore?: number;
  totalJobs: number;
  activeJobs: number;
  pausedJobs: number;
  draftJobs: number;
  jobsNearDeadline: number;
  totalApplications: number;
  averageApplicationsPerOpenJob: number;
  pendingCvScreening: number;
};

export type DashboardActionItems = {
  newApplicants: number;
  pendingCvScreening: number;
  upcomingInterviews: number;
  draftJobs: number;
  jobsNearDeadline: number;
};

export type DashboardMetric = { label: string; value: number };
export type DashboardCharts = {
  funnel: DashboardMetric[];
  sources: DashboardMetric[];
  scoreDistribution: Array<DashboardMetric & { minInclusive: number; maxExclusive: number }>;
};
export type DashboardTrendPoint = { period: string; applications: number; hires: number; avgScore?: number };
