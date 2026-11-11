import { useEffect } from "react";
import { useI18nStore } from "@/i18n";
import { applyDocumentSeo, type SeoConfig } from "@/lib/seo";

/** Applies document SEO metadata whenever the config or active locale changes. Pass null to skip. */
export function useSeo(config: SeoConfig | null): void {
  const locale = useI18nStore((s) => s.locale);
  const serialized = config ? JSON.stringify(config) : null;

  useEffect(() => {
    if (!serialized) return;
    applyDocumentSeo(JSON.parse(serialized) as SeoConfig);
  }, [serialized, locale]);
}
