import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { UserProfile } from "@/features/tenant/auth/types";

export type InviteMemberRequest = {
  email: string;
  fullName: string;
  role: string;
};

export type InviteMemberResponse = {
  email: string;
  fullName: string;
  role: string;
  expiresAt: string;
  emailSent: boolean;
  acceptUrl: string;
};

export type TenantMember = {
  id: number;
  email: string;
  fullName: string;
  role: string;
  workspace?: string;
  status?: string;
  createdAt?: string;
};

export type StaffAssignment = {
  jobId: number;
  title: string;
  status: string;
  assignmentRole: string;
};

export const usersApi = {
  list: () => api.get<ApiResponse<TenantMember[]>>("/tenant/users").then((r) => r.data),
  assignments: (id: number) =>
    api.get<ApiResponse<StaffAssignment[]>>(`/tenant/users/${id}/assignments`).then((r) => r.data),
  invite: (body: InviteMemberRequest) =>
    api.post<ApiResponse<InviteMemberResponse>>("/tenant/users/invitations", body).then((r) => r.data),
  assignRole: (id: number, role: string) =>
    api.put<ApiResponse<TenantMember>>(`/tenant/users/${id}/role`, { role }).then((r) => r.data),
  acceptInvite: (body: { token: string; password: string }) =>
    api.post<ApiResponse<UserProfile>>("/tenant/users/invitations/accept", body).then((r) => r.data),
};
