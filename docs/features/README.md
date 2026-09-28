# Product Features — SmartHire-AI

Mỗi trang gồm: Mục đích · Actor · Luồng · Business Rules · API · Database · UI mockup · **Trạng thái** · Code ID.

**Legend status:** `To Do` | `Doing` | `Done`

---

## 1. Authentication & User Management

| Code | Feature | Doc | Status |
|---|---|---|---|
| AUTH-01 | User Registration | [User-Registration](Authentication/User-Registration.md) | To Do |
| AUTH-02 | Login & JWT Authentication | [Login-JWT](Authentication/Login-JWT.md) | To Do |
| AUTH-03 | Google OAuth Login | [Google-OAuth](Authentication/Google-OAuth.md) | To Do |
| AUTH-04 | Role-Based Access Control (RBAC) | [RBAC](Authentication/RBAC.md) | Done |
| AUTH-05 | User Profile Management | [User-Profile](Authentication/User-Profile.md) | To Do |

## 2. Company Management

| Code | Feature | Doc | Status |
|---|---|---|---|
| COMPANY-01 | View & Update Company Profile | [Company-Profile](Company-Management/Company-Profile.md) | Doing |
| COMPANY-02 | Invite tenant staff | [Invite-Member](Company-Management/Invite-Member.md) | Done |

## 3. Job Recruitment Management

| Code | Feature | Doc | Status |
|---|---|---|---|
| JOB-01 | Create / Update / Delete Job | [Job-CRUD](Job-Recruitment/Job-CRUD.md) | Done |
| JOB-02 | Job Publishing | [Job-Publishing](Job-Recruitment/Job-Publishing.md) | Done |
| JOB-03 | Skill Requirement Management | [Skill-Requirements](Job-Recruitment/Skill-Requirements.md) | Done |
| JOB-04 | Recruitment Stage Management | [Recruitment-Stages](Job-Recruitment/Recruitment-Stages.md) | Done |
| JOB-05 | Applicant Management | [Applicant-Management](Job-Recruitment/Applicant-Management.md) | Done |
| JOB-06 | Recruiter Job Assignment | [Recruiter-Assignment](Job-Recruitment/Recruiter-Assignment.md) | Done |

## 4. AI-Powered CV Screening & Analysis

| Code | Feature | Doc | Status |
|---|---|---|---|
| CV-01 | CV Upload | [CV-Upload](CV-Screening/CV-Upload.md) | Done |
| CV-02 | CV Parsing | [CV-Parsing](CV-Screening/CV-Parsing.md) | Done |
| CV-03 | Information Extraction | [Information-Extraction](CV-Screening/Information-Extraction.md) | Done |
| CV-04 | AI Skill Analysis | [AI-Skill-Analysis](CV-Screening/AI-Skill-Analysis.md) | Done |
| CV-05 | Candidate Matching Score | [Matching-Score](CV-Screening/Matching-Score.md) | Done |

## 5. Candidate-Job Matching & Ranking

| Code | Feature | Doc | Status |
|---|---|---|---|
| RANK-01 | Candidate Ranking Algorithm | [Ranking-Algorithm](Matching-Ranking/Ranking-Algorithm.md) | Doing |
| RANK-02 | Recommendation Engine | [Recommendation-Engine](Matching-Ranking/Recommendation-Engine.md) | To Do |
| RANK-03 | Overall Candidate Score | [Overall-Candidate-Score](Matching-Ranking/Overall-Candidate-Score.md) | To Do |

## 6. FE-05: Online Technical Assessment

| Code | Feature | Doc | Status |
|---|---|---|---|
| ASSESS-01 | Multiple Choice Test | [Multiple-Choice-Test](Technical-Assessment/Multiple-Choice-Test.md) | To Do |
| ASSESS-02 | Coding Challenge | [Coding-Challenge](Technical-Assessment/Coding-Challenge.md) | To Do |
| ASSESS-03 | Auto Grading | [Auto-Grading](Technical-Assessment/Auto-Grading.md) | To Do |
| ASSESS-04 | Timer Control | [Timer-Control](Technical-Assessment/Timer-Control.md) | To Do |
| ASSESS-05 | Anti-cheating Detection | [Anti-Cheating](Technical-Assessment/Anti-Cheating.md) | To Do |

## 7. AI Interview System

| Code | Feature | Doc | Status |
|---|---|---|---|
| INT-01 | AI Question Generation | [Question-Generation](AI-Interview/Question-Generation.md) | To Do |
| INT-02 | Speech-to-Text Integration | [Speech-to-Text](AI-Interview/Speech-to-Text.md) | To Do |
| INT-03 | NLP Response Analysis | [NLP-Response-Analysis](AI-Interview/NLP-Response-Analysis.md) | To Do |
| INT-04 | AI Interview Scoring | [AI-Scoring](AI-Interview/AI-Scoring.md) | To Do |
| INT-05 | Interview Feedback | [Interview-Feedback](AI-Interview/Interview-Feedback.md) | To Do |

## 8. Recruitment Workflow Management

| Code | Feature | Doc | Status |
|---|---|---|---|
| WF-01 | Recruitment Pipeline | [Recruitment-Pipeline](Recruitment-Workflow/Recruitment-Pipeline.md) | To Do |
| WF-02 | Candidate Status Management | [Candidate-Status](Recruitment-Workflow/Candidate-Status.md) | Done |
| WF-03 | Hiring Decision Management | [Hiring-Decision](Recruitment-Workflow/Hiring-Decision.md) | To Do |

## 9. Recruitment Analytics Dashboard

| Code | Feature | Doc | Status |
|---|---|---|---|
| DASH-01 | Recruitment Statistics | [Recruitment-Statistics](Analytics-Dashboard/Recruitment-Statistics.md) | Done |
| DASH-02 | Dashboard Charts | [Dashboard-Charts](Analytics-Dashboard/Dashboard-Charts.md) | Done |
| DASH-03 | Recruitment Trend Analysis | [Trend-Analysis](Analytics-Dashboard/Trend-Analysis.md) | Done |

## 10. Interview Scheduling & Real-time Notifications

| Code | Feature | Doc | Status |
|---|---|---|---|
| SCHED-01 | Interview Scheduling | [Interview-Scheduling](Scheduling-Notifications/Interview-Scheduling.md) | To Do |
| SCHED-02 | WebSocket Notification | [WebSocket-Notifications](Scheduling-Notifications/WebSocket-Notifications.md) | To Do |
| SCHED-03 | Email Notification | [Email-Notifications](Scheduling-Notifications/Email-Notifications.md) | To Do |

## 11. AI Practice Interview for Candidates

| Code | Feature | Doc | Status |
|---|---|---|---|
| PRACT-01 | Practice Interview Session | [Practice-Session](Practice-Interview/Practice-Session.md) | To Do |
| PRACT-02 | AI Feedback Generation | [AI-Feedback-Generation](Practice-Interview/AI-Feedback-Generation.md) | To Do |
| PRACT-03 | Practice History Management | [Practice-History](Practice-Interview/Practice-History.md) | To Do |

---

## Thứ tự implement đề xuất

```
AUTH → COMPANY → JOB → CV → RANK → ASSESS → INT → WF → SCHED → DASH → PRACT
```

1. Auth/RBAC/Profile trước (mọi API phụ thuộc).
2. Company profile (Master DB branding).
3. Job + Stages + Applicants.
4. CV pipeline (upload → parse → extract → analyze → match) qua RabbitMQ.
5. Ranking / overall score.
6. Technical Assessment (FE-05).
7. AI Interview (+ STT/NLP).
8. Workflow + Hiring decision.
9. Scheduling + WebSocket + Email.
10. Analytics dashboard.
11. Practice interview (tái sử dụng INT services, data tách biệt).

Khi code xong một Code ID: đổi status trong file feature **và** bảng trên.
