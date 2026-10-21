import { AlertTriangle, GitBranch, LoaderCircle } from "lucide-react";
import type { GithubAnalysisView } from "@/api/types/cv";
import { cn } from "@/lib/utils";

type GithubSkill = NonNullable<NonNullable<GithubAnalysisView["result"]>["skills"]>[number];

const statusLabel: Record<GithubAnalysisView["status"], string> = {
  NOT_PROVIDED: "Không cung cấp GitHub",
  PENDING: "Đang chờ",
  PROCESSING: "Đang phân tích",
  COMPLETED: "Đã phân tích",
  PARTIAL: "Phân tích một phần",
  FAILED: "Không phân tích được",
};

const skillStatusLabel: Record<string, string> = {
  VERIFIED: "Đã xác minh",
  PARTIAL: "Một phần",
  UNVERIFIED: "Chưa đủ bằng chứng",
};

const skillStatusTone: Record<string, string> = {
  VERIFIED: "bg-emerald-50 text-emerald-700",
  PARTIAL: "bg-amber-50 text-amber-800",
  UNVERIFIED: "bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)]",
};

function githubHref(url: string | undefined) {
  if (!url || !/^https:\/\/github\.com\/[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)?\/?$/.test(url)) return null;
  return url;
}

function skillRank(status: string) {
  if (status === "VERIFIED") return 0;
  if (status === "PARTIAL") return 1;
  return 2;
}

export function GithubEvidencePanel({ analysis }: { analysis: GithubAnalysisView | null | undefined }) {
  if (!analysis) {
    return (
      <section className="rounded-2xl border border-dashed border-[var(--color-border-default)] p-4 text-sm leading-relaxed text-[var(--color-on-surface-variant)]">
        Chưa có kết quả GitHub. Việc này không đổi điểm CV.
      </section>
    );
  }
  const result = analysis.result;
  const busy = analysis.status === "PENDING" || analysis.status === "PROCESSING";
  const skills = [...(result?.skills ?? [])].sort((a, b) => skillRank(a.status) - skillRank(b.status) || a.name.localeCompare(b.name));
  const evidenced = skills.filter((skill) => skill.status === "VERIFIED" || skill.status === "PARTIAL");
  const unverified = skills.filter((skill) => skill.status !== "VERIFIED" && skill.status !== "PARTIAL");
  return (
    <section className="space-y-5 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-[65ch]">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <GitBranch className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
            Bằng chứng GitHub
          </h3>
          <p className="mt-1 text-xs leading-relaxed text-[var(--color-on-surface-variant)]">Tách khỏi điểm CV. Không phải quyết định tuyển dụng.</p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold tabular-nums leading-none">
            {analysis.score == null ? "—" : analysis.score}
            <span className="text-base font-normal text-[var(--color-on-surface-variant)]"> /100</span>
          </p>
          <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">{statusLabel[analysis.status]}{analysis.cacheHit ? " · dùng cache" : ""}</p>
        </div>
      </div>

      {busy && (
        <p className="flex items-center gap-2 text-sm leading-relaxed text-[var(--color-on-surface-variant)]">
          <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          Đang đọc repository công khai. CV vẫn được chấm như bình thường.
        </p>
      )}

      {analysis.status === "NOT_PROVIDED" && (
        <p className="max-w-[65ch] rounded-2xl bg-[var(--color-surface-container-low)] p-4 text-sm leading-relaxed">
          Ứng viên không cung cấp GitHub. Hệ thống không trừ điểm và không loại hồ sơ vì lý do này.
        </p>
      )}

      {(analysis.errorMessage || analysis.status === "FAILED" || analysis.status === "PARTIAL") && analysis.errorMessage && (
        <div role="alert" className="flex max-w-[65ch] items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm leading-relaxed text-amber-800">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{analysis.errorCode ? `${analysis.errorCode}: ` : ""}{analysis.errorMessage}</span>
        </div>
      )}

      {result?.repositories && result.repositories.length > 0 && (
        <ul className="grid gap-2 md:grid-cols-2">
          {result.repositories.map((repo) => {
            const href = githubHref(repo.url);
            return (
              <li key={`${repo.fullName}-${repo.commitSha}`} className="rounded-xl bg-[var(--color-surface-container-low)] px-3 py-2.5 text-sm">
                {href ? <a className="font-medium text-[var(--color-primary)] underline-offset-2 hover:underline" href={href} target="_blank" rel="noreferrer">{repo.fullName}</a> : <span className="font-medium">{repo.fullName}</span>}
                <span className="mt-1 block text-xs leading-relaxed text-[var(--color-on-surface-variant)]">
                  {repo.language || "Không rõ ngôn ngữ"} · {repo.commitSha ? repo.commitSha.slice(0, 7) : "chưa có commit"} · {repo.status}
                  {repo.error ? ` · ${repo.error}` : ""}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {result?.summary && <p className="rounded-2xl bg-[var(--color-primary-subtle)] p-4 text-sm leading-relaxed">{result.summary}</p>}

      {evidenced.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">Đã có bằng chứng <span className="font-normal text-[var(--color-on-surface-variant)]">· {evidenced.length}</span></h4>
          <ul className="grid items-start gap-3 lg:grid-cols-2">
            {evidenced.map((skill) => <SkillCard key={skill.name} skill={skill} />)}
          </ul>
        </div>
      )}

      {unverified.length > 0 && (
        <details className="rounded-2xl border border-[var(--color-border-default)]">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
            Chưa đủ bằng chứng <span className="font-normal text-[var(--color-on-surface-variant)]">· {unverified.length}</span>
          </summary>
          <ul className="grid items-start gap-3 border-t border-[var(--color-border-default)] p-4 lg:grid-cols-2">
            {unverified.map((skill) => <SkillCard key={skill.name} skill={skill} />)}
          </ul>
        </details>
      )}

      {(Boolean(result?.strengths?.length) || Boolean(result?.improvements?.length)) && (
        <div className="grid items-start gap-5 lg:grid-cols-2">
          {result?.strengths && result.strengths.length > 0 && (
            <div className="max-w-[65ch]">
              <h4 className="text-sm font-semibold">Điểm mạnh</h4>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed">{result.strengths.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          )}
          {result?.improvements && result.improvements.length > 0 && (
            <div className="max-w-[65ch]">
              <h4 className="text-sm font-semibold">Điểm cần cải thiện</h4>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed">{result.improvements.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          )}
        </div>
      )}
      {result?.unverified && result.unverified.length > 0 && (
        <p className="max-w-[65ch] text-xs leading-relaxed text-[var(--color-on-surface-variant)]">Chưa xác minh: {result.unverified.join(", ")}</p>
      )}
      {result?.limits?.omitted && result.limits.omitted.length > 0 && (
        <p className="max-w-[65ch] text-xs leading-relaxed text-[var(--color-on-surface-variant)]">Chưa đọc: {result.limits.omitted.join(", ")}</p>
      )}
      {result?.notes?.map((note) => <p key={note} className="max-w-[65ch] text-xs leading-relaxed text-[var(--color-on-surface-variant)]">{note}</p>)}
    </section>
  );
}

function SkillCard({ skill }: { skill: GithubSkill }) {
  const tone = skillStatusTone[skill.status] ?? skillStatusTone.UNVERIFIED;
  return (
    <li className="space-y-3 rounded-2xl border border-[var(--color-border-default)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold">{skill.name}</span>
        <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", tone)}>
          {skillStatusLabel[skill.status] ?? skill.status}
        </span>
      </div>
      {skill.evidence && skill.evidence.length > 0 && (
        <ul className="space-y-3">
          {skill.evidence.map((item) => (
            <li key={`${item.path}-${item.observation}`} className="space-y-1.5">
              <code className="block w-fit max-w-full overflow-x-auto rounded-md bg-[var(--color-surface-container-low)] px-2 py-1 font-mono text-[11px] leading-5 text-[var(--color-on-surface)]">
                {item.path}
              </code>
              <p className="max-w-[62ch] text-xs italic leading-relaxed text-[var(--color-on-surface-variant)]">{item.observation}</p>
            </li>
          ))}
        </ul>
      )}
      {skill.limit && (
        <p className="max-w-[62ch] border-l-2 border-amber-300 pl-3 text-xs not-italic leading-relaxed text-amber-900">{skill.limit}</p>
      )}
    </li>
  );
}
