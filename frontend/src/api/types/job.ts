export type JobStatus = "DRAFT" | "PUBLISHED" | "PAUSED" | "CLOSED" | "ARCHIVED";
export type ScreeningMode = "AUTO" | "MANUAL";
export type JobFunnelSummary = {
  screened: number;
  shortlisted: number;
  testing: number;
  interviewing: number;
  filled: number;
};

export type JobSkillInput = {
  name: string;
  category?: string;
  required: boolean;
  weight: number;
  minLevel?: string;
};

export type JobSkillView = {
  skillId: number;
  name: string;
  category: string | null;
  required: boolean;
  weight: number;
  minLevel: string | null;
};

export type StageView = {
  id: number;
  name: string;
  sortOrder: number;
  terminal: boolean;
};

export type JobListItem = {
  id: number;
  title: string;
  status: JobStatus;
  location?: string | null;
  employmentType?: string | null;
  workMode?: string | null;
  department?: string | null;
  screeningMode?: ScreeningMode | null;
  funnel?: JobFunnelSummary | null;
  deadline?: string | null;
  headcount: number;
  applicationCount: number;
  publishedAt?: string | null;
  updatedAt?: string | null;
};

export type JobPage = {
  items: JobListItem[];
  total: number;
  page: number;
  size: number;
};

export type JobDetail = {
  id: number;
  title: string;
  description: string;
  responsibilities?: string | null;
  benefits?: string | null;
  location?: string | null;
  employmentType?: string | null;
  workMode?: string | null;
  department?: string | null;
  screeningMode?: ScreeningMode | null;
  headcount?: number | null;
  deadline?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string | null;
  salaryVisible: boolean;
  minYearsExperience?: number | null;
  educationLevel?: string | null;
  status: JobStatus;
  ownerName?: string | null;
  publishedAt?: string | null;
  pausedAt?: string | null;
  closedAt?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  applicationCount: number;
  acceptingApplications: boolean;
  skills: JobSkillView[];
  stages: StageView[];
  cvScreening?: CvScreeningConfig | null;
  gateScreening?: GateScreeningConfig | null;
};

export type CvScreeningConfig = {
  skillWeight: number;
  preferredWeight: number;
  experienceWeight: number;
  educationWeight: number;
  jaccardWeight: number;
  semanticWeight: number;
  passThreshold: number;
};

export type GateScreeningConfig = {
  cvWeight: number;
  aiInterviewWeight: number;
  assessmentWeight: number;
  passThreshold: number;
};

export type JobUpsertRequest = {
  title: string;
  description?: string;
  responsibilities?: string;
  benefits?: string;
  location?: string;
  employmentType?: string;
  workMode?: string;
  department?: string;
  headcount?: number | null;
  deadline?: string | null;
  salaryMin?: number | null;
  salaryMax?: number | null;
  salaryCurrency?: string;
  salaryVisible?: boolean;
  minYearsExperience?: number | null;
  educationLevel?: string;
  skills?: JobSkillInput[];
  cvScreening?: CvScreeningConfig;
  gateScreening?: GateScreeningConfig;
};

export type PublicJob = {
  id: number;
  title: string;
  description: string;
  responsibilities?: string | null;
  benefits?: string | null;
  location?: string | null;
  employmentType?: string | null;
  workMode?: string | null;
  department?: string | null;
  deadline?: string | null;
  salary?: string | null;
  minYearsExperience?: number | null;
  educationLevel?: string | null;
  skills: string[];
  acceptingApplications: boolean;
};

export type Job = JobDetail;
export type JobCreateRequest = JobUpsertRequest;
