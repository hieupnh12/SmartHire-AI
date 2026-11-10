const RECONNECT_MS = 5_000;

type NotificationChannel = { token: string; socket: WebSocket | null; listeners: Set<() => void>; retry: number | undefined };
let channel: NotificationChannel | null = null;

function openChannel(target: NotificationChannel) {
  const wsBase = import.meta.env.VITE_WS_BASE_URL ??
    (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api/v1").replace(/\/api\/v1\/?$/, "").replace(/^http/, "ws");
  try {
    const ws = new WebSocket(`${wsBase}/ws/notifications?token=${encodeURIComponent(target.token)}`);
    ws.onmessage = (event) => {
      try {
        if ((JSON.parse(event.data as string) as { type?: string }).type === "notifications.changed") target.listeners.forEach((listener) => listener());
      } catch { /* Ignore malformed messages. */ }
    };
    ws.onclose = () => {
      if (channel !== target) return;
      target.socket = null;
      target.retry = window.setTimeout(() => { if (channel === target) openChannel(target); }, RECONNECT_MS);
    };
    target.socket = ws;
  } catch {
    target.socket = null;
  }
}

function closeChannel() {
  if (!channel) return;
  const current = channel;
  channel = null;
  window.clearTimeout(current.retry);
  current.socket?.close();
}

/** SCHED-02: one shared /ws/notifications socket per tab; the server only signals that the inbox changed. */
export function subscribeNotifications(token: string, onChange: () => void): () => void {
  if (channel && channel.token !== token) closeChannel();
  if (!channel) {
    channel = { token, socket: null, listeners: new Set(), retry: undefined };
    openChannel(channel);
  }
  const current = channel;
  current.listeners.add(onChange);
  return () => {
    current.listeners.delete(onChange);
    if (channel === current && current.listeners.size === 0) closeChannel();
  };
}

export type RankingUpdatedMessage = { type: "ranking.updated"; jobId: number; rankingVersion: string; occurredAt: string };

export function createRankingSocket(token: string, onUpdate: (message: RankingUpdatedMessage) => void): WebSocket | null {
  const wsBase = import.meta.env.VITE_WS_BASE_URL ??
    (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api/v1").replace(/\/api\/v1\/?$/, "").replace(/^http/, "ws");
  try {
    const ws = new WebSocket(`${wsBase}/ws/rankings?token=${encodeURIComponent(token)}`);
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data as string) as RankingUpdatedMessage;
        if (message.type === "ranking.updated") onUpdate(message);
      } catch { /* Ignore malformed messages. */ }
    };
    return ws;
  } catch { return null; }
}
