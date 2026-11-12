import { useQuery } from "@tanstack/react-query";
import { Outlet } from "react-router-dom";
import { landingApi } from "@/api/tenant/landingApi";
import { getTenantIdFromWindow } from "@/lib/tenant";
import { getLandingThemeStyle, getTenantTheme } from "@/lib/tenantTheme";
import { CareerHeader } from "./CareerHeader";

export function CareerNavigationLayout() {
  const tenantCode = getTenantIdFromWindow() || "acme";
  const theme = getTenantTheme(tenantCode);
  const landing = useQuery({
    queryKey: ["public-landing", tenantCode],
    queryFn: () => landingApi.getPublicLanding(),
    staleTime: 0,
    refetchOnMount: "always",
  });
  const customLanding = landing.data?.data;
  const primaryColor = customLanding?.theme?.primaryColor || theme.primary;
  const dynamicThemeStyle = getLandingThemeStyle(theme, customLanding);

  return (
    <div
      className="career-page tenant-workspace-theme flex min-h-screen flex-col bg-[var(--color-surface-alt)] font-sans text-[var(--color-on-surface)] antialiased"
      style={dynamicThemeStyle}
    >
      <CareerHeader
        tenantName={theme.name}
        tenantCode={theme.code}
        logoUrl={customLanding?.header?.logoImageUrl}
        slogan={customLanding?.header?.slogan}
        primaryColor={primaryColor}
      />
      <main id="main-content" className="relative z-10">
        <div className="mx-auto max-w-[1440px] px-4 py-6 sm:px-6 sm:py-8 lg:px-10"><Outlet /></div>
      </main>
    </div>
  );
}
