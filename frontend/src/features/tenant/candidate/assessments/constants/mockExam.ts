export type MockExamOption = {
  id: string;
  label: string;
  subtitle: string;
  body: string;
};

export type MockExamQuestion = {
  id: number;
  topic: string;
  points: number;
  stem: string;
  hint?: string;
  code?: string;
  language?: string;
  options: MockExamOption[];
  /** Pre-selected for UI demo (null = unanswered). */
  initialAnswer: string | null;
  initiallyBookmarked?: boolean;
};

export const MOCK_EXAM_META = {
  title: "Đánh giá Java Backend — Junior",
  code: "ASM-JAVA-02",
  durationMinutes: 30,
  totalPoints: 100,
  candidateName: "Nguyễn Văn An",
  candidateCode: "CAN-8921",
  pingMs: 24,
  syncCode: "#SYN-8921-OK",
  receiptCode: "REC-8921-JAVA-SUCCESS",
};

const topics = [
  "Java Core & Multithreading",
  "Collections Framework & DSA",
  "Spring Framework & DI",
  "RESTful API & Exception Handling",
] as const;

function simpleOptions(correct: string, a: string, b: string, c: string, d: string): MockExamOption[] {
  return [
    { id: "A", label: "A", subtitle: "Phương án A", body: a },
    { id: "B", label: "B", subtitle: "Phương án B", body: b },
    { id: "C", label: "C", subtitle: "Phương án C", body: c },
    { id: "D", label: "D", subtitle: "Phương án D", body: d },
  ].map((opt) => ({ ...opt, subtitle: opt.id === correct ? "Đáp án tham chiếu (demo)" : opt.subtitle }));
}

/** Question 15 matches Stitch exam-workspace mockup; others fill the 20-slot matrix. */
export const mockExamQuestions: MockExamQuestion[] = [
  ...Array.from({ length: 14 }, (_, i) => {
    const n = i + 1;
      const answered = true;
    return {
      id: n,
      topic: topics[i % topics.length],
      points: 5,
      stem: `Câu ${n}: Khái niệm / tình huống kỹ thuật Java Backend số ${n} trong bộ đề TechTrack v2.1?`,
      hint: "Chọn phương án phù hợp nhất với tiêu chuẩn doanh nghiệp.",
      options: simpleOptions(
        "A",
        `Mô tả đáp án A cho câu ${n}.`,
        `Mô tả đáp án B cho câu ${n}.`,
        `Mô tả đáp án C cho câu ${n}.`,
        `Mô tả đáp án D cho câu ${n}.`,
      ),
      initialAnswer: answered ? "A" : null,
      initiallyBookmarked: n === 4,
    } satisfies MockExamQuestion;
  }),
  {
    id: 15,
    topic: "Java Core & Multithreading",
    points: 5,
    stem: "Trong môi trường đa luồng (Multithreading) của Java, từ khóa volatile khi áp dụng cho một biến (variable) có tác dụng kỹ thuật cốt lõi nào sau đây?",
    hint: "Hãy phân tích chi tiết cơ chế bộ nhớ phần cứng (CPU Caches) và đặc tả Java Memory Model (JMM) trước khi đưa ra quyết định chọn đáp án chính xác nhất.",
    language: "Java 17 LTS",
    code: `public class TaskWorker {
    private volatile boolean isRunning = true; // Visibility guarantee across worker threads

    public void terminate() {
        this.isRunning = false; // Directly flushed to Main Memory
    }

    public void runLoop() {
        while (isRunning) {
            // Processing high-throughput transactions...
        }
    }
}`,
    options: [
      {
        id: "A",
        label: "A",
        subtitle: "Tính minh bạch bộ nhớ (Memory Visibility)",
        body: "Đảm bảo tính hiển thị (Visibility) giữa các luồng: Mọi thao tác ghi vào biến volatile sẽ được ghi trực tiếp vào bộ nhớ chính (Main Memory) và mọi thao tác đọc đều lấy giá trị mới nhất từ Main Memory, ngăn ngừa việc cache giá trị cũ trên CPU Core Register/L1 Cache.",
      },
      {
        id: "B",
        label: "B",
        subtitle: "Nguyên tử hóa phức hợp",
        body: "Cung cấp tính nguyên tử (Atomicity) hoàn chỉnh cho tất cả các toán tử phức hợp (như phép toán count++ gồm read-modify-write), từ đó thay thế hoàn toàn nhu cầu sử dụng khối synchronized hoặc ReentrantLock.",
      },
      {
        id: "C",
        label: "C",
        subtitle: "Cơ chế Khóa đối tượng ngầm định",
        body: "Tự động kích hoạt cơ chế khóa đối tượng sở hữu biến và ngăn không cho các thread khác truy cập đồng thời vào bất kỳ phương thức nào của class chứa biến đó trong suốt thời gian biến đang được chỉnh sửa.",
      },
      {
        id: "D",
        label: "D",
        subtitle: "Không gian cách ly tiểu trình",
        body: "Tự động di chuyển biến vào cấu trúc lưu trữ nội bộ ThreadLocal độc lập cho từng luồng, đảm bảo rằng mỗi thread có một phiên bản sao chép riêng biệt không bị chia sẻ ra ngoài.",
      },
    ],
    initialAnswer: "A",
    initiallyBookmarked: true,
  },
  ...Array.from({ length: 5 }, (_, i) => {
    const n = 16 + i;
    const unanswered = n === 17 || n === 20;
    return {
      id: n,
      topic: topics[n % topics.length],
      points: 5,
      stem: `Câu ${n}: Tình huống Spring Boot / REST / concurrency số ${n}?`,
      hint: "Demo matrix — một số câu chưa trả lời để kiểm thử modal nộp bài.",
      options: simpleOptions(
        "B",
        `Phương án A — câu ${n}.`,
        `Phương án B — câu ${n}.`,
        `Phương án C — câu ${n}.`,
        `Phương án D — câu ${n}.`,
      ),
      initialAnswer: unanswered ? null : "B",
      initiallyBookmarked: false,
    } satisfies MockExamQuestion;
  }),
];

export function buildInitialAnswers(questions: MockExamQuestion[]): Record<number, string | null> {
  return Object.fromEntries(questions.map((q) => [q.id, q.initialAnswer]));
}

export function buildInitialBookmarks(questions: MockExamQuestion[]): number[] {
  return questions.filter((q) => q.initiallyBookmarked).map((q) => q.id);
}

export function formatExamClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
