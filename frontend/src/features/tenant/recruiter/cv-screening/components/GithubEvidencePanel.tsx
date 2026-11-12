import {
  AlertTriangle,
  CheckCircle2,
  Code2,
  ExternalLink,
  GitBranch,
  LoaderCircle,
  MessageCircleQuestion,
  ShieldAlert,
  ShieldCheck,
  Users,
} from "lucide-react";
import type { GithubAnalysisView } from "@/api/types/cv";
import { compareLocaleText, useLocale, useT } from "@/i18n";
import { cn } from "@/lib/utils";

type GithubResult = NonNullable<GithubAnalysisView["result"]>;
type GithubSkill = NonNullable<GithubResult["skills"]>[number];
type RepoSnapshot = NonNullable<GithubResult["repositories"]>[number];

const skillStatusTone: Record<string, string> = {
  VERIFIED: "bg-emerald-50 text-emerald-700",
  PARTIAL: "bg-amber-50 text-amber-800",
  UNVERIFIED: "bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)]",
};

const trustTone: Record<string, string> = {
  HIGH: "bg-emerald-50 text-emerald-700 border-emerald-200/80",
  MEDIUM: "bg-amber-50 text-amber-800 border-amber-200/80",
  LOW: "bg-slate-100 text-slate-700 border-slate-200",
  WARNING: "bg-rose-50 text-rose-700 border-rose-200/80",
};

const codeDepthTone: Record<string, string> = {
  PRODUCTION_GRADE: "bg-emerald-50 text-emerald-700",
  INTERMEDIATE: "bg-[var(--color-primary-soft)] text-[var(--color-primary-hover)]",
  BASIC_CRUD: "bg-amber-50 text-amber-800",
  TUTORIAL_BOILERPLATE: "bg-rose-50 text-rose-700",
};

const claimStatusTone: Record<string, string> = {
  SUPPORTED: "bg-emerald-50 text-emerald-700",
  PARTIAL: "bg-amber-50 text-amber-800",
  OVERSTATED: "bg-rose-50 text-rose-700",
  NOT_FOUND: "bg-slate-100 text-slate-700",
};

function githubHref(url: string | undefined) {
  if (!url || !/^https:\/\/github\.com\/[A-Za-z0-9_.-]+(?:\/[A-Za-z0-9_.-]+)?\/?$/.test(url)) return null;
  return url;
}

function githubBlobHref(repoFullName: string | undefined, commitSha: string | undefined, filePath: string | undefined) {
  if (!repoFullName || !filePath || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repoFullName)) return null;
  const cleanPath = filePath.replace(/^\/+/, "");
  if (cleanPath.includes("..") || cleanPath.includes("://")) return null;
  const ref = commitSha && /^[0-9a-fA-F]{7,40}$/.test(commitSha) ? commitSha : "HEAD";
  const encodedPath = cleanPath.split("/").map((seg) => encodeURIComponent(seg)).join("/");
  return `https://github.com/${repoFullName}/blob/${ref}/${encodedPath}`;
}

function skillRank(status: string) {
  if (status === "VERIFIED") return 0;
  if (status === "PARTIAL") return 1;
  return 2;
}

export function GithubEvidencePanel({ analysis }: { analysis: GithubAnalysisView | null | undefined }) {
  const t = useT();
  const locale = useLocale();

  const translateOrFallback = (prefix: string, code: string | undefined | null) => {
    if (!code) return "";
    const path = `${prefix}.${code}`;
    const res = t(path);
    return res === path ? code : res;
  };

  if (!analysis) {
    return (
      <section className="rounded-2xl border border-dashed border-[var(--color-border-default)] p-4 text-sm leading-relaxed text-[var(--color-on-surface-variant)]">
        {t("recruiter.screening.github.emptyNoResult")}
      </section>
    );
  }
  const result = analysis.result;
  const busy = analysis.status === "PENDING" || analysis.status === "PROCESSING";
  const skills = [...(result?.skills ?? [])].sort(
    (a, b) => skillRank(a.status) - skillRank(b.status) || compareLocaleText(a.name, b.name, locale),
  );
  const evidenced = skills.filter((skill) => skill.status === "VERIFIED" || skill.status === "PARTIAL");
  const unverified = skills.filter((skill) => skill.status !== "VERIFIED" && skill.status !== "PARTIAL");

  const shaByRepo = new Map<string, string>();
  for (const r of result?.repositories ?? []) {
    if (r.fullName && r.commitSha) shaByRepo.set(r.fullName, r.commitSha);
  }

  const authenticity = result?.authenticity;
  const overallTrustLevel = authenticity?.overallTrustLevel;
  const overallTrustTone = overallTrustLevel ? trustTone[overallTrustLevel] : null;
  const depthKey = result?.codeDepth;
  const depthTone = depthKey ? codeDepthTone[depthKey] : null;

  return (
    <section className="space-y-5 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-[65ch]">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <GitBranch className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
              {t("recruiter.screening.github.title")}
            </h3>
            {overallTrustLevel && overallTrustTone && (
              <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold", overallTrustTone)}>
                {overallTrustLevel === "WARNING" ? (
                  <ShieldAlert className="size-3.5" aria-hidden="true" />
                ) : (
                  <ShieldCheck className="size-3.5" aria-hidden="true" />
                )}
                {translateOrFallback("recruiter.screening.github.trust", overallTrustLevel)}
                {authenticity?.overallTrustScore != null ? ` (${authenticity.overallTrustScore}/100)` : ""}
              </span>
            )}
            {depthKey && depthTone && (
              <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold", depthTone)}>
                <Code2 className="size-3.5" aria-hidden="true" />
                {translateOrFallback("recruiter.screening.github.codeDepth", depthKey)}
              </span>
            )}
          </div>
          <p className="mt-1 text-xs leading-relaxed text-[var(--color-on-surface-variant)]">
            {t("recruiter.screening.github.subtitle")}
          </p>
        </div>
        <div className="text-right">
          <p className="text-3xl font-bold tabular-nums leading-none">
            {analysis.score == null ? "—" : analysis.score}
            <span className="text-base font-normal text-[var(--color-on-surface-variant)]"> {t("recruiter.screening.github.scoreSuffix")}</span>
          </p>
          <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">
            {translateOrFallback("recruiter.screening.github.status", analysis.status)}
            {analysis.cacheHit ? ` · ${t("recruiter.screening.github.cacheHit")}` : ""}
          </p>
        </div>
      </div>

      {busy && (
        <p className="flex items-center gap-2 text-sm leading-relaxed text-[var(--color-on-surface-variant)]">
          <LoaderCircle className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          {t("recruiter.screening.github.busyHint")}
        </p>
      )}

      {analysis.status === "NOT_PROVIDED" && (
        <p className="max-w-[65ch] rounded-2xl bg-[var(--color-surface-container-low)] p-4 text-sm leading-relaxed">
          {t("recruiter.screening.github.notProvidedHint")}
        </p>
      )}

      {(analysis.errorMessage || analysis.status === "FAILED" || analysis.status === "PARTIAL") && analysis.errorMessage && (
        <div role="alert" className="flex max-w-[65ch] items-start gap-2 rounded-xl bg-amber-50 p-3 text-sm leading-relaxed text-amber-800">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>{analysis.errorCode ? `${analysis.errorCode}: ` : ""}{analysis.errorMessage}</span>
        </div>
      )}

      {authenticity?.repositories && authenticity.repositories.length > 0 && (
        <div className="space-y-3 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-alt)] p-4">
          <h4 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-600">
            <Users className="size-3.5 text-[var(--color-primary)]" aria-hidden="true" />
            {t("recruiter.screening.github.authenticityTitle")}
          </h4>
          <div className="grid gap-3 md:grid-cols-2">
            {authenticity.repositories.map((auth) => {
              const tone = trustTone[auth.trustLevel] ?? trustTone.LOW;
              const duplicate = (auth.duplicateCvCount ?? 0) > 0;
              return (
                <div key={auth.fullName} className="space-y-2 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-3 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-slate-900">{auth.fullName}</span>
                    <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold", tone)}>
                      {translateOrFallback("recruiter.screening.github.verdict", auth.verdict)} · {auth.trustScore}/100
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-600">
                    <span>{t("recruiter.screening.github.matchedCommits")} <strong>{auth.applicantCommits ?? 0}/{auth.sampledCommits ?? 0}</strong> ({auth.applicantCommitRatio ?? 0}%)</span>
                    <span>{t("recruiter.screening.github.authorsLabel")} <strong>{auth.distinctAuthors ?? 0}</strong></span>
                    <span>{t("recruiter.screening.github.commitDaysLabel")} <strong>{auth.activeDays ?? 0}</strong></span>
                    <span>
                      {auth.fork
                        ? auth.aheadByParent != null
                          ? t("recruiter.screening.github.forkWithAhead", { count: auth.aheadByParent })
                          : t("recruiter.screening.github.forkOnly")
                        : t("recruiter.screening.github.ownRepo")}
                    </span>
                  </div>
                  {duplicate && (
                    <p className="rounded-lg bg-rose-50 px-2.5 py-1.5 text-[11px] font-medium text-rose-700">
                      {t("recruiter.screening.github.duplicateWarning", { count: auth.duplicateCvCount ?? 0 })}
                    </p>
                  )}
                  {auth.signals && auth.signals.length > 0 && (
                    <ul className="list-disc space-y-1 pl-4 text-[11px] leading-relaxed text-slate-600">
                      {auth.signals.map((sig) => <li key={sig}>{sig}</li>)}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {result?.repositories && result.repositories.length > 0 && (
        <ul className="grid gap-2 md:grid-cols-2">
          {result.repositories.map((repo: RepoSnapshot) => {
            const href = githubHref(repo.url);
            return (
              <li key={`${repo.fullName}-${repo.commitSha}`} className="rounded-xl bg-[var(--color-surface-container-low)] px-3 py-2.5 text-sm">
                <div className="flex items-center justify-between gap-2">
                  {href ? (
                    <a className="inline-flex items-center gap-1 font-medium text-[var(--color-primary)] underline-offset-2 hover:underline" href={href} target="_blank" rel="noreferrer">
                      {repo.fullName}
                      <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
                    </a>
                  ) : <span className="font-medium">{repo.fullName}</span>}
                  {repo.cache && repo.cache !== "NONE" && repo.cache !== "MISS" && (
                    <span className="rounded bg-white/80 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                      {repo.cache === "EARLY_STOP" ? t("recruiter.screening.github.earlyStopBadge") : repo.cache}
                    </span>
                  )}
                </div>
                <span className="mt-1 block text-xs leading-relaxed text-[var(--color-on-surface-variant)]">
                  {repo.language || t("recruiter.screening.github.unknownLanguage")} · {repo.commitSha ? repo.commitSha.slice(0, 7) : t("recruiter.screening.github.noCommitsYet")} · {repo.status}
                  {repo.error ? ` · ${repo.error}` : ""}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {(result?.summary || result?.authenticityCue) && (
        <div className="space-y-2 rounded-2xl bg-[var(--color-primary-subtle)] p-4 text-sm leading-relaxed">
          {result?.summary && <p>{result.summary}</p>}
          {result?.authenticityCue && (
            <p className="flex items-start gap-1.5 border-t border-[var(--color-primary)]/15 pt-2 text-xs text-slate-700">
              <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-[var(--color-primary)]" aria-hidden="true" />
              <span><strong>{t("recruiter.screening.github.authenticityCueLabel")}</strong> {result.authenticityCue}</span>
            </p>
          )}
        </div>
      )}

      {evidenced.length > 0 && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold">{t("recruiter.screening.github.evidencedTitle")} <span className="font-normal text-[var(--color-on-surface-variant)]">· {evidenced.length}</span></h4>
          <ul className="grid items-start gap-3 lg:grid-cols-2">
            {evidenced.map((skill) => <SkillCard key={skill.name} skill={skill} shaByRepo={shaByRepo} />)}
          </ul>
        </div>
      )}

      {result?.claimChecks && result.claimChecks.length > 0 && (
        <div className="space-y-2.5 rounded-2xl border border-[var(--color-border-default)] p-4">
          <h4 className="text-sm font-semibold">{t("recruiter.screening.github.claimChecksTitle")}</h4>
          <ul className="space-y-2">
            {result.claimChecks.map((item) => {
              const tone = claimStatusTone[item.status] ?? claimStatusTone.NOT_FOUND;
              const statusKey = item.status in claimStatusTone ? item.status : "NOT_FOUND";
              return (
                <li key={`${item.claim}-${item.status}`} className="flex flex-wrap items-start justify-between gap-2 rounded-xl bg-[var(--color-surface-alt)] px-3 py-2 text-xs">
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <p className="font-semibold text-slate-900">{item.claim}</p>
                    <p className="leading-relaxed text-slate-600">{item.note}</p>
                  </div>
                  <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold", tone)}>
                    {translateOrFallback("recruiter.screening.github.claimStatus", statusKey)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {result?.interviewProbes && result.interviewProbes.length > 0 && (
        <div className="space-y-2.5 rounded-2xl border border-[var(--color-border-default)] p-4">
          <h4 className="flex items-center gap-1.5 text-sm font-semibold">
            <MessageCircleQuestion className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
            {t("recruiter.screening.github.interviewProbesTitle")}
          </h4>
          <ul className="space-y-2">
            {result.interviewProbes.map((probe) => {
              const sha = probe.repository ? shaByRepo.get(probe.repository) : undefined;
              const blobUrl = githubBlobHref(probe.repository, sha, probe.filePath);
              return (
                <li key={`${probe.topic}-${probe.question}`} className="rounded-xl bg-[var(--color-surface-container-low)] p-3 text-xs">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold text-slate-900">{probe.topic}</span>
                    {probe.filePath && (
                      blobUrl ? (
                        <a href={blobUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 font-mono text-[11px] text-[var(--color-primary)] hover:underline">
                          {probe.filePath}
                          <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
                        </a>
                      ) : (
                        <code className="font-mono text-[11px] text-slate-600">{probe.filePath}</code>
                      )
                    )}
                  </div>
                  <p className="mt-1 leading-relaxed text-slate-700">{probe.question}</p>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {unverified.length > 0 && (
        <details className="rounded-2xl border border-[var(--color-border-default)]">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
            {t("recruiter.screening.github.unverifiedTitle")} <span className="font-normal text-[var(--color-on-surface-variant)]">· {unverified.length}</span>
          </summary>
          <ul className="grid items-start gap-3 border-t border-[var(--color-border-default)] p-4 lg:grid-cols-2">
            {unverified.map((skill) => <SkillCard key={skill.name} skill={skill} shaByRepo={shaByRepo} />)}
          </ul>
        </details>
      )}

      {(Boolean(result?.strengths?.length) || Boolean(result?.improvements?.length)) && (
        <div className="grid items-start gap-5 lg:grid-cols-2">
          {result?.strengths && result.strengths.length > 0 && (
            <div className="max-w-[65ch]">
              <h4 className="text-sm font-semibold">{t("recruiter.screening.github.strengthsTitle")}</h4>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed">{result.strengths.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          )}
          {result?.improvements && result.improvements.length > 0 && (
            <div className="max-w-[65ch]">
              <h4 className="text-sm font-semibold">{t("recruiter.screening.github.improvementsTitle")}</h4>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed">{result.improvements.map((item) => <li key={item}>{item}</li>)}</ul>
            </div>
          )}
        </div>
      )}

      {result?.unverified && result.unverified.length > 0 && (
        <p className="max-w-[65ch] text-xs leading-relaxed text-[var(--color-on-surface-variant)]">
          {t("recruiter.screening.github.unverifiedList", { items: result.unverified.join(", ") })}
        </p>
      )}
      {result?.limits?.omitted && result.limits.omitted.length > 0 && (
        <p className="max-w-[65ch] text-xs leading-relaxed text-[var(--color-on-surface-variant)]">
          {t("recruiter.screening.github.omittedList", { items: result.limits.omitted.join(", ") })}
        </p>
      )}
      {result?.limits && (
        <p className="text-[11px] leading-relaxed text-slate-500">
          {t("recruiter.screening.github.analysisCost", {
            filesRead: result.limits.filesRead ?? 0,
            promptTokens: analysis.promptTokens,
            completionTokens: analysis.completionTokens,
            githubRequests: result.limits.githubRequests ?? 0,
          })}
        </p>
      )}
      {result?.notes?.map((note) => <p key={note} className="max-w-[65ch] text-xs leading-relaxed text-[var(--color-on-surface-variant)]">{note}</p>)}
    </section>
  );
}

function SkillCard({ skill, shaByRepo }: { skill: GithubSkill; shaByRepo: Map<string, string> }) {
  const t = useT();
  const tone = skillStatusTone[skill.status] ?? skillStatusTone.UNVERIFIED;
  const statusKey = `recruiter.screening.github.skillStatus.${skill.status}`;
  const statusText = t(statusKey);
  return (
    <li className="space-y-3 rounded-2xl border border-[var(--color-border-default)] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold">{skill.name}</span>
        <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-semibold", tone)}>
          {statusText === statusKey ? skill.status : statusText}
        </span>
      </div>
      {skill.evidence && skill.evidence.length > 0 && (
        <ul className="space-y-3">
          {skill.evidence.map((item) => {
            const sha = item.repository ? shaByRepo.get(item.repository) : undefined;
            const blobUrl = githubBlobHref(item.repository, sha, item.path);
            return (
              <li key={`${item.repository ?? ""}-${item.path}-${item.observation}`} className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  {item.repository && (
                    <span className="rounded bg-[var(--color-primary-soft)] px-1.5 py-0.5 font-mono text-[10px] font-semibold text-[var(--color-primary-hover)]">
                      {item.repository}
                    </span>
                  )}
                  {blobUrl ? (
                    <a
                      href={blobUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-md bg-[var(--color-surface-container-low)] px-2 py-1 font-mono text-[11px] leading-5 text-[var(--color-primary)] hover:underline"
                    >
                      <span>{item.path}</span>
                      <ExternalLink className="size-3 shrink-0" aria-hidden="true" />
                    </a>
                  ) : (
                    <code className="block w-fit max-w-full overflow-x-auto rounded-md bg-[var(--color-surface-container-low)] px-2 py-1 font-mono text-[11px] leading-5 text-[var(--color-on-surface)]">
                      {item.path}
                    </code>
                  )}
                </div>
                <p className="max-w-[62ch] text-xs italic leading-relaxed text-[var(--color-on-surface-variant)]">{item.observation}</p>
              </li>
            );
          })}
        </ul>
      )}
      {skill.limit && (
        <p className="max-w-[62ch] border-l-2 border-amber-300 pl-3 text-xs not-italic leading-relaxed text-amber-900">{skill.limit}</p>
      )}
    </li>
  );
}
