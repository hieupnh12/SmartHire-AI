export type CalendarEventKind = "APPLICATION" | "STATUS" | "AI_INTERVIEW" | "DEADLINE" | "HUMAN_INTERVIEW" | "CANCELLED";

export type CalendarEvent = {
  id: string;
  kind: CalendarEventKind;
  at: Date;
  end?: Date;
  title: string;
  detail?: string;
  jobId: number;
  jobTitle: string;
  link: string;
};
