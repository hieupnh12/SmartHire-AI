#!/usr/bin/env python3
"""Generate role-based feature pages."""
from pathlib import Path

ROOT = Path(r"E:/Project/SmartHire-AI/frontend/src/features")

def write(rel: str, content: str):
    p = ROOT / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content.strip() + "\n", encoding="utf-8")
    print(rel)

def page(title: str, blurb: str, api_hint: str = "") -> str:
    extra = f"\n      <p className=\"text-sm text-[var(--color-text-secondary)]\">{api_hint}</p>" if api_hint else ""
    return f'''
export function __NAME__() {{
  return (
    <section className="space-y-2">
      <h1 className="font-display text-3xl font-bold text-[var(--color-text-primary)]">
        {title}
      </h1>
      <p className="max-w-2xl text-[var(--color-text-secondary)]">
        {blurb}
      </p>{extra}
    </section>
  );
}}
'''.lstrip()

# Candidate
cand = [
  ("HomePage", "Candidate home", "Your applications, assessments, and practice interviews.", "Uses dashboardApi / applicantApi"),
  ("BrowseJobsPage", "Browse jobs", "Discover published roles and apply.", "jobApi.list · applicantApi.apply"),
  ("MyApplicationsPage", "My applications", "Track status across recruitment stages.", "applicantApi"),
  ("MyCvPage", "My CV", "Upload CV and watch AI analysis status.", "cvApi.upload · analyze (RabbitMQ)"),
  ("AssessmentsPage", "Assessments", "MCQ and coding challenges assigned to you.", "assessmentApi"),
  ("InterviewsPage", "AI interviews", "Voice interviews and feedback.", "interviewApi"),
  ("PracticePage", "Practice", "AI practice sessions — not tied to hiring.", "practiceApi"),
  ("SchedulesPage", "Schedules", "Upcoming interview slots.", "scheduleApi"),
  ("NotificationsPage", "Notifications", "Realtime + inbox.", "notificationApi · ws"),
]
for name, title, blurb, hint in cand:
  body = page(title, blurb, hint).replace("__NAME__", name)
  write(f"candidate/pages/{name}.tsx", body)

# Recruiter
rec = [
  ("HomePage", "Recruiter dashboard", "KPIs for open jobs, applicants, and interviews.", "dashboardApi.summary (Redis-cached)"),
  ("JobsPage", "Jobs", "Create, publish, and close job postings.", "jobApi"),
  ("ApplicantsPage", "Applicants", "Review candidates per job.", "applicantApi"),
  ("CvScreeningPage", "CV screening", "Parse, extract, AI skill analysis, match scores.", "cvApi · matchingApi"),
  ("MatchingPage", "Matching & ranking", "Rank applicants and recommendations.", "matchingApi"),
  ("PipelinePage", "Pipeline", "Kanban stages and hiring decisions.", "workflowApi"),
  ("AssessmentsPage", "Assessments", "Create MCQ/coding tests and review scores.", "assessmentApi"),
  ("InterviewsPage", "AI interviews", "Generate questions, score, share feedback.", "interviewApi"),
  ("SchedulesPage", "Schedules", "Book and confirm interviews.", "scheduleApi"),
  ("NotificationsPage", "Notifications", "Team inbox.", "notificationApi"),
]
for name, title, blurb, hint in rec:
  body = page(title, blurb, hint).replace("__NAME__", name)
  write(f"recruiter/pages/{name}.tsx", body)

# Admin
admin = [
  ("HomePage", "Admin overview", "Platform health and high-level controls.", "Module /health + future admin APIs"),
  ("UsersPage", "Users", "Manage accounts and roles (RBAC).", "AUTH-04 · users APIs"),
  ("SystemPage", "System", "Infra status: MySQL, Redis, RabbitMQ workers.", "actuator + module health"),
]
for name, title, blurb, hint in admin:
  body = page(title, blurb, hint).replace("__NAME__", name)
  write(f"admin/pages/{name}.tsx", body)

# Role nav configs
write("candidate/nav.ts", """
export const candidateNav = [
  { to: "", label: "Home" },
  { to: "/jobs", label: "Jobs" },
  { to: "/applications", label: "Applications" },
  { to: "/cv", label: "My CV" },
  { to: "/assessments", label: "Assessments" },
  { to: "/interviews", label: "Interviews" },
  { to: "/practice", label: "Practice" },
  { to: "/schedules", label: "Schedules" },
  { to: "/notifications", label: "Notifications" },
] as const;
""")

write("recruiter/nav.ts", """
export const recruiterNav = [
  { to: "", label: "Dashboard" },
  { to: "/jobs", label: "Jobs" },
  { to: "/applicants", label: "Applicants" },
  { to: "/cvs", label: "CV Screening" },
  { to: "/matching", label: "Matching" },
  { to: "/pipeline", label: "Pipeline" },
  { to: "/assessments", label: "Assessments" },
  { to: "/interviews", label: "Interviews" },
  { to: "/schedules", label: "Schedules" },
  { to: "/notifications", label: "Notifications" },
] as const;
""")

write("admin/nav.ts", """
export const adminNav = [
  { to: "", label: "Overview" },
  { to: "/users", label: "Users" },
  { to: "/system", label: "System" },
] as const;
""")

print("role pages done")
