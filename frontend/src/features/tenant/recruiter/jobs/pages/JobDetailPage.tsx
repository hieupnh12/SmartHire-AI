import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReactNode } from "react";
import {
  BriefcaseBusiness, Building2, CalendarDays, ChevronRight, ClipboardCheck, Copy,
  FileSearch, GraduationCap, MapPin, Pause, Pencil, Play, RotateCcw,
  Sparkles, Users, XCircle, type LucideIcon,
} from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { JobStatus } from "@/api/types/job";
import { jobApi } from "@/api/tenant/jobApi";
import { Button } from "@/components/ux/Button";
import { StatusPill } from "@/components/ux/StatusPill";
import { getApiErrorMessage } from "@/lib/axios";
import { queryKeys } from "@/lib/query-keys";

const STATUS_LABEL: Record<JobStatus, string> = { DRAFT: "Bản nháp", PUBLISHED: "Đang tuyển", PAUSED: "Tạm dừng", CLOSED: "Đã đóng", ARCHIVED: "Lưu trữ" };
const EMPLOYMENT: Record<string, string> = { FULL_TIME: "Toàn thời gian", PART_TIME: "Bán thời gian", CONTRACT: "Hợp đồng", INTERNSHIP: "Thực tập" };
const WORK_MODE: Record<string, string> = { ONSITE: "Tại văn phòng", HYBRID: "Linh hoạt", REMOTE: "Từ xa" };
const card = "rounded-[var(--radius-xl)] border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-6 shadow-[0_12px_30px_rgba(59,130,246,0.05)]";
const linkBase = "inline-flex min-h-11 items-center justify-center gap-2 rounded-[var(--radius-md)] px-4 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-border-focus)]";

function date(value?: string | null) {
  return value ? new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(value)) : "Chưa đặt";
}

function salary(min?: number | null, max?: number | null, currency = "VND") {
  if (min == null && max == null) return "Thỏa thuận";
  const f = new Intl.NumberFormat("vi-VN", { style: "currency", currency, maximumFractionDigits: 0 });
  if (min != null && max != null) return `${f.format(min)} – ${f.format(max)}`;
  return min != null ? `Từ ${f.format(min)}` : `Đến ${f.format(max!)}`;
}

export function JobDetailPage() {
  const { id } = useParams();
  const jobId = id && /^\d+$/.test(id) ? id : undefined;
  const navigate = useNavigate();
  const client = useQueryClient();
  const detail = useQuery({ queryKey: queryKeys.jobs.detail(jobId ?? 0), queryFn: () => jobApi.get(jobId!), enabled: Boolean(jobId) });
  const refresh = () => void client.invalidateQueries({ queryKey: queryKeys.jobs.detail(id ?? 0) });
  const act = useMutation({
    mutationFn: (action: "publish" | "unpublish" | "pause" | "close" | "reopen" | "clone") => ({ publish: jobApi.publish, unpublish: jobApi.unpublish, pause: jobApi.pause, close: jobApi.close, reopen: jobApi.reopen, clone: jobApi.clone })[action](id!),
    onSuccess: (response, action) => action === "clone" ? navigate(`/recruiter/jobs/${response.data.id}/edit`) : refresh(),
  });
  const job = detail.data?.data;

  if (detail.isPending) return <p className="py-12 text-center text-sm text-[var(--color-on-surface-variant)]">Đang tải thông tin việc làm…</p>;
  if (detail.isError) return <Alert>{getApiErrorMessage(detail.error)}</Alert>;
  if (!job) return null;

  return (
    <section className="text-[var(--color-on-surface)]">
      <div className="recruiter-job-detail-layout">
        <main className="min-w-0 flex-1 space-y-6">
          <article className={`${card} overflow-hidden p-0`}>
            <div className="px-6 py-6 lg:px-7">
              <div className="flex flex-wrap items-center gap-2"><StatusPill status={job.status} label={STATUS_LABEL[job.status]} /><span className="text-xs text-[var(--color-on-surface-variant)]">Mã vị trí #{job.id}</span></div>
              <h1 className="mt-3 text-2xl font-semibold leading-8 tracking-tight lg:text-[28px] lg:leading-9">{job.title}</h1>
              <p className="mt-3 text-xl font-semibold text-[var(--color-primary)]">{job.salaryVisible ? salary(job.salaryMin, job.salaryMax, job.salaryCurrency ?? "VND") : "Mức lương không công khai"}</p>
              <div className="mt-6 grid gap-5 sm:grid-cols-3">
                <HeroFact icon={MapPin} label="Địa điểm" value={job.location || "Chưa cập nhật"} />
                <HeroFact icon={BriefcaseBusiness} label="Kinh nghiệm" value={job.minYearsExperience != null ? `${job.minYearsExperience} năm` : "Không yêu cầu"} />
                <HeroFact icon={CalendarDays} label="Hạn ứng tuyển" value={date(job.deadline)} />
              </div>
              <div className="mt-6 flex gap-3">
                <Link className={`${linkBase} flex-1 bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)]`} to={`/recruiter/jobs/${job.id}/applicants`}><Users className="size-4" aria-hidden="true" />Xem ứng viên ({job.applicationCount})</Link>
                <Link className={`${linkBase} border border-[var(--color-primary)] text-[var(--color-primary)] hover:bg-[var(--color-primary-subtle)]`} to={`/recruiter/jobs/${job.id}/edit`}><Pencil className="size-4" aria-hidden="true" />Sửa tin</Link>
              </div>
            </div>
          </article>

          {act.isError && <Alert>{getApiErrorMessage(act.error)}</Alert>}

          <article className={`${card} space-y-8`}>
            <section className="border-b border-[var(--color-border-default)] pb-8">
              <Heading>Tổng quan</Heading>
              <div className="mt-5 space-y-4 text-sm">
                <Overview label="Yêu cầu"><Chip>{job.minYearsExperience != null ? `${job.minYearsExperience} năm kinh nghiệm` : "Không yêu cầu kinh nghiệm"}</Chip><Chip>{job.educationLevel || "Không yêu cầu học vấn"}</Chip></Overview>
                <Overview label="Kỹ năng">{job.skills.length ? job.skills.map((skill) => <Chip key={skill.skillId} outline>{skill.name}{skill.required ? " · Bắt buộc" : ""}</Chip>) : <span className="text-[var(--color-on-surface-variant)]">Chưa thiết lập</span>}</Overview>
                <Overview label="Hình thức"><Chip>{EMPLOYMENT[job.employmentType ?? ""] || job.employmentType || "Chưa cập nhật"}</Chip><Chip>{WORK_MODE[job.workMode ?? ""] || job.workMode || "Chưa cập nhật"}</Chip></Overview>
              </div>
            </section>
            <JobText title="Mô tả công việc" value={job.description} />
            {job.responsibilities && <JobText title="Trách nhiệm" value={job.responsibilities} bullets />}
            {job.benefits && <JobText title="Quyền lợi" value={job.benefits} bullets last />}
          </article>

          {(job.cvScreening || job.gateScreening) && <div className="grid gap-6 lg:grid-cols-2">
            {job.cvScreening && <Weights title="Sàng lọc CV" rows={[["Kỹ năng bắt buộc", job.cvScreening.skillWeight], ["Kỹ năng ưu tiên", job.cvScreening.preferredWeight], ["Kinh nghiệm", job.cvScreening.experienceWeight], ["Học vấn", job.cvScreening.educationWeight], ["Ngữ nghĩa AI", job.cvScreening.semanticWeight]]} threshold={job.cvScreening.passThreshold} />}
            {job.gateScreening && <Weights title="Đánh giá tổng hợp" rows={[["Điểm CV", job.gateScreening.cvWeight], ["Phỏng vấn AI", job.gateScreening.aiInterviewWeight], ["Bài đánh giá", job.gateScreening.assessmentWeight]]} threshold={job.gateScreening.passThreshold} />}
          </div>}

        </main>

        <aside className="recruiter-job-detail-sidebar space-y-5">
          <div className={card}>
            <h2 className="font-semibold">Trạng thái tin tuyển dụng</h2>
            <div className="mt-4 flex flex-wrap gap-2">
              {(job.status === "DRAFT" || job.status === "PAUSED") && <Button size="sm" disabled={act.isPending} onClick={() => act.mutate("publish")}><Play className="size-4" aria-hidden="true" />Đăng tuyển</Button>}
              {job.status === "PUBLISHED" && <Button size="sm" variant="secondary" disabled={act.isPending} onClick={() => act.mutate("pause")}><Pause className="size-4" aria-hidden="true" />Tạm dừng</Button>}
              {job.status === "PUBLISHED" && <Button size="sm" variant="ghost" disabled={act.isPending} onClick={() => act.mutate("unpublish")}><RotateCcw className="size-4" aria-hidden="true" />Về bản nháp</Button>}
              {(job.status === "PUBLISHED" || job.status === "PAUSED") && <Button size="sm" variant="ghost" disabled={act.isPending} onClick={() => act.mutate("close")}><XCircle className="size-4" aria-hidden="true" />Đóng tin</Button>}
              {(job.status === "CLOSED" || job.status === "PAUSED") && <Button size="sm" disabled={act.isPending} onClick={() => act.mutate("reopen")}><Play className="size-4" aria-hidden="true" />Mở lại</Button>}
              <Button size="sm" variant="ghost" disabled={act.isPending} onClick={() => act.mutate("clone")}><Copy className="size-4" aria-hidden="true" />Nhân bản</Button>
            </div>
          </div>

          <div className={card}>
            <h2 className="text-xl font-semibold">Thông tin chung</h2>
            <div className="mt-6 space-y-5">
              <Info icon={Building2} label="Bộ phận" value={job.department || "Chưa phân bộ phận"} />
              <Info icon={GraduationCap} label="Học vấn" value={job.educationLevel || "Không yêu cầu"} />
              <Info icon={Users} label="Số lượng tuyển" value={job.headcount != null ? `${job.headcount} người` : "Chưa đặt"} />
              <Info icon={BriefcaseBusiness} label="Hình thức làm việc" value={WORK_MODE[job.workMode ?? ""] || job.workMode || "Chưa cập nhật"} />
              <Info icon={ClipboardCheck} label="Loại hình công việc" value={EMPLOYMENT[job.employmentType ?? ""] || job.employmentType || "Chưa cập nhật"} />
            </div>
          </div>

          <div className={card}>
            <h2 className="font-semibold">Quản lý tuyển dụng</h2>
            <div className="mt-4 grid grid-cols-2 gap-3"><Metric label="Ứng viên" value={job.applicationCount} /><Metric label="Chỉ tiêu" value={job.headcount ?? "—"} /></div>
            <dl className="mt-5 space-y-3 border-t border-[var(--color-border-default)] pt-4 text-sm"><Row label="Phụ trách" value={job.ownerName || "Chưa phân công"} /><Row label="Nhận hồ sơ" value={job.acceptingApplications ? "Đang mở" : "Đã dừng"} /><Row label="Cập nhật" value={date(job.updatedAt)} /></dl>
          </div>

          <div className={card}>
            <h2 className="font-semibold">Công cụ tuyển dụng</h2>
            <nav className="mt-3 space-y-1" aria-label="Công cụ của vị trí"><Tool to={`/recruiter/jobs/${job.id}/applicants?view=board`} icon={ClipboardCheck}>Bảng quy trình</Tool><Tool to={`/recruiter/jobs/${job.id}/rank`} icon={Sparkles}>Xếp hạng ứng viên</Tool><Tool to={`/recruiter/jobs/${job.id}/cvs`} icon={FileSearch}>Sàng lọc CV</Tool></nav>
          </div>

        </aside>
      </div>
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
function Weights({ title, rows, threshold }: { title: string; rows: Array<[string, number]>; threshold: number }) { return <div className={card}><div className="flex items-start gap-3"><IconBubble icon={Sparkles} /><div><h2 className="font-semibold">{title}</h2><p className="text-sm text-[var(--color-on-surface-variant)]">Ngưỡng đạt {threshold} điểm</p></div></div><div className="mt-5 space-y-3">{rows.map(([label, value]) => <div key={label}><div className="mb-1 flex justify-between text-xs"><span>{label}</span><strong>{value}%</strong></div><div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-surface-container)]"><div className="h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${Math.min(value, 100)}%` }} /></div></div>)}</div></div>; }
