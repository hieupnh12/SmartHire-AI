export type Notification = {
  id: number;
  type: string;
  title: string;
  body: string | null;
  payloadJson: string | null;
  readAt: string | null;
  createdAt: string;
};

export type NotificationCategory = "AI_INTERVIEW" | "ASSESSMENT" | "HUMAN_INTERVIEW";

export type NotificationPreference = {
  category: NotificationCategory;
  webEnabled: boolean;
  emailEnabled: boolean;
};
