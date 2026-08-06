import { create } from "zustand";

type UiState = {
  shortcutsOpen: boolean;
  confirm: {
    open: boolean;
    title: string;
    description?: string;
    confirmLabel?: string;
    danger?: boolean;
    onConfirm?: () => void;
  };
  openShortcuts: () => void;
  closeShortcuts: () => void;
  toggleShortcuts: () => void;
  askConfirm: (opts: {
    title: string;
    description?: string;
    confirmLabel?: string;
    danger?: boolean;
    onConfirm: () => void;
  }) => void;
  closeConfirm: () => void;
};

export const useUiStore = create<UiState>((set) => ({
  shortcutsOpen: false,
  confirm: { open: false, title: "" },
  openShortcuts: () => set({ shortcutsOpen: true }),
  closeShortcuts: () => set({ shortcutsOpen: false }),
  toggleShortcuts: () => set((s) => ({ shortcutsOpen: !s.shortcutsOpen })),
  askConfirm: (opts) =>
    set({
      confirm: {
        open: true,
        title: opts.title,
        description: opts.description,
        confirmLabel: opts.confirmLabel,
        danger: opts.danger,
        onConfirm: opts.onConfirm,
      },
    }),
  closeConfirm: () => set({ confirm: { open: false, title: "" } }),
}));
