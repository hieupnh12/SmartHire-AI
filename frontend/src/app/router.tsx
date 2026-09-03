import { Navigate, Route, Routes } from "react-router-dom";
import { RootRouteSwitcher } from "@/app/RootRouteSwitcher";
import { RoleRoute } from "@/app/guards/RoleRoute";
import { RoleShell } from "@/app/layouts/RoleShell";
import { TenantOnboardPage } from "@/features/master/onboarding/pages/TenantOnboardPage";
import { LoginPage } from "@/features/tenant/auth/pages/LoginPage";
import { RegisterPage } from "@/features/tenant/auth/pages/RegisterPage";
import { CandidateLoginPage } from "@/features/tenant/auth/pages/CandidateLoginPage";
import { MasterLoginPage } from "@/features/master/auth/pages/MasterLoginPage";
import { MasterAdminDashboardPage } from "@/features/master/dashboard/pages/MasterAdminDashboardPage";
import { TenantCareerPage } from "@/features/tenant/career/pages/TenantCareerPage";
import { TenantAdminDashboardPage } from "@/features/tenant/admin/workspace/pages/TenantAdminDashboardPage";
import { adminNav } from "@/features/tenant/admin/nav";
import { HomePage as TenantAdminHomePage } from "@/features/tenant/admin/overview/pages/HomePage";
import { SystemPage } from "@/features/tenant/admin/system/pages/SystemPage";
import { UsersPage } from "@/features/tenant/admin/users/pages/UsersPage";
import { candidateNav } from "@/features/tenant/candidate/nav";
import { HomePage as CandidateHomePage } from "@/features/tenant/candidate/dashboard/pages/HomePage";
import { BrowseJobsPage } from "@/features/tenant/candidate/jobs/pages/BrowseJobsPage";
import { MyApplicationsPage } from "@/features/tenant/candidate/applications/pages/MyApplicationsPage";
import { MyCvPage } from "@/features/tenant/candidate/cv/pages/MyCvPage";
import { AssessmentsPage as CandidateAssessmentsPage } from "@/features/tenant/candidate/assessments/pages/AssessmentsPage";
import { InterviewsPage as CandidateInterviewsPage } from "@/features/tenant/candidate/interviews/pages/InterviewsPage";
import { PracticePage } from "@/features/tenant/candidate/practice/pages/PracticePage";
import { SchedulesPage as CandidateSchedulesPage } from "@/features/tenant/candidate/schedules/pages/SchedulesPage";
import { NotificationsPage as CandidateNotificationsPage } from "@/features/tenant/candidate/notifications/pages/NotificationsPage";
import { recruiterNav } from "@/features/tenant/recruiter/nav";
import { HomePage as RecruiterHomePage } from "@/features/tenant/recruiter/dashboard/pages/HomePage";
import { JobsPage } from "@/features/tenant/recruiter/jobs/pages/JobsPage";
import { ApplicantsPage } from "@/features/tenant/recruiter/applicants/pages/ApplicantsPage";
import { CvScreeningPage } from "@/features/tenant/recruiter/cv-screening/pages/CvScreeningPage";
import { MatchingPage } from "@/features/tenant/recruiter/matching/pages/MatchingPage";
import { PipelinePage } from "@/features/tenant/recruiter/pipeline/pages/PipelinePage";
import { AssessmentsPage as RecruiterAssessmentsPage } from "@/features/tenant/recruiter/assessments/pages/AssessmentsPage";
import { InterviewsPage as RecruiterInterviewsPage } from "@/features/tenant/recruiter/interviews/pages/InterviewsPage";
import { SchedulesPage as RecruiterSchedulesPage } from "@/features/tenant/recruiter/schedules/pages/SchedulesPage";
import { NotificationsPage as RecruiterNotificationsPage } from "@/features/tenant/recruiter/notifications/pages/NotificationsPage";

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<RootRouteSwitcher />} />
      <Route path="/career" element={<TenantCareerPage />} />
      <Route path="/jobs" element={<TenantCareerPage />} />
      <Route path="/candidate/login" element={<CandidateLoginPage />} />
      <Route path="/internal/login" element={<LoginPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route element={<RoleRoute roles={["CANDIDATE"]} />}>
        <Route
          path="/candidate"
          element={
            <RoleShell
              brandKey="roles.candidate"
              basePath="/candidate"
              links={candidateNav}
            />
          }
        >
          <Route index element={<CandidateHomePage />} />
          <Route path="jobs" element={<BrowseJobsPage />} />
          <Route path="applications" element={<MyApplicationsPage />} />
          <Route path="cv" element={<MyCvPage />} />
          <Route path="assessments" element={<CandidateAssessmentsPage />} />
          <Route path="interviews" element={<CandidateInterviewsPage />} />
          <Route path="practice" element={<PracticePage />} />
          <Route path="schedules" element={<CandidateSchedulesPage />} />
          <Route path="notifications" element={<CandidateNotificationsPage />} />
        </Route>
      </Route>

      <Route element={<RoleRoute roles={["RECRUITER"]} />}>
        <Route
          path="/recruiter"
          element={
            <RoleShell
              brandKey="roles.recruiter"
              basePath="/recruiter"
              links={recruiterNav}
            />
          }
        >
          <Route index element={<RecruiterHomePage />} />
          <Route path="jobs" element={<JobsPage />} />
          <Route path="applicants" element={<ApplicantsPage />} />
          <Route path="cvs" element={<CvScreeningPage />} />
          <Route path="matching" element={<MatchingPage />} />
          <Route path="pipeline" element={<PipelinePage />} />
          <Route path="assessments" element={<RecruiterAssessmentsPage />} />
          <Route path="interviews" element={<RecruiterInterviewsPage />} />
          <Route path="schedules" element={<RecruiterSchedulesPage />} />
          <Route path="notifications" element={<RecruiterNotificationsPage />} />
        </Route>
      </Route>

      <Route element={<RoleRoute roles={["ADMIN"]} />}>
        <Route
          path="/tenant/admin"
          element={
            <RoleShell brandKey="roles.admin" basePath="/tenant/admin" links={adminNav} />
          }
        >
          <Route index element={<TenantAdminHomePage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="system" element={<SystemPage />} />
        </Route>
      </Route>

      <Route path="/company/workspace" element={<TenantAdminDashboardPage />} />
      <Route path="/onboard" element={<TenantOnboardPage />} />
      <Route path="/admin/login" element={<MasterLoginPage />} />
      <Route path="/admin" element={<MasterAdminDashboardPage />} />
      <Route path="/admin/dashboard" element={<MasterAdminDashboardPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}