export function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(safe / 86_400);
  const hours = Math.floor((safe % 86_400) / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(days)} ngày ${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

export function formatDeadline(date: Date): string {
  const time = date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false });
  const day = date.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
  return `Hạn chót: ${time} • ${day}`;
}

export function maskPhone(phone?: string | null): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length < 7) return "—";
  return `${digits.slice(0, 4)} *** ${digits.slice(-3)}`;
}
