const RECONNECT_MS = 5_000;
const CLOSE_DEBOUNCE_MS = 50;

type NotificationChannel = {
  token: string;
  socket: WebSocket | null;
  listeners: Set<() => void>;
  retry: number | undefined;
  closeTimer: number | undefined;
};
let channel: NotificationChannel | null = null;

function resolveWsBase(): string {
  return (
    import.meta.env.VITE_WS_BASE_URL ??
    (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api/v1")
      .replace(/\/api\/v1\/?$/, "")
      .replace(/^http/, "ws")
  );
}

/**
 * Closes a WebSocket without triggering Chromium's
 * "WebSocket is closed before the connection is established" error when cleanup runs mid-handshake.
 */
export function closeSocketSafely(ws: WebSocket | null | undefined): void {
  if (!ws) return;
  ws.onmessage = null;
  ws.onclose = null;
  ws.onerror = null;

  if (ws.readyState === WebSocket.OPEN) {
    ws.close();
    return;
  }

  if (ws.readyState === WebSocket.CONNECTING) {
    const controller = new AbortController();
    ws.addEventListener(
      "open",
      () => {
        controller.abort();
        ws.close();
      },
      { once: true, signal: controller.signal }
    );
    ws.addEventListener("close", () => controller.abort(), {
      once: true,
      signal: controller.signal,
    });
  }
}

function openChannel(target: NotificationChannel) {
  const wsBase = resolveWsBase();
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
  window.clearTimeout(current.closeTimer);
  window.clearTimeout(current.retry);
  closeSocketSafely(current.socket);
  current.socket = null;
}

/** SCHED-02: one shared /ws/notifications socket per tab; the server only signals that the inbox changed. */
export function subscribeNotifications(token: string, onChange: () => void): () => void {
  if (channel && channel.token !== token) closeChannel();
  if (!channel) {
    channel = { token, socket: null, listeners: new Set(), retry: undefined, closeTimer: undefined };
    openChannel(channel);
  }
  const current = channel;
  if (current.closeTimer !== undefined) {
    window.clearTimeout(current.closeTimer);
    current.closeTimer = undefined;
  }
  current.listeners.add(onChange);
  return () => {
    current.listeners.delete(onChange);
    if (channel === current && current.listeners.size === 0 && current.closeTimer === undefined) {
      current.closeTimer = window.setTimeout(() => {
        if (channel === current && current.listeners.size === 0) closeChannel();
      }, CLOSE_DEBOUNCE_MS);
    }
  };
}

export type RankingUpdatedMessage = { type: "ranking.updated"; jobId: number; rankingVersion: string; occurredAt: string };

export function createRankingSocket(token: string, onUpdate: (message: RankingUpdatedMessage) => void): WebSocket | null {
  const wsBase = resolveWsBase();
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
