import { useState } from "react";
import { Link } from "react-router-dom";
import { Bot, CalendarPlus, Link2, MapPin, Users, Video } from "lucide-react";
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

/** Recruiter ↔ candidate interview (người–người). AI sessions live under AI Interview. */
export function InterviewsPage() {
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
    flash("Đã tạo lịch Interview người–người (mock). Candidate sẽ thấy để xác nhận.");
  };

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <nav className="flex flex-wrap items-center gap-1 text-xs text-[var(--color-on-surface-variant)]" aria-label="Breadcrumb">
            <span>Tuyển dụng</span>
            <span className="text-[var(--color-outline)]">/</span>
            <span className="font-semibold text-[var(--color-primary)]">Interview</span>
          </nav>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-semibold tracking-tight">Interview người–người</h1>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-outline-variant)] bg-[var(--color-surface-container-low)] px-3.5 py-1 text-sm font-semibold text-[var(--color-on-surface)]">
              <Users className="size-3.5" aria-hidden="true" />
              Recruiter ↔ Candidate
            </span>
          </div>
          <p className={`mt-2 max-w-2xl ${muted}`}>
            Đặt lịch phỏng vấn với interviewer thật (online/offline), phân công người hỏi và gửi thông báo cho ứng viên.
            Khác với <strong className="font-semibold text-[var(--color-on-surface)]">AI Interview</strong> (AI ↔ ứng viên).
          </p>
        </div>
        <Link
          to="/recruiter/ai-interviews"
          className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-full border border-[var(--color-primary)] bg-[var(--color-primary-subtle)] px-4 text-sm font-semibold text-[var(--color-primary-hover)] hover:bg-[var(--color-primary-soft)] md:self-auto"
        >
          <Bot className="size-4" aria-hidden="true" />
          AI Interview
        </Link>
      </header>

      <PrototypeBanner note="Interview người–người · mock data · AI Interview nằm ở menu riêng" />
      {toast && (
        <p className="rounded-xl bg-[var(--color-primary-subtle)] px-4 py-2 text-sm text-[var(--color-primary-hover)]" role="status">
          {toast}
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        <form
          className={`${panel} space-y-3`}
          onSubmit={(e) => {
            e.preventDefault();
            createInterview();
          }}
        >
          <div className="flex items-center gap-2">
            <CalendarPlus className="size-5 text-[var(--color-primary)]" aria-hidden="true" />
            <h2 className="text-base font-semibold">Tạo lịch Interview</h2>
          </div>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Application ID</span>
            <input className={input} value={applicationId} onChange={(e) => setApplicationId(e.target.value)} />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Ứng viên</span>
            <input className={input} value={candidateName} onChange={(e) => setCandidateName(e.target.value)} />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Vị trí</span>
            <input className={input} value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Hình thức</span>
            <select className={input} value={mode} onChange={(e) => setMode(e.target.value as InterviewMode)}>
              <option value="ONLINE">Online</option>
              <option value="OFFLINE">Offline</option>
            </select>
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Thời gian bắt đầu</span>
            <input className={input} type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Thời lượng (phút)</span>
            <input className={input} type="number" min={15} value={duration} onChange={(e) => setDuration(Number(e.target.value) || 60)} />
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Người phỏng vấn</span>
            <input className={input} value={interviewer} onChange={(e) => setInterviewer(e.target.value)} placeholder="Tên interviewer" />
          </label>
          {mode === "ONLINE" ? (
            <label className="block space-y-1 text-sm">
              <span className="inline-flex items-center gap-1 font-medium">
                <Link2 className="size-3.5" aria-hidden="true" /> Link meeting
              </span>
              <input className={input} value={meetingLink} onChange={(e) => setMeetingLink(e.target.value)} placeholder="https://meet.google.com/…" />
            </label>
          ) : (
            <label className="block space-y-1 text-sm">
              <span className="inline-flex items-center gap-1 font-medium">
                <MapPin className="size-3.5" aria-hidden="true" /> Địa điểm
              </span>
              <input className={input} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Phòng họp / địa chỉ" />
            </label>
          )}
          <label className="block space-y-1 text-sm">
            <span className="font-medium">Ghi chú</span>
            <textarea className={`${input} min-h-20`} value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
          <button type="submit" className={primary}>
            Lưu lịch Interview
          </button>
        </form>

        <div className={`${panel} overflow-x-auto`}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">Lịch Interview sắp tới</h2>
            <span className={`${muted} text-xs`}>{rows.length} lịch</span>
          </div>
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className={muted}>
                <th className="py-2">Ứng viên</th>
                <th>Hình thức</th>
                <th>Thời gian</th>
                <th>Interviewer</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-[var(--color-border-default)]">
                  <td className="py-3">
                    <p className="font-semibold">{row.candidateName}</p>
                    <p className={muted}>{row.jobTitle} · App #{row.applicationId}</p>
                  </td>
                  <td>
                    <span className="inline-flex items-center gap-1">
                      {row.mode === "ONLINE" ? <Video className="size-3.5 text-[var(--color-primary)]" aria-hidden="true" /> : <MapPin className="size-3.5" aria-hidden="true" />}
                      {interviewModeLabel[row.mode]}
                    </span>
                    <p className={`mt-0.5 max-w-[12rem] truncate text-xs ${muted}`}>{row.locationOrLink}</p>
                  </td>
                  <td>
                    {new Date(row.startsAt).toLocaleString("vi-VN")}
                    <p className={muted}>{row.durationMinutes} phút</p>
                  </td>
                  <td>{row.interviewerName}</td>
                  <td>
                    <StatusPill status={row.status} label={interviewStatusLabel[row.status]} />
                    {row.status === "PENDING" && (
                      <button
                        type="button"
                        className={`${button} mt-2`}
                        onClick={() =>
                          setRows((prev) =>
                            prev.map((item) => (item.id === row.id ? { ...item, status: "CANCELLED" } : item)),
                          )
                        }
                      >
                        Hủy lịch
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
