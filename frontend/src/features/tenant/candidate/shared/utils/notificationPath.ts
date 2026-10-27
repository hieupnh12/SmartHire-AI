const SAFE_PATH = /^\/(?:interviews\/\d+|assessments(?:\/\d+\/take)?|interview-schedules|schedules|applications(?:\/\d+)?|recruiter\/jobs\/\d+\/(?:interviews|applicants|rankings|notifications))(?:\?[\w=&%-]*)?$/;

export function notificationPath(payload: string | null): string | null {
  try {
    const value: unknown = JSON.parse(payload ?? "{}");
    if (typeof value === "object" && value !== null && "path" in value && typeof value.path === "string") {
      const path = value.path.replace(/^\/candidate(?=\/)/, "");
      return SAFE_PATH.test(path) ? path : null;
    }
  } catch { /* Notifications without a valid link remain readable. */ }
  return null;
}
