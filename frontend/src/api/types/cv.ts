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
  fromBuilder: boolean;
};

export type CvSectionType =
  | "experience" | "education" | "projects" | "skills" | "languages" | "certifications"
  | "awards" | "activities" | "interests" | "references" | "custom";

export type CvBuilderItem = {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  description: string;
  /** 0 = no rating; 1..5 shown as dots for skills/languages. */
  level?: number;
  /** Enterprise layout label/value rows for experience & projects; `description` mirrors them as HTML. */
  rows?: CvBuilderItemRow[];
};

export type CvBuilderItemRow = { label: string; value: string };

export type CvFontKey = "modern" | "classic" | "compact" | "tahoma";
export type CvFontSize = "sm" | "md" | "lg";
export type CvLineHeight = "tight" | "normal" | "relaxed";

export type CvAvatarShape = "circle" | "rounded" | "square" | "portrait" | "landscape";

/** User override of the template's photo frame; absent fields fall back to the layout default. */
export type CvAvatarStyle = { shape?: CvAvatarShape; sizeMm?: number };

export type CvBuilderTheme = {
  color: string | null;
  font: CvFontKey | null;
  fontSize: CvFontSize;
  lineHeight: CvLineHeight;
  avatar?: CvAvatarStyle;
};

/** Focus of the uncropped photo: centre (0..1 of the image), zoom over a "cover" fit, image width/height ratio. */
export type CvAvatarCrop = { x: number; y: number; zoom: number; aspect: number };

export type CvBuilderSection = {
  id: string;
  type: CvSectionType;
  title: string;
  visible: boolean;
  items: CvBuilderItem[];
};

export type CvBuilderPersonalInfo = {
  fullName: string;
  title: string;
  email: string;
  phone: string;
  address: string;
  website: string;
  summary: string;
  avatarUrl?: string;
  /** Absent for photos uploaded before cropping existed (square, shown with object-cover). */
  avatarCrop?: CvAvatarCrop | null;
  github?: string;
  linkedin?: string;
  /** Free label/value rows (nationality, date of birth, ...), max 12. */
  details?: CvBuilderDetail[];
  /** Company logo shown in the enterprise layout header (Cloudinary URL or bundled /cv-assets/*). */
  logoUrl?: string;
};

export type CvBuilderDetail = { label: string; value: string };

export type CvLanguage = "vi" | "en";

export type CvBuilderData = {
  templateId: string;
  accentColor: string | null;
  theme?: CvBuilderTheme;
  language?: CvLanguage;
  personalInfo: CvBuilderPersonalInfo;
  sections: CvBuilderSection[];
};

export type CvWritingRequest = {
  kind: "summary" | "description";
  language: CvLanguage;
  headline: string;
  sectionType: CvSectionType | "";
  itemTitle: string;
  itemSubtitle: string;
  text: string;
};

export type BuilderSkillHit = { name: string; required: boolean };

export type BuilderJobMatch = {
  jobId: number;
  jobTitle: string;
  score: number;
  matched: BuilderSkillHit[];
  missing: BuilderSkillHit[];
  minYearsExperience: number | null;
  educationLevel: string | null;
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
  builderData: CvBuilderData | null;
  shareToken: string | null;
};

export type JobSkillView = {
  skillId: number;
  name: string;
  category: string | null;
  required: boolean;
  weight: number;
  minLevel: string | null;
};
