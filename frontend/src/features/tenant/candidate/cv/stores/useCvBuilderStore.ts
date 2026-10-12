import { create } from "zustand";
import type { CvBuilderData, CvBuilderItem, CvBuilderPersonalInfo, CvBuilderSection, CvBuilderTheme, CvLanguage, CvSectionType } from "@/api/types/cv";
import { createItem, createSection, cvSectionLabelsByLanguage, defaultCvTheme } from "../utils/createDefaultCv";

type Direction = -1 | 1;
export type DropPosition = "before" | "after";

const HISTORY_LIMIT = 100;
/** Consecutive edits of the same field within this window collapse into one undo step. */
const MERGE_WINDOW_MS = 1000;

type CvBuilderState = {
  cv: CvBuilderData | null;
  past: CvBuilderData[];
  future: CvBuilderData[];
  load: (cv: CvBuilderData) => void;
  reset: () => void;
  undo: () => void;
  redo: () => void;
  setTemplate: (templateId: string) => void;
  setTheme: (patch: Partial<CvBuilderTheme>) => void;
  /** Translates section titles that still carry the default label of the previous language. */
  setLanguage: (language: CvLanguage) => void;
  updatePersonalInfo: (patch: Partial<CvBuilderPersonalInfo>) => void;
  addSection: (type: CvSectionType) => void;
  updateSection: (sectionId: string, patch: Partial<Pick<CvBuilderSection, "title">>) => void;
  removeSection: (sectionId: string) => void;
  swapSections: (firstId: string, secondId: string) => void;
  moveSectionTo: (sectionId: string, targetId: string, position: DropPosition) => void;
  toggleSectionVisibility: (sectionId: string) => void;
  /** Appends by default; `at` inserts a new empty item next to an existing one. */
  addItem: (sectionId: string, at?: { itemId: string; position: DropPosition }) => void;
  updateItem: (sectionId: string, itemId: string, patch: Partial<Omit<CvBuilderItem, "id">>) => void;
  removeItem: (sectionId: string, itemId: string) => void;
  duplicateItem: (sectionId: string, itemId: string) => void;
  moveItem: (sectionId: string, itemId: string, direction: Direction) => void;
  moveItemTo: (sectionId: string, itemId: string, targetId: string, position: DropPosition) => void;
};

function move<T extends { id: string }>(list: T[], id: string, direction: Direction): T[] {
  const from = list.findIndex((entry) => entry.id === id);
  const to = from + direction;
  if (from < 0 || to < 0 || to >= list.length) return list;
  const next = [...list];
  [next[from], next[to]] = [next[to], next[from]];
  return next;
}

function moveRelative<T extends { id: string }>(list: T[], id: string, targetId: string, position: DropPosition): T[] {
  if (id === targetId) return list;
  const moving = list.find((entry) => entry.id === id);
  if (!moving) return list;
  const rest = list.filter((entry) => entry.id !== id);
  const target = rest.findIndex((entry) => entry.id === targetId);
  if (target < 0) return list;
  const index = position === "after" ? target + 1 : target;
  return [...rest.slice(0, index), moving, ...rest.slice(index)];
}

export const useCvBuilderStore = create<CvBuilderState>((set) => {
  let lastMergeKey: string | null = null;
  let lastEditAt = 0;

  const patchCv = (update: (cv: CvBuilderData) => CvBuilderData, mergeKey?: string) =>
    set((state) => {
      if (!state.cv) return state;
      const next = update(state.cv);
      if (next === state.cv || JSON.stringify(next) === JSON.stringify(state.cv)) return state;
      const now = Date.now();
      const merge = !!mergeKey && mergeKey === lastMergeKey && now - lastEditAt < MERGE_WINDOW_MS;
      lastMergeKey = mergeKey ?? null;
      lastEditAt = now;
      return {
        cv: next,
        past: merge ? state.past : [...state.past, state.cv].slice(-HISTORY_LIMIT),
        future: [],
      };
    });
  const patchSections = (update: (sections: CvBuilderSection[]) => CvBuilderSection[], mergeKey?: string) =>
    patchCv((cv) => {
      const sections = update(cv.sections);
      return sections === cv.sections ? cv : { ...cv, sections };
    }, mergeKey);
  const patchSection = (sectionId: string, update: (section: CvBuilderSection) => CvBuilderSection, mergeKey?: string) =>
    patchSections((sections) => sections.map((section) => (section.id === sectionId ? update(section) : section)), mergeKey);
  const patchItems = (sectionId: string, update: (items: CvBuilderItem[]) => CvBuilderItem[], mergeKey?: string) =>
    patchSection(sectionId, (section) => ({ ...section, items: update(section.items) }), mergeKey);

  return {
    cv: null,
    past: [],
    future: [],
    load: (cv) => {
      lastMergeKey = null;
      set({ cv, past: [], future: [] });
    },
    reset: () => set({ cv: null, past: [], future: [] }),
    undo: () => set((state) => {
      if (!state.cv || state.past.length === 0) return state;
      lastMergeKey = null;
      return { cv: state.past[state.past.length - 1], past: state.past.slice(0, -1), future: [state.cv, ...state.future] };
    }),
    redo: () => set((state) => {
      if (!state.cv || state.future.length === 0) return state;
      lastMergeKey = null;
      return { cv: state.future[0], past: [...state.past, state.cv], future: state.future.slice(1) };
    }),
    setTemplate: (templateId) => patchCv((cv) => ({ ...cv, templateId })),
    setTheme: (patch) => patchCv((cv) => ({ ...cv, theme: { ...defaultCvTheme, ...cv.theme, ...patch } }), `theme:${Object.keys(patch).join()}`),
    updatePersonalInfo: (patch) =>
      patchCv((cv) => ({ ...cv, personalInfo: { ...cv.personalInfo, ...patch } }), `info:${Object.keys(patch).join()}`),
    setLanguage: (language) => patchCv((cv) => {
      const from = cv.language ?? "vi";
      if (from === language) return cv;
      const sections = cv.sections.map((section) =>
        section.title === cvSectionLabelsByLanguage[from][section.type]
          ? { ...section, title: cvSectionLabelsByLanguage[language][section.type] }
          : section);
      return { ...cv, language, sections };
    }),
    addSection: (type) => patchCv((cv) => ({ ...cv, sections: [...cv.sections, createSection(type, cv.language)] })),
    updateSection: (sectionId, patch) => patchSection(sectionId, (section) => ({ ...section, ...patch }), `section:${sectionId}`),
    removeSection: (sectionId) => patchSections((sections) => sections.filter((section) => section.id !== sectionId)),
    swapSections: (firstId, secondId) => patchSections((sections) => {
      const first = sections.findIndex((section) => section.id === firstId);
      const second = sections.findIndex((section) => section.id === secondId);
      if (first < 0 || second < 0) return sections;
      const next = [...sections];
      [next[first], next[second]] = [next[second], next[first]];
      return next;
    }),
    moveSectionTo: (sectionId, targetId, position) => patchSections((sections) => moveRelative(sections, sectionId, targetId, position)),
    toggleSectionVisibility: (sectionId) => patchSection(sectionId, (section) => ({ ...section, visible: !section.visible })),
    addItem: (sectionId, at) => patchItems(sectionId, (items) => {
      if (!at) return [...items, createItem()];
      return items.flatMap((item) => (item.id !== at.itemId ? [item] : at.position === "before" ? [createItem(), item] : [item, createItem()]));
    }),
    updateItem: (sectionId, itemId, patch) =>
      patchItems(sectionId, (items) => items.map((item) => (item.id === itemId ? { ...item, ...patch } : item)), `item:${itemId}:${Object.keys(patch).join()}`),
    removeItem: (sectionId, itemId) => patchItems(sectionId, (items) => items.filter((item) => item.id !== itemId)),
    duplicateItem: (sectionId, itemId) =>
      patchItems(sectionId, (items) => items.flatMap((item) => (item.id === itemId ? [item, { ...item, id: crypto.randomUUID() }] : [item]))),
    moveItem: (sectionId, itemId, direction) => patchItems(sectionId, (items) => move(items, itemId, direction)),
    moveItemTo: (sectionId, itemId, targetId, position) => patchItems(sectionId, (items) => moveRelative(items, itemId, targetId, position)),
  };
});
