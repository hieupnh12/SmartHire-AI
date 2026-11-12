import { z } from "zod";
import { t as globalT, type TranslateFn } from "@/i18n";

export const codingLanguages = ["java", "python", "javascript", "cpp", "sql"] as const;
export type CodingLanguage = (typeof codingLanguages)[number];

export function createRubricSchema(t: TranslateFn = globalT) {
  return z
    .object({
      category: z.enum(["ESSAY_CONCEPTUAL", "ESSAY_COMPARISON", "ESSAY_SCENARIO", "ESSAY_ARCHITECTURE"]).optional(),
      referenceAnswer: z.string().trim().min(1, t("recruiter.assessments.coding.validation.referenceAnswerRequired")),
      minWords: z.number().int().min(0).max(10000).optional(),
      criteria: z
        .array(
          z.object({
            name: z.string().trim().optional(),
            guide: z.string().trim().optional(),
            description: z.string().trim().min(1, t("recruiter.assessments.coding.validation.criterionRequired")),
            weight: z.number().int().min(1).max(100),
            keywords: z.array(z.string()).optional(),
          }),
        )
        .min(1)
        .max(20),
    })
    .refine(
      (value) => value.criteria.reduce((sum, item) => sum + item.weight, 0) === 100,
      t("recruiter.assessments.coding.validation.rubricSum100"),
    );
}

const templates = z.record(z.enum(codingLanguages), z.string().max(10000));

export function createCodingSchema(t: TranslateFn = globalT) {
  return z
    .object({
      title: z.string().trim().max(255).optional(),
      constraints: z.string().trim().max(5000).optional(),
      category: z.enum(["CODING_ALGORITHM", "CODING_OOP", "SQL_QUERY"]),
      timeLimitMs: z.number().int().min(100).max(10000),
      memoryMb: z.number().int().min(32).max(512),
      starterCode: templates,
      harness: templates,
      testCases: z
        .array(
          z.object({
            input: z.string().max(10000),
            expectedOutput: z.string().max(10000),
            sample: z.boolean(),
            weight: z.number().min(0.01).max(100).optional(),
            explanation: z.string().trim().max(5000).optional(),
          }),
        )
        .min(2)
        .max(50),
    })
    .refine(
      (value) =>
        Object.keys(value.starterCode).length > 0 &&
        Object.keys(value.starterCode).every((language) =>
          value.harness[language as CodingLanguage]?.includes("{{SOURCE}}"),
        ),
      t("recruiter.assessments.coding.validation.harnessMustIncludeSource"),
    )
    .refine(
      (value) => value.testCases.some((test) => test.sample) && value.testCases.some((test) => !test.sample),
      t("recruiter.assessments.coding.validation.needPublicAndHiddenTests"),
    )
    .superRefine((value, context) => {
      const weighted = value.testCases.some((test) => test.weight != null);
      if (!weighted) return;
      const hidden = value.testCases.filter((test) => !test.sample);
      if (hidden.length < 2) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["testCases"],
          message: t("recruiter.assessments.coding.validation.needTwoHiddenWeighted"),
        });
        return;
      }
      if (hidden.some((test) => test.weight == null || test.weight <= 0)) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["testCases"],
          message: t("recruiter.assessments.coding.validation.hiddenWeightPositive"),
        });
        return;
      }
      const total = hidden.reduce((sum, test) => sum + (test.weight ?? 0), 0);
      if (Math.abs(total - 100) > 0.001) {
        context.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["testCases"],
          message: t("recruiter.assessments.coding.validation.hiddenWeightSum100", {
            total: Number(total.toFixed(2)),
          }),
        });
      }
    });
}

export const rubricSchema = createRubricSchema(globalT);
export const codingSchema = createCodingSchema(globalT);

export function contentError(error: unknown, t: TranslateFn = globalT): string {
  return error instanceof z.ZodError
    ? error.issues[0]?.message ?? t("recruiter.assessments.coding.validation.invalidContent")
    : t("recruiter.assessments.coding.validation.invalidConfigFallback");
}
