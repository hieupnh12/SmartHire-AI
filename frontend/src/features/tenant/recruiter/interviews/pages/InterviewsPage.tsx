import { useCallback, useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { humanInterviewApi as api } from "@/api/tenant/humanInterviewApi";
import { applicantApi } from "@/api/tenant/applicantApi";
import { cvApi } from "@/api/tenant/cvApi";
import type { HumanInterview, InterviewFilters } from "@/api/types/humanInterview";
import { getApiErrorMessage } from "@/lib/axios";
import { toast } from "@/stores/toastStore";
import { DetailDialog } from "@/components/ux/DetailDialog";
import { SkeletonCard } from "@/components/ux/Skeleton";
import { useRecruitmentJob } from "../../jobs/components/JobRecruitmentWorkspace";
import { HumanInterviewWorkspace, type InterviewAction } from "../components/HumanInterviewWorkspace";
import { HumanInterviewScheduleDialog } from "../components/HumanInterviewScheduleDialog";
import { HumanInterviewScorecardPanel } from "../components/HumanInterviewScorecardPanel";
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
  const [editor, setEditor] = useState<HumanInterview | "new" | null>(null);
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
  const list = useQuery({ queryKey: ["human-interviews", "list", params], queryFn: () => api.list(params), refetchInterval: 15_000 });
  const summary = useQuery({ queryKey: ["human-interviews", "summary", job.id], queryFn: () => api.summary(Number(job.id)), refetchInterval: 15_000 });
  const options = useQuery({ queryKey: ["human-interviews", "options", job.id], queryFn: () => api.options(Number(job.id)) });
  const end = new Date(week);
  end.setDate(end.getDate() + 7);
  const calendar = useQuery({
    queryKey: ["human-interviews", "calendar", params, week.toISOString()],
    queryFn: () => allRows({ ...params, from: week.toISOString(), to: end.toISOString() }),
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
  const closeEditor = useCallback(() => setEditor(null), []);

  const mutation = useMutation({
    mutationFn: (operation: () => Promise<unknown>) => operation(),
    onSuccess: () => {
      refresh();
      setDetail(null);
      toast.success("Đã cập nhật lịch phỏng vấn.");
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
    if (next === "edit") setEditor(row);
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
          ["Ứng viên", "Email", "Vòng", "Hình thức", "Bắt đầu", "Kết thúc", "Trạng thái"],
          ...rows.map((r) => [r.candidateName, r.candidateEmail, r.round, r.mode, r.start, r.end, r.status]),
        ];
        downloadInterview(
          new Blob(["\uFEFF" + lines.map((r) => r.map(cell).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" }),
          `interviews-${job.id}.csv`,
        );
      }
      toast.success(format === "ics" ? "Đã xuất lịch .ics." : "Đã xuất CSV.");
    } catch (e) {
      toast.error(getApiErrorMessage(e));
    }
  };

  return (
    <>
      {[list, summary, options, calendar].some((q) => q.isError) && (
        <p role="alert" className="mb-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800">
          {getApiErrorMessage(list.error ?? summary.error ?? options.error ?? calendar.error)}{" "}
          <button type="button" className="font-semibold underline" onClick={refresh}>
            Thử lại
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
        loading={list.isLoading || (view === "calendar" && calendar.isLoading)}
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
        onNew={() => setEditor("new")}
        onAi={() => navigate(`/recruiter/jobs/${job.id}/ai-interviews`)}
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
      {editor && options.data && (
        <HumanInterviewScheduleDialog
          key={editor === "new" ? "new" : editor.id}
          jobId={Number(job.id)}
          options={options.data}
          existing={editor === "new" ? undefined : editor}
          variant={editor === "new" ? "modal" : "drawer"}
          onClose={closeEditor}
          onSaved={(draft) => {
            closeEditor();
            refresh();
            toast.success(draft
              ? "Đã lưu bản nháp lịch phỏng vấn (chưa gửi thông báo)."
              : "Đã lưu lịch và gửi lời mời / thông báo tới ứng viên và hội đồng.");
          }}
          onProfile={profile}
          onAiReport={() => navigate(`/recruiter/jobs/${job.id}/cvs`)}
        />
      )}
      {editor && !options.data && <SkeletonCard className="h-44" />}
      <DetailDialog
        open={!!detail}
        title={
          detail?.action === "profile"
            ? "Hồ sơ ứng viên"
            : detail?.action === "scorecard"
              ? "Phiếu đánh giá phỏng vấn"
              : detail?.action === "preview"
                ? "Nội dung email"
                : detail?.action === "shift"
                  ? "Đổi lịch hàng loạt"
                  : "Hủy lịch phỏng vấn"
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
              <p>Sàng lọc CV: {applicant.data?.data.cvScreeningStatus ?? "Chưa có kết quả"}</p>
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
                    Tải CV
                  </button>
                </div>
              ))}
              {!applicant.data?.data.cvs.length && <p>Chưa có CV.</p>}
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
            <p>Hủy lịch của {detail.row?.candidateName}? Người tham gia sẽ nhận thông báo.</p>
            <button
              type="button"
              className="mt-3 rounded-lg bg-red-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              disabled={mutation.isPending}
              onClick={() => run(() => api.cancel(detail.row!.id))}
            >
              Xác nhận hủy
            </button>
          </>
        )}
        {detail?.action === "shift" && (
          <>
            <label className="block text-sm">
              Số phút dịch lịch (âm để sớm hơn)
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
              Áp dụng cho {selected.length} lịch
            </button>
          </>
        )}
        {detail?.action === "scorecard" && detail.row && (
          <HumanInterviewScorecardPanel
            interview={detail.row}
            pending={mutation.isPending}
            onSubmit={(values) => run(() => api.evaluate(detail.row!.id, values))}
          />
        )}
      </DetailDialog>
    </>
  );
}
