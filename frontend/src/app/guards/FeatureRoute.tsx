import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { workspaceOf } from "@/features/tenant/auth/workspace";
import type { RecruiterFeatureCode } from "@/features/tenant/recruiter/nav";
import {
  hasRecruiterFeature,
  recruiterHomePath,
  visibleRecruiterNav,
} from "@/features/tenant/recruiter/permissions";

type Props = {
  feature: RecruiterFeatureCode;
};

export function FeatureRoute({ feature }: Props) {
  const user = useAuthStore((s) => s.user);
  const location = useLocation();

  if (!user || workspaceOf(user.role, user.workspace) !== "RECRUITER") {
    return <Outlet />;
  }
  if (hasRecruiterFeature(user.permissions, feature)) {
    return <Outlet />;
  }

  const allowed = visibleRecruiterNav(user.permissions);
  if (allowed.length > 0) {
    const home = recruiterHomePath(user.permissions);
    if (location.pathname !== home) {
      return <Navigate to={home} replace />;
    }
  }

  return (
    <section className="space-y-2">
      <h1 className="font-display text-3xl font-bold text-[var(--color-text-primary)]">
        Không có quyền truy cập
      </h1>
      <p className="max-w-2xl text-[var(--color-text-secondary)]">
        Chức năng này chưa được company admin phân cho vai trò của bạn.
      </p>
    </section>
  );
}
