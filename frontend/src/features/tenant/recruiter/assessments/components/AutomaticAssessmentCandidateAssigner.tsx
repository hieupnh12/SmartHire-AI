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
import { toast } from "@/stores/toastStore";
import type { JobTest } from "@/api/types/assessment";
import { useRecruitmentJob } from "../../jobs/components/JobRecruitmentWorkspace";

const MANUAL_STATUSES = new Set(["INTERVIEW", "ASSESSMENT"]);

/** Published paper composed from the bank, not yet given to a candidate. AI papers are excluded. */
function isHandout(test: JobTest) {
  return test.status === "PUBLISHED" && !test.assignedApplicationId && test.origin !== "GENERATED";
}

export function AutomaticAssessmentCandidateAssigner() {
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
        "Giao đề thành công",
        `Đã tự động tạo và giao bài đánh giá cho ${results.length} ứng viên!`,
      );
      await queryClient.invalidateQueries({ queryKey: queryKeys.assessments.all() });
      await queryClient.invalidateQueries({ queryKey: ["recruiter", "job-applications", job.id] });
    },
    onError: (err: any) => {
      toast.error(
        "Lỗi giao bài",
        err?.response?.data?.message ?? err?.message ?? "Không thể tạo bài đánh giá cho ứng viên.",
      );
    },
  });

  // Mutation gửi lại thông báo & email lời mời
  const sendTemplateMutation = useMutation({
    mutationFn: async (appIds: number[]) => {
      if (activeTemplateId == null) throw new Error("Chưa chọn đề để giao");
      const results = [];
      for (const id of appIds) {
        results.push(await assessmentApi.assignToApplication(activeTemplateId, id));
      }
      return results;
    },
    onSuccess: async (results) => {
      setSelectedIds([]);
      toast.success(
        "Đã giao đề",
        `Đã gửi «${activeTemplate?.title ?? "đề đã chọn"}» cho ${results.length} ứng viên.`,
      );
      await queryClient.invalidateQueries({ queryKey: queryKeys.assessments.all() });
      await queryClient.invalidateQueries({ queryKey: ["recruiter", "job-applications", job.id] });
    },
    onError: (err: any) => {
      toast.error(
        "Không giao được đề",
        err?.response?.data?.message ?? err?.message ?? "Không thể giao đề đã chọn.",
      );
    },
  });

  const resendMutation = useMutation({
    mutationFn: ({ testId, appId }: { testId: number; appId: number }) => assessmentApi.send(testId, appId),
    onSuccess: () => {
      toast.success(
        "Đã gửi lại lời mời",
        "Đã gửi lại thông báo và email lời mời làm bài thi cho ứng viên!",
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.assessments.all() });
      void queryClient.invalidateQueries({ queryKey: ["recruiter", "job-applications", job.id] });
    },
    onError: (err: any) => {
      toast.error(
        "Lỗi gửi lời mời",
        err?.response?.data?.message ?? err?.message ?? "Không thể gửi lại lời mời.",
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
              Giao đề cho ứng viên
            </h2>
            <Tooltip
              content="Tạo tự động bốc câu từ ngân hàng và gắn sẵn một hồ sơ — đó là đề AI. Đề muốn giao chỉ gồm đề Thường: soạn từ Ngân hàng câu hỏi, đã xuất bản và chưa giao cho ai."
              side="top"
            >
              <span className="inline-flex cursor-help items-center text-[#667085] hover:text-[#0066FF] transition-colors">
                <HelpCircle className="size-3.5" aria-hidden="true" />
              </span>
            </Tooltip>
          </div>

          {configQuery.isPending ? (
            <div className="flex items-center gap-1.5 text-xs text-[#667085]">
              <RefreshCw className="size-3 animate-spin text-[#0066FF]" />
              Đang tải...
            </div>
          ) : config ? (
            <div className="flex flex-wrap items-center gap-1.5 text-xs">
              <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {totalQuestions} câu · {totalPoints} điểm
              </span>
              <span className="rounded-md bg-slate-100 px-2 py-0.5 font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {config.durationMinutes} phút
              </span>
              <span className="rounded-md bg-emerald-50 px-2 py-0.5 font-medium text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950 dark:text-emerald-300">
                Điểm đạt: {config.passingPercent}% ({Math.round((totalPoints * config.passingPercent) / 100)}đ)
              </span>
            </div>
          ) : null}
        </div>

        <div className="relative min-w-[240px]">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#667085]" />
          <input
            type="text"
            placeholder="Tìm ứng viên theo tên, email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-slate-300 bg-white pl-9 pr-3 text-[13px] text-[#101828] placeholder:text-[#667085] focus:border-[#0066FF] focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          />
        </div>
      </div>

      {/* Cảnh báo trạng thái */}
      {status?.bankError && (
        <div className="mt-3 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-xs text-rose-700" role="alert">
          <AlertCircle className="size-4 shrink-0 text-rose-600" />
          <span>Ngân hàng câu hỏi chưa đáp ứng đủ cấu hình: {status.bankError}</span>
        </div>
      )}
      {!configQuery.isPending && !config && (
        <div className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-800">
          Chưa có cấu hình bài đánh giá. Vui lòng thiết lập cấu hình ở mục <strong>Chung</strong> và <strong>Bài tập</strong> trước khi tạo đề tự động.
        </div>
      )}
      {config && (
        <div className="mt-3 rounded-xl bg-slate-50 p-3 text-xs leading-relaxed text-[#475467] dark:bg-slate-800/60 dark:text-slate-300">
          {autoOn ? (
            <>
              <strong className="text-[#101828] dark:text-white">Tự giao đang bật.</strong> Hồ sơ vào vòng Assessment thì hệ thống tự tạo đề AI. Bạn vẫn giao trước được một đề Thường đã xuất bản và chưa giao. Hồ sơ đã có đề thì hệ thống không tạo thêm.
            </>
          ) : (
            <>
              <strong className="text-[#101828] dark:text-white">Tự giao đang tắt.</strong> Hệ thống không tự tạo đề. Chọn đề Thường đã xuất bản để giao, hoặc bấm Tạo tự động để ra đề AI cho từng người.
            </>
          )}
        </div>
      )}

      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <label className="flex min-w-0 flex-1 flex-col gap-1 text-xs font-semibold text-[#475467] dark:text-slate-300">
          Đề muốn giao
          <select
            value={activeTemplateId ?? ""}
            onChange={(event) => setTemplateId(event.target.value ? Number(event.target.value) : null)}
            disabled={templateTests.length === 0 || sendTemplateMutation.isPending}
            className="h-9 max-w-md rounded-lg border border-slate-300 bg-white px-3 text-[13px] font-medium text-[#101828] focus:border-[#0066FF] focus:outline-none disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
          >
            {templateTests.length === 0 ? (
              <option value="">Chưa có đề Thường đã xuất bản và chưa giao</option>
            ) : (
              templateTests.map((test) => (
                <option key={test.id} value={test.id}>
                  {test.title} · {test.durationMinutes} phút
                </option>
              ))
            )}
          </select>
        </label>
        <p className="max-w-sm text-[12px] text-[#667085] dark:text-slate-400">
          {templateTests.length === 0 ? (
            <>
              Soạn đề ở{" "}
              <Link to={`${basePath}/excel-template`} className="font-semibold text-[#0066FF] hover:underline">Ngân hàng câu hỏi</Link>
              , rồi xuất bản. Đề Thường đã xuất bản và chưa giao cho ai mới hiện ở đây. Đề AI từ Tạo tự động không chọn được.
            </>
          ) : (
            <>Chỉ giao được cho hồ sơ đang ở vòng Phỏng vấn AI hoặc Assessment.</>
          )}
        </p>
      </div>

      {/* Bảng ứng viên */}
        <div className="mt-4 overflow-hidden rounded-xl border border-slate-200/80 dark:border-slate-800">
          {applicantsQuery.isPending ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 p-8 text-center">
              <RefreshCw className="size-6 animate-spin text-[#0066FF]" />
              <p className="text-[12px] text-[#667085]">Đang tải danh sách ứng viên...</p>
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center p-8 text-center">
              <Users className="size-10 text-[#667085]/60" />
              <p className="mt-2 text-[14px] font-semibold text-[#101828] dark:text-white">Không tìm thấy ứng viên phù hợp</p>
              <p className="mt-1 text-[12px] text-[#667085] dark:text-slate-400">
                {applications.length === 0
                  ? "Vị trí tuyển dụng này hiện chưa có ứng viên nộp hồ sơ."
                  : "Thử tìm kiếm với từ khóa khác."}
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
                        className="size-4 rounded accent-[#0066FF]"
                        aria-label="Chọn tất cả ứng viên chưa có bài"
                      />
                    </th>
                    <th className="px-4 py-3 font-semibold">Ứng viên</th>
                    <th className="px-4 py-3 font-semibold">Vòng tuyển dụng</th>
                    <th className="px-4 py-3 font-semibold">Trạng thái bài thi</th>
                    <th className="px-4 py-3 text-right font-semibold">Thao tác</th>
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
                          isSelected && "bg-blue-50/40 dark:bg-blue-950/20",
                        )}
                      >
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={hasTest || assignMutation.isPending || sendTemplateMutation.isPending}
                            onChange={() => toggleSelectOne(app.id)}
                            className="size-4 rounded accent-[#0066FF] disabled:opacity-30"
                            aria-label={`Chọn ứng viên ${app.candidateName}`}
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
                                ? "bg-blue-50 text-[#0066FF] border border-blue-200/60 dark:bg-blue-950 dark:text-blue-300"
                                : "bg-slate-100 text-[#475467] dark:bg-slate-800 dark:text-slate-300",
                            )}
                          >
                            {app.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {hasTest ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950 dark:text-emerald-300">
                              <CheckCircle2 className="size-3 text-emerald-500" />
                              {testByApplication.get(app.id)?.title ?? "Đã có bài thi riêng"}
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-[#667085] dark:bg-slate-800 dark:text-slate-400">
                              Chưa giao bài
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
                                    ? "Cần một đề Thường đã xuất bản và chưa giao cho ai"
                                    : !canReceiveTemplate(app.status)
                                      ? "Chỉ giao được khi hồ sơ đang ở vòng Phỏng vấn AI hoặc Assessment"
                                      : `Gửi «${activeTemplate?.title ?? "đề đã chọn"}» cho ứng viên này`
                                }
                                onClick={() => sendTemplateMutation.mutate([app.id])}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[12px] font-semibold text-[#344054] transition-colors hover:bg-slate-50 disabled:opacity-40 cursor-pointer dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                              >
                                <Send className="size-3" />
                                Giao đề này
                              </button>
                              <button
                                type="button"
                                disabled={assignMutation.isPending || sendTemplateMutation.isPending || !!status?.bankError || !config}
                                title={status?.bankError ? "Ngân hàng câu hỏi chưa đủ để tạo đề tự động" : "Bốc câu từ ngân hàng và tạo đề riêng"}
                                onClick={() => assignMutation.mutate([app.id])}
                                className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-[12px] font-semibold text-[#0066FF] transition-colors hover:bg-blue-100 disabled:opacity-40 cursor-pointer dark:border-blue-900 dark:bg-blue-950 dark:text-blue-300"
                              >
                                <Sparkles className="size-3" />
                                Tạo tự động
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              disabled={resendMutation.isPending}
                              onClick={() => {
                                const t = testByApplication.get(app.id);
                                if (t) resendMutation.mutate({ testId: t.id, appId: app.id });
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[12px] font-medium text-[#475467] transition-colors hover:bg-slate-100 disabled:opacity-40 cursor-pointer dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                              title="Gửi lại thông báo & email lời mời làm bài thi cho ứng viên"
                            >
                              <Send className="size-3" />
                              {resendMutation.isPending ? "Đang gửi..." : "Gửi lại lời mời"}
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
            Đã chọn <strong className="text-[var(--color-on-surface)]">{selectedIds.length}</strong> /{" "}
            {selectableApplications.length} ứng viên chưa có đề. Trong đó{" "}
            <strong className="text-[var(--color-on-surface)]">{selectedTemplateTargets.length}</strong> người đang ở vòng có thể nhận đề này.
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
                ? "Đang giao đề..."
                : `Giao đề đã chọn${selectedTemplateTargets.length > 0 ? ` cho ${selectedTemplateTargets.length} người` : ""}`}
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
                ? "Đang tự động bốc đề..."
                : `Tạo tự động${selectedIds.length > 0 ? ` cho ${selectedIds.length} người` : ""}`}
            </Button>
          </div>
        </div>
      </div>
  );
}
