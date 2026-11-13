import { t as globalT, type TranslateFn } from "@/i18n";
import type { CandidateInterview } from "../api/candidateInterviewApi";

export const MOCK_INTERVIEW_ID = -1;
const CREATED_AT = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
const AVAILABLE_FROM = new Date().toISOString();
const AVAILABLE_UNTIL = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString();

export function getMockInterviewInvitation(
  t: TranslateFn = globalT,
): CandidateInterview {
  const stageTechnical = t("candidate.assess.interviews.mockInvitation.stageTechnical");
  const stageProblemSolving = t("candidate.assess.interviews.mockInvitation.stageProblemSolving");
  const stagePractical = t("candidate.assess.interviews.mockInvitation.stagePractical");

  return {
    id: MOCK_INTERVIEW_ID,
    applicationId: 1024,
    jobId: 128,
    jobTitle: "Senior Backend Engineer",
    candidateId: null,
    workflowStageId: null,
    status: "QUESTIONS_READY",
    createdAt: CREATED_AT,
    availableFrom: AVAILABLE_FROM,
    availableUntil: AVAILABLE_UNTIL,
    startedAt: null,
    completedAt: null,
    overallScore: null,
    passingScore: 70,
    errorMessage: null,
    questionCount: 12,
    durationMinutes: 45,
    maxAttempts: 1,
    attemptNumber: 1,
    canRetry: false,
    roadmap: [
      { title: stageTechnical, kind: "MCQ", questionCount: 2 },
      { title: stageProblemSolving, kind: "OPEN", questionCount: 2 },
      { title: stagePractical, kind: "OPEN", questionCount: 1 },
    ],
    questions: [
      {
        id: -101,
        aiInterviewId: MOCK_INTERVIEW_ID,
        questionOrder: 1,
        questionType: "MCQ",
        createdAt: AVAILABLE_FROM,
        answer: null,
        stageTitle: stageTechnical,
        skills: ["Java", "Spring Boot"],
        competencies: ["TECHNICAL_KNOWLEDGE"],
        questionText: t("candidate.assess.interviews.mockInvitation.q1Text"),
        options: ["@RestController", "@Service", "@Repository", "@Configuration"],
      },
      {
        id: -102,
        aiInterviewId: MOCK_INTERVIEW_ID,
        questionOrder: 2,
        questionType: "MCQ",
        createdAt: AVAILABLE_FROM,
        answer: null,
        stageTitle: stageTechnical,
        skills: ["Database", "Multi-tenant"],
        competencies: ["TECHNICAL_KNOWLEDGE"],
        questionText: t("candidate.assess.interviews.mockInvitation.q2Text"),
        options: [
          t("candidate.assess.interviews.mockInvitation.q2Opt1"),
          t("candidate.assess.interviews.mockInvitation.q2Opt2"),
          t("candidate.assess.interviews.mockInvitation.q2Opt3"),
          t("candidate.assess.interviews.mockInvitation.q2Opt4"),
        ],
      },
      {
        id: -103,
        aiInterviewId: MOCK_INTERVIEW_ID,
        questionOrder: 3,
        questionType: "OPEN",
        createdAt: AVAILABLE_FROM,
        answer: null,
        stageTitle: stageProblemSolving,
        skills: ["System Design", "Redis"],
        competencies: ["PROBLEM_SOLVING"],
        questionText: t("candidate.assess.interviews.mockInvitation.q3Text"),
      },
      {
        id: -104,
        aiInterviewId: MOCK_INTERVIEW_ID,
        questionOrder: 4,
        questionType: "OPEN",
        createdAt: AVAILABLE_FROM,
        answer: null,
        stageTitle: stageProblemSolving,
        skills: ["RabbitMQ", "Reliability"],
        competencies: ["PROBLEM_SOLVING"],
        questionText: t("candidate.assess.interviews.mockInvitation.q4Text"),
      },
      {
        id: -105,
        aiInterviewId: MOCK_INTERVIEW_ID,
        questionOrder: 5,
        questionType: "OPEN",
        createdAt: AVAILABLE_FROM,
        answer: null,
        stageTitle: stagePractical,
        skills: ["Leadership", "Delivery"],
        competencies: ["PRACTICAL_EXPERIENCE"],
        questionText: t("candidate.assess.interviews.mockInvitation.q5Text"),
      },
    ],
  };
}
