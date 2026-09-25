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

export type RequirementStatus = "MATCH" | "PARTIAL" | "MISSING" | "UNKNOWN";

export type RequirementMatch = {
  requirement: string;
  required?: string;
  candidate?: string | null;
  status: RequirementStatus;
  matchType?: "TAXONOMY" | "SEMANTIC" | "BOTH" | "NONE";
  similarity?: number;
  mandatory?: boolean;
  evidence?: string;
  explanation?: string;
};

export type MatchBreakdown = {
  skillScore?: number;
  jaccardSimilarity?: number;
  verdict?: string;
  explanation?: string;
  source?: string;
  matched?: RequirementMatch[];
  partialMatches?: RequirementMatch[];
  missing?: RequirementMatch[];
  requiredMissing?: string[];
  passed?: boolean;
  passThreshold?: number;
  weights?: {
    required?: number;
    preferred?: number;
    jaccard?: number;
    experience?: number;
    education?: number;
    semantic?: number;
  };
  components?: {
    required?: number;
    preferred?: number | null;
    jaccard?: number;
    experience?: number | null;
    education?: number | null;
    semantic?: number;
  };
  experienceAnalysis?: { requiredYears?: number | null; candidateYears?: number | null; match?: boolean };
  educationAnalysis?: { requiredLevel?: string | null; candidateLevel?: string | null; match?: boolean };
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
  jobId: number | null;
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
  jobId: number | null;
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
