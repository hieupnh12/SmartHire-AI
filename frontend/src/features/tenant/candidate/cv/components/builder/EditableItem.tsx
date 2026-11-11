import { useRef, useState } from "react";
import { ChevronDown, ChevronUp, Copy, GripVertical, Plus, Sparkles, Trash2, X, type LucideIcon } from "lucide-react";
import type { CvBuilderItem, CvBuilderItemRow, CvLanguage, CvSectionType } from "@/api/types/cv";
import { useT } from "@/i18n";
import { useCvBuilderStore } from "../../stores/useCvBuilderStore";
import { cvDocByLanguage, ratedSectionTypes } from "../../utils/createDefaultCv";
import { MAX_ITEM_ROWS, itemRows, rowsToDescription } from "../../utils/itemRows";
import { EditableText } from "./EditableText";
import { RichTextEditable } from "./RichTextEditable";
import { ControlButton } from "./ControlButton";
import { LevelDots } from "./LevelDots";
import { SkillLevel } from "./SkillLevel";
import { dropIndicatorClass, itemDragType, startDrag, useDropTarget } from "./useDropTarget";
import { AiSuggestDialog } from "./AiSuggestDialog";

const aiSectionTypes = new Set<CvSectionType>(["experience", "projects", "education", "activities", "awards", "custom"]);

type Placeholders = { title: string; subtitle: string; date: string; description: string };

const sectionFieldConfig: Record<CvSectionType, { hasSubtitle: boolean; hasDate: boolean; hasDescription: boolean }> = {
  experience: { hasSubtitle: true, hasDate: true, hasDescription: true },
  education: { hasSubtitle: true, hasDate: true, hasDescription: true },
  projects: { hasSubtitle: true, hasDate: true, hasDescription: true },
  skills: { hasSubtitle: true, hasDate: false, hasDescription: true },
  languages: { hasSubtitle: true, hasDate: false, hasDescription: false },
  certifications: { hasSubtitle: true, hasDate: true, hasDescription: false },
  awards: { hasSubtitle: true, hasDate: true, hasDescription: true },
  activities: { hasSubtitle: true, hasDate: true, hasDescription: true },
  interests: { hasSubtitle: false, hasDate: false, hasDescription: false },
  references: { hasSubtitle: true, hasDate: false, hasDescription: true },
  custom: { hasSubtitle: true, hasDate: true, hasDescription: true },
};

/** Keeps focus inside the item so the focus-within controls don't vanish before the click lands. */
const keepFocus = (event: React.MouseEvent) => event.preventDefault();

function GutterButton({ label, icon: Icon, onClick, disabled = false, variant = "move", className = "grid" }: { label: string; icon: LucideIcon; onClick: () => void; disabled?: boolean; variant?: "move" | "add"; className?: string }) {
  const tone = variant === "add"
    ? "border border-[var(--color-primary)] bg-white text-[var(--color-primary)] hover:bg-[var(--color-primary)] hover:text-white"
    : "bg-slate-400 text-white hover:bg-[var(--color-primary)] disabled:hover:bg-slate-400";
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      disabled={disabled}
      onMouseDown={keepFocus}
      onClick={onClick}
      className={`size-6 place-items-center rounded-full shadow-sm transition-colors disabled:cursor-not-allowed disabled:opacity-35 ${tone} ${className}`}
    >
      <Icon className="size-4" aria-hidden="true" />
    </button>
  );
}

type TableLabels = { title: string; subtitle: string; date: string; rowLabel: string; rowValue: string; addRow: string };

function getTableLabels(language: CvLanguage, type: CvSectionType): TableLabels | undefined {
  const table = cvDocByLanguage[language].table;
  if (type === "experience") {
    return {
      title: table.experienceTitle,
      subtitle: table.experienceSubtitle,
      date: table.experienceDate,
      rowLabel: table.rowLabel,
      rowValue: table.rowValue,
      addRow: table.addRow,
    };
  }
  if (type === "projects") {
    return {
      title: table.projectsTitle,
      subtitle: table.projectsSubtitle,
      date: table.projectsDate,
      rowLabel: table.rowLabel,
      rowValue: table.rowValue,
      addRow: table.addRow,
    };
  }
  return undefined;
}

const cellClass = "border border-gray-500 px-[5.4pt] align-top";

export function EditableItem({ sectionId, type, item, index, total, inverse, table = false }: {
  sectionId: string;
  type: CvSectionType;
  item: CvBuilderItem;
  index: number;
  total: number;
  inverse: boolean;
  table?: boolean;
}) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestRow, setSuggestRow] = useState<number | null>(null);
  const language = useCvBuilderStore((s) => s.cv?.language ?? "vi");
  const updateItem = useCvBuilderStore((s) => s.updateItem);
  const moveItem = useCvBuilderStore((s) => s.moveItem);
  const moveItemTo = useCvBuilderStore((s) => s.moveItemTo);
  const duplicateItem = useCvBuilderStore((s) => s.duplicateItem);
  const removeItem = useCvBuilderStore((s) => s.removeItem);
  const addItem = useCvBuilderStore((s) => s.addItem);
  const dragType = itemDragType(sectionId);
  const drop = useDropTarget(dragType, (draggedId, position) => moveItemTo(sectionId, draggedId, item.id, position));
  const fieldCfg = sectionFieldConfig[type];
  const text: Placeholders = {
    title: t(`candidate.cv.itemPlaceholders.${type}.title`),
    subtitle: fieldCfg.hasSubtitle ? t(`candidate.cv.itemPlaceholders.${type}.subtitle`) : "",
    date: fieldCfg.hasDate ? t(`candidate.cv.itemPlaceholders.${type}.date`) : "",
    description: fieldCfg.hasDescription ? t(`candidate.cv.itemPlaceholders.${type}.description`) : "",
  };
  const update = (patch: Partial<Omit<CvBuilderItem, "id">>) => updateItem(sectionId, item.id, patch);
  const muted = inverse ? "text-white/75" : "text-slate-500";
  const tableLabels = table ? getTableLabels(language, type) : undefined;
  const rows = tableLabels ? itemRows(item, type, language) : [];
  const setRows = (next: CvBuilderItemRow[]) => update({ rows: next, description: rowsToDescription(next) });
  const setRow = (rowIndex: number, patch: Partial<CvBuilderItemRow>) => setRows(rows.map((row, i) => (i === rowIndex ? { ...row, ...patch } : row)));

  return (
    <div ref={ref} data-cv-item={item.id} data-cv-block {...drop.handlers} className={`cv-avoid-break group/item relative isolate rounded-md py-1 hover:outline hover:outline-1 hover:outline-offset-2 hover:outline-dashed hover:outline-slate-300 focus-within:z-10 focus-within:!outline-none ${dropIndicatorClass(drop.position)}`}>
      {/* Active band spans past the item into the page margins, MyCV-style; controls sit in its gutters. */}
      <div aria-hidden="true" className={`cv-print-hidden pointer-events-none absolute -inset-x-9 -inset-y-1.5 -z-10 hidden rounded-md group-focus-within/item:block ${inverse ? "bg-white/15" : "bg-slate-100"}`} />
      <GutterButton label={t("candidate.cv.itemControls.addAbove")} icon={Plus} variant="add" onClick={() => addItem(sectionId, { itemId: item.id, position: "before" })} className="cv-print-hidden absolute -left-16 -top-3 z-10 hidden group-focus-within/item:grid" />
      <GutterButton label={t("candidate.cv.itemControls.addBelow")} icon={Plus} variant="add" onClick={() => addItem(sectionId, { itemId: item.id, position: "after" })} className="cv-print-hidden absolute -bottom-3 -left-16 z-10 hidden group-focus-within/item:grid" />
      <div className="cv-print-hidden absolute -left-8 inset-y-0 z-10 hidden w-6 flex-col items-center justify-center gap-1.5 group-focus-within/item:flex">
        <GutterButton label={t("candidate.cv.itemControls.moveUp")} icon={ChevronUp} disabled={index === 0} onClick={() => moveItem(sectionId, item.id, -1)} />
        <span
          draggable
          onDragStart={(event) => {
            event.stopPropagation();
            startDrag(event, dragType, item.id, ref.current);
          }}
          title={t("candidate.cv.itemControls.dragToReorder")}
          aria-hidden="true"
          className="grid size-6 cursor-grab place-items-center text-slate-400 hover:text-[var(--color-primary)] active:cursor-grabbing"
        >
          <GripVertical className="size-3.5" />
        </span>
        <GutterButton label={t("candidate.cv.itemControls.moveDown")} icon={ChevronDown} disabled={index === total - 1} onClick={() => moveItem(sectionId, item.id, 1)} />
      </div>
      <div onMouseDown={keepFocus} className="cv-print-hidden absolute -right-8 inset-y-0 z-10 hidden w-6 flex-col items-center justify-center gap-1.5 group-focus-within/item:flex">
        <button type="button" title={t("candidate.cv.itemControls.delete")} aria-label={t("candidate.cv.itemControls.delete")} onClick={() => removeItem(sectionId, item.id)} className="grid size-6 place-items-center rounded-md text-slate-500 hover:bg-red-50 hover:text-red-600">
          <Trash2 className="size-5" aria-hidden="true" />
        </button>
        {aiSectionTypes.has(type) && !tableLabels && <ControlButton label={t("candidate.cv.itemControls.aiSuggestDescription")} icon={Sparkles} onClick={() => setSuggesting(true)} />}
        <ControlButton label={t("candidate.cv.itemControls.duplicate")} icon={Copy} onClick={() => duplicateItem(sectionId, item.id)} />
      </div>
      {tableLabels ? (
        <>
          <table className="w-full border-collapse">
            <tbody>
              <tr>
                <th scope="row" className={`${cellClass} w-[23%] text-left font-bold italic`}>{tableLabels.title}</th>
                <td className={`${cellClass} text-center font-bold`}><EditableText value={item.title} onChange={(title) => update({ title })} placeholder={text.title} label={tableLabels.title} /></td>
                <td className={`${cellClass} w-[29%] text-right font-bold italic`}>{tableLabels.date}</td>
              </tr>
              <tr>
                <th scope="row" className={`${cellClass} text-left font-bold italic`}>{tableLabels.subtitle}</th>
                <td className={`${cellClass} text-center font-bold`}><EditableText value={item.subtitle} onChange={(subtitle) => update({ subtitle })} placeholder={text.subtitle} label={tableLabels.subtitle} /></td>
                <td className={`${cellClass} text-right font-bold`}><EditableText value={item.date} onChange={(date) => update({ date })} placeholder={text.date} label={tableLabels.date} /></td>
              </tr>
              {rows.map((row, rowIndex) => (
                <tr key={rowIndex} className={`group/row ${row.value ? "" : "cv-print-empty"}`}>
                  <th scope="row" className={`${cellClass} text-left font-bold`}>
                    <EditableText value={row.label} onChange={(label) => setRow(rowIndex, { label })} placeholder={tableLabels.rowLabel} label={tableLabels.rowLabel} />
                  </th>
                  <td colSpan={2} className={`${cellClass} relative pr-8 [&_ul]:[list-style-type:square]`}>
                    <RichTextEditable value={row.value} onChange={(value) => setRow(rowIndex, { value })} placeholder={rowIndex === 0 ? text.description : tableLabels.rowValue} label={row.label || tableLabels.rowValue} />
                    <div onMouseDown={keepFocus} className="cv-print-hidden absolute right-0.5 top-0.5 hidden flex-col gap-0.5 group-focus-within/row:flex group-hover/row:flex">
                      <ControlButton label={t("candidate.cv.itemControls.aiSuggestContent")} icon={Sparkles} onClick={() => setSuggestRow(rowIndex)} />
                      <ControlButton label={t("candidate.cv.itemControls.deleteRow")} icon={X} danger onClick={() => setRows(rows.filter((_, i) => i !== rowIndex))} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length < MAX_ITEM_ROWS && (
            <button type="button" onClick={() => setRows([...rows, { label: "", value: "" }])} className="cv-print-hidden mt-1 inline-flex items-center gap-1 rounded-md px-2 py-1 font-sans text-xs font-semibold text-[var(--color-primary)] hover:bg-[color-mix(in_srgb,var(--color-primary)_8%,white)]">
              <Plus className="size-3.5" aria-hidden="true" />{tableLabels.addRow}
            </button>
          )}
        </>
      ) : table ? (
        <div className="flex gap-2 pl-[0.25in]">
          <span aria-hidden="true" className={item.title || item.subtitle ? "" : "invisible"}>•</span>
          <div className="min-w-0 flex-1">
            {type === "skills" ? (
              <div className="flex flex-wrap items-baseline gap-x-1">
                <span className="font-bold"><EditableText value={item.title} onChange={(title) => update({ title })} placeholder={text.title} label={text.title} />:</span>
                <div className="min-w-0 flex-1"><RichTextEditable value={item.description} onChange={(description) => update({ description })} placeholder={text.description} label={text.description} /></div>
              </div>
            ) : (
              <>
                <p>
                  <EditableText value={item.title} onChange={(title) => update({ title })} placeholder={text.title} label={text.title} className={item.title ? "" : "cv-print-empty"} />
                  {text.subtitle && <span className={item.subtitle ? "" : "cv-print-empty"}> – <EditableText value={item.subtitle} onChange={(subtitle) => update({ subtitle })} placeholder={text.subtitle} label={text.subtitle} /></span>}
                  {text.date && <span className={item.date ? "" : "cv-print-empty"}> (<EditableText value={item.date} onChange={(date) => update({ date })} placeholder={text.date} label={text.date} />)</span>}
                  {ratedSectionTypes.has(type) && <span className="ml-2 inline-block align-middle"><LevelDots value={item.level ?? 0} onChange={(level) => update({ level })} label={t("candidate.cv.itemControls.levelAria", { title: item.title || text.title })} inverse={false} /></span>}
                </p>
                {text.description && (
                  <div className={item.description ? "" : "cv-print-empty"}>
                    <RichTextEditable value={item.description} onChange={(description) => update({ description })} placeholder={text.description} label={text.description} />
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      ) : (<>
      <div className="flex items-baseline justify-between gap-3">
        <EditableText value={item.title} onChange={(title) => update({ title })} placeholder={text.title} label={text.title} className={`font-semibold ${item.title ? "" : "cv-print-empty"}`} />
        {type === "skills" ? (
          <SkillLevel value={item.level ?? 0} language={language} onChange={(level) => update({ level })} inverse={inverse} />
        ) : ratedSectionTypes.has(type) ? (
          <LevelDots value={item.level ?? 0} onChange={(level) => update({ level })} label={t("candidate.cv.itemControls.levelAria", { title: item.title || text.title })} inverse={inverse} />
        ) : (
          text.date && <EditableText value={item.date} onChange={(date) => update({ date })} placeholder={text.date} label={text.date} className={`shrink-0 text-[0.92em] ${muted}`} />
        )}
      </div>
      {text.subtitle && <EditableText value={item.subtitle} onChange={(subtitle) => update({ subtitle })} placeholder={text.subtitle} label={text.subtitle} className={`text-[0.92em] ${muted} ${item.subtitle ? "" : "cv-print-empty"}`} />}
      {text.description && (
        <div className={item.description ? "" : "cv-print-empty"}>
          <RichTextEditable value={item.description} onChange={(description) => update({ description })} placeholder={text.description} label={text.description} className="mt-0.5" />
        </div>
      )}
      </>)}
      {suggesting && (
        <AiSuggestDialog
          request={{
            kind: "description",
            language,
            headline: useCvBuilderStore.getState().cv?.personalInfo.title ?? "",
            sectionType: type,
            itemTitle: item.title,
            itemSubtitle: item.subtitle,
            text: item.description,
          }}
          onApply={(description) => update({ description })}
          onClose={() => setSuggesting(false)}
        />
      )}
      {suggestRow !== null && rows[suggestRow] && (
        <AiSuggestDialog
          request={{
            kind: "description",
            language,
            headline: useCvBuilderStore.getState().cv?.personalInfo.title ?? "",
            sectionType: type,
            itemTitle: [item.title, rows[suggestRow].label].filter(Boolean).join(" – "),
            itemSubtitle: item.subtitle,
            text: rows[suggestRow].value,
          }}
          onApply={(value) => setRow(suggestRow, { value })}
          onClose={() => setSuggestRow(null)}
        />
      )}
    </div>
  );
}
