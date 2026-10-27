import { create } from "zustand";

export type ToastTone = "info" | "success" | "warning" | "danger" | "error";

export type ToastOptions = {
  id?: string;
  duration?: number;
};

export type ToastItem = {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
  duration: number;
};

type ToastState = {
  items: ToastItem[];
  push: (toast: Omit<ToastItem, "id" | "duration"> & { id?: string; duration?: number }) => string;
  dismiss: (id?: string) => void;
};

const timers = new Map<string, number>();

export const useToastStore = create<ToastState>((set) => ({
  items: [],
  push: (toast) => {
    const id =
      toast.id ??
      (typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`);
    const duration = toast.duration ?? (toast.tone === "error" || toast.tone === "danger" ? 5000 : 4000);

    // Clear existing timer if replacing same id
    if (timers.has(id)) {
      window.clearTimeout(timers.get(id));
      timers.delete(id);
    }

    set((s) => ({
      items: [...s.items.filter((item) => item.id !== id), { ...toast, id, duration }],
    }));

    if (duration > 0) {
      const timerId = window.setTimeout(() => {
        timers.delete(id);
        set((s) => ({ items: s.items.filter((t) => t.id !== id) }));
      }, duration);
      timers.set(id, timerId);
    }

    return id;
  },
  dismiss: (id) => {
    if (id) {
      if (timers.has(id)) {
        window.clearTimeout(timers.get(id));
        timers.delete(id);
      }
      set((s) => ({ items: s.items.filter((t) => t.id !== id) }));
    } else {
      timers.forEach((t) => window.clearTimeout(t));
      timers.clear();
      set({ items: [] });
    }
  },
}));

export const toast = {
  info: (title: string, description?: string, options?: ToastOptions) =>
    useToastStore.getState().push({ title, description, tone: "info", ...options }),
  success: (title: string, description?: string, options?: ToastOptions) =>
    useToastStore.getState().push({ title, description, tone: "success", ...options }),
  warning: (title: string, description?: string, options?: ToastOptions) =>
    useToastStore.getState().push({ title, description, tone: "warning", ...options }),
  danger: (title: string, description?: string, options?: ToastOptions) =>
    useToastStore.getState().push({ title, description, tone: "danger", ...options }),
  error: (title: string, description?: string, options?: ToastOptions) =>
    useToastStore.getState().push({ title, description, tone: "error", ...options }),
  dismiss: (id?: string) => useToastStore.getState().dismiss(id),
};
