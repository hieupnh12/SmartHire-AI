export type Notification = {
  id: number;
  type: string;
  title: string;
  body: string | null;
  payloadJson: string | null;
  readAt: string | null;
  createdAt: string;
};
