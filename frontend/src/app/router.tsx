import { MasterRoute } from "@/app/guards/MasterRoute";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { RootRouteSwitcher } from "@/app/RootRouteSwitcher";
import { FeatureRoute } from "@/app/guards/FeatureRoute";
import { RoleRoute } from "@/app/guards/RoleRoute";
import { TenantSubdomainGuard } from "@/app/guards/TenantSubdomainGuard";
import { RoleShell } from "@/app/layouts/RoleShell";
import { TenantOnboardPage } from "@/features/master/onboarding/pages/TenantOnboardPage";
import { LoginPage } from "@/features/tenant/auth/pages/LoginPage";
import { RegisterPage } from "@/features/tenant/auth/pages/RegisterPage";
import { CandidateLoginPage } from "@/features/tenant/auth/pages/CandidateLoginPage";
import { OAuthCallbackPage } from "@/features/tenant/auth/pages/OAuthCallbackPage";
import { MasterLoginPage } from "@/features/master/auth/pages/MasterLoginPage";
import { MasterAdminLayout } from "@/features/master/shell/MasterAdminLayout";
import { DashboardPage } from "@/features/master/dashboard/pages/DashboardPage";
import { AnalyticsPage as MasterAnalyticsPage } from "@/features/master/analytics/pages/AnalyticsPage";
import { LeadsPage } from "@/features/master/leads/pages/LeadsPage";
import { TenantManagementPage } from "@/features/master/tenant-management/pages/TenantManagementPage";
import { ContractsPage } from "@/features/master/contract/pages/ContractsPage";
import { InvoicesPage } from "@/features/master/billing/pages/InvoicesPage";
import { BillingPage } from "@/features/master/billing/pages/BillingPage";
import { AuditLogsPage } from "@/features/master/system/pages/AuditLogsPage";
import { AiManagementPage } from "@/features/master/system/pages/AiManagementPage";
import { AccountPage as MasterAccountPage } from "@/features/master/account/pages/AccountPage";
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
import { PublicContractSigningPage } from "@/features/master/contract/pages/PublicContractSigningPage";
import { candidateNav } from "@/features/tenant/candidate/nav";
import { HomePage as CandidateHomePage } from "@/features/tenant/candidate/dashboard/pages/HomePage";
import { BrowseJobsPage } from "@/features/tenant/candidate/jobs/pages/BrowseJobsPage";
import { CandidateJobDetailPage } from "@/features/tenant/candidate/jobs/pages/CandidateJobDetailPage";
import { MyApplicationsPage } from "@/features/tenant/candidate/applications/pages/MyApplicationsPage";
import { ApplicationDetailPage } from "@/features/tenant/candidate/applications/pages/ApplicationDetailPage";
import { MyCvPage } from "@/features/tenant/candidate/cv/pages/MyCvPage";
import { AssessmentsPage as CandidateAssessmentsPage } from "@/features/tenant/candidate/assessments/pages/AssessmentsPage";
import { TakeAssessmentPage } from "@/features/tenant/candidate/assessments/pages/TakeAssessmentPage";
import { InterviewsPage as CandidateInterviewsPage } from "@/features/tenant/candidate/interviews/pages/InterviewsPage";
import { PracticePage } from "@/features/tenant/candidate/practice/pages/PracticePage";
import { SchedulesPage as CandidateSchedulesPage } from "@/features/tenant/candidate/schedules/pages/SchedulesPage";
import { NotificationsPage as CandidateNotificationsPage } from "@/features/tenant/candidate/notifications/pages/NotificationsPage";
import { recruiterNav } from "@/features/tenant/recruiter/nav";
import { HomePage as RecruiterHomePage } from "@/features/tenant/recruiter/dashboard/pages/HomePage";
import { JobsPage } from "@/features/tenant/recruiter/jobs/pages/JobsPage";
import { JobFormPage } from "@/features/tenant/recruiter/jobs/pages/JobFormPage";
import { JobDetailPage } from "@/features/tenant/recruiter/jobs/pages/JobDetailPage";
import { ApplicantsPage } from "@/features/tenant/recruiter/applicants/pages/ApplicantsPage";
import { CvScreeningPage } from "@/features/tenant/recruiter/cv-screening/pages/CvScreeningPage";
import { RankingPage } from "@/features/tenant/recruiter/matching/pages/MatchingPage";
import { PipelinePage } from "@/features/tenant/recruiter/pipeline/pages/PipelinePage";
import { AssessmentsPage as RecruiterAssessmentsPage } from "@/features/tenant/recruiter/assessments/pages/AssessmentsPage";
import { AssessmentDetailPage } from "@/features/tenant/recruiter/assessments/pages/AssessmentDetailPage";
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
      <Route path="/oauth/callback" element={<OAuthCallbackPage />} />

      <Route element={<TenantSubdomainGuard />}>
      <Route path="/career" element={<TenantCareerPage />} />
      <Route path="/jobs" element={<TenantCareerPage />} />
      <Route path="/candidate/login" element={<CandidateLoginPage />} />
      <Route path="/internal/login" element={<LoginPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/invite/accept" element={<AcceptInvitationPage />} />
      <Route path="/contracts/sign/:token" element={<PublicContractSigningPage />} />
      <Route path="/contracts/view/:token" element={<PublicContractSigningPage />} />

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
          <Route path="jobs/:id" element={<CandidateJobDetailPage />} />
          <Route path="applications" element={<MyApplicationsPage />} />
          <Route path="applications/:id" element={<ApplicationDetailPage />} />
          <Route path="cv" element={<MyCvPage />} />
          <Route path="assessments" element={<CandidateAssessmentsPage />} />
          <Route path="assessments/:submissionId/take" element={<TakeAssessmentPage />} />
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
            <Route path="jobs/new" element={<JobFormPage />} />
            <Route path="jobs/:id" element={<JobDetailPage />} />
            <Route path="jobs/:id/edit" element={<JobFormPage />} />
          </Route>
          <Route element={<FeatureRoute feature="APPLICANTS" />}>
            <Route path="jobs/:id/applicants" element={<ApplicantsPage />} />
            <Route path="applicants" element={<Navigate to="/recruiter/jobs" replace />} />
          </Route>
          <Route element={<FeatureRoute feature="CV_SCREENING" />}>
            <Route path="jobs/:id/cvs" element={<CvScreeningPage />} />
            <Route path="cvs" element={<Navigate to="/recruiter/jobs" replace />} />
          </Route>
          <Route element={<FeatureRoute feature="RANKING" />}>
            <Route path="jobs/:id/rank" element={<RankingPage />} />
            <Route path="rank" element={<Navigate to="/recruiter/jobs" replace />} />
            <Route path="matching" element={<Navigate to="/recruiter/jobs" replace />} />
          </Route>
          <Route element={<FeatureRoute feature="PIPELINE" />}>
            <Route path="jobs/:id/pipeline" element={<PipelinePage />} />
            <Route path="pipeline" element={<Navigate to="/recruiter/jobs" replace />} />
          </Route>
          <Route element={<FeatureRoute feature="ANALYTICS" />}>
            <Route path="jobs/:id/analytics" element={<RecruiterAnalyticsPage />} />
            <Route path="analytics" element={<Navigate to="/recruiter/jobs" replace />} />
          </Route>
          <Route element={<FeatureRoute feature="ASSESSMENTS" />}>
            <Route path="jobs/:id/assessments" element={<RecruiterAssessmentsPage />} />
            <Route path="jobs/:id/assessments/new" element={<AssessmentDetailPage />} />
            <Route path="jobs/:id/assessments/:assessmentId" element={<AssessmentDetailPage />} />
            <Route path="assessments/*" element={<Navigate to="/recruiter/jobs" replace />} />
          </Route>
          <Route element={<FeatureRoute feature="INTERVIEWS" />}>
            <Route path="jobs/:id/interviews" element={<RecruiterInterviewsPage />} />
            <Route path="interviews" element={<Navigate to="/recruiter/jobs" replace />} />
          </Route>
          <Route element={<FeatureRoute feature="SCHEDULES" />}>
            <Route path="jobs/:id/schedules" element={<RecruiterSchedulesPage />} />
            <Route path="schedules" element={<Navigate to="/recruiter/jobs" replace />} />
          </Route>
          <Route element={<FeatureRoute feature="NOTIFICATIONS" />}>
            <Route path="jobs/:id/notifications" element={<RecruiterNotificationsPage />} />
            <Route path="notifications" element={<Navigate to="/recruiter/jobs" replace />} />
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
      </Route>

      <Route element={<MasterRoute />}>
        <Route path="/onboard" element={<TenantOnboardPage />} />
        <Route path="/admin" element={<MasterAdminLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="analytics" element={<MasterAnalyticsPage />} />
          <Route path="leads" element={<LeadsPage />} />
          <Route path="tenants" element={<Navigate to="/admin/tenants/directory" replace />} />
          <Route path="tenants/:section" element={<TenantManagementPage />} />
          <Route path="contracts" element={<ContractsPage />} />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="subscriptions" element={<Navigate to="/admin/subscriptions/overview" replace />} />
          <Route path="subscriptions/:section" element={<BillingPage />} />
          <Route path="system/logs" element={<AuditLogsPage />} />
          <Route path="system/ai-usage" element={<AiManagementPage />} />
          <Route path="system/ai-quotas" element={<AiManagementPage />} />
          <Route path="system/ai-config" element={<AiManagementPage />} />
          <Route path="account/profile" element={<MasterAccountPage activeTab="account-profile" />} />
          <Route path="account/security" element={<MasterAccountPage activeTab="account-security" />} />
          <Route path="account/accessibility" element={<MasterAccountPage activeTab="account-accessibility" />} />
          <Route path="account/notifications" element={<MasterAccountPage activeTab="account-notifications" />} />
        </Route>
      </Route>
      <Route path="/admin/login" element={<MasterLoginPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
