import { Navigate, Route, Routes } from "react-router-dom";
import { RoleShell } from "@/app/layouts/RoleShell";
import { RoleRoute, RoleHomeRedirect } from "@/app/guards/RoleRoute";
import { WelcomePage } from "@/features/welcome/pages/WelcomePage";
import { LoginPage } from "@/features/auth/pages/LoginPage";
import { RegisterPage } from "@/features/auth/pages/RegisterPage";

import { candidateNav } from "@/features/candidate/nav";
import { HomePage as CandidateHomePage } from "@/features/candidate/pages/HomePage";
import { BrowseJobsPage } from "@/features/candidate/pages/BrowseJobsPage";
import { MyApplicationsPage } from "@/features/candidate/pages/MyApplicationsPage";
import { MyCvPage } from "@/features/candidate/pages/MyCvPage";
import { AssessmentsPage as CandidateAssessmentsPage } from "@/features/candidate/pages/AssessmentsPage";
import { InterviewsPage as CandidateInterviewsPage } from "@/features/candidate/pages/InterviewsPage";
import { PracticePage as CandidatePracticePage } from "@/features/candidate/pages/PracticePage";
import { SchedulesPage as CandidateSchedulesPage } from "@/features/candidate/pages/SchedulesPage";
import { NotificationsPage as CandidateNotificationsPage } from "@/features/candidate/pages/NotificationsPage";

import { recruiterNav } from "@/features/recruiter/nav";
import { HomePage as RecruiterHomePage } from "@/features/recruiter/pages/HomePage";
import { JobsPage as RecruiterJobsPage } from "@/features/recruiter/pages/JobsPage";
import { ApplicantsPage as RecruiterApplicantsPage } from "@/features/recruiter/pages/ApplicantsPage";
import { CvScreeningPage as RecruiterCvScreeningPage } from "@/features/recruiter/pages/CvScreeningPage";
import { MatchingPage as RecruiterMatchingPage } from "@/features/recruiter/pages/MatchingPage";
import { PipelinePage as RecruiterPipelinePage } from "@/features/recruiter/pages/PipelinePage";
import { AssessmentsPage as RecruiterAssessmentsPage } from "@/features/recruiter/pages/AssessmentsPage";
import { InterviewsPage as RecruiterInterviewsPage } from "@/features/recruiter/pages/InterviewsPage";
import { SchedulesPage as RecruiterSchedulesPage } from "@/features/recruiter/pages/SchedulesPage";
import { NotificationsPage as RecruiterNotificationsPage } from "@/features/recruiter/pages/NotificationsPage";

import { adminNav } from "@/features/admin/nav";
import { HomePage as AdminHomePage } from "@/features/admin/pages/HomePage";
import { UsersPage as AdminUsersPage } from "@/features/admin/pages/UsersPage";
import { SystemPage as AdminSystemPage } from "@/features/admin/pages/SystemPage";

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<WelcomePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/app" element={<RoleHomeRedirect />} />

      <Route element={<RoleRoute roles={["CANDIDATE"]} />}>
        <Route
          path="/candidate"
          element={
            <RoleShell brandKey="roles.candidate" basePath="/candidate" links={[...candidateNav]} />
          }
        >
          <Route index element={<CandidateHomePage />} />
          <Route path="jobs" element={<BrowseJobsPage />} />
          <Route path="applications" element={<MyApplicationsPage />} />
          <Route path="cv" element={<MyCvPage />} />
          <Route path="assessments" element={<CandidateAssessmentsPage />} />
          <Route path="interviews" element={<CandidateInterviewsPage />} />
          <Route path="practice" element={<CandidatePracticePage />} />
          <Route path="schedules" element={<CandidateSchedulesPage />} />
          <Route path="notifications" element={<CandidateNotificationsPage />} />
        </Route>
      </Route>

      <Route element={<RoleRoute roles={["RECRUITER"]} />}>
        <Route
          path="/recruiter"
          element={
            <RoleShell brandKey="roles.recruiter" basePath="/recruiter" links={[...recruiterNav]} />
          }
        >
          <Route index element={<RecruiterHomePage />} />
          <Route path="jobs" element={<RecruiterJobsPage />} />
          <Route path="applicants" element={<RecruiterApplicantsPage />} />
          <Route path="cvs" element={<RecruiterCvScreeningPage />} />
          <Route path="matching" element={<RecruiterMatchingPage />} />
          <Route path="pipeline" element={<RecruiterPipelinePage />} />
          <Route path="assessments" element={<RecruiterAssessmentsPage />} />
          <Route path="interviews" element={<RecruiterInterviewsPage />} />
          <Route path="schedules" element={<RecruiterSchedulesPage />} />
          <Route path="notifications" element={<RecruiterNotificationsPage />} />
        </Route>
      </Route>

      <Route element={<RoleRoute roles={["ADMIN"]} />}>
        <Route
          path="/admin"
          element={<RoleShell brandKey="roles.admin" basePath="/admin" links={[...adminNav]} />}
        >
          <Route index element={<AdminHomePage />} />
          <Route path="users" element={<AdminUsersPage />} />
          <Route path="system" element={<AdminSystemPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
