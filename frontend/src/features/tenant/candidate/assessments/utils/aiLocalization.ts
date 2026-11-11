import { t as globalT, type TranslateFn } from "@/i18n";

/**
 * Localizes AI evaluation comments into the active UI locale (`vi`, `en`, `ja`).
 * Handles legacy English evaluation text stored in the database.
 */
const EXACT_MAPPINGS: [RegExp, (t: TranslateFn) => string][] = [
  [
    /The code correctly implements the arithmetic progression formula to calculate the sum from 1 to n in O\(1\) time complexity\. It is clean, concise, and optimal\./gi,
    (t) => t("candidate.assess.aiEval.arithmeticSumOptimal"),
  ],
  [
    /The code is extremely clean, well-structured, and contains no unnecessary boilerplate\./gi,
    (t) => t("candidate.assess.aiEval.extremelyClean"),
  ],
  [
    /The code correctly implements the formula to calculate the sum from 1 to n/gi,
    (t) => t("candidate.assess.aiEval.sumFormula"),
  ],
  [
    /The code correctly implements (.*)/gi,
    (t) => t("candidate.assess.aiEval.correctlyImplements", { subject: "$1" }),
  ],
  [
    /The code is clean, concise, and optimal\./gi,
    (t) => t("candidate.assess.aiEval.cleanConciseOptimal"),
  ],
  [
    /The code is clean, optimal, and follows good practices\./gi,
    (t) => t("candidate.assess.aiEval.cleanOptimalGoodPractices"),
  ],
  [
    /The code is well-structured and easy to read\./gi,
    (t) => t("candidate.assess.aiEval.wellStructuredReadable"),
  ],
  [
    /The solution is clean, concise, and optimal\./gi,
    (t) => t("candidate.assess.aiEval.solutionCleanConciseOptimal"),
  ],
  [
    /The solution is optimal\./gi,
    (t) => t("candidate.assess.aiEval.solutionOptimal"),
  ],
  [
    /The code contains no unnecessary boilerplate\./gi,
    (t) => t("candidate.assess.aiEval.noBoilerplate"),
  ],
  [
    /Naming conventions are clear and descriptive\./gi,
    (t) => t("candidate.assess.aiEval.namingClear"),
  ],
  [
    /Clean and well-structured\./gi,
    (t) => t("candidate.assess.aiEval.cleanStructured"),
  ],
  [
    /Time complexity is optimal\./gi,
    (t) => t("candidate.assess.aiEval.timeComplexityOptimal"),
  ],
  [
    /Space complexity is optimal\./gi,
    (t) => t("candidate.assess.aiEval.spaceComplexityOptimal"),
  ],
  [
    /No answer submitted/gi,
    (t) => t("candidate.assess.aiEval.noAnswerSubmitted"),
  ],
  [
    /Automatic grading unavailable\. Retry or review manually\./gi,
    (t) => t("candidate.assess.aiEval.autoGradingUnavailable"),
  ],
  [
    /All test cases passed successfully\./gi,
    (t) => t("candidate.assess.aiEval.allTestCasesPassed"),
  ],
  [
    /Good exception safety\./gi,
    (t) => t("candidate.assess.aiEval.goodExceptionSafety"),
  ],
];

export function localizeAiComment(
  text?: string | null,
  translate: TranslateFn = globalT,
): string {
  if (!text) return "";
  let s = text.trim();

  for (const [regex, resolve] of EXACT_MAPPINGS) {
    s = s.replace(regex, resolve(translate));
  }

  s = s.replace(
    /•\s*the code is extremely clean, well-structured, and contains no unnecessary boilerplate\./gi,
    `• ${translate("candidate.assess.aiEval.extremelyClean")}`,
  );
  s = s.replace(
    /•\s*the code is/gi,
    translate("candidate.assess.aiEval.bulletCodeIs"),
  );

  return s;
}
