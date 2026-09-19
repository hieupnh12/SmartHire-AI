import type { RankingBoard } from "../types/ranking";

const candidates = [
  { id: 101, name: "Nguyễn Văn An", status: "INTERVIEW", rank: 1, skills: 94, experience: 88, assessment: 91, interview: 96 },
  { id: 102, name: "Trần Khánh Linh", status: "ASSESSMENT", rank: 2, skills: 91, experience: 84, assessment: 89, interview: 90 },
  { id: 103, name: "Lê Hoàng Nam", status: "IN_REVIEW", rank: 3, skills: 86, experience: 92, assessment: 82, interview: 87 },
  { id: 104, name: "Phạm Minh Đức", status: "IN_REVIEW", rank: 4, skills: 79, experience: 81, assessment: 84, interview: 73 },
  { id: 105, name: "Đặng Thu Hà", status: "NEW", rank: 5, skills: 74, experience: 80, assessment: 70, interview: 75 },
];

export const PREVIEW_JOB_ID = 9001;

export const rankingPreview: RankingBoard = {
  jobId: PREVIEW_JOB_ID,
  jobTitle: "Java Backend Developer (Mid–Senior)",
  rankingVersion: "rank-v1:preview",
  calculatedAt: new Date().toISOString(),
  skillCategories: ["backend", "database", "devops"],
  config: {
    weights: { skills: 35, experience: 15, assessment: 30, interview: 20 },
    groups: { backend: 50, database: 25, devops: 25 },
    requiredExperienceMonths: 36,
    revision: 4,
  },
  rows: candidates.map((candidate) => {
    const score = Number(((candidate.skills * 35 + candidate.experience * 15 + candidate.assessment * 30 + candidate.interview * 20) / 100).toFixed(2));
    return {
      applicationId: candidate.id,
      candidateName: candidate.name,
      status: candidate.status,
      rank: candidate.rank,
      result: {
        score,
        availableWeight: 100,
        completedComponents: 4,
        requiredComponents: 4,
        cohort: "skills+experience+assessment+interview",
        complete: true,
        components: [
          { key: "skills", score: candidate.skills, weight: 35, contribution: candidate.skills * 0.35, state: "READY" },
          { key: "experience", score: candidate.experience, weight: 15, contribution: candidate.experience * 0.15, state: "READY" },
          { key: "assessment", score: candidate.assessment, weight: 30, contribution: candidate.assessment * 0.3, state: "READY" },
          { key: "interview", score: candidate.interview, weight: 20, contribution: candidate.interview * 0.2, state: "READY" },
        ],
      },
      groups: [
        { category: "backend", weight: 50, score: candidate.skills, coverage: candidate.skills, matches: [
          { requiredSkill: "Java", candidateSkill: "Java", similarity: 1, required: true, evidence: "Java, Spring Boot, REST API" },
          { requiredSkill: "Spring Boot", candidateSkill: "Spring Boot", similarity: 1, required: true, evidence: "Phát triển microservices với Spring Boot" },
        ] },
      ],
      missingRequired: [],
      experienceMonths: Math.round(candidate.experience * 0.6),
      experienceEvidence: ["Kinh nghiệm backend Java và kiến trúc microservices."],
      notices: ["PREVIEW_DATA"],
      sources: { cvId: candidate.id + 1000, attemptId: candidate.id + 2000, interviewId: candidate.id + 3000 },
      interviewFeedback: "Giao tiếp rõ ràng, có tư duy hệ thống và xử lý tình huống tốt.",
    };
  }),
};
