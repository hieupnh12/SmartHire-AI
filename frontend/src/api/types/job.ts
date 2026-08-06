export type JobStatus = "DRAFT" | "PUBLISHED" | "CLOSED" | "ARCHIVED";

export type Job = {
  id: number;
  title: string;
  description: string;
  location?: string | null;
  employmentType?: string | null;
  status: JobStatus;
  publishedAt?: string | null;
  closedAt?: string | null;
};

export type JobCreateRequest = {
  title: string;
  description: string;
  location?: string;
  employmentType?: string;
};
