import { useEffect, useState } from "react";
import { X, CalendarPlus, Video, MapPin, Link2, Clock, Users, User, Briefcase } from "lucide-react";
import { Button } from "@/components/ux/Button";
import { useT } from "@/i18n";
import type { InterviewMode, InterviewRound, MockInterview } from "../constants/mockInterviews";

type Props = {
  open: boolean;
  onClose: () => void;
  onSave: (interview: MockInterview) => void;
  availableJobs: Array<{ id: number; title: string }>;
  initialDate?: Date;
};

export function ScheduleModalDialog({ open, onClose, onSave, availableJobs, initialDate }: Props) {
  const t = useT();
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
  const [location, setLocation] = useState(() => t("recruiter.ops.schedules.modal.defaultLocation"));
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
      setError(t("recruiter.ops.schedules.modal.errCandidateName"));
      return;
    }
    if (!jobTitle.trim()) {
      setError(t("recruiter.ops.schedules.modal.errJobTitle"));
      return;
    }
    if (!startsAt) {
      setError(t("recruiter.ops.schedules.modal.errStartsAt"));
      return;
    }
    if (mode === "ONLINE" && !meetingUrl.trim()) {
      setError(t("recruiter.ops.schedules.modal.errMeetingUrl"));
      return;
    }
    if (mode === "OFFLINE" && !location.trim()) {
      setError(t("recruiter.ops.schedules.modal.errLocation"));
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
      interviewerName: interviewerName.trim() || t("recruiter.ops.schedules.modal.defaultInterviewer"),
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
                {t("recruiter.ops.schedules.modal.title")}
              </h2>
              <p className="text-xs text-[var(--color-on-surface-variant)]">
                {t("recruiter.ops.schedules.modal.subtitle")}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t("recruiter.ops.schedules.modal.closeAria")}
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
              {t("recruiter.ops.schedules.modal.sectionCandidate")}
            </h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <label className="block space-y-1 text-xs font-semibold text-[var(--color-on-surface)]">
                <span>{t("recruiter.ops.schedules.modal.candidateNameLabel")}</span>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-outline)]" />
                  <input
                    type="text"
                    required
                    placeholder={t("recruiter.ops.schedules.modal.candidateNamePlaceholder")}
                    value={candidateName}
                    onChange={(e) => { setCandidateName(e.target.value); setError(null); }}
                    className="w-full rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-alt)] py-2.5 pl-9 pr-3 text-xs outline-none transition-all focus:border-brand-primary focus:bg-white focus:ring-2 focus:ring-brand-primary/15"
                  />
                </div>
              </label>

              <label className="block space-y-1 text-xs font-semibold text-[var(--color-on-surface)]">
                <span>{t("recruiter.ops.schedules.modal.candidateEmailLabel")}</span>
                <input
                  type="email"
                  placeholder={t("recruiter.ops.schedules.modal.candidateEmailPlaceholder")}
                  value={candidateEmail}
                  onChange={(e) => setCandidateEmail(e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-alt)] py-2.5 px-3 text-xs outline-none transition-all focus:border-brand-primary focus:bg-white focus:ring-2 focus:ring-brand-primary/15"
                />
              </label>

              <label className="block space-y-1 text-xs font-semibold text-[var(--color-on-surface)]">
                <span>{t("recruiter.ops.schedules.modal.candidatePhoneLabel")}</span>
                <input
                  type="tel"
                  placeholder={t("recruiter.ops.schedules.modal.candidatePhonePlaceholder")}
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
              {t("recruiter.ops.schedules.modal.sectionJobRound")}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1 text-xs font-semibold text-[var(--color-on-surface)]">
                <span>{t("recruiter.ops.schedules.modal.jobTitleLabel")}</span>
                <div className="relative">
                  <Briefcase className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-outline)]" />
                  <input
                    type="text"
                    required
                    list="available-jobs-list"
                    placeholder={t("recruiter.ops.schedules.modal.jobTitlePlaceholder")}
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
                <span>{t("recruiter.ops.schedules.modal.roundLabel")}</span>
                <select
                  value={round}
                  onChange={(e) => setRound(e.target.value as InterviewRound)}
                  className="w-full rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-alt)] py-2.5 px-3 text-xs font-medium outline-none transition-all focus:border-brand-primary focus:bg-white focus:ring-2 focus:ring-brand-primary/15"
                >
                  <option value="TECHNICAL">{t("recruiter.ops.schedules.modal.roundOptTechnical")}</option>
                  <option value="CULTURE">{t("recruiter.ops.schedules.modal.roundOptCulture")}</option>
                  <option value="EXECUTIVE">{t("recruiter.ops.schedules.modal.roundOptExecutive")}</option>
                  <option value="AI_INTERVIEW">{t("recruiter.ops.schedules.modal.roundOptAi")}</option>
                </select>
              </label>
            </div>
          </div>

          {/* Time & Duration */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--color-outline)]">
              {t("recruiter.ops.schedules.modal.sectionTimeLocation")}
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1 text-xs font-semibold text-[var(--color-on-surface)]">
                <span>{t("recruiter.ops.schedules.modal.startsAtLabel")}</span>
                <input
                  type="datetime-local"
                  required
                  value={startsAt}
                  onChange={(e) => setStartsAt(e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-alt)] py-2.5 px-3 text-xs outline-none transition-all focus:border-brand-primary focus:bg-white focus:ring-2 focus:ring-brand-primary/15"
                />
              </label>

              <label className="block space-y-1 text-xs font-semibold text-[var(--color-on-surface)]">
                <span>{t("recruiter.ops.schedules.modal.durationLabel")}</span>
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
              <span className="block text-xs font-semibold text-[var(--color-on-surface)]">{t("recruiter.ops.schedules.modal.modeLabel")}</span>
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
                  {t("recruiter.ops.schedules.modal.modeOnlineBtn")}
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
                  {t("recruiter.ops.schedules.modal.modeOfflineBtn")}
                </button>
              </div>
            </div>

            {mode === "ONLINE" ? (
              <label className="block space-y-1 text-xs font-semibold text-[var(--color-on-surface)]">
                <span>{t("recruiter.ops.schedules.modal.meetingUrlLabel")}</span>
                <div className="relative">
                  <Link2 className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-outline)]" />
                  <input
                    type="url"
                    placeholder={t("recruiter.ops.schedules.modal.meetingUrlPlaceholder")}
                    value={meetingUrl}
                    onChange={(e) => setMeetingUrl(e.target.value)}
                    className="w-full rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-alt)] py-2.5 pl-9 pr-3 text-xs outline-none transition-all focus:border-brand-primary focus:bg-white focus:ring-2 focus:ring-brand-primary/15"
                  />
                </div>
              </label>
            ) : (
              <label className="block space-y-1 text-xs font-semibold text-[var(--color-on-surface)]">
                <span>{t("recruiter.ops.schedules.modal.locationLabel")}</span>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-outline)]" />
                  <input
                    type="text"
                    placeholder={t("recruiter.ops.schedules.modal.locationPlaceholder")}
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
              <span>{t("recruiter.ops.schedules.modal.interviewersLabel")}</span>
              <div className="relative">
                <Users className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-outline)]" />
                <input
                  type="text"
                  placeholder={t("recruiter.ops.schedules.modal.interviewersPlaceholder")}
                  value={interviewerName}
                  onChange={(e) => setInterviewerName(e.target.value)}
                  className="w-full rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-alt)] py-2.5 pl-9 pr-3 text-xs outline-none transition-all focus:border-brand-primary focus:bg-white focus:ring-2 focus:ring-brand-primary/15"
                />
              </div>
            </label>

            <label className="block space-y-1 text-xs font-semibold text-[var(--color-on-surface)]">
              <span>{t("recruiter.ops.schedules.modal.noteLabel")}</span>
              <textarea
                rows={2}
                placeholder={t("recruiter.ops.schedules.modal.notePlaceholder")}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-alt)] p-3 text-xs outline-none transition-all focus:border-brand-primary focus:bg-white focus:ring-2 focus:ring-brand-primary/15"
              />
            </label>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 border-t border-[var(--color-border-default)] pt-4">
            <Button type="button" variant="ghost" onClick={onClose}>
              {t("recruiter.ops.schedules.modal.cancelBtn")}
            </Button>
            <Button type="submit" variant="primary">
              <CalendarPlus className="mr-1.5 size-4" />
              {t("recruiter.ops.schedules.modal.submitBtn")}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
