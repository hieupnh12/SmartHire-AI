import { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Search,
  Settings2,
  Sparkles,
  Users,
} from "lucide-react";
import { applicantApi } from "@/api/tenant/applicantApi";
import { assessmentApi } from "@/api/tenant/assessmentApi";
import { assessmentGenerationApi } from "@/api/tenant/assessmentGenerationApi";
import type { ApplicationSummary } from "@/api/types/applicant";
import { Button } from "@/components/ux/Button";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { useRecruitmentJob } from "../../jobs/components/JobRecruitmentWorkspace";

export function AutomaticAssessmentCandidateAssigner() {
  const job = useRecruitmentJob();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const basePath = `/recruiter/jobs/${job.id}/assessments`;

  const [search, setSearch] = useState("");
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

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
      setFeedback({
        type: "success",
        message: `Đã tự động tạo và giao bài đánh giá thành công cho ${results.length} ứng viên!`,
      });
      await queryClient.invalidateQueries({ queryKey: queryKeys.assessments.all() });
      await queryClient.invalidateQueries({ queryKey: ["recruiter", "job-applications", job.id] });
    },
    onError: (err: any) => {
      setFeedback({
        type: "error",
        message: err?.response?.data?.message ?? err?.message ?? "Không thể tạo bài đánh giá cho ứng viên.",
      });
    },
  });

  // Mutation tạo đề mẫu thử nghiệm
  const sampleMutation = useMutation({
    mutationFn: () => assessmentGenerationApi.generate(job.id),
    onSuccess: async (res) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.assessments.all() });
      navigate(`${basePath}/${res.id}`);
    },
    onError: (err: any) => {
      setFeedback({
        type: "error",
        message: err?.response?.data?.message ?? err?.message ?? "Không thể tạo đề mẫu thử nghiệm.",
      });
    },
  });

  const totalQuestions = config?.sections?.reduce((sum, s) => sum + (Number(s.count) || 0), 0) ?? 0;
  const totalPoints = config?.sections?.reduce((sum, s) => sum + (Number(s.count) || 0) * (Number(s.points) || 0), 0) ?? 0;

  return (
    <div className="space-y-6">
      {/* Khối Tóm tắt Cấu hình bài tập hiện tại của Job */}
      <div className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-5 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="size-5 text-[var(--color-primary)]" />
              <h2 className="text-lg font-bold tracking-tight">Tự động tạo bài theo cấu hình của Job</h2>
            </div>
            <p className="text-sm text-[var(--color-on-surface-variant)]">
              Đề thi sẽ được hệ thống tự động bốc câu hỏi từ ngân hàng dựa trên cấu trúc bài tập đã thiết lập ở trang{" "}
              <strong className="text-[var(--color-on-surface)]">Quản lý bài đánh giá năng lực</strong>.
            </p>
          </div>

          <Link
            to={`${basePath}?tab=config`}
            className="inline-flex items-center gap-1.5 self-start whitespace-nowrap rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] px-3.5 py-2 text-xs font-semibold text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary-soft)] sm:self-auto"
          >
            <Settings2 className="size-4" />
            Xem / Chỉnh sửa cấu hình
          </Link>
        </div>

        {/* Thông số cấu hình tóm tắt */}
        {configQuery.isPending ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-[var(--color-on-surface-variant)]">
            <RefreshCw className="size-4 animate-spin text-[var(--color-primary)]" />
            Đang tải thông số cấu hình...
          </div>
        ) : config ? (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-xl bg-[var(--color-surface-container-low)] p-3">
              <span className="block text-xs text-[var(--color-on-surface-variant)]">Số lượng câu hỏi</span>
              <span className="text-base font-bold text-[var(--color-on-surface)]">{totalQuestions} câu</span>
            </div>
            <div className="rounded-xl bg-[var(--color-surface-container-low)] p-3">
              <span className="block text-xs text-[var(--color-on-surface-variant)]">Tổng điểm</span>
              <span className="text-base font-bold text-[var(--color-on-surface)]">{totalPoints} điểm</span>
            </div>
            <div className="rounded-xl bg-[var(--color-surface-container-low)] p-3">
              <span className="block text-xs text-[var(--color-on-surface-variant)]">Thời gian làm bài</span>
              <span className="text-base font-bold text-[var(--color-on-surface)]">{config.durationMinutes} phút</span>
            </div>
            <div className="rounded-xl bg-[var(--color-surface-container-low)] p-3">
              <span className="block text-xs text-[var(--color-on-surface-variant)]">Điểm đạt tối thiểu</span>
              <span className="text-base font-bold text-emerald-600">
                {config.passingPercent}% ({Math.round((totalPoints * config.passingPercent) / 100)}đ)
              </span>
            </div>
          </div>
        ) : (
          <div className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">
            Chưa có cấu hình bài tập. Vui lòng thiết lập cấu hình ở mục <strong>Cấu hình bài tập</strong> trước khi tạo đề tự động.
          </div>
        )}

        {/* Trạng thái ngân hàng */}
        {status?.bankError && (
          <div className="mt-4 flex items-center gap-2 rounded-xl bg-rose-50 p-3 text-sm text-[var(--color-error)]" role="alert">
            <AlertCircle className="size-4 shrink-0" />
            Ngân hàng câu hỏi chưa đáp ứng đủ cấu hình: {status.bankError}
          </div>
        )}
      </div>

      {/* Thông báo kết quả */}
      {feedback && (
        <div
          className={cn(
            "flex items-center gap-2 rounded-xl p-4 text-sm font-medium",
            feedback.type === "success" ? "bg-emerald-50 text-emerald-800" : "bg-rose-50 text-[var(--color-error)]",
          )}
          role="status"
        >
          {feedback.type === "success" ? (
            <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
          ) : (
            <AlertCircle className="size-5 shrink-0 text-[var(--color-error)]" />
          )}
          <span className="flex-1">{feedback.message}</span>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs font-semibold hover:underline"
          >
            Đóng
          </button>
        </div>
      )}

      {/* Khối Danh sách Ứng viên & Nút Bắt đầu tạo bài */}
      <div className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-5 shadow-[var(--shadow-card)]">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h3 className="text-base font-semibold">Chọn ứng viên để bắt đầu tạo bài</h3>
            <p className="mt-0.5 text-xs text-[var(--color-on-surface-variant)]">
              Hệ thống sẽ sinh một đề bài độc lập từ ngân hàng câu hỏi và gửi lời mời qua email/thông báo cho ứng viên.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[240px]">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-outline)]" />
              <input
                type="text"
                placeholder="Tìm ứng viên theo tên, email..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-full rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-card)] pl-9 pr-3 text-xs focus:border-[var(--color-primary)] focus:outline-none"
              />
            </div>

            <Button
              type="button"
              variant="secondary"
              disabled={sampleMutation.isPending || !!status?.bankError}
              onClick={() => sampleMutation.mutate()}
              className="text-xs"
              title="Tạo đề nháp để kiểm tra câu hỏi mà không giao cho ứng viên cụ thể"
            >
              <Sparkles className="size-3.5" />
              {sampleMutation.isPending ? "Đang tạo..." : "Tạo đề mẫu thử nghiệm"}
            </Button>
          </div>
        </div>

        {/* Bảng ứng viên */}
        <div className="mt-4 overflow-hidden rounded-xl border border-[var(--color-border-default)]">
          {applicantsQuery.isPending ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 p-8 text-center">
              <RefreshCw className="size-6 animate-spin text-[var(--color-primary)]" />
              <p className="text-xs text-[var(--color-on-surface-variant)]">Đang tải danh sách ứng viên...</p>
            </div>
          ) : filteredApplications.length === 0 ? (
            <div className="flex min-h-[200px] flex-col items-center justify-center p-8 text-center">
              <Users className="size-10 text-[var(--color-outline)]" />
              <p className="mt-2 text-sm font-semibold">Không tìm thấy ứng viên phù hợp</p>
              <p className="mt-1 text-xs text-[var(--color-on-surface-variant)]">
                {applications.length === 0
                  ? "Vị trí tuyển dụng này hiện chưa có ứng viên nộp hồ sơ. Bạn vẫn có thể bấm nút 'Tạo đề mẫu thử nghiệm' ở trên để kiểm tra bộ đề."
                  : "Thử tìm kiếm với từ khóa khác."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] text-[var(--color-on-surface-variant)]">
                  <tr>
                    <th className="w-10 px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={allSelectableSelected}
                        disabled={selectableApplications.length === 0 || assignMutation.isPending}
                        onChange={toggleSelectAll}
                        className="size-4 rounded accent-[var(--color-primary)]"
                        aria-label="Chọn tất cả ứng viên chưa có bài"
                      />
                    </th>
                    <th className="px-4 py-3 font-semibold">Ứng viên</th>
                    <th className="px-4 py-3 font-semibold">Vòng tuyển dụng</th>
                    <th className="px-4 py-3 font-semibold">Trạng thái bài thi</th>
                    <th className="px-4 py-3 text-right font-semibold">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--color-border-default)] bg-[var(--color-surface-card)]">
                  {filteredApplications.map((app) => {
                    const hasTest = assignedAppIds.has(app.id);
                    const isSelected = selectedIds.includes(app.id);

                    return (
                      <tr
                        key={app.id}
                        className={cn(
                          "transition-colors hover:bg-[var(--color-surface-container-low)]/50",
                          isSelected && "bg-[var(--color-primary-soft)]/40",
                        )}
                      >
                        <td className="px-4 py-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            disabled={hasTest || assignMutation.isPending}
                            onChange={() => toggleSelectOne(app.id)}
                            className="size-4 rounded accent-[var(--color-primary)] disabled:opacity-30"
                            aria-label={`Chọn ứng viên ${app.candidateName}`}
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-[var(--color-on-surface)]">{app.candidateName}</div>
                          <div className="text-[11px] text-[var(--color-on-surface-variant)]">{app.candidateEmail}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold",
                              app.status === "ASSESSMENT"
                                ? "bg-[var(--color-primary-soft)] text-[var(--color-primary-hover)]"
                                : "bg-[var(--color-surface-container-high)] text-[var(--color-on-surface-variant)]",
                            )}
                          >
                            {app.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {hasTest ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">
                              <CheckCircle2 className="size-3 text-emerald-500" />
                              Đã có bài thi riêng
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-container-low)] px-2.5 py-0.5 text-[11px] font-semibold text-[var(--color-on-surface-variant)]">
                              Chưa giao bài
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {!hasTest && (
                            <button
                              type="button"
                              disabled={assignMutation.isPending || !!status?.bankError}
                              onClick={() => assignMutation.mutate([app.id])}
                              className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-primary)] bg-[var(--color-primary-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--color-primary-hover)] transition-colors hover:bg-[var(--color-primary)]/20 disabled:opacity-40"
                            >
                              <Sparkles className="size-3" />
                              Tạo bài cho ứng viên này
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
            {selectableApplications.length} ứng viên có thể giao bài.
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="primary"
              disabled={selectedIds.length === 0 || assignMutation.isPending || !!status?.bankError}
              onClick={() => assignMutation.mutate(selectedIds)}
              className="min-h-10 px-5 text-sm font-semibold"
            >
              <Sparkles className="size-4" />
              {assignMutation.isPending
                ? "Đang tự động bốc đề..."
                : `Bắt đầu tạo bài cho ${selectedIds.length > 0 ? `${selectedIds.length} ứng viên` : "ứng viên đã chọn"}`}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
