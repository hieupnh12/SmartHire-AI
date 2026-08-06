/**
 * WebSocket client scaffold for SCHED-02.
 * Connect after JWT auth: ws://host/ws + STOMP/native protocol as BE implements.
 */
export type NotificationMessage = {
  type: string;
  title: string;
  body?: string;
  payload?: unknown;
};

type Handlers = {
  onMessage?: (msg: NotificationMessage) => void;
  onOpen?: () => void;
  onClose?: () => void;
};

export function createNotificationSocket(
  token: string,
  handlers: Handlers = {},
): WebSocket | null {
  const wsBase =
    import.meta.env.VITE_WS_BASE_URL ??
    (import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080/api/v1")
      .replace(/\/api\/v1\/?$/, "")
      .replace(/^http/, "ws");

  try {
    const ws = new WebSocket(`${wsBase}/ws/notifications?token=${encodeURIComponent(token)}`);
    ws.onopen = () => handlers.onOpen?.();
    ws.onclose = () => handlers.onClose?.();
    ws.onmessage = (ev) => {
      try {
        handlers.onMessage?.(JSON.parse(ev.data as string) as NotificationMessage);
      } catch {
        // ignore non-JSON
      }
    };
    return ws;
  } catch {
    return null;
  }
}
