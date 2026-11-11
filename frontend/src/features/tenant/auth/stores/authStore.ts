import { create } from "zustand";
import type { Role } from "@/types/api";
import type { UserProfile } from "../types";
import { authApi } from "@/api/tenant/authApi";

type AuthState = {
  accessToken: string | null;
  refreshToken: string | null;
  user: UserProfile | null;
  setTokens: (access: string | null, refresh?: string | null) => void;
  setUser: (user: UserProfile | null) => void;
  logout: (options?: { skipRemote?: boolean }) => void;
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
  logout: (options) => {
    const refreshToken = get().refreshToken ?? read("refreshToken") ?? undefined;
    const accessToken = get().accessToken ?? read("accessToken") ?? undefined;
    if (!options?.skipRemote && (refreshToken || accessToken)) {
      authApi.logout({ refreshToken }).catch(() => {});
    }
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    set({ accessToken: null, refreshToken: null, user: null });
  },
  hasRole: (...roles) => {
    const role = get().user?.role;
    return !!role && roles.includes(role);
  },
}));
