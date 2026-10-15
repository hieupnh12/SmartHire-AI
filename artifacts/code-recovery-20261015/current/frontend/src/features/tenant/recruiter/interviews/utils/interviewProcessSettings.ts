import type { AiInterview, InterviewProcessConfig } from "@/api/types/aiInterview";

export const AVAILABLE_INTERVIEW_PROCESS = "COMMUNICATION";

const defaults: Record<InterviewProcessConfig["key"], Record<string, unknown>> = {
  TECHNICAL_KNOWLEDGE: { questionCount: 10, questionFormat: "mixed", difficulty: "adaptive", randomizeOptions: true, allowMultipleCorrectAnswers: true, explanationRequired: true, showCorrectAnswer: true, showExplanationAfterInterview: true },
  PROBLEM_SOLVING: { questionCount: 2, problemStyle: "mixed", difficulty: "adaptive", complexity: "medium", requireSolution: true, requireExplanation: true, allowHint: false, followUpEnabled: true, maxFollowUp: 2, responseMode: "text" },
  PRACTICAL_EXPERIENCE: { questionCount: 3, responseMode: "speech", experienceDepth: "standard", followUpEnabled: true, maxFollowUp: 2, askRealExample: true, askCandidateRole: true, askChallenges: true, askResult: true, verifyAgainstCV: true },
  TECHNICAL_REASONING: { questionCount: 3, responseMode: "speech", scenarioComplexity: "medium", requireJustification: true, askAlternatives: true, askTradeOffs: true, challengeCandidateAnswer: true, followUpEnabled: true, followUpDepth: 2 },
  BEHAVIORAL_SITUATIONAL: { questionCount: 4, responseMode: "speech", followUpEnabled: true, maxFollowUp: 2, requireRealExample: true, askAction: true, askResult: true, askReflection: true },
  COMMUNICATION: { questionCount: 3, responseMode: "speech", language: "English", followUpEnabled: true, maxFollowUp: 1, adaptiveQuestions: true, speechSignals: true, realTimeInteraction: false, recordAudio: true, generateTranscript: true, technicalExplanationTask: true, nonTechnicalExplanationTask: true },
};

export function normalizeProcesses(processes: InterviewProcessConfig[]): InterviewProcessConfig[] {
  return defaultProcesses().map(fallback => processes.find(process => process.key === fallback.key) ?? fallback).map((process, index) => {
    const base = defaults[process.key];
    const config = Object.fromEntries(Object.entries(base).map(([key, fallback]) => {
      const value = (key === "questionCount"
        ? process.config.questionCount ?? process.config.problemCount ?? process.config.mainQuestionCount ?? process.config.scenarioCount ?? process.config.conversationTopics
        : process.config[key]) ?? fallback;
      return [key, typeof fallback === "number" ? Number(value) : typeof fallback === "boolean" ? value === true || value === "true" : String(value)];
    }));
    // These controls are explicitly marked unavailable in the form.
    if (process.key === AVAILABLE_INTERVIEW_PROCESS) { config.realTimeInteraction = false; }
    return { ...process, order: index + 1, enabled: process.key === AVAILABLE_INTERVIEW_PROCESS, weight: process.key === AVAILABLE_INTERVIEW_PROCESS ? 100 : 0, config };
  });
}

export function defaultProcesses(): InterviewProcessConfig[] {
  return Object.entries(defaults).map(([key, config], index) => ({ key: key as InterviewProcessConfig["key"], enabled: key === AVAILABLE_INTERVIEW_PROCESS, order: index + 1, weight: key === AVAILABLE_INTERVIEW_PROCESS ? 100 : 0, config: { ...config } }));
}

export function processCount(processes: InterviewProcessConfig[]) {
  return processes.filter(process => process.enabled).reduce((sum, process) => sum + Number(process.config.questionCount), 0);
}

export function visibleInterviewDetails(interview: AiInterview): AiInterview {
  const roadmap = interview.roadmap?.filter(step => step.title.trim().toUpperCase() === AVAILABLE_INTERVIEW_PROCESS);
  const questions = interview.questions.filter(question => question.stageTitle
    ? question.stageTitle.trim().toUpperCase() === AVAILABLE_INTERVIEW_PROCESS
    : question.questionType.toUpperCase() === AVAILABLE_INTERVIEW_PROCESS);
  return { ...interview, roadmap, questions,
    questionCount: roadmap?.length ? roadmap.reduce((total, step) => total + step.questionCount, 0)
      : questions.filter(question => question.questionRole !== "FOLLOW_UP").length };
}
