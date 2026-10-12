import type { ElementType } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, BriefcaseBusiness, FileText, GraduationCap, Loader2, Mail, PencilLine, RefreshCw, Sparkles, Trash2, UserRound } from "lucide-react";
import type { CvDetail } from "@/api/types/cv";
import { CvFilePreview } from "@/components/shared/CvFilePreview";
import { cvStatusMeta } from "../constants/cvStatus";
import { CvStatusBadge } from "./CvStatusBadge";

export function CvDetailPanel({ cv, parsePending, deletePending, error, onParse, onDelete, editHref, editLabel = "Chỉnh sửa" }: {
  cv: CvDetail;
  parsePending: boolean;
  deletePending: boolean;
  error: string | null;
  onParse: () => void;
  onDelete: () => void;
  editHref?: string;
  editLabel?: string;
}) {
  const tone = cvStatusMeta[cv.status].tone;
  const canParse = cv.status === "UPLOADED" || cv.status === "FAILED" || cv.status === "ANALYZED";
  const parseLabel = parsePending ? "Đang phân tích…" : cv.status === "ANALYZED" ? "Phân tích lại" : "Phân tích CV";

  return (
    <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <header className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 p-5">
        <div className="flex min-w-0 items-start gap-3">
          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[color-mix(in_srgb,var(--color-primary)_12%,white)] text-[var(--color-primary)]"><FileText className="size-5" aria-hidden="true" /></span>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-slate-900" title={cv.originalFilename}>{cv.originalFilename}</h2>
            <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
              <CvStatusBadge status={cv.status} />
              <span>Tải lên {new Date(cv.createdAt).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}</span>
              {cv.fileSize != null && <span>· {formatSize(cv.fileSize)}</span>}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {canParse && (
            <button type="button" onClick={onParse} disabled={parsePending || deletePending} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-primary-hover)] disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]">
              {parsePending ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <RefreshCw className="size-4" aria-hidden="true" />}{parseLabel}
            </button>
          )}
          {editHref && (
            <Link to={editHref} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-700 transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]">
              <PencilLine className="size-4" aria-hidden="true" />{editLabel}
            </Link>
          )}
          <button type="button" onClick={onDelete} disabled={deletePending} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-4 text-sm font-semibold text-slate-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700 disabled:opacity-60 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500">
            <Trash2 className="size-4" aria-hidden="true" />{deletePending ? "Đang xóa…" : "Xóa CV"}
          </button>
        </div>
      </header>

      {tone === "processing" && <Banner icon={Loader2} spin className="bg-amber-50 text-amber-800">Hệ thống đang xử lý CV. Thông tin sẽ tự cập nhật khi hoàn tất.</Banner>}
      {tone === "danger" && <Banner icon={AlertTriangle} className="bg-red-50 text-red-700">{cv.errorMessage || "Không phân tích được CV. Hãy thử phân tích lại hoặc tải file khác."}</Banner>}
      {error && <Banner icon={AlertTriangle} className="bg-red-50 text-red-700" role="alert">{error}</Banner>}

      <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section aria-label="Xem trước file CV">
          <CvFilePreview cvId={cv.id} mimeType={cv.mimeType} filename={cv.originalFilename} />
        </section>
        <aside className="space-y-4">
          <ExtractionCard cv={cv} />
          {cv.analysis?.summary && (
            <section className="rounded-xl border border-slate-200 p-4">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900"><Sparkles className="size-4 text-[var(--color-primary)]" aria-hidden="true" />Tóm tắt từ AI</h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">{cv.analysis.summary}</p>
            </section>
          )}
          {cv.skills.length > 0 && (
            <section className="rounded-xl border border-slate-200 p-4">
              <h3 className="text-sm font-semibold text-slate-900">Kỹ năng nhận diện <span className="font-normal text-slate-500">({cv.skills.length})</span></h3>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {cv.skills.map((skill) => <span key={skill.canonicalName} className="rounded-full bg-[color-mix(in_srgb,var(--color-primary)_10%,white)] px-2.5 py-1 text-xs font-medium text-[var(--color-primary)]">{skill.skillName}</span>)}
              </div>
            </section>
          )}
        </aside>
      </div>
    </article>
  );
}

function ExtractionCard({ cv }: { cv: CvDetail }) {
  const extraction = cv.extraction;
  const facts: Array<{ icon: ElementType; label: string; value: string | null }> = [
    { icon: UserRound, label: "Họ tên", value: text(extraction?.fullName ?? extraction?.name) },
    { icon: Mail, label: "Email", value: text(extraction?.email) },
    { icon: GraduationCap, label: "Học vấn", value: text(extraction?.education ?? extraction?.educationLevel) },
    { icon: BriefcaseBusiness, label: "Kinh nghiệm", value: cv.analysis?.yearsExperience != null ? `${cv.analysis.yearsExperience} năm` : null },
  ];
  const known = facts.filter((fact) => fact.value);
  return (
    <section className="rounded-xl border border-slate-200 p-4">
      <h3 className="text-sm font-semibold text-slate-900">Thông tin trích xuất</h3>
      {known.length === 0 ? (
        <p className="mt-2 text-sm text-slate-500">Chưa có thông tin. Bấm “Phân tích CV” để hệ thống đọc nội dung file.</p>
      ) : (
        <dl className="mt-3 space-y-3">
          {known.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex gap-3">
              <Icon className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden="true" />
              <div className="min-w-0"><dt className="text-xs text-slate-500">{label}</dt><dd className="break-words text-sm font-medium text-slate-800">{value}</dd></div>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}

function Banner({ icon: Icon, spin, className, role, children }: { icon: ElementType; spin?: boolean; className: string; role?: string; children: React.ReactNode }) {
  return <p role={role} className={`flex items-start gap-2 px-5 py-3 text-sm ${className}`}><Icon className={`mt-0.5 size-4 shrink-0 ${spin ? "animate-spin" : ""}`} aria-hidden="true" />{children}</p>;
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
