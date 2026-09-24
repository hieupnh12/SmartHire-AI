import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { cvApi } from "@/api/tenant/cvApi";
import { getApiErrorMessage } from "@/lib/axios";
import { queryKeys } from "@/lib/query-keys";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { button, muted, panel } from "@/features/tenant/recruiter/matching/components/rankingUi";
import { CvFilePreview } from "@/components/shared/CvFilePreview";
import type { CvDetail } from "@/api/types/cv";

const chip = "rounded-full px-2.5 py-0.5 text-xs font-medium bg-[var(--color-primary-container)] text-[var(--color-on-primary)]";

export function MyCvPage() {
  const token = useAuthStore((s) => s.accessToken);
  const client = useQueryClient();
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const mine = useQuery({
    queryKey: queryKeys.cvs.mine,
    queryFn: cvApi.mine,
    enabled: !!token,
    refetchInterval: 5_000,
  });
  const detail = useQuery({
    queryKey: queryKeys.cvs.detail(selectedId ?? 0),
    queryFn: () => cvApi.get(selectedId!),
    enabled: selectedId !== null,
    refetchInterval: 4_000,
  });
  const upload = useMutation({
    mutationFn: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return cvApi.upload(form);
    },
    onSuccess: (response) => {
      void mine.refetch();
      setSelectedId(response.data.id);
    },
  });
  const parse = useMutation({
    mutationFn: (cvId: number) => cvApi.parse(cvId),
    onSuccess: (response, cvId) => {
      client.setQueryData(queryKeys.cvs.detail(cvId), response);
      void mine.refetch();
    },
  });
  const remove = useMutation({
    mutationFn: (cvId: number) => cvApi.remove(cvId),
    onSuccess: (_response, cvId) => {
      if (selectedId === cvId) setSelectedId(null);
      void mine.refetch();
    },
  });
  const rows = mine.data?.data ?? [];
  const cv = detail.data?.data;
  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">CV của tôi</h1>
        <p className={`mt-2 max-w-2xl ${muted}`}>Tải PDF, DOC hoặc DOCX, xem file và thông tin hệ thống trích xuất. Nộp CV khi apply việc, không gắn sẵn với một job.</p>
      </header>
      <div className={panel}>
        <label className={button}>
          Tải CV lên
          <input
            type="file"
            className="hidden"
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) upload.mutate(file);
              e.target.value = "";
            }}
          />
        </label>
        {upload.isPending && <p className={`mt-3 ${muted}`}>Đang tải lên…</p>}
        {upload.isError && <p role="alert" className="mt-3">{getApiErrorMessage(upload.error)}</p>}
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,32rem)]">
        <div className={panel}>
          {mine.isPending && <p>Đang tải…</p>}
          {rows.length === 0 && mine.isSuccess && <p className={muted}>Bạn chưa tải CV.</p>}
          <ul className="space-y-3">
            {rows.map((row) => (
              <li
                key={row.id}
                className={`cursor-pointer rounded-xl border border-[var(--color-border-default)] p-3 ${selectedId === row.id ? "bg-[var(--color-surface-container-low)]" : ""}`}
                onClick={() => setSelectedId(row.id)}
              >
                <p className="font-medium">{row.originalFilename}</p>
                <p className={muted}>{row.status} · {new Date(row.createdAt).toLocaleString("vi-VN")}</p>
              </li>
            ))}
          </ul>
        </div>
        <aside className={panel}>
          {!cv && <p className={muted}>Chọn một CV để xem file và thông tin trích xuất.</p>}
          {cv && (
            <CandidateCvPanel
              cv={cv}
              onParse={() => parse.mutate(cv.id)}
              parsePending={parse.isPending}
              onDelete={() => {
                if (window.confirm("Xóa CV này? Không thể hoàn tác.")) remove.mutate(cv.id);
              }}
              deletePending={remove.isPending}
            />
          )}
          {parse.isError && <p role="alert" className="mt-3">{getApiErrorMessage(parse.error)}</p>}
          {remove.isError && <p role="alert" className="mt-3">{getApiErrorMessage(remove.error)}</p>}
        </aside>
      </div>
    </section>
  );
}

function CandidateCvPanel({ cv, onParse, parsePending, onDelete, deletePending }: {
  cv: CvDetail;
  onParse: () => void;
  parsePending: boolean;
  onDelete: () => void;
  deletePending: boolean;
}) {
  const chips = useMemo(() => cv.skills, [cv.skills]);
  const stuck = cv.status === "UPLOADED" || cv.status === "FAILED";
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">{cv.originalFilename}</h2>
        <p className={muted}>{cv.status}{cv.errorMessage ? ` · ${cv.errorMessage}` : ""}</p>
        <p className={muted}>Model: {cv.extractionModel ?? "chưa phân tích"}</p>
      </div>
      <CvFilePreview cvId={cv.id} mimeType={cv.mimeType} filename={cv.originalFilename} />
      <div className="flex flex-wrap gap-2">
        {(stuck || cv.status === "ANALYZED") && (
          <button className={button} disabled={parsePending || deletePending} onClick={onParse}>
            {parsePending ? "Đang đọc CV…" : stuck ? "Phân tích CV" : "Phân tích lại"}
          </button>
        )}
        <button className={button} disabled={deletePending} onClick={onDelete}>{deletePending ? "Đang xóa…" : "Xóa CV"}</button>
      </div>
      {cv.analysis?.summary && <p className="text-sm">{cv.analysis.summary}</p>}
      {cv.analysis?.yearsExperience != null && (
        <p className={muted}>{cv.analysis.yearsExperience} năm kinh nghiệm (trích từ CV)</p>
      )}
      <ExtractionFacts extraction={cv.extraction} />
      <div className="flex flex-wrap gap-2">
        {chips.map((skill) => <span key={skill.canonicalName} className={chip}>{skill.skillName}</span>)}
      </div>
    </div>
  );
}

function ExtractionFacts({ extraction }: { extraction: Record<string, unknown> | null }) {
  if (!extraction) return <p className={muted}>Chưa có thông tin trích xuất. Bấm Phân tích CV nếu file đã tải.</p>;
  const name = text(extraction.fullName ?? extraction.name);
  const education = text(extraction.education ?? extraction.educationLevel);
  const email = text(extraction.email);
  return (
    <div className="space-y-1 text-sm">
      {name && <p><span className="font-semibold">Tên trên CV: </span>{name}</p>}
      {email && <p><span className="font-semibold">Email: </span>{email}</p>}
      {education && <p><span className="font-semibold">Học vấn: </span>{education}</p>}
    </div>
  );
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}
