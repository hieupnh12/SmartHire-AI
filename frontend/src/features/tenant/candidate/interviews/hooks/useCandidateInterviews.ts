import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { getTenantIdFromWindow } from "@/lib/tenant";
import { candidateInterviewApi } from "../api/candidateInterviewApi";

export function useCandidateInterviewScope() {
  const userId = useAuthStore(s => s.user?.id);
  return ["candidate-ai-interviews", getTenantIdFromWindow(), userId] as const;
}

export function useCandidateInterviews() {
  const scope = useCandidateInterviewScope();
  return useQuery({ queryKey: scope, queryFn: candidateInterviewApi.mine, enabled: !!scope[2], refetchInterval: 15000 });
}
