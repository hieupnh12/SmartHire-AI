import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Volume2 } from "lucide-react";
import { aiInterviewApi } from "@/api/tenant/aiInterviewApi";
import { Skeleton } from "@/components/ux/Skeleton";
import { getApiErrorMessage } from "@/lib/axios";

export function InterviewRecordingReview({ interviewId, answerId }: { interviewId: number; answerId: number }) {
  const info = useQuery({ queryKey: ["interview-recording", interviewId, answerId], queryFn: () => aiInterviewApi.recordingInfo(interviewId, answerId) });
  const [listen, setListen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const audio = useQuery({ queryKey: ["interview-audio", interviewId, answerId], queryFn: () => aiInterviewApi.recordingAudio(interviewId, answerId), enabled: listen });

  useEffect(() => {
    if (!audio.data) return;
    const objectUrl = URL.createObjectURL(audio.data);
    setUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [audio.data]);

  if (info.isError || !info.data) return null;

  return (
    <div className="space-y-2.5 rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Volume2 className="size-4 text-[#0066FF]" aria-hidden="true" />
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Bản ghi âm · {info.data.durationSeconds ?? "—"} giây
          </span>
        </div>
        {!listen && (
          <button
            type="button"
            onClick={() => setListen(true)}
            className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
          >
            <Volume2 className="size-3 text-[#0066FF]" />
            Nghe bản ghi
          </button>
        )}
      </div>

      {audio.isFetching && (
        <div className="space-y-1">
          <Skeleton className="h-9 w-full rounded-lg" />
          <span className="sr-only">Đang tải audio riêng tư…</span>
        </div>
      )}

      {audio.isError && (
        <div className="flex items-center justify-between gap-2 text-xs text-rose-600 dark:text-rose-400">
          <span>{getApiErrorMessage(audio.error)}</span>
          <button
            type="button"
            onClick={() => void audio.refetch()}
            className="text-[#0066FF] hover:underline font-semibold"
          >
            Thử lại
          </button>
        </div>
      )}

      {url && (
        <audio controls src={url} className="w-full h-8 mt-1" aria-label="Bản ghi câu trả lời của ứng viên" />
      )}

      {info.data.transcript && (
        <details className="group mt-2">
          <summary className="flex items-center gap-1.5 cursor-pointer text-xs font-medium text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 list-none">
            <ChevronRight className="size-3.5 transition-transform group-open:rotate-90" />
            <span>Transcript chi tiết của bản ghi</span>
          </summary>
          <p className="mt-2 rounded-lg bg-slate-50 p-2.5 text-xs leading-relaxed text-slate-700 dark:bg-slate-800/60 dark:text-slate-300 whitespace-pre-wrap">
            {info.data.transcript}
          </p>
        </details>
      )}
    </div>
  );
}
