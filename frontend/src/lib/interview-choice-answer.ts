export function parseChoiceAnswer(value: string | null | undefined): { selectedOptions: number[]; explanation: string } {
  if (!value) return { selectedOptions: [], explanation: "" };
  try {
    const parsed: unknown = JSON.parse(value);
    if (typeof parsed === "number") return { selectedOptions: [parsed], explanation: "" };
    if (parsed && typeof parsed === "object" && "selectedOptions" in parsed && Array.isArray(parsed.selectedOptions)) {
      return { selectedOptions: parsed.selectedOptions.filter((item): item is number => typeof item === "number"),
        explanation: "explanation" in parsed && typeof parsed.explanation === "string" ? parsed.explanation : "" };
    }
  } catch { /* An unanswered or legacy answer has no structured selection. */ }
  return { selectedOptions: [], explanation: "" };
}
