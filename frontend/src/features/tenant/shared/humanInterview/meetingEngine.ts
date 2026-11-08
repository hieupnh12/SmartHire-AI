import { getTenantIdFromWindow } from "@/lib/tenant";

/** `peerjs` = in-app WebRTC (default). `jitsi` = embed (self-host / Jaas — not public meet.jit.si). */
export type HumanMeetingEngine = "peerjs" | "jitsi";

export function humanMeetingEngine(): HumanMeetingEngine {
  const value = (import.meta.env.VITE_HUMAN_MEETING_ENGINE as string | undefined)?.trim().toLowerCase();
  return value === "jitsi" ? "jitsi" : "peerjs";
}

export function jitsiDomain() {
  const value = (import.meta.env.VITE_JITSI_DOMAIN as string | undefined)?.trim();
  if (!value) return "meet.jit.si";
  return value.replace(/^https?:\/\//, "").replace(/\/$/, "");
}

/** Room id includes tenant so shared Jitsi does not collide across enterprises. */
export function jitsiRoomName(interviewId: number, jobId: number) {
  const tenant = (getTenantIdFromWindow() ?? "t").replace(/[^a-zA-Z0-9]/g, "").slice(0, 16);
  return `SH${tenant}J${jobId}I${interviewId}`.slice(0, 60);
}
