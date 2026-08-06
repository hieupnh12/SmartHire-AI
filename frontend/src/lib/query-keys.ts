export const queryKeys = {
  auth: {
    me: ["auth", "me"] as const,
  },
  jobs: {
    all: ["jobs"] as const,
    list: (params?: unknown) => ["jobs", "list", params] as const,
    detail: (id: number | string) => ["jobs", "detail", id] as const,
  },
  applicants: {
    byJob: (jobId: number | string) => ["applicants", "job", jobId] as const,
    detail: (id: number | string) => ["applicants", "detail", id] as const,
  },
  cvs: {
    detail: (id: number | string) => ["cvs", "detail", id] as const,
  },
  matching: {
    rankings: (jobId: number | string) => ["matching", "rankings", jobId] as const,
    overall: (appId: number | string) => ["matching", "overall", appId] as const,
  },
  assessments: {
    list: (jobId?: number | string) => ["assessments", jobId] as const,
    attempt: (id: number | string) => ["attempts", id] as const,
  },
  interviews: {
    detail: (id: number | string) => ["interviews", id] as const,
  },
  practice: {
    list: ["practice", "list"] as const,
    detail: (id: number | string) => ["practice", id] as const,
  },
  workflow: {
    pipeline: (jobId: number | string) => ["workflow", "pipeline", jobId] as const,
  },
  schedules: {
    list: ["schedules"] as const,
  },
  notifications: {
    list: ["notifications"] as const,
  },
  dashboard: {
    summary: ["dashboard", "summary"] as const,
    charts: (params?: unknown) => ["dashboard", "charts", params] as const,
    trends: (params?: unknown) => ["dashboard", "trends", params] as const,
  },
};
