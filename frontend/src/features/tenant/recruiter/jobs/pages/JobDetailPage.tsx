import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate, useParams } from "react-router-dom";
import { jobApi } from "@/api/tenant/jobApi";
import { getApiErrorMessage } from "@/lib/axios";
import { queryKeys } from "@/lib/query-keys";
import { button, muted, panel, primary } from "@/features/tenant/recruiter/matching/components/rankingUi";
import { PageSkeleton } from "@/components/ux/Skeleton";

export function JobDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const client = useQueryClient();
  const detail = useQuery({
    queryKey: queryKeys.jobs.detail(id ?? 0),
    queryFn: () => jobApi.get(id!),
    enabled: Boolean(id),
  });
  const refresh = () => void client.invalidateQueries({ queryKey: queryKeys.jobs.detail(id ?? 0) });
  const act = useMutation({
    mutationFn: (action: "publish" | "unpublish" | "pause" | "close" | "reopen" | "clone") => {
      const fn = {
        publish: jobApi.publish,
        unpublish: jobApi.unpublish,
        pause: jobApi.pause,
        close: jobApi.close,
        reopen: jobApi.reopen,
        clone: jobApi.clone,
      }[action];
      return fn(id!);
    },
    onSuccess: (response, action) => {
      if (action === "clone") navigate(`/recruiter/jobs/${response.data.id}/edit`);
      else refresh();
    },
  });
  const job = detail.data?.data;
  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      {detail.isError && <p role="alert">{getApiErrorMessage(detail.error)}</p>}
      {!job && detail.isPending && <PageSkeleton variant="detail" />}
      {job && (
        <>
          <header className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className={muted}>Tuyển dụng / Việc làm / {job.status}</p>
              <h1 className="mt-1 text-3xl font-semibold tracking-tight">{job.title}</h1>
              <p className={`mt-2 ${muted}`}>{job.department || "—"} · {job.location || "Remote/Onsite"} · {job.workMode || "—"}</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Link className={button} to={`/recruiter/jobs/${job.id}/edit`}>Sửa</Link>
              {job.status === "DRAFT" || job.status === "PAUSED" ? <button className={primary} onClick={() => act.mutate("publish")}>Publish</button> : null}
              {job.status === "PUBLISHED" ? <button className={button} onClick={() => act.mutate("unpublish")}>Unpublish</button> : null}
              {job.status === "PUBLISHED" ? <button className={button} onClick={() => act.mutate("pause")}>Pause</button> : null}
              {job.status === "PUBLISHED" || job.status === "PAUSED" ? <button className={button} onClick={() => act.mutate("close")}>Close</button> : null}
              {job.status === "CLOSED" || job.status === "PAUSED" ? <button className={primary} onClick={() => act.mutate("reopen")}>Reopen</button> : null}
              <button className={button} onClick={() => act.mutate("clone")}>Clone</button>
              <Link className={primary} to={`/recruiter/jobs/${job.id}/rank`}>Xếp hạng ứng viên</Link>
              <Link className={button} to={`/recruiter/jobs/${job.id}/cvs`}>Sàng lọc CV</Link>
            </div>
          </header>
          {act.isError && <p role="alert">{getApiErrorMessage(act.error)}</p>}
          <div className="grid gap-6 lg:grid-cols-3">
            <div className={`${panel} space-y-3 lg:col-span-2`}>
              <h2 className="font-semibold">Mô tả</h2>
              <p className="whitespace-pre-wrap text-sm">{job.description}</p>
              {job.responsibilities && <><h2 className="font-semibold">Trách nhiệm</h2><p className="whitespace-pre-wrap text-sm">{job.responsibilities}</p></>}
              {job.benefits && <><h2 className="font-semibold">Quyền lợi</h2><p className="whitespace-pre-wrap text-sm">{job.benefits}</p></>}
            </div>
            <aside className={`${panel} space-y-2 text-sm`}>
              <p><span className={muted}>Ứng viên: </span>{job.applicationCount}</p>
              <p><span className={muted}>Headcount: </span>{job.headcount ?? "—"}</p>
              <p><span className={muted}>Deadline: </span>{job.deadline ?? "—"}</p>
              <p><span className={muted}>KN: </span>{job.minYearsExperience ?? "—"} năm</p>
              <p><span className={muted}>Học vấn: </span>{job.educationLevel ?? "—"}</p>
              <p><span className={muted}>Phụ trách: </span>{job.ownerName ?? "—"}</p>
              <p><span className={muted}>Nhận CV: </span>{job.acceptingApplications ? "Có" : "Không"}</p>
            </aside>
          </div>
          <div className={panel}>
            <h2 className="mb-3 font-semibold">Skill matching</h2>
            <div className="flex flex-wrap gap-2">
              {job.skills.map((skill) => (
                <span key={skill.skillId} className="rounded-full bg-[var(--color-surface-container-low)] px-3 py-1 text-sm">
                  {skill.name} · {skill.weight}{skill.required ? " · bắt buộc" : ""}
                </span>
              ))}
            </div>
          </div>
          <div className={panel}>
            <h2 className="mb-3 font-semibold">Pipeline</h2>
            <ol className="flex flex-wrap gap-2 text-sm">
              {job.stages.map((stage) => (
                <li key={stage.id} className="rounded-lg border border-[var(--color-border-default)] px-3 py-1">
                  {stage.sortOrder + 1}. {stage.name}{stage.terminal ? " (end)" : ""}
                </li>
              ))}
            </ol>
          </div>
        </>
      )}
    </section>
  );
}
