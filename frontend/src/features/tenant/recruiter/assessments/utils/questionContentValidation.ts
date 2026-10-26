import { z } from "zod";

export const codingLanguages = ["java", "python", "javascript", "cpp", "sql"] as const;
export type CodingLanguage = (typeof codingLanguages)[number];

export const rubricSchema = z.object({
  category: z.enum(["ESSAY_CONCEPTUAL", "ESSAY_COMPARISON", "ESSAY_SCENARIO", "ESSAY_ARCHITECTURE"]).optional(),
  referenceAnswer: z.string().trim().min(1, "Nhập đáp án tham khảo."),
  minWords: z.number().int().min(0).max(10000).optional(),
  criteria: z.array(z.object({
    name: z.string().trim().optional(),
    guide: z.string().trim().optional(),
    description: z.string().trim().min(1, "Nhập tiêu chí."),
    weight: z.number().int().min(1).max(100),
    keywords: z.array(z.string()).optional()
  })).min(1).max(20),
}).refine(value => value.criteria.reduce((sum, item) => sum + item.weight, 0) === 100, "Tổng tỉ trọng tiêu chí phải bằng 100%.");

const templates = z.record(z.enum(codingLanguages), z.string().max(10000));
export const codingSchema = z.object({
  title: z.string().trim().max(255).optional(),
  constraints: z.string().trim().max(5000).optional(),
  category: z.enum(["CODING_ALGORITHM", "CODING_OOP", "SQL_QUERY"]),
  timeLimitMs: z.number().int().min(100).max(10000), memoryMb: z.number().int().min(32).max(512),
  starterCode: templates, harness: templates,
  testCases: z.array(z.object({
    input: z.string().max(10000),
    expectedOutput: z.string().max(10000),
    sample: z.boolean(),
    weight: z.number().min(0.01).max(100).optional(),
    explanation: z.string().trim().max(5000).optional(),
  })).min(2).max(50),
}).refine(value => Object.keys(value.starterCode).length > 0 && Object.keys(value.starterCode).every(language => value.harness[language as CodingLanguage]?.includes("{{SOURCE}}")), "Mỗi ngôn ngữ cần chương trình kiểm thử có {{SOURCE}}.")
  .refine(value => value.testCases.some(test => test.sample) && value.testCases.some(test => !test.sample), "Cần ít nhất một test công khai và một test ẩn.")
  .superRefine((value, context) => {
    const weighted = value.testCases.some(test => test.weight != null);
    if (!weighted) return;
    const hidden = value.testCases.filter(test => !test.sample);
    if (hidden.length < 2) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["testCases"], message: "Chấm theo trọng số cần ít nhất hai test ẩn." });
      return;
    }
    if (hidden.some(test => test.weight == null || test.weight <= 0)) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["testCases"], message: "Khi dùng trọng số, mọi test ẩn phải có trọng số > 0." });
      return;
    }
    const total = hidden.reduce((sum, test) => sum + (test.weight ?? 0), 0);
    if (Math.abs(total - 100) > 0.001) {
      context.addIssue({ code: z.ZodIssueCode.custom, path: ["testCases"], message: `Tổng trọng số test ẩn phải bằng 100% (hiện tại ${Number(total.toFixed(2))}%).` });
    }
  });

export function contentError(error: unknown): string {
  return error instanceof z.ZodError ? error.issues[0]?.message ?? "Nội dung không hợp lệ." : "Cấu hình không hợp lệ. Kiểm tra rubric/test cases.";
}
