import { api } from "@/lib/axios";
import type { ApiResponse } from "@/types/api";
import type { PublicJob } from "@/api/types/job";

export type JobRecommendationItem = {
  job: PublicJob;
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  reasons: string[];
};

export type CandidateJobRecommendationPage = {
  analyzedCvId: number | null;
  analyzedCvFilename: string | null;
  hasAnalyzedCv: boolean;
  items: JobRecommendationItem[];
};

export type CandidateRecommendationItem = {
  candidateId: number;
  candidateName: string;
  headline: string | null;
  avatarUrl: string | null;
  cvId: number;
  cvFilename: string;
  score: number;
  matchedSkills: string[];
  missingSkills: string[];
  alreadyApplied: boolean;
  reasons: string[];
};

export const recommendationApi = {
  jobsForMe: (limit = 20) =>
    api
      .get<ApiResponse<CandidateJobRecommendationPage>>("/recommendations/jobs", {
        params: { limit },
      })
      .then((r) => r.data.data),

  candidatesForJob: (jobId: number, limit = 20) =>
    api
      .get<ApiResponse<CandidateRecommendationItem[]>>(`/jobs/${jobId}/recommendations/candidates`, {
        params: { limit },
      })
      .then((r) => r.data.data),
};

