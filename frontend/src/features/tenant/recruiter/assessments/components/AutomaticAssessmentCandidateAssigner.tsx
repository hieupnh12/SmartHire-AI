import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Users,
} from "lucide-react";
import { applicantApi } from "@/api/tenant/applicantApi";
import { assessmentApi } from "@/api/tenant/assessmentApi";
import { assessmentGenerationApi } from "@/api/tenant/assessmentGenerationApi";
import type { ApplicationSummary } from "@/api/types/applicant";
import { Button } from "@/components/ux/Button";
import { Tooltip } from "@/components/ux/Tooltip";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n";
import { toast } from "@/stores/toastStore";
import type { JobTest } from "@/api/types/assessment";
import { useRecruitmentJob } from "../../jobs/components/JobRecruitmentWorkspace";

const MANUAL_STATUSES = new Set(["INTERVIEW", "ASSESSMENT"]);
const APPLICATION_STAGE_KEYS = new Set([
  "NEW",
  "IN_REVIEW",
  "SCREENING",
  "ASSESSMENT",
  "INTERVIEW",
  "HUMAN_INTERVIEW",
  "OFFER",
  "HIRED",
  "REJECTED",
  "WITHDRAWN",
]);

/** Published paper composed from the bank, not yet given to a candidate. AI papers are excluded. */
function isHandout(test: JobTest) {
  return test.status === "PUBLISHED" && !test.assignedApplicationId && test.origin !== "GENERATED";
}

export function AutomaticAssessmentCandidateAssigner() {
  const t = useT();
  const job = useRecruitmentJob();
  const queryClient = useQueryClient();
  const basePath = `/recruiter/jobs/${job.id}/assessments`;

  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [templateId, setTemplateId] = useState<number | null>(null);

  // Lấy cấu hình bài tập hiện tại của job
  const configQuery = useQuery({
    queryKey: [...queryKeys.assessments.all(), "configuration", job.id],
    queryFn: () => assessmentGenerationApi.configuration(job.id),
  });

  // Lấy trạng thái ngân hàng câu hỏi
  const statusQuery = useQuery({
    queryKey: [...queryKeys.assessments.all(), "automation-status", job.id],
    queryFn: () => assessmentGenerationApi.status(job.id),
    refetchInterval: 15000,
  });

  // Lấy danh sách hồ sơ ứng viên của job
  const applicantsQuery = useQuery({
    queryKey: ["recruiter", "job-applications", job.id],
    queryFn: () => applicantApi.listByJob(job.id, { size: 100 }),
  });

  // Lấy danh sách các bài thi đã tạo cho job (để biết ai đã có đề riêng)
  const testsQuery = useQuery({
    queryKey: [...queryKeys.assessments.all(), "job", job.id],
    queryFn: () => assessmentApi.listForJob(job.id),
  });

  const config = configQuery.data;
  const status = statusQuery.data;

  // Map các application đã có bài thi
  const assignedAppIds = useMemo(() => {
    const set = new Set<number>();
    for (const test of testsQuery.data?.items ?? []) {
      if (test.assignedApplicationId) {
        set.add(test.assignedApplicationId);
      }
    }
    return set;
  }, [testsQuery.data]);

  const testByApplication = useMemo(() => {
    const map = new Map<number, JobTest>();
    for (const test of testsQuery.data?.items ?? []) {
      if (test.assignedApplicationId) map.set(test.assignedApplicationId, test);
    }
    return map;
  }, [testsQuery.data]);

  const templateTests = useMemo(
    () => (testsQuery.data?.items ?? []).filter(isHandout),
    [testsQuery.data],
  );
  const activeTemplateId = templateTests.some((test) => test.id === templateId)
    ? templateId
    : (templateTests[0]?.id ?? null);
  const activeTemplate = templateTests.find((test) => test.id === activeTemplateId) ?? null;
  const autoOn = config?.autoAssign === true;

  // Danh sách ứng viên
  const applications: ApplicationSummary[] = useMemo(() => {
    return applicantsQuery.data?.data?.items ?? [];
  }, [applicantsQuery.data]);

  // Lọc theo từ khóa tìm kiếm
  const filteredApplications = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return applications;
    return applications.filter(
      (app) =>
        app.candidateName.toLowerCase().includes(q) ||
        app.candidateEmail.toLowerCase().includes(q) ||
        String(app.id).includes(q),
    );
  }, [applications, search]);

  // Các ứng viên chưa có bài thi (có thể chọn)
  const selectableApplications = useMemo(() => {
    return filteredApplications.filter((app) => !assignedAppIds.has(app.id));
  }, [filteredApplications, assignedAppIds]);

  const canReceiveTemplate = (status: string) => MANUAL_STATUSES.has(status);
  const selectedTemplateTargets = selectableApplications.filter(
    (app) => selectedIds.includes(app.id) && canReceiveTemplate(app.status),
  );

  const allSelectableSelected =
    selectableApplications.length > 0 &&
    selectableApplications.every((app) => selectedIds.includes(app.id));

  const toggleSelectAll = () => {
    if (allSelectableSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(selectableApplications.map((app) => app.id));
    }
  };

  const toggleSelectOne = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  // Mutation tạo đề cho danh sách ứng viên được chọn
  const assignMutation = useMutation({
    mutationFn: async (appIds: number[]) => {
      const results = [];
      for (const id of appIds) {
        const test = await assessmentGenerationApi.generateForApplication(job.id, id);
        results.push(test);
      }
      return results;
    },
    onSuccess: async (results) => {
      setSelectedIds([]);
      toast.success(
        t("recruiter.assessments.assigner.assignSuccessTitle"),
        t("recruiter.assessments.assigner.assignSuccessDesc", { count: results.length }),
      );
      await queryClient.invalidateQueries({ queryKey: queryKeys.assessments.all() });
      await queryClient.invalidateQueries({ queryKey: ["recruiter", "job-applications", job.id] });
    },
    onError: (err: any) => {
      toast.error(
        t("recruiter.assessments.assigner.assignErrorTitle"),
        err?.response?.data?.message ?? err?.message ?? t("recruiter.assessments.assigner.assignErrorFallback"),
      );
    },
  });

  // Mutation gửi lại thông báo & email lời mời
  const sendTemplateMutation = useMutation({
    mutationFn: async (appIds: number[]) => {
      if (activeTemplateId == null) throw new Error(t("recruiter.assessments.assigner.noTemplateError"));
      const results = [];
      for (const id of appIds) {
        results.push(await assessmentApi.assignToApplication(activeTemplateId, id));
      }
      return results;
    },
    onSuccess: async (results) => {
      setSelectedIds([]);
      toast.success(
        t("recruiter.assessments.assigner.sendTemplateSuccessTitle"),
        t("recruiter.assessments.assigner.sendTemplateSuccessDesc", {
          title: activeTemplate?.title ?? t("recruiter.assessments.assigner.selectedTemplateFallback"),
          count: results.length,
        }),
      );
      await queryClient.invalidateQueries({ queryKey: queryKeys.assessments.all() });
      await queryClient.invalidateQueries({ queryKey: ["recruiter", "job-applications", job.id] });
    },
    onError: (err: any) => {
      toast.error(
        t("recruiter.assessments.assigner.sendTemplateErrorTitle"),
        err?.response?.data?.message ?? err?.message ?? t("recruiter.assessments.assigner.sendTemplateErrorFallback"),
      );
    },
  });

  const resendMutation = useMutation({
    mutationFn: ({ testId, appId }: { testId: number; appId: number }) => assessmentApi.send(testId, appId),
    onSuccess: () => {
      toast.success(
        t("recruiter.assessments.assigner.resendSuccessTitle"),
        t("recruiter.assessments.assigner.resendSuccessDesc"),
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.assessments.all() });
      void queryClient.invalidateQueries({ queryKey: ["recruiter", "job-applications", job.id] });
    },
    onError: (err: any) => {
      toast.error(
        t("recruiter.assessments.assigner.resendErrorTitle"),
        err?.response?.data?.message ?? err?.message ?? t("recruiter.assessments.assigner.resendErrorFallback"),
      );
    },
  });

  const totalQuestions = config?.sections?.reduce((sum, s) => sum + (Number(s.count) || 0), 0) ?? 0;
  const totalPoints = config?.sections?.reduce((sum, s) => sum + (Number(s.count) || 0) * (Number(s.points) || 0), 0) ?? 0;

  return (
    <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
      {/* Header & Thanh công cụ */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-4 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <h2 className="text-[16px] font-bold tracking-tight text-[#101828] dark:text-white">
              {t("recruiter.assessments.assigner.heading")}
            </h2>
            <Tooltip
              content={t("recruiter.assessments.assigner.headingTooltip")}
              side="top"
            >
              <span className="inline-flex cursor-help items-center text-[#667085] hover:text-[var(--color-primary)] transition-colors">
                <HelpCircle className="size-3.5" aria-hidden="true" />
              </span>
            </Tooltip>
          </div>

          {configQuery.isPending ? (
            <div className="flex items-center gap-1.5 text-xs text-[#667085]">
              <RefreshCw className="size-3 animate-spin text-[var(--color-primary)]" />
              {t("recruiter.assessments.common.loadingEllipsis")}
            </div>
          ) : config ? (
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {t("recruiter.assessments.assigner.summaryQuestionsPoints", { count: totalQuestions, points: totalPoints })}
              </span>
              <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {t("recruiter.assessments.assigner.summaryDuration", { minutes: config.durationMinutes })}
              </span>
              <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950 dark:text-emerald-300">
                {t("recruiter.assessments.assigner.summaryPassing", {
                  percent: config.passingPercent,
                  points: Math.round((totalPoints * config.passingPercent) / 100),
                })}
              </span>
            </div>
          ) : null}
        </div>

        <div className="relative min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#667085]" />
          <input
            type="text"
            placeholder={t("recruiter.assessments.assigner.searchPlaceholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-[13px] text-[#101828] placeholder:text-[#667085] focus:border-[var(--color-primary)] focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>
      </div>

      {/* Cảnh báo trạng thái */}
      {status?.bankError && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700" role="alert">
          <AlertCircle className="size-4 shrink-0 text-rose-600" />
          <span>{t("recruiter.assessments.assigner.bankNotReadyWarning", { error: status.bankError })}</span>
        </div>
      )}
      {!configQuery.isPending && !config && (
        <div className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
          {t("recruiter.assessments.assigner.noConfigNoticePrefix")}
          <strong>{t("recruiter.assessments.assigner.noConfigNoticeGeneral")}</strong>
          {t("recruiter.assessments.assigner.noConfigNoticeAnd")}
          <strong>{t("recruiter.assessments.assigner.noConfigNoticeExercise")}</strong>
          {t("recruiter.assessments.assigner.noConfigNoticeSuffix")}
        </div>
      )}
      {config && (
        <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-[#475467] dark:bg-slate-800/60 dark:text-slate-300">
          {autoOn ? (
            <>
              <strong className="text-[#101828] dark:text-white">{t("recruiter.assessments.assigner.autoOnPrefix")}</strong>
              {t("recruiter.assessments.assigner.autoOnDesc")}
            </>
          ) : (
            <>
              <strong className="text-[#101828] dark:text-white">{t("recruiter.assessments.assigner.autoOffPrefix")}</strong>
              {t("recruiter.assessments.assigner.autoOffDesc")}
            </>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-semibold text-[#475467] dark:text-slate-300">
          {t("recruiter.assessments.assigner.templateSelectLabel")}
          <select
            value={activeTemplateId ?? ""}
            onChange={(event) => setTemplateId(event.target.value ? Number(event.target.value) : null)}
            disabled={templateTests.length === 0 || sendTemplateMutation.isPending}
            className="h-9 max-w-md rounded-lg border border-slate-300 bg-white px-3 text-[13px] font-medium text-[#101828] focus:border-[var(--color-primary)] focus:outline-none disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            {templateTests.length === 0 ? (
              <option value="">{t("recruiter.assessments.assigner.noTemplatesOption")}</option>
            ) : (
              templateTests.map((test) => (
                <option key={test.id} value={test.id}>
                  {t("recruiter.assessments.assigner.templateOptionLabel", { title: test.title, minutes: test.durationMinutes })}
                </option>
              ))
            )}
          </select>
        </label>
        <p className="max-w-sm text-[12px] text-[#667085] dark:text-slate-400">
          {templateTests.length === 0 ? (
            <>
              {t("recruiter.assessments.assigner.noTemplatesHintPrefix")}
              <Link to={`${basePath}/excel-template`} className="font-semibold text-[var(--color-primary)] hover:underline">
                {t("recruiter.assessments.assigner.noTemplatesHintLink")}
              </Link>
              {t("recruiter.assessments.assigner.noTemplatesHintSuffix")}
            </>
          ) : (
            <>{t("recruiter.assessments.assigner.templatesAllowedHint")}</>
          )}
        </p>
      </div>

      {/* Bảng ứng viên */}
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-800">
          {applicantsQuery.isPending ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 p-8 text-center">
              <RefreshCw className="size-6 animate-spin text-[var(--color-primary)]" />
              <p className="text-[12px] text-[#667085]">{t("recruiter.assessments.assigner.loadingApplicants")}</p>
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center p-8 text-center">
              <Users className="size-10 text-[#667085]/60" />
              <p className="mt-2 text-[14px] font-semibold text-[#101828] dark:text-white">{t("recruiter.assessments.assigner.noApplicantsTitle")}</p>
              <p className="mt-1 text-[12px] text-[#667085] dark:text-slate-400">
                {applications.length === 0
                  ? t("recruiter.assessments.assigner.noApplicantsEmpty")
                  : t("recruiter.assessments.assigner.noApplicantsSearch")}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-[13px] leading-relaxed">
                <thead className="border-b border-slate-200/80 bg-slate-50/70 text-[12px] font-semibold text-[#475467] dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
                  <tr>
                    <th className="w-10 px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={allSelectableSelected}
                        disabled={selectableApplications.length === 0 || assignMutation.isPending || sendTemplateMutation.isPending}
                        onChange={toggleSelectAll}
                        className="size-4 rounded accent-[var(--color-primary)]"
                        aria-label={t("recruiter.assessments.assigner.selectAllAria")}
                      />
                    </th>
                    <th className="px-4 py-3 font-semibold">{t("recruiter.assessments.assigner.colCandidate")}</th>
                    <th className="px-4 py-3 font-semibold">{t("recruiter.assessments.assigner.colStage")}</th>
                    <th className="px-4 py-3 font-semibold">{t("recruiter.assessments.assigner.colTestStatus")}</th>
                    <th className="px-4 py-3 text-right font-semibold">{t("recruiter.assessments.assigner.colActions")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200/70 bg-white dark:divide-slate-800 dark:bg-slate-900">
                  {filteredApplications.map((app) => {
                    const hasTest = assignedAppIds.has(app.id);
                    const isSelected = selectedIds.includes(app.id);

                    return (
                      <tr
                        key={app.id}
                        className={cn(
                          "transition-colors hover:bg-slate-50/60 dark:hover:bg-slate-800/40",
                          isSelected && "bg-[var(--color-primary-subtle)]",
                        )}
                      >
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={hasTest || assignMutation.isPending || sendTemplateMutation.isPending}
                            onChange={() => toggleSelectOne(app.id)}
                            className="size-4 rounded accent-[var(--color-primary)] disabled:opacity-30"
                            aria-label={t("recruiter.assessments.assigner.selectApplicantAria", { name: app.candidateName })}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-[#101828] dark:text-white">{app.candidateName}</div>
                          <div className="text-[12px] text-[#667085] dark:text-slate-400">{app.candidateEmail}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold",
                              app.status === "ASSESSMENT"
                                ? "bg-[var(--color-primary-soft)] text-[var(--color-primary-hover)] border border-[var(--color-primary)]/20"
                                : "bg-slate-100 text-[#475467] dark:bg-slate-800 dark:text-slate-300",
                            )}
                          >
                            {APPLICATION_STAGE_KEYS.has(app.status)
                              ? t(`recruiter.assessments.common.applicationStages.${app.status}`)
                              : app.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {hasTest ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950 dark:text-emerald-300">
                              <CheckCircle2 className="size-3 text-emerald-500" />
                              {testByApplication.get(app.id)?.title ?? t("recruiter.assessments.assigner.assignedTestFallback")}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-[#667085] dark:bg-slate-800 dark:text-slate-400">
                              {t("recruiter.assessments.assigner.unassignedBadge")}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {!hasTest ? (
                            <div className="flex flex-wrap items-center justify-end gap-1.5">
                              <button
                                type="button"
                                disabled={
                                  sendTemplateMutation.isPending
                                  || assignMutation.isPending
                                  || activeTemplateId == null
                                  || !canReceiveTemplate(app.status)
                                }
                                title={
                                  activeTemplateId == null
                                    ? t("recruiter.assessments.assigner.needManualTemplateTooltip")
                                    : !canReceiveTemplate(app.status)
                                      ? t("recruiter.assessments.assigner.stageNotAllowedTooltip")
                                      : t("recruiter.assessments.assigner.sendTemplateTooltip", {
                                          title: activeTemplate?.title ?? t("recruiter.assessments.assigner.selectedTemplateFallback"),
                                        })
                                }
                                onClick={() => sendTemplateMutation.mutate([app.id])}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[12px] font-semibold text-[#344054] transition-colors hover:bg-slate-50 disabled:opacity-40 cursor-pointer dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                              >
                                <Send className="size-3" />
                                {t("recruiter.assessments.assigner.sendTemplateBtn")}
                              </button>
                              <button
                                type="button"
                                disabled={assignMutation.isPending || sendTemplateMutation.isPending || !!status?.bankError || !config}
                                title={
                                  status?.bankError
                                    ? t("recruiter.assessments.assigner.bankInsufficientTooltip")
                                    : t("recruiter.assessments.assigner.autoGenerateTooltip")
                                }
                                onClick={() => assignMutation.mutate([app.id])}
                                className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-primary)]/25 bg-[var(--color-primary-soft)] px-2.5 py-1 text-[12px] font-semibold text-[var(--color-primary-hover)] transition-colors hover:bg-[var(--color-primary)] hover:text-white disabled:opacity-40 cursor-pointer"
                              >
                                <Sparkles className="size-3" />
                                {t("recruiter.assessments.assigner.autoGenerateBtn")}
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={resendMutation.isPending}
                              onClick={() => {
                                const assignedTest = testByApplication.get(app.id);
                                if (assignedTest) resendMutation.mutate({ testId: assignedTest.id, appId: app.id });
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[12px] font-medium text-[#475467] transition-colors hover:bg-slate-100 disabled:opacity-40 cursor-pointer dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                              title={t("recruiter.assessments.assigner.resendTooltip")}
                            >
                              <Send className="size-3" />
                              {resendMutation.isPending
                                ? t("recruiter.assessments.assigner.sendingBtn")
                                : t("recruiter.assessments.assigner.resendBtn")}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Thanh hành động chính dưới cùng */}
        <div className="mt-5 flex flex-col gap-3 border-t border-[var(--color-border-default)] pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-xs text-[var(--color-on-surface-variant)]">
            {t("recruiter.assessments.assigner.footerSummary", {
              selected: selectedIds.length,
              total: selectableApplications.length,
              eligible: selectedTemplateTargets.length,
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="secondary"
              disabled={selectedTemplateTargets.length === 0 || sendTemplateMutation.isPending || assignMutation.isPending || activeTemplateId == null}
              onClick={() => sendTemplateMutation.mutate(selectedTemplateTargets.map((app) => app.id))}
              className="min-h-10 px-4 text-sm font-semibold"
            >
              <Send className="size-4" />
              {sendTemplateMutation.isPending
                ? t("recruiter.assessments.assigner.assigningTemplateBtn")
                : selectedTemplateTargets.length > 0
                  ? t("recruiter.assessments.assigner.assignSelectedTemplateForBtn", {
                      count: selectedTemplateTargets.length,
                    })
                  : t("recruiter.assessments.assigner.assignSelectedTemplateBtn")}
            </Button>
            <Button
              type="button"
              variant="primary"
              disabled={selectedIds.length === 0 || assignMutation.isPending || sendTemplateMutation.isPending || !!status?.bankError || !config}
              onClick={() => assignMutation.mutate(selectedIds)}
              className="min-h-10 px-5 text-sm font-semibold"
            >
              <Sparkles className="size-4" />
              {assignMutation.isPending
                ? t("recruiter.assessments.assigner.autoGeneratingBtn")
                : selectedIds.length > 0
                  ? t("recruiter.assessments.assigner.autoGenerateForBtn", { count: selectedIds.length })
                  : t("recruiter.assessments.assigner.autoGenerateBtn")}
            </Button>
          </div>
        </div>
      </div>
  );
}
