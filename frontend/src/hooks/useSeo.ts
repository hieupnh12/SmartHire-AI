import { useEffect } from "react";
import { applyDocumentSeo, type SeoConfig } from "@/lib/seo";

/** Applies document SEO metadata whenever the config changes. Pass null to skip. */
export function useSeo(config: SeoConfig | null): void {
  const serialized = config ? JSON.stringify(config) : null;

  useEffect(() => {
    if (!serialized) return;
    applyDocumentSeo(JSON.parse(serialized) as SeoConfig);
  }, [serialized]);
}

