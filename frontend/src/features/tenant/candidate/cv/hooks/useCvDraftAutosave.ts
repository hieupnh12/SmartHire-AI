import { useEffect, useState } from "react";
import type { CvBuilderData } from "@/api/types/cv";
import { isCvBuilderData } from "../utils/createDefaultCv";

export const cvDraftKey = (tenant: string, userId: number, cvId: number | null) =>
  `smarthire:cv-builder:${tenant}:${userId}:${cvId ?? "new"}`;

export function readCvDraft(key: string): CvBuilderData | null {
  try {
    const raw = localStorage.getItem(key);
    const value: unknown = raw ? JSON.parse(raw) : null;
    return isCvBuilderData(value) ? value : null;
  } catch {
    return null;
  }
}

export function clearCvDraft(key: string) {
  localStorage.removeItem(key);
}

/** Debounced (500ms) draft persistence in the current browser only. */
export function useCvDraftAutosave(key: string | null, cv: CvBuilderData | null) {
  const [savedAt, setSavedAt] = useState<Date | null>(null);

  useEffect(() => {
    if (!key || !cv) return;
    const timer = window.setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(cv));
        setSavedAt(new Date());
      } catch {
        setSavedAt(null);
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [key, cv]);

  return savedAt;
}
