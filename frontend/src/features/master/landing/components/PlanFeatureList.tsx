import type { ReactNode } from "react";
import { CheckCircle2 } from "lucide-react";
import type { PublicSubscriptionPlan } from "@/api/master/checkoutApi";
import { formatNumber, type Locale, useT } from "@/i18n";
import { formatQuotaLimit } from "@/lib/quotaFormatters";

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

  const jobsNode =
    plan.maxJobs != null && plan.maxJobs > 0 ? (
      renderHighlighted(
        t("master.landing.plans.jobsFeature", { count: HIGHLIGHT_TOKEN }),
        formatNumber(plan.maxJobs, undefined, locale),
      )
    ) : (
      <strong>
        {plan.maxJobs === 0
          ? t("master.landing.plans.noJobs")
          : t("master.landing.plans.unlimitedJobs")}
      </strong>
    );

  const cvNode =
    plan.maxCvParses != null && plan.maxCvParses > 0 ? (
      renderHighlighted(
        t("master.landing.plans.cvFeature", { count: HIGHLIGHT_TOKEN }),
        formatNumber(plan.maxCvParses, undefined, locale),
      )
    ) : (
      <strong>
        {plan.maxCvParses === 0
          ? t("master.landing.plans.noCv")
          : t("master.landing.plans.unlimitedCv")}
      </strong>
    );

  const aiNode =
    plan.maxAiInterviewHours != null && plan.maxAiInterviewHours > 0 ? (
      renderHighlighted(
        t("master.landing.plans.aiFeature", { hours: HIGHLIGHT_TOKEN }),
        formatQuotaLimit(
          plan.maxAiInterviewHours,
          t("master.landing.plans.hoursUnit"),
          {
            monthly: true,
            monthlySuffix: t("master.landing.plans.monthlySuffix"),
            locale,
          },
        ),
      )
    ) : (
      <strong>
        {plan.maxAiInterviewHours === 0
          ? t("master.landing.plans.noAi")
          : t("master.landing.plans.unlimitedAi")}
      </strong>
    );

  return (
    <ul className="space-y-3 text-sm text-slate-600 mb-8">
      <li className="flex items-start gap-2.5">
        <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <span>{t("master.landing.plans.isolatedDbFeature")}</span>
      </li>
      <li className="flex items-start gap-2.5">
        <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <span>{jobsNode}</span>
      </li>
      <li className="flex items-start gap-2.5">
        <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <span>{cvNode}</span>
      </li>
      <li className="flex items-start gap-2.5">
        <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
        <span>{aiNode}</span>
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

