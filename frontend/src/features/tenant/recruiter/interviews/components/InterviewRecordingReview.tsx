import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { aiInterviewApi } from "@/api/tenant/aiInterviewApi";
import { Button } from "@/components/ux/Button";
import { getApiErrorMessage } from "@/lib/axios";

export function InterviewRecordingReview({ interviewId, answerId }: { interviewId: number; answerId: number }) {
  const info = useQuery({ queryKey: ["interview-recording", interviewId, answerId], queryFn: () => aiInterviewApi.recordingInfo(interviewId, answerId) });
  const [listen, setListen] = useState(false); const [url, setUrl] = useState<string | null>(null);
  const audio = useQuery({ queryKey: ["interview-audio", interviewId, answerId], queryFn: () => aiInterviewApi.recordingAudio(interviewId, answerId), enabled: listen });
  useEffect(() => { if (!audio.data) return; const objectUrl = URL.createObjectURL(audio.data); setUrl(objectUrl); return () => URL.revokeObjectURL(objectUrl); }, [audio.data]);
  if (info.isError) return <p role="alert">{getApiErrorMessage(info.error)}</p>;
  if (!info.data) return null;
  return <div className="space-y-2 rounded-lg border border-[var(--color-border-default)] p-3">
    <p className="text-sm font-semibold">Bản ghi âm · {info.data.durationSeconds ?? "—"} giây</p>
    {!listen && <Button variant="secondary" size="sm" onClick={() => setListen(true)}>Nghe bản ghi</Button>}
    {audio.isFetching && <p role="status">Đang tải audio riêng tư…</p>}
    {audio.isError && <p role="alert">{getApiErrorMessage(audio.error)} <Button size="sm" onClick={() => void audio.refetch()}>Thử lại</Button></p>}
    {url && <audio controls src={url} className="w-full" aria-label="Bản ghi câu trả lời của ứng viên" />}
    <details><summary className="cursor-pointer text-sm">Transcript của bản ghi</summary><p className="mt-2 whitespace-pre-wrap text-sm">{info.data.transcript}</p></details>
  </div>;
}
