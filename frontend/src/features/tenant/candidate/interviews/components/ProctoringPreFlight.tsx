import { useState } from "react";
import {
  AlertTriangle,
  Camera,
  CheckCircle2,
  Copy,
  ExternalLink,
  HandMetal,
  LockKeyhole,
  QrCode,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  UserCheck,
} from "lucide-react";
import { Button } from "@/components/ux/Button";
import { toast } from "@/stores/toastStore";
import type { CandidateInterview } from "../api/candidateInterviewApi";
import { candidateInterviewApi } from "../api/candidateInterviewApi";
import { ProctoringStart, type ProctorSession } from "./ProctoredInterviewSession";

type Props = {
  data: CandidateInterview;
  busy: boolean;
  onReady: (session: ProctorSession) => void | Promise<void>;
};

export function ProctoringPreFlight({ data, busy, onReady }: Props) {
  const [pledgeAccepted, setPledgeAccepted] = useState(false);
  const [phoneReady, setPhoneReady] = useState(false);
  const [signalingReady, setSignalingReady] = useState(false);

  const meetUrl = data.proctorMeetUrl || `https://meet.jit.si/smarthire-proctor-${data.id}#config.prejoinPageEnabled=false&config.disableDeepLinking=true`;
  const isApproved = !!data.proctorApproved;

  const copyMeetUrl = async () => {
    try {
      await navigator.clipboard.writeText(meetUrl);
      toast.success("Đã sao chép đường dẫn phòng giám sát trực tuyến!");
    } catch {
      toast.error("Không thể sao chép đường dẫn.");
    }
  };

  const handlePhoneReady = async () => {
    setSignalingReady(true);
    try {
      await candidateInterviewApi.signalProctorReady(data.id);
      setPhoneReady(true);
      toast.success("Đã gửi thông báo sẵn sàng tới Giám sát viên!");
    } catch {
      setPhoneReady(true);
    } finally {
      setSignalingReady(false);
    }
  };

  // QR Code URL using lightweight QR image service with fallback
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
    meetUrl
  )}&margin=8`;

  return (
    <div className="space-y-6">
      {/* 1. Màn hình Nội quy phỏng vấn bảo mật (Security Rules & Code of Conduct) */}
      <section className="rounded-2xl border border-[var(--color-border-default)] bg-white p-6 shadow-sm">
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <span className="grid size-10 place-items-center rounded-xl bg-rose-50 text-rose-600 border border-rose-200">
            <ShieldAlert className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Quy chế Giám sát Phỏng vấn AI &amp; Chống gian lận
            </h2>
            <p className="text-xs text-slate-500">
              Bắt buộc tuân thủ 100% các điều khoản bảo mật chuẩn Enterprise trước khi vào phòng thi.
            </p>
          </div>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="flex gap-3 rounded-xl border border-rose-100 bg-rose-50/50 p-3.5">
            <HandMetal className="size-5 shrink-0 text-rose-600 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-xs font-bold text-rose-900 uppercase tracking-wide">
                1. Khóa hoàn toàn thao tác thiết bị (Zero-Touch)
              </p>
              <p className="mt-1 text-xs text-rose-800 leading-relaxed">
                Ngay khi vào phỏng vấn, hệ thống sẽ <strong>vô hiệu hóa bàn phím và chuột</strong>. Ứng viên chỉ ngồi nói tự nhiên. Mọi hành vi chạm vào phím hoặc di chuột sẽ bị hệ thống phát hiện và cảnh báo vi phạm.
              </p>
            </div>
          </div>

          <div className="flex gap-3 rounded-xl border border-blue-100 bg-blue-50/50 p-3.5">
            <Smartphone className="size-5 shrink-0 text-blue-600 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-xs font-bold text-blue-900 uppercase tracking-wide">
                2. Giám sát thiết bị thứ hai (Điện thoại)
              </p>
              <p className="mt-1 text-xs text-blue-800 leading-relaxed">
                Ứng viên bắt buộc quét mã QR trên điện thoại để vào phòng họp giám sát trực tuyến (Jitsi Meet - mở ngay trên web không cần cài app hay đăng nhập), đặt camera nghiêng 45° quay rõ: <strong>màn hình máy tính, hai bàn tay và tư thế ngồi</strong>.
              </p>
            </div>
          </div>

          <div className="flex gap-3 rounded-xl border border-amber-100 bg-amber-50/50 p-3.5">
            <UserCheck className="size-5 shrink-0 text-amber-600 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-xs font-bold text-amber-900 uppercase tracking-wide">
                3. Giám sát viên người thật (HR/Admin)
              </p>
              <p className="mt-1 text-xs text-amber-800 leading-relaxed">
                Có Giám sát viên người thật theo dõi trực tiếp trong phòng họp. Phỏng vấn <strong>chỉ được bắt đầu khi Giám sát viên kiểm tra góc quay và bấm xác nhận &ldquo;OK&rdquo;</strong>.
              </p>
            </div>
          </div>

          <div className="flex gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
            <AlertTriangle className="size-5 shrink-0 text-slate-700 mt-0.5" aria-hidden="true" />
            <div>
              <p className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                4. Dừng phiên khẩn cấp nếu gian lận
              </p>
              <p className="mt-1 text-xs text-slate-700 leading-relaxed">
                Giám sát viên có quyền dừng phiên ngay lập tức nếu phát hiện có người nhắc bài bên ngoài hoặc ứng viên chạm vào máy. Nếu ứng viên cố tình thoát màn hình, hệ thống sẽ dừng phiên và ghi nhận kết quả tại chỗ.
              </p>
            </div>
          </div>
        </div>

        {/* Cam kết quy chế */}
        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 text-xs text-slate-700 hover:bg-slate-100 transition-colors">
          <input
            type="checkbox"
            className="mt-0.5 size-4 accent-[var(--color-primary)] rounded"
            checked={pledgeAccepted}
            onChange={(e) => setPledgeAccepted(e.target.checked)}
          />
          <span className="leading-relaxed font-medium">
            Tôi đã đọc kỹ, hiểu rõ và cam kết tuân thủ đầy đủ các nội quy bảo mật trên. Tôi đồng ý để Giám sát viên theo dõi qua điện thoại và tuân thủ chế độ khóa thiết bị (Zero-Touch).
          </span>
        </label>
      </section>

      {/* 2. Thiết lập thiết bị thứ hai (Secondary Device Setup) */}
      <section
        className={`rounded-2xl border transition-all duration-200 p-6 ${
          pledgeAccepted
            ? "border-[var(--color-border-default)] bg-white shadow-sm"
            : "border-slate-200 bg-slate-50/60 opacity-60 pointer-events-none"
        }`}
      >
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <span className="grid size-10 place-items-center rounded-xl bg-blue-50 text-[#0066FF] border border-blue-200">
            <Smartphone className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Bước 1: Kết nối Camera Điện thoại &amp; Đặt góc quay
            </h3>
            <p className="text-xs text-slate-500">
              Quét mã QR bằng điện thoại di động để mở camera phòng giám sát trực tiếp trên trình duyệt điện thoại (Jitsi Meet - không cần cài app).
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-6 md:grid-cols-[220px_1fr]">
          {/* QR Code Container */}
          <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
            <img
              src={qrCodeUrl}
              alt="Mã QR mở Google Meet giám sát trên điện thoại"
              className="size-44 rounded-xl border border-white bg-white p-2 shadow-xs"
              loading="lazy"
            />
            <span className="mt-2.5 inline-flex items-center gap-1.5 text-[11px] font-semibold text-slate-600">
              <QrCode className="size-3.5 text-[#0066FF]" />
              Quét bằng camera điện thoại
            </span>
          </div>

          {/* Hướng dẫn góc quay và nút thao tác */}
          <div className="space-y-4">
            <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                <Camera className="size-4 text-[#0066FF]" />
                Hướng dẫn đặt góc quay camera điện thoại chuẩn
              </h4>
              <ul className="mt-2 space-y-1.5 text-xs text-blue-800 leading-relaxed">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    Đặt điện thoại nghiêng <strong>góc 45 độ</strong> ở bên cạnh hoặc hơi chếch phía sau bạn.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    Góc quay phải thấy rõ: <strong>toàn bộ màn hình máy tính, tư thế ngồi và hai bàn tay</strong> đặt trên bàn.
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>
                    Giữ điện thoại cố định trên giá đỡ hoặc tựa chắc chắn, đảm bảo cắm sạc hoặc đủ pin.
                  </span>
                </li>
              </ul>
            </div>

            {/* Link Google Meet trực tiếp & Copy */}
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={meetUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-100 px-3.5 text-xs font-semibold text-slate-800 hover:bg-slate-200 transition-colors"
              >
                <ExternalLink className="size-3.5 text-slate-600" />
                Mở link phòng giám sát
              </a>
              <button
                type="button"
                onClick={copyMeetUrl}
                className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <Copy className="size-3.5 text-slate-500" />
                Sao chép liên kết
              </button>
            </div>

            {/* Checkbox đã kết nối điện thoại */}
            <div className="pt-2">
              <Button
                variant={phoneReady ? "secondary" : "primary"}
                size="md"
                disabled={!pledgeAccepted || signalingReady || phoneReady}
                onClick={handlePhoneReady}
                className="w-full sm:w-auto"
              >
                <CheckCircle2 className="size-4" />
                {phoneReady
                  ? "✓ Đã báo sẵn sàng camera điện thoại"
                  : signalingReady
                  ? "Đang gửi tín hiệu..."
                  : "Xác nhận đã kết nối điện thoại & đặt góc quay"}
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Cổng phê duyệt của Giám sát viên (HR/Admin Approval Gate) */}
      <section
        className={`rounded-2xl border transition-all duration-200 p-6 ${
          pledgeAccepted
            ? "border-[var(--color-border-default)] bg-white shadow-sm"
            : "border-slate-200 bg-slate-50/60 opacity-60 pointer-events-none"
        }`}
      >
        <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
          <span
            className={`grid size-10 place-items-center rounded-xl border ${
              isApproved
                ? "bg-emerald-50 text-emerald-600 border-emerald-200"
                : "bg-amber-50 text-amber-600 border-amber-200"
            }`}
          >
            {isApproved ? (
              <ShieldCheck className="size-5" aria-hidden="true" />
            ) : (
              <LockKeyhole className="size-5" aria-hidden="true" />
            )}
          </span>
          <div>
            <h3 className="text-base font-bold text-slate-900">
              Bước 2: Chờ Giám sát viên (HR/Admin) phê duyệt góc quay
            </h3>
            <p className="text-xs text-slate-500">
              Giám sát viên người thật sẽ kiểm tra hình ảnh từ điện thoại của bạn trước khi mở quyền phỏng vấn.
            </p>
          </div>
        </div>

        <div className="mt-5 space-y-4">
          {!isApproved ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 space-y-2">
              <div className="flex items-center gap-2 font-semibold text-amber-900 text-sm">
                <span className="relative flex size-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75"></span>
                  <span className="relative inline-flex size-2.5 rounded-full bg-amber-600"></span>
                </span>
                <span>Đang chờ Giám sát viên kiểm tra góc quay và bấm &ldquo;OK&rdquo;</span>
              </div>
              <p className="text-xs text-amber-800 leading-relaxed">
                Giám sát viên đang tham gia phòng họp Google Meet để đối chiếu vị trí camera điện thoại của bạn. Vui lòng giữ nguyên tư thế ngồi, nút bắt đầu phỏng vấn sẽ <strong>tự động mở khóa ngay khi Giám sát viên bấm duyệt</strong>.
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-emerald-900 text-sm">
                <CheckCircle2 className="size-4 text-emerald-600" />
                <span>Góc quay camera đã được Giám sát viên phê duyệt ĐẠT YÊU CẦU!</span>
              </div>
              <p className="text-xs text-emerald-800 leading-relaxed">
                Bạn đã được cấp quyền bắt đầu phiên phỏng vấn. Hệ thống sẽ bật toàn màn hình và kích hoạt chế độ khóa thao tác (Zero-Touch).
              </p>
            </div>
          )}

          {/* Nút bắt đầu chỉ mở khi Giám sát viên đã duyệt */}
          {isApproved ? (
            <ProctoringStart busy={busy} label="Bắt đầu phỏng vấn ngay" onReady={onReady} />
          ) : (
            <div className="flex items-center gap-3 pt-2">
              <Button size="lg" disabled className="opacity-60 cursor-not-allowed">
                <LockKeyhole className="size-4" />
                Chờ Giám sát viên phê duyệt...
              </Button>
              <span className="text-xs text-slate-500">
                (Trang tự động cập nhật khi HR duyệt)
              </span>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

