import { useEffect, useRef, type ReactNode } from "react";

export function DashboardReveal({ children }: { children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add("candidate-revealed");
      observer.disconnect();
    }, { threshold: 0.08 });
    if (root.current) observer.observe(root.current);
    return () => observer.disconnect();
  }, []);
  return <div ref={root}>{children}</div>;
}
