import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FilePlus2, FileStack, FileText, LayoutTemplate } from "lucide-react";
import { cvApi } from "@/api/tenant/cvApi";
import type { CvSummary } from "@/api/types/cv";
import { useT } from "@/i18n";
import { getApiErrorMessage } from "@/lib/axios";
import { queryKeys } from "@/lib/query-keys";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { useUiStore } from "@/stores/uiStore";
import { SkeletonCard } from "@/components/ux/Skeleton";
import { CvUploadZone } from "../components/CvUploadZone";
import { CvList } from "../components/CvList";
import { CvDetailPanel } from "../components/CvDetailPanel";
import { CvManageBar } from "../components/CvManageBar";
import { cvStatusMeta } from "../constants/cvStatus";

export function MyCvPage() {
  const t = useT();
  const token = useAuthStore((s) => s.accessToken);
  const askConfirm = useUiStore((s) => s.askConfirm);
  const client = useQueryClient();
  const [params] = useSearchParams();
  const [selectedId, setSelectedId] = useState<number | null>(() => Number(params.get("selected")) || null);
  const mine = useQuery({ queryKey: queryKeys.cvs.mine, queryFn: cvApi.mine, enabled: !!token, refetchInterval: 5_000 });
  const detail = useQuery({ queryKey: queryKeys.cvs.detail(selectedId ?? 0), queryFn: () => cvApi.get(selectedId!), enabled: selectedId !== null, refetchInterval: 4_000 });
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
  const analyzed = rows.filter((row) => row.status === "ANALYZED").length;
  const processing = rows.filter((row) => cvStatusMeta[row.status].tone === "processing").length;

  useEffect(() => {
    if (selectedId === null && rows.length > 0) setSelectedId(rows[0].id);
  }, [rows, selectedId]);

  const confirmDelete = (row: Pick<CvSummary, "id" | "originalFilename">) => askConfirm({
    title: t("candidate.cv.myCv.deleteConfirmTitle"),
    description: t("candidate.cv.myCv.deleteConfirmDesc", { name: row.originalFilename }),
    confirmLabel: t("candidate.cv.myCv.deleteConfirmButton"),
    danger: true,
    onConfirm: async () => { await remove.mutateAsync(row.id); },
  });

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-6 rounded-3xl border border-slate-200 px-6 py-7 sm:px-8" style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--color-primary) 10%, white) 0%, #ffffff 70%)" }}>
        <div className="max-w-2xl">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">{t("candidate.cv.myCv.title")}</h1>
          <p className="mt-2 text-base leading-7 text-slate-600">{t("candidate.cv.myCv.subtitle")}</p>
          <dl className="mt-5 flex flex-wrap gap-3">
            <Stat icon={FileStack} label={t("candidate.cv.myCv.stats.total")} value={rows.length} />
            <Stat icon={FileText} label={t("candidate.cv.myCv.stats.analyzed")} value={analyzed} />
            {processing > 0 && <Stat icon={FileText} label={t("candidate.cv.myCv.stats.processing")} value={processing} />}
          </dl>
        </div>
        <div className="flex flex-wrap gap-3">
          <Link to="/cv-templates" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-sm transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]">
            <LayoutTemplate className="size-4" aria-hidden="true" />{t("candidate.cv.myCv.viewTemplates")}
          </Link>
          <Link to="/cv/builder" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--color-primary-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]">
            <FilePlus2 className="size-4" aria-hidden="true" />{t("candidate.cv.myCv.createNew")}
          </Link>
        </div>
      </section>

      <div className="grid items-start gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4 lg:sticky lg:top-24">
          <CvUploadZone pending={upload.isPending} error={upload.isError ? getApiErrorMessage(upload.error) : null} onFile={(file) => upload.mutate(file)} />
          <div>
            <h2 className="mb-2 px-1 text-sm font-semibold text-slate-800">{t("candidate.cv.myCv.uploadedList")}</h2>
            <CvList rows={rows} loading={mine.isPending} selectedId={selectedId} onSelect={setSelectedId} onDelete={confirmDelete} />
          </div>
        </aside>

        <section aria-label={t("candidate.cv.myCv.detailAria")} aria-live="polite">
          {cv ? (
            <div className="space-y-4">
              <CvManageBar key={cv.id} cv={cv} onDuplicated={setSelectedId} />
              <CvDetailPanel
                cv={cv}
                parsePending={parse.isPending}
                deletePending={remove.isPending}
                error={parse.isError ? getApiErrorMessage(parse.error) : null}
                onParse={() => parse.mutate(cv.id)}
                onDelete={() => confirmDelete(cv)}
                editHref={cv.builderData ? `/cv/builder/${cv.id}` : cv.extraction ? `/cv/builder?import=${cv.id}` : undefined}
                editLabel={cv.builderData ? undefined : t("candidate.cv.myCv.openInBuilder")}
              />
            </div>
          ) : selectedId !== null && detail.isPending ? (
            <SkeletonCard className="min-h-96" />
          ) : (
            <div className="flex min-h-80 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
              <span className="grid size-14 place-items-center rounded-full bg-[color-mix(in_srgb,var(--color-primary)_12%,white)] text-[var(--color-primary)]"><FileText className="size-7" aria-hidden="true" /></span>
              <p className="mt-4 text-base font-semibold text-slate-800">{rows.length ? t("candidate.cv.myCv.selectTitle") : t("candidate.cv.myCv.emptyTitle")}</p>
              <p className="mt-1 max-w-sm text-sm text-slate-500">{rows.length ? t("candidate.cv.myCv.selectHint") : t("candidate.cv.myCv.emptyHint")}</p>
              {!rows.length && <Link to="/cv-templates" className="mt-5 inline-flex min-h-10 items-center gap-2 rounded-lg bg-[var(--color-primary)] px-4 text-sm font-semibold text-white hover:bg-[var(--color-primary-hover)]"><LayoutTemplate className="size-4" aria-hidden="true" />{t("candidate.cv.myCv.viewTemplates")}</Link>}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof FileText; label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-2.5 shadow-sm">
      <Icon className="size-5 text-[var(--color-primary)]" aria-hidden="true" />
      <div><dt className="text-xs text-slate-500">{label}</dt><dd className="text-lg font-bold leading-tight text-slate-900">{value}</dd></div>
    </div>
  );
}
