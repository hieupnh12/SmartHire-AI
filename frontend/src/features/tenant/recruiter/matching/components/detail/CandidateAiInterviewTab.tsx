import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  Bot,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  ExternalLink,
  FileCheck2,
  FileText,
  MessageSquare,
  Mic,
  Sparkles,
  Volume2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { aiInterviewApi } from "@/api/tenant/aiInterviewApi";
import { getApiErrorMessage } from "@/lib/axios";
import type {
  AiInterview,
  AiInterviewReport,
  CompetencyKey,
} from "@/api/types/aiInterview";
import { COMPETENCY_LABELS } from "@/api/types/aiInterview";
import { Skeleton, SkeletonCard } from "@/components/ux/Skeleton";
import { AiStatusBadge } from "@/features/tenant/recruiter/interviews/components/aiInterviewUi";
import { InterviewRecordingReview } from "@/features/tenant/recruiter/interviews/components/InterviewRecordingReview";
import { ConversationTranscript } from "@/features/tenant/recruiter/interviews/components/ConversationTranscript";
import { cn } from "@/lib/utils";

type Props = {
  applicationId: number;
  interviewId: number | null;
  candidateName: string;
  jobId: number;
  preview?: boolean;
};

// --- Mock data for preview mode ---
const PREVIEW_AI_INTERVIEW: AiInterview = {
  id: 3001,
  applicationId: 101,
  jobId: 9001,
  candidateId: 501,
  jobTitle: "Java Backend Developer (Mid–Senior)",
  workflowStageId: null,
  status: "PASSED",
  overallScore: 96,
  passingScore: 70,
  errorMessage: null,
  questionCount: 4,
  durationMinutes: 25,
  startedAt: new Date(Date.now() - 3600000).toISOString(),
  completedAt: new Date(Date.now() - 2100000).toISOString(),
  createdAt: new Date(Date.now() - 4000000).toISOString(),
  reportJson: JSON.stringify({
    overallScore: 96,
    summary: "Ứng viên có kiến thức chuyên sâu vững vàng về hệ sinh thái Java và kiến trúc phân tán.",
    competencies: {
      TECHNICAL_KNOWLEDGE: 95,
      PROBLEM_SOLVING: 94,
      COMMUNICATION: 98,
      BEHAVIORAL_SITUATIONAL: 92,
    },
    communicationCriteria: {
      TECHNICAL_KNOWLEDGE: 95,
      PROBLEM_SOLVING: 94,
      REASONING: 96,
      COMMUNICATION: 98,
    },
    skills: {
      Java: { score: 96, questionIds: [1001, 1002] },
      "Spring Boot": { score: 94, questionIds: [1003] },
      Concurrency: { score: 95, questionIds: [1004] },
    },
    strengths: [
      "Giải thích mạch lạc cơ chế đồng thời (Concurrency) và cấu trúc bộ nhớ JVM.",
      "Tư duy giải quyết vấn đề hệ thống có logic rõ ràng và đưa ra các đánh đổi (trade-offs) hợp lý.",
      "Kỹ năng giao tiếp tự tin, phong thái chuyên nghiệp và phản hồi nhanh.",
    ],
    weaknesses: [
      "Có thể đào sâu hơn về tối ưu hoá Garbage Collection trên cụm Kubernetes quy mô lớn.",
    ],
  }),
  questions: [
    {
      id: 1001,
      aiInterviewId: 3001,
      questionText:
        "Hãy trình bày cơ chế hoạt động của ConcurrentHashMap trong Java. Điều gì tạo nên sự khác biệt về hiệu năng giữa nó và Hashtable hay synchronized Map?",
      questionType: "OPEN",
      questionOrder: 1,
      stageTitle: "Kiến thức chuyên môn",
      difficulty: "Medium",
      competencies: ["TECHNICAL_KNOWLEDGE"],
      createdAt: new Date().toISOString(),
      answer: {
        id: 2001,
        aiQuestionId: 1001,
        answerText:
          "Trong Java 7, ConcurrentHashMap sử dụng kỹ thuật Segment Lock (phân đoạn bộ nhớ). Sang Java 8 trở lên, nó chuyển sang kỹ thuật Lock Striping ở cấp độ Node kết hợp với CAS (Compare-And-Swap) và `synchronized` chỉ trên đầu Node của bucket. Điều này giảm thiểu tối đa hiện tượng lock contention, cho phép nhiều luồng đọc đồng thời mà không bị block và nhiều luồng ghi vào các bucket khác nhau cùng lúc. Ngược lại, Hashtable hoặc Collections.synchronizedMap khóa toàn bộ cấu trúc Map cho mỗi thao tác, khiến hiệu năng bị suy giảm nghiêm trọng khi có nhiều luồng cùng truy cập.",
        answerDuration: 48,
        answeredAt: new Date().toISOString(),
        speechMetrics: {
          durationMs: 48000,
          voicedMs: 44000,
          silenceMs: 4000,
          pauseCount: 3,
          responseLatencyMs: 1200,
        },
        feedback: {
          id: 4001,
          aiAnswerId: 2001,
          score: 95,
          feedbackText:
            "Ứng viên phân tích rất chính xác sự khác biệt giữa Java 7 (Segment Lock) và Java 8 (Node lock + CAS). Nắm vững bản chất hiện tượng lock contention và cấu trúc bucket.",
          strengths: "Nắm vững cơ chế CAS và synchronized trên Node bucket.",
          weaknesses: "Chưa nhắc đến điều kiện chuyển bucket thành Red-Black Tree khi bucket có >= 8 phần tử.",
          createdAt: new Date().toISOString(),
        },
      },
    },
    {
      id: 1002,
      aiInterviewId: 3001,
      questionText:
        "Bạn xử lý sự cố Connection Pool bị cạn kiệt (HikariCP Connection Leak) trong môi trường sản xuất như thế nào? Các nguyên nhân phổ biến và cách phòng tránh?",
      questionType: "OPEN",
      questionOrder: 2,
      stageTitle: "Xử lý sự cố & Tối ưu hoá",
      difficulty: "Hard",
      competencies: ["PROBLEM_SOLVING", "TECHNICAL_KNOWLEDGE"],
      createdAt: new Date().toISOString(),
      answer: {
        id: 2002,
        aiQuestionId: 1002,
        answerText:
          "Khi HikariCP bị cạn kiệt connection, tôi kiểm tra chỉ số `leakDetectionThreshold` trong cấu hình HikariCP. Bật ngưỡng ví dụ 5000ms để log warning khi một connection bị giữ quá lâu. Nguyên nhân phổ biến thường do: 1) Long-running transaction hoặc query không có index khiến lock bảng; 2) Gọi API bên thứ ba hoặc HTTP call bên trong block `@Transactional`; 3) Không đóng Resource/Stream khi không dùng `try-with-resources`. Biện pháp khắc phục là tách biệt các external HTTP call ra ngoài transaction, cấu hình timeout chặt chẽ cho query và connection, và tối ưu pool size dựa trên công thức của HikariCP.",
        answerDuration: 55,
        answeredAt: new Date().toISOString(),
        speechMetrics: {
          durationMs: 55000,
          voicedMs: 51000,
          silenceMs: 4000,
          pauseCount: 2,
          responseLatencyMs: 950,
        },
        feedback: {
          id: 4002,
          aiAnswerId: 2002,
          score: 96,
          feedbackText:
            "Ứng viên chỉ ra chính xác sai lầm nghiêm trọng khi đặt external HTTP calls trong `@Transactional`, biết tận dụng `leakDetectionThreshold` và công thức cấu hình HikariCP.",
          strengths: "Kinh nghiệm thực chiến cao, giải pháp có hệ thống và an toàn.",
          weaknesses: "Không có.",
          createdAt: new Date().toISOString(),
        },
      },
    },
    {
      id: 1003,
      aiInterviewId: 3001,
      questionText:
        "Hãy mô tả một tình huống bạn phải thuyết phục thành viên trong nhóm hoặc Tech Lead từ bỏ một giải pháp công nghệ quen thuộc để chuyển sang một giải pháp mới tối ưu hơn.",
      questionType: "OPEN",
      questionOrder: 3,
      stageTitle: "Giao tiếp & Tình huống",
      difficulty: "Medium",
      competencies: ["COMMUNICATION", "BEHAVIORAL_SITUATIONAL"],
      createdAt: new Date().toISOString(),
      answer: {
        id: 2003,
        aiQuestionId: 1003,
        answerText:
          "Ở dự án trước, team quen dùng cơ chế polling cơ sở dữ liệu mỗi 2 giây để cập nhật trạng thái đơn hàng. Tôi nhận thấy việc này làm DB chịu tải nặng khi lượng người dùng tăng. Tôi đã làm một Proof of Concept (PoC) nhỏ với WebSocket và Redis Pub/Sub, đo đạc chỉ số latency giảm từ 2s xuống dưới 100ms và DB CPU giảm 40%. Thay vì tranh luận lý thuyết, tôi trình bày báo cáo so sánh số liệu thực nghiệm và chi phí tài nguyên, đồng thời xây dựng tài liệu chuyển đổi an toàn dạng feature flag. Team và Lead đã hoàn toàn đồng thuận chuyển đổi mà không gặp rủi ro gián đoạn dịch vụ.",
        answerDuration: 62,
        answeredAt: new Date().toISOString(),
        speechMetrics: {
          durationMs: 62000,
          voicedMs: 58000,
          silenceMs: 4000,
          pauseCount: 4,
          responseLatencyMs: 1100,
        },
        feedback: {
          id: 4003,
          aiAnswerId: 2003,
          score: 98,
          feedbackText:
            "Cách tiếp cận bằng PoC và số liệu đo đạc thực nghiệm (data-driven) thể hiện sự chín chắn trong kỹ năng mềm và tư duy kỹ thuật xuất sắc.",
          strengths: "Tư duy thuyết phục dựa trên dữ liệu (data-driven), làm PoC thực tế.",
          weaknesses: "Không có.",
          createdAt: new Date().toISOString(),
        },
      },
    },
  ],
};

function parseReport(json: string | null | undefined): AiInterviewReport | null {
  if (!json) return null;
  try {
    return JSON.parse(json) as AiInterviewReport;
  } catch {
    return null;
  }
}

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
      <span>{copied ? "Đã sao chép" : "Sao chép câu trả lời"}</span>
    </button>
  );
}

export function CandidateAiInterviewTab({
  applicationId,
  interviewId,
  candidateName,
  jobId,
  preview = false,
}: Props) {
  // If interviewId is NOT passed, query the AI interviews list for this application
  const listQuery = useQuery({
    queryKey: ["ai-interviews", "by-app", applicationId],
    queryFn: () => aiInterviewApi.list({ applicationId, size: 5 }),
    enabled: !preview && !interviewId,
  });

  const effectiveId =
    interviewId ||
    listQuery.data?.items?.[0]?.id ||
    null;

  const detailQuery = useQuery({
    queryKey: ["ai-interviews", "detail", effectiveId],
    queryFn: () => (effectiveId ? aiInterviewApi.get(effectiveId) : null),
    enabled: !preview && !!effectiveId,
  });

  const interview: AiInterview | null = preview
    ? PREVIEW_AI_INTERVIEW
    : detailQuery.data ?? null;

  // Primary sub-tab: "answers" (Candidate's actual work) vs "report" (Competencies & Report)
  const [activeSubTab, setActiveSubTab] = useState<"answers" | "report">("answers");
  const [activeFilter, setActiveFilter] = useState<string>("ALL");
  const [selectedQuestionId, setSelectedQuestionId] = useState<number | null>(null);

  // In TanStack Query v5, disabled queries have isPending=true. We must check isLoading (isPending && isFetching).
  const isResolvingId = !preview && !interviewId && listQuery.isLoading;
  const isFetchingDetail = !preview && !!effectiveId && detailQuery.isLoading;
  const isLoading = isResolvingId || isFetchingDetail;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full rounded-2xl" />
        <SkeletonCard className="h-64 rounded-2xl" />
        <Skeleton className="h-48 w-full rounded-2xl" />
      </div>
    );
  }

  const queryError = detailQuery.error || listQuery.error;
  if (!preview && queryError && !interview) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-2xs dark:border-rose-900/50 dark:bg-slate-900">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400">
          <AlertTriangle className="size-6" />
        </div>
        <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">
          Không thể tải chi tiết bài làm AI Interview
        </h3>
        <p className="mx-auto mt-1 max-w-md text-xs text-slate-500 dark:text-slate-400">
          {getApiErrorMessage(queryError)}
        </p>
        <button
          type="button"
          onClick={() => {
            if (detailQuery.isError) void detailQuery.refetch();
            if (listQuery.isError) void listQuery.refetch();
          }}
          className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-bold text-white hover:bg-slate-800 transition-colors cursor-pointer"
        >
          Thử lại
        </button>
      </div>
    );
  }

  if (!interview) {
    return (
      <div className="rounded-2xl border border-slate-200/80 bg-white p-10 text-center shadow-2xs dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-brand-primary/10 text-brand-primary border border-brand-primary/20 dark:bg-brand-primary/20">
          <Bot className="size-6" />
        </div>
        <h3 className="mt-3 text-base font-bold text-slate-900 dark:text-white">
          Chưa có dữ liệu bài làm AI Interview
        </h3>
        <p className="mx-auto mt-1 max-w-md text-xs text-slate-500 dark:text-slate-400">
          Ứng viên {candidateName} chưa thực hiện phiên phỏng vấn AI hoặc chưa có phiên nào được kích hoạt cho hồ sơ #{applicationId}.
        </p>
        <div className="mt-5 flex justify-center gap-3">
          <Link
            to={`/recruiter/jobs/${jobId}/ai-interviews`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors"
          >
            Quản lý AI Interview của Job
            <ExternalLink className="size-3.5" />
          </Link>
        </div>
      </div>
    );
  }

  const report = parseReport(interview.reportJson);
  const questions = interview.questions ?? [];
  const isConversational = !!interview.conversational;

  // Filter questions
  const filteredQuestions = questions.filter((q) => {
    if (activeFilter === "ALL") return true;
    return q.stageTitle === activeFilter || q.questionType === activeFilter;
  });

  const categories = Array.from(
    new Set(questions.map((q) => q.stageTitle).filter(Boolean))
  ) as string[];

  // Active single question for question switcher view if desired
  const activeQuestion =
    selectedQuestionId != null
      ? questions.find((q) => q.id === selectedQuestionId) ?? filteredQuestions[0]
      : filteredQuestions[0];

  return (
    <div className="space-y-6">
      {/* 1. Header Overview Strip */}
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900 sm:p-6">
        <div className="flex flex-col gap-4 border-b border-slate-100 pb-5 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-brand-primary/10 text-brand-primary border border-brand-primary/20 dark:bg-brand-primary/20">
              <Bot className="size-5" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">
                  Kết quả phỏng vấn AI · Phiên #{interview.id}
                </h2>
                <AiStatusBadge status={interview.status} />
                {isConversational && (
                  <span className="rounded-md bg-purple-50 border border-purple-200 px-2 py-0.5 text-[10px] font-bold text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                    Hội thoại trực tiếp (Voice / Chat)
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                {interview.jobTitle || "Phiên đánh giá năng lực AI"} · Bắt đầu lúc{" "}
                {interview.startedAt ? new Date(interview.startedAt).toLocaleString("vi-VN") : "—"}
              </p>
            </div>
          </div>

          {/* Overall score badge */}
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-brand-primary/10 border border-brand-primary/20 px-4 py-2 text-right dark:bg-brand-primary/20">
              <span className="block text-[10px] font-bold uppercase tracking-wider text-brand-primary">
                ĐIỂM AI INTERVIEW
              </span>
              <div className="flex items-baseline justify-end gap-1">
                <strong className="text-2xl font-black text-brand-primary tabular-nums">
                  {interview.overallScore != null ? interview.overallScore : "—"}
                </strong>
                <span className="text-xs text-slate-400">/ 100</span>
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
              {interview.passingScore ?? 70}/100 đ
            </strong>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/40">
            <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Số câu hỏi / lượt nói
            </span>
            <strong className="mt-0.5 block text-sm font-bold text-slate-800 dark:text-slate-200">
              {questions.length > 0 ? `${questions.length} câu hỏi` : isConversational ? "Hội thoại AI" : "Chưa có"}
            </strong>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/40">
            <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Thời gian thực hiện
            </span>
            <strong className="mt-0.5 block text-sm font-bold text-slate-800 dark:text-slate-200">
              {interview.durationMinutes ?? "—"} phút
            </strong>
          </div>
          <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/40">
            <span className="block text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Đánh giá chung
            </span>
            <strong
              className={cn(
                "mt-0.5 block text-sm font-bold",
                interview.overallScore != null && interview.overallScore >= (interview.passingScore ?? 70)
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-rose-600 dark:text-rose-400"
              )}
            >
              {interview.overallScore != null && interview.overallScore >= (interview.passingScore ?? 70)
                ? "Đạt yêu cầu"
                : "Chưa đạt"}
            </strong>
          </div>
        </div>
      </section>

      {/* 2. Sub-Tabs: Put Candidate's Work FRONT AND CENTER! */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 gap-4">
        <button
          type="button"
          onClick={() => setActiveSubTab("answers")}
          className={cn(
            "inline-flex items-center gap-2 pb-3 text-sm font-bold border-b-2 transition-colors cursor-pointer",
            activeSubTab === "answers"
              ? "border-brand-primary text-brand-primary"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          )}
        >
          <Mic className="size-4" />
          <span>Bài làm & Câu trả lời của ứng viên</span>
          {questions.length > 0 && (
            <span className="rounded-full bg-brand-primary/10 text-brand-primary border border-brand-primary/20 px-2 py-0.5 text-[11px]">
              {questions.length} câu
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab("report")}
          className={cn(
            "inline-flex items-center gap-2 pb-3 text-sm font-bold border-b-2 transition-colors cursor-pointer",
            activeSubTab === "report"
              ? "border-brand-primary text-brand-primary"
              : "border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
          )}
        >
          <FileCheck2 className="size-4" />
          <span>Báo cáo đánh giá & Năng lực AI</span>
        </button>
      </div>

      {/* 3. CONTENT AREA BY SUB-TAB */}
      {activeSubTab === "answers" ? (
        <section className="space-y-5">
          {/* If it's a conversational session: Show Conversation Transcript with audio recording playback */}
          {isConversational && !preview && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 rounded-xl bg-brand-primary/5 border border-brand-primary/15 p-3.5 text-xs text-slate-800 dark:bg-brand-primary/10 dark:border-brand-primary/20 dark:text-slate-200">
                <MessageSquare className="size-4 shrink-0 text-brand-primary" />
                <span>
                  Phiên phỏng vấn này diễn ra theo hình thức đối thoại thời gian thực. Dưới đây là toàn bộ bản ghi âm và transcript từng lượt trao đổi giữa AI và ứng viên.
                </span>
              </div>
              <ConversationTranscript interviewId={interview.id} />
            </div>
          )}

          {/* Standard Q&A Questions & Candidate Answers List */}
          {questions.length > 0 ? (
            <div className="space-y-5">
              {/* Filter pills & Question index selector */}
              <div className="flex flex-col gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <FileText className="size-4 text-brand-primary" />
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                      Danh sách câu hỏi & Bài làm
                    </span>
                  </div>

                  {/* Category filters */}
                  {categories.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setActiveFilter("ALL")}
                        className={cn(
                          "rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer",
                          activeFilter === "ALL"
                            ? "bg-brand-primary text-white"
                            : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        )}
                      >
                        Tất cả ({questions.length})
                      </button>
                      {categories.map((cat) => {
                        const count = questions.filter((q) => q.stageTitle === cat).length;
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setActiveFilter(cat)}
                            className={cn(
                              "rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer",
                              activeFilter === cat
                                ? "bg-brand-primary text-white"
                                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                            )}
                          >
                            {cat} ({count})
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Quick Question Switcher Pills */}
                <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
                  <span className="text-[11px] font-semibold text-slate-400">Chọn câu:</span>
                  {filteredQuestions.map((q, idx) => {
                    const isSelected = (selectedQuestionId ?? filteredQuestions[0]?.id) === q.id;
                    const hasAnswer = !!q.answer?.answerText;
                    return (
                      <button
                        key={q.id}
                        type="button"
                        onClick={() => setSelectedQuestionId(q.id)}
                        className={cn(
                          "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition-all cursor-pointer",
                          isSelected
                            ? "bg-brand-primary text-white shadow-2xs"
                            : "bg-slate-50 border border-slate-200 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        )}
                      >
                        <span>Câu {idx + 1}</span>
                        {hasAnswer ? (
                          <span className={cn("size-1.5 rounded-full", isSelected ? "bg-white" : "bg-emerald-500")} />
                        ) : (
                          <span className={cn("size-1.5 rounded-full", isSelected ? "bg-white" : "bg-slate-400")} />
                        )}
                        {q.answer?.feedback?.score != null && (
                          <span className={cn("text-[10px]", isSelected ? "text-white/90" : "text-emerald-600 dark:text-emerald-400 font-bold")}>
                            {q.answer.feedback.score}đ
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Render Question Review Cards: Highlight candidate answer prominently */}
              {(activeQuestion ? [activeQuestion] : filteredQuestions).map((q) => {
                const answer = q.answer;
                const feedback = answer?.feedback;
                const isScored = feedback?.score != null;
                const questionIdx = questions.findIndex((item) => item.id === q.id);

                return (
                  <article
                    key={q.id}
                    className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900 space-y-4"
                  >
                    {/* Header: Question Badge + Stage + Score */}
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-lg bg-slate-100 border border-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          Câu {questionIdx >= 0 ? questionIdx + 1 : 1} (ID #{q.id})
                        </span>
                        <span className="rounded-md bg-purple-50 border border-purple-200/80 px-2 py-0.5 text-[11px] font-bold text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                          PHỎNG VẤN AI
                        </span>
                        {q.stageTitle && (
                          <span className="rounded-md bg-brand-primary/10 px-2 py-0.5 text-[11px] font-semibold text-brand-primary">
                            {q.stageTitle}
                          </span>
                        )}
                        {q.difficulty && (
                          <span className="text-[11px] text-slate-400">
                            · Độ khó: {q.difficulty}
                          </span>
                        )}
                      </div>

                      {/* Scored badge */}
                      <div>
                        {isScored ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 text-xs font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300">
                            <CheckCircle2 className="size-3.5" />
                            Đã chấm: {feedback.score}/100 đ
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 border border-amber-200 px-2.5 py-0.5 text-xs font-semibold text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
                            Chưa có điểm
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Question Prompt */}
                    <div className="rounded-xl bg-slate-50/80 border border-slate-200/60 p-4 dark:border-slate-800 dark:bg-slate-800/40">
                      <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                        Câu hỏi phỏng vấn
                      </span>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-relaxed whitespace-pre-wrap">
                        {q.questionText}
                      </h4>
                    </div>

                    {/* CANDIDATE'S ACTUAL ANSWER — FRONT & CENTER */}
                    <div className="space-y-2.5 rounded-xl border border-brand-primary/20 bg-brand-primary/5 p-4.5 dark:border-brand-primary/20 dark:bg-brand-primary/10">
                      <div className="flex items-center justify-between text-xs font-bold text-brand-primary border-b border-brand-primary/15 pb-2">
                        <span className="flex items-center gap-1.5">
                          <Mic className="size-4" />
                          BÀI LÀM / CÂU TRẢ LỜI CỦA ỨNG VIÊN
                        </span>
                        <div className="flex items-center gap-3">
                          {answer?.answerDuration != null && (
                            <span className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400 font-normal">
                              <Clock className="size-3" />
                              Thời lượng nói: {answer.answerDuration}s
                            </span>
                          )}
                          <CopyButton text={answer?.answerText} />
                        </div>
                      </div>

                      <div className="rounded-xl border border-slate-200 bg-white p-4 text-[13.5px] leading-relaxed text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100 whitespace-pre-wrap min-h-[5.5rem] shadow-2xs font-normal">
                        {answer?.answerText ? (
                          answer.answerText
                        ) : (
                          <div className="py-2 text-center text-slate-400 italic">
                            Ứng viên chưa trả lời câu hỏi này hoặc không có dữ liệu âm thanh/văn bản.
                          </div>
                        )}
                      </div>

                      {/* Audio Recording Review (if available) */}
                      {!preview && answer?.id && interview.id && (
                        <div className="pt-2">
                          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                            <Volume2 className="size-3.5 text-brand-primary" />
                            Bản ghi âm giọng nói ứng viên:
                          </div>
                          <InterviewRecordingReview
                            interviewId={interview.id}
                            answerId={answer.id}
                          />
                        </div>
                      )}
                    </div>

                    {/* AI Feedback & Score Analysis */}
                    {feedback && (
                      <div className="rounded-xl border border-purple-100 bg-purple-50/30 p-4 dark:border-purple-900/30 dark:bg-purple-950/20 space-y-2.5">
                        <div className="flex items-center justify-between text-xs font-bold text-purple-900 dark:text-purple-300">
                          <span className="flex items-center gap-1.5">
                            <Sparkles className="size-4 text-purple-600 dark:text-purple-400" />
                            AI Đánh giá & Phản hồi câu trả lời
                          </span>
                          <span className="rounded-md bg-white border border-purple-200 px-2 py-0.5 font-extrabold text-purple-700 dark:border-purple-800 dark:bg-purple-900 dark:text-purple-200">
                            Điểm: {feedback.score}/100 đ
                          </span>
                        </div>

                        {feedback.feedbackText && (
                          <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-300">
                            {feedback.feedbackText}
                          </p>
                        )}

                        <div className="grid gap-2 pt-1 sm:grid-cols-2 text-xs">
                          {feedback.strengths && (
                            <div className="rounded-lg bg-emerald-50/70 border border-emerald-100 p-2.5 text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300">
                              <strong className="block font-semibold">Điểm tốt:</strong>
                              <span className="mt-0.5 block">{feedback.strengths}</span>
                            </div>
                          )}
                          {feedback.weaknesses && (
                            <div className="rounded-lg bg-amber-50/70 border border-amber-100 p-2.5 text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-300">
                              <strong className="block font-semibold">Cần cải thiện:</strong>
                              <span className="mt-0.5 block">{feedback.weaknesses}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </article>
                );
              })}
            </div>
          ) : !isConversational ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs text-slate-400 italic">
                Chưa có câu hỏi phỏng vấn nào được ghi nhận cho phiên này.
              </p>
            </div>
          ) : null}
        </section>
      ) : (
        /* Sub-Tab 2: Competency Scores Breakdown & Overall AI Insights */
        <section className="space-y-6">
          {report ? (
            <div className="space-y-5 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900 sm:p-6">
              <div className="flex items-center gap-2 border-b border-slate-100 pb-4 dark:border-slate-800">
                <FileCheck2 className="size-5 text-brand-primary" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Báo cáo năng lực & Phân tích tổng thể từ AI
                  </h3>
                  <p className="text-xs text-slate-400">
                    Chi tiết điểm số theo từng trụ cột năng lực chuyên môn và kỹ năng mềm.
                  </p>
                </div>
              </div>

              {/* Summary */}
              {report.summary && (
                <div className="rounded-xl border border-brand-primary/15 bg-brand-primary/5 p-4 text-xs dark:border-brand-primary/20 dark:bg-brand-primary/10">
                  <span className="font-bold text-brand-primary block mb-1">Tóm tắt đánh giá của AI:</span>
                  <p className="text-slate-700 dark:text-slate-300 leading-relaxed">
                    {report.summary}
                  </p>
                </div>
              )}

              {/* Competencies Progress Bars */}
              {report.competencies && Object.keys(report.competencies).length > 0 && (
                <div className="space-y-3 pt-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                    Điểm theo nhóm năng lực
                  </h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {(Object.entries(report.competencies) as [CompetencyKey, number][]).map(
                      ([key, score]) => (
                        <div
                          key={key}
                          className="space-y-1.5 rounded-xl border border-slate-200/70 bg-slate-50/50 p-3 text-xs dark:border-slate-800 dark:bg-slate-800/40"
                        >
                          <div className="flex justify-between font-semibold text-slate-700 dark:text-slate-200">
                            <span>{COMPETENCY_LABELS[key] ?? key}</span>
                            <strong className="text-brand-primary font-bold tabular-nums">
                              {score}/100
                            </strong>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                            <div
                              className="h-full rounded-full bg-brand-primary transition-all duration-500"
                              style={{ width: `${Math.min(100, Math.max(0, score))}%` }}
                            />
                          </div>
                        </div>
                      )
                    )}
                  </div>
                </div>
              )}

              {/* AI Strengths & Weaknesses */}
              <div className="grid gap-3 pt-2 sm:grid-cols-2">
                {report.strengths && (
                  <div className="rounded-xl border border-emerald-200/80 bg-emerald-50/40 p-4 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                    <h4 className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 dark:text-emerald-300">
                      <CheckCircle2 className="size-4 text-emerald-600" />
                      Điểm mạnh nổi bật
                    </h4>
                    <ul className="mt-2 space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                      {(typeof report.strengths === "string"
                        ? report.strengths.split("\n").map((s) => s.replace(/^[•\-\*]\s*/, "").trim()).filter(Boolean)
                        : (report.strengths as unknown as string[]) || []
                      ).map((str: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-1.5 leading-relaxed">
                          <span className="mt-1 size-1.5 shrink-0 rounded-full bg-emerald-500" />
                          <span>{str}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {report.weaknesses && (
                  <div className="rounded-xl border border-amber-200/80 bg-amber-50/40 p-4 dark:border-amber-900/40 dark:bg-amber-950/20">
                    <h4 className="flex items-center gap-1.5 text-xs font-bold text-amber-800 dark:text-amber-300">
                      <AlertTriangle className="size-4 text-amber-600" />
                      Điểm cần lưu ý / Xác minh thêm
                    </h4>
                    <ul className="mt-2 space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                      {(typeof report.weaknesses === "string"
                        ? report.weaknesses.split("\n").map((w) => w.replace(/^[•\-\*]\s*/, "").trim()).filter(Boolean)
                        : (report.weaknesses as unknown as string[]) || []
                      ).map((weak: string, idx: number) => (
                        <li key={idx} className="flex items-start gap-1.5 leading-relaxed">
                          <span className="mt-1 size-1.5 shrink-0 rounded-full bg-amber-500" />
                          <span>{weak}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
              <p className="text-xs text-slate-400 italic">
                Chưa có báo cáo năng lực chi tiết cho phiên này.
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
