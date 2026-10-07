import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import type { CvBuilderData } from "@/api/types/cv";
import { CvCanvas } from "./CvCanvas";
import { CvReadOnlyContext } from "./CvReadOnlyContext";

const nextFrame = () => new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));

/**
 * Off-screen read-only render of the CV (no placeholders, editor controls or hidden sections), paginated on its own
 * so the exported PDF breaks pages for what is actually printed. Calls `onReady` once fonts and images have settled.
 */
export function CvPdfSnapshot({ cv, onReady }: { cv: CvBuilderData; onReady: (area: HTMLElement) => void }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const onReadyRef = useRef(onReady);

  useEffect(() => {
    onReadyRef.current = onReady;
  });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const host = hostRef.current;
      if (!host) return;
      await document.fonts.ready;
      await Promise.all(Array.from(host.querySelectorAll("img"), (img) => img.decode().catch(() => undefined)));
      await nextFrame();
      await nextFrame();
      const area = host.querySelector<HTMLElement>(".cv-print-area");
      if (!cancelled && area) onReadyRef.current(area);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return createPortal(
    <div ref={hostRef} aria-hidden="true" className="cv-readonly pointer-events-none fixed left-[-10000px] top-0">
      <CvReadOnlyContext.Provider value>
        <CvCanvas cv={cv} />
      </CvReadOnlyContext.Provider>
    </div>,
    document.body,
  );
}
