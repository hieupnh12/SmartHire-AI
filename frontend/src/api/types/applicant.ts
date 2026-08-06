export type ApplicationStatus =
  | "NEW"
  | "IN_REVIEW"
  | "ASSESSMENT"
  | "INTERVIEW"
  | "OFFER"
  | "HIRED"
  | "REJECTED"
  | "WITHDRAWN";

export type Application = {
  id: number;
  jobId: number;
  candidateId: number;
  stageId?: number | null;
  status: ApplicationStatus;
  source?: string | null;
  notes?: string | null;
};
