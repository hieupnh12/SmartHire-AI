import { useState, type DragEvent } from "react";
import type { DropPosition } from "../../stores/useCvBuilderStore";

export const SECTION_DRAG_TYPE = "application/x-cv-section";
/** Items may only be reordered inside their own section, so the section id is part of the drag type. */
export const itemDragType = (sectionId: string) => `application/x-cv-item-${sectionId.toLowerCase()}`;

export function startDrag(event: DragEvent, type: string, id: string, preview: HTMLElement | null) {
  event.dataTransfer.setData(type, id);
  event.dataTransfer.effectAllowed = "move";
  if (preview) event.dataTransfer.setDragImage(preview, 16, 16);
}

export function useDropTarget(type: string, onDrop: (draggedId: string, position: DropPosition) => void) {
  const [position, setPosition] = useState<DropPosition | null>(null);

  const accepts = (event: DragEvent) => event.dataTransfer.types.includes(type);
  const positionOf = (event: DragEvent<HTMLElement>): DropPosition => {
    const rect = event.currentTarget.getBoundingClientRect();
    return event.clientY > rect.top + rect.height / 2 ? "after" : "before";
  };

  return {
    position,
    handlers: {
      onDragOver: (event: DragEvent<HTMLElement>) => {
        if (!accepts(event)) return;
        event.preventDefault();
        event.stopPropagation();
        event.dataTransfer.dropEffect = "move";
        setPosition(positionOf(event));
      },
      onDragLeave: (event: DragEvent<HTMLElement>) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPosition(null);
      },
      onDrop: (event: DragEvent<HTMLElement>) => {
        if (!accepts(event)) return;
        event.preventDefault();
        event.stopPropagation();
        const draggedId = event.dataTransfer.getData(type);
        const dropAt = positionOf(event);
        setPosition(null);
        if (draggedId) onDrop(draggedId, dropAt);
      },
    },
  };
}

export const dropIndicatorClass = (position: DropPosition | null) =>
  position === "before"
    ? "shadow-[0_-3px_0_0_var(--color-primary)]"
    : position === "after"
      ? "shadow-[0_3px_0_0_var(--color-primary)]"
      : "";
