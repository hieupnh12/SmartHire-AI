import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";

export type AssignmentRole = "PRIMARY_RECRUITER" | "CO_RECRUITER";

export type JobAssignment = {
  id: number;
  jobId: number;
  userId: number;
  fullName: string;
  email: string;
  role: string;
  assignmentRole: AssignmentRole;
  assignedAt: string | null;
  assignedByName: string | null;
};

export const jobAssignmentsApi = {
  list: (jobId: number) =>
    api.get<ApiResponse<JobAssignment[]>>(`/jobs/${jobId}/assignments`).then((r) => r.data),
  assign: (jobId: number, body: { userId: number; assignmentRole: AssignmentRole }) =>
    api.post<ApiResponse<JobAssignment>>(`/jobs/${jobId}/assignments`, body).then((r) => r.data),
  updateRole: (jobId: number, userId: number, assignmentRole: AssignmentRole) =>
    api.patch<ApiResponse<JobAssignment>>(`/jobs/${jobId}/assignments/${userId}`, { assignmentRole }).then((r) => r.data),
  remove: (jobId: number, userId: number) =>
    api.delete<ApiResponse<null>>(`/jobs/${jobId}/assignments/${userId}`).then((r) => r.data),
};
