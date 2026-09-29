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

export type RecruitmentStageCode =
  | "APPLIED"
  | "SCREENING"
  | "ASSESSMENT"
  | "INTERVIEW"
  | "OFFER"
  | "HIRED";

export type StageView = {
  id: number;
  stageCode: RecruitmentStageCode;
  name: string;
  sortOrder: number;
  terminal: boolean;
  active: boolean;
};

export type StageItemInput = {
  stageCode: RecruitmentStageCode;
  sortOrder: number;
  active: boolean;
};

export type StagesReplaceRequest = {
  stages: StageItemInput[];
};

export type JobListItem = {
  id: number;
  title: string;
  status: JobStatus;
  location?: string | null;
  employmentType?: string | null;
  workMode?: string | null;
  department?: string | null;
  screeningMode?: ScreeningMode;
  deadline?: string | null;
  headcount?: number;
  applicationCount?: number;
  funnel?: JobFunnelSummary;
  publishedAt?: string | null;
  updatedAt?: string | null;
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

export type CvScreeningConfigView = CvScreeningConfig;
export type GateScreeningConfigView = GateScreeningConfig;

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
  screeningMode: ScreeningMode;
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
  canEditRecruitmentWorkflow?: boolean;
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
  screeningMode?: ScreeningMode;
  headcount?: number;
  deadline?: string | null;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  salaryVisible?: boolean;
  minYearsExperience?: number;
  educationLevel?: string;
  skills?: JobSkillInput[];
  stages?: StageItemInput[];
  cvScreening?: CvScreeningConfig;
  gateScreening?: GateScreeningConfig;
};

export type JobPage = {
  items: JobListItem[];
  total: number;
  page: number;
  size: number;
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
