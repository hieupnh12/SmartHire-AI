import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  Code2,
  Copy,
  Eye,
  FileText,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { assessmentApi } from "@/api/tenant/assessmentApi";
import { getApiErrorMessage } from "@/lib/axios";
import type {
  SubmissionGradingDetail,
} from "@/api/types/assessment";
import { Skeleton, SkeletonCard } from "@/components/ux/Skeleton";
import { cn } from "@/lib/utils";

type Props = {
  applicationId: number;
  submissionId: number | null;
  candidateName: string;
  jobId: number;
  preview?: boolean;
};

// --- Mock preview data ---
const PREVIEW_ASSESSMENT_DETAIL: SubmissionGradingDetail = {
  id: 32,
  testTitle: "Middle Full-Stack Developer",
  candidateName: "Lê mỹ lộc",
  candidateEmail: "loc.le@example.com",
  status: "SUBMITTED",
  score: null,
  totalPoints: 10,
  passingScore: 6,
  emailAvailable: true,
  objective: {
    correctCount: 1,
    questionCount: 3,
    score: 3,
    totalPoints: 3,
  },
  reviews: [
    {
      questionId: 185,
      prompt:
        "Trình bày cơ chế hoạt động của HashMap trong Java (phiên bản Java 8 trở lên). Điều gì xảy ra khi xảy ra xung đột khóa (hash collision) và cơ chế chuyển đổi từ LinkedList sang Red-Black Tree diễn ra theo điều kiện nào?",
      type: "ESSAY",
      points: 3,
      answerText: "i don't know",
      language: null,
      rubric: {
        referenceAnswer:
          "HashMap trong Java 8 sử dụng mảng các Node/Bucket kết hợp LinkedList và Red-Black Tree. Khi xung đột hash, các node được liên kết ở cuối bucket. Nếu số node trong bucket >= 8 và dung lượng mảng >= 64, bucket chuyển thành cây Red-Black Tree (độ phức tạp O(log n)). Nếu dung lượng mảng < 64 thì ưu tiên resize(). Khi số node giảm về <= 6 thì hoàn nguyên về LinkedList.",
        criteria: [
          {
            description: "Tính chính xác: Giải thích đúng nguyên lý và khái niệm cốt lõi",
            weight: 50,
          },
          {
            description: "Thuật ngữ & Bản chất: Đúng thuật ngữ, giải thích rõ cơ chế hoạt động",
            weight: 30,
          },
          {
            description: "Ví dụ thực tế: Minh họa rõ ràng ngữ cảnh sử dụng",
            weight: 20,
          },
        ],
      },
      evaluation: {
        comment: "Ứng viên không trả lời được câu hỏi (trả lời 'i don't know').",
      },
      suggestedScore: 0,
      score: 0,
      reviewedAt: new Date().toISOString(),
    },
    {
      questionId: 186,
      prompt:
        "Triển khai hàm kiểm tra tính hợp lệ của chuỗi ngoặc nhọn, ngoặc tròn, ngoặc vuông (Valid Parentheses). Trả về true nếu chuỗi ngoặc đóng mở hợp lệ và đúng thứ tự, ngược lại trả về false. Độ phức tạp thời gian O(N).",
      type: "CODING",
      points: 4,
      answerText: `public class Solution {
    public boolean isValid(String s) {
        java.util.Stack<Character> stack = new java.util.Stack<>();
        for (char c : s.toCharArray()) {
            if (c == '(') stack.push(')');
            else if (c == '{') stack.push('}');
            else if (c == '[') stack.push(']');
            else if (stack.isEmpty() || stack.pop() != c) return false;
        }
        return stack.isEmpty();
    }
}`,
      language: "java",
      rubric: {
        referenceAnswer: "Sử dụng cấu trúc dữ liệu Stack để khớp các cặp ngoặc mở và đóng tương ứng.",
        criteria: [
          { description: "Độ chính xác thuật toán", weight: 60 },
          { description: "Xử lý edge cases (chuỗi rỗng, ngoặc đơn lẻ)", weight: 40 },
        ],
      },
      evaluation: {
        passed: true,
        testCasesPassed: 5,
        totalTestCases: 5,
        complexity: "Time: O(N), Space: O(N)",
        comment: "Thuật toán tối ưu, code ngắn gọn và bao phủ toàn bộ test cases.",
      },
      suggestedScore: 4,
      score: null,
      reviewedAt: null,
    },
  ],
  integrity: {
    proctorEventCount: 0,
    proctorEvents: [],
    customRuns: [],
  },
};

// Mock MCQ Questions for Preview
const PREVIEW_MCQ_QUESTIONS = [
  {
    id: 101,
    questionText: "Trong Java Memory Model, từ khóa volatile đảm bảo tính chất nào sau đây?",
    points: 1,
    options: [
      { id: 1, text: "A. Tính nguyên tử (Atomicity) cho mọi biểu thức số học phức tạp" },
      { id: 2, text: "B. Tính khả kiến (Visibility) trên bộ nhớ cache và ngăn chặn Instruction Reordering" },
      { id: 3, text: "C. Đồng bộ hóa toàn bộ phương thức như từ khóa synchronized" },
      { id: 4, text: "D. Tự động giải phóng biến khỏi Heap khi không còn luồng sử dụng" },
    ],
    candidateSelectedId: 2,
    correctId: 2,
    explanation: "Từ khóa volatile đảm bảo các luồng đọc luôn đọc từ main memory (Visibility) và ngăn compiler/CPU sắp xếp lại chỉ thị lệnh (Memory Barrier), nhưng không đảm bảo tính nguyên tử.",
  },
  {
    id: 102,
    questionText: "Độ phức tạp thời gian trung bình để tìm kiếm một phần tử trong cây Red-Black Tree với n phần tử là gì?",
    points: 1,
    options: [
      { id: 1, text: "A. O(1)" },
      { id: 2, text: "B. O(log n)" },
      { id: 3, text: "C. O(n)" },
      { id: 4, text: "D. O(n log n)" },
    ],
    candidateSelectedId: 2,
    correctId: 2,
    explanation: "Cây Red-Black Tree là cây nhị phân tìm kiếm tự cân bằng, đảm bảo chiều cao không vượt quá 2*log(n+1), do đó phép tìm kiếm luôn đạt O(log n).",
  },
  {
    id: 103,
    questionText: "Annotation nào trong Spring Boot dùng để định nghĩa một bean bất đồng bộ chạy trên thread pool riêng biệt?",
    points: 1,
    options: [
      { id: 1, text: "A. @Async" },
      { id: 2, text: "B. @Transactional" },
      { id: 3, text: "C. @Scheduled" },
      { id: 4, text: "D. @Lazy" },
    ],
    candidateSelectedId: 3,
    correctId: 1,
    explanation: "@Async đánh dấu phương thức được thực thi bất đồng bộ trên một TaskExecutor riêng biệt.",
  },
];

type CategoryKey = "ESSAY" | "OBJECTIVE" | "CODING" | "INTEGRITY";

function CopyButton({ text }: { text: string | null | undefined }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button
      type="button"
      onClick={handleCopy}
      className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors cursor-pointer"
    >
      {copied ? <Check className="size-3 text-emerald-500" /> : <Copy className="size-3" />}
      <span>{copied ? "Đã sao chép" : "Sao chép"}</span>
    </button>
  );
}

export function CandidateAssessmentTab({
  applicationId,
  submissionId,
  candidateName,
  preview = false,
}: Props) {
  // If submissionId is NOT provided, check available assessments for this application
  const availableQuery = useQuery({
    queryKey: ["assessments", "available-by-app", applicationId],
    queryFn: () => assessmentApi.available(applicationId),
    enabled: !preview && !submissionId,
  });

  const effectiveSubmissionId =
    submissionId ||
    availableQuery.data?.find((a) => a.submissionId)?.submissionId ||
    null;

  const query = useQuery({
    queryKey: ["assessments", "grading-detail", effectiveSubmissionId],
    queryFn: () => (effectiveSubmissionId ? assessmentApi.gradingDetail(effectiveSubmissionId) : null),
    enabled: !preview && !!effectiveSubmissionId,
  });

  const resultQuery = useQuery({
    queryKey: ["assessments", "result", effectiveSubmissionId],
    queryFn: () => (effectiveSubmissionId ? assessmentApi.result(effectiveSubmissionId) : null),
    enabled: !preview && !!effectiveSubmissionId,
  });

  const detail: SubmissionGradingDetail | null = preview
    ? PREVIEW_ASSESSMENT_DETAIL
    : query.data ?? null;

  // Breakdown reviews by type
  const reviews = useMemo(() => detail?.reviews ?? [], [detail?.reviews]);
  const essayReviews = useMemo(() => reviews.filter((r) => r.type === "ESSAY"), [reviews]);
  const codingReviews = useMemo(() => reviews.filter((r) => r.type === "CODING"), [reviews]);
  const proctorCount = detail?.integrity?.proctorEventCount ?? 0;
  const objectiveCount = detail?.objective?.questionCount ?? 0;

  // Construct Category List based on presence
  const categories = useMemo(() => {
    const list: {
      key: CategoryKey;
      label: string;
      badge: string;
      icon: typeof FileText;
    }[] = [
      {
        key: "ESSAY",
        label: "Tự luận lý thuyết",
        badge: `${essayReviews.length} câu`,
        icon: FileText,
      },
      {
        key: "OBJECTIVE",
        label: "Trắc nghiệm",
        badge: `${objectiveCount} câu`,
        icon: CheckCircle2,
      },
    ];

    // Chỉ hiển thị "Tự luận code" nếu có câu hỏi coding
    if (codingReviews.length > 0) {
      list.push({
        key: "CODING",
        label: "Tự luận code",
        badge: `${codingReviews.length} câu`,
        icon: Code2,
      });
    }

    list.push({
      key: "INTEGRITY",
      label: "Nhật ký giám sát",
      badge: proctorCount === 0 ? "0 vi phạm" : `${proctorCount} cảnh báo`,
      icon: proctorCount === 0 ? ShieldCheck : ShieldAlert,
    });

    return list;
  }, [essayReviews.length, objectiveCount, codingReviews.length, proctorCount]);

  // Selected Category
  const [activeCategory, setActiveCategory] = useState<CategoryKey>("ESSAY");

  // Selected question inside each category
  const [selectedEssayIdx, setSelectedEssayIdx] = useState<number>(0);
  const [selectedCodingIdx, setSelectedCodingIdx] = useState<number>(0);
  const [selectedMcqIdx, setSelectedMcqIdx] = useState<number>(0);

  // Accordion state for rubrics
  const [expandedRubrics, setExpandedRubrics] = useState<Record<number, boolean>>({});

  const toggleRubric = (questionId: number) => {
    setExpandedRubrics((prev) => ({
      ...prev,
      [questionId]: !prev[questionId],
    }));
  };

  // In TanStack Query v5, disabled queries have isPending=true. We must check isLoading (isPending && isFetching).
  const isResolving = !preview && !submissionId && availableQuery.isLoading;
  const isFetchingDetail = !preview && !!effectiveSubmissionId && query.isLoading;
  const isLoading = isResolving || isFetchingDetail;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <SkeletonCard className="h-64 rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  const queryError = query.error || availableQuery.error;
  if (!preview && queryError && !detail) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-2xs dark:border-rose-900/50 dark:bg-slate-900">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
          <AlertTriangle className="size-6" />
        </div>
        <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">
          Không thể tải chi tiết bài làm Assessment
        </h3>
        <p className="mx-auto mt-1 max-w-md text-xs text-slate-500 dark:text-slate-400">
          {getApiErrorMessage(queryError)}
        </p>
        <button
          type="button"
          onClick={() => {
            if (query.isError) void query.refetch();
            if (availableQuery.isError) void availableQuery.refetch();
          }}
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          Thử lại
        </button>
      </div>
    );
  }

  if (!detail) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white p-10 text-center shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
          <Code2 className="size-6" />
        </div>
        <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">
          Chưa có bài kiểm tra năng lực
        </h3>
        <p className="mx-auto mt-1 max-w-md text-xs text-slate-500 dark:text-slate-400">
          Ứng viên {candidateName} chưa thực hiện bài thi kiểm tra kỹ thuật cho vị trí tuyển dụng này.
        </p>
      </div>
    );
  }

  // Active items by category
  const activeEssay = essayReviews[selectedEssayIdx] ?? essayReviews[0];
  const activeCoding = codingReviews[selectedCodingIdx] ?? codingReviews[0];

  // Resolve MCQ questions: Use real resultQuery if available, else preview mock
  const realMcqQuestions = (resultQuery.data?.questions ?? [])
    .filter((q) => q.questionType === "MCQ" || q.questionType === "MULTIPLE_CHOICE")
    .map((q) => {
      const savedAns = resultQuery.data?.answers?.find((a) => a.questionId === q.id);
      return {
        id: q.id,
        questionText: q.questionText,
        points: q.points,
        options: (q.options ?? []).map((opt) => ({ id: opt.id, text: opt.optionText })),
        candidateSelectedId: savedAns?.selectedOptionId ?? null,
        correctId: null, // Staff view without answer key unless exposed
        explanation: null,
      };
    });

  const mcqList =
    realMcqQuestions.length > 0
      ? realMcqQuestions
      : preview
        ? PREVIEW_MCQ_QUESTIONS
        : [];

  const activeMcq = mcqList[selectedMcqIdx] ?? mcqList[0];

  return (
    <div className="space-y-6">
      {/* 1. Header Overview Strip (Matching screenshot banner!) */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 dark:bg-indigo-950 dark:text-indigo-300">
              <ClipboardList className="size-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  {detail.testTitle || "Bài kiểm tra năng lực kỹ thuật"}
                </h2>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-0.5 text-xs font-bold",
                    detail.status === "GRADED"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/60 dark:text-emerald-300"
                      : "bg-brand-primary/10 text-brand-primary border border-brand-primary/20 dark:bg-brand-primary/20 dark:text-brand-primary"
                  )}
                >
                  {detail.status === "GRADED"
                    ? "Đã chốt điểm"
                    : detail.status === "SUBMITTED"
                      ? "Đã nộp bài"
                      : detail.status}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Bài làm ID #{detail.id} · Ứng viên: {detail.candidateName}
              </p>
            </div>
          </div>

          {/* Overall score badge */}
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-indigo-50/80 border border-indigo-200/60 px-4 py-2 text-right dark:bg-indigo-950/50 dark:border-indigo-800">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                ĐIỂM BÀI LÀM
              </span>
              <div className="flex items-baseline justify-end gap-1">
                <strong className="text-2xl font-black text-indigo-700 dark:text-indigo-300 tabular-nums">
                  {detail.score != null ? detail.score : "—"}
                </strong>
                <span className="text-xs text-slate-400">/ {detail.totalPoints || 10} đ</span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick stats strip */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/40">
            <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Điểm đạt yêu cầu
            </span>
            <strong className="mt-0.5 block text-sm font-bold text-slate-800 dark:text-slate-200">
              {detail.passingScore ?? 6} đ
            </strong>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/40">
            <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Tổng số câu hỏi
            </span>
            <strong className="mt-0.5 block text-sm font-bold text-slate-800 dark:text-slate-200">
              {reviews.length + (detail.objective?.questionCount ?? 0)} câu
            </strong>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/40">
            <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Trắc nghiệm đúng
            </span>
            <strong className="mt-0.5 block text-sm font-bold text-slate-800 dark:text-slate-200">
              {detail.objective?.correctCount ?? 0}/{detail.objective?.questionCount ?? 0} câu
            </strong>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/40">
            <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Cảnh báo giám sát
            </span>
            <strong
              className={cn(
                "mt-0.5 block text-sm font-bold",
                proctorCount === 0
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-amber-600 dark:text-amber-400"
              )}
            >
              {proctorCount === 0 ? "Bình thường (0 vi phạm)" : `${proctorCount} cảnh báo`}
            </strong>
          </div>
        </div>
      </section>

      {/* 2. CATEGORY TABS (Chia ra: Tự luận lý thuyết, Trắc nghiệm, Tự luận code (nếu có), Nhật ký giám sát) */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 dark:border-slate-800 pb-3">
          <div className="flex flex-wrap items-center gap-2">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isActive = activeCategory === cat.key;
              return (
                <button
                  key={cat.key}
                  type="button"
                  onClick={() => setActiveCategory(cat.key)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-bold transition-all cursor-pointer",
                    isActive
                      ? "bg-brand-primary text-white shadow-xs"
                      : "bg-white border border-slate-200/90 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  )}
                >
                  <Icon className="size-4" />
                  <span>{cat.label}</span>
                  <span
                    className={cn(
                      "rounded-md px-1.5 py-0.2 text-[10px] font-semibold",
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300"
                    )}
                  >
                    {cat.badge}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. DETAILS DISPLAY BY CATEGORY ("xong ấn vào thì nó hiển thị bài làm của ứng viên") */}

        {/* A. TỰ LUẬN LÝ THUYẾT */}
        {activeCategory === "ESSAY" && (
          <div className="space-y-4">
            {essayReviews.length > 0 ? (
              <>
                {/* Question selector tabs if multiple essay questions */}
                {essayReviews.length > 1 && (
                  <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/40">
                    <span className="text-[11px] font-semibold text-slate-400">Chọn câu tự luận:</span>
                    {essayReviews.map((r, i) => (
                      <button
                        key={r.questionId}
                        type="button"
                        onClick={() => setSelectedEssayIdx(i)}
                        className={cn(
                          "rounded-lg px-3 py-1 text-xs font-bold transition-all cursor-pointer",
                          selectedEssayIdx === i
                            ? "bg-brand-primary text-white shadow-2xs"
                            : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        )}
                      >
                        Câu {i + 1} ({r.points} đ)
                      </button>
                    ))}
                  </div>
                )}

                {/* Candidate Essay Submission Card */}
                {activeEssay && (
                  <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
                    {/* Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-lg bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          Câu {selectedEssayIdx + 1} (ID #{activeEssay.questionId})
                        </span>
                        <span className="rounded-md bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-950 dark:text-purple-300 px-2 py-0.5 text-[11px] font-bold uppercase">
                          TỰ LUẬN LÝ THUYẾT
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          · Thang điểm: {activeEssay.points} đ
                        </span>
                      </div>

                      {/* Grade Status */}
                      <div>
                        {activeEssay.score != null ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                            <CheckCircle2 className="size-3.5" />
                            Đã duyệt: {activeEssay.score}/{activeEssay.points} đ
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                            Chờ duyệt
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Question Prompt */}
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-relaxed whitespace-pre-wrap">
                        {activeEssay.prompt}
                      </h4>
                    </div>

                    {/* BÀI LÀM CỦA ỨNG VIÊN */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                        <span className="font-bold">Bài làm của ứng viên</span>
                        <CopyButton text={activeEssay.answerText} />
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-[13px] leading-relaxed text-slate-900 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-200 whitespace-pre-wrap min-h-[5rem]">
                        {activeEssay.answerText ? (
                          activeEssay.answerText
                        ) : (
                          <span className="italic text-slate-400">
                            Ứng viên không trả lời câu hỏi này.
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Đáp án mẫu & Rubric Accordion */}
                    {activeEssay.rubric && (
                      <div className="rounded-xl border border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => toggleRubric(activeEssay.questionId)}
                          className="flex w-full items-center justify-between bg-slate-50/60 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100/60 dark:bg-slate-800/40 dark:text-slate-300 transition-colors cursor-pointer"
                        >
                          <span className="flex items-center gap-1.5">
                            <Eye className="size-3.5 text-slate-400" />
                            Đáp án mẫu tham khảo (Reference Answer)
                          </span>
                          {expandedRubrics[activeEssay.questionId] !== false ? (
                            <ChevronUp className="size-4 text-slate-400" />
                          ) : (
                            <ChevronDown className="size-4 text-slate-400" />
                          )}
                        </button>

                        {expandedRubrics[activeEssay.questionId] !== false && (
                          <div className="p-4 space-y-3 text-xs border-t border-slate-100 dark:border-slate-800">
                            {activeEssay.rubric.referenceAnswer && (
                              <div className="rounded-lg bg-slate-50 p-3 leading-relaxed text-slate-700 dark:bg-slate-800/60 dark:text-slate-300 whitespace-pre-wrap">
                                {activeEssay.rubric.referenceAnswer}
                              </div>
                            )}

                            {/* Criteria Table */}
                            {activeEssay.rubric.criteria && activeEssay.rubric.criteria.length > 0 && (
                              <div className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                                <table className="w-full text-left text-xs">
                                  <thead className="bg-slate-50 text-[11px] font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                    <tr>
                                      <th className="px-3 py-2">Tiêu chí</th>
                                      <th className="px-3 py-2 text-right w-24">Trọng số</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                    {activeEssay.rubric.criteria.map((c, ci) => (
                                      <tr key={ci}>
                                        <td className="px-3 py-2 text-slate-700 dark:text-slate-300">
                                          <div className="font-semibold">{c.description}</div>
                                        </td>
                                        <td className="px-3 py-2 text-right font-bold text-slate-800 dark:text-slate-200 tabular-nums">
                                          {c.weight}%
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Bottom Score Strip */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-slate-800 text-xs">
                      <div className="text-slate-500">
                        AI đề xuất:{" "}
                        <strong className="text-slate-800 dark:text-slate-200">
                          {activeEssay.suggestedScore != null ? `${activeEssay.suggestedScore}/${activeEssay.points} đ` : "—"}
                        </strong>
                        {" · "}
                        Đã chốt:{" "}
                        <strong className="text-emerald-600 dark:text-emerald-400">
                          {activeEssay.score != null ? `${activeEssay.score} đ` : "Chờ duyệt"}
                        </strong>
                      </div>

                      <div className="font-bold text-slate-700 dark:text-slate-300">
                        Điểm: {activeEssay.score != null ? activeEssay.score : "—"} / {activeEssay.points} đ
                      </div>
                    </div>
                  </article>
                )}
              </>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs text-slate-400 italic">Không có câu hỏi tự luận lý thuyết nào trong đề thi này.</p>
              </div>
            )}
          </div>
        )}

        {/* B. TRẮC NGHIỆM */}
        {activeCategory === "OBJECTIVE" && (
          <div className="space-y-4">
            {/* Objective Summary Card */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300">
                  <CheckCircle2 className="size-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                    Kết quả phần thi Trắc nghiệm
                  </h4>
                  <p className="text-xs text-slate-500">
                    Hệ thống tự động chấm điểm khách quan theo đáp án chính xác.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs font-semibold">
                <div>
                  <span className="text-slate-400 block text-[11px]">Tỷ lệ chính xác</span>
                  <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                    {detail.objective?.questionCount
                      ? Math.round(((detail.objective.correctCount ?? 0) / detail.objective.questionCount) * 100)
                      : 0}
                    %
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Số câu đúng</span>
                  <span className="text-sm font-black text-slate-800 dark:text-slate-200">
                    {detail.objective?.correctCount ?? 0}/{detail.objective?.questionCount ?? 0}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Điểm đạt được</span>
                  <span className="text-sm font-black text-brand-primary">
                    {detail.objective?.score ?? 0}/{detail.objective?.totalPoints ?? 0} đ
                  </span>
                </div>
              </div>
            </div>

            {/* MCQ Questions List */}
            {mcqList.length > 0 ? (
              <div className="space-y-4">
                {/* Question index tabs */}
                <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/40">
                  <span className="text-[11px] font-semibold text-slate-400">Chọn câu trắc nghiệm:</span>
                  {mcqList.map((q, i) => {
                    const isCorrect = q.correctId != null ? q.candidateSelectedId === q.correctId : true;
                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => setSelectedMcqIdx(i)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-bold transition-all cursor-pointer",
                          selectedMcqIdx === i
                            ? "bg-brand-primary text-white shadow-2xs"
                            : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        )}
                      >
                        <span>Câu {i + 1}</span>
                        {q.correctId != null && (
                          <span
                            className={cn(
                              "size-1.5 rounded-full",
                              isCorrect ? "bg-emerald-400" : "bg-rose-400"
                            )}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Active MCQ Question Card */}
                {activeMcq && (
                  <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="rounded-lg bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          Câu {selectedMcqIdx + 1} (ID #{activeMcq.id})
                        </span>
                        <span className="rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 text-[11px] font-bold uppercase">
                          TRẮC NGHIỆM
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          · Thang điểm: {activeMcq.points} đ
                        </span>
                      </div>

                      {activeMcq.correctId != null && (
                        <div>
                          {activeMcq.candidateSelectedId === activeMcq.correctId ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                              <CheckCircle2 className="size-3.5" /> Đúng ({activeMcq.points}/{activeMcq.points} đ)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 border border-rose-200 px-2.5 py-0.5 text-xs font-bold text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                              <XCircle className="size-3.5" /> Sai (0/{activeMcq.points} đ)
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Question Prompt */}
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-relaxed">
                        {activeMcq.questionText}
                      </h4>
                    </div>

                    {/* Options & Candidate's Selected Choice */}
                    <div className="space-y-2 pt-1">
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wide block">
                        Phương án trả lời & Lựa chọn của ứng viên:
                      </span>
                      <div className="space-y-2">
                        {activeMcq.options.map((opt) => {
                          const isCandidateChoice = activeMcq.candidateSelectedId === opt.id;
                          const isCorrect = activeMcq.correctId === opt.id;

                          return (
                            <div
                              key={opt.id}
                              className={cn(
                                "flex items-start justify-between gap-3 rounded-xl border p-3.5 text-xs transition-colors",
                                isCandidateChoice && isCorrect
                                  ? "border-emerald-500 bg-emerald-50/60 text-emerald-950 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-200"
                                  : isCandidateChoice && !isCorrect && activeMcq.correctId != null
                                    ? "border-rose-400 bg-rose-50/60 text-rose-950 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-200"
                                    : isCandidateChoice
                                      ? "border-brand-primary bg-brand-primary/10 text-brand-primary dark:border-brand-primary/40 dark:bg-brand-primary/20"
                                      : isCorrect
                                        ? "border-emerald-300 bg-emerald-50/30 text-slate-800 dark:border-emerald-800/60 dark:text-slate-200"
                                        : "border-slate-200 bg-white text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
                              )}
                            >
                              <div className="flex items-start gap-2.5">
                                <span
                                  className={cn(
                                    "flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold border",
                                    isCandidateChoice
                                      ? isCorrect || activeMcq.correctId == null
                                        ? "bg-emerald-600 text-white border-emerald-600"
                                        : "bg-rose-600 text-white border-rose-600"
                                      : "border-slate-300 text-slate-500 dark:border-slate-600"
                                  )}
                                >
                                  {isCandidateChoice ? (
                                    isCorrect || activeMcq.correctId == null ? "✓" : "✗"
                                  ) : (
                                    ""
                                  )}
                                </span>
                                <span className="leading-relaxed font-medium">{opt.text}</span>
                              </div>

                              {/* Badges */}
                              <div className="flex items-center gap-1.5 shrink-0">
                                {isCandidateChoice && (
                                  <span className="rounded-md bg-brand-primary text-white px-2 py-0.5 text-[10px] font-bold shadow-2xs">
                                    Ứng viên chọn
                                  </span>
                                )}
                                {isCorrect && (
                                  <span className="rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold dark:bg-emerald-950 dark:text-emerald-300">
                                    Đáp án đúng
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    {/* Explanation */}
                    {activeMcq.explanation && (
                      <div className="rounded-xl border border-brand-primary/15 bg-brand-primary/5 p-3.5 text-xs text-slate-800 dark:border-brand-primary/20 dark:bg-brand-primary/10 dark:text-slate-200">
                        <strong className="block font-semibold mb-0.5 text-brand-primary">Giải thích:</strong>
                        <span>{activeMcq.explanation}</span>
                      </div>
                    )}
                  </article>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
                <p className="text-xs text-slate-400 italic">Không có câu hỏi trắc nghiệm nào trong đề thi này.</p>
              </div>
            )}
          </div>
        )}

        {/* C. TỰ LUẬN CODE (Lập trình - Chỉ hiển thị nếu có) */}
        {activeCategory === "CODING" && (
          <div className="space-y-4">
            {codingReviews.length > 0 ? (
              <>
                {/* Question switcher if multiple coding questions */}
                {codingReviews.length > 1 && (
                  <div className="flex flex-wrap items-center gap-2 rounded-xl bg-slate-50 p-2.5 dark:bg-slate-800/40">
                    <span className="text-[11px] font-semibold text-slate-400">Chọn câu lập trình:</span>
                    {codingReviews.map((r, i) => (
                      <button
                        key={r.questionId}
                        type="button"
                        onClick={() => setSelectedCodingIdx(i)}
                        className={cn(
                          "rounded-lg px-3 py-1 text-xs font-bold transition-all cursor-pointer",
                          selectedCodingIdx === i
                            ? "bg-brand-primary text-white shadow-2xs"
                            : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        )}
                      >
                        Câu {i + 1} ({r.points} đ)
                      </button>
                    ))}
                  </div>
                )}

                {/* Active Coding Submission Card */}
                {activeCoding && (
                  <article className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
                    {/* Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-lg bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          Câu {selectedCodingIdx + 1} (ID #{activeCoding.questionId})
                        </span>
                        <span className="rounded-md bg-brand-primary/10 text-brand-primary border border-brand-primary/20 px-2 py-0.5 text-[11px] font-bold uppercase">
                          TỰ LUẬN CODE (LẬP TRÌNH)
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          · Thang điểm: {activeCoding.points} đ
                        </span>
                      </div>

                      {/* Grade Status */}
                      <div>
                        {activeCoding.score != null ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
                            <CheckCircle2 className="size-3.5" />
                            Đã duyệt: {activeCoding.score}/{activeCoding.points} đ
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950 dark:text-amber-300">
                            Chờ duyệt
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Question Prompt */}
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-relaxed whitespace-pre-wrap">
                        {activeCoding.prompt}
                      </h4>
                    </div>

                    {/* CANDIDATE'S CODE SUBMISSION */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-600 dark:text-slate-300">
                        <span className="font-bold flex items-center gap-1.5">
                          <Code2 className="size-4 text-brand-primary" />
                          Mã nguồn ứng viên đã nộp:
                        </span>
                        <CopyButton text={activeCoding.answerText} />
                      </div>

                      <div className="relative rounded-xl border border-slate-800 bg-slate-950 p-4 text-xs font-mono text-slate-100 max-h-96 overflow-auto shadow-inner">
                        <div className="mb-2 flex items-center justify-between border-b border-slate-800 pb-2 text-[10px] text-slate-400">
                          <span>Ngôn ngữ: <strong className="text-brand-primary">{activeCoding.language || "Java"}</strong></span>
                          <span>Đã định dạng mã nguồn</span>
                        </div>
                        <pre className="whitespace-pre-wrap break-words leading-relaxed">
                          <code>{activeCoding.answerText || "// Ứng viên không nộp mã nguồn cho câu này"}</code>
                        </pre>
                      </div>
                    </div>

                    {/* Coding Test Cases & Execution Results */}
                    {activeCoding.evaluation && (
                      <div className="rounded-xl border border-brand-primary/15 bg-brand-primary/5 p-4 text-xs dark:border-brand-primary/20 dark:bg-brand-primary/10 space-y-2">
                        <div className="flex items-center justify-between font-bold text-slate-900 dark:text-slate-100">
                          <span>Kết quả kiểm thử tự động (Sandbox Execution)</span>
                          {activeCoding.evaluation.testCasesPassed != null && (
                            <span className="rounded-md bg-white border border-brand-primary/20 px-2 py-0.5 text-brand-primary dark:bg-slate-900">
                              Vượt qua {String(activeCoding.evaluation.testCasesPassed)}/{String(activeCoding.evaluation.totalTestCases || 5)} test cases
                            </span>
                          )}
                        </div>

                        {Boolean(activeCoding.evaluation.complexity) && (
                          <div className="text-slate-600 dark:text-slate-400">
                            Độ phức tạp ước tính: <strong>{String(activeCoding.evaluation.complexity)}</strong>
                          </div>
                        )}

                        {Boolean(activeCoding.evaluation.comment) && (
                          <p className="text-slate-700 dark:text-slate-300 italic">
                            {String(activeCoding.evaluation.comment)}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Bottom Score Strip */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 dark:border-slate-800 text-xs">
                      <div className="text-slate-500">
                        AI đề xuất:{" "}
                        <strong className="text-slate-800 dark:text-slate-200">
                          {activeCoding.suggestedScore != null ? `${activeCoding.suggestedScore}/${activeCoding.points} đ` : "—"}
                        </strong>
                        {" · "}
                        Đã chốt:{" "}
                        <strong className="text-emerald-600 dark:text-emerald-400">
                          {activeCoding.score != null ? `${activeCoding.score} đ` : "Chờ duyệt"}
                        </strong>
                      </div>

                      <div className="font-bold text-slate-700 dark:text-slate-300">
                        Điểm: {activeCoding.score != null ? activeCoding.score : "—"} / {activeCoding.points} đ
                      </div>
                    </div>
                  </article>
                )}
              </>
            ) : null}
          </div>
        )}

        {/* D. NHẬT KÝ GIÁM SÁT */}
        {activeCategory === "INTEGRITY" && (
          <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-2xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <ShieldCheck className="size-5 text-emerald-600" />
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Nhật ký giám sát thi cử & Tính toàn vẹn
                </h4>
              </div>
              <span className="text-xs text-slate-500 font-semibold">
                Tổng cộng: {proctorCount} sự kiện ghi nhận
              </span>
            </div>

            {proctorCount === 0 ? (
              <div className="rounded-xl bg-emerald-50/50 border border-emerald-200/70 p-6 text-center text-xs text-emerald-800 dark:bg-emerald-950/30 dark:border-emerald-900/40 dark:text-emerald-300 space-y-2">
                <CheckCircle2 className="mx-auto size-8 text-emerald-600" />
                <strong className="text-sm block">Bài làm hoàn toàn nghiêm túc, không có vi phạm nào.</strong>
                <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                  Ứng viên hoàn thành bài thi với toàn màn hình liên tục, không chuyển tab trình duyệt và duy trì webcam ổn định.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {(detail.integrity?.proctorEvents ?? []).map((evt, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between rounded-xl border border-amber-200 bg-amber-50/50 p-3 text-xs text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200"
                  >
                    <span className="font-semibold">{evt.eventType || "Cảnh báo vi phạm"}</span>
                    <span className="text-slate-600 dark:text-slate-400">{evt.detail}</span>
                    <span className="font-mono text-slate-400">{evt.createdAt}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
