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
  FileText,
  Loader2,
  Mail,
  RefreshCw,
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
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return fallback;
    // Attempt parsing JSON string to extract human-readable text (e.g. '{"detail": "..."}')
    if ((trimmed.startsWith("{") && trimmed.endsWith("}")) || (trimmed.startsWith("[") && trimmed.endsWith("]"))) {
      try {
        const parsed = JSON.parse(trimmed);
        if (parsed && typeof parsed === "object") {
          return safeText(parsed, fallback);
        }
      } catch {
        // use raw string
      }
    }
    return trimmed;
  }
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    for (const key of [
      "message",
      "detail",
      "analysis",
      "explanation",
      "comment",
      "description",
      "details",
      "text",
      "summary",
      "feedback",
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



type CategoryTab = "ESSAY" | "CODING" | "INTEGRITY" | "OBJECTIVE";

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
    staleTime: 30_000,
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

  const [userSelectedTab, setUserSelectedTab] = useState<CategoryTab | null>(null);
  const values = watch("scores");
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    try {
      heading.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    } catch {
      // ignore
    }
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
  const reviews = useMemo(() => (detail?.reviews ?? []).filter(Boolean), [detail?.reviews]);

  // Dirty entries in form - safely handle string/number/null values
  const dirtyEntries = Object.entries(values ?? {}).filter(([, val]) => {
    if (val == null) return false;
    if (typeof val === "string") return val.trim() !== "";
    if (typeof val === "number") return !Number.isNaN(val);
    return false;
  });
  const isDirty = dirtyEntries.length > 0;

  // Question validation
  const decisionFor = (review: GradingReview): GradeDecision | null => {
    const rawVal = getValues(`scores.${review.questionId}`);
    const raw = typeof rawVal === "string" ? rawVal.trim() : rawVal != null ? String(rawVal).trim() : "";
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

  const unreviewedReviews = reviews.filter((r) => !r.reviewedAt);

  const handleBack = () => {
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
  };

  // Loading skeleton matching new Split View layout with high-contrast borders and active spinner
  if (query.isPending) {
    return (
      <div className="space-y-6 text-[#101828] dark:text-slate-100">
        <header className="rounded-2xl border border-slate-200/80 bg-white px-5 py-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                title="Quay lại Danh sách bài nộp"
                aria-label="Quay lại Danh sách bài nộp"
              >
                <ArrowLeft className="size-4" />
              </button>
              <div className="space-y-1.5">
                <div className="h-4 w-44 rounded-lg bg-slate-200/80 dark:bg-slate-700 animate-pulse" />
                <div className="h-3 w-28 rounded-md bg-slate-100 dark:bg-slate-800 animate-pulse" />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin text-[#0066FF]" />
              <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">Đang tải bài làm...</span>
            </div>
          </div>
        </header>

        <div className="flex flex-col lg:flex-row items-start gap-6">
          <div className="w-full lg:w-60 shrink-0">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-2 shadow-2xs dark:border-slate-800 dark:bg-slate-900 flex flex-col gap-1">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="flex h-10 w-full items-center justify-between rounded-xl px-3.5 py-2"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="size-4 rounded-md bg-slate-200/80 dark:bg-slate-700 animate-pulse" />
                    <div className="h-3.5 w-24 rounded-md bg-slate-200/80 dark:bg-slate-700 animate-pulse" />
                  </div>
                  <div className="size-5 rounded-full bg-slate-100 dark:bg-slate-800 animate-pulse" />
                </div>
              ))}
            </div>
          </div>
          <div className="flex-1 min-w-0 space-y-4">
            <div className="h-6 w-36 rounded-lg bg-slate-200/80 dark:bg-slate-700 animate-pulse" />
            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs space-y-4 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800">
                <div className="h-4 w-32 rounded-md bg-slate-200/80 dark:bg-slate-700 animate-pulse" />
                <div className="h-4 w-20 rounded-md bg-slate-200/80 dark:bg-slate-700 animate-pulse" />
              </div>
              <div className="space-y-2">
                <div className="h-4 w-3/4 rounded-md bg-slate-100 dark:bg-slate-800 animate-pulse" />
                <div className="h-4 w-1/2 rounded-md bg-slate-100 dark:bg-slate-800 animate-pulse" />
              </div>
              <div className="h-36 rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/40" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (query.error || !detail) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-white p-8 text-center dark:border-rose-900/50 dark:bg-slate-900 space-y-3">
        <AssessmentError error={query.error} retry={() => void query.refetch()} />
        {!query.error && (
          <p className="text-sm text-slate-600 dark:text-slate-300">
            Không tìm thấy thông tin bài thi hoặc bài thi chưa được nộp.
          </p>
        )}
        <div>
          <Button className="mt-2" onClick={onClose}>
            <ArrowLeft className="size-4" /> Quay lại danh sách
          </Button>
        </div>
      </div>
    );
  }

  const objective = detail.objective ?? {
    correctCount: 0,
    questionCount: 0,
    score: 0,
    totalPoints: 0,
  };
  const integrity = detail.integrity;

  // Category breakdown
  const essayReviews = useMemo(() => reviews.filter((r) => r.type === "ESSAY"), [reviews]);
  const codingReviews = useMemo(() => reviews.filter((r) => r.type === "CODING"), [reviews]);
  const unreviewedEssay = useMemo(() => essayReviews.filter((r) => !r.reviewedAt), [essayReviews]);
  const unreviewedCoding = useMemo(() => codingReviews.filter((r) => !r.reviewedAt), [codingReviews]);
  const proctorCount = safeNumber(detail.integrity?.proctorEventCount) ?? 0;
  const hasObjective = (detail.objective?.questionCount ?? 0) > 0;

  const tabs = useMemo(() => {
    const list: {
      key: CategoryTab;
      label: string;
      count: number;
      allGraded: boolean;
      icon: any;
    }[] = [];

    if (essayReviews.length > 0) {
      list.push({
        key: "ESSAY",
        label: "Tự luận",
        count: essayReviews.length,
        allGraded: unreviewedEssay.length === 0,
        icon: unreviewedEssay.length === 0 ? CheckCircle2 : FileText,
      });
    }

    if (codingReviews.length > 0) {
      list.push({
        key: "CODING",
        label: "Lập trình",
        count: codingReviews.length,
        allGraded: unreviewedCoding.length === 0,
        icon: unreviewedCoding.length === 0 ? CheckCircle2 : Code2,
      });
    }

    if (hasObjective) {
      list.push({
        key: "OBJECTIVE",
        label: "Trắc nghiệm",
        count: detail.objective?.questionCount ?? 0,
        allGraded: true,
        icon: CheckCircle2,
      });
    }

    list.push({
      key: "INTEGRITY",
      label: "Nhật ký giám sát",
      count: proctorCount,
      allGraded: true,
      icon: proctorCount === 0 ? ShieldCheck : ShieldAlert,
    });

    return list;
  }, [
    essayReviews.length,
    codingReviews.length,
    unreviewedEssay.length,
    unreviewedCoding.length,
    proctorCount,
    hasObjective,
    detail.objective?.questionCount,
  ]);

  const activeTab: CategoryTab =
    userSelectedTab && tabs.some((t) => t.key === userSelectedTab)
      ? userSelectedTab
      : tabs[0]?.key ?? (hasObjective ? "OBJECTIVE" : "INTEGRITY");

  return (
    <div className="space-y-6 text-[#101828] dark:text-slate-100">
      {/* 1. COMPACT TOP HEADER BAR (Candidate Info, Total Score & Quick Actions) */}
      <header className="rounded-2xl border border-slate-200/80 bg-white px-5 py-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {/* Left: Back Button + Candidate Details + Total Score */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              disabled={busy}
              onClick={handleBack}
              className="flex size-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
              title="Quay lại Danh sách bài nộp"
              aria-label="Quay lại Danh sách bài nộp"
            >
              <ArrowLeft className="size-4" />
            </button>

            <div className="min-w-0">
              <h1
                ref={heading}
                tabIndex={-1}
                className="text-sm font-extrabold text-[#101828] dark:text-white sm:text-base truncate"
              >
                {detail.candidateName || "Ứng viên"}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Bài làm ID #{detail.id} · Trạng thái:{" "}
                <span
                  className={cn(
                    "font-bold",
                    detail.status === "GRADED"
                      ? "text-emerald-600 dark:text-emerald-400"
                      : detail.status === "EXPIRED"
                        ? "text-rose-600 dark:text-rose-400"
                        : "text-amber-600 dark:text-amber-400",
                  )}
                >
                  {detail.status === "GRADED"
                    ? "Đã chốt điểm"
                    : detail.status === "EXPIRED"
                      ? "Quá giờ"
                      : "Chờ duyệt"}
                </span>
              </p>
            </div>

            <div className="hidden sm:block h-8 w-px bg-slate-200 dark:bg-slate-800 mx-2" />

            <div className="hidden sm:block">
              <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
                Tổng điểm
              </div>
              <div className="text-xs font-bold text-[#101828] dark:text-white">
                {reviews.length > 0
                  ? `${reviews.length - unreviewedReviews.length}/${reviews.length} câu`
                  : `${display(detail.score)}/${detail.totalPoints} đ`}
              </div>
            </div>
          </div>

          {/* Right: Master Control Actions */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
            {/* Retry AI button */}
            <button
              type="button"
              disabled={busy}
              onClick={() => retry.mutate()}
              title="Yêu cầu AI chấm lại các câu chưa có kết quả"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-blue-600 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-all cursor-pointer"
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
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-blue-600 disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              <Mail className="size-3.5 text-slate-500" />
              Gửi email kết quả
            </button>

            {/* Close Button */}
            <button
              type="button"
              disabled={busy}
              onClick={handleBack}
              className="inline-flex items-center rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 transition-all cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      </header>

      {/* 2. SPLIT VIEW: Left Navigation Sidebar + Right Content Area */}
      <div className="flex flex-col lg:flex-row items-start gap-6">
        {/* Left Sidebar Nav (Gộp chung 1 section, cuộn tự nhiên theo trang) */}
        <aside className="w-full lg:w-60 shrink-0">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-2 shadow-2xs dark:border-slate-800 dark:bg-slate-900 flex flex-col gap-1">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.key;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setUserSelectedTab(tab.key)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all text-left cursor-pointer",
                    isActive
                      ? "bg-slate-100 font-bold text-[#101828] dark:bg-slate-800 dark:text-white shadow-2xs"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200",
                  )}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Icon
                      className={cn(
                        "size-4 shrink-0",
                        isActive
                          ? "text-[#0066FF] dark:text-blue-400"
                          : tab.allGraded && tab.count > 0 && (tab.key === "ESSAY" || tab.key === "CODING")
                            ? "text-emerald-600 dark:text-emerald-400"
                            : "text-slate-400 dark:text-slate-500",
                      )}
                    />
                    <span className="truncate">{tab.label}</span>
                  </div>
                  <span
                    className={cn(
                      "rounded-full px-2 py-0.5 text-[11px] font-bold tabular-nums",
                      isActive
                        ? "bg-white text-slate-900 shadow-2xs dark:bg-slate-700 dark:text-white"
                        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
                    )}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>
        </aside>

        {/* Right Main Content Panel */}
        <main className="flex-1 min-w-0 space-y-6">
          {/* Section Header Title & Bulk Action */}
          <div className="flex items-center justify-between">
            <h2 className="text-base font-extrabold text-[#101828] dark:text-white">
              {activeTab === "ESSAY"
                ? "Tự luận"
                : activeTab === "CODING"
                  ? "Lập trình"
                  : activeTab === "INTEGRITY"
                    ? "Nhật ký giám sát"
                    : "Trắc nghiệm"}
            </h2>

            {/* Bulk AI approve for current section if unreviewed */}
            {activeTab === "ESSAY" && unreviewedEssay.length > 0 && (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  askConfirm({
                    title: "Chấp nhận điểm AI cho các câu tự luận?",
                    description: `Áp dụng điểm gợi ý của AI cho ${unreviewedEssay.length} câu tự luận chưa duyệt.`,
                    confirmLabel: "Chấp nhận & Lưu",
                    onConfirm: () => {
                      const decisions: GradeDecision[] = unreviewedEssay.map((r) => ({
                        questionId: r.questionId,
                        score: null,
                      }));
                      update.mutate(decisions);
                    },
                  });
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700 hover:bg-violet-100 dark:bg-violet-950/50 dark:text-violet-300 border border-violet-200/70 transition-all cursor-pointer"
              >
                <Sparkles className="size-3.5 text-violet-600 dark:text-violet-400" />
                Áp dụng điểm AI (${unreviewedEssay.length} câu)
              </button>
            )}

            {activeTab === "CODING" && unreviewedCoding.length > 0 && (
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  askConfirm({
                    title: "Chấp nhận điểm AI cho các câu lập trình?",
                    description: `Áp dụng điểm gợi ý của AI cho ${unreviewedCoding.length} câu lập trình chưa duyệt.`,
                    confirmLabel: "Chấp nhận & Lưu",
                    onConfirm: () => {
                      const decisions: GradeDecision[] = unreviewedCoding.map((r) => ({
                        questionId: r.questionId,
                        score: null,
                      }));
                      update.mutate(decisions);
                    },
                  });
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-violet-50 px-3 py-1.5 text-xs font-bold text-violet-700 hover:bg-violet-100 dark:bg-violet-950/50 dark:text-violet-300 border border-violet-200/70 transition-all cursor-pointer"
              >
                <Sparkles className="size-3.5 text-violet-600 dark:text-violet-400" />
                Áp dụng điểm AI (${unreviewedCoding.length} câu)
              </button>
            )}
          </div>

          {/* Section 1: Essay Questions */}
          {activeTab === "ESSAY" && (
            <div className="space-y-6">
              {essayReviews.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
                  <CheckCircle2 className="mx-auto size-8 text-emerald-500" />
                  <h3 className="mt-2 text-sm font-bold text-[#101828] dark:text-white">
                    Không có câu hỏi tự luận nào
                  </h3>
                </div>
              ) : (
                essayReviews.map((review, idx) => (
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
                ))
              )}
            </div>
          )}

          {/* Section 2: Coding Questions */}
          {activeTab === "CODING" && (
            <div className="space-y-6">
              {codingReviews.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
                  <CheckCircle2 className="mx-auto size-8 text-emerald-500" />
                  <h3 className="mt-2 text-sm font-bold text-[#101828] dark:text-white">
                    Không có câu hỏi lập trình nào
                  </h3>
                </div>
              ) : (
                codingReviews.map((review, idx) => (
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
                ))
              )}
            </div>
          )}

          {/* Section 3: Integrity Timeline */}
          {activeTab === "INTEGRITY" && (
            integrity ? (
              <IntegrityTimelineSection integrity={integrity} />
            ) : (
              <section className="rounded-2xl border border-slate-200/80 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
                <ShieldCheck className="mx-auto size-7 text-emerald-500/80 mb-2" />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Không ghi nhận dữ liệu giám sát cho bài thi này.
                </p>
              </section>
            )
          )}

          {/* Section 4: Objective MCQ Summary */}
          {activeTab === "OBJECTIVE" && (
            objective.questionCount > 0 ? (
              <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-3.5">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/50">
                      <CheckCircle2 className="size-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-[#101828] dark:text-white">
                        Trắc nghiệm khách quan (MCQ)
                      </h3>
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
                          ? Math.round(((objective.correctCount ?? 0) / objective.questionCount) * 100)
                          : 0}
                        %
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-slate-400 font-medium">Điểm đạt được</div>
                      <div className="text-base font-extrabold text-[#101828] dark:text-white">
                        {display(objective.score)} / {objective.totalPoints ?? 0} đ
                      </div>
                    </div>
                  </div>
                </div>
              </section>
            ) : (
              <section className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs text-slate-400 italic">
                  Không có câu hỏi trắc nghiệm nào trong đề thi này.
                </p>
              </section>
            )
          )}
        </main>
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
                reviews.filter((r) => {
                  const v = values?.[r.questionId];
                  return typeof v === "string" ? v.trim() !== "" : v != null;
                }),
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
  if (!review) return null;
  const isEssay = review.type === "ESSAY";
  const isReviewed = review.reviewedAt != null;
  const fieldName = `scores.${review.questionId}`;
  const hasError = !!errors?.scores?.[String(review.questionId)];
  const points = review.points ?? 0;
  const answerText =
    typeof review.answerText === "string"
      ? review.answerText.trim()
      : review.answerText != null
        ? String(review.answerText).trim()
        : "";

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
              {String(review.language).toUpperCase()}
            </span>
          )}

          <span className="text-xs font-semibold text-slate-400">
            · Thang điểm: {points} đ
          </span>
        </div>

        {/* Status Pill */}
        <div>
          {isReviewed ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200/60">
              <Check className="size-3.5" /> Đã duyệt: {display(review.score)}/{points} đ
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
          {typeof review.prompt === "string" ? review.prompt : safeText(review.prompt, "Câu hỏi")}
        </h3>
      </div>

      {/* 3. Candidate's Answer Presentation */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-semibold text-slate-500 dark:text-slate-400">
          <span>{isEssay ? "Bài làm của ứng viên" : "Mã nguồn ứng viên nộp"}</span>
          <CopyButton text={answerText} />
        </div>

        {isEssay ? (
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-[13px] leading-relaxed text-[#101828] dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-200 whitespace-pre-wrap break-words min-h-[5rem] max-h-96 overflow-y-auto">
            {answerText ? (
              answerText
            ) : (
              <span className="italic text-slate-400">Ứng viên không trả lời câu hỏi này.</span>
            )}
          </div>
        ) : (
          <div className="relative rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs font-mono text-slate-100 dark:border-slate-800 dark:bg-slate-950 max-h-96 overflow-auto">
            <pre className="whitespace-pre-wrap break-words leading-relaxed">
              <code>{answerText || "// Ứng viên không nộp mã nguồn cho câu này"}</code>
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
        <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/80 text-slate-600 dark:border-slate-800 dark:bg-slate-800/40 dark:text-slate-400">
                <th className="px-4 py-2.5 font-bold">Tiêu chí</th>
                <th className="px-4 py-2.5 font-bold text-center w-36">Trọng số</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {criteria.map((cRaw, idx) => {
                const criterion: RubricCriterionView =
                  typeof cRaw === "string"
                    ? { name: cRaw, description: cRaw, weight: Math.round(100 / (criteria.length || 1)) }
                    : (safeObject(cRaw) as RubricCriterionView);
                const weight = safeNumber(criterion.weight) ?? Math.round(100 / (criteria.length || 1));

                return (
                  <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20">
                    <td className="px-4 py-3 align-middle font-medium text-[#101828] dark:text-white">
                      {safeText(criterion.name || criterion.description, `Tiêu chí ${idx + 1}`)}
                      {Boolean(criterion.guide) && (
                        <p className="mt-0.5 text-[11px] font-normal text-slate-400">
                          {safeText(criterion.guide)}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3 align-middle text-center text-slate-600 dark:text-slate-300 font-semibold">
                      {weight}%
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
            {runs.map((rawRun, i) => {
              const r = safeObject<{ questionId?: unknown; count?: unknown }>(rawRun);
              const qId = r.questionId ?? i + 1;
              const runCount = safeNumber(r.count) ?? 0;
              return (
                <div
                  key={String(qId)}
                  className="flex items-center justify-between rounded-xl border border-slate-200/70 bg-slate-50/60 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-800/40"
                >
                  <span className="font-semibold text-slate-700 dark:text-slate-300">
                    Câu #{String(qId)}
                  </span>
                  <span className="rounded-md bg-blue-100 px-2 py-0.5 font-bold text-blue-800 dark:bg-blue-950 dark:text-blue-300">
                    {runCount} lượt run
                  </span>
                </div>
              );
            })}
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
              {events.map((rawEvent, idx) => {
                const e = safeObject<{ eventType?: unknown; createdAt?: unknown; detail?: unknown }>(rawEvent);
                let formattedTime = "—";
                if (e.createdAt) {
                  try {
                    const d = new Date(e.createdAt as string | number);
                    if (!Number.isNaN(d.getTime())) {
                      formattedTime = d.toLocaleString("vi-VN");
                    }
                  } catch {
                    formattedTime = "—";
                  }
                }
                const detailStr = safeText(e.detail, "—");

                return (
                  <tr key={idx} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/20">
                    <td className="p-3 font-semibold text-slate-700 dark:text-slate-300">
                      <span className="rounded-md bg-amber-50 px-2 py-0.5 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 font-mono text-[11px]">
                        {safeText(e.eventType, "EVENT")}
                      </span>
                    </td>
                    <td className="p-3 text-slate-500 whitespace-nowrap">
                      {formattedTime}
                    </td>
                    <td
                      className="p-3 text-slate-600 dark:text-slate-300 leading-relaxed max-w-md truncate"
                      title={detailStr}
                    >
                      {detailStr}
                    </td>
                  </tr>
                );
              })}
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
