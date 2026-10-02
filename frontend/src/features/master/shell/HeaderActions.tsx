import { createPortal } from "react-dom";
import { useEffect, useState, ReactNode } from "react";

export function HeaderActions({ children }: { children: ReactNode }) {
  const [container, setContainer] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setContainer(document.getElementById("master-header-actions-portal"));
  }, []);

  if (!container) return null;
  return createPortal(children, container);
}
