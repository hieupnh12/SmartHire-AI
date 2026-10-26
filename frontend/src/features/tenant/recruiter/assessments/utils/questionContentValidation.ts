import { z } from "zod";

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

const templates = z.record(z.enum(["java", "python", "javascript", "sql"]), z.string().max(10000));
export const codingSchema = z.object({
  title: z.string().trim().max(255).optional(),
  category: z.enum(["CODING_ALGORITHM", "CODING_OOP", "SQL_QUERY"]),
  timeLimitMs: z.number().int().min(100).max(10000), memoryMb: z.number().int().min(32).max(512),
  starterCode: templates, harness: templates,
  testCases: z.array(z.object({
    input: z.string().max(10000),
    expectedOutput: z.string().max(10000),
    sample: z.boolean(),
    weight: z.number().min(0).max(100).optional()
  })).min(2).max(50),
}).refine(value => Object.keys(value.starterCode).length > 0 && Object.keys(value.starterCode).every(language => value.harness[language as keyof typeof value.harness]?.includes("{{SOURCE}}")), "Mỗi ngôn ngữ cần chương trình kiểm thử có {{SOURCE}}.")
  .refine(value => value.testCases.some(test => test.sample) && value.testCases.some(test => !test.sample), "Cần ít nhất một test công khai và một test ẩn.")
  .refine(value => {
    const hidden = value.testCases.filter(t => !t.sample);
    const hasWeight = hidden.some(t => t.weight !== undefined && t.weight !== null);
    if (!hasWeight) return true;
    return hidden.every(t => (t.weight ?? 0) > 0) && Math.abs(hidden.reduce((sum, t) => sum + (t.weight ?? 0), 0) - 100) < 0.01;
  }, "Tổng trọng số các test ẩn phải bằng 100%.");

export function contentError(error: unknown): string {
  return error instanceof z.ZodError ? error.issues[0]?.message ?? "Nội dung không hợp lệ." : "Cấu hình không hợp lệ. Kiểm tra rubric/test cases.";
}
