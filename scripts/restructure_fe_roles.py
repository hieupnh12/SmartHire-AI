#!/usr/bin/env python3
from pathlib import Path

root = Path(r"E:/Project/SmartHire-AI/frontend/src")
api = root / "api"
api.mkdir(exist_ok=True)
(api / "types").mkdir(exist_ok=True)

type_map = {
    "jobApi.ts": "job",
    "applicantApi.ts": "applicant",
    "cvApi.ts": "cv",
    "dashboardApi.ts": "dashboard",
}

moves = [
    ("auth/api/authApi.ts", "authApi.ts"),
    ("job/api/jobApi.ts", "jobApi.ts"),
    ("job/types/index.ts", "types/job.ts"),
    ("applicant/api/applicantApi.ts", "applicantApi.ts"),
    ("applicant/types/index.ts", "types/applicant.ts"),
    ("cv/api/cvApi.ts", "cvApi.ts"),
    ("cv/types/index.ts", "types/cv.ts"),
    ("matching/api/matchingApi.ts", "matchingApi.ts"),
    ("assessment/api/assessmentApi.ts", "assessmentApi.ts"),
    ("interview/api/interviewApi.ts", "interviewApi.ts"),
    ("practice/api/practiceApi.ts", "practiceApi.ts"),
    ("workflow/api/workflowApi.ts", "workflowApi.ts"),
    ("schedule/api/scheduleApi.ts", "scheduleApi.ts"),
    ("notifications/api/notificationApi.ts", "notificationApi.ts"),
    ("dashboard/api/dashboardApi.ts", "dashboardApi.ts"),
    ("dashboard/types/index.ts", "types/dashboard.ts"),
]

for src_rel, dest in moves:
    src = root / "features" / src_rel
    if not src.exists():
        print("missing", src)
        continue
    text = src.read_text(encoding="utf-8")
    if dest.endswith("Api.ts"):
        if dest == "authApi.ts":
            text = text.replace('from "../types"', 'from "@/features/auth/types"')
        elif dest in type_map:
            text = text.replace('from "../types"', f'from "./types/{type_map[dest]}"')
    (api / dest).write_text(text, encoding="utf-8")
    print("wrote", dest)

# index barrel
(api / "index.ts").write_text(
    """/** Domain API clients — shared across role features. */
export { authApi } from "./authApi";
export { jobApi } from "./jobApi";
export { applicantApi } from "./applicantApi";
export { cvApi } from "./cvApi";
export { matchingApi } from "./matchingApi";
export { assessmentApi } from "./assessmentApi";
export { interviewApi } from "./interviewApi";
export { practiceApi } from "./practiceApi";
export { workflowApi } from "./workflowApi";
export { scheduleApi } from "./scheduleApi";
export { notificationApi } from "./notificationApi";
export { dashboardApi } from "./dashboardApi";
""",
    encoding="utf-8",
)
print("ok")
