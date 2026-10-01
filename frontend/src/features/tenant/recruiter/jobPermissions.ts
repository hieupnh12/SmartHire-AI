/**
 * Job Role Matrix — frontend permission helpers.
 *
 * This file is the single source of truth for what each job role can do on the FE side.
 * Keep this in sync with AssignmentRole.java and the Job Role Matrix in AGENTS.md §1.
 *
 * Role precedence (highest → lowest):
 *   OWNER > COLLABORATOR > HIRING_MANAGER ≈ VIEWER
 *
 * Admin users always bypass these checks — they see the full UI.
 * When `currentUserRole` is null, treat the user as an admin (server returns null for admins).
 */

export type JobRole = 'OWNER' | 'COLLABORATOR' | 'VIEWER' | 'HIRING_MANAGER';

// ── Display labels (i18n: Vietnamese) ────────────────────────────────────────

export const JOB_ROLE_LABELS: Record<JobRole, string> = {
  OWNER: 'Chủ sở hữu',
  COLLABORATOR: 'Cộng tác viên',
  VIEWER: 'Người xem',
  HIRING_MANAGER: 'Quản lý tuyển dụng',
};

export const JOB_ROLE_LABELS_EN: Record<JobRole, string> = {
  OWNER: 'Owner',
  COLLABORATOR: 'Collaborator',
  VIEWER: 'Viewer',
  HIRING_MANAGER: 'Hiring Manager',
};

/** Badge color variants per role (maps to Tailwind / Shadcn badge variant names or custom). */
export const JOB_ROLE_COLORS: Record<JobRole, { bg: string; text: string; border: string }> = {
  OWNER:           { bg: 'bg-amber-100',  text: 'text-amber-800',  border: 'border-amber-300' },
  COLLABORATOR:    { bg: 'bg-blue-100',   text: 'text-blue-800',   border: 'border-blue-300'  },
  VIEWER:          { bg: 'bg-gray-100',   text: 'text-gray-700',   border: 'border-gray-300'  },
  HIRING_MANAGER:  { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-300'},
};

// ── Permission helpers ────────────────────────────────────────────────────────

/**
 * Returns true when the actor is an admin (role is null) or has OWNER / COLLABORATOR.
 * Use this guard before showing "Edit Job" UI.
 */
export function canEditJob(role: JobRole | null | undefined): boolean {
  if (role == null) return true; // admin
  return role === 'OWNER' || role === 'COLLABORATOR';
}

/**
 * Returns true when the actor can publish or close a job.
 * Same set as canEditJob because OWNER and COLLABORATOR both have publish rights.
 */
export function canPublishJob(role: JobRole | null | undefined): boolean {
  if (role == null) return true;
  return role === 'OWNER' || role === 'COLLABORATOR';
}

/**
 * Returns true only for OWNER (or admin).
 * Use to guard the "Delete Job" action.
 */
export function canDeleteJob(role: JobRole | null | undefined): boolean {
  if (role == null) return true;
  return role === 'OWNER';
}

/**
 * Returns true only for OWNER (or admin).
 * Use to guard the "Manage Team" panel and "Transfer Ownership" action.
 */
export function canManageTeam(role: JobRole | null | undefined): boolean {
  if (role == null) return true;
  return role === 'OWNER';
}

/**
 * Returns true when the actor can view applicants (any assigned role, or admin).
 */
export function canViewApplicants(role: JobRole | null | undefined): boolean {
  if (role == null) return true;
  return (
    role === 'OWNER' ||
    role === 'COLLABORATOR' ||
    role === 'VIEWER' ||
    role === 'HIRING_MANAGER'
  );
}

/**
 * Returns true when the actor can take write actions on an applicant
 * (move stage, reject, approve CV). Requires OWNER or COLLABORATOR.
 */
export function canWriteApplicant(role: JobRole | null | undefined): boolean {
  if (role == null) return true;
  return role === 'OWNER' || role === 'COLLABORATOR';
}

/**
 * Returns true when the actor can configure screening weights.
 * Only OWNER (or admin) may do this.
 */
export function canConfigScreening(role: JobRole | null | undefined): boolean {
  if (role == null) return true;
  return role === 'OWNER';
}

/** Parses a raw server string into a typed JobRole, returns null if unknown or admin. */
export function parseJobRole(raw: string | null | undefined): JobRole | null {
  if (!raw) return null;
  const upper = raw.toUpperCase();
  if (
    upper === 'OWNER' ||
    upper === 'COLLABORATOR' ||
    upper === 'VIEWER' ||
    upper === 'HIRING_MANAGER'
  ) {
    return upper as JobRole;
  }
  return null;
}
