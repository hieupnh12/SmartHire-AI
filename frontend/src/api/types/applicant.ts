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

export type ApplicationSummary = {
  id: number;
  jobId: number;
  jobTitle: string;
  candidateId: number;
  candidateName: string;
  candidateEmail: string;
  stageId: number | null;
  status: ApplicationStatus;
  source: string | null;
  referralCode: string | null;
  tags: string | null;
  assigneeName: string | null;
  archived: boolean;
  duplicate: boolean;
  createdAt: string;
  jobLocation: string | null;
  jobDepartment: string | null;
  jobWorkMode: string | null;
  jobEmploymentType: string | null;
};

export type CvRef = {
  id: number;
  originalFilename: string;
  status: string;
  createdAt: string;
  retainUntil: string | null;
  expired: boolean;
};

export type HistoryView = {
  fromStatus: string | null;
  toStatus: string;
  note: string | null;
  createdAt: string;
  changedBy: number | null;
};

export type ApplicationDetail = ApplicationSummary & {
  notes: string | null;
  rejectReason: string | null;
  assigneeId: number | null;
  archivedAt: string | null;
  withdrawnAt: string | null;
  candidateApplicationCount: number;
  cvs: CvRef[];
  history: HistoryView[];
};

export type ApplicationPage = {
  items: ApplicationSummary[];
  page: number;
  size: number;
  total: number;
};
