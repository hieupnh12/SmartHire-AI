import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import "../dashboard.css";
import { DashboardReveal } from "../components/DashboardReveal";
import { ApplicationStatusTimeline } from "@/features/tenant/candidate/dashboard/components/ApplicationStatusTimeline";
import { CandidateStatsGrid } from "@/features/tenant/candidate/dashboard/components/CandidateStatsGrid";
import { CandidateTaskList } from "@/features/tenant/candidate/dashboard/components/CandidateTaskList";
import { CandidateWelcomePanel } from "@/features/tenant/candidate/dashboard/components/CandidateWelcomePanel";
import { UpcomingInterviewCard } from "@/features/tenant/candidate/dashboard/components/UpcomingInterviewCard";
import { CandidateQuickLinks } from "@/features/tenant/candidate/dashboard/components/CandidateQuickLinks";
import {
  candidateApplicationStages,
  candidateStats,
  candidateTasks,
  FEATURED_APPLICATION_ROLE,
  FEATURED_APPLICATION_STATUS,
} from "@/features/tenant/candidate/dashboard/constants/candidateDashboard";

export function HomePage() {
  const user = useAuthStore((s) => s.user);

  return (
    <section className="candidate-dashboard space-y-8" aria-labelledby="candidate-dashboard-title">
      <CandidateWelcomePanel candidateName={user?.fullName} />
      <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
        <CandidateTaskList tasks={candidateTasks} />
        <div className="min-w-0">
          <UpcomingInterviewCard />
        </div>
      </div>

      <div className="grid min-w-0 gap-8 border-t border-[var(--color-border-default)] pt-8 lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
        <ApplicationStatusTimeline
          roleTitle={FEATURED_APPLICATION_ROLE}
          statusLabel={FEATURED_APPLICATION_STATUS}
          stages={candidateApplicationStages}
        />
        <CandidateStatsGrid stats={candidateStats} />
      </div>
      <DashboardReveal><CandidateQuickLinks /></DashboardReveal>
    </section>
  );
}
