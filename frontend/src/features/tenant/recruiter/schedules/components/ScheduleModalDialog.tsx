import { useEffect, useState } from "react";
import { X, CalendarPlus, Video, MapPin, Link2, Clock, Users, User, Briefcase } from "lucide-react";
import { Button } from "@/components/ux/Button";
import type { InterviewMode, InterviewRound, MockInterview } from "../constants/mockInterviews";

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (interview: MockInterview) => void;
  availableJobs: Array<{ id: number; title: string }>;
  initialDate?: Date;
};

export function ScheduleModalDialog({ open, onClose, onSave, availableJobs, initialDate }: Props) {
  const [candidateName, setCandidateName] = useState("");
  const [candidateEmail, setCandidateEmail] = useState("");
  const [candidatePhone, setCandidatePhone] = useState("");
  const [jobTitle, setJobTitle] = useState(availableJobs[0]?.title || "Senior Java / Spring Boot Engineer");
  const [round, setRound] = useState<InterviewRound>("TECHNICAL");
  const [mode, setMode] = useState<InterviewMode>("ONLINE");
  
  // Format datetime-local string
  const formatForInput = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const defaultDate = initialDate ? new Date(initialDate) : new Date();
  if (defaultDate.getHours() < 9) defaultDate.setHours(9, 30, 0, 0);

  const [startsAt, setStartsAt] = useState(formatForInput(defaultDate));
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [interviewerName, setInterviewerName] = useState("");
  const [meetingUrl, setMeetingUrl] = useState("https://meet.google.com/smarthire-interview-room");
  const [location, setLocation] = useState("Tầng 5, Phòng họp A1 — Trụ sở chính");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateName.trim()) {
      setError("Vui lòng nhập họ tên ứng viên");
      return;
    }
    if (!jobTitle.trim()) {
      setError("Vui lòng chọn hoặc nhập vị trí tuyển dụng");
      return;
    }
    if (!startsAt) {
      setError("Vui lòng chọn thời gian bắt đầu");
      return;
    }
    if (mode === "ONLINE" && !meetingUrl.trim()) {
      setError("Vui lòng nhập link meeting trực tuyến (Google Meet/Zoom/Teams)");
      return;
    }
    if (mode === "OFFLINE" && !location.trim()) {
      setError("Vui lòng nhập địa điểm hoặc phòng họp trực tiếp");
      return;
    }

    const newInterview: MockInterview = {
      id: Date.now(),
      applicationId: Math.floor(Math.random() * 900) + 100,
      candidateName: candidateName.trim(),
      candidateEmail: candidateEmail.trim() || undefined,
      candidatePhone: candidatePhone.trim() || undefined,
      jobTitle: jobTitle.trim(),
      round,
      mode,
      status: "CONFIRMED",
      startsAt: new Date(startsAt).toISOString(),
      durationMinutes: Number(durationMinutes) || 60,
      interviewerName: interviewerName.trim() || "Hội đồng tuyển dụng SmartHire",
      locationOrLink: mode === "ONLINE" ? meetingUrl.trim() : location.trim(),
      note: note.trim() || undefined,
    };

    onSave(newInterview);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="schedule-dialog-title"
      onClick={onClose}
    >
      <div
        className="relative flex max-h-[90vh] w-full max-w-xl flex-col rounded-3xl border border-[var(--color-border-default)] bg-white shadow-2xl animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--color-border-default)] px-6 py-5">
          <div className="flex items-center gap-2.5">
            <span className="grid size-10 place-items-center rounded-2xl bg-[var(--color-primary-soft)] text-brand-primary">
              <CalendarPlus className="size-5" aria-hidden="true" />
            </span>
            <div>
              <h2 id="schedule-dialog-title" className="text-lg font-bold text-[var(--color-on-surface)]">
                Lên lịch phỏng vấn ứng viên
              </h2>
              <p className="text-xs text-[var(--color-on-surface-variant)]">
                Tạo lịch hẹn và tự động cập nhật vào bảng lịch của công ty.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng cửa sổ"
            className="grid size-9 place-items-center rounded-xl text-[var(--color-outline)] transition-colors hover:bg-[var(--color-surface-alt)] hover:text-[var(--color-on-surface)]"
          >
            <X className="size-5" aria-hidden="true" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-medium text-red-700">
              {error}
            </div>
          )}

          {/* Candidate Info */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-outline)]">
              Thông tin ứng viên
            </h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block space-y-1 text-xs font-semibold text-[var(--color-on-surface)]">
                <span>Họ và tên ứng viên *</span>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-outline)]" />
                  <input
                    type="text"
                    required
                    placeholder="VD: Nguyễn Văn An"
                    value={candidateName}
                    onChange={(e) => { setCandidateName(e.target.value); setError(null); }}
                    className="w-full rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-alt)] py-2.5 pl-9 pr-3 text-xs outline-none transition-all focus:border-brand-primary focus:bg-white focus:ring-2 focus:ring-brand-primary/15"
                  />
                </div>
              </label>

              <label className="block space-y-1 text-xs font-semibold text-[var(--color-on-surface)]">
                <span>Email ứng viên</span>
                <input
                  type="email"
                  placeholder="ungvien@example.com"
                  value={candidateEmail}
                  onChange={(e) => setCandidateEmail(e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-alt)] py-2.5 px-3 text-xs outline-none transition-all focus:border-brand-primary focus:bg-white focus:ring-2 focus:ring-brand-primary/15"
                />
              </label>

              <label className="block space-y-1 text-xs font-semibold text-[var(--color-on-surface)]">
                <span>Số điện thoại</span>
                <input
                  type="tel"
                  placeholder="0912 345 678"
                  value={candidatePhone}
                  onChange={(e) => setCandidatePhone(e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-alt)] py-2.5 px-3 text-xs outline-none transition-all focus:border-brand-primary focus:bg-white focus:ring-2 focus:ring-brand-primary/15"
                />
              </label>
            </div>
          </div>

          {/* Job & Round */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-outline)]">
              Vị trí tuyển dụng & Vòng phỏng vấn
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1 text-xs font-semibold text-[var(--color-on-surface)]">
                <span>Vị trí tuyển dụng *</span>
                <div className="relative">
                  <Briefcase className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-outline)]" />
                  <input
                    type="text"
                    required
                    list="available-jobs-list"
                    placeholder="Chọn hoặc nhập vị trí"
                    value={jobTitle}
                    onChange={(e) => { setJobTitle(e.target.value); setError(null); }}
                    className="w-full rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-alt)] py-2.5 pl-9 pr-3 text-xs outline-none transition-all focus:border-brand-primary focus:bg-white focus:ring-2 focus:ring-brand-primary/15"
                  />
                  <datalist id="available-jobs-list">
                    {availableJobs.map((j) => (
                      <option key={j.id} value={j.title} />
                    ))}
                  </datalist>
                </div>
              </label>

              <label className="block space-y-1 text-xs font-semibold text-[var(--color-on-surface)]">
                <span>Vòng phỏng vấn</span>
                <select
                  value={round}
                  onChange={(e) => setRound(e.target.value as InterviewRound)}
                  className="w-full rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-alt)] py-2.5 px-3 text-xs font-medium outline-none transition-all focus:border-brand-primary focus:bg-white focus:ring-2 focus:ring-brand-primary/15"
                >
                  <option value="TECHNICAL">Kỹ thuật (Technical Round)</option>
                  <option value="CULTURE">Văn hóa & Đội ngũ (Culture Fit)</option>
                  <option value="EXECUTIVE">Phỏng vấn Lãnh đạo (Executive)</option>
                  <option value="AI_INTERVIEW">Phỏng vấn AI (SmartHire Bot)</option>
                </select>
              </label>
            </div>
          </div>

          {/* Time & Duration */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-outline)]">
              Thời gian & Địa điểm
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1 text-xs font-semibold text-[var(--color-on-surface)]">
                <span>Thời gian bắt đầu *</span>
                <input
                  type="datetime-local"
                  required
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-alt)] py-2.5 px-3 text-xs outline-none transition-all focus:border-brand-primary focus:bg-white focus:ring-2 focus:ring-brand-primary/15"
                />
              </label>

              <label className="block space-y-1 text-xs font-semibold text-[var(--color-on-surface)]">
                <span>Thời lượng (phút)</span>
                <div className="relative">
                  <Clock className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-outline)]" />
                  <input
                    type="number"
                    min={15}
                    step={15}
                    value={durationMinutes}
                    onChange={(e) => setDurationMinutes(Number(e.target.value) || 45)}
                    className="w-full rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-alt)] py-2.5 pl-9 pr-3 text-xs outline-none transition-all focus:border-brand-primary focus:bg-white focus:ring-2 focus:ring-brand-primary/15"
                  />
                </div>
              </label>
            </div>

            {/* Mode: Online / Offline */}
            <div className="space-y-2">
              <span className="block text-xs font-semibold text-[var(--color-on-surface)]">Hình thức phỏng vấn</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMode("ONLINE")}
                  className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-semibold transition-all ${
                    mode === "ONLINE"
                      ? "border-brand-primary bg-[var(--color-primary-soft)] text-brand-primary shadow-sm"
                      : "border-[var(--color-border-default)] bg-white text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-alt)]"
                  }`}
                >
                  <Video className="size-4" />
                  Trực tuyến (Online)
                </button>
                <button
                  type="button"
                  onClick={() => setMode("OFFLINE")}
                  className={`flex items-center justify-center gap-2 rounded-xl border p-2.5 text-xs font-semibold transition-all ${
                    mode === "OFFLINE"
                      ? "border-brand-primary bg-[var(--color-primary-soft)] text-brand-primary shadow-sm"
                      : "border-[var(--color-border-default)] bg-white text-[var(--color-on-surface-variant)] hover:bg-[var(--color-surface-alt)]"
                  }`}
                >
                  <MapPin className="size-4" />
                  Trực tiếp (Tại văn phòng)
                </button>
              </div>
            </div>

            {mode === "ONLINE" ? (
              <label className="block space-y-1 text-xs font-semibold text-[var(--color-on-surface)]">
                <span>Link phòng họp trực tuyến (Google Meet / Zoom / Teams) *</span>
                <div className="relative">
                  <Link2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-outline)]" />
                  <input
                    type="url"
                    placeholder="https://meet.google.com/abc-xyz"
                    value={meetingUrl}
                    onChange={(e) => setMeetingUrl(e.target.value)}
                    className="w-full rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-alt)] py-2.5 pl-9 pr-3 text-xs outline-none transition-all focus:border-brand-primary focus:bg-white focus:ring-2 focus:ring-brand-primary/15"
                  />
                </div>
              </label>
            ) : (
              <label className="block space-y-1 text-xs font-semibold text-[var(--color-on-surface)]">
                <span>Địa điểm & Phòng họp *</span>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-outline)]" />
                  <input
                    type="text"
                    placeholder="VD: Phòng 801, Tầng 8 - Trụ sở chính"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-alt)] py-2.5 pl-9 pr-3 text-xs outline-none transition-all focus:border-brand-primary focus:bg-white focus:ring-2 focus:ring-brand-primary/15"
                  />
                </div>
              </label>
            )}
          </div>

          {/* Interviewer & Notes */}
          <div className="space-y-3">
            <label className="block space-y-1 text-xs font-semibold text-[var(--color-on-surface)]">
              <span>Hội đồng phỏng vấn / Người phụ trách</span>
              <div className="relative">
                <Users className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-outline)]" />
                <input
                  type="text"
                  placeholder="VD: Lê Minh (Tech Lead), Trần Quân (HR Manager)"
                  value={interviewerName}
                  onChange={(e) => setInterviewerName(e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-alt)] py-2.5 pl-9 pr-3 text-xs outline-none transition-all focus:border-brand-primary focus:bg-white focus:ring-2 focus:ring-brand-primary/15"
                />
              </div>
            </label>

            <label className="block space-y-1 text-xs font-semibold text-[var(--color-on-surface)]">
              <span>Ghi chú nội bộ hoặc lưu ý cho ứng viên</span>
              <textarea
                rows={2}
                placeholder="Chuẩn bị CV, portfolio hoặc thông tin cần thiết..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-alt)] p-3 text-xs outline-none transition-all focus:border-brand-primary focus:bg-white focus:ring-2 focus:ring-brand-primary/15"
              />
            </label>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-[var(--color-border-default)] pt-4">
            <Button type="button" variant="ghost" onClick={onClose}>
              Hủy bỏ
            </Button>
            <Button type="submit" variant="primary">
              <CalendarPlus className="mr-1.5 size-4" />
              Lưu & Xác nhận lịch
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
