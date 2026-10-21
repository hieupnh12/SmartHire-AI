import { stopProctorSession, type ProctorSession } from "../components/AssessmentProctorGate";

/** Pending stream from invite gate before submission id exists. */
let pending: ProctorSession | null = null;

/** Live proctor sessions keyed by submission id (survives Strict Mode remount). */
const bySubmission = new Map<number, ProctorSession>();

export function handoffAssessmentProctor(session: ProctorSession) {
  if (pending && pending !== session) stopProctorSession(pending);
  pending = session;
}

export function commitAssessmentProctor(submissionId: number) {
  if (!pending) return;
  const existing = bySubmission.get(submissionId);
  if (existing && existing !== pending) stopProctorSession(existing);
  bySubmission.set(submissionId, pending);
  pending = null;
}

export function getAssessmentProctor(submissionId: number): ProctorSession | null {
  return bySubmission.get(submissionId) ?? null;
}

export function releaseAssessmentProctor(submissionId: number) {
  const session = bySubmission.get(submissionId);
  if (session) stopProctorSession(session);
  bySubmission.delete(submissionId);
  if (pending) {
    stopProctorSession(pending);
    pending = null;
  }
}

export function discardPendingAssessmentProctor() {
  if (pending) {
    stopProctorSession(pending);
    pending = null;
  }
}
