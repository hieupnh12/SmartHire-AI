import type { LucideIcon } from "lucide-react";
import {
  Bookmark,
  CloudUpload,
  Fullscreen,
  LayoutGrid,
  Laptop,
  ShieldCheck,
  Wifi,
} from "lucide-react";

export type DiagnosticItem = {
  id: string;
  icon: LucideIcon;
  title: string;
  detail: string;
  statusLabel: string;
};

export type MechanicCard = {
  icon: LucideIcon;
  title: string;
  body: string;
  hint: string;
};

export type SampleOption = {
  id: string;
  label: string;
  text: string;
};

export const PREP_ROOM_META = {
  portalTitle: "TechViet Talent Assessment Portal",
  roomCode: "Phòng thi Số #JVA-2024",
  portalSubtitle: "Hệ thống đánh giá năng lực lập trình trực tuyến chuẩn doanh nghiệp",
  shieldLabel: "SmartHire Shield v4.8",
  examTitleShort: "Java Backend — Junior",
  questionCountLabel: "20 câu hỏi trắc nghiệm",
  passingLabel: "Thang điểm 100 (Pass: 70)",
  languageLabel: "Tiếng Việt & Java Code",
  attemptLabel: "01 lần duy nhất",
  supportHotline: "1900-888-291",
  candidateExamId: "#TECH-99120",
};

export const PREP_STEPS = [
  {
    step: 1,
    state: "done" as const,
    badge: "Bước 1 • Đã hoàn thành",
    title: "Tiếp nhận bài thi",
    hint: "Xác thực mã mời & hồ sơ dự tuyển",
  },
  {
    step: 2,
    state: "active" as const,
    badge: "Bước 2 • Đang thực hiện",
    title: "Hướng dẫn & Kiểm tra kỹ thuật",
    hint: "Kiểm định môi trường & cam kết",
  },
  {
    step: 3,
    state: "upcoming" as const,
    badge: "Bước 3 • Chờ bắt đầu",
    title: "Làm bài tập trung 30 phút",
    hint: "20 câu trắc nghiệm chuyên môn Java",
  },
];

export const PREP_DIAGNOSTICS: DiagnosticItem[] = [
  {
    id: "browser",
    icon: Laptop,
    title: "Trình duyệt & Màn hình hiển thị",
    detail: "Google Chrome v129 • Màn hình 1920×1080 (Tỷ lệ tiêu chuẩn 16:9)",
    statusLabel: "Hợp lệ / Sẵn sàng",
  },
  {
    id: "network",
    icon: Wifi,
    title: "Tốc độ & Độ ổn định mạng",
    detail: "Ping: 18ms • Tốc độ tải: 45.2 Mbps • Kết nối máy chủ ổn định",
    statusLabel: "Tốt / Ổn định",
  },
  {
    id: "fullscreen",
    icon: Fullscreen,
    title: "Quyền truy cập toàn màn hình (Fullscreen API)",
    detail: "Đã cấp quyền tự động khóa màn hình không viền khi bắt đầu",
    statusLabel: "Đã cấp quyền",
  },
  {
    id: "shield",
    icon: ShieldCheck,
    title: "Hệ thống Chống gian lận SmartHire Shield",
    detail: "Không phát hiện tiện ích can thiệp DOM hoặc công cụ chụp tự động",
    statusLabel: "Bảo mật Đạt chuẩn",
  },
];

export const PREP_MECHANICS: MechanicCard[] = [
  {
    icon: Bookmark,
    title: "Đánh dấu xem lại",
    body: "Bấm biểu tượng Bookmark ở góc mỗi câu để đánh dấu những câu phân vân, quay lại trước khi nộp bài.",
    hint: "Phím tắt: [B]",
  },
  {
    icon: LayoutGrid,
    title: "Ma trận câu hỏi",
    body: "Bảng lưới 20 ô trực quan bên phải giúp nhảy nhanh tới bất kỳ câu nào hoặc lọc các câu chưa trả lời.",
    hint: "Thanh điều hướng số",
  },
  {
    icon: CloudUpload,
    title: "Tự động đồng bộ",
    body: "Mỗi lựa chọn radio button được lưu đám mây tức thì trong 50ms, chống mất dữ liệu khi sự cố mạng.",
    hint: "Tự động lưu ngầm",
  },
];

export const PREP_HONOR_ITEMS = [
  {
    id: "agree1",
    before: "Tôi cam kết tự mình làm bài thi mà ",
    strong: "không có sự trợ giúp trái phép",
    after: " từ người khác, thiết bị phụ hoặc tài liệu không được phép.",
  },
  {
    id: "agree2",
    before: "Tôi đồng ý tuân thủ chế độ làm bài tập trung ",
    strong: "(hệ thống sẽ tự động ghi nhận và đình chỉ nếu chuyển tab hoặc rời khỏi cửa sổ quá 3 lần)",
    after: ".",
  },
  {
    id: "agree3",
    before: "Tôi hiểu rằng toàn bộ nhật ký thao tác và kết quả đánh giá sẽ được gửi trực tiếp tới ",
    strong: "Hội đồng Tuyển dụng TechViet Enterprise",
    after: ".",
  },
] as const;

export const PREP_SAMPLE_QUESTION = {
  prompt: "Câu hỏi mẫu: Từ khóa nào trong Java ngăn chặn một lớp bị kế thừa?",
  options: [
    { id: "a", label: "A", text: "static" },
    { id: "b", label: "B", text: "final" },
    { id: "c", label: "C", text: "abstract" },
    { id: "d", label: "D", text: "synchronized" },
  ] satisfies SampleOption[],
  correctId: "b",
};
