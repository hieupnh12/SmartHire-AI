import { useMemo } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { applicantApi } from "@/api/tenant/applicantApi";
import { humanInterviewApi } from "@/api/tenant/humanInterviewApi";
import { candidateInterviewApi } from "@/features/tenant/candidate/interviews/api/candidateInterviewApi";
import { queryKeys } from "@/lib/query-keys";
import { buildCalendarEvents } from "../services/buildCalendarEvents";

export function useCandidateCalendar() {
  const applications = useQuery({ queryKey: queryKeys.applicants.mine, queryFn: applicantApi.mine });
  const rows = useMemo(() => (applications.data?.data ?? []).filter((row) => row.status !== "WITHDRAWN"), [applications.data?.data]);
  const details = useQueries({
    queries: rows.map((row) => ({ queryKey: ["applications", "detail", row.id], queryFn: () => applicantApi.get(row.id).then((r) => r.data) })),
  });
  const aiInterviews = useQuery({ queryKey: ["ai-interviews", "calendar"], queryFn: candidateInterviewApi.mine });
  const humanInterviews = useQuery({ queryKey: ["human-interviews", "mine"], queryFn: humanInterviewApi.mine });

  const events = buildCalendarEvents({
    applications: rows,
    details: details.map((query) => query.data).filter((value) => value !== undefined),
    aiInterviews: aiInterviews.data ?? [],
    humanInterviews: humanInterviews.data ?? [],
  });

  const jobs = useMemo(() => [...new Map(rows.map((row) => [row.jobId, row.jobTitle])).entries()].map(([id, title]) => ({ id, title })), [rows]);
  const error = applications.error ?? aiInterviews.error ?? humanInterviews.error ?? details.find((query) => query.error)?.error ?? null;

  return {
    events,
    jobs,
    isPending: applications.isPending || aiInterviews.isPending || humanInterviews.isPending,
    error,
    refetch: () => { void applications.refetch(); void aiInterviews.refetch(); void humanInterviews.refetch(); details.forEach((query) => void query.refetch()); },
  };
}
