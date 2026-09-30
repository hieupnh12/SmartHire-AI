import { useState } from "react";
import { Link } from "react-router-dom";
import { MapPin, Video } from "lucide-react";
import { PrototypeBanner } from "@/components/ux/PrototypeBanner";
import { StatusPill } from "@/components/ux/StatusPill";
import { button, muted, panel, primary } from "@/features/tenant/recruiter/matching/components/rankingUi";
import {
  interviewModeLabel,
  interviewStatusLabel,
  mockCandidateInterviews,
  type MockCandidateInterview,
} from "@/features/tenant/candidate/schedules/constants/mockInterviews";

export function SchedulesPage() {
  const [rows, setRows] = useState<MockCandidateInterview[]>(mockCandidateInterviews);
  const [toast, setToast] = useState<string | null>(null);

  const flash = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2500);
  };

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header>
        <h1 className="text-3xl font-semibold tracking-tight">Lịch phỏng vấn</h1>
        <p className={`mt-2 max-w-2xl ${muted}`}>
          Xem và xác nhận lịch interview chính thức (online/offline). Link meeting do recruiter cung cấp.
        </p>
      </header>

      <PrototypeBanner note="xác nhận / đổi lịch chỉ cập nhật mock local" />
      {toast && (
        <p className="rounded-xl bg-[var(--color-primary-subtle)] px-4 py-2 text-sm text-[var(--color-primary-hover)]" role="status">
          {toast}
        </p>
      )}

      <div className={`${panel} space-y-4`}>
        {rows.length === 0 && <p className={muted}>Chưa có lịch phỏng vấn.</p>}
        <ul className="space-y-4">
          {rows.map((row) => (
            <li key={row.id} className="rounded-2xl border border-[var(--color-border-default)] p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold">{row.jobTitle}</p>
                  <p className={muted}>
                    {new Date(row.startsAt).toLocaleString("vi-VN")} · {row.durationMinutes} phút
                  </p>
                  <p className={muted}>Interviewer: {row.interviewerName}</p>
                  <p className={`mt-2 flex items-start gap-1.5 text-sm`}>
                    {row.mode === "ONLINE" ? (
                      <Video className="mt-0.5 size-4 shrink-0 text-[var(--color-primary)]" aria-hidden="true" />
                    ) : (
                      <MapPin className="mt-0.5 size-4 shrink-0 text-[var(--color-primary)]" aria-hidden="true" />
                    )}
                    <span>
                      {interviewModeLabel[row.mode]} —{" "}
                      {row.mode === "ONLINE" ? (
                        <a className="font-medium text-[var(--color-primary)] underline" href={row.locationOrLink} target="_blank" rel="noreferrer">
                          Mở link meeting
                        </a>
                      ) : (
                        row.locationOrLink
                      )}
                    </span>
                  </p>
                  {row.note && <p className={`mt-1 ${muted}`}>{row.note}</p>}
                </div>
                <StatusPill status={row.status} label={interviewStatusLabel[row.status]} />
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {row.status === "PENDING" && (
                  <button
                    type="button"
                    className={primary}
                    onClick={() => {
                      setRows((prev) =>
                        prev.map((item) => (item.id === row.id ? { ...item, status: "CONFIRMED" } : item)),
                      );
                      flash("Đã xác nhận lịch (mock).");
                    }}
                  >
                    Xác nhận tham dự
                  </button>
                )}
                {row.status !== "CANCELLED" && row.status !== "DONE" && (
                  <button
                    type="button"
                    className={button}
                    onClick={() => flash("Yêu cầu đổi lịch đã ghi nhận (mock). Recruiter sẽ phản hồi.")}
                  >
                    Đề nghị đổi giờ
                  </button>
                )}
                <Link className={button} to={`/candidate/applications/${row.applicationId}`}>
                  Chi tiết đơn
                </Link>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
