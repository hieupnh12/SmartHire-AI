import { Navigate, Route, Routes } from "react-router-dom";
import { RootRouteSwitcher } from "@/app/RootRouteSwitcher";
import { TenantOnboardPage } from "@/features/master/landing/pages/TenantOnboardPage";
import { LoginPage } from "@/features/tenant/auth/pages/LoginPage";
import { CandidateLoginPage } from "@/features/tenant/auth/pages/CandidateLoginPage";
import { MasterLoginPage } from "@/features/master/admin/pages/MasterLoginPage";
import { MasterAdminDashboardPage } from "@/features/master/admin/pages/MasterAdminDashboardPage";
import { TenantCareerPage } from "@/features/tenant/career/pages/TenantCareerPage";
import { TenantAdminDashboardPage } from "@/features/tenant/dashboard/pages/TenantAdminDashboardPage";

export function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<RootRouteSwitcher />} />
      <Route path="/career" element={<TenantCareerPage />} />
      <Route path="/jobs" element={<TenantCareerPage />} />
      <Route path="/candidate/login" element={<CandidateLoginPage />} />
      <Route path="/internal/login" element={<LoginPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/recruiter" element={<TenantAdminDashboardPage />} />
      <Route path="/tenant/admin" element={<TenantAdminDashboardPage />} />
      <Route path="/company/workspace" element={<TenantAdminDashboardPage />} />
      <Route path="/onboard" element={<TenantOnboardPage />} />
      <Route path="/admin/login" element={<MasterLoginPage />} />
      <Route path="/admin" element={<MasterAdminDashboardPage />} />
      <Route path="/admin/dashboard" element={<MasterAdminDashboardPage />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
