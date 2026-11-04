import { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getTenantIdFromSubdomain } from "@/lib/tenant";
import { LandingLayout } from "@/features/master/landing/components/LandingLayout";
import { SaasLandingPage } from "@/features/master/landing/pages/SaasLandingPage";
import { TenantCareerPage } from "@/features/tenant/candidate/jobs/pages/TenantCareerPage";
import { TenantNotFoundPage } from "@/features/tenant/candidate/jobs/pages/TenantNotFoundPage";
import { masterAdminApi } from "@/api/master/masterAdminApi";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { authApi } from "@/api/tenant/authApi";
import { workspaceOf } from "@/features/tenant/auth/workspace";

export function RootRouteSwitcher() {
  const tenantId = getTenantIdFromSubdomain();

  const [checking, setChecking] = useState(!!tenantId);
  const [tenantExists, setTenantExists] = useState(true);
  const [checkFailed, setCheckFailed] = useState(false);

  const token = useAuthStore((s) => s.accessToken);
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);

  const meQuery = useQuery({
    queryKey: ["auth", "me", token],
    queryFn: async () => {
      const r = await authApi.me();
      if (!r.success || !r.data) throw new Error(r.message ?? "Auth failed");
      return r.data;
    },
    enabled: Boolean(tenantId) && Boolean(token) && !user,
    staleTime: 60_000,
    retry: false,
  });

  useEffect(() => {
    if (meQuery.data) {
      setUser(meQuery.data);
    }
  }, [meQuery.data, setUser]);

  useEffect(() => {
    if (!tenantId) {
      setChecking(false);
      return;
    }

    masterAdminApi.checkSubdomainExists(tenantId)
      .then((exists) => {
        setCheckFailed(false);
        setTenantExists(exists);
      })
      .catch(() => {
        setCheckFailed(true);
      })
      .finally(() => {
        setChecking(false);
      });
  }, [tenantId]);

  // If accessed on a tenant subdomain (e.g. se36.localhost or se36.smarthire.top)
  if (tenantId) {
    const isAuthPending = Boolean(token) && !user && meQuery.isLoading;

    if (checking || isAuthPending) {
      return (
        <div className="min-h-screen bg-[#f9f9ff] flex items-center justify-center">
          <div className="animate-spin text-slate-400">
            <Loader2 className="w-8 h-8" />
          </div>
        </div>
      );
    }

    if (checkFailed) {
      return (
        <div role="alert" className="min-h-screen bg-[#f9f9ff] flex items-center justify-center px-6 text-center text-sm text-[#64748b]">
          Không thể kết nối để xác thực tenant "{tenantId}". Vui lòng thử tải lại trang.
        </div>
      );
    }

    if (!tenantExists) {
      return <TenantNotFoundPage subdomain={tenantId} />;
    }

    // Role-based redirection for tenant users on root "/"
    const effectiveUser = user ?? meQuery.data ?? null;
    if (effectiveUser) {
      const workspace = workspaceOf(effectiveUser.role, effectiveUser.workspace);
      if (workspace === "RECRUITER") {
        return <Navigate to="/recruiter" replace />;
      }
      if (workspace === "ADMIN") {
        return <Navigate to="/internal/admin" replace />;
      }
    }

    return <TenantCareerPage />;
  }

  // Otherwise, render Landlord SaaS Landing Page wrapped in LandingLayout
  return (
    <LandingLayout>
      <SaasLandingPage />
    </LandingLayout>
  );
}

