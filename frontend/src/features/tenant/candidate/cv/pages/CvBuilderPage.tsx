import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Check } from "lucide-react";
import { cvApi } from "@/api/tenant/cvApi";
import type { CvBuilderData } from "@/api/types/cv";
import { getApiErrorMessage } from "@/lib/axios";
import { queryKeys } from "@/lib/query-keys";
import { getTenantIdFromWindow } from "@/lib/tenant";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { SkeletonCard } from "@/components/ux/Skeleton";
import { useCvBuilderStore } from "../stores/useCvBuilderStore";
import { clearCvDraft, cvDraftKey, readCvDraft, useCvDraftAutosave } from "../hooks/useCvDraftAutosave";
import { createDefaultCv, resolveTemplateId } from "../utils/createDefaultCv";
import { cvFromExtraction } from "../utils/cvFromExtraction";
import { downloadCvPdf } from "../utils/exportCvPdf";
import { BuilderToolbar } from "../components/builder/BuilderToolbar";
import { CvCanvas } from "../components/builder/CvCanvas";
import { CvPdfSnapshot } from "../components/builder/CvPdfSnapshot";
import { ZoomFrame } from "../components/builder/ZoomFrame";
import { JobMatchDialog } from "../components/builder/JobMatchDialog";
import { CvReviewPanel } from "../components/builder/CvReviewPanel";
import { CvTipsDialog } from "../components/builder/CvTipsDialog";
import { reviewCv } from "../utils/reviewCv";
import "../components/builder/cv-builder.css";

function readAccentColor(element: HTMLElement | null) {
  const value = element ? getComputedStyle(element).getPropertyValue("--color-primary").trim() : "";
  if (/^#[0-9a-f]{6}$/i.test(value)) return value;
  if (/^#[0-9a-f]{3}$/i.test(value)) return `#${[...value.slice(1)].map((char) => char + char).join("")}`;
  return null;
}

export function CvBuilderPage() {
  const { cvId } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const client = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const cv = useCvBuilderStore((s) => s.cv);
  const load = useCvBuilderStore((s) => s.load);
  const reset = useCvBuilderStore((s) => s.reset);
  const setTemplate = useCvBuilderStore((s) => s.setTemplate);
  const addSection = useCvBuilderStore((s) => s.addSection);
  const setTheme = useCvBuilderStore((s) => s.setTheme);
  const setLanguage = useCvBuilderStore((s) => s.setLanguage);
  const undo = useCvBuilderStore((s) => s.undo);
  const redo = useCvBuilderStore((s) => s.redo);
  const canUndo = useCvBuilderStore((s) => s.past.length > 0);
  const canRedo = useCvBuilderStore((s) => s.future.length > 0);
  const canvasRef = useRef<HTMLDivElement>(null);
  const initializedKey = useRef<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [matching, setMatching] = useState(false);
  const [tipsOpen, setTipsOpen] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [pages, setPages] = useState(1);
  const [downloading, setDownloading] = useState(false);
  const [zoom, setZoom] = useState(100);
  const review = useMemo(() => (cv ? reviewCv(cv, pages) : null), [cv, pages]);

  const editingId = cvId && /^\d+$/.test(cvId) ? Number(cvId) : null;
  const importParam = params.get("import");
  const importId = editingId === null && importParam && /^\d+$/.test(importParam) ? Number(importParam) : null;
  const sourceId = editingId ?? importId;
  const templateParam = params.get("template");
  const saved = useQuery({ queryKey: queryKeys.cvs.detail(sourceId ?? 0), queryFn: () => cvApi.get(sourceId!), enabled: sourceId !== null });
  const savedData = editingId !== null ? saved.data?.data.builderData ?? null : null;
  const importSource = importId !== null && saved.data?.data.extraction ? saved.data.data : null;
  const draftKey = user ? cvDraftKey(getTenantIdFromWindow() ?? "default", user.id, editingId) : null;
  const draftSavedAt = useCvDraftAutosave(draftKey, cv);

  useEffect(() => {
    if (!draftKey || initializedKey.current === draftKey) return;
    if (editingId !== null && !savedData) return;
    if (importId !== null && !importSource) return;
    initializedKey.current = draftKey;
    const base = importSource
      ? cvFromExtraction(importSource, user)
      : readCvDraft(draftKey) ?? savedData ?? createDefaultCv(templateParam, user);
    load(templateParam ? { ...base, templateId: resolveTemplateId(templateParam) } : base);
    // Drop ?import so a reload resumes the draft instead of re-importing over edits.
    if (importSource) navigate("/cv/builder", { replace: true });
  }, [draftKey, editingId, importId, importSource, savedData, templateParam, user, load, navigate]);

  useEffect(() => () => {
    initializedKey.current = null;
    reset();
  }, [reset]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.altKey) return;
      const key = event.key.toLowerCase();
      const isRedo = key === "y" || (key === "z" && event.shiftKey);
      if (key !== "z" && !isRedo) return;
      event.preventDefault();
      // Editable fields only re-sync from the store while unfocused.
      if (document.activeElement instanceof HTMLElement && document.activeElement.isContentEditable) document.activeElement.blur();
      if (isRedo) redo(); else undo();
    };
    window.addEventListener("keydown", onKeyDown, true);
    return () => window.removeEventListener("keydown", onKeyDown, true);
  }, [undo, redo]);

  const save = useMutation({
    mutationFn: (data: CvBuilderData) => (editingId !== null ? cvApi.updateFromBuilder(editingId, data) : cvApi.createFromBuilder(data)),
    onSuccess: (response) => {
      if (draftKey) clearCvDraft(draftKey);
      client.removeQueries({ queryKey: queryKeys.cvs.detail(response.data.id) });
      void client.invalidateQueries({ queryKey: queryKeys.cvs.mine });
      navigate(`/cv?selected=${response.data.id}`);
    },
  });

  const onSave = () => {
    if (!cv) return;
    if (!cv.personalInfo.fullName.trim()) {
      setFormError("Vui lòng nhập họ và tên trước khi lưu CV.");
      return;
    }
    setFormError(null);
    save.mutate({ ...cv, accentColor: readAccentColor(canvasRef.current) });
  };

  const onSnapshotReady = async (area: HTMLElement) => {
    try {
      await downloadCvPdf(area, cv?.personalInfo.fullName.trim() ? `CV ${cv.personalInfo.fullName.trim()}` : "CV");
    } catch (downloadError) {
      setFormError(getApiErrorMessage(downloadError));
    } finally {
      setDownloading(false);
    }
  };

  if (sourceId !== null && saved.isError) {
    return <Notice message={getApiErrorMessage(saved.error)} />;
  }
  if (importId !== null && saved.data && !importSource) {
    return <Notice message="CV này chưa được AI phân tích xong nên chưa thể nhập vào trình tạo CV." />;
  }
  if (editingId !== null && saved.data && !savedData) {
    return <Notice message="CV này được tải lên từ file nên không thể chỉnh sửa bằng trình tạo CV." />;
  }
  if (!cv || !review) return <SkeletonCard className="min-h-[60vh]" />;

  const error = formError ?? (save.isError ? getApiErrorMessage(save.error) : null);

  const cvTitle = [cv.personalInfo.fullName.trim() || "CV chưa đặt tên", cv.personalInfo.title.trim()].filter(Boolean).join(" – ");

  return (
    <div className="space-y-4">
      <BuilderToolbar
        templateId={cv.templateId}
        theme={cv.theme}
        language={cv.language ?? "vi"}
        avatarUrl={cv.personalInfo.avatarUrl}
        zoom={zoom}
        editing={editingId !== null}
        saving={save.isPending}
        canUndo={canUndo}
        canRedo={canRedo}
        reviewOpen={reviewOpen}
        reviewScore={review.score}
        onLanguage={setLanguage}
        onTemplate={setTemplate}
        onTheme={setTheme}
        onAddSection={addSection}
        onZoom={setZoom}
        onUndo={undo}
        onRedo={redo}
        downloading={downloading}
        onDownload={() => {
          setFormError(null);
          setDownloading(true);
        }}
        onJobMatch={() => setMatching(true)}
        onTips={() => setTipsOpen(true)}
        onReview={() => setReviewOpen((open) => !open)}
        onSave={onSave}
      />
      {matching && <JobMatchDialog cv={cv} onClose={() => setMatching(false)} />}
      {tipsOpen && <CvTipsDialog onClose={() => setTipsOpen(false)} />}
      {reviewOpen && <CvReviewPanel review={review} pages={pages} onClose={() => setReviewOpen(false)} />}
      <div className="cv-print-hidden mx-auto max-w-[210mm] text-center">
        <h1 className="truncate text-lg font-bold text-slate-900">{cvTitle}</h1>
        <p className="mt-0.5 flex min-h-5 items-center justify-center gap-1 text-xs text-slate-500" role="status">
          {draftSavedAt
            ? <><Check className="size-3.5 text-emerald-600" aria-hidden="true" />Đã lưu nháp lúc {draftSavedAt.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })} · Nhấp trực tiếp vào nội dung để chỉnh sửa</>
            : "Nhấp trực tiếp vào nội dung để chỉnh sửa. Bản nháp tự lưu trên trình duyệt này."}
        </p>
      </div>
      {error && (
        <p role="alert" className="cv-print-hidden mx-auto flex max-w-[210mm] items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />{error}
        </p>
      )}
      <div className="overflow-x-auto rounded-3xl bg-slate-100 px-4 py-10">
        <ZoomFrame zoom={zoom}>
          <CvCanvas cv={cv} ref={canvasRef} onPages={setPages} />
        </ZoomFrame>
      </div>
      {downloading && <CvPdfSnapshot cv={cv} onReady={(area) => void onSnapshotReady(area)} />}
    </div>
  );
}

function Notice({ message }: { message: string }) {
  return (
    <div className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
      <AlertTriangle className="size-9 text-amber-500" aria-hidden="true" />
      <p className="mt-3 max-w-md font-semibold text-slate-800">{message}</p>
      <Link to="/cv" className="mt-5 inline-flex min-h-10 items-center rounded-lg bg-[var(--color-primary)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-primary-hover)]">Về Quản lý CV</Link>
    </div>
  );
}
