import { useQuery } from "@tanstack/react-query";
import { ArrowRight, BadgeCheck, BriefcaseBusiness, CalendarClock, Settings, ShieldCheck, UserPlus, UserRoundCog, Users } from "lucide-react";
import type { ComponentType } from "react";
import { Link } from "react-router-dom";
import { companyApi } from "@/api/tenant/companyApi";
import { dashboardApi } from "@/api/tenant/dashboardApi";
import { usersApi } from "@/api/tenant/usersApi";
import type { CompanyProfile } from "@/features/tenant/admin/company/types";
import { Card } from "@/components/ux/Card";
import { Skeleton } from "@/components/ux/Skeleton";
import { getApiErrorMessage } from "@/lib/axios";

const shortcuts: Array<{ to: string; label: string; icon: ComponentType<{ className?: string }> }> = [
  { to: "/internal/admin/recruitment", label: "Job và ứng viên", icon: BriefcaseBusiness },
  { to: "/internal/admin/users", label: "Người dùng", icon: Users },
  { to: "/internal/admin/roles", label: "Phân quyền", icon: ShieldCheck },
  { to: "/internal/admin/recruiter-assignments", label: "Phân công", icon: UserRoundCog },
  { to: "/internal/admin/system", label: "Hệ thống", icon: Settings },
];

function countText(loading: boolean, failed: boolean, value: number | undefined) {
  if (loading) return null;
  if (failed || value == null) return "—";
  return value.toLocaleString("vi-VN");
}

function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  loading,
}: {
  label: string;
  value: string | null;
  helper: string;
  icon: ComponentType<{ className?: string }>;
  loading: boolean;
}) {
  return (
    <Card className="min-w-0 p-4 lg:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-[var(--color-text-secondary)]">{label}</p>
          {loading ? (
            <Skeleton className="mt-3 h-8 w-16" />
          ) : (
            <p className="mt-2 font-display text-2xl font-semibold tracking-tight text-[var(--color-text-primary)]">{value}</p>
          )}
        </div>
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--color-primary-soft)] text-brand-primary">
          <Icon className="size-5" aria-hidden="true" />
        </span>
      </div>
      <p className="mt-4 text-xs text-[var(--color-text-secondary)]">{helper}</p>
    </Card>
  );
}

function profileGaps(profile: CompanyProfile) {
  const gaps: Array<{ title: string; detail: string }> = [];
  if (!profile.verified) {
    gaps.push({ title: "Doanh nghiệp chưa xác thực", detail: "Hồ sơ pháp lý chưa được duyệt" });
  }
  if (!profile.description?.trim()) {
    gaps.push({ title: "Thiếu mô tả công ty", detail: "Trang tuyển dụng công khai sẽ trống phần giới thiệu" });
  }
  if (!profile.logoUrl?.trim()) {
    gaps.push({ title: "Thiếu logo", detail: "Thêm URL logo trong hồ sơ công ty" });
  }
  if (!profile.website?.trim()) {
    gaps.push({ title: "Thiếu website", detail: "Ứng viên không có liên kết tới trang công ty" });
  }
  return gaps;
}

export function HomePage() {
  const summary = useQuery({
    queryKey: ["dashboard", "summary"],
    queryFn: () => dashboardApi.summary(),
  });
  const members = useQuery({
    queryKey: ["tenant-users"],
    queryFn: () => usersApi.list(),
  });
  const company = useQuery({
    queryKey: ["tenant", "company", "profile"],
    queryFn: () => companyApi.getProfile(),
  });

  const summaryData = summary.data?.data;
  const memberCount = (members.data?.data ?? []).filter(
    (row) => row.role !== "CANDIDATE" && row.workspace !== "CANDIDATE",
  ).length;
  const profile = company.data?.data;
  const gaps = profile ? profileGaps(profile) : [];
  const summaryError = summary.isError ? getApiErrorMessage(summary.error) : null;
  const membersError = members.isError ? getApiErrorMessage(members.error) : null;

  return (
    <section className="space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-brand-primary">Quản trị doanh nghiệp</p>
          <h1 className="mt-1 font-display text-2xl font-semibold tracking-tight text-[var(--color-text-primary)] sm:text-3xl">
            Tổng quan
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-[var(--color-text-secondary)]">
            Tình trạng workspace, hồ sơ công ty và nhịp tuyển dụng cần xử lý.
          </p>
        </div>
        <Link
          to="/internal/admin/analytics"
          className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-[var(--radius-md)] bg-brand-primary px-4 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-primary-hover"
        >
          Xem phân tích
          <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Thành viên"
          loading={members.isLoading}
          value={countText(members.isLoading, members.isError, members.isSuccess ? memberCount : undefined)}
          helper="Không tính ứng viên"
          icon={Users}
        />
        <MetricCard
          label="Vị trí đang tuyển"
          loading={summary.isLoading}
          value={countText(summary.isLoading, summary.isError, summaryData?.openJobs)}
          helper="Tin đã đăng"
          icon={BriefcaseBusiness}
        />
        <MetricCard
          label="Ứng viên mới"
          loading={summary.isLoading}
          value={countText(summary.isLoading, summary.isError, summaryData?.newApplicants)}
          helper="Trong 30 ngày"
          icon={UserPlus}
        />
        <MetricCard
          label="Phỏng vấn đã lên lịch"
          loading={summary.isLoading}
          value={countText(summary.isLoading, summary.isError, summaryData?.interviewsScheduled)}
          helper="Đã đề xuất hoặc xác nhận"
          icon={CalendarClock}
        />
      </div>
      {(summaryError || membersError) && (
        <p className="text-sm text-status-danger">{summaryError ?? membersError}</p>
      )}

      <div className="grid gap-5 xl:grid-cols-2">
        <Card className="p-0">
          <div className="border-b border-[var(--color-border-default)] px-5 py-4">
            <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">Hồ sơ công ty</h2>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Thông tin hiển thị trên trang tuyển dụng</p>
          </div>
          <div className="space-y-4 p-5">
            {company.isLoading && <Skeleton className="h-16 w-full" />}
            {company.isError && <p className="text-sm text-status-danger">{getApiErrorMessage(company.error)}</p>}
            {profile && (
              <>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-xl font-semibold text-[var(--color-text-primary)]">{profile.companyName}</p>
                    <p className="mt-1 text-sm text-[var(--color-text-secondary)]">{profile.subdomain}</p>
                  </div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-primary-soft)] px-2.5 py-1 text-xs font-semibold text-brand-primary">
                    <BadgeCheck className="size-3.5" aria-hidden="true" />
                    {profile.verified ? "Đã xác thực" : "Chưa xác thực"}
                  </span>
                </div>
                <dl className="grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-[var(--color-text-secondary)]">Lĩnh vực</dt>
                    <dd className="mt-1 font-medium text-[var(--color-text-primary)]">{profile.industry?.trim() || "—"}</dd>
                  </div>
                  <div>
                    <dt className="text-[var(--color-text-secondary)]">Quy mô</dt>
                    <dd className="mt-1 font-medium text-[var(--color-text-primary)]">{profile.companySize?.trim() || "—"}</dd>
                  </div>
                </dl>
                <Link to="/internal/admin/company" className="inline-flex items-center gap-1 text-sm font-semibold text-brand-primary">
                  Cập nhật hồ sơ
                  <ArrowRight className="size-3.5" aria-hidden="true" />
                </Link>
              </>
            )}
          </div>
        </Card>

        <Card className="p-0">
          <div className="border-b border-[var(--color-border-default)] px-5 py-4">
            <h2 className="font-display text-lg font-semibold text-[var(--color-text-primary)]">Cần xử lý</h2>
            <p className="mt-1 text-sm text-[var(--color-text-secondary)]">Những mục còn thiếu trên hồ sơ công ty</p>
          </div>
          <div className="p-5">
            {company.isLoading && <Skeleton className="h-16 w-full" />}
            {profile && gaps.length === 0 && (
              <p className="text-sm text-[var(--color-text-secondary)]">Không có việc cần xử lý.</p>
            )}
            {profile && gaps.length > 0 && (
              <ul className="space-y-2">
                {gaps.map((item) => (
                  <li key={item.title}>
                    <Link
                      to="/internal/admin/company"
                      className="flex items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-border-default)] px-3 py-3 transition-colors hover:bg-[var(--color-primary-subtle)]"
                    >
                      <span>
                        <span className="block text-sm font-semibold text-[var(--color-text-primary)]">{item.title}</span>
                        <span className="mt-0.5 block text-xs text-[var(--color-text-secondary)]">{item.detail}</span>
                      </span>
                      <ArrowRight className="size-4 shrink-0 text-[var(--color-text-secondary)]" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {shortcuts.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.to} to={item.to} className="block">
              <Card className="flex items-center gap-3 p-4 transition-colors hover:bg-[var(--color-primary-subtle)]">
                <span className="grid size-10 place-items-center rounded-xl bg-[var(--color-primary-soft)] text-brand-primary">
                  <Icon className="size-5" aria-hidden="true" />
                </span>
                <span className="text-sm font-semibold text-[var(--color-text-primary)]">{item.label}</span>
              </Card>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
