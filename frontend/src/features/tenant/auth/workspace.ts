import type { RoleWorkspace } from "@/types/api";

export function workspaceOf(role?: string | null, workspace?: RoleWorkspace | null): RoleWorkspace {
  if (workspace === "ADMIN" || workspace === "RECRUITER" || workspace === "CANDIDATE") {
    return workspace;
  }
  if (role === "ADMIN" || role === "TENANT_ADMIN") return "ADMIN";
  if (role === "CANDIDATE") return "CANDIDATE";
  return "RECRUITER";
}
