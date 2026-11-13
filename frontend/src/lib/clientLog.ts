import { getTenantIdFromWindow } from "./tenant";

interface ClientCrashPayload {
  error: Error | unknown;
  errorInfo?: { componentStack?: string | null } | null;
  action?: string;
  pageUrl?: string;
}

// In-memory cache to prevent infinite spam loops from re-renders (1 minute cooldown per error signature)
const sentErrorCache = new Map<string, number>();
const SPAM_COOLDOWN_MS = 60_000;

/**
 * Reports a frontend client crash / unhandled exception to the backend.
 * Uses keepalive fetch for reliability even during page unloads.
 */
export async function reportClientCrash(payload: ClientCrashPayload): Promise<void> {
  try {
    const errorObj = payload.error instanceof Error ? payload.error : new Error(String(payload.error || "Unknown"));
    const message = errorObj.message || "Unknown Frontend Error";
    const stackTrace = errorObj.stack || "";
    const componentStack = payload.errorInfo?.componentStack || "";

    // Generate unique signature for deduplication
    const signature = `${message}:${stackTrace.slice(0, 100)}`;
    const now = Date.now();
    const lastSent = sentErrorCache.get(signature);

    if (lastSent && now - lastSent < SPAM_COOLDOWN_MS) {
      // Cooldown active, skip to prevent spamming
      return;
    }
    sentErrorCache.set(signature, now);

    // Clean up stale cache items older than 5 minutes
    if (sentErrorCache.size > 50) {
      for (const [key, timestamp] of sentErrorCache.entries()) {
        if (now - timestamp > 300_000) {
          sentErrorCache.delete(key);
        }
      }
    }

    const tenantCode = getTenantIdFromWindow() || localStorage.getItem("tenantId") || "SYSTEM";
    const pageUrl = payload.pageUrl || (typeof window !== "undefined" ? window.location.pathname + window.location.search : "");
    const userAgent = typeof navigator !== "undefined" ? navigator.userAgent : "";

    const body = {
      tenantCode,
      action: payload.action || "REACT_CRASH",
      message,
      pageUrl,
      stackTrace: componentStack ? `${stackTrace}\n\nComponent Stack:\n${componentStack}` : stackTrace,
      userAgent,
      metadata: {
        timestamp: new Date().toISOString(),
        pathname: typeof window !== "undefined" ? window.location.pathname : "",
        componentStack: componentStack || undefined,
      },
    };

    const apiUrl = `${import.meta.env.VITE_API_BASE_URL ?? "/api/v1"}/public/logs/client-crash`;

    await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Tenant-ID": tenantCode,
      },
      body: JSON.stringify(body),
      keepalive: true,
    });
  } catch {
    // Failsafe: Never break the UI or throw exceptions inside error logging
  }
}
