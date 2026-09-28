import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { aiInterviewApi } from "@/api/tenant/aiInterviewApi";
import { applicantApi } from "@/api/tenant/applicantApi";
import type { AiInterview } from "@/api/types/aiInterview";
import type { ApplicationSummary } from "@/api/types/applicant";
import { queryKeys } from "@/lib/query-keys";

export type AiInterviewRow = AiInterview & { application: ApplicationSummary | null };

async function listAllApplicants(jobId: number) {
  const items: ApplicationSummary[] = [];
  let page = 0;
  let total = 0;
  do {
    const res = await applicantApi.listByJob(jobId, { page, size: 50 });
    items.push(...res.data.items);
    total = res.data.total;
    page += 1;
    if (res.data.items.length === 0) break;
  } while (items.length < total);
  return items;
}

export function useJobAiInterviews(jobId: number) {
  const interviews = useQuery({
    queryKey: queryKeys.aiInterviews.byJob(jobId),
    queryFn: () => aiInterviewApi.listForJob(jobId),
    refetchInterval: 5000,
  });
  const applicants = useQuery({
    queryKey: [...queryKeys.applicants.byJob(jobId), "all"],
    queryFn: () => listAllApplicants(jobId),
  });

  const rows = useMemo<AiInterviewRow[]>(() => {
    const byId = new Map((applicants.data ?? []).map((a) => [a.id, a]));
    return (interviews.data ?? []).map((item) => ({ ...item, application: byId.get(item.applicationId) ?? null }));
  }, [interviews.data, applicants.data]);

  return { interviews, applicants, rows };
}
