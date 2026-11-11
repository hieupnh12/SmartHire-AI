import type { Question } from "@/api/types/assessment";
import { t as globalT, type TranslateFn } from "@/i18n";

export function getCodingPreviewQuestion(t: TranslateFn = globalT): Question {
  return {
    id: 9104,
    questionText: t("recruiter.assessments.preview.essayBank.q4Text"),
    questionType: "CODING",
    points: 40,
    questionOrder: 3,
    difficulty: "Medium",
    skill: "JavaScript",
    explanation: null,
    options: [],
    coding: {
      category: "CODING_ALGORITHM",
      timeLimitMs: 2000,
      memoryMb: 128,
      starterCode: { javascript: "function uniqueEmails(emails) {\n  // Normalize and deduplicate emails.\n  return [];\n}" },
      harness: { javascript: "{{SOURCE}}\nconst fs = require('fs');\nconst emails = JSON.parse(fs.readFileSync(0, 'utf8'));\nconsole.log(JSON.stringify(uniqueEmails(emails)));" },
      testCases: [
        { input: '[" A@EXAMPLE.COM ","a@example.com","b@example.com"]', expectedOutput: '["a@example.com","b@example.com"]', sample: true },
        { input: '[" ","B@EXAMPLE.COM"," b@example.com ",""]', expectedOutput: '["b@example.com"]', sample: true },
        { input: '[]', expectedOutput: '[]', sample: false },
        { input: '["x@example.com","Y@example.com"," X@example.com "]', expectedOutput: '["x@example.com","y@example.com"]', sample: false },
        { input: '["","  "," Z@example.com ","z@example.com"]', expectedOutput: '["z@example.com"]', sample: false },
      ],
    },
  };
}

export function getEssayPreviewBank(t: TranslateFn = globalT): Question[] {
  return [
    {
      id: 9101,
      questionText: t("recruiter.assessments.preview.essayBank.q1Text"),
      questionType: "MCQ",
      points: 10,
      questionOrder: 0,
      difficulty: "Easy",
      skill: "Spring Boot",
      explanation: null,
      options: [
        { id: 1, optionText: t("recruiter.assessments.preview.essayBank.q1Opt1"), correct: true },
        { id: 2, optionText: t("recruiter.assessments.preview.essayBank.q1Opt2"), correct: false },
      ],
    },
    {
      id: 9102,
      questionText: t("recruiter.assessments.preview.essayBank.q2Text"),
      questionType: "ESSAY",
      points: 20,
      questionOrder: 1,
      difficulty: "Medium",
      skill: "Spring Security",
      explanation: null,
      options: [],
      rubricJson: {
        category: "ESSAY_CONCEPTUAL",
        referenceAnswer: t("recruiter.assessments.preview.essayBank.q2Ref"),
        criteria: [
          { description: t("recruiter.assessments.preview.essayBank.q2Crit1"), weight: 40 },
          { description: t("recruiter.assessments.preview.essayBank.q2Crit2"), weight: 30 },
          { description: t("recruiter.assessments.preview.essayBank.q2Crit3"), weight: 30 },
        ],
      },
    },
    {
      id: 9103,
      questionText: t("recruiter.assessments.preview.essayBank.q3Text"),
      questionType: "ESSAY",
      points: 30,
      questionOrder: 2,
      difficulty: "Hard",
      skill: "RabbitMQ",
      explanation: null,
      options: [],
      rubricJson: {
        category: "ESSAY_SCENARIO",
        referenceAnswer: t("recruiter.assessments.preview.essayBank.q3Ref"),
        criteria: [
          { description: t("recruiter.assessments.preview.essayBank.q3Crit1"), weight: 40 },
          { description: t("recruiter.assessments.preview.essayBank.q3Crit2"), weight: 40 },
          { description: t("recruiter.assessments.preview.essayBank.q3Crit3"), weight: 20 },
        ],
      },
    },
    getCodingPreviewQuestion(t),
  ];
}

export const codingPreviewAnswer =
  "function uniqueEmails(emails) {\n  const normalized = emails.map(email => email.trim().toLowerCase());\n  return [...new Set(normalized.filter(email => email.length > 0))];\n}";

export function getEssayPreviewAnswer(t: TranslateFn = globalT): string {
  return t("recruiter.assessments.preview.essayBank.essaySampleAnswer");
}

// Fixed illustrative feedback; this preview never calls an AI provider.
export function getEssayPreviewFeedback(t: TranslateFn = globalT) {
  return [
    { percent: 95, feedback: t("recruiter.assessments.preview.essayBank.fb1") },
    { percent: 85, feedback: t("recruiter.assessments.preview.essayBank.fb2") },
    { percent: 90, feedback: t("recruiter.assessments.preview.essayBank.fb3") },
  ];
}
