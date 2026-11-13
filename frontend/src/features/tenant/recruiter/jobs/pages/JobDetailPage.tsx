import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BriefcaseBusiness, Building2, CalendarDays, ChevronRight, ClipboardCheck, Copy,
  Crown, FileSearch, GraduationCap, MapPin, Pause, Pencil, Play, RotateCcw,
  Settings2, Shield, ShieldCheck, Sparkles, Trash2, UserCheck, Users, XCircle, type LucideIcon,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { ApiResponse } from "@/types/api";
import type { JobDetail } from "@/api/types/job";
import { JobPermissionsModal } from "../components/JobPermissionsModal";
import { jobApi } from "@/api/tenant/jobApi";
import { Button } from "@/components/ux/Button";
import { StatusPill } from "@/components/ux/StatusPill";
import { PageSkeleton } from "@/components/ux/Skeleton";
import { formatDate, useLocale, useT, type Locale, type TranslateFn } from "@/i18n";
import { getApiErrorMessage } from "@/lib/axios";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { useUiStore } from "@/stores/uiStore";
import {
  JOB_ROLE_COLORS, getJobRoleLabel, parseJobRole,
  canEditJob, canPublishJob, canDeleteJob, canManageTeam,
} from "@/features/tenant/recruiter/jobPermissions";
import { formatSalaryRange } from "@/lib/formatSalary";

const EDUCATION_LEVEL_KEY: Record<string, string> = {
  "Trung học phổ thông": "recruiter.ops.educationLevels.highSchool",
  "Cao đẳng": "recruiter.ops.educationLevels.college",
  "Đại học": "recruiter.ops.educationLevels.bachelor",
  "Thạc sĩ": "recruiter.ops.educationLevels.master",
  "Tiến sĩ": "recruiter.ops.educationLevels.doctorate",
};

const card = "rounded-[var(--radius-xl)] border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-6 shadow-[0_12px_30px_rgba(59,130,246,0.05)]";
const statusAction = "w-full justify-start";
const linkBase = "inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-md)] px-4 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-border-focus)]";

function formatJobDate(value: string | null | undefined, locale: Locale, t: TranslateFn) {
  return value
    ? formatDate(value, { day: "2-digit", month: "2-digit", year: "numeric" }, locale)
    : t("recruiter.ops.common.notSet");
}

function translateEnum(t: TranslateFn, prefix: string, value?: string | null, fallbackKey = "recruiter.ops.common.notUpdated") {
  if (!value) return t(fallbackKey);
  const key = `${prefix}.${value}`;
  const label = t(key);
  return label === key ? value : label;
}

export function JobDetailPage() {
  const t = useT();
  const locale = useLocale();
  const { id } = useParams();
  const jobId = id && /^\d+$/.test(id) ? id : undefined;
  const navigate = useNavigate();
  const client = useQueryClient();
  const askConfirm = useUiStore((s) => s.askConfirm);
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "TENANT_ADMIN" || user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
  const [permissionsModalOpen, setPermissionsModalOpen] = useState(false);

  const detail = useQuery({
    queryKey: queryKeys.jobs.detail(jobId ?? 0),
    queryFn: () => jobApi.get(jobId!),
    enabled: Boolean(jobId),
  });
  const refresh = () => void client.invalidateQueries({ queryKey: queryKeys.jobs.detail(id ?? 0) });

  const act = useMutation<
    ApiResponse<JobDetail | null>,
    Error,
    "publish" | "unpublish" | "pause" | "close" | "reopen" | "clone" | "delete"
  >({
    mutationFn: (action) => {
      if (action === "delete") return jobApi.remove(Number(id!));
      return ({ publish: jobApi.publish, unpublish: jobApi.unpublish, pause: jobApi.pause, close: jobApi.close, reopen: jobApi.reopen, clone: jobApi.clone })[action](id!);
    },
    onSuccess: (response, action) => {
      if (action === "clone" && response.data) return navigate(`/recruiter/jobs/${(response.data as JobDetail).id}/edit`);
      if (action === "delete") return navigate("/recruiter");
      refresh();
    },
  });

  const job = detail.data?.data;

  // Derive permissions from job's canEdit/canManage flags, or fallback to currentUserRole
  const role = parseJobRole(job?.currentUserRole);
  const canEdit = job?.canEdit ?? (isAdmin || canEditJob(role));
  const canPublish = job?.canEdit ?? (isAdmin || canPublishJob(role));
  const canDelete = job?.canManagePermissions ?? (isAdmin || canDeleteJob(role));
  const canManage = job?.canManagePermissions ?? (isAdmin || canManageTeam(role));
  const roleLabel = role ? getJobRoleLabel(role, t) : null;
  const roleColor = role ? JOB_ROLE_COLORS[role] : null;

  const confirmDelete = () =>
    askConfirm({
      title: t("recruiter.ops.jobs.detail.confirmArchiveTitle"),
      description: t("recruiter.ops.jobs.detail.confirmArchiveDesc", { title: job?.title ?? "" }),
      danger: true,
      confirmLabel: t("recruiter.ops.jobs.detail.confirmArchiveBtn"),
      onConfirm: async () => { await act.mutateAsync("delete"); },
    });

  if (detail.isPending) return <PageSkeleton variant="detail" />;
  if (detail.isError) return <Alert>{getApiErrorMessage(detail.error)}</Alert>;
  if (!job) return null;

  const educationLabel = job.educationLevel
    ? (EDUCATION_LEVEL_KEY[job.educationLevel] ? t(EDUCATION_LEVEL_KEY[job.educationLevel]) : job.educationLevel)
    : null;

  return (
    <section className="text-[var(--color-on-surface)]">
      <div className="recruiter-job-detail-layout">
        <main className="min-w-0 flex-1 space-y-6">
          <article className={`${card} overflow-hidden p-0`}>
            <div className="px-6 py-6 lg:px-7">
              {/* Status + role badge */}
              <div className="flex flex-wrap items-center gap-2">
                <StatusPill status={job.status} label={t(`recruiter.ops.jobStatuses.${job.status}`)} />
                <span className="text-xs text-[var(--color-on-surface-variant)]">
                  {t("recruiter.ops.jobs.detail.jobIdLabel", { id: job.id })}
                </span>
                {/* Job role badge for the current user */}
                {roleLabel && roleColor && (
                  <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold", roleColor.bg, roleColor.text, roleColor.border)}>
                    {role === "OWNER" ? <Crown className="size-3" aria-hidden="true" /> :
                     role === "HIRING_MANAGER" ? <Shield className="size-3" aria-hidden="true" /> :
                     role === "COLLABORATOR" ? <UserCheck className="size-3" aria-hidden="true" /> : null}
                    {roleLabel}
                  </span>
                )}
                {isAdmin && !role && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-blue-200 bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                    <Settings2 className="size-3" aria-hidden="true" />
                    {t("recruiter.ops.jobs.detail.adminBadge")}
                  </span>
                )}
              </div>

              <h1 className="mt-3 text-2xl font-semibold leading-8 tracking-tight lg:text-[28px] lg:leading-9">{job.title}</h1>
              <p className="mt-3 text-xl font-semibold text-[var(--color-primary)]">
                {job.salaryVisible
                  ? formatSalaryRange(job.salaryMin, job.salaryMax, job.salaryCurrency ?? "VND")
                  : t("recruiter.ops.jobs.detail.salaryHidden")}
              </p>
              <div className="mt-6 grid gap-5 sm:grid-cols-3">
                <HeroFact icon={MapPin} label={t("recruiter.ops.jobs.detail.factLocation")} value={job.location || t("recruiter.ops.common.notUpdated")} />
                <HeroFact
                  icon={BriefcaseBusiness}
                  label={t("recruiter.ops.jobs.detail.factExperience")}
                  value={job.minYearsExperience != null ? t("recruiter.ops.jobs.detail.yearsCount", { count: job.minYearsExperience }) : t("recruiter.ops.common.noRequirement")}
                />
                <HeroFact icon={CalendarDays} label={t("recruiter.ops.jobs.detail.factDeadline")} value={formatJobDate(job.deadline, locale, t)} />
              </div>
              <div className="mt-6 flex gap-3">
                <Link className={`${linkBase} flex-1 bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]`} to={`/recruiter/jobs/${job.id}/applicants`}>
                  <Users className="size-4" aria-hidden="true" />
                  {t("recruiter.ops.jobs.detail.viewApplicantsBtn", { count: job.applicationCount })}
                </Link>
                {canEdit && (
                  <Link className={`${linkBase} border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary-subtle)]`} to={`/recruiter/jobs/${job.id}/edit`}>
                    <Pencil className="size-4" aria-hidden="true" />
                    {t("recruiter.ops.jobs.detail.editJobBtn")}
                  </Link>
                )}
                {canManage && (
                  <button
                    type="button"
                    onClick={() => setPermissionsModalOpen(true)}
                    className={`${linkBase} border border-[var(--color-border-default)] text-[var(--color-on-surface)] hover:bg-[var(--color-surface-container-low)]`}
                    aria-label={t("recruiter.ops.jobs.detail.permissionsAria")}
                  >
                    <ShieldCheck className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
                    {t("recruiter.ops.jobs.detail.permissionsBtn")}
                  </button>
                )}
              </div>
            </div>
          </article>

          {act.isError && <Alert>{getApiErrorMessage(act.error)}</Alert>}

          <article className={`${card} space-y-8`}>
            <section className="border-b border-[var(--color-border-default)] pb-8">
              <Heading>{t("recruiter.ops.jobs.detail.overviewHeading")}</Heading>
              <div className="mt-5 space-y-4 text-sm">
                <Overview label={t("recruiter.ops.jobs.detail.overviewRequirements")}>
                  <Chip>
                    {job.minYearsExperience != null
                      ? t("recruiter.ops.jobs.detail.yearsExperienceChip", { count: job.minYearsExperience })
                      : t("recruiter.ops.jobs.detail.noExpRequired")}
                  </Chip>
                  <Chip>{educationLabel || t("recruiter.ops.jobs.detail.noEduRequired")}</Chip>
                </Overview>
                <Overview label={t("recruiter.ops.jobs.detail.overviewSkills")}>
                  {job.skills.length
                    ? job.skills.map((skill) => (
                        <Chip key={skill.skillId} outline>
                          {skill.name}
                          {skill.required ? t("recruiter.ops.jobs.detail.requiredSkillSuffix") : ""}
                        </Chip>
                      ))
                    : <span className="text-[var(--color-on-surface-variant)]">{t("recruiter.ops.jobs.detail.skillsUnset")}</span>}
                </Overview>
                <Overview label={t("recruiter.ops.jobs.detail.overviewFormat")}>
                  <Chip>{translateEnum(t, "recruiter.ops.employmentTypes", job.employmentType)}</Chip>
                  <Chip>{translateEnum(t, "recruiter.ops.workModes", job.workMode)}</Chip>
                </Overview>
              </div>
            </section>
            <JobText title={t("recruiter.ops.jobs.detail.descriptionHeading")} value={job.description} />
            {job.responsibilities && <JobText title={t("recruiter.ops.jobs.detail.responsibilitiesHeading")} value={job.responsibilities} bullets />}
            {job.benefits && <JobText title={t("recruiter.ops.jobs.detail.benefitsHeading")} value={job.benefits} bullets last />}
          </article>

          {(job.cvScreening || job.gateScreening) && <div className="grid gap-6 lg:grid-cols-2">
            {job.cvScreening && (
              <Weights
                title={t("recruiter.ops.jobs.detail.cvScreeningTitle")}
                rows={[
                  [t("recruiter.ops.jobs.detail.weightRequiredSkills"), job.cvScreening.skillWeight],
                  [t("recruiter.ops.jobs.detail.weightPreferredSkills"), job.cvScreening.preferredWeight],
                  [t("recruiter.ops.jobs.detail.weightExperience"), job.cvScreening.experienceWeight],
                  [t("recruiter.ops.jobs.detail.weightEducation"), job.cvScreening.educationWeight],
                  [t("recruiter.ops.jobs.detail.weightSemantic"), job.cvScreening.semanticWeight],
                ]}
                threshold={job.cvScreening.passThreshold}
              />
            )}
            {job.gateScreening && (
              <Weights
                title={t("recruiter.ops.jobs.detail.gateScreeningTitle")}
                rows={[
                  [t("recruiter.ops.jobs.detail.weightCvScore"), job.gateScreening.cvWeight],
                  [t("recruiter.ops.jobs.detail.weightAiInterview"), job.gateScreening.aiInterviewWeight],
                  [t("recruiter.ops.jobs.detail.weightAssessment"), job.gateScreening.assessmentWeight],
                ]}
                threshold={job.gateScreening.passThreshold}
              />
            )}
          </div>}

        </main>

        <aside className="recruiter-job-detail-sidebar space-y-5">
          {/* Status actions — shown based on role */}
          <div className={card}>
            <h2 className="font-semibold">{t("recruiter.ops.jobs.detail.statusActionsTitle")}</h2>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {canPublish && (job.status === "DRAFT" || job.status === "PAUSED") && <Button size="sm" className={statusAction} disabled={act.isPending} onClick={() => act.mutate("publish")}><Play className="size-4" aria-hidden="true" />{t("recruiter.ops.jobs.detail.actionPublish")}</Button>}
              {canPublish && job.status === "PUBLISHED" && <Button size="sm" variant="secondary" className={statusAction} disabled={act.isPending} onClick={() => act.mutate("pause")}><Pause className="size-4" aria-hidden="true" />{t("recruiter.ops.jobs.detail.actionPause")}</Button>}
              {canPublish && job.status === "PUBLISHED" && <Button size="sm" variant="secondary" className={statusAction} disabled={act.isPending} onClick={() => act.mutate("unpublish")}><RotateCcw className="size-4" aria-hidden="true" />{t("recruiter.ops.jobs.detail.actionUnpublish")}</Button>}
              {canPublish && (job.status === "PUBLISHED" || job.status === "PAUSED") && <Button size="sm" variant="secondary" className={statusAction} disabled={act.isPending} onClick={() => act.mutate("close")}><XCircle className="size-4" aria-hidden="true" />{t("recruiter.ops.jobs.detail.actionClose")}</Button>}
              {canPublish && (job.status === "CLOSED" || job.status === "PAUSED") && <Button size="sm" className={statusAction} disabled={act.isPending} onClick={() => act.mutate("reopen")}><Play className="size-4" aria-hidden="true" />{t("recruiter.ops.jobs.detail.actionReopen")}</Button>}
              <Button size="sm" variant="secondary" className={statusAction} disabled={act.isPending} onClick={() => act.mutate("clone")}><Copy className="size-4" aria-hidden="true" />{t("recruiter.ops.jobs.detail.actionClone")}</Button>
              {canDelete && (
                <Button size="sm" variant="secondary" disabled={act.isPending} onClick={confirmDelete}
                  className={`${statusAction} text-red-600 hover:border-red-200 hover:bg-red-50 hover:text-red-700`}>
                  <Trash2 className="size-4" aria-hidden="true" />{t("recruiter.ops.jobs.detail.actionArchive")}
                </Button>
              )}
            </div>
          </div>

          <div className={card}>
            <h2 className="text-xl font-semibold">{t("recruiter.ops.jobs.detail.generalInfoTitle")}</h2>
            <div className="mt-6 space-y-5">
              <Info icon={Building2} label={t("recruiter.ops.jobs.detail.infoDepartment")} value={job.department || t("recruiter.ops.jobs.detail.infoDepartmentUnset")} />
              <Info icon={GraduationCap} label={t("recruiter.ops.jobs.detail.infoEducation")} value={educationLabel || t("recruiter.ops.common.noRequirement")} />
              <Info icon={Users} label={t("recruiter.ops.jobs.detail.infoHeadcount")} value={job.headcount != null ? t("recruiter.ops.jobs.detail.headcountUnit", { count: job.headcount }) : t("recruiter.ops.common.notSet")} />
              <Info icon={BriefcaseBusiness} label={t("recruiter.ops.jobs.detail.infoWorkMode")} value={translateEnum(t, "recruiter.ops.workModes", job.workMode)} />
              <Info icon={ClipboardCheck} label={t("recruiter.ops.jobs.detail.infoEmploymentType")} value={translateEnum(t, "recruiter.ops.employmentTypes", job.employmentType)} />
            </div>
          </div>

          <div className={card}>
            <h2 className="font-semibold">{t("recruiter.ops.jobs.detail.recruitmentMgmtTitle")}</h2>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Metric label={t("recruiter.ops.jobs.detail.metricApplicants")} value={job.applicationCount} />
              <Metric label={t("recruiter.ops.jobs.detail.metricTarget")} value={job.headcount ?? "—"} />
            </div>
            <dl className="mt-5 space-y-3 border-t border-[var(--color-border-default)] pt-4 text-sm">
              <Row label={t("recruiter.ops.common.assignee")} value={job.ownerName || t("recruiter.ops.common.unassigned")} />
              <Row label={t("recruiter.ops.jobs.detail.rowAccepting")} value={job.acceptingApplications ? t("recruiter.ops.jobs.detail.acceptingOpen") : t("recruiter.ops.jobs.detail.acceptingClosed")} />
              <Row label={t("recruiter.ops.jobs.detail.rowUpdated")} value={formatJobDate(job.updatedAt, locale, t)} />
            </dl>
          </div>

          <div className={card}>
            <h2 className="font-semibold">{t("recruiter.ops.jobs.detail.toolsTitle")}</h2>
            <nav className="mt-3 space-y-1" aria-label={t("recruiter.ops.jobs.detail.toolsAria")}>
              <Tool to={`/recruiter/jobs/${job.id}/applicants?view=board`} icon={ClipboardCheck}>{t("recruiter.ops.jobs.detail.toolPipeline")}</Tool>
              <Tool to={`/recruiter/jobs/${job.id}/rank`} icon={Sparkles}>{t("recruiter.ops.jobs.detail.toolRanking")}</Tool>
              <Tool to={`/recruiter/jobs/${job.id}/cvs`} icon={FileSearch}>{t("recruiter.ops.jobs.detail.toolCvScreening")}</Tool>
            </nav>
          </div>

        </aside>
      </div>

      {job && (
        <JobPermissionsModal
          jobId={job.id}
          jobTitle={job.title}
          isOpen={permissionsModalOpen}
          onClose={() => {
            setPermissionsModalOpen(false);
            refresh();
          }}
        />
      )}
    </section>
  );
}

function Alert({ children }: { children: string }) { return <div role="alert" className="rounded-2xl bg-[var(--color-error-container)] p-4 text-sm text-[var(--color-on-error-container)]">{children}</div>; }
function IconBubble({ icon: Icon }: { icon: LucideIcon }) { return <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--color-surface-container-low)] text-[var(--color-primary)]"><Icon className="size-5" aria-hidden="true" /></span>; }
function HeroFact({ icon, label, value }: { icon: LucideIcon; label: string; value: string }) { return <div className="flex items-center gap-3"><IconBubble icon={icon} /><div><p className="text-sm text-[var(--color-on-surface-variant)]">{label}</p><p className="mt-0.5 text-sm font-semibold">{value}</p></div></div>; }
function Heading({ children }: { children: ReactNode }) { return <h2 className="border-l-[3px] border-[var(--color-primary)] pl-4 text-xl font-semibold">{children}</h2>; }
function Overview({ label, children }: { label: string; children: ReactNode }) { return <div className="grid gap-2 sm:grid-cols-[110px_minmax(0,1fr)]"><span className="pt-1.5 font-medium">{label}:</span><div className="flex flex-wrap gap-2">{children}</div></div>; }
function Chip({ children, outline = false }: { children: ReactNode; outline?: boolean }) { return <span className={outline ? "rounded-full border border-[var(--color-border-default)] px-3 py-1.5" : "rounded-full bg-[var(--color-surface-container-low)] px-3 py-1.5"}>{children}</span>; }
function JobText({ title, value, bullets = false, last = false }: { title: string; value: string; bullets?: boolean; last?: boolean }) {
  const items = value.split(/\r?\n/).map((item) => item.trim().replace(/^(?:[-*•●▪◦]+|\d+[.)])\s*/, "")).filter(Boolean);
  return (
    <section className={last ? "" : "border-b border-[var(--color-border-default)] pb-8"}>
      <Heading>{title}</Heading>
      {bullets ? (
        <ul className="mt-4 space-y-2.5 text-sm leading-7 text-[var(--color-on-surface)]">
          {items.map((item, index) => (
            <li key={`${index}-${item}`} className="flex items-start gap-3">
              <span className="mt-[11px] size-1.5 shrink-0 rounded-full bg-[var(--color-primary)]" aria-hidden="true" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 whitespace-pre-wrap text-sm leading-7 text-[var(--color-on-surface)]">{value}</p>
      )}
    </section>
  );
}
function Info({ icon, label, value }: { icon: LucideIcon; label: string; value: string }) { return <div className="flex items-start gap-3"><IconBubble icon={icon} /><div><p className="text-sm text-[var(--color-on-surface-variant)]">{label}</p><p className="mt-0.5 text-sm font-semibold leading-5">{value}</p></div></div>; }
function Metric({ label, value }: { label: string; value: number | string }) { return <div className="rounded-2xl bg-[var(--color-surface-container-low)] p-3"><p className="text-2xl font-semibold">{value}</p><p className="text-xs text-[var(--color-on-surface-variant)]">{label}</p></div>; }
function Row({ label, value }: { label: string; value: string }) { return <div className="flex justify-between gap-3"><dt className="text-[var(--color-on-surface-variant)]">{label}</dt><dd className="text-right font-medium">{value}</dd></div>; }
function Tool({ to, icon: Icon, children }: { to: string; icon: LucideIcon; children: ReactNode }) { return <Link to={to} className="group flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors hover:bg-[var(--color-primary-subtle)] hover:text-[var(--color-primary)]"><Icon className="size-4" aria-hidden="true" /><span className="flex-1">{children}</span><ChevronRight className="size-4" aria-hidden="true" /></Link>; }
function Weights({ title, rows, threshold }: { title: string; rows: Array<[string, number]>; threshold: number }) {
  const t = useT();
  return <div className={card}><div className="flex items-start gap-3"><IconBubble icon={Sparkles} /><div><h2 className="font-semibold">{title}</h2><p className="text-sm text-[var(--color-on-surface-variant)]">{t("recruiter.ops.jobs.detail.thresholdPass", { threshold })}</p></div></div><div className="mt-5 space-y-3">{rows.map(([label, value]) => <div key={label}><div className="mb-1 flex justify-between text-xs"><span>{label}</span><strong>{value}%</strong></div><div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-container)]"><div className="h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${Math.min(value, 100)}%` }} /></div></div>)}</div></div>;
}
