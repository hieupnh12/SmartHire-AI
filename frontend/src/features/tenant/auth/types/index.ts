import type { Role } from "@/types/api";

export type LoginRequest = {
  email: string;
  password: string;
};

export type RegisterRequest = {
  email: string;
  password: string;
  fullName: string;
  role: Extract<Role, "CANDIDATE" | "RECRUITER">;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
  expiresIn?: number;
  user?: UserProfile;
  tenantId?: string;
};

export type UserProfile = {
  id: number;
  email: string;
  fullName: string;
  role: Role;
  phone?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  headline?: string | null;
};
