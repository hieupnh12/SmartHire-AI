import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Code2,
  Copy,
  Eye,
  FileCheck2,
  FileText,
  Mail,
  RefreshCw,
  Send,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Terminal,
  Zap,
} from "lucide-react";
import { assessmentApi } from "@/api/tenant/assessmentApi";
import type {
  GradeDecision,
  GradingReview,
  SubmissionGradingDetail as GradingDetail,
} from "@/api/types/assessment";
import { Button } from "@/components/ux/Button";
import { Skeleton } from "@/components/ux/Skeleton";
import { AssessmentError } from "@/components/ux/assessmentUi";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { toast } from "@/stores/toastStore";
import { useUiStore } from "@/stores/uiStore";

// --- Safe Data Helpers ---
function safeObject<T = Record<string, unknown>>(value: unknown): T {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as T;
  }
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as T;
      }
    } catch {
      // ignore
    }
  }
  return {} as T;
}

function safeText(value: unknown, fallback = "AI chưa cung cấp phân tích này."): string {
  if (value == null) return fallback;
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    for (const key of [
      "analysis",
      "explanation",
      "comment",
      "description",
      "details",
      "text",
      "summary",
      "complexity",
      "rating",
      "value",
    ]) {
      if (typeof obj[key] === "string" && (obj[key] as string).trim()) {
        return (obj[key] as string).trim();
      }
    }
    try {
      const json = JSON.stringify(value, null, 2);
      if (json && json !== "{}") return json;
    } catch {
      // ignore
    }
  }
  return fallback;
}

function safeNumber(value: unknown): number | null {
  if (value == null) return null;
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function display(value: unknown): string {
  const num = safeNumber(value);
  if (num == null) return "—";
  return Number(num.toFixed(2)).toLocaleString("vi-VN");
}

function getInitials(name: unknown): string {
  if (!name || typeof name !== "string" || !name.trim()) return "UV";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type TabFilter = "ALL" | "NEED_REVIEW" | "OBJECTIVE" | "ESSAY" | "CODING" | "INTEGRITY";

export function SubmissionGradingDetail({
  id,
  onClose,
}: {
  id: number;
  onClose: () => void;
}) {
  const client = useQueryClient();
  const askConfirm = useUiStore((state) => state.askConfirm);
  const key = [...queryKeys.assessments.all(), "grading-detail", id];

  const query = useQuery({
    queryKey: key,
    queryFn: () => assessmentApi.gradingDetail(id),
    refetchInterval: 12000,
  });

  const {
    register,
    watch,
    getValues,
    setValue,
    reset,
    setError,
    clearErrors,
    formState: { errors },
  } = useForm<{ scores: Record<string, string> }>({
    defaultValues: { scores: {} },
  });

  const [activeTab, setActiveTab] = useState<TabFilter>("ALL");
  const values = watch("scores");
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    heading.current?.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [id]);

  const refresh = async () => {
    await client.invalidateQueries({ queryKey: queryKeys.assessments.all() });
  };

  // --- Mutations ---
  const approve = useMutation({
    mutationFn: (decision: GradeDecision) =>
      assessmentApi.approveGrade(id, decision.questionId, decision.score),
    onSuccess: async (_, decision) => {
      setValue(`scores.${decision.questionId}`, "");
      toast.success(`Đã xác nhận duyệt điểm câu #${decision.questionId}`);
      await refresh();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Lỗi khi duyệt điểm câu hỏi.");
    },
  });

  const update = useMutation({
    mutationFn: (decisions: GradeDecision[]) =>
      assessmentApi.updateGradingResult(id, decisions),
    onSuccess: async (data, decisions) => {
      client.setQueryData(key, data);
      decisions.forEach((decision) => setValue(`scores.${decision.questionId}`, ""));
      if (data.score == null) {
        toast.info("Đã cập nhật điểm các câu đã chọn. Còn câu hỏi đang chờ duyệt.");
      } else {
        toast.success("Đã hoàn tất duyệt bài và chốt điểm chính thức thành công.");
      }
      await refresh();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Lỗi khi cập nhật kết quả bài thi.");
    },
  });

  const email = useMutation({
    mutationFn: () => assessmentApi.sendResultEmail(id),
    onSuccess: (result) => {
      if (result.status === "SENT") {
        toast.info("Kết quả bài thi này đã được gửi trước đó.");
      } else if (result.status === "PENDING") {
        toast.success("Đã xếp hàng gửi email kết quả chính thức cho ứng viên.");
      } else {
        toast.warning("Email kết quả đang FAILED — hệ thống đã xếp hàng để gửi lại.");
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Lỗi khi gửi email kết quả.");
    },
  });

  const retry = useMutation({
    mutationFn: () => assessmentApi.retryGrading(id),
    onSuccess: async () => {
      toast.success("Đã yêu cầu AI chấm lại các câu chưa có kết quả.");
      await refresh();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Lỗi khi yêu cầu chấm lại.");
    },
  });

  const busy = approve.isPending || update.isPending || email.isPending || retry.isPending;
  const detail = query.data;
  const reviews = useMemo(() => detail?.reviews ?? [], [detail?.reviews]);

  // Dirty entries in form
  const dirtyEntries = Object.entries(values ?? {}).filter(
    ([, val]) => val !== undefined && val !== null && val.trim() !== "",
  );
  const isDirty = dirtyEntries.length > 0;

  // Question validation
  const decisionFor = (review: GradingReview): GradeDecision | null => {
    const raw = getValues(`scores.${review.questionId}`)?.trim() ?? "";
    if (!raw && review.suggestedScore == null) {
      setError(`scores.${review.questionId}`, {
        message: "Chưa có điểm AI. Nhập điểm để duyệt thủ công.",
      });
      return null;
    }
    const score = raw ? Number(raw) : null;
    const valid =
      !raw ||
      (/^\d+(\.\d{1,2})?$/.test(raw) &&
        z.number().finite().min(0).max(review.points).safeParse(score).success);
    if (!valid) {
      setError(`scores.${review.questionId}`, {
        message: `Điểm từ 0 đến ${review.points}, tối đa 2 chữ số thập phân.`,
      });
      return null;
    }
    clearErrors(`scores.${review.questionId}`);
    return { questionId: review.questionId, score };
  };

  const validateReviews = (selected: GradingReview[]) => {
    const decisions = selected.map(decisionFor);
    if (decisions.some((d) => d == null)) {
      toast.error("Vui lòng kiểm tra lại điểm nhập chưa đúng định dạng.");
      return null;
    }
    return decisions as GradeDecision[];
  };

  // Quick accept AI score for one question
  const handleQuickApproveAi = (review: GradingReview) => {
    if (review.suggestedScore == null) {
      toast.warning("Chưa có điểm AI gợi ý để áp dụng tự động.");
      return;
    }
    approve.mutate({ questionId: review.questionId, score: null });
  };

  // Quick accept all AI scores
  const handleApproveAllSuggested = () => {
    const unreviewed = reviews.filter((r) => !r.reviewedAt);
    if (unreviewed.length === 0) {
      toast.info("Tất cả câu hỏi đã được duyệt.");
      return;
    }
    const missingAi = unreviewed.filter((r) => r.suggestedScore == null);
    if (missingAi.length > 0) {
      toast.warning(
        `Còn ${missingAi.length} câu chưa có điểm gợi ý từ AI. Vui lòng chấm tay các câu đó.`,
      );
      return;
    }
    askConfirm({
      title: "Chấp nhận toàn bộ điểm AI đề xuất?",
      description: `Hệ thống sẽ áp dụng điểm gợi ý của AI cho ${unreviewed.length} câu hỏi chưa duyệt và chốt kết quả bài thi.`,
      confirmLabel: "Chấp nhận & Chốt điểm",
      onConfirm: () => {
        const decisions: GradeDecision[] = unreviewed.map((r) => ({
          questionId: r.questionId,
          score: null,
        }));
        update.mutate(decisions);
      },
    });
  };

  // Filter reviews
  const unreviewedReviews = reviews.filter((r) => !r.reviewedAt);
  const essayReviews = reviews.filter((r) => r.type === "ESSAY");
  const codingReviews = reviews.filter((r) => r.type === "CODING");

  const filteredReviews = useMemo(() => {
    if (activeTab === "NEED_REVIEW") return unreviewedReviews;
    if (activeTab === "ESSAY") return essayReviews;
    if (activeTab === "CODING") return codingReviews;
    return reviews;
  }, [activeTab, reviews, unreviewedReviews, essayReviews, codingReviews]);

  // Loading skeleton
  if (query.isPending) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full rounded-2xl" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
        <Skeleton className="h-96 w-full rounded-2xl" />
      </div>
    );
  }

  if (query.error || !detail) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-white p-8 text-center dark:border-rose-900/50 dark:bg-slate-900">
        <AssessmentError error={query.error} retry={() => void query.refetch()} />
        <Button className="mt-4" onClick={onClose}>
          <ArrowLeft className="size-4" /> Quay lại danh sách
        </Button>
      </div>
    );
  }

  const numScore = safeNumber(detail.score);
  const numPassing = safeNumber(detail.passingScore);
  const totalPoints = safeNumber(detail.totalPoints) || 0;
  const isPassed =
    numScore != null && numPassing != null ? numScore >= numPassing : null;
  const objective = detail.objective ?? {
    correctCount: 0,
    questionCount: 0,
    score: 0,
    totalPoints: 0,
  };
  const integrity = detail.integrity;
  const proctorCount = safeNumber(integrity?.proctorEventCount) ?? 0;
  const customRunCount =
    integrity?.customRuns?.reduce((sum, r) => sum + (safeNumber(r?.count) || 0), 0) ?? 0;

  return (
    <div className="space-y-6 text-[#101828] dark:text-slate-100">
      {/* 1. HERO HEADER: Candidate Profile & Quick Actions */}
      <header className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all dark:border-slate-800 dark:bg-slate-900/90 sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          {/* Left: Avatar & Candidate Info */}
          <div className="flex items-start gap-4">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-violet-600 text-lg font-black text-white shadow-sm ring-4 ring-blue-50 dark:ring-blue-950/50">
              {getInitials(detail.candidateName)}
            </div>

            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2.5">
                <h1
                  ref={heading}
                  tabIndex={-1}
                  className="text-xl font-extrabold tracking-tight text-[#101828] dark:text-white sm:text-2xl"
                >
                  {detail.candidateName || "Ứng viên"}
                </h1>
                <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                  Bài làm #{detail.id}
                </span>
                {detail.status === "GRADED" ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800">
                    <CheckCircle2 className="size-3.5" /> Đã chốt điểm
                  </span>
                ) : detail.status === "EXPIRED" ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 border border-rose-200/80 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800">
                    <AlertTriangle className="size-3.5" /> Quá giờ quy định
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 border border-amber-200/80 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800">
                    <Clock className="size-3.5" /> Chờ duyệt kết quả
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
                <span className="flex items-center gap-1.5 font-medium">
                  <Mail className="size-3.5 text-slate-400" />
                  {detail.candidateEmail || "Chưa có email"}
                </span>
                <span className="flex items-center gap-1.5 font-medium text-slate-600 dark:text-slate-300">
                  <FileCheck2 className="size-3.5 text-blue-500" />
                  {detail.testTitle || "Bài kiểm tra kỹ thuật"}
                </span>
              </div>
            </div>
          </div>

          {/* Right: Master Control Actions */}
          <div className="flex flex-wrap items-center gap-2.5 self-start lg:self-center">
            {/* Retry AI button */}
            <button
              type="button"
              disabled={busy}
              onClick={() => retry.mutate()}
              title="Yêu cầu AI chấm lại các câu chưa có kết quả"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm hover:bg-slate-50 hover:text-blue-600 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              <RefreshCw className={cn("size-3.5", retry.isPending && "animate-spin")} />
              Chấm AI lại
            </button>

            {/* Send Result Email button */}
            <button
              type="button"
              disabled={
                busy ||
                detail.score == null ||
                !detail.emailAvailable ||
                isDirty ||
                unreviewedReviews.length > 0
              }
              onClick={() =>
                askConfirm({
                  title: "Gửi email kết quả bài thi?",
                  description: `Gửi kết quả chính thức đã duyệt (${display(detail.score)}/${detail.totalPoints} điểm) tới email ${detail.candidateEmail}.`,
                  confirmLabel: "Gửi email ngay",
                  onConfirm: () => email.mutate(),
                })
              }
              title={
                !detail.emailAvailable
                  ? "Ứng viên không có email hoặc đã tắt thông báo assessment"
                  : isDirty
                    ? "Hãy lưu điểm ghi đè trước khi gửi kết quả"
                    : detail.score == null
                      ? "Chỉ gửi được email khi mọi câu hỏi đã được chốt điểm"
                      : "Gửi thông báo điểm chính thức tới ứng viên"
              }
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-bold text-white shadow-sm hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 dark:disabled:bg-slate-800 dark:disabled:text-slate-500 transition-all cursor-pointer"
            >
              <Send className="size-3.5" />
              Gửi email kết quả
            </button>

            {/* Close Button */}
            <button
              type="button"
              disabled={busy}
              onClick={() => {
                if (isDirty) {
                  askConfirm({
                    title: "Rời khỏi màn hình duyệt?",
                    description: "Có điểm ghi đè chưa lưu sẽ bị hủy bỏ.",
                    confirmLabel: "Rời khỏi",
                    onConfirm: onClose,
                  });
                } else {
                  onClose();
                }
              }}
              className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-all cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </header>

      {/* 2. EXECUTIVE METRIC RIBBON (4 KPIs) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Official Score */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 min-h-[148px]">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span>Tổng điểm bài thi</span>
              {detail.status === "GRADED" ? (
                isPassed === true ? (
                  <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold uppercase text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    ĐẠT YÊU CẦU
                  </span>
                ) : isPassed === false ? (
                  <span className="rounded-md bg-rose-100 px-2 py-0.5 text-[10px] font-extrabold uppercase text-rose-800 dark:bg-rose-950 dark:text-rose-300">
                    CHƯA ĐẠT
                  </span>
                ) : (
                  <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold uppercase text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                    ĐÃ CHỐT ĐIỂM
                  </span>
                )
              ) : (
                <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-extrabold uppercase text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                  CHỜ DUYỆT
                </span>
              )}
            </div>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span className="text-3xl font-black tracking-tight text-[#101828] dark:text-white">
                {numScore == null ? "—" : display(numScore)}
              </span>
              <span className="text-sm font-semibold text-slate-400">
                / {totalPoints} đ
              </span>
            </div>
          </div>
          <div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
              <span>
                Ngưỡng đạt: <strong>{numPassing != null ? `${display(numPassing)} đ` : "Không đặt"}</strong>
              </span>
              {numScore != null && totalPoints > 0 && (
                <span className="font-semibold text-blue-600 dark:text-blue-400">
                  {Math.round((numScore / totalPoints) * 100)}%
                </span>
              )}
            </div>
            {/* Progress bar */}
            <div className="relative mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  isPassed === true ? "bg-emerald-500" : isPassed === false ? "bg-rose-500" : "bg-blue-600",
                )}
                style={{
                  width: `${Math.min(100, Math.max(0, ((numScore ?? 0) / (totalPoints || 1)) * 100))}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Card 2: Trắc nghiệm (Objective) */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 min-h-[148px]">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span>Trắc nghiệm (MCQ)</span>
              <div className="flex size-6 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
                <CheckCircle2 className="size-3.5" />
              </div>
            </div>
            {objective.questionCount > 0 ? (
              <div className="mt-2.5 flex items-baseline gap-1.5">
                <span className="text-3xl font-black tracking-tight text-[#101828] dark:text-white">
                  {display(objective.score)}
                </span>
                <span className="text-sm font-semibold text-slate-400">
                  / {display(objective.totalPoints)} đ
                </span>
              </div>
            ) : (
              <div className="mt-2.5 flex items-baseline gap-1.5">
                <span className="text-3xl font-black tracking-tight text-slate-400 dark:text-slate-500">
                  0
                </span>
                <span className="text-sm font-semibold text-slate-400">
                  / 0 đ
                </span>
              </div>
            )}
          </div>
          <div>
            <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
              {objective.questionCount > 0
                ? `Đúng ${objective.correctCount}/${objective.questionCount} câu (${Math.round((objective.correctCount / objective.questionCount) * 100)}%) · Tự động chấm máy`
                : "Đề thi không có phần câu hỏi trắc nghiệm"}
            </p>
          </div>
        </div>

        {/* Card 3: Tự luận & Lập trình (AI Reviews) */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 min-h-[148px]">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span>Tự luận &amp; Coding</span>
              <div className="flex size-6 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-950 dark:text-violet-400">
                <Sparkles className="size-3.5" />
              </div>
            </div>
            {reviews.length > 0 ? (
              <div className="mt-2.5 flex items-baseline gap-1.5">
                <span className="text-3xl font-black tracking-tight text-[#101828] dark:text-white">
                  {reviews.length - unreviewedReviews.length}
                </span>
                <span className="text-sm font-semibold text-slate-400">
                  / {reviews.length} câu đã duyệt
                </span>
              </div>
            ) : (
              <div className="mt-2.5 flex items-baseline gap-1.5">
                <span className="text-3xl font-black tracking-tight text-slate-400 dark:text-slate-500">
                  0
                </span>
                <span className="text-sm font-semibold text-slate-400">
                  câu tự luận/code
                </span>
              </div>
            )}
          </div>
          <div>
            <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
              {reviews.length === 0 ? (
                "Đề thi hoàn toàn bằng trắc nghiệm"
              ) : unreviewedReviews.length === 0 ? (
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  ✓ Hoàn thành 100% duyệt điểm
                </span>
              ) : (
                <span className="font-semibold text-amber-600 dark:text-amber-400">
                  ⚡ Còn {unreviewedReviews.length} câu cần bạn duyệt điểm
                </span>
              )}
            </p>
          </div>
        </div>

        {/* Card 4: Tín hiệu toàn vẹn (Integrity & Proctoring) */}
        <div className="flex flex-col justify-between rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 min-h-[148px]">
          <div>
            <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
              <span>Giám sát gian lận</span>
              <div
                className={cn(
                  "flex size-6 items-center justify-center rounded-lg",
                  proctorCount === 0
                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400"
                    : "bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-400",
                )}
              >
                {proctorCount === 0 ? (
                  <ShieldCheck className="size-3.5" />
                ) : (
                  <ShieldAlert className="size-3.5" />
                )}
              </div>
            </div>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span
                className={cn(
                  "text-3xl font-black tracking-tight",
                  proctorCount === 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-amber-600 dark:text-amber-400",
                )}
              >
                {proctorCount}
              </span>
              <span className="text-sm font-semibold text-slate-400">
                sự kiện ghi nhận
              </span>
            </div>
          </div>
          <div>
            <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
              {proctorCount === 0
                ? "Không ghi nhận rời tab / copy / gian lận"
                : `${proctorCount} cảnh báo rời tab · ${customRunCount} lượt chạy thử code`}
            </p>
          </div>
        </div>
      </div>

      {/* 3. TABS / SEGMENTED FILTER & QUICK BULK ACTION */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-3 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab("ALL")}
            className={cn(
              "rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
              activeTab === "ALL"
                ? "bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800",
            )}
          >
            Tất cả ({reviews.length + (objective.questionCount > 0 ? 1 : 0)})
          </button>

          {unreviewedReviews.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab("NEED_REVIEW")}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                activeTab === "NEED_REVIEW"
                  ? "bg-amber-500 text-white shadow-sm"
                  : "bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-300",
              )}
            >
              <span className="size-1.5 rounded-full bg-amber-400 animate-pulse" />
              Chờ duyệt ({unreviewedReviews.length})
            </button>
          )}

          {objective.questionCount > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab("OBJECTIVE")}
              className={cn(
                "rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                activeTab === "OBJECTIVE"
                  ? "bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800",
              )}
            >
              Trắc nghiệm ({objective.questionCount})
            </button>
          )}

          {essayReviews.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab("ESSAY")}
              className={cn(
                "rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                activeTab === "ESSAY"
                  ? "bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800",
              )}
            >
              Tự luận ({essayReviews.length})
            </button>
          )}

          {codingReviews.length > 0 && (
            <button
              type="button"
              onClick={() => setActiveTab("CODING")}
              className={cn(
                "rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
                activeTab === "CODING"
                  ? "bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900"
                  : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800",
              )}
            >
              Lập trình ({codingReviews.length})
            </button>
          )}

          <button
            type="button"
            onClick={() => setActiveTab("INTEGRITY")}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold transition-all cursor-pointer",
              activeTab === "INTEGRITY"
                ? "bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900"
                : "text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800",
            )}
          >
            <ShieldCheck className="size-3.5 text-slate-400" />
            Nhật ký giám sát ({proctorCount})
          </button>
        </div>

        {/* Bulk Action: Accept All AI */}
        {unreviewedReviews.length > 0 && (
          <button
            type="button"
            disabled={busy}
            onClick={handleApproveAllSuggested}
            className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-xl bg-violet-50 px-3.5 py-1.5 text-xs font-bold text-violet-700 hover:bg-violet-100 dark:bg-violet-950/50 dark:text-violet-300 dark:hover:bg-violet-900/60 border border-violet-200/70 transition-all cursor-pointer"
          >
            <Sparkles className="size-3.5 text-violet-600 dark:text-violet-400" />
            Áp dụng tất cả điểm AI gợi ý
          </button>
        )}
      </div>

      {/* 4. MAIN CONTENT AREA */}
      <div className="space-y-6">
        {/* Objective MCQ Card */}
        {(activeTab === "ALL" || activeTab === "OBJECTIVE") && objective.questionCount > 0 && (
          <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3.5">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50">
                  <CheckCircle2 className="size-5" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-[#101828] dark:text-white">
                    Phần 1: Trắc nghiệm khách quan (MCQ)
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Hệ thống đã tự động đối chiếu đáp án và chốt điểm ngay khi ứng viên nộp bài.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-6 self-start sm:self-auto border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-100 dark:border-slate-800">
                <div className="text-right">
                  <div className="text-xs text-slate-400 font-medium">Tỷ lệ chính xác</div>
                  <div className="text-base font-extrabold text-emerald-600 dark:text-emerald-400">
                    {objective.questionCount
                      ? Math.round((objective.correctCount / objective.questionCount) * 100)
                      : 0}
                    %
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400 font-medium">Điểm đạt được</div>
                  <div className="text-base font-extrabold text-[#101828] dark:text-white">
                    {display(objective.score)} / {objective.totalPoints} đ
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Subjective Reviews: Essay & Coding Question Cards */}
        {activeTab !== "INTEGRITY" && (
          <div className="space-y-6">
            {filteredReviews.length === 0 && activeTab !== "OBJECTIVE" && (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
                <CheckCircle2 className="mx-auto size-8 text-emerald-500" />
                <h3 className="mt-2 text-sm font-bold text-[#101828] dark:text-white">
                  Không có câu hỏi nào trong mục này
                </h3>
                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  Tất cả câu hỏi phù hợp bộ lọc đã được xử lý xong.
                </p>
              </div>
            )}

            {filteredReviews.map((review, idx) => (
              <QuestionReviewCard
                key={review.questionId}
                index={idx + 1}
                review={review}
                submissionId={id}
                busy={busy}
                register={register}
                errors={errors}
                clearErrors={clearErrors}
                onQuickApprove={handleQuickApproveAi}
                onApprove={approve.mutate}
                decisionFor={decisionFor}
              />
            ))}
          </div>
        )}

        {/* Integrity Timeline Log Tab */}
        {(activeTab === "ALL" || activeTab === "INTEGRITY") && integrity && (
          <IntegrityTimelineSection integrity={integrity} />
        )}
      </div>

      {/* 5. FLOATING DOCK ACTION BAR (When Recruiter entered overrides) */}
      {isDirty && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 rounded-2xl border border-slate-800 bg-slate-950/95 px-5 py-3 text-white shadow-2xl backdrop-blur-md dark:border-slate-700">
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
            <Zap className="size-4 animate-bounce" />
            Có {dirtyEntries.length} câu ghi đè điểm chưa lưu
          </div>

          <div className="h-4 w-px bg-slate-800" />

          <button
            type="button"
            disabled={busy}
            onClick={() => {
              const decisions = validateReviews(
                reviews.filter((r) => values[r.questionId]?.trim()),
              );
              if (decisions) update.mutate(decisions);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-blue-500 transition-all cursor-pointer"
          >
            <Check className="size-3.5" />
            Lưu tất cả ({dirtyEntries.length})
          </button>

          <button
            type="button"
            disabled={busy}
            onClick={() => reset()}
            className="inline-flex items-center rounded-xl px-2.5 py-1.5 text-xs font-semibold text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            Hủy bỏ
          </button>
        </div>
      )}
    </div>
  );
}

// ==========================================
// SUBCOMPONENT: QUESTION REVIEW CARD
// ==========================================
function QuestionReviewCard({
  index,
  review,
  submissionId: _submissionId,
  busy,
  register,
  errors,
  clearErrors,
  onQuickApprove,
  onApprove,
  decisionFor,
}: {
  index: number;
  review: GradingReview;
  submissionId: number;
  busy: boolean;
  register: any;
  errors: any;
  clearErrors: any;
  onQuickApprove: (r: GradingReview) => void;
  onApprove: (d: GradeDecision) => void;
  decisionFor: (r: GradingReview) => GradeDecision | null;
}) {
  const isEssay = review.type === "ESSAY";
  const isReviewed = review.reviewedAt != null;
  const fieldName = `scores.${review.questionId}`;
  const hasError = !!errors.scores?.[String(review.questionId)];

  return (
    <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all dark:border-slate-800 dark:bg-slate-900 sm:p-6 space-y-5">
      {/* 1. Card Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-black text-slate-800 dark:bg-slate-800 dark:text-slate-200">
            Câu {index} (ID #{review.questionId})
          </span>

          {isEssay ? (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-700 dark:bg-purple-950/60 dark:text-purple-300 border border-purple-200/60">
              <FileText className="size-3.5" /> TỰ LUẬN
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200/60">
              <Code2 className="size-3.5" /> LẬP TRÌNH (CODING)
            </span>
          )}

          {review.language && (
            <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300 uppercase">
              {review.language}
            </span>
          )}

          <span className="text-xs font-semibold text-slate-400">
            · Thang điểm: {review.points} đ
          </span>
        </div>

        {/* Status Pill */}
        <div>
          {isReviewed ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60">
              <Check className="size-3.5" /> Đã duyệt: {display(review.score)}/{review.points} đ
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-200/60">
              <Clock className="size-3.5" /> Chờ duyệt · AI gợi ý: {display(review.suggestedScore)} đ
            </span>
          )}
        </div>
      </div>

      {/* 2. Question Prompt */}
      <div className="space-y-1.5">
        <h3 className="text-sm font-bold text-[#101828] dark:text-white leading-relaxed whitespace-pre-wrap break-words">
          {review.prompt}
        </h3>
      </div>

      {/* 3. Candidate's Answer Presentation */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
          <span>{isEssay ? "Bài làm của ứng viên" : "Mã nguồn ứng viên nộp"}</span>
          <CopyButton text={review.answerText ?? ""} />
        </div>

        {isEssay ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-[13px] leading-relaxed text-[#101828] dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-200 whitespace-pre-wrap break-words min-h-[5rem] max-h-96 overflow-y-auto">
            {review.answerText?.trim() ? (
              review.answerText
            ) : (
              <span className="italic text-slate-400">Ứng viên không trả lời câu hỏi này.</span>
            )}
          </div>
        ) : (
          <div className="relative rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs font-mono text-slate-100 dark:border-slate-800 dark:bg-slate-950 max-h-96 overflow-auto">
            <pre className="whitespace-pre-wrap break-words leading-relaxed">
              <code>{review.answerText?.trim() || "// Ứng viên không nộp mã nguồn cho câu này"}</code>
            </pre>
          </div>
        )}
      </div>

      {/* 4. AI Evidence & Grading Rubrics */}
      <div className="rounded-xl border border-slate-200/70 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-950/40 space-y-4">
        {isEssay ? <EssayEvidenceDetail review={review} /> : <CodingEvidenceDetail review={review} />}
      </div>

      {/* 5. Recruiter Score Approval & Override Strip */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200/80 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: Summary score text */}
        <div className="text-xs text-slate-500 dark:text-slate-400">
          AI đề xuất:{" "}
          <strong className="text-[#101828] dark:text-white font-bold">
            {display(review.suggestedScore)}/{review.points} đ
          </strong>
          {isReviewed && (
            <span className="ml-2 font-medium text-emerald-600 dark:text-emerald-400">
              · Đã chốt: {display(review.score)} đ
            </span>
          )}
        </div>

        {/* Right: Quick approve or override input */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Accept AI Score Button */}
          {review.suggestedScore != null && (
            <button
              type="button"
              disabled={busy}
              onClick={() => onQuickApprove(review)}
              title="Chấp nhận điểm AI và xác nhận ngay"
              className="inline-flex items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700 hover:bg-violet-100 dark:border-violet-800 dark:bg-violet-950/50 dark:text-violet-300 dark:hover:bg-violet-900 transition-all cursor-pointer"
            >
              <Sparkles className="size-3.5 text-violet-600 dark:text-violet-400" />
              Nhận điểm AI ({display(review.suggestedScore)} đ)
            </button>
          )}

          {/* Custom Score Override Input */}
          <div className="relative flex items-center">
            <input
              type="number"
              min={0}
              max={review.points}
              step="0.01"
              disabled={busy}
              placeholder={review.suggestedScore == null ? "Nhập điểm" : "Điểm ghi đè"}
              {...register(fieldName, {
                onChange: () => clearErrors(fieldName),
              })}
              className={cn(
                "w-28 rounded-xl border bg-white px-2.5 py-1.5 text-xs font-semibold text-[#101828] focus:outline-none focus:ring-2 dark:bg-slate-800 dark:text-white",
                hasError
                  ? "border-rose-500 focus:ring-rose-500/20"
                  : "border-slate-300 focus:border-blue-500 focus:ring-blue-500/20 dark:border-slate-700",
              )}
            />
            <span className="pointer-events-none absolute right-2.5 text-[11px] font-semibold text-slate-400">
              /{review.points}
            </span>
          </div>

          {/* Confirm Button */}
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              const d = decisionFor(review);
              if (d) onApprove(d);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm hover:bg-blue-600 dark:bg-white dark:text-slate-900 dark:hover:bg-blue-400 transition-all cursor-pointer"
          >
            <Check className="size-3.5" />
            Lưu điểm
          </button>
        </div>
      </div>

      {hasError && (
        <p className="text-xs font-medium text-rose-600 dark:text-rose-400">
          {errors.scores?.[String(review.questionId)]?.message}
        </p>
      )}
    </article>
  );
}

// ==========================================
// SUBCOMPONENT: ESSAY EVIDENCE DETAIL
// ==========================================
type RubricCriterionView = {
  name?: string;
  description?: string;
  guide?: string;
  weight?: number;
};

type EssayEvaluation = {
  status?: string;
  general_comment?: string | null;
  criteria_results?: Array<Record<string, unknown>>;
};

type CodeReviewData = {
  time_complexity?: unknown;
  space_complexity?: unknown;
  clean_code?: unknown;
  naming_conventions?: unknown;
  exception_safety?: unknown;
  general_comment?: string | null;
};

type CodingEvaluation = {
  status?: string;
  manual_review_required?: boolean;
  hardcode_capped?: boolean;
  tests?: Array<Record<string, unknown>>;
  code_review?: CodeReviewData;
  hidden_passed?: number | string | null;
  hidden_total?: number | string | null;
  tests_percent?: number | string | null;
  ai_percent?: number | string | null;
  formula_percent?: number | string | null;
  test_weight?: number | string | null;
  ai_weight?: number | string | null;
  general_comment?: string | null;
};

function EssayEvidenceDetail({ review }: { review: GradingReview }) {
  const evaluation = safeObject<EssayEvaluation>(review.evaluation);
  const results = Array.isArray(evaluation.criteria_results) ? evaluation.criteria_results : [];
  const [showRef, setShowRef] = useState(false);

  const rubric = safeObject(review.rubric);
  const referenceAnswer = typeof rubric.referenceAnswer === "string" ? rubric.referenceAnswer : null;
  const criteria = Array.isArray(rubric.criteria) ? rubric.criteria : [];

  return (
    <div className="space-y-3.5 text-xs">
      {evaluation.status === "ERROR" && (
        <div className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/60">
          <AlertCircle className="size-4 shrink-0 text-amber-600" />
          <span>AI chưa hoàn tất chấm điểm tự luận. Bạn có thể yêu cầu chấm lại hoặc nhập điểm tay.</span>
        </div>
      )}

      {/* Reference Answer Collapsible */}
      {Boolean(referenceAnswer) && (
        <div className="rounded-xl border border-slate-200/80 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
          <button
            type="button"
            onClick={() => setShowRef(!showRef)}
            className="flex w-full items-center justify-between font-semibold text-slate-700 hover:text-blue-600 dark:text-slate-300 transition-colors cursor-pointer"
          >
            <span className="flex items-center gap-2">
              <Eye className="size-3.5 text-slate-400" />
              Đáp án mẫu tham khảo (Reference Answer)
            </span>
            {showRef ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
          </button>
          {showRef && (
            <div className="mt-2.5 border-t border-slate-100 pt-2.5 text-[12px] leading-relaxed text-slate-600 dark:border-slate-800 dark:text-slate-300 whitespace-pre-wrap">
              {referenceAnswer}
            </div>
          )}
        </div>
      )}

      {criteria.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-slate-500 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400">
                <th className="p-3 font-bold">Tiêu chí Rubric</th>
                <th className="p-3 font-bold text-center w-28">Trọng số</th>
                <th className="p-3 font-bold text-center w-36">Điểm đạt</th>
                <th className="p-3 font-bold">Nhận xét chi tiết từ AI</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {criteria.map((cRaw, idx) => {
                const criterion: RubricCriterionView =
                  typeof cRaw === "string"
                    ? { name: cRaw, description: cRaw, weight: Math.round(100 / (criteria.length || 1)) }
                    : (safeObject(cRaw) as RubricCriterionView);
                const res = safeObject(results[idx]);
                const percent = safeNumber(res.score_percent);
                const weight = safeNumber(criterion.weight) ?? 0;
                const maxPts = (review.points * weight) / 100;
                const earnedPts = percent != null ? (maxPts * percent) / 100 : null;

                return (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                    <td className="p-3 align-top font-semibold text-[#101828] dark:text-white">
                      {safeText(criterion.name || criterion.description, `Tiêu chí ${idx + 1}`)}
                      {Boolean(criterion.guide) && (
                        <p className="mt-0.5 text-[11px] font-normal text-slate-400">
                          {safeText(criterion.guide)}
                        </p>
                      )}
                    </td>
                    <td className="p-3 align-top text-center text-slate-500 font-medium">
                      {weight}%
                    </td>
                    <td className="p-3 align-top text-center">
                      <div className="font-bold text-[#101828] dark:text-white">
                        {display(earnedPts)} / {display(maxPts)} đ
                      </div>
                      {percent != null && (
                        <div className="text-[10px] text-slate-400 font-medium">
                          ({percent}%)
                        </div>
                      )}
                    </td>
                    <td className="p-3 align-top leading-relaxed text-slate-600 dark:text-slate-300">
                      {safeText(res.feedback, "Đang đánh giá tiêu chí này.")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-xs text-slate-400 italic">
          Câu hỏi này chưa gắn rubric chi tiết. Nhà tuyển dụng có thể chấm thủ công.
        </p>
      )}

      {/* General AI Summary Comment */}
      {Boolean(evaluation.general_comment) && (
        <div className="flex items-start gap-2.5 rounded-xl bg-violet-50/70 p-3.5 text-xs text-violet-900 dark:bg-violet-950/30 dark:text-violet-200 border border-violet-100 dark:border-violet-900/40">
          <Sparkles className="size-4 shrink-0 text-violet-600 dark:text-violet-400 mt-0.5" />
          <div className="space-y-1 min-w-0">
            <span className="font-bold block">Tổng kết đánh giá từ AI:</span>
            <p className="leading-relaxed whitespace-pre-wrap">{safeText(evaluation.general_comment)}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ==========================================
// SUBCOMPONENT: CODING EVIDENCE DETAIL
// ==========================================
function CodingEvidenceDetail({ review }: { review: GradingReview }) {
  const evaluation = safeObject<CodingEvaluation>(review.evaluation);
  const tests = Array.isArray(evaluation.tests) ? evaluation.tests : [];
  const codeReview = safeObject<CodeReviewData>(evaluation.code_review);
  const hiddenPassed = safeNumber(evaluation.hidden_passed);
  const hiddenTotal = safeNumber(evaluation.hidden_total);
  const testsPercent = safeNumber(evaluation.tests_percent);
  const aiPercent = safeNumber(evaluation.ai_percent);
  const formulaPercent = safeNumber(evaluation.formula_percent);
  const testWeight = safeNumber(evaluation.test_weight) ?? 0.8;
  const aiWeight = safeNumber(evaluation.ai_weight) ?? 0.2;

  return (
    <div className="space-y-4 text-xs">
      {/* Sandbox / AI Error */}
      {evaluation.status === "ERROR" && (
        <div className="flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300 border border-amber-200/60">
          <AlertCircle className="size-4 shrink-0 text-amber-600" />
          <span>Sandbox hoặc AI Review chưa trả kết quả. Không coi lỗi dịch vụ là 0 điểm.</span>
        </div>
      )}

      {/* Manual Review Required (Hardcode Alert) */}
      {evaluation.manual_review_required === true && (
        <div className="flex items-start gap-2.5 rounded-xl bg-amber-500/10 p-3.5 text-amber-900 dark:text-amber-200 border border-amber-500/30">
          <AlertTriangle className="size-4 shrink-0 text-amber-600 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold">Cảnh báo nghi ngờ Hardcode kết quả:</span>
            <p className="leading-relaxed">
              AI phát hiện mã nguồn có dấu hiệu hardcode điều kiện để qua test case.{" "}
              {evaluation.hardcode_capped === true && "Điểm đề xuất đã bị áp trần tối đa 50%."}
            </p>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5 dark:border-slate-800">
          <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
            <Terminal className="size-4 text-blue-600" />
            <span>Kết quả thực thi Sandbox Test Cases</span>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-semibold text-slate-600 dark:text-slate-300">
              Hidden tests: <strong>{display(hiddenPassed)} / {display(hiddenTotal)}</strong> passed
            </span>
            {testsPercent != null && (
              <span
                className={cn(
                  "rounded-full px-2.5 py-0.5 font-bold text-[11px]",
                  testsPercent === 100
                    ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                    : "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
                )}
              >
                {display(testsPercent)}% pass
              </span>
            )}
          </div>
        </div>

        {/* Test Cases Table */}
        {tests.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-slate-400 font-medium border-b border-slate-100 dark:border-slate-800">
                  <th className="py-2 pr-3">Test Case</th>
                  <th className="py-2 pr-3">Phân loại</th>
                  <th className="py-2 pr-3">Trạng thái</th>
                  <th className="py-2">Mô tả Sandbox</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {tests.map((raw, idx) => {
                  const t = safeObject(raw);
                  const isPassed = t.passed === true;
                  return (
                    <tr key={idx}>
                      <td className="py-2 pr-3 font-semibold text-slate-700 dark:text-slate-300">
                        Test #{idx + 1}
                      </td>
                      <td className="py-2 pr-3 text-slate-500">
                        {t.sample === true ? (
                          <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                            Công khai
                          </span>
                        ) : (
                          <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-950 dark:text-blue-300">
                            Ẩn (Tính điểm)
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-3">
                        {isPassed ? (
                          <span className="inline-flex items-center gap-1 font-bold text-emerald-600 dark:text-emerald-400">
                            <Check className="size-3" /> Passed
                          </span>
                        ) : t.passed === false ? (
                          <span className="inline-flex items-center gap-1 font-bold text-rose-600 dark:text-rose-400">
                            ✕ Failed
                          </span>
                        ) : (
                          <span className="text-slate-400">Chưa có kết quả</span>
                        )}
                      </td>
                      <td className="py-2 text-slate-500 font-mono text-[11px]">
                        {safeText(t.status_description, "—")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-slate-400 italic">Chưa ghi nhận chi tiết từng test case.</p>
        )}
      </div>

      {/* 2. AI Code Review Matrix (4 Dimensions) */}
      {Object.keys(codeReview).length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
            <Sparkles className="size-4 text-violet-600" />
            <span>Phân tích chất lượng mã nguồn từ AI</span>
          </div>

          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {[
              { label: "Độ phức tạp thời gian (Time Complexity)", val: codeReview.time_complexity },
              { label: "Độ phức tạp bộ nhớ (Space Complexity)", val: codeReview.space_complexity },
              { label: "Clean Code & Naming", val: codeReview.clean_code || codeReview.naming_conventions },
              { label: "Xử lý ngoại lệ an toàn", val: codeReview.exception_safety },
            ].map((item, i) => (
              <div
                key={i}
                className="rounded-xl border border-slate-200/80 bg-white p-3 dark:border-slate-800 dark:bg-slate-900"
              >
                <div className="font-bold text-slate-700 dark:text-slate-300 text-[11px] uppercase tracking-wider">
                  {item.label}
                </div>
                <p className="mt-1 leading-relaxed text-slate-600 dark:text-slate-300">
                  {safeText(item.val, "Tốt, đáp ứng chuẩn mực.")}
                </p>
              </div>
            ))}
          </div>

          {Boolean(codeReview.general_comment) && (
            <div className="rounded-xl bg-violet-50/70 p-3 text-violet-900 dark:bg-violet-950/30 dark:text-violet-200 border border-violet-100 dark:border-violet-900/40">
              <span className="font-bold block mb-1">Nhận xét tổng thể AI:</span>
              <p className="leading-relaxed whitespace-pre-wrap">{safeText(codeReview.general_comment)}</p>
            </div>
          )}
        </div>
      )}

      {/* Fallback AI comment when codeReview object is empty */}
      {Boolean(evaluation.general_comment) && Object.keys(codeReview).length === 0 && (
        <div className="rounded-xl bg-violet-50/70 p-3 text-violet-900 dark:bg-violet-950/30 dark:text-violet-200 border border-violet-100 dark:border-violet-900/40">
          <span className="font-bold block mb-1">Nhận xét tổng thể AI:</span>
          <p className="leading-relaxed whitespace-pre-wrap">{safeText(evaluation.general_comment)}</p>
        </div>
      )}

      {/* 3. Formula Transparency Chip */}
      {testsPercent != null && (
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3 text-[11px] text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-400 flex flex-wrap items-center justify-between gap-2">
          <span>
            Công thức tính điểm:{" "}
            <strong>{display(testsPercent)}%</strong> × {display(testWeight * 100)}% (Test){" "}
            + <strong>{display(aiPercent)}%</strong> × {display(aiWeight * 100)}% (AI Review)
          </span>
          <span className="font-bold text-blue-600 dark:text-blue-400">
            = {display(formulaPercent)}% → Điểm gợi ý: {display(review.suggestedScore)}/{review.points} đ
          </span>
        </div>
      )}
    </div>
  );
}

// ==========================================
// SUBCOMPONENT: INTEGRITY TIMELINE SECTION
// ==========================================
function IntegrityTimelineSection({
  integrity,
}: {
  integrity: NonNullable<GradingDetail["integrity"]>;
}) {
  const events = Array.isArray(integrity.proctorEvents) ? integrity.proctorEvents : [];
  const runs = Array.isArray(integrity.customRuns) ? integrity.customRuns : [];

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
        <div className="flex items-center gap-2.5 font-bold text-sm text-[#101828] dark:text-white">
          <ShieldCheck className="size-4 text-blue-600" />
          <span>Nhật ký giám sát &amp; Tín hiệu toàn vẹn (Proctoring Log)</span>
        </div>
        <span className="text-xs font-semibold text-slate-500">
          Tổng cộng {integrity.proctorEventCount || 0} sự kiện giám sát
        </span>
      </div>

      {/* Custom Runs Summary */}
      {runs.length > 0 && (
        <div className="space-y-1.5">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            Số lần chạy thử nghiệm mã nguồn (Custom Runs):
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {runs.map((r, i) => (
              <div
                key={r?.questionId ?? i}
                className="flex items-center justify-between rounded-xl border border-slate-200/70 bg-slate-50/60 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-800/40"
              >
                <span className="font-semibold text-slate-700 dark:text-slate-300">
                  Câu #{r?.questionId}
                </span>
                <span className="rounded-md bg-blue-100 px-2 py-0.5 font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                  {r?.count || 0} lượt run
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Events Table */}
      {events.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200/80 dark:border-slate-800">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-slate-50/70 text-slate-500 dark:bg-slate-800/50 dark:text-slate-400">
                <th className="p-3 font-bold">Loại sự kiện</th>
                <th className="p-3 font-bold w-44">Thời điểm</th>
                <th className="p-3 font-bold">Chi tiết sự kiện</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {events.map((e, idx) => (
                <tr key={idx} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/20">
                  <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">
                    <span className="rounded-md bg-amber-50 px-2 py-0.5 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-mono text-[11px]">
                      {e.eventType || "EVENT"}
                    </span>
                  </td>
                  <td className="p-3 text-slate-500 whitespace-nowrap">
                    {e.createdAt ? new Date(e.createdAt).toLocaleString("vi-VN") : "—"}
                  </td>
                  <td
                    className="p-3 text-slate-600 dark:text-slate-300 leading-relaxed max-w-md truncate"
                    title={typeof e.detail === "string" ? e.detail : undefined}
                  >
                    {safeText(e.detail, "—")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="py-6 text-center text-xs text-slate-400">
          <ShieldCheck className="mx-auto size-7 text-emerald-500/80 mb-1.5" />
          Bài làm diễn ra hoàn toàn bình thường, không ghi nhận hành vi chuyển tab hay sao chép nghi vấn.
        </div>
      )}
    </section>
  );
}

// ==========================================
// SUBCOMPONENT: COPY BUTTON
// ==========================================
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Đã sao chép vào bộ nhớ tạm");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Không thể sao chép");
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      disabled={!text}
      className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] font-semibold text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
    >
      {copied ? (
        <>
          <Check className="size-3 text-emerald-600" />
          <span className="text-emerald-600 font-bold">Đã chép</span>
        </>
      ) : (
        <>
          <Copy className="size-3" />
          <span>Sao chép</span>
        </>
      )}
    </button>
  );
}
