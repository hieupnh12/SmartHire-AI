import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { getTenantIdFromSubdomain } from "@/lib/tenant";
import { applyDocumentSeo, getCanonicalOrigin } from "@/lib/seo";
import { resolveRouteSeo } from "@/lib/routeSeo";

/** Applies default route-level SEO metadata and noindex directives on navigation. */
export function RouteSeoManager() {
  const { pathname } = useLocation();
  const tenantId = getTenantIdFromSubdomain();

  useEffect(() => {
    const origin = getCanonicalOrigin();
    const config = resolveRouteSeo(pathname, tenantId, origin);
    if (config) {
      applyDocumentSeo(config);
    }
  }, [pathname, tenantId]);

  return null;
}

