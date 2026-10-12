import { FileText, Trash2 } from "lucide-react";
import type { CvSummary } from "@/api/types/cv";
import { Skeleton } from "@/components/ux/Skeleton";
import { CvStatusBadge } from "./CvStatusBadge";

export function CvList({ rows, loading, selectedId, onSelect, onDelete }: {
  rows: CvSummary[];
  loading: boolean;
  selectedId: number | null;
  onSelect: (id: number) => void;
  onDelete: (row: CvSummary) => void;
}) {
  if (loading) {
    return <div className="space-y-2" role="status" aria-label="Đang tải danh sách CV">{Array.from({ length: 3 }, (_, index) => <Skeleton key={index} className="h-[68px] w-full rounded-xl" />)}</div>;
  }
  if (rows.length === 0) {
    return <p className="rounded-xl bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">Bạn chưa tải CV nào.</p>;
  }
  return (
    <ul className="space-y-2">
      {rows.map((row) => {
        const active = row.id === selectedId;
        return (
          <li key={row.id} className={`group relative flex items-center gap-3 rounded-xl border p-3 transition-colors ${active ? "border-[var(--color-primary)] bg-[color-mix(in_srgb,var(--color-primary)_6%,white)]" : "border-slate-200 bg-white hover:border-slate-300"}`}>
            <span className={`grid size-10 shrink-0 place-items-center rounded-lg ${active ? "bg-[var(--color-primary)] text-white" : "bg-slate-100 text-slate-500"}`}><FileText className="size-5" aria-hidden="true" /></span>
            <button type="button" aria-current={active ? "true" : undefined} onClick={() => onSelect(row.id)} className="min-w-0 flex-1 text-left after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none focus-visible:after:outline focus-visible:after:outline-2 focus-visible:after:outline-[var(--color-primary)]">
              <span className="block truncate text-sm font-semibold text-slate-800" title={row.originalFilename}>{row.originalFilename}</span>
              <span className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500"><CvStatusBadge status={row.status} />{new Date(row.createdAt).toLocaleDateString("vi-VN")}</span>
            </button>
            <button type="button" aria-label={`Xóa ${row.originalFilename}`} onClick={() => onDelete(row)} className="relative z-10 grid size-9 shrink-0 place-items-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-red-500">
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
