export function questionBankLocalKeys(tenantId: string, userId: number | undefined) {
  const scope = `${tenantId}:${userId ?? "session"}`;
  return { scope: `smarthire:question-bank:${scope}`, draft: `smarthire:general-bank-draft:${scope}` };
}

export function loadBankDraft<T>(key: string, fallback: T): T {
  try { return (JSON.parse(sessionStorage.getItem(key) ?? "null") as T | null) ?? fallback; }
  catch { return fallback; }
}
