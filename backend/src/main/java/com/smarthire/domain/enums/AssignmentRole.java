package com.smarthire.domain.enums;

public enum AssignmentRole {

    // ── Active roles (Job Role Matrix) ────────────────────────────────────────
    /** Full control: edit, publish, delete, manage team. One per job at a time. */
    OWNER,
    /** Can edit content and publish, cannot delete or manage team. */
    COLLABORATOR,
    /** Read-only access to job and applicants. Can leave comments/reviews. */
    VIEWER,
    /** Business stakeholder: read applicants and approve/comment; cannot edit job. */
    HIRING_MANAGER,

    // ── Deprecated – kept for DB compatibility, do NOT use in new code ─────────
    /** @deprecated Replaced by {@link #OWNER}. Backfilled via V37 migration. */
    @Deprecated
    PRIMARY_RECRUITER,
    /** @deprecated Replaced by {@link #COLLABORATOR}. Backfilled via V37 migration. */
    @Deprecated
    CO_RECRUITER;

    // ── Helpers ────────────────────────────────────────────────────────────────

    public static AssignmentRole from(String raw) {
        if (raw == null || raw.isBlank()) {
            return null;
        }
        try {
            return AssignmentRole.valueOf(raw.trim().toUpperCase());
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    /** Returns true for roles that allow editing job content (OWNER / COLLABORATOR). */
    public boolean canEdit() {
        return this == OWNER || this == COLLABORATOR;
    }

    /** Returns true for roles that are allowed to publish or close a job. */
    public boolean canPublish() {
        return this == OWNER || this == COLLABORATOR;
    }

    /** Returns true for the only role that can delete a job or manage team members. */
    public boolean canDelete() {
        return this == OWNER;
    }

    /** Returns true for the only role that can manage team membership. */
    public boolean canManageTeam() {
        return this == OWNER;
    }

    /** Returns true for roles that can view applicants. */
    public boolean canViewApplicants() {
        return this == OWNER || this == COLLABORATOR || this == VIEWER || this == HIRING_MANAGER;
    }
}
