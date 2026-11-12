const SAFE_PATH = /^\/(?:meet\/human\/\d+|interviews\/\d+|assessments(?:\/\d+\/(?:take|invite))?|interview-schedules|schedules|applications(?:\/\d+)?|internal\/admin(?:\/(?:billing|company|analytics|users|roles|recruitment|system|account))?|recruiter\/(?:schedules|notifications)|recruiter\/jobs\/\d+(?:\/(?:interviews|applicants|rank(?:ings)?(?:\/\d+)?|notifications|ai-interviews|assessments|cvs))?)(?:\?[\w=&%-]*)?$/;

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
