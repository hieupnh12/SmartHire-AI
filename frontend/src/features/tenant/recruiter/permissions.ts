import { recruiterNav, type RecruiterFeatureCode } from "@/features/tenant/recruiter/nav";

export function hasRecruiterFeature(
  permissions: string[] | null | undefined,
  code: RecruiterFeatureCode,
) {
  if (permissions == null) return true;
  return permissions.includes(code);
}

export function visibleRecruiterNav(permissions?: string[] | null) {
  if (permissions == null) return [...recruiterNav];
  const allowed = new Set(permissions);
  return recruiterNav.filter((item) => allowed.has(item.featureCode));
}

export function recruiterHomePath(permissions?: string[] | null) {
  const first = visibleRecruiterNav(permissions)[0];
  return first ? `/recruiter${first.to}` : "/recruiter";
}

export function featureForRecruiterPath(pathname: string): RecruiterFeatureCode | null {
  const rest = pathname.replace(/^\/recruiter/, "") || "";
  if (rest === "/matching" || rest.startsWith("/rank")) return "RANKING";
  const match = recruiterNav.find((item) => item.to === rest || (item.to !== "" && rest.startsWith(item.to)));
  return match?.featureCode ?? null;
}

export function isAllowedRecruiterPath(pathname: string, permissions?: string[] | null) {
  if (!pathname.startsWith("/recruiter")) return false;
  const feature = featureForRecruiterPath(pathname);
  if (!feature) return visibleRecruiterNav(permissions).length > 0;
  return hasRecruiterFeature(permissions, feature);
}
