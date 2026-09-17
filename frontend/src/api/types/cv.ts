export type CvStatus =
  | "UPLOADED"
  | "PARSING"
  | "PARSED"
  | "EXTRACTING"
  | "ANALYZING"
  | "ANALYZED"
  | "FAILED";

export type SkillView = {
  skillName: string;
  canonicalName: string;
  category: string | null;
  confidence: number | null;
};

export type MatchBreakdown = {
  skillScore?: number;
  verdict?: string;
  explanation?: string;
  source?: string;
  matched?: { required: string; candidate: string | null; similarity: number; mandatory: boolean }[];
  missing?: { required: string; candidate: string | null; similarity: number; mandatory: boolean }[];
  requiredMissing?: string[];
};

export type MatchView = {
  jobId: number;
  cvId: number;
  score: number;
  breakdown: MatchBreakdown | null;
  modelVersion: string | null;
};

export type CvSummary = {
  id: number;
  jobId: number;
  userId: number;
  candidateName: string;
  originalFilename: string;
  status: CvStatus;
  matchScore: number | null;
  errorCode: string | null;
  createdAt: string;
};

export type CvDetail = {
  id: number;
  jobId: number;
  userId: number;
  applicationId: number | null;
  candidateName: string;
  originalFilename: string;
  mimeType: string | null;
  fileSize: number | null;
  status: CvStatus;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: string;
  extraction: Record<string, unknown> | null;
  extractionModel: string | null;
  skills: SkillView[];
  analysis: { summary: string | null; yearsExperience: number | null; modelVersion: string | null; promptVersion: string | null } | null;
  match: MatchView | null;
};

export type JobSkillView = {
  skillId: number;
  name: string;
  category: string | null;
  required: boolean;
  weight: number;
  minLevel: string | null;
};
