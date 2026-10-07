export function InterviewIcon({ name, className = "text-[18px]" }: { name: string; className?: string }) { return <span className={`material-symbols-outlined ${className}`} aria-hidden="true">{name}</span>; }
export const roundLabels: Record<string, string> = { TECHNICAL: "Vòng 1: Kỹ thuật Chuyên sâu", CULTURE: "Vòng 2: Culture & Leadership Fit", EXECUTIVE: "Vòng 3: Phỏng vấn Ban Giám Đốc" };
export const localDate = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2,"0")}-${String(date.getDate()).padStart(2,"0")}`;
export const localTime = (date: Date) => `${String(date.getHours()).padStart(2,"0")}:${String(date.getMinutes()).padStart(2,"0")}`;
export { statusLabels, downloadInterview } from "@/components/ux/humanInterviewUtilities";
