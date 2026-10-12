import { createPortal } from "react-dom";
import { DetailDialog } from "@/components/ux/DetailDialog";

const heading = "mt-5 text-sm font-semibold text-slate-900 first:mt-0";
const list = "mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-slate-700";

export function CvTipsDialog({ onClose }: { onClose: () => void }) {
  return createPortal(
    <div className="cv-print-hidden">
      <DetailDialog open title="Mẹo viết CV IT" onClose={onClose}>
        <h3 className={heading}>Cấu trúc & bố cục</h3>
        <ul className={list}>
          <li><strong>Độ dài:</strong> sinh viên/Junior ≤ 2 năm kinh nghiệm gói gọn trong 1 trang A4; Senior tối đa 2 trang.</li>
          <li><strong>Mới nhất lên đầu:</strong> luôn xếp kinh nghiệm, dự án gần nhất ở trên cùng.</li>
          <li><strong>Khung chuẩn:</strong> Thông tin cá nhân & link (GitHub, LinkedIn, Portfolio) → Giới thiệu 2–3 câu → Kỹ năng (Tech Stack) → Kinh nghiệm / Dự án → Học vấn & Chứng chỉ.</li>
          <li><strong>Email chuyên nghiệp:</strong> dùng dạng ho.ten@…, tránh kiểu boycool123@gmail.com.</li>
        </ul>
        <h3 className={heading}>Viết mô tả theo công thức XYZ của Google</h3>
        <p className="mt-2 text-sm text-slate-700">Đạt được <strong>[X]</strong> (kết quả đo được), so với <strong>[Y]</strong> (mốc so sánh), bằng cách làm <strong>[Z]</strong> (hành động/công nghệ cụ thể).</p>
        <div className="mt-3 space-y-2 text-sm">
          <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-red-800"><strong>Chưa tốt:</strong> Làm phần Backend cho ứng dụng bán hàng bằng Node.js.</p>
          <p className="rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2 text-emerald-800"><strong>Tốt:</strong> Tối ưu API tìm kiếm bằng Node.js & Redis, giảm thời gian phản hồi từ 500ms xuống 120ms, xử lý ổn định 50.000 lượt truy cập/ngày.</p>
        </div>
        <ul className={list}>
          <li>Mỗi công ty/dự án 3–5 ý, mở đầu bằng động từ mạnh: Xây dựng, Tối ưu, Thiết kế, Triển khai, Tự động hóa.</li>
          <li>Tránh mở đầu bằng "Tham gia", "Làm", "Hỗ trợ" và tránh xưng "tôi".</li>
          <li>Có con số: %, ms, số người dùng, số request, chi phí tiết kiệm…</li>
        </ul>
        <h3 className={heading}>Kỹ năng (Tech Stack)</h3>
        <ul className={list}>
          <li>Ghi rõ theo nhóm, không ghi chung chung "Biết lập trình Web". VD: <em>Frontend: React, TypeScript, TailwindCSS · Backend: Node.js, PostgreSQL · DevOps: Docker, AWS</em>.</li>
          <li>Tránh thanh % hay số sao (Java 80%, React 4/5) vì nhà tuyển dụng không đo được. Dùng mức độ chữ: Thành thạo / Khá / Biết.</li>
        </ul>
      </DetailDialog>
    </div>,
    document.body,
  );
}
