import type { AvailableAssessment } from "@/api/types/assessment";
import type { ApplicationSummary } from "@/api/types/applicant";
import type { UserProfile } from "@/features/tenant/auth/types";
/** Invitation preview aligned with Stitch assessment-portal mockup. */
export const MOCK_COMPANY_NAME = "TechViet Enterprise JSC";

export const mockInvitationUser: UserProfile = {
  id: 8921,
  email: "an.nguyen.dev@gmail.com",
  fullName: "Nguyễn Văn An",
  role: "CANDIDATE",
  phone: "0987654321",
  avatarUrl: null,
  headline: "Java Backend Engineer",
};

export const mockInvitationApplications: ApplicationSummary[] = [
  {
    id: 8921,
    jobId: 42,
    jobTitle: "Java Backend Engineer (Junior Tier-1)",
    candidateId: 8921,
    candidateName: "Nguyễn Văn An",
    candidateEmail: "an.nguyen.dev@gmail.com",
    stageId: 3,
    status: "ASSESSMENT",
    source: "CAREER_SITE",
    referralCode: null,
    tags: "java,backend",
    assigneeName: "HR TechViet",
    archived: false,
    duplicate: false,
    // Deadline = createdAt + acceptWindowMs ≈ 02 ngày 14:18:25 from page load (matches Stitch mock).
    createdAt: new Date().toISOString(),
    jobLocation: "Hà Nội",
    jobDepartment: "Engineering",
    jobWorkMode: "Hybrid",
    jobEmploymentType: "FULL_TIME",
  },
];

export const mockInvitationAssessments: AvailableAssessment[] = [
  {
    id: 2,
    title: "Đánh giá Năng lực Kỹ thuật Java Backend — Junior",
    description:
      "Bài kiểm tra chuẩn TechTrack v2.1: Java Core, Collections, Spring Framework và RESTful API. 18 trắc nghiệm + 2 code snippet.",
    durationMinutes: 30,
    passingScore: 60,
    submissionId: null,
    submissionStatus: "NOT_STARTED",
  },
];
