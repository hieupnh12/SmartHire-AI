import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { humanInterviewApi as api } from "@/api/tenant/humanInterviewApi";
import { applicantApi } from "@/api/tenant/applicantApi";
import { cvApi } from "@/api/tenant/cvApi";
import type { HumanInterview, InterviewFilters } from "@/api/types/humanInterview";
import { useT } from "@/i18n";
import { getApiErrorMessage } from "@/lib/axios";
import { toast } from "@/stores/toastStore";
import { DetailDialog } from "@/components/ux/DetailDialog";
import { SkeletonCard } from "@/components/ux/Skeleton";
import { keepPreviousForScope } from "@/components/ux/TableRefresh";
import { useRecruitmentJob } from "../../jobs/components/JobRecruitmentWorkspace";
import { HumanInterviewWorkspace, type InterviewAction } from "../components/HumanInterviewWorkspace";
import { downloadInterview } from "../components/humanInterviewUi";
import "../styles/human-interview-reference.css";

async function allRows(filters: InterviewFilters) {
  const rows: HumanInterview[] = [];
  for (let page = 0; ; page++) {
    const result = await api.list({ ...filters, page, size: 100 });
    rows.push(...result.items);
    if (rows.length >= result.total || !result.items.length) return rows;
  }
}

export function InterviewsPage() {
  const t = useT();
  const job = useRecruitmentJob();
  const navigate = useNavigate();
  const client = useQueryClient();
  const [filters, setFilters] = useState({ search: "", round: "", mode: "", status: "", page: 0, size: 10 });
  const [view, setView] = useState<"list" | "calendar">("list");
  const [week, setWeek] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [selected, setSelected] = useState<number[]>([]);
  const [detail, setDetail] = useState<{
    action: "scorecard" | "preview" | "cancel" | "shift" | "profile";
    row?: HumanInterview;
    applicationId?: number;
  } | null>(null);
  const [shift, setShift] = useState(60);

  const params = {
    jobId: Number(job.id),
    q: filters.search || undefined,
    round: filters.round || undefined,
    mode: filters.mode || undefined,
    status: filters.status || undefined,
    page: filters.page,
    size: filters.size,
  };
  const numericJobId = Number(job.id);
  const list = useQuery({
    queryKey: ["human-interviews", "list", numericJobId, params],
    queryFn: () => api.list(params),
    placeholderData: keepPreviousForScope(numericJobId, 2),
    refetchInterval: 15_000,
  });
  const summary = useQuery({ queryKey: ["human-interviews", "summary", job.id], queryFn: () => api.summary(numericJobId), refetchInterval: 15_000 });
  const end = new Date(week);
  end.setDate(end.getDate() + 7);
  const calendar = useQuery({
    queryKey: ["human-interviews", "calendar", numericJobId, params, week.toISOString()],
    queryFn: () => allRows({ ...params, from: week.toISOString(), to: end.toISOString() }),
    placeholderData: keepPreviousForScope(numericJobId, 2),
    enabled: view === "calendar",
    refetchInterval: 15_000,
  });
  const preview = useQuery({
    queryKey: ["human-interviews", "preview", detail?.row?.id],
    queryFn: () => api.preview(detail!.row!.id),
    enabled: detail?.action === "preview",
  });
  const applicant = useQuery({
    queryKey: ["applications", detail?.applicationId],
    queryFn: () => applicantApi.get(detail!.applicationId!),
    enabled: detail?.action === "profile",
    refetchInterval: 5_000,
  });

  const refresh = useCallback(() => {
    void client.invalidateQueries({ queryKey: ["human-interviews"] });
    setSelected([]);
  }, [client]);

  const mutation = useMutation({
    mutationFn: (operation: () => Promise<unknown>) => operation(),
    onSuccess: () => {
      refresh();
      setDetail(null);
      toast.success(t("recruiter.interviews.human.page.updatedToast"));
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });
  const run = (operation: () => Promise<unknown>) => mutation.mutate(operation);

  useEffect(() => {
    const font = document.createElement("link");
    font.rel = "stylesheet";
    font.href = "https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200";
    document.head.appendChild(font);
    return () => font.remove();
  }, []);

  const profile = (applicationId: number) => setDetail({ action: "profile", applicationId });
  const action = (next: InterviewAction, row: HumanInterview) => {
    if (next === "edit") navigate(`/recruiter/jobs/${job.id}/interviews/${row.id}/edit`);
    else if (next === "scorecard") navigate(`/recruiter/jobs/${job.id}/interviews/${row.id}/evaluation`);
    else if (next === "profile") profile(row.applicationId);
    else if (next === "remind" || next === "complete") run(() => api[next](row.id));
    else setDetail({ action: next, row });
  };

  const exportFile = async (format: "ics" | "csv") => {
    try {
      if (format === "ics") downloadInterview(await api.export(Number(job.id)), `interviews-${job.id}.ics`);
      else {
        const rows = await allRows(params);
        const cell = (value: string) => `"${value.replace(/^[=+@-]/, "'$&").replaceAll('"', '""')}"`;
        const lines = [
          [
            t("recruiter.interviews.human.page.csvHeaderCandidate"),
            t("recruiter.interviews.human.page.csvHeaderEmail"),
            t("recruiter.interviews.human.page.csvHeaderRound"),
            t("recruiter.interviews.human.page.csvHeaderMode"),
            t("recruiter.interviews.human.page.csvHeaderStart"),
            t("recruiter.interviews.human.page.csvHeaderEnd"),
            t("recruiter.interviews.human.page.csvHeaderStatus"),
          ],
          ...rows.map((r) => [r.candidateName, r.candidateEmail, r.round, r.mode, r.start, r.end, r.status]),
        ];
        downloadInterview(
          new Blob(["\uFEFF" + lines.map((r) => r.map(cell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" }),
          `interviews-${job.id}.csv`,
        );
      }
      toast.success(
        format === "ics"
          ? t("recruiter.interviews.human.page.exportIcsSuccess")
          : t("recruiter.interviews.human.page.exportCsvSuccess"),
      );
    } catch (e) {
      toast.error(getApiErrorMessage(e));
    }
  };

  return (
    <>
      {[list, summary, calendar].some((q) => q.isError) && (
        <p role="alert" className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {getApiErrorMessage(list.error ?? summary.error ?? calendar.error)}{" "}
          <button type="button" className="font-semibold underline" onClick={refresh}>
            {t("recruiter.interviews.human.page.retry")}
          </button>
        </p>
      )}
      <HumanInterviewWorkspace
        jobId={job.id}
        jobTitle={job.title}
        data={list.data}
        summary={summary.data}
        calendarRows={calendar.data ?? []}
        view={view}
        week={week}
        {...filters}
        selected={selected}
        pending={mutation.isPending}
        loading={(view === "list" && list.isPending && !list.data) || (view === "calendar" && calendar.isPending && !calendar.data)}
        refreshing={(view === "list" && list.isFetching && list.isPlaceholderData) || (view === "calendar" && calendar.isFetching && calendar.isPlaceholderData)}
        onFilter={(name, value) => {
          setFilters((f) => ({ ...f, [name]: value, page: 0 }));
          setSelected([]);
        }}
        onView={setView}
        onWeek={(offset) =>
          setWeek((d) => {
            const n = new Date(d);
            n.setDate(n.getDate() + offset * 7);
            return n;
          })
        }
        onSelect={setSelected}
        onPage={(page) => {
          setFilters((f) => ({ ...f, page }));
          setSelected([]);
        }}
        onSize={(size) => {
          setFilters((f) => ({ ...f, size, page: 0 }));
          setSelected([]);
        }}
        onNew={() => navigate(`/recruiter/jobs/${job.id}/interviews/new`)}
        onExport={(format) => void exportFile(format)}
        onBulk={(kind) => (kind === "RESCHEDULE" ? setDetail({ action: "shift" }) : run(() => api.bulk(selected, "REMIND")))}
        onRemindPending={() =>
          run(async () => {
            const rows = await allRows({ jobId: Number(job.id), status: "PROPOSED" });
            for (let i = 0; i < rows.length; i += 100) await api.bulk(rows.slice(i, i + 100).map((r) => r.id), "REMIND");
          })
        }
        onAction={action}
      />
      <DetailDialog
        open={!!detail}
        title={
          detail?.action === "profile"
            ? t("recruiter.interviews.human.page.dialogProfileTitle")
            : detail?.action === "scorecard"
              ? t("recruiter.interviews.human.page.dialogScorecardTitle")
              : detail?.action === "preview"
                ? t("recruiter.interviews.human.page.dialogPreviewTitle")
                : detail?.action === "shift"
                  ? t("recruiter.interviews.human.page.dialogShiftTitle")
                  : t("recruiter.interviews.human.page.dialogCancelTitle")
        }
        onClose={() => setDetail(null)}
      >
        {detail?.action === "profile" &&
          (applicant.isPending ? (
            <SkeletonCard className="h-48" />
          ) : applicant.error ? (
            <p role="alert">{getApiErrorMessage(applicant.error)}</p>
          ) : (
            <div className="space-y-3">
              <h3 className="font-semibold">{applicant.data?.data.candidateName}</h3>
              <p>{applicant.data?.data.candidateEmail}</p>
              <p>
                {t("recruiter.interviews.human.page.cvScreeningLabel", {
                  status: applicant.data?.data.cvScreeningStatus ?? t("recruiter.interviews.human.page.noResult"),
                })}
              </p>
              {applicant.data?.data.cvs.map((cv) => (
                <div key={cv.id} className="flex items-center justify-between rounded-xl border p-3">
                  <span>
                    {cv.originalFilename} · {cv.status}
                  </span>
                  <button
                    type="button"
                    disabled={cv.expired}
                    onClick={() =>
                      void cvApi
                        .file(cv.id)
                        .then((blob) => downloadInterview(blob, cv.originalFilename))
                        .catch((e) => toast.error(getApiErrorMessage(e)))
                    }
                  >
                    {t("recruiter.interviews.human.page.downloadCv")}
                  </button>
                </div>
              ))}
              {!applicant.data?.data.cvs.length && <p>{t("recruiter.interviews.human.page.noCv")}</p>}
            </div>
          ))}
        {detail?.action === "preview" &&
          (preview.isPending ? (
            <SkeletonCard className="h-48" />
          ) : preview.error ? (
            <p role="alert">{getApiErrorMessage(preview.error)}</p>
          ) : (
            <>
              <h3 className="font-semibold">{preview.data?.subject}</h3>
              <pre className="mt-2 whitespace-pre-wrap text-sm">{preview.data?.body}</pre>
            </>
          ))}
        {detail?.action === "cancel" && (
          <>
            <p>
              {t("recruiter.interviews.human.page.cancelConfirmPrompt", {
                name: detail.row?.candidateName ?? "",
              })}
            </p>
            <button
              type="button"
              className="mt-3 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              disabled={mutation.isPending}
              onClick={() => run(() => api.cancel(detail.row!.id))}
            >
              {t("recruiter.interviews.human.page.confirmCancelBtn")}
            </button>
          </>
        )}
        {detail?.action === "shift" && (
          <>
            <label className="block text-sm">
              {t("recruiter.interviews.human.page.shiftMinutesLabel")}
              <input
                type="number"
                min={-10080}
                max={10080}
                value={shift}
                onChange={(e) => setShift(Number(e.target.value))}
                className="ml-2 rounded border px-2 py-1"
              />
            </label>
            <button
              type="button"
              className="mt-3 rounded-lg bg-[var(--color-primary)] px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              disabled={mutation.isPending || !Number.isInteger(shift)}
              onClick={() => run(() => api.bulk(selected, "RESCHEDULE", shift))}
            >
              {t("recruiter.interviews.human.page.applyShiftBtn", { count: selected.length })}
            </button>
          </>
        )}
      </DetailDialog>
    </>
  );
}
