import type { Role, RoleWorkspace } from "@/types/api";

export type LoginRequest = {
  email: string;
  password: string;
};

export type RegisterRequest = {
  email: string;
  password: string;
  fullName: string;
  role: "CANDIDATE" | "RECRUITER";
};

export type AuthTokens = {
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
  expiresIn?: number;
  user?: UserProfile;
  tenantId?: string;
  subdomain: string;
};

export type UserProfile = {
  id: number;
  email: string;
  fullName: string;
  role: Role;
  workspace?: RoleWorkspace;
  phone?: string | null;
  avatarUrl?: string | null;
  bio?: string | null;
  headline?: string | null;
  permissions?: string[];
  recruiterReadOnly?: boolean;
};

export type AccountProfile = {
  id: number;
  email: string;
  fullName: string;
  role: Role;
  phone: string | null;
  headline: string | null;
  bio: string | null;
  avatarUrl: string | null;
  hasPassword: boolean;
};

export type UpdateAccountProfile = Pick<AccountProfile, "fullName" | "phone" | "headline" | "bio">;

export type CandidateProfile = {
  id: number;
  email: string;
  fullName: string;
  role: Role;
  avatarUrl?: string | null;
  headline?: string | null;
  status?: string | null;
};

export type CandidateLoginResponse = {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  tenantId: string;
  subdomain: string;
  candidate: CandidateProfile;
};
