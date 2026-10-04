import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FileX2, Printer } from "lucide-react";
import { cvApi } from "@/api/tenant/cvApi";
import { SkeletonCard } from "@/components/ux/Skeleton";
import { CvCanvas } from "../components/builder/CvCanvas";
import { CvReadOnlyContext } from "../components/builder/CvReadOnlyContext";
import "../components/builder/cv-builder.css";

export function SharedCvPage() {
  const { token = "" } = useParams();
  const shared = useQuery({ queryKey: ["cvs", "shared", token], queryFn: () => cvApi.shared(token), enabled: !!token, retry: false });
  const cv = shared.data?.data.builderData;

  if (shared.isPending) return <SkeletonCard className="min-h-[60vh]" />;
  if (!cv) {
    return (
      <div className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
        <FileX2 className="size-10 text-slate-300" aria-hidden="true" />
        <p className="mt-3 font-semibold text-slate-800">CV không tồn tại hoặc đã ngừng chia sẻ</p>
        <p className="mt-1 text-sm text-slate-500">Hãy liên hệ người gửi để nhận link mới.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="cv-print-hidden flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-slate-900">CV của {cv.personalInfo.fullName}</h1>
        <button type="button" onClick={() => window.print()} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-primary-hover)]">
          <Printer className="size-4" aria-hidden="true" />Tải PDF
        </button>
      </div>
      <div className="cv-readonly overflow-x-auto rounded-3xl bg-slate-100 px-4 py-10">
        <CvReadOnlyContext.Provider value>
          <CvCanvas cv={cv} />
        </CvReadOnlyContext.Provider>
      </div>
    </div>
  );
}
