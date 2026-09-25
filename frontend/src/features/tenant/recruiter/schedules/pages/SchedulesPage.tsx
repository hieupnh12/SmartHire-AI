import { useState } from "react";
import { CalendarPlus, Link2, MapPin, Video } from "lucide-react";
import { PrototypeBanner } from "@/components/ux/PrototypeBanner";
import { StatusPill } from "@/components/ux/StatusPill";
import { button, input, muted, panel, primary } from "@/features/tenant/recruiter/matching/components/rankingUi";
import {
  interviewModeLabel,
  interviewStatusLabel,
  mockInterviews,
  type InterviewMode,
  type MockInterview,
} from "@/features/tenant/recruiter/schedules/constants/mockInterviews";

export function SchedulesPage() {
  const [rows, setRows] = useState<MockInterview[]>(mockInterviews);
  const [applicationId, setApplicationId] = useState("501");
  const [candidateName, setCandidateName] = useState("Nguyễn An");
  const [jobTitle, setJobTitle] = useState("Backend Engineer");
  const [mode, setMode] = useState<InterviewMode>("ONLINE");
  const [startsAt, setStartsAt] = useState("2026-09-25T09:00");
  const [duration, setDuration] = useState(60);
  const [interviewer, setInterviewer] = useState("");
  const [meetingLink, setMeetingLink] = useState("");
  const [location, setLocation] = useState("");
  const [note, setNote] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  const flash = (message: string) => {
    setToast(message);
    window.setTimeout(() => setToast(null), 2500);
  };

  const createInterview = () => {
    if (!applicationId || !startsAt || !interviewer) {
      flash("Cần Application ID, thời gian và người phỏng vấn.");
      return;
    }
    if (mode === "ONLINE" && !meetingLink.trim()) {
      flash("Online: nhập link meeting trước (tự tạo meeting là bước sau).");
      return;
    }
    if (mode === "OFFLINE" && !location.trim()) {
      flash("Offline: nhập địa điểm / phòng họp.");
      return;
    }
    const next: MockInterview = {
      id: Math.max(0, ...rows.map((r) => r.id)) + 1,
      applicationId: Number(applicationId) || 0,
      candidateName,
      jobTitle,
      mode,
      status: "PENDING",
      startsAt: new Date(startsAt).toISOString(),
      durationMinutes: duration,
      interviewerName: interviewer,
      locationOrLink: mode === "ONLINE" ? meetingLink.trim() : location.trim(),
      note,
    };
    setRows((prev) => [next, ...prev]);
    setMeetingLink("");
    setLocation("");
    setNote("");
    flash("Đã tạo lịch (mock). Candidate sẽ thấy để xác nhận.");
  };

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header>
        <p className={muted}>Tuyển dụng / Lịch phỏng vấn</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">Interview chính thức</h1>
        <p className={`mt-2 max-w-2xl ${muted}`}>
          Đặt lịch online/offline, phân công interviewer, gửi thông báo. Online bắt đầu bằng nhập link meeting.
        </p>
      </header>

      <PrototypeBanner note="lịch Interview người–người · AI Interview nằm ở menu AI Interview" />
      {toast && (
        <p className="rounded-xl bg-[var(--color-primary-subtle)] px-4 py-2 text-sm text-[var(--color-primary-hover)]" role="status">
          {toast}
        </p>
      )}

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,26rem)]">
        <div className={`${panel} space-y-4`}>
          <h2 className="text-lg font-semibold">Lịch sắp tới</h2>
          <ul className="space-y-3">
            {rows.map((row) => (
              <li key={row.id} className="rounded-2xl border border-[var(--color-border-default)] p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">
                      {row.candidateName} · {row.jobTitle}
                    </p>
                    <p className={muted}>
                      {new Date(row.startsAt).toLocaleString("vi-VN")} · {row.durationMinutes} phút · {row.interviewerName}
                    </p>
                    <p className={`mt-1 flex items-start gap-1.5 ${muted}`}>
                      {row.mode === "ONLINE" ? (
                        <Video className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                      ) : (
                        <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                      )}
                      <span>
                        {interviewModeLabel[row.mode]}: {row.locationOrLink}
                      </span>
                    </p>
                    {row.note && <p className={`mt-1 ${muted}`}>{row.note}</p>}
                  </div>
                  <StatusPill status={row.status} label={interviewStatusLabel[row.status]} />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={button}
                    onClick={() => {
                      setRows((prev) =>
                        prev.map((item) =>
                          item.id === row.id ? { ...item, status: "CANCELLED" } : item,
                        ),
                      );
                      flash("Đã hủy lịch (mock).");
                    }}
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    className={button}
                    onClick={() => flash("Đổi lịch: mở form chỉnh giờ/link (mock).")}
                  >
                    Đổi lịch
                  </button>
                  <button
                    type="button"
                    className={button}
                    onClick={() => flash("Mở phiếu đánh giá interviewer (mock — làm sau).")}
                  >
                    Phiếu đánh giá
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <aside className={`${panel} space-y-4`}>
          <div className="flex items-center gap-2">
            <CalendarPlus className="size-5 text-[var(--color-primary)]" aria-hidden="true" />
            <h2 className="text-lg font-semibold">Đặt lịch mới</h2>
          </div>
          <label className="block space-y-1 text-sm">
            <span>Application ID</span>
            <input className={input} value={applicationId} onChange={(e) => setApplicationId(e.target.value)} />
          </label>
          <label className="block space-y-1 text-sm">
            <span>Ứng viên</span>
            <input className={input} value={candidateName} onChange={(e) => setCandidateName(e.target.value)} />
          </label>
          <label className="block space-y-1 text-sm">
            <span>Job</span>
            <input className={input} value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
          </label>
          <label className="block space-y-1 text-sm">
            <span>Hình thức</span>
            <select className={input} value={mode} onChange={(e) => setMode(e.target.value as InterviewMode)}>
              <option value="ONLINE">Online</option>
              <option value="OFFLINE">Offline</option>
            </select>
          </label>
          <label className="block space-y-1 text-sm">
            <span>Thời gian bắt đầu</span>
            <input
              className={input}
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>Thời lượng (phút)</span>
            <input
              className={input}
              type="number"
              min={15}
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value) || 0)}
            />
          </label>
          <label className="block space-y-1 text-sm">
            <span>Người phỏng vấn</span>
            <input
              className={input}
              value={interviewer}
              onChange={(e) => setInterviewer(e.target.value)}
              placeholder="Tên / email interviewer"
            />
          </label>
          {mode === "ONLINE" ? (
            <label className="block space-y-1 text-sm">
              <span className="inline-flex items-center gap-1.5">
                <Link2 className="size-4" aria-hidden="true" />
                Link meeting
              </span>
              <input
                className={input}
                value={meetingLink}
                onChange={(e) => setMeetingLink(e.target.value)}
                placeholder="https://meet.google.com/..."
              />
              <span className={muted}>Giai đoạn này nhập tay. Tự tạo Google/Zoom Meet là tích hợp sau.</span>
            </label>
          ) : (
            <label className="block space-y-1 text-sm">
              <span>Địa điểm</span>
              <input
                className={input}
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Văn phòng / phòng họp"
              />
            </label>
          )}
          <label className="block space-y-1 text-sm">
            <span>Ghi chú gửi ứng viên</span>
            <textarea className={input} rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <button type="button" className={primary} onClick={createInterview}>
            Tạo lịch & gửi thông báo
          </button>
        </aside>
      </div>
    </section>
  );
}
