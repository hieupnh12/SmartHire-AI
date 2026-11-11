import type { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";
import type { PublicSubscriptionPlan } from "@/api/master/checkoutApi";
import { formatNumber, type Locale, useT } from "@/i18n";

const HIGHLIGHT_TOKEN = "__SMARTHIRE_HIGHLIGHT__";

function renderHighlighted(template: string, highlighted: ReactNode) {
  const index = template.indexOf(HIGHLIGHT_TOKEN);
  if (index === -1) return template;
  return (
    <>
      {template.slice(0, index)}
      <strong>{highlighted}</strong>
      {template.slice(index + HIGHLIGHT_TOKEN.length)}
    </>
  );
}

interface PlanFeatureListProps {
  plan: PublicSubscriptionPlan;
  isEnterprise: boolean;
  locale: Locale;
}

/** Shared subscription plan feature bullets with inline bold metric highlights. */
export function PlanFeatureList({ plan, isEnterprise, locale }: PlanFeatureListProps) {
  const t = useT();

  const jobsValue =
    plan.maxJobs > 0 ? formatNumber(plan.maxJobs, undefined, locale) : t("master.landing.plans.unlimited");
  const cvValue =
    plan.maxCvParses > 0 ? formatNumber(plan.maxCvParses, undefined, locale) : t("master.landing.plans.unlimited");
  const aiValue = plan.maxAiInterviewHours
    ? `${formatNumber(plan.maxAiInterviewHours, undefined, locale)}${t("master.landing.plans.hoursSuffix")}`
    : t("master.landing.plans.unlimited");

  return (
    <ul className="space-y-3 text-sm text-slate-600 mb-8">
      <li className="flex items-start gap-2.5">
        <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <span>{t("master.landing.plans.isolatedDbFeature")}</span>
      </li>
      <li className="flex items-start gap-2.5">
        <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <span>{renderHighlighted(t("master.landing.plans.jobsFeature", { count: HIGHLIGHT_TOKEN }), jobsValue)}</span>
      </li>
      <li className="flex items-start gap-2.5">
        <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <span>{renderHighlighted(t("master.landing.plans.cvFeature", { count: HIGHLIGHT_TOKEN }), cvValue)}</span>
      </li>
      <li className="flex items-start gap-2.5">
        <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <span>{renderHighlighted(t("master.landing.plans.aiFeature", { hours: HIGHLIGHT_TOKEN }), aiValue)}</span>
      </li>
      {isEnterprise && (
        <li className="flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
          <span>
            {renderHighlighted(
              t("master.landing.plans.ssoFeature", { tech: HIGHLIGHT_TOKEN }),
              t("master.landing.plans.ssoHighlight"),
            )}
          </span>
        </li>
      )}
    </ul>
  );
}

