import { useEffect, useRef, useState, type ReactNode } from "react";

/**
 * Scales the A4 sheet visually while keeping layout space in sync, so page-break measurements
 * (offsetHeight) stay in real millimetres. Print CSS resets the transform.
 */
export function ZoomFrame({ zoom, children }: { zoom: number; children: ReactNode }) {
  const innerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | null>(null);
  const scale = zoom / 100;

  useEffect(() => {
    const element = innerRef.current;
    if (!element) return;
    const observer = new ResizeObserver(() => setHeight(element.offsetHeight));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="cv-zoom-frame mx-auto" style={{ width: `calc(210mm * ${scale})`, height: height === null ? undefined : height * scale }}>
      <div ref={innerRef} className="cv-zoom-inner w-[210mm] origin-top-left" style={{ transform: `scale(${scale})` }}>
        {children}
      </div>
    </div>
  );
}
