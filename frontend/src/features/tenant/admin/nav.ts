import {
  BadgeCheck,
  Building2,
  BriefcaseBusiness,
  ChartNoAxesCombined,
  FileClock,
  GitBranch,
  House,
  Settings,
  ShieldCheck,
  UserRoundCog,
  Users,
} from "lucide-react";

export const adminNav = [
  { to: "", labelKey: "nav.overview", descriptionKey: "nav.overviewDescription", icon: House },
  { to: "/company", labelKey: "nav.company", icon: Building2, groupId: "company", groupLabelKey: "nav.adminCompany", groupDescriptionKey: "nav.adminCompanyDescription", groupIcon: Building2 },
  { to: "/verification", labelKey: "nav.companyVerification", icon: BadgeCheck, comingSoon: true, groupId: "company", groupLabelKey: "nav.adminCompany", groupDescriptionKey: "nav.adminCompanyDescription", groupIcon: Building2 },
  { to: "/users", labelKey: "nav.users", icon: Users, groupId: "people", groupLabelKey: "nav.adminPeople", groupDescriptionKey: "nav.adminPeopleDescription", groupIcon: Users },
  { to: "/roles", labelKey: "nav.rolesPermissions", icon: ShieldCheck, groupId: "people", groupLabelKey: "nav.adminPeople", groupDescriptionKey: "nav.adminPeopleDescription", groupIcon: Users },
  { to: "/recruiter-assignments", labelKey: "nav.recruiterAssignments", icon: UserRoundCog, groupId: "people", groupLabelKey: "nav.adminPeople", groupDescriptionKey: "nav.adminPeopleDescription", groupIcon: Users },
  { to: "/pipeline-settings", labelKey: "nav.pipelineSettings", icon: GitBranch, comingSoon: true, groupId: "recruitment", groupLabelKey: "nav.adminRecruitment", groupDescriptionKey: "nav.adminRecruitmentDescription", groupIcon: GitBranch },
  { to: "/recruitment", labelKey: "nav.publishedJobs", icon: BriefcaseBusiness, groupId: "recruitment", groupLabelKey: "nav.adminRecruitment", groupDescriptionKey: "nav.adminRecruitmentDescription", groupIcon: GitBranch },
  { to: "/analytics", labelKey: "nav.recruitmentAnalytics", icon: ChartNoAxesCombined, groupId: "recruitment", groupLabelKey: "nav.adminRecruitment", groupDescriptionKey: "nav.adminRecruitmentDescription", groupIcon: GitBranch },
  { to: "/system", labelKey: "nav.system", icon: Settings, groupId: "system", groupLabelKey: "nav.system", groupDescriptionKey: "nav.adminSystemDescription", groupIcon: Settings },
  { to: "/audit-logs", labelKey: "nav.auditLogs", icon: FileClock, comingSoon: true, groupId: "system", groupLabelKey: "nav.system", groupDescriptionKey: "nav.adminSystemDescription", groupIcon: Settings },
] as const;
