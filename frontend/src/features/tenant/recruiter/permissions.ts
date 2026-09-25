import { recruiterNav, type RecruiterFeatureCode } from "@/features/tenant/recruiter/nav";

/**
 * Prototype UI for technical test + interview is ready before every tenant role
 * matrix is updated. Keep these visible so recruiters can review the screens;
 * remove once Admin → Roles grants them for all recruiter staff roles.
 */
const PROTOTYPE_NAV_FEATURES: readonly RecruiterFeatureCode[] = [
  "ASSESSMENTS",
  "INTERVIEWS",
];

export function hasRecruiterFeature(
  permissions: string[] | null | undefined,
  code: RecruiterFeatureCode,
) {
  if (permissions == null) return true;
  if (PROTOTYPE_NAV_FEATURES.includes(code)) return true;
  return permissions.includes(code);
}

export function visibleRecruiterNav(permissions?: string[] | null) {
  if (permissions == null) return [...recruiterNav];
  const allowed = new Set(permissions);
  for (const code of PROTOTYPE_NAV_FEATURES) allowed.add(code);
  return recruiterNav.filter((item) => allowed.has(item.featureCode));
}

export function recruiterHomePath(permissions?: string[] | null) {
  const first = visibleRecruiterNav(permissions)[0];
  return first ? `/recruiter${first.to}` : "/recruiter";
}

export function featureForRecruiterPath(pathname: string): RecruiterFeatureCode | null {
  const rest = pathname.replace(/^\/recruiter/, "") || "";
  if (rest === "/matching" || rest.startsWith("/rank") || /^\/jobs\/[^/]+\/rank(?:\/|$)/.test(rest)) return "RANKING";
  const jobFeature = rest.match(/^\/jobs\/[^/]+\/(applicants|cvs|pipeline|analytics|assessments|interviews|schedules|notifications)(?:\/|$)/)?.[1];
  const scopedFeature = jobFeature ? ({ applicants: "APPLICANTS", cvs: "CV_SCREENING", pipeline: "PIPELINE", analytics: "ANALYTICS", assessments: "ASSESSMENTS", interviews: "INTERVIEWS", schedules: "SCHEDULES", notifications: "NOTIFICATIONS" } as const)[jobFeature] : undefined;
  if (scopedFeature) return scopedFeature;
  const match = recruiterNav.find((item) => item.to === rest || (item.to !== "" && rest.startsWith(item.to)));
  return match?.featureCode ?? null;
}

export function isAllowedRecruiterPath(pathname: string, permissions?: string[] | null) {
  if (!pathname.startsWith("/recruiter")) return false;
  const feature = featureForRecruiterPath(pathname);
  if (!feature) return visibleRecruiterNav(permissions).length > 0;
  return hasRecruiterFeature(permissions, feature);
}
