import { createPortal } from "react-dom";
import { Check } from "lucide-react";
import { DetailDialog } from "@/components/ux/DetailDialog";
import { cvStyles, cvTemplates } from "@/features/tenant/candidate/shared/constants/cvTemplates";
import { CvPreview } from "../../pages/CvTemplatesPage";

/** Switching template only changes `templateId`; the CV content stays untouched. */
export function TemplatePickerDialog({ templateId, onSelect, onClose }: { templateId: string; onSelect: (templateId: string) => void; onClose: () => void }) {
  return createPortal(
    <div className="cv-print-hidden">
      <DetailDialog open title="Đổi mẫu CV" onClose={onClose}>
        <p className="mb-4 text-sm text-slate-600">Nội dung CV được giữ nguyên, chỉ thay đổi bố cục hiển thị.</p>
        <ul className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          {cvTemplates.map((item) => {
            const active = item.id === templateId;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  aria-pressed={active}
                  onClick={() => { onSelect(item.id); onClose(); }}
                  className={`group relative w-full overflow-hidden rounded-xl border-2 bg-slate-50 p-3 text-left transition-colors ${active ? "border-[var(--color-primary)]" : "border-transparent hover:border-[color-mix(in_srgb,var(--color-primary)_45%,white)]"}`}
                >
                  <CvPreview layout={item.layout} role={item.roles[0] ?? "backend"} />
                  <span className="mt-2 flex items-center justify-between gap-2 text-sm font-semibold text-slate-800">
                    {item.name}
                    <span className="text-xs font-medium text-slate-500">{cvStyles[item.style].label}</span>
                  </span>
                  {active && <span className="absolute right-2 top-2 grid size-6 place-items-center rounded-full bg-[var(--color-primary)] text-white"><Check className="size-3.5" aria-hidden="true" /></span>}
                </button>
              </li>
            );
          })}
        </ul>
      </DetailDialog>
    </div>,
    document.body,
  );
}
