import { useEffect, useState } from "react";
import { cvApi } from "@/api/tenant/cvApi";
import { getApiErrorMessage } from "@/lib/axios";
import { muted } from "@/features/tenant/recruiter/matching/components/rankingUi";

export function CvFilePreview({ cvId, mimeType, filename }: { cvId: number; mimeType: string | null; filename: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pdf = (mimeType ?? "").includes("pdf") || filename.toLowerCase().endsWith(".pdf");
  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;
    cvApi.file(cvId).then((blob) => {
      if (cancelled) return;
      const file = pdf && blob.type !== "application/pdf"
        ? new Blob([blob], { type: "application/pdf" })
        : blob;
      objectUrl = URL.createObjectURL(file);
      setUrl(objectUrl);
    }).catch((err: unknown) => {
      if (!cancelled) setError(getApiErrorMessage(err, "Không mở được file CV"));
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [cvId, pdf]);
  if (error) return <p role="alert">{error}</p>;
  if (!url) return <p className={muted}>Đang tải file CV…</p>;
  if (!pdf) {
    return <a className={muted} href={url} download={filename}>Tải CV về máy</a>;
  }
  return (
    <embed title={filename} src={url} type="application/pdf" className="h-[32rem] w-full rounded-md border border-[var(--color-border-default)] bg-white" />
  );
}
