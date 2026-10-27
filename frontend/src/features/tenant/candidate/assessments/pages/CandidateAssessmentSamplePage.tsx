import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  Clock,
  Clock3,
  Code2,
  Cpu,
  FileCode,
  FileQuestion,
  FileText,
  Laptop,
  Layers,
  Mic,
  Play,
  RotateCcw,
  Send,
  ShieldCheck,
  Sparkles,
  Trophy,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ux/Button";
import { MonacoCodeEditor } from "@/components/shared/MonacoCodeEditor";

type Stage = "invitation" | "mcq" | "essay" | "coding" | "result";

interface QuestionOption {
  id: string;
  label: string;
  text: string;
  explanation?: string;
}

interface McqItem {
  id: number;
  skill: string;
  difficulty: "Dễ" | "Trung bình" | "Nâng cao";
  points: number;
  question: string;
  options: QuestionOption[];
}

const SAMPLE_MCQ_QUESTIONS: McqItem[] = [
  {
    id: 1,
    skill: "Spring Boot 3",
    difficulty: "Trung bình",
    points: 10,
    question: "Trong Spring Boot 3 & Spring Web, sự khác biệt căn bản nhất giữa `@RestController` và `@Controller` là gì?",
    options: [
      { id: "A", label: "A", text: "`@RestController` tự động bao hàm `@Controller` và `@ResponseBody`, mặc định serialize đối tượng trả về thành JSON/XML." },
      { id: "B", label: "B", text: "`@RestController` chỉ hỗ trợ giao thức HTTP GET, các phương thức POST/PUT bắt buộc dùng `@Controller`." },
      { id: "C", label: "C", text: "`@RestController` chạy trên Thread Pool riêng biệt của Netty, còn `@Controller` chạy trên Tomcat." },
      { id: "D", label: "D", text: "`@RestController` bắt buộc tất cả endpoint phải có header `X-Tenant-ID`." },
    ],
  },
  {
    id: 2,
    skill: "React 19 & Next.js",
    difficulty: "Trung bình",
    points: 10,
    question: "Hook mới nào trong React 19 cho phép quản lý trạng thái form action bất đồng bộ, trả về `[state, formAction, isPending]`?",
    options: [
      { id: "A", label: "A", text: "`useFormStatus`" },
      { id: "B", label: "B", text: "`useActionState`" },
      { id: "C", label: "C", text: "`useAsyncTransition`" },
      { id: "D", label: "D", text: "`useServerAction`" },
    ],
  },
  {
    id: 3,
    skill: "Database & Performance",
    difficulty: "Nâng cao",
    points: 10,
    question: "Trong MySQL InnoDB, loại Index nào được tổ chức theo cấu trúc B+Tree mà thứ tự vật lý của các dòng dữ liệu trên đĩa trùng với thứ tự khóa Index?",
    options: [
      { id: "A", label: "A", text: "Secondary Index (Non-clustered Index)" },
      { id: "B", label: "B", text: "Clustered Index (Primary Key Index)" },
      { id: "C", label: "C", text: "Fulltext Search Index" },
      { id: "D", label: "D", text: "Adaptive Hash Index" },
    ],
  },
  {
    id: 4,
    skill: "Multi-Tenancy & Security",
    difficulty: "Nâng cao",
    points: 10,
    question: "Trong kiến trúc SaaS 'Database-per-Tenant' (mỗi Tenant một DB riêng), phương pháp nào an toàn nhất để ngăn rò rỉ dữ liệu giữa các doanh nghiệp khi xử lý tác vụ bất đồng bộ (RabbitMQ Worker)?",
    options: [
      { id: "A", label: "A", text: "Đính kèm `X-Tenant-ID` vào Message Header, Worker đọc header và set vào `TenantContext` (ThreadLocal) trước khi gọi DB." },
      { id: "B", label: "B", text: "Tạo một RabbitMQ Virtual Host riêng biệt cho từng Tenant và khởi động từng container riêng." },
      { id: "C", label: "C", text: "Hardcode kết nối Master Database và join các bảng qua khóa ngoại." },
      { id: "D", label: "D", text: "Gộp toàn bộ dữ liệu vào một database chung và dùng câu lệnh `SELECT * FROM table WHERE tenant_id = ?`." },
    ],
  },
  {
    id: 5,
    skill: "Concurrency & Distributed Systems",
    difficulty: "Nâng cao",
    points: 10,
    question: "Để giải quyết vấn đề Cache Stampede (hàng ngàn request cùng miss cache và đập vào DB cùng một lúc khi key hết hạn), giải pháp nào hiệu quả và tối ưu nhất?",
    options: [
      { id: "A", label: "A", text: "Tăng timeout kết nối Database lên gấp 10 lần." },
      { id: "B", label: "B", text: "Sử dụng Distributed Mutex Lock (như Redis Redlock) hoặc cơ chế Cache-Aside kết hợp Probabilistic Early Expiration (XFetch)." },
      { id: "C", label: "C", text: "Xóa toàn bộ Redis Cache mỗi giờ một lần." },
      { id: "D", label: "D", text: "Chuyển tất cả truy vấn về synchronous blocking." },
    ],
  },
];

const SAMPLE_STARTER_CODE: Record<string, string> = {
  javascript: `/**
 * Bài toán: Tối ưu phân bổ lịch phỏng vấn (Merge Overlapping Intervals)
 * 
 * @param {number[][]} intervals - Mảng các khoảng thời gian [start, end]
 * @return {number[][]} Mảng các khoảng thời gian đã được gộp
 */
function mergeIntervals(intervals) {
  if (!intervals || intervals.length <= 1) return intervals;

  // Sắp xếp các ca phỏng vấn theo thời gian bắt đầu
  intervals.sort((a, b) => a[0] - b[0]);

  const result = [intervals[0]];

  for (let i = 1; i < intervals.length; i++) {
    const current = intervals[i];
    const previous = result[result.length - 1];

    if (current[0] <= previous[1]) {
      // Có giao thoa thời gian -> gộp khoảng
      previous[1] = Math.max(previous[1], current[1]);
    } else {
      // Không giao thoa -> thêm vào kết quả
      result.push(current);
    }
  }

  return result;
}

// Chạy thử với dữ liệu mẫu
const sampleInput = [[9, 10], [9.5, 11], [13, 15], [14.5, 16]];
console.log("Kết quả:", mergeIntervals(sampleInput));
`,
  python: `def merge_intervals(intervals: list[list[float]]) -> list[list[float]]:
    """
    Bài toán: Tối ưu phân bổ lịch phỏng vấn (Merge Overlapping Intervals)
    """
    if not intervals or len(intervals) <= 1:
        return intervals

    # Sắp xếp theo thời gian bắt đầu
    intervals.sort(key=lambda x: x[0])
    merged = [intervals[0]]

    for current in intervals[1:]:
        prev = merged[-1]
        if current[0] <= prev[1]:
            # Giao thoa thời gian -> gộp khoảng
            prev[1] = max(prev[1], current[1])
        else:
            merged.append(current)

    return merged

# Test mẫu
test_intervals = [[9, 10], [9.5, 11], [13, 15], [14.5, 16]]
print("Kết quả:", merge_intervals(test_intervals))
`,
  java: `import java.util.*;

public class Solution {
    public static int[][] mergeIntervals(int[][] intervals) {
        if (intervals.length <= 1) return intervals;

        Arrays.sort(intervals, (a, b) -> Integer.compare(a[0], b[0]));
        List<int[]> result = new ArrayList<>();
        int[] current = intervals[0];
        result.add(current);

        for (int[] interval : intervals) {
            if (interval[0] <= current[1]) {
                current[1] = Math.max(current[1], interval[1]);
            } else {
                current = interval;
                result.add(current);
            }
        }

        return result.toArray(new int[result.size()][]);
    }
}
`,
};

export function CandidateAssessmentSamplePage() {
  const [currentStage, setCurrentStage] = useState<Stage>("invitation");

  // Timer simulation
  const [secondsLeft, setSecondsLeft] = useState(42 * 60 + 35);
  const [timerRunning, setTimerRunning] = useState(true);

  // Invitation & Device check state
  const [rulesAccepted, setRulesAccepted] = useState(false);
  const micVolume = 68;

  // MCQ state
  const [mcqAnswers, setMcqAnswers] = useState<Record<number, string>>({
    1: "A",
    2: "B",
    3: "B",
  });
  const [currentMcqIndex, setCurrentMcqIndex] = useState(0);

  // Essay state
  const [essayAnswer, setEssayAnswer] = useState(
    `Để thiết kế hệ thống xử lý hàng đợi thông báo tuyển dụng realtime chịu tải cao (100.000 req/s), tôi đề xuất giải pháp kiến trúc phân tán như sau:

1. Kiến trúc Tổng thể:
- API Gateway tiếp nhận request và định tuyến theo header X-Tenant-ID.
- RabbitMQ đóng vai trò làm Message Broker chính với mô hình Topic Exchange và Dead Letter Exchange (DLX).
- Redis được sử dụng làm In-Memory Cache và lưu trữ trạng thái xử lý Idempotency Key (TTL 24 giờ).
- Worker Pool (Spring Boot / Node.js) tự động scale theo số lượng message trong hàng đợi (RabbitMQ Consumer Prefetch = 20).

2. Xử lý Idempotency & Chống Duplicate:
- Mỗi sự kiện tạo thông báo (VD: CandidatePassScreeningEvent) mang một idempotencyId duy nhất: SHA256(tenantId + eventType + entityId + timestampWindow).
- Trước khi gửi email/SMS, Worker thực hiện lệnh Redis: \`SET idempotency:{key} "PROCESSING" EX 300 NX\`.
- Nếu key đã tồn tại -> Bỏ qua message trùng lặp (ACK RabbitMQ ngay lập tức).
- Sau khi gửi thành công -> Cập nhật key thành "COMPLETED" với TTL 24h.

3. Xử lý lỗi & Dead-Letter Queue (DLQ):
- Thiết lập Retry Policy: thử lại tối đa 3 lần với Exponential Backoff (1s -> 4s -> 16s).
- Nếu sau 3 lần vẫn lỗi (như dịch vụ bên thứ 3 SendGrid/Twilio down) -> Đẩy message vào Dead Letter Queue (dlq_candidate_notifications).
- Đội ngũ vận hành có Dashboard giám sát và cơ chế Re-play thủ công khi dịch vụ khôi phục.`
  );

  // Coding state
  const [selectedLanguage, setSelectedLanguage] = useState("javascript");
  const [codeSource, setCodeSource] = useState(SAMPLE_STARTER_CODE["javascript"]);
  const [codeRunOutput, setCodeRunOutput] = useState<{
    status: "idle" | "running" | "success" | "error";
    passed: number;
    total: number;
    executionTimeMs: number;
    memoryMb: number;
    logs: string;
  }>({
    status: "idle",
    passed: 0,
    total: 3,
    executionTimeMs: 0,
    memoryMb: 0,
    logs: "",
  });

  // Format timer
  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const rem = secs % 60;
    return `${mins.toString().padStart(2, "0")}:${rem.toString().padStart(2, "0")}`;
  };

  // Timer countdown effect in exam rooms
  useEffect(() => {
    if (!timerRunning || currentStage === "invitation" || currentStage === "result") return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [timerRunning, currentStage]);

  // Handle language switch
  const handleLanguageChange = (lang: string) => {
    setSelectedLanguage(lang);
    setCodeSource(SAMPLE_STARTER_CODE[lang] ?? "");
    setCodeRunOutput({ status: "idle", passed: 0, total: 3, executionTimeMs: 0, memoryMb: 0, logs: "" });
  };

  // Run test cases simulation
  const handleRunCode = () => {
    setCodeRunOutput({ status: "running", passed: 0, total: 3, executionTimeMs: 0, memoryMb: 0, logs: "Đang biên dịch và thực thi trên Sandbox..." });
    setTimeout(() => {
      setCodeRunOutput({
        status: "success",
        passed: 3,
        total: 3,
        executionTimeMs: 42,
        memoryMb: 18.2,
        logs: `✔ Test Case 1: Input [[9, 10], [9.5, 11]] -> Expected [[9, 11]] -> Actual [[9, 11]] (Passed)
✔ Test Case 2: Input [[13, 15], [14.5, 16]] -> Expected [[13, 16]] -> Actual [[13, 16]] (Passed)
✔ Test Case 3: Input [[8, 9], [10, 12]] -> Expected [[8, 9], [10, 12]] -> Actual [[8, 9], [10, 12]] (Passed)

Tất cả 3/3 test cases công khai đã VƯỢT QUA thành công!`,
      });
    }, 900);
  };

  const stagesMeta: { id: Stage; label: string; desc: string; icon: any }[] = [
    { id: "invitation", label: "1. Thư mời & Kiểm tra thiết bị", desc: "Thiết bị & Thu âm tự động", icon: ShieldCheck },
    { id: "mcq", label: "2. Trắc nghiệm MCQ", desc: "5 câu lý thuyết", icon: FileQuestion },
    { id: "essay", label: "3. Tự luận Kỹ thuật", desc: "Thiết kế kiến trúc", icon: FileText },
    { id: "coding", label: "4. Lập trình Coding Studio", desc: "HackerRank style", icon: Code2 },
    { id: "result", label: "5. Kết quả & Đánh giá AI", desc: "Điểm số & Báo cáo năng lực", icon: Trophy },
  ];

  return (
    <div className="min-h-screen bg-[var(--color-surface)] text-[var(--color-on-surface)]">
      {/* TOP CONTROLS & DEMO BAR */}
      <header className="sticky top-0 z-40 border-b border-[var(--color-border-default)] bg-white/95 shadow-sm backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              to="/assessments"
              className="inline-flex size-9 items-center justify-center rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] text-[var(--color-on-surface-variant)] transition-colors hover:bg-[var(--color-surface-container)] hover:text-[var(--color-primary)]"
              title="Quay lại Danh sách Đánh giá"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary-subtle)] px-2.5 py-0.5 text-xs font-bold text-[var(--color-primary)]">
                  <Sparkles className="size-3" /> GIAO DIỆN MẪU ỨNG VIÊN
                </span>
                <span className="hidden text-xs text-[var(--color-on-surface-variant)] sm:inline">
                  (Mô phỏng trải nghiệm thi thực tế)
                </span>
              </div>
              <h1 className="text-sm font-semibold tracking-tight text-[var(--color-on-surface)] sm:text-base">
                Senior Full-Stack Engineer Technical Assessment
              </h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {/* Live timer simulation badge */}
            {currentStage !== "invitation" && currentStage !== "result" && (
              <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm font-semibold text-amber-900 shadow-sm">
                <Clock3 className="size-4 animate-pulse text-amber-600" />
                <span className="font-mono text-base">{formatTime(secondsLeft)}</span>
                <button
                  type="button"
                  onClick={() => setTimerRunning(!timerRunning)}
                  className="ml-1 text-xs text-amber-700 underline hover:text-amber-900"
                >
                  {timerRunning ? "Tạm dừng" : "Tiếp tục"}
                </button>
              </div>
            )}

            {/* Quick reset */}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setCurrentStage("invitation");
                setSecondsLeft(45 * 60);
                setRulesAccepted(false);
                setCurrentMcqIndex(0);
                setCodeRunOutput({ status: "idle", passed: 0, total: 3, executionTimeMs: 0, memoryMb: 0, logs: "" });
              }}
              className="gap-1.5 text-xs font-medium"
            >
              <RotateCcw className="size-3.5" /> Đặt lại mẫu
            </Button>
          </div>
        </div>

        {/* STAGE SELECTOR TABS */}
        <div className="border-t border-[var(--color-border-default)]/60 bg-[var(--color-surface-container-low)] px-4 sm:px-6">
          <nav
            aria-label="Các bước làm bài thi"
            className="mx-auto flex max-w-7xl space-x-1 overflow-x-auto py-2 scrollbar-none"
          >
            {stagesMeta.map((s) => {
              const Icon = s.icon;
              const isActive = currentStage === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setCurrentStage(s.id)}
                  className={`flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-left text-xs font-semibold transition-all ${
                    isActive
                      ? "bg-[var(--color-primary)] text-white shadow-sm"
                      : "text-[var(--color-on-surface-variant)] hover:bg-white hover:text-[var(--color-on-surface)]"
                  }`}
                >
                  <Icon className={`size-4 ${isActive ? "text-white" : "text-[var(--color-primary)]"}`} />
                  <div>
                    <span className="block">{s.label}</span>
                    <span className={`text-[10px] font-normal ${isActive ? "text-white/80" : "text-[var(--color-on-surface-variant)]"}`}>
                      {s.desc}
                    </span>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
        {/* ========================================================= */}
        {/* STAGE 1: INVITATION & DEVICE CHECK                        */}
        {/* ========================================================= */}
        {currentStage === "invitation" && (
          <section className="space-y-6" aria-labelledby="invitation-heading">
            {/* Header Card */}
            <div className="overflow-hidden rounded-3xl border border-[var(--color-border-default)] bg-[linear-gradient(135deg,var(--color-primary-subtle),white_65%)] p-6 shadow-sm sm:p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="max-w-3xl space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                      SẴN SÀNG LÀM BÀI
                    </span>
                    <span className="text-xs font-semibold text-[var(--color-primary)]">
                      Doanh nghiệp: SmartHire Enterprise Tech
                    </span>
                  </div>
                  <h2 id="invitation-heading" className="text-2xl font-bold tracking-tight sm:text-3xl">
                    Đề kiểm tra Năng lực Kỹ thuật Chuyên sâu (Full-Stack)
                  </h2>
                  <p className="text-sm leading-6 text-[var(--color-on-surface-variant)]">
                    Chào mừng bạn đến với vòng đánh giá năng lực lập trình và kiến trúc hệ thống cho vị trí <strong>Senior Full-Stack Engineer</strong>. 
                    Bài đánh giá nhằm đo lường khả năng tư duy logic, hiểu biết kiến trúc phân tán và kỹ năng viết code sạch.
                  </p>
                </div>

                {/* Facts badge */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-[var(--color-border-default)] bg-white p-3.5 text-center shadow-xs">
                    <span className="text-xs font-medium text-[var(--color-on-surface-variant)]">Thời lượng</span>
                    <p className="mt-1 text-lg font-bold text-[var(--color-primary)]">45 phút</p>
                  </div>
                  <div className="rounded-2xl border border-[var(--color-border-default)] bg-white p-3.5 text-center shadow-xs">
                    <span className="text-xs font-medium text-[var(--color-on-surface-variant)]">Ngưỡng đạt</span>
                    <p className="mt-1 text-lg font-bold text-emerald-700">70 / 100 điểm</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Structure & Auto-Audio Device Check */}
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Exam parts breakdown */}
              <div className="space-y-4 rounded-2xl border border-[var(--color-border-default)] bg-white p-6 shadow-sm">
                <h3 className="flex items-center gap-2 text-base font-bold text-[var(--color-on-surface)]">
                  <Layers className="size-5 text-[var(--color-primary)]" /> Cấu trúc chi tiết bài thi
                </h3>
                <ul className="space-y-3.5 text-sm">
                  <li className="rounded-xl bg-[var(--color-surface-container-low)] p-3">
                    <strong className="block font-semibold">Phần 1: Trắc nghiệm khách quan</strong>
                    <span className="text-xs text-[var(--color-on-surface-variant)]">5 câu hỏi lý thuyết chuyên sâu (Spring Boot, React 19, DB)</span>
                  </li>
                  <li className="rounded-xl bg-[var(--color-surface-container-low)] p-3">
                    <strong className="block font-semibold">Phần 2: Tự luận Kỹ thuật & Kiến trúc</strong>
                    <span className="text-xs text-[var(--color-on-surface-variant)]">1 câu thiết kế hệ thống Microservices & Idempotency</span>
                  </li>
                  <li className="rounded-xl bg-[var(--color-surface-container-low)] p-3">
                    <strong className="block font-semibold">Phần 3: Thử thách Lập trình (Live Coding)</strong>
                    <span className="text-xs text-[var(--color-on-surface-variant)]">1 bài toán thuật toán với Code Editor & Run Test Cases</span>
                  </li>
                </ul>
              </div>

              {/* Hardware & Auto Audio Proctoring Check */}
              <div className="space-y-4 rounded-2xl border border-[var(--color-border-default)] bg-white p-6 shadow-sm">
                <h3 className="flex items-center gap-2 text-base font-bold text-[var(--color-on-surface)]">
                  <Mic className="size-5 text-[var(--color-primary)]" /> Thiết bị & Hệ thống Thu âm Tự động
                </h3>

                {/* Auto audio notice */}
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs leading-5 text-emerald-950 space-y-2">
                  <div className="flex items-center gap-2 font-bold text-sm text-emerald-900">
                    <span className="flex size-7 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
                      <Mic className="size-4" />
                    </span>
                    <span>Thu âm môi trường tự động</span>
                  </div>
                  <p>
                    Bài đánh giá <strong>không yêu cầu bật camera</strong>. Hệ thống sẽ tự động kích hoạt microphone để ghi âm môi trường nền trong suốt thời gian làm bài, đảm bảo tính minh bạch và công bằng.
                  </p>
                </div>

                {/* Mic level */}
                <div className="space-y-2 rounded-2xl bg-[var(--color-surface-container-low)] p-4 text-xs">
                  <div className="flex items-center justify-between font-medium">
                    <span className="flex items-center gap-1.5 font-bold text-[var(--color-on-surface)]">
                      <Volume2 className="size-4 text-emerald-600" /> Microphone thiết bị
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                      <span className="size-1.5 rounded-full bg-emerald-600 animate-pulse" />
                      Sẵn sàng ({micVolume} dB)
                    </span>
                  </div>
                  <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                      style={{ width: `${micVolume}%` }}
                    />
                  </div>
                  <p className="text-[11px] text-[var(--color-on-surface-variant)]">
                    Microphone đang hoạt động ổn định. Hệ thống sẽ tự động ghi âm khi bạn bấm Bắt đầu.
                  </p>
                </div>

                {/* Browser & Anti-cheat checks */}
                <div className="space-y-2 pt-1 text-xs">
                  <div className="flex items-center justify-between text-[var(--color-on-surface-variant)]">
                    <span className="flex items-center gap-1.5">
                      <Laptop className="size-3.5 text-[var(--color-primary)]" /> Trình duyệt hệ thống:
                    </span>
                    <span className="flex items-center gap-1 font-semibold text-emerald-700">
                      <CheckCircle2 className="size-3.5" /> Chrome / Edge (Tương thích 100%)
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[var(--color-on-surface-variant)]">
                    <span className="flex items-center gap-1.5">
                      <ShieldCheck className="size-3.5 text-[var(--color-primary)]" /> Giám sát chuyển tab:
                    </span>
                    <span className="flex items-center gap-1 font-semibold text-emerald-700">
                      <CheckCircle2 className="size-3.5" /> Tự động cảnh báo khi rời màn hình
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Agreement & CTA */}
            <div className="flex flex-col items-center justify-between gap-4 rounded-2xl border border-[var(--color-primary)]/20 bg-[var(--color-primary-subtle)] p-5 sm:flex-row sm:p-6">
              <label className="flex cursor-pointer items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={rulesAccepted}
                  onChange={(e) => setRulesAccepted(e.target.checked)}
                  className="mt-1 size-4 rounded border-gray-300 text-[var(--color-primary)] focus:ring-[var(--color-primary)]"
                />
                <span className="text-[var(--color-on-surface)]">
                  Tôi cam kết làm bài độc lập và đồng ý để hệ thống tự động ghi âm môi trường làm bài, giám sát chuyển đổi tab trong suốt 45 phút thi.
                </span>
              </label>

              <Button
                size="lg"
                disabled={!rulesAccepted}
                onClick={() => setCurrentStage("mcq")}
                className="w-full shrink-0 gap-2 font-bold sm:w-auto"
              >
                Vào phòng thi ngay <ArrowRight className="size-4" />
              </Button>
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* STAGE 2: MCQ QUIZ ROOM                                    */}
        {/* ========================================================= */}
        {currentStage === "mcq" && (
          <section className="space-y-6" aria-labelledby="mcq-heading">
            {/* Header info */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-border-default)] bg-white p-4 shadow-sm sm:px-6">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)]">
                  PHẦN 1 TRONG 3 · TRẮC NGHIỆM KHÁCH QUAN
                </span>
                <h2 id="mcq-heading" className="text-lg font-bold sm:text-xl">
                  Câu hỏi {currentMcqIndex + 1} / {SAMPLE_MCQ_QUESTIONS.length}
                </h2>
              </div>

              {/* AI Proctor live badge */}
              <div className="flex items-center gap-3">
                <div className="hidden items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-800 sm:flex">
                  <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>AI Proctoring: Đang giám sát · Bình thường</span>
                </div>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCurrentStage("essay")}
                  className="gap-1.5"
                >
                  Chuyển sang Tự luận <ArrowRight className="size-3.5" />
                </Button>
              </div>
            </div>

            {/* Question Navigator */}
            <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-[var(--color-border-default)] bg-white p-3 shadow-xs">
              <span className="mr-2 text-xs font-semibold text-[var(--color-on-surface-variant)]">Danh sách câu:</span>
              {SAMPLE_MCQ_QUESTIONS.map((q, idx) => {
                const isAnswered = !!mcqAnswers[q.id];
                const isCurrent = idx === currentMcqIndex;
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => setCurrentMcqIndex(idx)}
                    className={`flex size-9 items-center justify-center rounded-xl text-xs font-bold transition-all ${
                      isCurrent
                        ? "bg-[var(--color-primary)] text-white shadow-sm ring-2 ring-[var(--color-primary)]/30"
                        : isAnswered
                        ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
                        : "bg-[var(--color-surface-container-low)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-container)]"
                    }`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Current Question Body */}
            {(() => {
              const currentQ = SAMPLE_MCQ_QUESTIONS[currentMcqIndex];
              const selectedOption = mcqAnswers[currentQ.id];

              return (
                <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
                  {/* Left: Question & Options */}
                  <div className="space-y-6 rounded-3xl border border-[var(--color-border-default)] bg-white p-6 shadow-sm sm:p-8">
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--color-border-default)]/60 pb-4">
                      <div className="flex items-center gap-2">
                        <span className="rounded-lg bg-[var(--color-primary-subtle)] px-2.5 py-1 text-xs font-bold text-[var(--color-primary)]">
                          {currentQ.skill}
                        </span>
                        <span className="rounded-lg bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">
                          {currentQ.difficulty}
                        </span>
                      </div>
                      <span className="text-xs font-semibold text-[var(--color-on-surface-variant)]">
                        Giá trị: <strong>{currentQ.points} điểm</strong>
                      </span>
                    </div>

                    <h3 className="text-base font-semibold leading-7 text-[var(--color-on-surface)] sm:text-lg">
                      {currentQ.question}
                    </h3>

                    {/* Radio Options */}
                    <div className="space-y-3" role="radiogroup" aria-label="Các phương án trả lời">
                      {currentQ.options.map((opt) => {
                        const isSelected = selectedOption === opt.id;
                        return (
                          <div
                            key={opt.id}
                            onClick={() =>
                              setMcqAnswers({
                                ...mcqAnswers,
                                [currentQ.id]: opt.id,
                              })
                            }
                            className={`group flex cursor-pointer items-start gap-4 rounded-2xl border p-4.5 transition-all ${
                              isSelected
                                ? "border-[var(--color-primary)] bg-[var(--color-primary-subtle)]/60 shadow-xs ring-1 ring-[var(--color-primary)]"
                                : "border-[var(--color-border-default)] bg-white hover:border-slate-400 hover:bg-slate-50/60"
                            }`}
                          >
                            <span
                              className={`flex size-7 shrink-0 items-center justify-center rounded-xl text-xs font-bold transition-colors ${
                                isSelected
                                  ? "bg-[var(--color-primary)] text-white"
                                  : "bg-[var(--color-surface-container)] text-[var(--color-on-surface-variant)] group-hover:bg-slate-200"
                              }`}
                            >
                              {opt.label}
                            </span>
                            <span className="text-sm leading-6 text-[var(--color-on-surface)]">
                              {opt.text}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Stepper Buttons */}
                    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border-default)]/60 pt-4">
                      <Button
                        variant="secondary"
                        disabled={currentMcqIndex === 0}
                        onClick={() => setCurrentMcqIndex((prev) => Math.max(0, prev - 1))}
                        className="gap-2"
                      >
                        <ArrowLeft className="size-4" /> Câu trước
                      </Button>

                      {currentMcqIndex < SAMPLE_MCQ_QUESTIONS.length - 1 ? (
                        <Button
                          onClick={() => setCurrentMcqIndex((prev) => Math.min(SAMPLE_MCQ_QUESTIONS.length - 1, prev + 1))}
                          className="gap-2"
                        >
                          Câu tiếp theo <ArrowRight className="size-4" />
                        </Button>
                      ) : (
                        <Button
                          onClick={() => setCurrentStage("essay")}
                          className="gap-2 bg-emerald-600 hover:bg-emerald-700"
                        >
                          Hoàn tất Trắc nghiệm & Sang Tự luận <ArrowRight className="size-4" />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Right: Audio Proctor Monitor & Summary */}
                  <div className="space-y-4">
                    <div className="overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-slate-950 p-4 text-white shadow-sm">
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                          <span className="size-2 rounded-full bg-emerald-400 animate-ping" />
                          Thu âm tự động
                        </span>
                        <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-300">
                          Mic: Đang chạy
                        </span>
                      </div>
                      <div className="py-3 text-center">
                        <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-slate-900 text-emerald-400 shadow-inner ring-1 ring-emerald-500/30">
                          <Mic className="size-6 animate-pulse" />
                        </div>
                        <div className="mt-2.5 flex items-center justify-center gap-1">
                          {[30, 60, 25, 80, 50, 40, 70, 45, 55, 30].map((h, i) => (
                            <span
                              key={i}
                              className="w-1 rounded-full bg-emerald-400/80 transition-all duration-300"
                              style={{ height: `${h * 0.22}px` }}
                            />
                          ))}
                        </div>
                        <p className="mt-2 text-[11px] text-slate-400">
                          Ghi âm môi trường nền liên tục
                        </p>
                      </div>
                    </div>

                    <div className="rounded-2xl border border-[var(--color-border-default)] bg-white p-4 text-xs shadow-xs space-y-2.5">
                      <strong className="block font-semibold text-[var(--color-on-surface)]">
                        Tiến độ Trắc nghiệm
                      </strong>
                      <div className="flex justify-between text-[var(--color-on-surface-variant)]">
                        <span>Đã trả lời:</span>
                        <strong className="text-emerald-700">
                          {Object.keys(mcqAnswers).length} / {SAMPLE_MCQ_QUESTIONS.length} câu
                        </strong>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full bg-emerald-500 transition-all"
                          style={{
                            width: `${(Object.keys(mcqAnswers).length / SAMPLE_MCQ_QUESTIONS.length) * 100}%`,
                          }}
                        />
                      </div>
                      <p className="text-[11px] text-[var(--color-on-surface-variant)] leading-4">
                        Câu trả lời được tự động lưu ngay khi bạn chọn phương án.
                      </p>
                    </div>
                  </div>
                </div>
              );
            })()}
          </section>
        )}

        {/* ========================================================= */}
        {/* STAGE 3: TECHNICAL ESSAY WORKSPACE                        */}
        {/* ========================================================= */}
        {currentStage === "essay" && (
          <section className="space-y-6" aria-labelledby="essay-heading">
            {/* Header info */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-border-default)] bg-white p-4 shadow-sm sm:px-6">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)]">
                  PHẦN 2 TRONG 3 · TỰ LUẬN KỸ THUẬT & KIẾN TRÚC
                </span>
                <h2 id="essay-heading" className="text-lg font-bold sm:text-xl">
                  Thiết kế Kiến trúc Hệ thống Tuyển dụng Chịu tải cao
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCurrentStage("mcq")}
                >
                  Xem lại Trắc nghiệm
                </Button>
                <Button
                  size="sm"
                  onClick={() => setCurrentStage("coding")}
                  className="gap-1.5"
                >
                  Chuyển sang Coding Studio <ArrowRight className="size-3.5" />
                </Button>
              </div>
            </div>

            <div className="mx-auto max-w-5xl">
              {/* Prompt & Rich Editor */}
              <div className="space-y-5 rounded-3xl border border-[var(--color-border-default)] bg-white p-6 shadow-sm sm:p-8">
                {/* Question Prompt */}
                <div className="space-y-3 rounded-2xl bg-[var(--color-surface-container-low)] p-5 text-sm leading-6">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-[var(--color-primary)]">ĐỀ BÀI TỰ LUẬN KỸ THUẬT</span>
                    <span className="text-xs text-[var(--color-on-surface-variant)]">Thời gian khuyến nghị: 15 phút</span>
                  </div>
                  <p className="font-medium text-[var(--color-on-surface)]">
                    Hãy thiết kế giải pháp kiến trúc để xử lý hàng đợi thông báo tuyển dụng realtime chịu tải 100,000 req/s. Giải thích lựa chọn giữa Redis Streams và RabbitMQ, phương án xử lý Idempotency (chống trùng lặp gửi thông báo) và chiến lược Dead-Letter Queue khi dịch vụ email bên thứ ba gặp sự cố.
                  </p>
                </div>

                {/* Workspace Textarea */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-[var(--color-on-surface-variant)]">
                    <span className="font-semibold text-[var(--color-on-surface)]">
                      Bài làm của bạn (Markdown hỗ trợ):
                    </span>
                    <span className="flex items-center gap-1.5 text-emerald-700">
                      <Check className="size-3.5" /> Đã tự động lưu 30 giây trước
                    </span>
                  </div>

                  <textarea
                    rows={15}
                    value={essayAnswer}
                    onChange={(e) => setEssayAnswer(e.target.value)}
                    className="w-full rounded-2xl border border-[var(--color-border-default)] p-4 font-mono text-sm leading-6 text-[var(--color-on-surface)] focus:border-[var(--color-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-primary)]"
                    placeholder="Nhập phần giải trình giải pháp kiến trúc của bạn tại đây..."
                  />

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--color-on-surface-variant)]">
                    <span>
                      Số từ: <strong>{essayAnswer.trim().split(/\s+/).filter(Boolean).length} từ</strong> (Yêu cầu tối thiểu: 150 từ)
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setEssayAnswer(
                          `1. Kiến trúc Tổng thể:\n- Sử dụng RabbitMQ với Topic Exchange để phân luồng thông báo (SMS, Email, Push Notification).\n- Redis Cluster lưu trạng thái Idempotency Key.\n\n2. Xử lý Idempotency:\n- Key: "idempotency:" + tenant_id + ":" + event_id (TTL 24 giờ).\n- Atomic command: SET NX.\n\n3. Dead-Letter Queue:\n- Exponential Backoff retry tối đa 3 lần.\n- Message lỗi đẩy về dlq_notifications để phân tích và gửi lại sau.`
                        )
                      }
                      className="text-xs text-[var(--color-primary)]"
                    >
                      Điền mẫu giải pháp ngắn
                    </Button>
                  </div>
                </div>

                {/* Navigation CTA */}
                <div className="flex justify-between border-t border-[var(--color-border-default)]/60 pt-4">
                  <Button variant="secondary" onClick={() => setCurrentStage("mcq")}>
                    <ArrowLeft className="size-4" /> Quay lại Trắc nghiệm
                  </Button>
                  <Button onClick={() => setCurrentStage("coding")} className="gap-2">
                    Xác nhận & Chuyển sang phần Lập trình <ArrowRight className="size-4" />
                  </Button>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* STAGE 4: CANDIDATE CODING STUDIO                          */}
        {/* ========================================================= */}
        {currentStage === "coding" && (
          <section className="space-y-4" aria-labelledby="coding-heading">
            {/* Header info */}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-border-default)] bg-white p-4 shadow-sm sm:px-6">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--color-primary)]">
                  PHẦN 3 TRONG 3 · THỬ THÁCH LẬP TRÌNH (CODING STUDIO)
                </span>
                <h2 id="coding-heading" className="text-lg font-bold sm:text-xl">
                  Bài toán: Tối ưu Phân bổ Lịch phỏng vấn (Merge Overlapping Intervals)
                </h2>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setCurrentStage("essay")}
                >
                  Xem lại Tự luận
                </Button>
                <Button
                  size="sm"
                  onClick={() => setCurrentStage("result")}
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 font-bold"
                >
                  <Send className="size-3.5" /> Nộp bài thi
                </Button>
              </div>
            </div>

            {/* Split Screen Studio (HackerRank / LeetCode style) */}
            <div className="grid min-h-[620px] gap-4 lg:grid-cols-2">
              {/* Left Panel: Problem Statement */}
              <div className="flex flex-col overflow-hidden rounded-2xl border border-[var(--color-border-default)] bg-white shadow-sm">
                <div className="border-b border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] px-5 py-3.5 font-bold text-sm text-[var(--color-on-surface)]">
                  Mô tả Đề bài & Ràng buộc (Problem Statement)
                </div>

                <div className="flex-1 space-y-4 overflow-y-auto p-5 text-sm leading-6 text-[var(--color-on-surface)]">
                  <div>
                    <h3 className="font-bold text-base text-[var(--color-on-surface)]">Mô tả bài toán</h3>
                    <p className="mt-1 text-sm text-[var(--color-on-surface-variant)]">
                      Hệ thống tuyển dụng SmartHire AI cần tự động gộp các khoảng thời gian bận phỏng vấn của Hội đồng giám khảo để tìm ra lịch trống cho ứng viên tiếp theo.
                      Cho một mảng các khoảng thời gian <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-rose-600 font-mono">intervals</code>, trong đó mỗi phần tử là <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-rose-600 font-mono">[start, end]</code>. Hãy viết hàm gộp tất cả các khoảng thời gian bị giao thoa (overlapping) và trả về mảng các khoảng thời gian không chồng lấn.
                    </p>
                  </div>

                  {/* Resource constraints */}
                  <div className="flex flex-wrap gap-3 rounded-xl bg-[var(--color-surface-container-low)] p-3 text-xs">
                    <span className="flex items-center gap-1.5 font-semibold text-[var(--color-on-surface)]">
                      <Clock className="size-3.5 text-[var(--color-primary)]" /> Giới hạn thời gian: 1000 ms
                    </span>
                    <span className="flex items-center gap-1.5 font-semibold text-[var(--color-on-surface)]">
                      <Cpu className="size-3.5 text-[var(--color-primary)]" /> Giới hạn bộ nhớ: 256 MB
                    </span>
                    <span className="font-semibold text-emerald-700">Điểm tối đa: 50 điểm</span>
                  </div>

                  {/* Examples */}
                  <div className="space-y-3">
                    <div className="rounded-xl border border-[var(--color-border-default)] bg-slate-50 p-3.5 font-mono text-xs">
                      <strong className="block text-slate-800 font-sans mb-1">Ví dụ 1:</strong>
                      <p><strong>Input:</strong> intervals = [[9, 10], [9.5, 11], [13, 15], [14.5, 16]]</p>
                      <p><strong>Output:</strong> [[9, 11], [13, 16]]</p>
                      <p className="text-slate-500 font-sans mt-1">Giải thích: Ca [9, 10] và [9.5, 11] chồng lấn nhau nên được gộp thành [9, 11].</p>
                    </div>

                    <div className="rounded-xl border border-[var(--color-border-default)] bg-slate-50 p-3.5 font-mono text-xs">
                      <strong className="block text-slate-800 font-sans mb-1">Ví dụ 2:</strong>
                      <p><strong>Input:</strong> intervals = [[8, 9], [10, 12]]</p>
                      <p><strong>Output:</strong> [[8, 9], [10, 12]]</p>
                      <p className="text-slate-500 font-sans mt-1">Giải thích: Hai ca hoàn toàn tách biệt nên giữ nguyên.</p>
                    </div>
                  </div>

                  {/* Constraints */}
                  <div>
                    <h4 className="font-bold text-xs uppercase tracking-wider text-[var(--color-on-surface-variant)]">Ràng buộc (Constraints)</h4>
                    <ul className="mt-1 list-disc pl-5 text-xs text-[var(--color-on-surface-variant)] space-y-1 font-mono">
                      <li>1 ≤ intervals.length ≤ 10,000</li>
                      <li>intervals[i].length == 2</li>
                      <li>0 ≤ start &lt; end ≤ 24</li>
                    </ul>
                  </div>
                </div>
              </div>

              {/* Right Panel: Code Editor & Console Runner */}
              <div className="flex flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 text-white shadow-sm">
                {/* Editor Top Bar */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 bg-slate-900 px-4 py-2.5">
                  <div className="flex items-center gap-3">
                    <FileCode className="size-4 text-[var(--color-primary-fixed-dim)]" />
                    <select
                      value={selectedLanguage}
                      onChange={(e) => handleLanguageChange(e.target.value)}
                      className="rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-xs font-semibold text-white focus:outline-none"
                    >
                      <option value="javascript">JavaScript (Node.js 20)</option>
                      <option value="python">Python 3.12</option>
                      <option value="java">Java 21 (OpenJDK)</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setCodeSource(SAMPLE_STARTER_CODE[selectedLanguage] ?? "")}
                      className="rounded-md px-2 py-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-white"
                      title="Đặt lại mã nguồn mẫu"
                    >
                      Đặt lại
                    </button>
                    <Button
                      size="sm"
                      onClick={handleRunCode}
                      disabled={codeRunOutput.status === "running"}
                      className="gap-1.5 bg-emerald-600 px-3 py-1 text-xs font-bold text-white hover:bg-emerald-700"
                    >
                      <Play className="size-3" />
                      {codeRunOutput.status === "running" ? "Đang chạy..." : "Chạy thử (Run Code)"}
                    </Button>
                  </div>
                </div>

                {/* Editor Content Area */}
                <div className="relative flex-1 bg-[#1e1e1e]">
                  <MonacoCodeEditor
                    height="360px"
                    language={selectedLanguage}
                    value={codeSource}
                    onChange={(val) => setCodeSource(val)}
                    placeholder="// Viết mã nguồn giải bài toán tại đây..."
                    className="rounded-none border-0"
                  />
                </div>

                {/* Test Cases & Console Output Panel */}
                <div className="border-t border-slate-800 bg-slate-900 p-4">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-300">Console · Kết quả Sandbox</span>
                    {codeRunOutput.status === "success" && (
                      <span className="flex items-center gap-1 font-semibold text-emerald-400">
                        <CheckCircle2 className="size-3.5" /> 3/3 Test cases Passed ({codeRunOutput.executionTimeMs}ms)
                      </span>
                    )}
                  </div>

                  <div className="mt-2.5 rounded-xl bg-slate-950 p-3 font-mono text-xs leading-5">
                    {codeRunOutput.status === "idle" && (
                      <p className="text-slate-500">
                        Nhấn nút <strong>"Chạy thử (Run Code)"</strong> để biên dịch và kiểm tra bài làm của bạn với 3 test cases mẫu.
                      </p>
                    )}
                    {codeRunOutput.status === "running" && (
                      <p className="text-amber-400 animate-pulse">
                        Đang khởi tạo container sandbox & thực thi bài kiểm tra...
                      </p>
                    )}
                    {codeRunOutput.status === "success" && (
                      <pre className="whitespace-pre-wrap text-emerald-400">
                        {codeRunOutput.logs}
                      </pre>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* STAGE 5: RESULT & PERFORMANCE ANALYSIS                    */}
        {/* ========================================================= */}
        {currentStage === "result" && (
          <section className="space-y-6" aria-labelledby="result-heading">
            {/* Congratulation & Status Card */}
            <div className="overflow-hidden rounded-3xl border border-emerald-200 bg-[linear-gradient(135deg,#ecfdf5,white_70%)] p-6 shadow-sm sm:p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow-xs">
                      <CheckCircle2 className="size-3.5" /> HOÀN TẤT & ĐẠT YÊU CẦU
                    </span>
                    <span className="text-xs text-[var(--color-on-surface-variant)]">
                      Nộp bài lúc {new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <h2 id="result-heading" className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                    Kết quả Đánh giá Kỹ thuật: 88 / 100 điểm
                  </h2>
                  <p className="max-w-2xl text-sm leading-6 text-[var(--color-on-surface-variant)]">
                    Chúc mừng bạn đã hoàn thành xuất sắc bài đánh giá năng lực! Điểm số của bạn đã vượt qua ngưỡng yêu cầu tuyển dụng (70/100). Báo cáo năng lực chi tiết đã được gửi tới Đội ngũ Tuyển dụng.
                  </p>
                </div>

                {/* Score summary badge */}
                <div className="flex items-center gap-4 rounded-2xl border border-emerald-200 bg-white p-5 shadow-sm">
                  <div className="grid size-16 place-items-center rounded-2xl bg-emerald-600 font-bold text-2xl text-white shadow-md">
                    88%
                  </div>
                  <div>
                    <span className="text-xs font-semibold uppercase text-emerald-800">Xếp hạng năng lực</span>
                    <p className="text-lg font-bold text-slate-900">Top 5% Ứng viên</p>
                    <span className="text-xs text-slate-500">Ngưỡng đạt: 70 điểm</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Section Breakdown Grid */}
            <div className="grid gap-6 md:grid-cols-3">
              {/* Part 1 */}
              <div className="space-y-3 rounded-2xl border border-[var(--color-border-default)] bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--color-primary)]">PHẦN 1: TRẮC NGHIỆM</span>
                  <span className="rounded-lg bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                    20 / 20 điểm
                  </span>
                </div>
                <h3 className="font-bold text-base text-[var(--color-on-surface)]">Kiến thức Nền tảng</h3>
                <p className="text-xs text-[var(--color-on-surface-variant)] leading-5">
                  Đúng 5/5 câu hỏi lý thuyết chuyên sâu về Spring Boot 3, React 19 hooks, Clustered Index và RabbitMQ Multi-tenancy.
                </p>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full bg-emerald-500" style={{ width: "100%" }} />
                </div>
              </div>

              {/* Part 2 */}
              <div className="space-y-3 rounded-2xl border border-[var(--color-border-default)] bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--color-primary)]">PHẦN 2: TỰ LUẬN</span>
                  <span className="rounded-lg bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                    26 / 30 điểm
                  </span>
                </div>
                <h3 className="font-bold text-base text-[var(--color-on-surface)]">Thiết kế Kiến trúc</h3>
                <p className="text-xs text-[var(--color-on-surface-variant)] leading-5">
                  AI & Hội đồng chuyên môn đánh giá cao giải pháp Idempotency với Redis SET NX và chiến lược Dead-letter Queue chịu tải.
                </p>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full bg-emerald-500" style={{ width: "86.6%" }} />
                </div>
              </div>

              {/* Part 3 */}
              <div className="space-y-3 rounded-2xl border border-[var(--color-border-default)] bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--color-primary)]">PHẦN 3: LẬP TRÌNH</span>
                  <span className="rounded-lg bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800">
                    42 / 50 điểm
                  </span>
                </div>
                <h3 className="font-bold text-base text-[var(--color-on-surface)]">Thuật toán & Clean Code</h3>
                <p className="text-xs text-[var(--color-on-surface-variant)] leading-5">
                  Vượt qua 10/10 test cases (gồm 3 sample tests và 7 hidden tests). Độ phức tạp thời gian tối ưu O(N log N).
                </p>
                <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full bg-emerald-500" style={{ width: "84%" }} />
                </div>
              </div>
            </div>

            {/* Actions CTA */}
            <div className="flex flex-wrap items-center justify-between gap-4 border-t border-[var(--color-border-default)]/60 pt-4">
              <Button
                variant="secondary"
                onClick={() => {
                  setCurrentStage("invitation");
                  setSecondsLeft(45 * 60);
                  setRulesAccepted(false);
                }}
                className="gap-2"
              >
                <RotateCcw className="size-4" /> Làm lại bài thi mẫu
              </Button>

              <Link to="/assessments">
                <Button className="gap-2 font-bold">
                  Quay lại Danh sách Bài đánh giá <ArrowRight className="size-4" />
                </Button>
              </Link>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
