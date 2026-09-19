import { MasterRoute } from "@/app/guards/MasterRoute";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { RootRouteSwitcher } from "@/app/RootRouteSwitcher";
import { FeatureRoute } from "@/app/guards/FeatureRoute";
import { RoleRoute } from "@/app/guards/RoleRoute";
import { RoleShell } from "@/app/layouts/RoleShell";
import { TenantOnboardPage } from "@/features/master/onboarding/pages/TenantOnboardPage";
import { LoginPage } from "@/features/tenant/auth/pages/LoginPage";
import { RegisterPage } from "@/features/tenant/auth/pages/RegisterPage";
import { CandidateLoginPage } from "@/features/tenant/auth/pages/CandidateLoginPage";
import { OAuthCallbackPage } from "@/features/tenant/auth/pages/OAuthCallbackPage";
import { MasterLoginPage } from "@/features/master/auth/pages/MasterLoginPage";
import { MasterAdminDashboardPage } from "@/features/master/dashboard/pages/MasterAdminDashboardPage";
import { TenantCareerPage } from "@/features/tenant/career/pages/TenantCareerPage";
import { TenantAdminDashboardPage } from "@/features/tenant/admin/workspace/pages/TenantAdminDashboardPage";
import { adminNav } from "@/features/tenant/admin/nav";
import { HomePage as TenantAdminHomePage } from "@/features/tenant/admin/overview/pages/HomePage";
import { CompanyProfilePage } from "@/features/tenant/admin/company/pages/CompanyProfilePage";
import { SystemPage } from "@/features/tenant/admin/system/pages/SystemPage";
import { UsersPage } from "@/features/tenant/admin/users/pages/UsersPage";
import { AccountPage as TenantAdminAccountPage } from "@/features/tenant/admin/account/pages/AccountPage";
import { AnalyticsPage } from "@/features/tenant/admin/analytics/pages/AnalyticsPage";
import { AcceptInvitationPage } from "@/features/tenant/auth/pages/AcceptInvitationPage";
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
import { RankingPage } from "@/features/tenant/recruiter/matching/pages/MatchingPage";
import { PipelinePage } from "@/features/tenant/recruiter/pipeline/pages/PipelinePage";
import { AssessmentsPage as RecruiterAssessmentsPage } from "@/features/tenant/recruiter/assessments/pages/AssessmentsPage";
import { InterviewsPage as RecruiterInterviewsPage } from "@/features/tenant/recruiter/interviews/pages/InterviewsPage";
import { SchedulesPage as RecruiterSchedulesPage } from "@/features/tenant/recruiter/schedules/pages/SchedulesPage";
import { NotificationsPage as RecruiterNotificationsPage } from "@/features/tenant/recruiter/notifications/pages/NotificationsPage";
import { RecruiterAnalyticsPage } from "@/features/tenant/recruiter/analytics/pages/RecruiterAnalyticsPage";
import { RolesPage } from "@/features/tenant/admin/roles/pages/RolesPage";

function LegacyTenantAdminRedirect() {
  const location = useLocation();
  const suffix = location.pathname.slice("/tenant/admin".length);

  return (
    <Navigate
      to={`/internal/admin${suffix}${location.search}${location.hash}`}
      replace
    />
  );
}

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<RootRouteSwitcher />} />
      <Route path="/career" element={<TenantCareerPage />} />
      <Route path="/jobs" element={<TenantCareerPage />} />
      <Route path="/candidate/login" element={<CandidateLoginPage />} />
      <Route path="/oauth/callback" element={<OAuthCallbackPage />} />
      <Route path="/internal/login" element={<LoginPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/invite/accept" element={<AcceptInvitationPage />} />

      <Route element={<RoleRoute workspaces={["CANDIDATE"]} />}>
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

      <Route element={<RoleRoute workspaces={["RECRUITER"]} />}>
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
          <Route element={<FeatureRoute feature="DASHBOARD" />}>
            <Route index element={<RecruiterHomePage />} />
          </Route>
          <Route element={<FeatureRoute feature="JOBS" />}>
            <Route path="jobs" element={<JobsPage />} />
          </Route>
          <Route element={<FeatureRoute feature="APPLICANTS" />}>
            <Route path="applicants" element={<ApplicantsPage />} />
          </Route>
          <Route element={<FeatureRoute feature="CV_SCREENING" />}>
            <Route path="cvs" element={<CvScreeningPage />} />
          </Route>
          <Route element={<FeatureRoute feature="RANKING" />}>
            <Route path="rank" element={<RankingPage />} />
            <Route path="matching" element={<Navigate to="/recruiter/rank" replace />} />
          </Route>
          <Route element={<FeatureRoute feature="PIPELINE" />}>
            <Route path="pipeline" element={<PipelinePage />} />
          </Route>
          <Route element={<FeatureRoute feature="ANALYTICS" />}>
            <Route path="analytics" element={<RecruiterAnalyticsPage />} />
          </Route>
          <Route element={<FeatureRoute feature="ASSESSMENTS" />}>
            <Route path="assessments" element={<RecruiterAssessmentsPage />} />
          </Route>
          <Route element={<FeatureRoute feature="INTERVIEWS" />}>
            <Route path="interviews" element={<RecruiterInterviewsPage />} />
          </Route>
          <Route element={<FeatureRoute feature="SCHEDULES" />}>
            <Route path="schedules" element={<RecruiterSchedulesPage />} />
          </Route>
          <Route element={<FeatureRoute feature="NOTIFICATIONS" />}>
            <Route path="notifications" element={<RecruiterNotificationsPage />} />
          </Route>
        </Route>
      </Route>

      <Route element={<RoleRoute workspaces={["ADMIN"]} />}>
        <Route
          path="/internal/admin"
          element={
            <RoleShell brandKey="roles.admin" basePath="/internal/admin" links={adminNav} />
          }
        >
          <Route index element={<TenantAdminHomePage />} />
          <Route path="company" element={<CompanyProfilePage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="roles" element={<RolesPage />} />
          <Route path="analytics" element={<AnalyticsPage />} />
          <Route path="system" element={<SystemPage />} />
          <Route path="account" element={<TenantAdminAccountPage />} />
        </Route>
      </Route>
      <Route path="/tenant/admin/*" element={<LegacyTenantAdminRedirect />} />

      <Route path="/company/workspace" element={<TenantAdminDashboardPage />} />
      <Route element={<MasterRoute />}>
        <Route path="/onboard" element={<TenantOnboardPage />} />
        <Route path="/admin" element={<MasterAdminDashboardPage />} />
        <Route path="/admin/dashboard" element={<MasterAdminDashboardPage />} />
      </Route>
      <Route path="/admin/login" element={<MasterLoginPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
