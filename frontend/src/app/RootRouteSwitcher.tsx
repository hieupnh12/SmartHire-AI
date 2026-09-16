import { useState, useEffect } from "react";
import { getTenantIdFromWindow } from "@/lib/tenant";
import { SaasLandingPage } from "@/features/master/landing/pages/SaasLandingPage";
import { TenantCareerPage } from "@/features/tenant/career/pages/TenantCareerPage";
import { TenantNotFoundPage } from "@/features/tenant/career/pages/TenantNotFoundPage";
import { masterAdminApi } from "@/api/master/masterAdminApi";

export function RootRouteSwitcher() {
  const tenantId = getTenantIdFromWindow();

  const [checking, setChecking] = useState(!!tenantId);
  const [tenantExists, setTenantExists] = useState(true);
  const [checkFailed, setCheckFailed] = useState(false);

  useEffect(() => {
    if (!tenantId) {
      setChecking(false);
      return;
    }

    // Default seed tenants like acme or ctya
    if (["acme", "ctya", "vng", "viettel", "fpt"].includes(tenantId.toLowerCase())) {
      setTenantExists(true);
      setChecking(false);
      return;
    }

    masterAdminApi.checkTenantExists(tenantId)
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

  // If accessed on a Tenant subdomain (e.g. acme.localhost, vng.localhost, acme.smarthire.top)
  if (tenantId) {
    if (checking) {
      return (
        <div className="min-h-screen bg-[#f9f9ff] flex items-center justify-center text-xs text-[#64748b] font-mono">
          <span>Đang xác thực Subdomain "{tenantId}" trên Master DB...</span>
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

    return <TenantCareerPage />;
  }

  // Otherwise, render Landlord SaaS Landing Page
  return <SaasLandingPage />;
}
