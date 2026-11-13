import { useRef } from "react";
import { ArrowDown, ArrowUp, Eye, EyeOff, GripVertical, Plus, Trash2 } from "lucide-react";
import type { CvBuilderSection } from "@/api/types/cv";
import { useT } from "@/i18n";
import { useUiStore } from "@/stores/uiStore";
import { useCvBuilderStore } from "../../stores/useCvBuilderStore";
import { ControlButton } from "./ControlButton";
import { EditableItem } from "./EditableItem";
import { EditableText } from "./EditableText";
import { SECTION_DRAG_TYPE, dropIndicatorClass, startDrag, useDropTarget } from "./useDropTarget";

export function EditableSection({ section, prevId, nextId, headingClassName, inverse = false, table = false, className = "" }: {
  section: CvBuilderSection;
  prevId?: string;
  nextId?: string;
  headingClassName: string;
  inverse?: boolean;
  table?: boolean;
  className?: string;
}) {
  const t = useT();
  const ref = useRef<HTMLElement>(null);
  const askConfirm = useUiStore((s) => s.askConfirm);
  const swapSections = useCvBuilderStore((s) => s.swapSections);
  const moveSectionTo = useCvBuilderStore((s) => s.moveSectionTo);
  const toggleSectionVisibility = useCvBuilderStore((s) => s.toggleSectionVisibility);
  const addItem = useCvBuilderStore((s) => s.addItem);
  const removeSection = useCvBuilderStore((s) => s.removeSection);
  const updateSection = useCvBuilderStore((s) => s.updateSection);
  const drop = useDropTarget(SECTION_DRAG_TYPE, (draggedId, position) => moveSectionTo(draggedId, section.id, position));

  const confirmRemove = () => askConfirm({
    title: t("candidate.cv.sectionControls.deleteConfirmTitle"),
    description: t("candidate.cv.sectionControls.deleteConfirmDesc", {
      title: section.title || t("candidate.cv.sectionControls.untitledSection"),
    }),
    confirmLabel: t("candidate.cv.sectionControls.deleteConfirmButton"),
    danger: true,
    onConfirm: () => removeSection(section.id),
  });

  return (
    <section
      ref={ref}
      data-cv-section={section.id}
      {...drop.handlers}
      className={`group/section relative rounded-lg transition-[outline-color,box-shadow] hover:outline hover:outline-1 hover:outline-offset-4 hover:outline-dashed hover:outline-[color-mix(in_srgb,var(--color-primary)_45%,transparent)] focus-within:outline focus-within:outline-1 focus-within:outline-offset-4 focus-within:outline-dashed focus-within:outline-[color-mix(in_srgb,var(--color-primary)_45%,transparent)] ${dropIndicatorClass(drop.position)} ${section.visible ? "" : "cv-print-hidden opacity-45"} ${className}`}
    >
      <div className="cv-print-hidden absolute -top-4 right-0 z-20 hidden items-center gap-0.5 rounded-lg border border-slate-200 bg-white p-0.5 shadow-md group-focus-within/section:flex group-hover/section:flex group-has-[[data-cv-item]:focus-within]/section:!hidden">
        <span
          draggable
          onDragStart={(event) => startDrag(event, SECTION_DRAG_TYPE, section.id, ref.current)}
          title={t("candidate.cv.sectionControls.dragToReorder")}
          aria-hidden="true"
          className="grid size-7 cursor-grab place-items-center rounded-md text-slate-400 hover:bg-slate-100 hover:text-[var(--color-primary)] active:cursor-grabbing"
        >
          <GripVertical className="size-3.5" />
        </span>
        <ControlButton label={t("candidate.cv.sectionControls.moveUp")} icon={ArrowUp} disabled={!prevId} onClick={() => prevId && swapSections(section.id, prevId)} />
        <ControlButton label={t("candidate.cv.sectionControls.moveDown")} icon={ArrowDown} disabled={!nextId} onClick={() => nextId && swapSections(section.id, nextId)} />
        <ControlButton label={section.visible ? t("candidate.cv.sectionControls.hideOnExport") : t("candidate.cv.sectionControls.show")} icon={section.visible ? EyeOff : Eye} onClick={() => toggleSectionVisibility(section.id)} />
        <ControlButton label={t("candidate.cv.sectionControls.addItem")} icon={Plus} onClick={() => addItem(section.id)} />
        <ControlButton label={t("candidate.cv.sectionControls.deleteSection")} icon={Trash2} danger onClick={confirmRemove} />
      </div>
      <h2 data-cv-block="keep" className={headingClassName}>
        <EditableText
          value={section.title}
          onChange={(title) => updateSection(section.id, { title })}
          placeholder={t("candidate.cv.sectionControls.sectionTitlePlaceholder")}
          label={t("candidate.cv.sectionControls.sectionTitlePlaceholder")}
        />
        {!section.visible && <span className="cv-print-hidden ml-2 rounded bg-slate-200 px-1.5 py-0.5 align-middle text-[10px] font-semibold normal-case tracking-normal text-slate-600">{t("candidate.cv.sectionControls.hiddenBadge")}</span>}
      </h2>
      <div className="space-y-2">
        {section.items.map((item, itemIndex) => (
          <EditableItem key={item.id} sectionId={section.id} type={section.type} item={item} index={itemIndex} total={section.items.length} inverse={inverse} table={table} />
        ))}
        {section.items.length === 0 && (
          <button type="button" onClick={() => addItem(section.id)} className="cv-print-hidden inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-[var(--color-primary)] hover:bg-[color-mix(in_srgb,var(--color-primary)_8%,white)]">
            <Plus className="size-3.5" aria-hidden="true" />{t("candidate.cv.sectionControls.addItem")}
          </button>
        )}
      </div>
    </section>
  );
}
