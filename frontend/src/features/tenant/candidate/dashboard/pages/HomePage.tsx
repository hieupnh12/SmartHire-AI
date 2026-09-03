import { CandidateTaskList } from "@/features/tenant/candidate/dashboard/components/CandidateTaskList";
import { CandidateStatsGrid } from "@/features/tenant/candidate/dashboard/components/CandidateStatsGrid";
import { CandidateWelcomePanel } from "@/features/tenant/candidate/dashboard/components/CandidateWelcomePanel";
import { ApplicationStatusTimeline } from "@/features/tenant/candidate/dashboard/components/ApplicationStatusTimeline";
import { UpcomingInterviewCard } from "@/features/tenant/candidate/dashboard/components/UpcomingInterviewCard";
import {
  candidateApplicationStages,
  candidateStats,
  candidateTasks,
  FEATURED_APPLICATION_ROLE,
  FEATURED_APPLICATION_STATUS,
} from "@/features/tenant/candidate/dashboard/constants/candidateDashboard";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";

export function HomePage() {
  const user = useAuthStore((s) => s.user);

  return (
    <section className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.6fr]">
        <CandidateWelcomePanel candidateName={user?.fullName} />
        <UpcomingInterviewCard />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <ApplicationStatusTimeline
          roleTitle={FEATURED_APPLICATION_ROLE}
          statusLabel={FEATURED_APPLICATION_STATUS}
          stages={candidateApplicationStages}
        />
        <CandidateTaskList tasks={candidateTasks} />
      </div>

      <CandidateStatsGrid stats={candidateStats} />
    </section>
  );
}