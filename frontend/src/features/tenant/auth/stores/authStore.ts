import { create } from "zustand";
import type { Role } from "@/types/api";
import type { UserProfile } from "../types";

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: UserProfile | null;
  setTokens: (access: string | null, refresh?: string | null) => void;
  setUser: (user: UserProfile | null) => void;
  logout: () => void;
  hasRole: (...roles: Role[]) => boolean;
};

function read(key: string) {
  return localStorage.getItem(key);
}

export const useAuthStore = create<AuthState>((set, get) => ({
  accessToken: read("accessToken"),
  refreshToken: read("refreshToken"),
  user: null,
  setTokens: (access, refresh = null) => {
    if (access) localStorage.setItem("accessToken", access);
    else localStorage.removeItem("accessToken");
    if (refresh) localStorage.setItem("refreshToken", refresh);
    else if (refresh === null && !access) localStorage.removeItem("refreshToken");
    set({
      accessToken: access,
      refreshToken: refresh ?? get().refreshToken,
    });
  },
  setUser: (user) => set({ user }),
  logout: () => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    set({ accessToken: null, refreshToken: null, user: null });
  },
  hasRole: (...roles) => {
    const role = get().user?.role;
    return !!role && roles.includes(role);
  },
}));
