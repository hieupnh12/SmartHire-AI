export const recruiterNav = [
  { to: "", labelKey: "nav.dashboard", featureCode: "DASHBOARD" },
  { to: "/jobs", labelKey: "nav.jobs", featureCode: "JOBS" },
  { to: "/applicants", labelKey: "nav.applicants", featureCode: "APPLICANTS" },
  { to: "/cvs", labelKey: "nav.cvScreening", featureCode: "CV_SCREENING" },
  { to: "/rank", labelKey: "nav.ranking", featureCode: "RANKING" },
  { to: "/pipeline", labelKey: "nav.pipeline", featureCode: "PIPELINE" },
  { to: "/analytics", labelKey: "nav.recruitmentAnalytics", featureCode: "ANALYTICS" },
  { to: "/assessments", labelKey: "nav.assessments", featureCode: "ASSESSMENTS" },
  { to: "/ai-interviews", labelKey: "nav.aiInterview", featureCode: "AI_INTERVIEWS" },
  { to: "/interviews", labelKey: "nav.interviews", featureCode: "INTERVIEWS" },
  { to: "/schedules", labelKey: "nav.schedules", featureCode: "SCHEDULES" },
  { to: "/notifications", labelKey: "nav.notifications", featureCode: "NOTIFICATIONS" },
] as const;

export type RecruiterFeatureCode = (typeof recruiterNav)[number]["featureCode"];
