import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { UserProfile } from "@/features/tenant/auth/types";

export type UserStatus = "ACTIVE" | "LOCKED" | "DISABLED";

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

export type PendingInvitation = {
  id: number;
  email: string;
  fullName: string;
  role: string;
  status: "PENDING" | "ACCEPTED" | "REVOKED" | string;
  expired: boolean;
  expiresAt: string;
  createdAt?: string;
};

export type TenantMember = {
  id: number;
  email: string;
  fullName: string;
  role: string;
  workspace?: string;
  status?: UserStatus | string;
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
  listInvitations: (status?: string) =>
    api
      .get<ApiResponse<PendingInvitation[]>>("/tenant/users/invitations", {
        params: status ? { status } : undefined,
      })
      .then((r) => r.data),
  resendInvitation: (id: number) =>
    api.post<ApiResponse<InviteMemberResponse>>(`/tenant/users/invitations/${id}/resend`).then((r) => r.data),
  revokeInvitation: (id: number) =>
    api.delete<ApiResponse<void>>(`/tenant/users/invitations/${id}`).then((r) => r.data),
  assignRole: (id: number, role: string) =>
    api.put<ApiResponse<TenantMember>>(`/tenant/users/${id}/role`, { role }).then((r) => r.data),
  updateStatus: (id: number, body: { status: UserStatus; transferToUserId?: number }) =>
    api.patch<ApiResponse<TenantMember>>(`/tenant/users/${id}/status`, body).then((r) => r.data),
  acceptInvite: (body: { token: string; password: string }) =>
    api.post<ApiResponse<UserProfile>>("/tenant/users/invitations/accept", body).then((r) => r.data),
};
