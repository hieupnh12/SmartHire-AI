import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { assessmentApi } from "@/api/tenant/assessmentApi";
import type { Submission } from "@/api/types/assessment";
import { queryKeys } from "@/lib/query-keys";

export function useSubmission(id: number) {
  const client = useQueryClient();
  const query = useQuery({ queryKey: queryKeys.assessments.submission(id), queryFn: ({ signal }) => assessmentApi.submission(id, signal),
    enabled: Number.isSafeInteger(id) && id > 0, refetchOnWindowFocus: false, retry: false });
  const [choices, setChoices] = useState<Record<number, number | null>>({});
  const [revision, setRevision] = useState(0);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [remaining, setRemaining] = useState<number | null>(null);
  const initialized = useRef(false);
  const pending = useRef(new Map<number, number | null>());
  const inFlight = useRef<Promise<void> | null>(null);
  const closing = useRef(false);
  const deadline = useRef(0);
  const automaticSubmit = useRef(false);
  const active = query.data?.status === "IN_PROGRESS";
  const store = useCallback(async (result: Submission) => {
    const queryKey = queryKeys.assessments.submission(id);
    await client.cancelQueries({ queryKey });
    client.setQueryData(queryKey, result);
  }, [client, id]);

  useEffect(() => {
    if (!query.data) return;
    if (query.data.status !== "IN_PROGRESS") { pending.current.clear(); setError(null); }
    if (!initialized.current) {
      setChoices(Object.fromEntries(query.data.answers.map(a => [a.questionId, a.selectedOptionId])));
      initialized.current = true;
    }
    const seconds = query.data.expiresAt ? Math.max(0, (Date.parse(query.data.expiresAt) - Date.parse(query.data.serverTime)) / 1000) : 0;
    deadline.current = performance.now() + seconds * 1000;
    setRemaining(query.data.status === "IN_PROGRESS" ? Math.ceil(seconds) : 0);
  }, [query.dataUpdatedAt, query.data]);

  const flush = useCallback(async function flushPending(): Promise<void> {
    if (inFlight.current) await inFlight.current;
    if (!pending.current.size) return;
    const snapshot = new Map(pending.current);
    pending.current.clear();
    setSaving(true);
    const request = (async () => {
      try {
        await store(await assessmentApi.saveAnswers(id, [...snapshot].map(([questionId, selectedOptionId]) => ({ questionId, selectedOptionId }))));
        setError(null);
      } catch (failure) {
        // Preserve newer local selections when an older save fails.
        snapshot.forEach((value, key) => { if (!pending.current.has(key)) pending.current.set(key, value); });
        setError(failure); throw failure;
      } finally { setSaving(false); }
    })();
    inFlight.current = request;
    try { await request; } finally { if (inFlight.current === request) inFlight.current = null; }
    if (pending.current.size) await flushPending();
  }, [id, store]);

  useEffect(() => {
    if (!revision || !active || closing.current) return;
    const timer = window.setTimeout(() => { void flush().catch(() => undefined); }, 600);
    return () => window.clearTimeout(timer);
  }, [revision, active, flush]);

  const finish = useCallback(async (expired = false) => {
    if (closing.current) return;
    closing.current = true; setSubmitting(true); setError(null);
    try {
      if (expired) { try { await inFlight.current; } catch { /* The server may already have expired the submission. */ } }
      else await flush();
      await store(await assessmentApi.submit(id)); pending.current.clear();
      void client.invalidateQueries({ queryKey: queryKeys.assessments.all(), refetchType: "none" });
    } catch (failure) {
      setError(failure);
      // Reconcile after a timeout or a response lost after the server committed submit.
      try {
        const result = await assessmentApi.submission(id); await store(result);
        if (result.status !== "IN_PROGRESS") { pending.current.clear(); setError(null); }
      } catch { /* Keep the original failure and local answers for retry. */ }
    } finally { closing.current = false; setSubmitting(false); }
  }, [id, client, flush, store]);

  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => setRemaining(Math.max(0, Math.ceil((deadline.current - performance.now()) / 1000))), 250);
    return () => window.clearInterval(timer);
  }, [active]);
  useEffect(() => {
    if (active && remaining === 0 && !automaticSubmit.current) {
      automaticSubmit.current = true; void finish(true);
    }
  }, [active, remaining, finish]);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (pending.current.size || inFlight.current) { event.preventDefault(); event.returnValue = ""; }
    };
    const leaving = (event: MouseEvent) => {
      if (!(event.target instanceof Element) || !event.target.closest("a[href]") || !(pending.current.size || inFlight.current)) return;
      if (!window.confirm("Có câu trả lời chưa lưu. Bạn vẫn muốn rời trang?")) { event.preventDefault(); event.stopPropagation(); }
    };
    window.addEventListener("beforeunload", beforeUnload); document.addEventListener("click", leaving, true);
    return () => { window.removeEventListener("beforeunload", beforeUnload); document.removeEventListener("click", leaving, true); };
  }, []);

  const choose = (questionId: number, selectedOptionId: number | null) => {
    if (!active || closing.current || remaining === 0) return;
    setChoices(previous => ({ ...previous, [questionId]: selectedOptionId }));
    pending.current.set(questionId, selectedOptionId); setRevision(v => v + 1);
  };
  return { query, choices, choose, saving, submitting, error, remaining, finish,
    unsaved: pending.current.size > 0, retrySave: () => void flush().catch(() => undefined) };
}
