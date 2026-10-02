import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { JobRole } from "@/features/tenant/recruiter/jobPermissions";

/** Server-side assignment role type. Matches AssignmentRole.java enum (active values only). */
export type AssignmentRole = JobRole;

export type JobAssignment = {
  id: number;
  jobId: number;
  userId: number;
  fullName: string;
  email: string;
  role: string; // tenant user role (RECRUITER / TENANT_ADMIN etc.)
  canView: boolean;
  canEdit: boolean;
  isCreator: boolean;
  assignmentRole: AssignmentRole;
  assignedAt: string | null;
  assignedByName: string | null;
};

export const jobAssignmentsApi = {
  list: (jobId: number) =>
    api.get<ApiResponse<JobAssignment[]>>(`/jobs/${jobId}/assignments`).then((r) => r.data),

  assign: (jobId: number, body: { userId: number; canView?: boolean; canEdit?: boolean; assignmentRole?: string }) =>
    api.post<ApiResponse<JobAssignment>>(`/jobs/${jobId}/assignments`, body).then((r) => r.data),

  updateRole: (jobId: number, userId: number, assignmentRole: AssignmentRole) =>
    api
      .patch<ApiResponse<JobAssignment>>(`/jobs/${jobId}/assignments/${userId}`, { assignmentRole })
      .then((r) => r.data),

  updatePermissions: (jobId: number, userId: number, body: { canView?: boolean; canEdit?: boolean; assignmentRole?: string }) =>
    api
      .patch<ApiResponse<JobAssignment>>(`/jobs/${jobId}/assignments/${userId}`, body)
      .then((r) => r.data),

  remove: (jobId: number, userId: number) =>
    api.delete<ApiResponse<null>>(`/jobs/${jobId}/assignments/${userId}`).then((r) => r.data),

  /** Transfer job ownership. Current OWNER → COLLABORATOR; newOwnerId → OWNER. */
  transferOwner: (jobId: number, newOwnerId: number) =>
    api
      .post<ApiResponse<JobAssignment>>(`/jobs/${jobId}/assignments/transfer-owner`, { newOwnerId })
      .then((r) => r.data),
};
