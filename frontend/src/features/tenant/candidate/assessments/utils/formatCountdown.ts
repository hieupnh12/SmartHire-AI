export function maskPhone(phone?: string | null): string {
  const digits = (phone ?? "").replace(/\D/g, "");
  if (digits.length < 7) return "—";
  return `${digits.slice(0, 4)} *** ${digits.slice(-3)}`;
}
