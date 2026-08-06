#!/usr/bin/env python3
"""Scaffold frontend features mirroring backend modules + API clients."""
from pathlib import Path

ROOT = Path(r"E:\Project\SmartHire-AI\frontend\src")

def write(rel: str, content: str):
    path = ROOT / rel
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content.strip() + "\n", encoding="utf-8")
    print(rel)

# --- shared lib ---
write("lib/utils.ts", """
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
""")

write("types/api.ts", """
/** Backend ApiResponse envelope — com.smarthire.common.api.ApiResponse */
export type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
  code?: string | null;
  errors?: Record<string, string> | null;
  timestamp?: string;
};

export type PageMeta = {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
};

export type Role = "ADMIN" | "RECRUITER" | "CANDIDATE";
""")

write("lib/query-keys.ts", """
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
""")

FEATURES = [
  ("auth", "Auth", "/auth"),
  ("job", "Job", "/jobs"),
  ("applicant", "Applicant", "/applications"),
  ("cv", "Cv", "/cvs"),
  ("matching", "Matching", "/jobs"),
  ("assessment", "Assessment", "/assessments"),
  ("interview", "Interview", "/interviews"),
  ("practice", "Practice", "/practice"),
  ("workflow", "Workflow", "/jobs"),
  ("schedule", "Schedule", "/schedules"),
  ("notifications", "Notification", "/notifications"),
  ("dashboard", "Dashboard", "/dashboard"),
]

# API client templates per feature
api_bodies = {
  "auth": '''
import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { AuthTokens, LoginRequest, RegisterRequest, UserProfile } from "../types";

export const authApi = {
  login: (body: LoginRequest) =>
    api.post<ApiResponse<AuthTokens>>("/auth/login", body).then((r) => r.data),
  register: (body: RegisterRequest) =>
    api.post<ApiResponse<AuthTokens>>("/auth/register", body).then((r) => r.data),
  google: (idToken: string) =>
    api.post<ApiResponse<AuthTokens>>("/auth/google", { idToken }).then((r) => r.data),
  refresh: (refreshToken: string) =>
    api.post<ApiResponse<AuthTokens>>("/auth/refresh", { refreshToken }).then((r) => r.data),
  logout: () => api.post<ApiResponse<null>>("/auth/logout").then((r) => r.data),
  me: () => api.get<ApiResponse<UserProfile>>("/users/me").then((r) => r.data),
  updateMe: (body: Partial<UserProfile>) =>
    api.put<ApiResponse<UserProfile>>("/users/me", body).then((r) => r.data),
  health: () => api.get<ApiResponse<Record<string, string>>>("/auth/health").then((r) => r.data),
};
''',
  "job": '''
import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { Job, JobCreateRequest } from "../types";

export const jobApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<ApiResponse<Job[]>>("/jobs", { params }).then((r) => r.data),
  get: (id: number | string) =>
    api.get<ApiResponse<Job>>(`/jobs/${id}`).then((r) => r.data),
  create: (body: JobCreateRequest) =>
    api.post<ApiResponse<Job>>("/jobs", body).then((r) => r.data),
  update: (id: number | string, body: Partial<JobCreateRequest>) =>
    api.put<ApiResponse<Job>>(`/jobs/${id}`, body).then((r) => r.data),
  remove: (id: number | string) =>
    api.delete<ApiResponse<null>>(`/jobs/${id}`).then((r) => r.data),
  publish: (id: number | string) =>
    api.post<ApiResponse<Job>>(`/jobs/${id}/publish`).then((r) => r.data),
  close: (id: number | string) =>
    api.post<ApiResponse<Job>>(`/jobs/${id}/close`).then((r) => r.data),
  skills: (id: number | string) =>
    api.get<ApiResponse<unknown>>(`/jobs/${id}/skills`).then((r) => r.data),
  updateSkills: (id: number | string, body: unknown) =>
    api.put<ApiResponse<unknown>>(`/jobs/${id}/skills`, body).then((r) => r.data),
  stages: (id: number | string) =>
    api.get<ApiResponse<unknown>>(`/jobs/${id}/stages`).then((r) => r.data),
  health: () => api.get<ApiResponse<Record<string, string>>>("/jobs/health").then((r) => r.data),
};
''',
  "applicant": '''
import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { Application } from "../types";

export const applicantApi = {
  listByJob: (jobId: number | string) =>
    api.get<ApiResponse<Application[]>>(`/jobs/${jobId}/applications`).then((r) => r.data),
  apply: (jobId: number | string, body?: Record<string, unknown>) =>
    api.post<ApiResponse<Application>>(`/jobs/${jobId}/applications`, body ?? {}).then((r) => r.data),
  update: (id: number | string, body: Partial<Application>) =>
    api.patch<ApiResponse<Application>>(`/applications/${id}`, body).then((r) => r.data),
  health: () =>
    api.get<ApiResponse<Record<string, string>>>("/applications/health").then((r) => r.data),
};
''',
  "cv": '''
import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { CvDetail } from "../types";

export const cvApi = {
  upload: (form: FormData) =>
    api.post<ApiResponse<CvDetail>>("/cvs", form, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data),
  get: (id: number | string) =>
    api.get<ApiResponse<CvDetail>>(`/cvs/${id}`).then((r) => r.data),
  parse: (id: number | string) =>
    api.post<ApiResponse<CvDetail>>(`/cvs/${id}/parse`).then((r) => r.data),
  extract: (id: number | string) =>
    api.post<ApiResponse<CvDetail>>(`/cvs/${id}/extract`).then((r) => r.data),
  analyze: (id: number | string) =>
    api.post<ApiResponse<CvDetail>>(`/cvs/${id}/analyze`).then((r) => r.data),
  match: (jobId: number | string, cvId: number | string) =>
    api.get<ApiResponse<unknown>>(`/jobs/${jobId}/cvs/${cvId}/match`).then((r) => r.data),
  recomputeMatch: (jobId: number | string, cvId: number | string) =>
    api.post<ApiResponse<unknown>>(`/jobs/${jobId}/cvs/${cvId}/match`).then((r) => r.data),
  health: () => api.get<ApiResponse<Record<string, string>>>("/cvs/health").then((r) => r.data),
};
''',
  "matching": '''
import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";

export const matchingApi = {
  rankings: (jobId: number | string) =>
    api.get<ApiResponse<unknown>>(`/jobs/${jobId}/rankings`).then((r) => r.data),
  recompute: (jobId: number | string) =>
    api.post<ApiResponse<unknown>>(`/jobs/${jobId}/rankings/recompute`).then((r) => r.data),
  recommendJobs: () =>
    api.get<ApiResponse<unknown>>("/recommendations/jobs").then((r) => r.data),
  recommendCandidates: (jobId: number | string) =>
    api.get<ApiResponse<unknown>>(`/jobs/${jobId}/recommendations/candidates`).then((r) => r.data),
  overallScore: (applicationId: number | string) =>
    api.get<ApiResponse<unknown>>(`/applications/${applicationId}/overall-score`).then((r) => r.data),
  health: () =>
    api.get<ApiResponse<Record<string, string>>>("/rankings/health").then((r) => r.data),
};
''',
  "assessment": '''
import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";

export const assessmentApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<ApiResponse<unknown>>("/assessments", { params }).then((r) => r.data),
  create: (body: unknown) =>
    api.post<ApiResponse<unknown>>("/assessments", body).then((r) => r.data),
  startAttempt: (assessmentId: number | string) =>
    api.post<ApiResponse<unknown>>(`/assessments/${assessmentId}/attempts`).then((r) => r.data),
  submitAnswers: (attemptId: number | string, body: unknown) =>
    api.post<ApiResponse<unknown>>(`/attempts/${attemptId}/answers`, body).then((r) => r.data),
  codingSubmit: (attemptId: number | string, body: unknown) =>
    api.post<ApiResponse<unknown>>(`/attempts/${attemptId}/coding-submissions`, body).then((r) => r.data),
  grade: (attemptId: number | string) =>
    api.post<ApiResponse<unknown>>(`/attempts/${attemptId}/grade`).then((r) => r.data),
  timer: (attemptId: number | string) =>
    api.get<ApiResponse<unknown>>(`/attempts/${attemptId}/timer`).then((r) => r.data),
  submit: (attemptId: number | string) =>
    api.post<ApiResponse<unknown>>(`/attempts/${attemptId}/submit`).then((r) => r.data),
  proctorEvent: (attemptId: number | string, body: unknown) =>
    api.post<ApiResponse<unknown>>(`/attempts/${attemptId}/proctor-events`, body).then((r) => r.data),
  health: () =>
    api.get<ApiResponse<Record<string, string>>>("/assessments/health").then((r) => r.data),
};
''',
  "interview": '''
import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";

export const interviewApi = {
  create: (body: unknown) =>
    api.post<ApiResponse<unknown>>("/interviews", body).then((r) => r.data),
  get: (id: number | string) =>
    api.get<ApiResponse<unknown>>(`/interviews/${id}`).then((r) => r.data),
  generateQuestions: (id: number | string) =>
    api.post<ApiResponse<unknown>>(`/interviews/${id}/questions/generate`).then((r) => r.data),
  voice: (id: number | string, form: FormData) =>
    api.post<ApiResponse<unknown>>(`/interviews/${id}/voice`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    }).then((r) => r.data),
  score: (id: number | string) =>
    api.post<ApiResponse<unknown>>(`/interviews/${id}/score`).then((r) => r.data),
  feedback: (id: number | string) =>
    api.get<ApiResponse<unknown>>(`/interviews/${id}/feedback`).then((r) => r.data),
  shareFeedback: (id: number | string) =>
    api.post<ApiResponse<unknown>>(`/interviews/${id}/feedback/share`).then((r) => r.data),
  health: () =>
    api.get<ApiResponse<Record<string, string>>>("/interviews/health").then((r) => r.data),
};
''',
  "practice": '''
import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";

export const practiceApi = {
  list: () => api.get<ApiResponse<unknown>>("/practice/sessions").then((r) => r.data),
  create: (body: unknown) =>
    api.post<ApiResponse<unknown>>("/practice/sessions", body).then((r) => r.data),
  get: (id: number | string) =>
    api.get<ApiResponse<unknown>>(`/practice/sessions/${id}`).then((r) => r.data),
  answer: (id: number | string, body: unknown) =>
    api.post<ApiResponse<unknown>>(`/practice/sessions/${id}/answers`, body).then((r) => r.data),
  requestFeedback: (id: number | string) =>
    api.post<ApiResponse<unknown>>(`/practice/sessions/${id}/feedback`).then((r) => r.data),
  getFeedback: (id: number | string) =>
    api.get<ApiResponse<unknown>>(`/practice/sessions/${id}/feedback`).then((r) => r.data),
  remove: (id: number | string) =>
    api.delete<ApiResponse<null>>(`/practice/sessions/${id}`).then((r) => r.data),
  health: () =>
    api.get<ApiResponse<Record<string, string>>>("/practice/health").then((r) => r.data),
};
''',
  "workflow": '''
import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";

export const workflowApi = {
  pipeline: (jobId: number | string) =>
    api.get<ApiResponse<unknown>>(`/jobs/${jobId}/pipeline`).then((r) => r.data),
  move: (applicationId: number | string, body: { stageId: number }) =>
    api.post<ApiResponse<unknown>>(`/applications/${applicationId}/move`, body).then((r) => r.data),
  updateStatus: (applicationId: number | string, body: { status: string; note?: string }) =>
    api.patch<ApiResponse<unknown>>(`/applications/${applicationId}/status`, body).then((r) => r.data),
  statusHistory: (applicationId: number | string) =>
    api.get<ApiResponse<unknown>>(`/applications/${applicationId}/status-history`).then((r) => r.data),
  decide: (applicationId: number | string, body: unknown) =>
    api.post<ApiResponse<unknown>>(`/applications/${applicationId}/decisions`, body).then((r) => r.data),
  health: () =>
    api.get<ApiResponse<Record<string, string>>>("/workflow/health").then((r) => r.data),
};
''',
  "schedule": '''
import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";

export const scheduleApi = {
  list: (params?: Record<string, unknown>) =>
    api.get<ApiResponse<unknown>>("/schedules", { params }).then((r) => r.data),
  create: (body: unknown) =>
    api.post<ApiResponse<unknown>>("/schedules", body).then((r) => r.data),
  update: (id: number | string, body: unknown) =>
    api.patch<ApiResponse<unknown>>(`/schedules/${id}`, body).then((r) => r.data),
  confirm: (id: number | string) =>
    api.post<ApiResponse<unknown>>(`/schedules/${id}/confirm`).then((r) => r.data),
  health: () =>
    api.get<ApiResponse<Record<string, string>>>("/schedules/health").then((r) => r.data),
};
''',
  "notifications": '''
import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";

export const notificationApi = {
  list: () => api.get<ApiResponse<unknown>>("/notifications").then((r) => r.data),
  markRead: (id: number | string) =>
    api.patch<ApiResponse<unknown>>(`/notifications/${id}`, { read: true }).then((r) => r.data),
  health: () =>
    api.get<ApiResponse<Record<string, string>>>("/notifications/health").then((r) => r.data),
};
''',
  "dashboard": '''
import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { DashboardSummary } from "../types";

export const dashboardApi = {
  summary: () =>
    api.get<ApiResponse<DashboardSummary>>("/dashboard/summary").then((r) => r.data),
  charts: (params?: Record<string, unknown>) =>
    api.get<ApiResponse<unknown>>("/dashboard/charts", { params }).then((r) => r.data),
  trends: (params?: Record<string, unknown>) =>
    api.get<ApiResponse<unknown>>("/dashboard/trends", { params }).then((r) => r.data),
  health: () =>
    api.get<ApiResponse<Record<string, string>>>("/dashboard/health").then((r) => r.data),
};
''',
}

types_bodies = {
  "auth": '''
import type { Role } from "@/types/api";

export type LoginRequest = {
  email: string;
  password: string;
};

export type RegisterRequest = {
  email: string;
  password: string;
  fullName: string;
  role: Extract<Role, "CANDIDATE" | "RECRUITER">;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  tokenType?: string;
  expiresIn?: number;
};

export type UserProfile = {
  id: number;
  email: string;
  fullName: string;
  role: Role;
  phone?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  headline?: string | null;
};
''',
  "job": '''
export type JobStatus = "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED";

export type Job = {
  id: number;
  title: string;
  description: string;
  location?: string | null;
  employmentType?: string | null;
  status: JobStatus;
  publishedAt?: string | null;
  closedAt?: string | null;
};

export type JobCreateRequest = {
  title: string;
  description: string;
  location?: string;
  employmentType?: string;
};
''',
  "applicant": '''
export type ApplicationStatus =
  | "NEW"
  | "IN_REVIEW"
  | "ASSESSMENT"
  | "INTERVIEW"
  | "OFFER"
  | "HIRED"
  | "REJECTED"
  | "WITHDRAWN";

export type Application = {
  id: number;
  jobId: number;
  candidateId: number;
  stageId?: number | null;
  status: ApplicationStatus;
  source?: string | null;
  notes?: string | null;
};
''',
  "cv": '''
export type CvStatus =
  | "UPLOADED"
  | "PARSING"
  | "PARSED"
  | "EXTRACTING"
  | "ANALYZING"
  | "ANALYZED"
  | "FAILED";

export type CvDetail = {
  id: number;
  jobId: number;
  userId: number;
  originalFilename: string;
  fileUrl: string;
  status: CvStatus;
};
''',
  "dashboard": '''
export type DashboardSummary = {
  openJobs: number;
  newApplicants: number;
  interviewsScheduled: number;
  hireRate?: number;
  avgMatchScore?: number;
};
''',
}

page_titles = {
  "auth": None,  # custom pages
  "job": ("JobsPage", "Jobs", "Manage job postings — wired to GET /jobs"),
  "applicant": ("ApplicantsPage", "Applicants", "Applicants per job — GET /jobs/{id}/applications"),
  "cv": ("CvScreeningPage", "CV Screening", "Upload & AI pipeline — POST /cvs, analyze via RabbitMQ"),
  "matching": ("MatchingPage", "Matching & Ranking", "Rankings & recommendations — GET /jobs/{id}/rankings"),
  "assessment": ("AssessmentPage", "Technical Assessment", "MCQ / Coding — FE-05 endpoints"),
  "interview": ("InterviewPage", "AI Interview", "Questions, voice, scoring — /interviews"),
  "practice": ("PracticePage", "Practice Interview", "Candidate practice sessions — /practice/sessions"),
  "workflow": ("WorkflowPage", "Recruitment Pipeline", "Kanban pipeline — GET /jobs/{id}/pipeline"),
  "schedule": ("SchedulePage", "Interview Scheduling", "Schedules — /schedules"),
  "notifications": ("NotificationsPage", "Notifications", "Inbox + WebSocket — /notifications"),
  "dashboard": None,  # exists
}

for feat, _, _ in FEATURES:
  write(f"features/{feat}/api/{feat}Api.ts" if feat != "notifications" else f"features/{feat}/api/notificationApi.ts",
        api_bodies[feat] if feat != "notifications" else api_bodies["notifications"])
  # fix auth path naming - already authApi in body
  if feat in types_bodies:
    write(f"features/{feat}/types/index.ts", types_bodies[feat])
  else:
    write(f"features/{feat}/types/index.ts", "/** Types for this feature — expand when implementing. */\nexport {};\n")

  write(f"features/{feat}/hooks/.gitkeep", "")
  write(f"features/{feat}/components/.gitkeep", "")

  if page_titles.get(feat):
    cls, title, desc = page_titles[feat]
    write(f"features/{feat}/pages/{cls}.tsx", f'''
export function {cls}() {{
  return (
    <section className="space-y-2">
      <h1 className="font-display text-3xl font-bold text-[var(--color-text-primary)]">
        {title}
      </h1>
      <p className="max-w-2xl text-[var(--color-text-secondary)]">
        {desc}
      </p>
      <p className="text-sm text-[var(--color-text-secondary)]">
        API client: <code>features/{feat}/api</code> · BE health: check module scaffold.
      </p>
    </section>
  );
}}
''')

print("feature scaffolding done")
