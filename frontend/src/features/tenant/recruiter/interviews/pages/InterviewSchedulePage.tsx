import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  Calendar,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Copy,
  Eye,
  FileText,
  Mail,
  MapPin,
  Save,
  Search,
  Send,
  Trash2,
  UserCheck,
  Users,
  Video,
  X,
} from "lucide-react";
import { humanInterviewApi } from "@/api/tenant/humanInterviewApi";
import { applicantApi } from "@/api/tenant/applicantApi";
import { cvApi } from "@/api/tenant/cvApi";
import type { Availability, SaveInterview } from "@/api/types/humanInterview";
import { DetailDialog } from "@/components/ux/DetailDialog";
import { Skeleton, SkeletonCard } from "@/components/ux/Skeleton";
import { useT, useI18nStore, type TranslateFn } from "@/i18n";
import { getApiErrorMessage } from "@/lib/axios";
import { cn } from "@/lib/utils";
import { toast } from "@/stores/toastStore";
import { useRecruitmentJob } from "../../jobs/components/JobRecruitmentWorkspace";
import { downloadInterview, localDate, localTime } from "../components/humanInterviewUi";

function createSchema(t: TranslateFn) {
  return z
    .object({
      applicationId: z.coerce.number().positive(t("recruiter.interviews.human.scheduleDialog.schemaCandidate")),
      round: z.string().min(1),
      rubric: z.string().min(1),
      mode: z.enum(["ONLINE", "OFFLINE"]),
      provider: z.string().min(1),
      meetingUrl: z.string(),
      location: z.string(),
      date: z.string().min(1, t("recruiter.interviews.human.scheduleDialog.schemaDate")),
      time: z.string().min(1, t("recruiter.interviews.human.scheduleDialog.schemaTime")),
      duration: z.coerce.number().min(15).max(240),
      emailTemplate: z.string().min(1),
      notes: z.string().max(2000),
      attachCalendar: z.boolean(),
      participants: z
        .array(
          z.object({
            userId: z.number().positive(),
            role: z.enum(["LEAD", "CO_INTERVIEWER", "NOTE_TAKER"]),
          }),
        )
        .min(1, t("recruiter.interviews.human.scheduleDialog.schemaParticipants"))
        .max(10),
    })
    .superRefine((v, ctx) => {
      const start = new Date(`${v.date}T${v.time}`).getTime();
      if (!Number.isFinite(start) || start <= Date.now()) {
        ctx.addIssue({
          code: "custom",
          path: ["date"],
          message: t("recruiter.interviews.human.scheduleDialog.schemaFuture"),
        });
      }
      if (v.mode === "ONLINE" && v.provider !== "SMARTHIRE") {
        try {
          const url = new URL(v.meetingUrl);
          if (!["http:", "https:"].includes(url.protocol)) throw new Error();
        } catch {
          ctx.addIssue({
            code: "custom",
            path: ["meetingUrl"],
            message: t("recruiter.interviews.human.scheduleDialog.schemaMeetingUrl"),
          });
        }
      }
      if (v.mode === "OFFLINE" && !v.location.trim()) {
        ctx.addIssue({
          code: "custom",
          path: ["location"],
          message: t("recruiter.interviews.human.scheduleDialog.schemaLocation"),
        });
      }
      if (v.participants.filter((p) => p.role === "LEAD").length !== 1) {
        ctx.addIssue({
          code: "custom",
          path: ["participants"],
          message: t("recruiter.interviews.human.scheduleDialog.schemaLead"),
        });
      }
    });
}

type FormValues = z.infer<ReturnType<typeof createSchema>>;

const DURATION_PRESETS = [30, 45, 60, 90] as const;

const ROUND_I18N: Record<string, Record<string, string>> = {
  TECHNICAL: {
    vi: "Vòng 1: Kỹ thuật Chuyên sâu",
    en: "Round 1: Technical Deep Dive",
    ja: "第1次: 技術深掘り面接",
  },
  CULTURE: {
    vi: "Vòng 2: Phù hợp Văn hóa & Đội ngũ",
    en: "Round 2: Culture & Team Fit",
    ja: "第2次: カルチャー・チーム適合面談",
  },
  EXECUTIVE: {
    vi: "Vòng 3: Phỏng vấn Ban Giám đốc",
    en: "Round 3: Executive Interview",
    ja: "第3次: 役員面接",
  },
};

const RUBRIC_I18N: Record<string, Record<string, string>> = {
  TECHNICAL: {
    vi: "Kỹ thuật, Giao tiếp & Văn hóa",
    en: "Technical, Communication & Culture",
    ja: "技術・コミュニケーション・カルチャー",
  },
  CULTURE: {
    vi: "Phù hợp Văn hóa & Tiềm năng",
    en: "Culture & Leadership Fit",
    ja: "カルチャー＆リーダーシップ評価基準",
  },
  GENERAL: {
    vi: "Tiêu chí Tổng quát SmartHire",
    en: "SmartHire General Rubric",
    ja: "SmartHire 総合評価基準",
  },
};

const PROVIDER_I18N: Record<string, { label: Record<string, string>; sublabel: Record<string, string> }> = {
  SMARTHIRE: {
    label: { vi: "Phòng họp SmartHire", en: "SmartHire Meeting", ja: "SmartHire ミーティング" },
    sublabel: { vi: "Tự động tạo link phòng họp", en: "Automatic meeting link", ja: "会議室リンク自動生成" },
  },
  GOOGLE_MEET: {
    label: { vi: "Google Meet", en: "Google Meet", ja: "Google Meet" },
    sublabel: { vi: "Cuộc họp qua Google Meet", en: "Meeting via Google Meet", ja: "Google Meet によるミーティング" },
  },
  ZOOM: {
    label: { vi: "Zoom", en: "Zoom", ja: "Zoom" },
    sublabel: { vi: "Cuộc họp qua Zoom", en: "Meeting via Zoom", ja: "Zoom によるミーティング" },
  },
  TEAMS: {
    label: { vi: "Microsoft Teams", en: "Microsoft Teams", ja: "Microsoft Teams" },
    sublabel: { vi: "Cuộc họp qua Microsoft Teams", en: "Meeting via MS Teams", ja: "Teams によるミーティング" },
  },
};

const PARTICIPANT_ROLE_I18N: Record<string, { label: Record<string, string>; badge?: Record<string, string> }> = {
  LEAD: {
    label: { vi: "Trưởng hội đồng", en: "Lead Interviewer", ja: "面接官リーダー" },
    badge: { vi: "Chủ trì", en: "Host", ja: "進行役" },
  },
  CO_INTERVIEWER: {
    label: { vi: "Người phỏng vấn", en: "Co-interviewer", ja: "共同面接官" },
  },
  NOTE_TAKER: {
    label: { vi: "Thư ký", en: "Note-taker", ja: "書記" },
  },
};

const EMAIL_TEMPLATE_I18N: Record<string, Record<string, string>> = {
  STANDARD: {
    vi: "Thư mời tiêu chuẩn (Song ngữ)",
    en: "Standard Bilingual Invitation",
    ja: "標準バイリンガル招待状",
  },
  EXPRESS: {
    vi: "Thư mời lịch hẹn nhanh",
    en: "Express Interview Invitation",
    ja: "クイックスケジュール招待状",
  },
  EXECUTIVE: {
    vi: "Thư mời phỏng vấn Ban Giám đốc",
    en: "Executive Interview Invitation",
    ja: "役員面接招待状",
  },
};

const PROVIDER_NAME_MAP: Record<string, string> = {
  SMARTHIRE: "SmartHire",
  GOOGLE_MEET: "Google Meet",
  ZOOM: "Zoom",
  TEAMS: "Teams",
};

export type FormSelectOption<T extends string | number = string> = {
  value: T;
  label: string;
  sublabel?: string;
  badge?: React.ReactNode;
  avatar?: string;
  disabled?: boolean;
};

interface FormSelectProps<T extends string | number = string> {
  value: T;
  onChange: (value: T) => void;
  options: FormSelectOption<T>[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
  size?: "sm" | "md";
  searchable?: boolean;
  searchPlaceholder?: string;
  error?: boolean;
  emptyText?: string;
}

function FormSelect<T extends string | number = string>({
  value,
  onChange,
  options,
  placeholder = "Chọn...",
  disabled = false,
  className,
  buttonClassName,
  size = "md",
  searchable = false,
  searchPlaceholder = "Tìm kiếm...",
  error = false,
  emptyText = "Không có lựa chọn khả dụng",
}: FormSelectProps<T>) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = options.find((opt) => opt.value === value);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const filtered = useMemo(() => {
    if (!query.trim()) return options;
    const q = query.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(q) ||
        (opt.sublabel && opt.sublabel.toLowerCase().includes(q)),
    );
  }, [options, query]);

  return (
    <div ref={containerRef} className={cn("relative w-full text-left", className)}>
      <button
        type="button"
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "flex w-full items-center justify-between gap-2 rounded-xl border bg-slate-50/60 px-3 text-xs font-medium transition-all outline-none cursor-pointer",
          size === "sm" ? "h-8 py-1" : "h-9 py-1.5",
          disabled && "cursor-not-allowed opacity-50 bg-slate-100 dark:bg-slate-800",
          error
            ? "border-rose-400 focus:border-rose-500 focus:ring-2 focus:ring-rose-500/20"
            : open
              ? "border-brand-primary bg-white ring-2 ring-brand-primary/20 shadow-xs dark:bg-slate-900"
              : "border-slate-200 text-slate-800 hover:border-slate-300 hover:bg-white focus:border-brand-primary focus:bg-white focus:ring-2 focus:ring-brand-primary/20 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100",
          buttonClassName,
        )}
      >
        <span className="flex items-center gap-2 truncate min-w-0">
          {selected?.avatar && (
            <span className="grid size-5 shrink-0 place-items-center rounded-md bg-brand-primary/10 text-[10px] font-bold text-brand-primary">
              {selected.avatar}
            </span>
          )}
          <span className={cn("truncate", !selected && "text-slate-400 font-normal")}>
            {selected ? selected.label : placeholder}
          </span>
          {selected?.sublabel && (
            <span className="hidden sm:inline truncate text-[11px] text-slate-400 font-normal">
              — {selected.sublabel}
            </span>
          )}
        </span>
        <div className="flex items-center gap-1.5 shrink-0 ml-1">
          {selected?.badge}
          <ChevronDown
            className={cn(
              "size-3.5 text-slate-400 shrink-0 transition-transform duration-150",
              open && "rotate-180 text-brand-primary",
            )}
          />
        </div>
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute left-0 top-full mt-1.5 z-50 w-full min-w-[220px] rounded-2xl border border-slate-200 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in-50 zoom-in-95"
        >
          {searchable && (
            <div className="relative mb-1.5 px-1 pt-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                autoFocus
                className="h-8 w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-8 pr-3 text-xs text-slate-900 outline-none placeholder:text-slate-400 focus:border-brand-primary focus:bg-white focus:ring-1 focus:ring-brand-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
            </div>
          )}

          <div className="max-h-56 overflow-y-auto space-y-0.5">
            {filtered.length === 0 ? (
              <p className="py-3 text-center text-xs text-slate-400 italic">{emptyText}</p>
            ) : (
              filtered.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    role="option"
                    aria-selected={isSelected}
                    disabled={opt.disabled}
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between gap-2 rounded-xl px-2.5 py-2 text-xs transition-colors cursor-pointer text-left",
                      opt.disabled && "opacity-40 cursor-not-allowed",
                      isSelected
                        ? "bg-[var(--color-primary-soft)] font-semibold text-brand-primary"
                        : "text-slate-700 hover:bg-slate-100/80 dark:text-slate-200 dark:hover:bg-slate-800",
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      {opt.avatar && (
                        <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-brand-primary/10 text-[10px] font-bold text-brand-primary">
                          {opt.avatar}
                        </span>
                      )}
                      <div className="min-w-0">
                        <p className={cn("truncate", isSelected ? "font-semibold" : "font-medium")}>
                          {opt.label}
                        </p>
                        {opt.sublabel && (
                          <p className="text-[11px] text-slate-400 truncate mt-0.5">
                            {opt.sublabel}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {opt.badge}
                      {isSelected && <Check className="size-3.5 text-brand-primary shrink-0" />}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function InterviewSchedulePage() {
  const t = useT();
  const locale = useI18nStore((s) => s.locale);
  const job = useRecruitmentJob();
  const navigate = useNavigate();
  const client = useQueryClient();
  const params = useParams<{ id: string; interviewId?: string }>();
  const numericJobId = Number(job.id);
  const interviewId = params.interviewId ? Number(params.interviewId) : undefined;
  const isEditing = Boolean(interviewId);

  const getRoundLabel = useCallback(
    (code: string, fallback?: string) => {
      const entry = ROUND_I18N[code];
      if (entry) return entry[locale] ?? entry.vi;
      return fallback ?? code;
    },
    [locale],
  );

  const getRubricLabel = useCallback(
    (code: string, fallback?: string) => {
      const entry = RUBRIC_I18N[code];
      if (entry) return entry[locale] ?? entry.vi;
      return fallback ?? code;
    },
    [locale],
  );

  const getProviderLabel = useCallback(
    (code: string) => {
      const entry = PROVIDER_I18N[code];
      if (entry) return entry.label[locale] ?? entry.label.vi;
      return PROVIDER_NAME_MAP[code] ?? code;
    },
    [locale],
  );

  const getProviderSublabel = useCallback(
    (code: string) => {
      const entry = PROVIDER_I18N[code];
      if (entry) return entry.sublabel[locale] ?? entry.sublabel.vi;
      return "";
    },
    [locale],
  );

  const getEmailTemplateLabel = useCallback(
    (code: string, fallback?: string) => {
      const entry = EMAIL_TEMPLATE_I18N[code];
      if (entry) return entry[locale] ?? entry.vi;
      return fallback ?? code;
    },
    [locale],
  );

  const getRoleLabel = useCallback(
    (role: string) => {
      const entry = PARTICIPANT_ROLE_I18N[role];
      if (entry) return entry.label[locale] ?? entry.label.vi;
      return role;
    },
    [locale],
  );

  const [profileOpen, setProfileOpen] = useState(false);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Load existing interview if editing
  const existingQuery = useQuery({
    queryKey: ["human-interviews", "detail", interviewId],
    queryFn: () => (interviewId ? humanInterviewApi.get(interviewId) : null),
    enabled: isEditing,
  });
  const existing = existingQuery.data;

  // Options query
  const optionsQuery = useQuery({
    queryKey: ["human-interviews", "options", numericJobId],
    queryFn: () => humanInterviewApi.options(numericJobId),
  });
  const options = optionsQuery.data;

  const schema = useMemo(() => createSchema(t), [t]);

  const defaultStartDate = useMemo(() => {
    if (existing) {
      return new Date(existing.configuration.requestedStart ?? existing.start);
    }
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d;
  }, [existing]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      applicationId: 0,
      round: "TECHNICAL",
      rubric: "TECHNICAL",
      mode: "ONLINE",
      provider: "SMARTHIRE",
      meetingUrl: "",
      location: "",
      date: localDate(defaultStartDate),
      time: localTime(defaultStartDate),
      duration: 60,
      emailTemplate: "STANDARD",
      notes: "",
      attachCalendar: true,
      participants: [],
    },
  });

  // Populate form once existing / options data loads
  useEffect(() => {
    if (!options) return;
    if (existing) {
      const s = new Date(existing.configuration.requestedStart ?? existing.start);
      const dur = Math.max(15, Math.round((new Date(existing.end).getTime() - new Date(existing.start).getTime()) / 60000));
      form.reset({
        applicationId: existing.applicationId,
        round: existing.round,
        rubric: existing.configuration.rubric ?? "TECHNICAL",
        mode: existing.mode,
        provider: existing.configuration.provider === "OFFICE" ? "SMARTHIRE" : existing.configuration.provider ?? "SMARTHIRE",
        meetingUrl: existing.meetingUrl ?? "",
        location: existing.location ?? "",
        date: localDate(s),
        time: localTime(s),
        duration: dur,
        emailTemplate: existing.configuration.emailTemplate ?? "STANDARD",
        notes: existing.configuration.notes ?? "",
        attachCalendar: existing.configuration.attachCalendar ?? true,
        participants: existing.participants.map((p) => ({ userId: p.userId, role: p.role })),
      });
    } else if (options.candidates.length > 0 && form.getValues("applicationId") === 0) {
      form.setValue("applicationId", options.candidates[0].applicationId);
      if (options.interviewers.length > 0 && form.getValues("participants").length === 0) {
        form.setValue("participants", [{ userId: options.interviewers[0].userId, role: "LEAD" }]);
      }
    }
  }, [options, existing, form]);

  const values = form.watch();

  const selectedCandidate = useMemo(
    () => options?.candidates.find((c) => c.applicationId === values.applicationId),
    [options, values.applicationId],
  );

  const profileQuery = useQuery({
    queryKey: ["applications", values.applicationId],
    queryFn: () => applicantApi.get(values.applicationId),
    enabled: Boolean(values.applicationId),
  });

  const saveMutation = useMutation({
    mutationFn: ({ body }: { body: SaveInterview }) => humanInterviewApi.save(body, interviewId),
    onSuccess: (_data, vars) => {
      void client.invalidateQueries({ queryKey: ["human-interviews"] });
      toast.success(
        vars.body.draft
          ? t("recruiter.interviews.human.scheduleDialog.savedDraftToast")
          : t("recruiter.interviews.human.scheduleDialog.scheduledToast"),
      );
      navigate(`/recruiter/jobs/${numericJobId}/interviews`);
    },
    onError: (e) => {
      const msg = getApiErrorMessage(e);
      setFormError(msg);
      toast.error(msg);
    },
  });

  const checkAvailabilityMutation = useMutation<Availability>({
    mutationFn: () => {
      const start = new Date(`${values.date}T${values.time}`);
      const end = new Date(start.getTime() + values.duration * 60_000);
      return humanInterviewApi.availability({
        jobId: numericJobId,
        start: start.toISOString(),
        end: end.toISOString(),
        userIds: values.participants.map((p) => p.userId),
        excludeId: interviewId,
      });
    },
  });

  const submit = (draft: boolean) => {
    setFormError(null);
    form.handleSubmit(
      (v) => {
        const start = new Date(`${v.date}T${v.time}`);
        const end = new Date(start.getTime() + v.duration * 60_000);
        saveMutation.mutate({
          body: {
            jobId: numericJobId,
            applicationId: v.applicationId,
            round: v.round,
            rubric: v.rubric,
            mode: v.mode,
            start: start.toISOString(),
            end: end.toISOString(),
            meetingUrl: v.mode === "ONLINE" && v.provider !== "SMARTHIRE" ? v.meetingUrl : "",
            location: v.mode === "OFFLINE" ? v.location : "",
            provider: v.mode === "ONLINE" ? v.provider : "OFFICE",
            emailTemplate: v.emailTemplate,
            notes: v.notes,
            attachCalendar: v.attachCalendar,
            smsReminder: false,
            draft,
            participants: v.participants,
          },
        });
      },
      (errors) => {
        const firstErr = Object.values(errors)[0];
        if (firstErr?.message) setFormError(String(firstErr.message));
      },
    )();
  };

  const previewPlace =
    values.mode === "ONLINE"
      ? values.provider === "SMARTHIRE"
        ? t("recruiter.interviews.human.scheduleDialog.smartHireWebRoom")
        : values.meetingUrl || (locale === "vi" ? "Chưa nhập link họp" : locale === "ja" ? "会議リンク未入力" : "Meeting URL not provided")
      : values.location || (locale === "vi" ? "Chưa nhập địa điểm" : locale === "ja" ? "場所未入力" : "Location not provided");

  const roundLabel = getRoundLabel(
    values.round,
    options?.rounds.find((r) => r.code === values.round)?.label,
  );

  const displayProvider = getProviderLabel(values.provider);

  const emailPreviewBody = t("recruiter.interviews.human.scheduleDialog.previewBody", {
    name: selectedCandidate?.name ?? t("recruiter.interviews.human.scheduleDialog.candidatePlaceholderName"),
    round: roundLabel,
    jobTitle: selectedCandidate?.jobTitle ?? job.title,
    time: values.time,
    date: values.date,
    place: previewPlace,
  });

  const copyMeetingLink = () => {
    if (!values.meetingUrl) return;
    void navigator.clipboard?.writeText(values.meetingUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  // Avatar initials chuẩn Việt Nam: Họ + Tên (ví dụ "Lê Công Cường" -> "LC")
  const initials = useMemo(() => {
    if (!selectedCandidate?.name) return "—";
    const parts = selectedCandidate.name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return "—";
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }, [selectedCandidate?.name]);

  const leadInterviewer = options?.interviewers.find(
    (u) => u.userId === values.participants.find((p) => p.role === "LEAD")?.userId,
  );

  const formattedDate = useMemo(() => {
    if (!values.date) return "";
    const [y, m, d] = values.date.split("-");
    return d && m && y ? `${d}/${m}/${y}` : values.date;
  }, [values.date]);

  if (optionsQuery.isPending || (isEditing && existingQuery.isPending)) {
    return (
      <div className="space-y-4 w-full p-2 sm:p-4">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-8 space-y-4">
            <SkeletonCard className="h-56" />
            <SkeletonCard className="h-64" />
          </div>
          <div className="lg:col-span-4">
            <SkeletonCard className="h-96" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-5 pb-12 text-[var(--color-on-surface)]">
      {/* 1. Thanh tiêu đề trang (Header) — Tinh gọn, bỏ nút trùng */}
      <header className="flex flex-col gap-4 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] px-5 py-4 shadow-2xs lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3.5">
          <button
            type="button"
            onClick={() => navigate(`/recruiter/jobs/${numericJobId}/interviews`)}
            aria-label="Quay lại danh sách phỏng vấn"
            title="Quay lại danh sách"
            className="grid size-9 shrink-0 place-items-center rounded-full border border-[var(--color-border-default)] bg-[var(--color-surface-alt)] text-slate-700 transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-subtle)] hover:text-[var(--color-primary)] cursor-pointer"
          >
            <ArrowLeft className="size-4" />
          </button>
          <div className="min-w-0 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-base font-bold text-slate-900 sm:text-lg">
                {isEditing ? "Cập nhật lịch phỏng vấn" : "Lên lịch phỏng vấn"}
              </h1>
              <span className="rounded-full bg-[var(--color-primary-soft)] px-2.5 py-0.5 text-xs font-semibold text-brand-primary">
                {job.title}
              </span>
            </div>
            <p className="truncate text-xs text-slate-500 sm:text-[13px]">
              Tự động gửi thư mời và file lịch (.ics) sau khi xác nhận.
            </p>
          </div>
        </div>
      </header>

      {formError && (
        <div role="alert" className="flex items-center justify-between rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/40 dark:text-rose-300 animate-in fade-in-50">
          <div className="flex items-center gap-2">
            <AlertCircle className="size-4 shrink-0 text-rose-600" />
            <span>{formError}</span>
          </div>
          <button type="button" onClick={() => setFormError(null)} className="rounded p-0.5 hover:bg-rose-100 cursor-pointer">
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* 2. Biểu mẫu thiết lập tuần tự (Trái 8 cols) & Thẻ Tóm tắt cố định (Phải 4 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* === CỘT TRÁI (8 cols): Biểu mẫu chính === */}
        <div className="lg:col-span-8 space-y-5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(false);
            }}
            className="space-y-5"
          >
            {/* MỤC 1: ỨNG VIÊN & VÒNG PHỎNG VẤN */}
            <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span className="grid size-6 place-items-center rounded-lg bg-[var(--color-primary-soft)] text-xs font-bold text-brand-primary">
                    1
                  </span>
                  <UserCheck className="size-4 text-brand-primary" />
                  <span>Ứng viên & Vòng phỏng vấn</span>
                </h2>
                {selectedCandidate && (
                  <button
                    type="button"
                    onClick={() => setProfileOpen(true)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-brand-primary hover:underline cursor-pointer"
                  >
                    <Eye className="size-3.5" />
                    <span>Xem hồ sơ & CV</span>
                  </button>
                )}
              </div>

              <div className="space-y-4">
                {/* Chọn ứng viên */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Ứng viên *
                  </label>
                  <FormSelect
                    disabled={isEditing}
                    value={values.applicationId}
                    onChange={(val) => form.setValue("applicationId", Number(val), { shouldValidate: true })}
                    options={(options?.candidates ?? []).map((c) => ({
                      value: c.applicationId,
                      label: c.name,
                      sublabel: c.email,
                      avatar: c.name.trim().split(/\s+/).filter(Boolean).slice(-2).map((w) => w[0]).join("").toUpperCase(),
                    }))}
                    placeholder={
                      !options?.candidates.length
                        ? (locale === "vi" ? "Chưa có ứng viên đủ điều kiện" : locale === "ja" ? "対象となる候補者はいません" : "No eligible candidates")
                        : (locale === "vi" ? "Chọn ứng viên..." : locale === "ja" ? "候補者を選択..." : "Select candidate...")
                    }
                    searchable
                    searchPlaceholder={locale === "vi" ? "Tìm kiếm theo tên hoặc email ứng viên..." : locale === "ja" ? "候補者名またはメールで検索..." : "Search by candidate name or email..."}
                    error={Boolean(form.formState.errors.applicationId)}
                    emptyText={locale === "vi" ? "Không tìm thấy ứng viên phù hợp" : locale === "ja" ? "該当する候補者が見つかりません" : "No matching candidate found"}
                  />
                  {form.formState.errors.applicationId && (
                    <p role="alert" className="mt-1.5 text-xs text-rose-600">
                      {form.formState.errors.applicationId.message}
                    </p>
                  )}
                </div>

                {/* Vòng phỏng vấn & Tiêu chí đánh giá (2 cols) */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Vòng phỏng vấn *
                    </label>
                    <FormSelect
                      value={values.round}
                      onChange={(val) => form.setValue("round", String(val), { shouldValidate: true })}
                      options={(options?.rounds ?? []).map((r) => ({
                        value: r.code,
                        label: getRoundLabel(r.code, r.label),
                      }))}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Tiêu chí đánh giá *
                    </label>
                    <FormSelect
                      value={values.rubric}
                      onChange={(val) => form.setValue("rubric", String(val), { shouldValidate: true })}
                      options={(options?.rubrics ?? []).map((r) => ({
                        value: r.code,
                        label: getRubricLabel(r.code, r.label),
                      }))}
                    />
                  </div>
                </div>
              </div>
            </section>

            {/* MỤC 2: THỜI GIAN & HÌNH THỨC */}
            <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span className="grid size-6 place-items-center rounded-lg bg-[var(--color-primary-soft)] text-xs font-bold text-brand-primary">
                    2
                  </span>
                  <Calendar className="size-4 text-brand-primary" />
                  <span>Thời gian & Hình thức</span>
                </h2>
                <span className="text-[11px] font-mono text-slate-400">
                  Múi giờ: {Intl.DateTimeFormat().resolvedOptions().timeZone}
                </span>
              </div>

              <div className="space-y-4">
                {/* Segmented Control Chọn Hình Thức */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Hình thức *
                  </label>
                  <div className="flex items-center p-1 rounded-xl bg-slate-100/80 border border-slate-200 dark:bg-slate-800 dark:border-slate-700">
                    <button
                      type="button"
                      onClick={() => form.setValue("mode", "ONLINE")}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                        values.mode === "ONLINE"
                          ? "bg-white text-brand-primary shadow-xs dark:bg-slate-900"
                          : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200",
                      )}
                    >
                      <Video className="size-3.5 text-sky-600" />
                      <span>Trực tuyến</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => form.setValue("mode", "OFFLINE")}
                      className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                        values.mode === "OFFLINE"
                          ? "bg-white text-emerald-700 shadow-xs dark:bg-slate-900"
                          : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200",
                      )}
                    >
                      <Building2 className="size-3.5 text-emerald-600" />
                      <span>Trực tiếp</span>
                    </button>
                  </div>
                </div>

                {/* Chi tiết nền tảng hoặc địa chỉ */}
                {values.mode === "ONLINE" ? (
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-center rounded-xl bg-slate-50/70 p-3.5 border border-slate-200/70 dark:bg-slate-800/50 dark:border-slate-700">
                    <div className="sm:col-span-5">
                      <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                        Nền tảng
                      </label>
                      <FormSelect
                        value={values.provider}
                        onChange={(val) => form.setValue("provider", String(val), { shouldValidate: true })}
                        buttonClassName="bg-white shadow-2xs font-semibold"
                        options={["SMARTHIRE", "GOOGLE_MEET", "ZOOM", "TEAMS"].map((pCode) => ({
                          value: pCode,
                          label: getProviderLabel(pCode),
                          sublabel: getProviderSublabel(pCode),
                        }))}
                      />
                    </div>

                    <div className="sm:col-span-7">
                      {values.provider === "SMARTHIRE" ? (
                        <div className="text-xs text-slate-500 pt-3 flex items-center gap-1.5">
                          <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                          <span>Tự động tạo link phòng họp khi lưu.</span>
                        </div>
                      ) : (
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-400 mb-1">
                            Đường link cuộc họp *
                          </label>
                          <div className="flex gap-1.5">
                            <input
                              type="url"
                              placeholder="https://meet.google.com/..."
                              className="h-9 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-xs outline-none focus:border-brand-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                              {...form.register("meetingUrl")}
                            />
                            <button
                              type="button"
                              onClick={copyMeetingLink}
                              className="h-9 px-3 rounded-xl border border-slate-200 bg-white text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer shadow-2xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                              title="Sao chép"
                            >
                              {copiedLink ? <Check className="size-3.5 text-emerald-600" /> : <Copy className="size-3.5" />}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Địa điểm / Tên phòng họp trực tiếp *
                    </label>
                    <div className="relative">
                      <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        placeholder="Phòng họp A1, Tầng 3, Tòa nhà trụ sở chính..."
                        className="h-9 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-xs outline-none focus:border-brand-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                        {...form.register("location")}
                      />
                    </div>
                  </div>
                )}

                {/* Ngày, Giờ & Thời lượng (3 cols đồng bộ) */}
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3.5 items-end">
                  <div className="sm:col-span-4">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Ngày *
                    </label>
                    <input
                      type="date"
                      className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 text-xs font-medium text-slate-900 outline-none transition-[box-shadow,border-color] focus:border-brand-primary focus:bg-white focus:ring-2 focus:ring-brand-primary/20 cursor-pointer dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100"
                      {...form.register("date")}
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Giờ bắt đầu *
                    </label>
                    <input
                      type="time"
                      className="h-9 w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3 text-xs font-medium text-slate-900 outline-none transition-[box-shadow,border-color] focus:border-brand-primary focus:bg-white focus:ring-2 focus:ring-brand-primary/20 cursor-pointer dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100"
                      {...form.register("time")}
                    />
                  </div>

                  <div className="sm:col-span-5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                      Thời lượng
                    </label>
                    <div className="flex items-center gap-1.5">
                      {DURATION_PRESETS.map((d) => (
                        <button
                          key={d}
                          type="button"
                          onClick={() => form.setValue("duration", d)}
                          className={cn(
                            "flex-1 h-9 rounded-xl text-xs font-semibold transition-all cursor-pointer",
                            values.duration === d
                              ? "bg-brand-primary text-white shadow-2xs"
                              : "border border-slate-200 bg-slate-50/70 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
                          )}
                        >
                          {d}p
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            {/* MỤC 3: HỘI ĐỒNG PHỎNG VẤN */}
            <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span className="grid size-6 place-items-center rounded-lg bg-[var(--color-primary-soft)] text-xs font-bold text-brand-primary">
                    3
                  </span>
                  <Users className="size-4 text-brand-primary" />
                  <span>Hội đồng phỏng vấn</span>
                </h2>
                <button
                  type="button"
                  disabled={checkAvailabilityMutation.isPending || !values.participants.length}
                  onClick={() => checkAvailabilityMutation.mutate()}
                  className="inline-flex h-8 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50/60 px-3 text-xs font-semibold text-brand-primary hover:bg-brand-primary/5 hover:border-brand-primary/30 transition-all cursor-pointer disabled:opacity-40 dark:border-slate-700 dark:bg-slate-800"
                >
                  <Clock className="size-3.5" />
                  <span>{checkAvailabilityMutation.isPending ? "Đang kiểm tra..." : "Kiểm tra trùng lịch"}</span>
                </button>
              </div>

              <div className="space-y-3.5">
                {/* Thêm thành viên hội đồng */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Thành viên hội đồng
                  </label>
                  <FormSelect
                    value=""
                    onChange={(val) => {
                      const id = Number(val);
                      if (id && !values.participants.some((p) => p.userId === id)) {
                        form.setValue("participants", [
                          ...values.participants,
                          { userId: id, role: values.participants.length ? "CO_INTERVIEWER" : "LEAD" },
                        ]);
                        checkAvailabilityMutation.reset();
                      }
                    }}
                    options={(options?.interviewers ?? [])
                      .filter((p) => !values.participants.some((v) => v.userId === p.userId))
                      .map((p) => ({
                        value: String(p.userId),
                        label: p.name,
                        sublabel: p.email,
                        avatar: p.name.trim().split(/\s+/).filter(Boolean).slice(-2).map((w) => w[0]).join("").toUpperCase(),
                      }))}
                    placeholder={locale === "vi" ? "Tìm tên hoặc email để thêm..." : locale === "ja" ? "名前またはメールで検索して追加..." : "Search name or email to add..."}
                    searchable
                    searchPlaceholder={locale === "vi" ? "Nhập tên hoặc email thành viên..." : locale === "ja" ? "メンバーの名前またはメールを入力..." : "Enter member name or email..."}
                    emptyText={locale === "vi" ? "Đã thêm tất cả thành viên trong danh sách" : locale === "ja" ? "利用可能なメンバーはすべて追加されました" : "All available members added"}
                  />
                </div>

                {/* Danh sách thành viên hội đồng */}
                <div className="space-y-2">
                  {values.participants.map((p, index) => {
                    const user = options?.interviewers.find((u) => u.userId === p.userId);
                    const isConflict = checkAvailabilityMutation.data?.conflicts.some((c) =>
                      c.userIds.includes(p.userId),
                    );
                    const pInitials = user?.name
                      ? user.name
                          .trim()
                          .split(/\s+/)
                          .filter(Boolean)
                          .map((w) => w[0])
                          .slice(-2)
                          .join("")
                          .toUpperCase()
                      : "U";

                    return (
                      <div
                        key={p.userId}
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/50 p-2.5 text-xs dark:border-slate-800 dark:bg-slate-800/60"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className="grid size-8 shrink-0 place-items-center rounded-xl bg-brand-primary/10 text-xs font-bold text-brand-primary">
                            {pInitials}
                          </span>
                          <div className="min-w-0">
                            <p className="font-semibold text-xs text-slate-900 truncate dark:text-slate-100">
                              {user?.name ?? `User #${p.userId}`}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate dark:text-slate-400">{user?.email}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <FormSelect
                            size="sm"
                            className="w-36 sm:w-40"
                            buttonClassName="bg-white shadow-2xs font-semibold"
                            value={p.role}
                            onChange={(role) =>
                              form.setValue(
                                `participants.${index}.role`,
                                role as "LEAD" | "CO_INTERVIEWER" | "NOTE_TAKER",
                              )
                            }
                            options={[
                              {
                                value: "LEAD",
                                label: getRoleLabel("LEAD"),
                                badge: (
                                  <span className="rounded-md bg-blue-50 text-blue-700 px-1.5 py-0.5 text-[9px] font-bold">
                                    {PARTICIPANT_ROLE_I18N.LEAD.badge?.[locale] ?? "Chủ trì"}
                                  </span>
                                ),
                              },
                              { value: "CO_INTERVIEWER", label: getRoleLabel("CO_INTERVIEWER") },
                              { value: "NOTE_TAKER", label: getRoleLabel("NOTE_TAKER") },
                            ]}
                          />

                          {checkAvailabilityMutation.data && (
                            <span
                              className={cn(
                                "rounded-full px-2 py-0.5 text-[10px] font-semibold border",
                                isConflict
                                  ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300",
                              )}
                            >
                              {isConflict ? "Trùng lịch" : "Rảnh"}
                            </span>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              form.setValue(
                                "participants",
                                values.participants.filter((v) => v.userId !== p.userId),
                              );
                              checkAvailabilityMutation.reset();
                            }}
                            className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Xóa khỏi hội đồng"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Thông báo kết quả kiểm tra lịch */}
                {checkAvailabilityMutation.data && (
                  <p
                    role="status"
                    className={cn(
                      "text-xs font-medium pt-1",
                      checkAvailabilityMutation.data.available ? "text-emerald-600" : "text-rose-600",
                    )}
                  >
                    {checkAvailabilityMutation.data.available
                      ? "✓ Ứng viên và hội đồng đều rảnh trong khung giờ này."
                      : "⚠️ Có thành viên bị trùng lịch. Hãy chọn khung giờ hoặc đổi người phỏng vấn."}
                  </p>
                )}
              </div>
            </section>

            {/* MỤC 4: THƯ MỜI & GHI CHÚ */}
            <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
                <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span className="grid size-6 place-items-center rounded-lg bg-[var(--color-primary-soft)] text-xs font-bold text-brand-primary">
                    4
                  </span>
                  <Mail className="size-4 text-brand-primary" />
                  <span>Thư mời & Ghi chú</span>
                </h2>
                <button
                  type="button"
                  onClick={() => setShowEmailPreview((v) => !v)}
                  className="text-xs font-semibold text-brand-primary hover:underline cursor-pointer"
                >
                  {showEmailPreview ? "Đóng xem trước" : "Xem trước email mời"}
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Mẫu email mời
                  </label>
                  <FormSelect
                    value={values.emailTemplate}
                    onChange={(val) => form.setValue("emailTemplate", String(val), { shouldValidate: true })}
                    options={(options?.emailTemplates ?? []).map((tpl) => ({
                      value: tpl.code,
                      label: getEmailTemplateLabel(tpl.code, tpl.label),
                    }))}
                  />
                </div>

                {/* Email Live Preview box */}
                {showEmailPreview && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 text-xs space-y-2 dark:border-slate-800 dark:bg-slate-850 animate-in fade-in-50">
                    <p className="font-semibold text-xs text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                      <Mail className="size-3.5 text-brand-primary" />
                      <span>Thư mời gửi tới {selectedCandidate?.name ?? "ứng viên"}:</span>
                    </p>
                    <pre className="whitespace-pre-wrap rounded-xl bg-white p-3 font-sans text-slate-700 border border-slate-200/60 text-xs leading-relaxed dark:bg-slate-900 dark:text-slate-300">
                      {emailPreviewBody}
                    </pre>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                    Ghi chú nội bộ
                  </label>
                  <textarea
                    rows={3}
                    placeholder="Chỉ hiển thị với hội đồng phỏng vấn..."
                    className="w-full rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-xs outline-none hover:border-slate-300 focus:border-brand-primary focus:bg-white focus:ring-2 focus:ring-brand-primary/20 dark:border-slate-700 dark:bg-slate-800/60 dark:text-slate-100"
                    {...form.register("notes")}
                  />
                  <p className="text-[11px] text-slate-400 mt-1">
                    Chỉ hiển thị với hội đồng phỏng vấn, ứng viên sẽ không nhìn thấy nội dung này.
                  </p>
                </div>

                <label className="flex items-center gap-2.5 text-xs text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
                  <input
                    type="checkbox"
                    className="size-4 accent-brand-primary rounded border-slate-300 cursor-pointer"
                    {...form.register("attachCalendar")}
                  />
                  <span>Đính kèm file lịch (.ics)</span>
                </label>
              </div>
            </section>
          </form>
        </div>

        {/* === CỘT PHẢI (4 cols): Thẻ Tóm tắt lịch hẹn (Cố định khi cuộn) === */}
        <aside className="lg:col-span-4 lg:sticky lg:top-[128px] space-y-4">
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="border-b border-slate-100 pb-3 dark:border-slate-800">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                TÓM TẮT LỊCH HẸN
              </span>
            </div>

            {selectedCandidate ? (
              <div className="space-y-3.5 text-xs">
                {/* Thông tin nhanh ứng viên (Avatar chuẩn Họ + Tên LC) */}
                <div className="flex items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-primary/10 text-sm font-bold text-brand-primary">
                    {initials}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-sm text-slate-900 truncate dark:text-slate-100">
                      {selectedCandidate.name}
                    </p>
                    <p className="text-xs text-slate-500 truncate dark:text-slate-400">
                      {selectedCandidate.email}
                    </p>
                  </div>
                </div>

                {/* Recap thông số tinh gọn */}
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3 text-xs space-y-2 dark:border-slate-800 dark:bg-slate-800/50">
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span>{locale === "vi" ? "Vòng:" : locale === "ja" ? "ラウンド:" : "Round:"}</span>
                    <strong className="text-right font-semibold text-slate-900 dark:text-slate-100">
                      {roundLabel}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span>{locale === "vi" ? "Thời gian:" : locale === "ja" ? "日時:" : "Time:"}</span>
                    <strong className="text-right font-semibold text-slate-900 dark:text-slate-100">
                      {values.time} ({values.duration} {locale === "vi" ? "phút" : locale === "ja" ? "分" : "p"}) — {formattedDate}
                    </strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span>{locale === "vi" ? "Hình thức:" : locale === "ja" ? "形式:" : "Format:"}</span>
                    <span className="text-right font-semibold text-brand-primary">
                      {values.mode === "ONLINE"
                        ? (locale === "vi" ? `Trực tuyến (${displayProvider})` : locale === "ja" ? `オンライン (${displayProvider})` : `Online (${displayProvider})`)
                        : (locale === "vi" ? "Tại văn phòng" : locale === "ja" ? "オフィス対面" : "On-site at office")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span>{locale === "vi" ? "Trưởng hội đồng:" : locale === "ja" ? "面接官リーダー:" : "Lead:"}</span>
                    <span className="text-right font-semibold text-slate-900 dark:text-slate-100">
                      {leadInterviewer?.name ?? (locale === "vi" ? "Chưa chỉ định" : locale === "ja" ? "未指定" : "Not assigned")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600 dark:text-slate-400">
                    <span>{locale === "vi" ? "Quy mô:" : locale === "ja" ? "面接官人数:" : "Scale:"}</span>
                    <span className="text-right font-semibold text-slate-900 dark:text-slate-100">
                      {values.participants.length} {locale === "vi" ? "thành viên" : locale === "ja" ? "名" : "members"}
                    </span>
                  </div>
                </div>

                {/* Cụm nút hành động duy nhất trên toàn trang */}
                <div className="pt-2 space-y-2.5">
                  <button
                    type="button"
                    disabled={saveMutation.isPending || !selectedCandidate}
                    onClick={() => submit(false)}
                    className="w-full inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-brand-primary px-5 text-sm font-semibold text-white shadow-xs hover:bg-brand-primary-hover active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
                  >
                    <Send className="size-4" />
                    <span>{saveMutation.isPending ? "Đang lưu..." : "Xác nhận & Gửi mời"}</span>
                  </button>
                  <button
                    type="button"
                    disabled={saveMutation.isPending || !selectedCandidate}
                    onClick={() => submit(true)}
                    className="w-full inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700/60"
                  >
                    <Save className="size-4 text-slate-500" />
                    <span>Lưu nháp</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-slate-400 italic">
                {locale === "vi" ? "Vui lòng chọn ứng viên để xem tóm tắt lịch hẹn" : locale === "ja" ? "面接概要を表示するには候補者を選択してください" : "Please select a candidate to view schedule summary"}
              </div>
            )}
          </div>
        </aside>
      </div>

      {/* Candidate Profile CV Dialog */}
      <DetailDialog
        open={profileOpen}
        title="Hồ sơ ứng viên"
        onClose={() => setProfileOpen(false)}
      >
        {profileQuery.isPending ? (
          <SkeletonCard className="h-48" />
        ) : profileQuery.error ? (
          <p role="alert" className="text-xs text-rose-600">{getApiErrorMessage(profileQuery.error)}</p>
        ) : (
          <div className="space-y-3.5 text-xs">
            <div>
              <h3 className="font-bold text-sm text-slate-900">{profileQuery.data?.data.candidateName}</h3>
              <p className="text-slate-500">{profileQuery.data?.data.candidateEmail}</p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-1">
              <p>
                Sàng lọc CV: <strong className="text-brand-primary">{profileQuery.data?.data.cvScreeningStatus ?? "ĐẠT"}</strong>
              </p>
              {profileQuery.data?.data.gateScore && (
                <p>
                  Điểm Gate Score: <strong className="font-semibold text-emerald-600">{profileQuery.data.data.gateScore.score}/100</strong>
                </p>
              )}
            </div>

            <div className="space-y-2">
              <p className="font-semibold text-slate-700">Tệp đính kèm CV:</p>
              {profileQuery.data?.data.cvs.map((cv) => (
                <div key={cv.id} className="flex items-center justify-between rounded-xl border border-slate-200 p-2.5">
                  <div className="flex items-center gap-2">
                    <FileText className="size-4 text-brand-primary" />
                    <span>{cv.originalFilename}</span>
                  </div>
                  <button
                    type="button"
                    disabled={cv.expired}
                    onClick={() =>
                      void cvApi
                        .file(cv.id)
                        .then((blob) => downloadInterview(blob, cv.originalFilename))
                        .catch((e) => toast.error(getApiErrorMessage(e)))
                    }
                    className="font-semibold text-brand-primary hover:underline cursor-pointer"
                  >
                    Tải CV
                  </button>
                </div>
              ))}
              {!profileQuery.data?.data.cvs.length && (
                <p className="text-slate-400 italic">Chưa có tệp CV đính kèm.</p>
              )}
            </div>
          </div>
        )}
      </DetailDialog>
    </div>
  );
}
