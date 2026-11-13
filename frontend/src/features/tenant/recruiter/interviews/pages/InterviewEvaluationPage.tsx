import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  Clock,
  Download,
  ExternalLink,
  Eye,
  FileCheck,
  FileText,
  Film,
  FolderUp,
  Link as LinkIcon,
  LoaderCircle,
  Mail,
  Maximize,
  Pause,
  Pencil,
  Play,
  Plus,
  RotateCcw,
  RotateCw,
  Send,
  Sparkles,
  Star,
  Trash2,
  Upload,
  Users,
  Video,
  Volume2,
  VolumeX,
} from "lucide-react";
import { humanInterviewApi } from "@/api/tenant/humanInterviewApi";
import type { VideoChapter } from "@/api/types/humanInterview";
import { applicantApi } from "@/api/tenant/applicantApi";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { useUiStore } from "@/stores/uiStore";
import { formatDate, formatTime, useLocale, useT } from "@/i18n";
import { getApiErrorMessage } from "@/lib/axios";
import { cn } from "@/lib/utils";
import { toast } from "@/stores/toastStore";
import { Skeleton, SkeletonCard } from "@/components/ux/Skeleton";
import { Tooltip } from "@/components/ux/Tooltip";
import { DetailDialog } from "@/components/ux/DetailDialog";
import { useRecruitmentJob } from "../../jobs/components/JobRecruitmentWorkspace";
import { getRoundLabel } from "../components/humanInterviewUi";

function InfoHint({ text }: { text: string }) {
  return (
    <Tooltip content={<span className="max-w-xs block leading-relaxed text-xs">{text}</span>} side="top">
      <span
        tabIndex={0}
        role="button"
        aria-label="Xem giải thích"
        className="inline-grid size-4 place-items-center rounded-full border border-slate-300/80 bg-slate-100 text-[10px] font-extrabold text-slate-500 transition-colors hover:border-brand-primary hover:bg-brand-primary hover:text-white focus:outline-none focus:ring-1 focus:ring-brand-primary cursor-help dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-brand-primary dark:hover:text-white shrink-0 select-none"
      >
        !
      </span>
    </Tooltip>
  );
}

const SCORE_BY_RATING = [0, 20, 40, 60, 80, 100] as const;

const PROVIDER_DISPLAY_MAP: Record<string, string> = {
  GOOGLE_MEET: "Google Meet",
  SMARTHIRE: "SmartHire",
  ZOOM: "Zoom",
  TEAMS: "Microsoft Teams",
  OFFICE: "Tại văn phòng",
};

const RUBRIC_DISPLAY_MAP: Record<string, string> = {
  TECHNICAL: "Kỹ thuật",
  CULTURE: "Văn hóa & Phù hợp",
  EXECUTIVE: "Lãnh đạo & Quản lý",
  GENERAL: "Tổng hợp",
};

function scoreToRating(score: number | null | undefined): number {
  if (score == null || Number.isNaN(score)) return 4;
  return [1, 2, 3, 4, 5].reduce((best, n) =>
    Math.abs(SCORE_BY_RATING[n] - score) < Math.abs(SCORE_BY_RATING[best] - score) ? n : best,
  );
}

const VIDEO_CHAPTERS = [
  { time: 0, label: "00:00 - Giới thiệu & Warm-up", desc: "Tổng quan kinh nghiệm và giới thiệu bản thân" },
  { time: 330, label: "05:30 - Kiến trúc Hệ thống & Microservices", desc: "Thiết kế High-Availability và xử lý distributed system" },
  { time: 1120, label: "18:40 - Live Coding Canvas & Thuật toán", desc: "Xử lý Concurrency, Deadlock & Caching Redis" },
  { time: 1980, label: "33:00 - Văn hóa Doanh nghiệp & Teamwork", desc: "Khả năng phối hợp liên phòng ban và giải quyết xung đột" },
  { time: 2460, label: "41:00 - Ứng viên đặt câu hỏi & Bế mạc", desc: "Hỏi đáp về lộ trình thăng tiến và định hướng công nghệ" },
];

export function InterviewEvaluationPage() {
  const t = useT();
  const locale = useLocale();
  const job = useRecruitmentJob();
  const client = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const { interviewId: rawInterviewId } = useParams<{ interviewId?: string }>();
  const interviewId = rawInterviewId && /^\d+$/.test(rawInterviewId) ? Number(rawInterviewId) : 0;

  // Active Tab
  const [activeTab, setActiveTab] = useState<"recording" | "rubric" | "myScorecard">("recording");

  // Video Player state
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const duration = 2712; // ~45 mins
  const [isMuted, setIsMuted] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  // My Scorecard form state
  const [myTechRating, setMyTechRating] = useState<number>(4);
  const [myCommRating, setMyCommRating] = useState<number>(4);
  const [myCultureRating, setMyCultureRating] = useState<number>(4);
  const [myComments, setMyComments] = useState<string>("");
  const [myRecommendation, setMyRecommendation] = useState<"STRONG_HIRE" | "HIRE" | "NO_HIRE" | "STRONG_NO_HIRE">("HIRE");
  const [finalizeDecision, setFinalizeDecision] = useState(false);

  // Queries
  const interviewQuery = useQuery({
    queryKey: ["human-interviews", "detail", interviewId],
    queryFn: () => humanInterviewApi.get(interviewId),
    enabled: interviewId > 0,
    refetchInterval: 15_000,
  });

  const interview = interviewQuery.data;

  const applicantQuery = useQuery({
    queryKey: ["applications", interview?.applicationId],
    queryFn: () => applicantApi.get(interview!.applicationId),
    enabled: Boolean(interview?.applicationId),
  });

  // Check if current user is participant
  const myParticipant = useMemo(
    () => interview?.participants.find((p) => p.userId === user?.id || p.email === user?.email),
    [interview, user],
  );
  const isLead = myParticipant?.role === "LEAD";
  const canEvaluate = Boolean(myParticipant && myParticipant.role !== "NOTE_TAKER");
  const myExistingEval = useMemo(
    () => interview?.evaluations.find((e) => e.evaluatorId === user?.id || (myParticipant && e.evaluatorName === myParticipant.name)),
    [interview, user, myParticipant],
  );

  const applicant = applicantQuery.data?.data;
  const applicantClosed = Boolean(
    applicant &&
    (applicant.status === "OFFER" ||
      applicant.status === "REJECTED" ||
      applicant.status === "HIRED" ||
      applicant.status === "WITHDRAWN")
  );
  const applicantStatusDisplay = applicant?.status === "OFFER"
    ? "ĐẠT - ĐỀ NGHỊ NHẬN VIỆC (OFFER)"
    : applicant?.status === "REJECTED"
      ? "TỪ CHỐI (REJECTED)"
      : applicant?.status === "HIRED"
        ? "ĐÃ NHẬN VIỆC (HIRED)"
        : applicant?.status || "";

  // Sync initial values when existing evaluation is loaded or changed
  useEffect(() => {
    if (myExistingEval) {
      setMyTechRating(scoreToRating(myExistingEval.technicalScore));
      setMyCommRating(scoreToRating(myExistingEval.communicationScore));
      setMyCultureRating(scoreToRating(myExistingEval.cultureScore));
      setMyComments(myExistingEval.comments ?? "");
      setMyRecommendation(
        (myExistingEval.recommendation as "STRONG_HIRE" | "HIRE" | "NO_HIRE" | "STRONG_NO_HIRE") || "HIRE",
      );
    }
  }, [myExistingEval]);

  // Calculate composite stats
  const evaluations = interview?.evaluations ?? [];
  const participants = interview?.participants ?? [];
  const evaluatorsCount = participants.filter((p) => p.role !== "NOTE_TAKER").length;

  const avgOverallScore = evaluations.length
    ? Math.round(evaluations.reduce((acc, e) => acc + e.overallScore, 0) / evaluations.length)
    : null;

  const avgTechScore = evaluations.length
    ? Math.round(evaluations.reduce((acc, e) => acc + e.technicalScore, 0) / evaluations.length)
    : null;

  const avgCommScore = evaluations.length
    ? Math.round(evaluations.reduce((acc, e) => acc + e.communicationScore, 0) / evaluations.length)
    : null;

  const avgCultureScore = evaluations.length
    ? Math.round(evaluations.reduce((acc, e) => acc + e.cultureScore, 0) / evaluations.length)
    : null;

  // Submit Evaluation Mutation
  const evaluateMutation = useMutation({
    mutationFn: () =>
      humanInterviewApi.evaluate(interviewId, {
        technicalScore: SCORE_BY_RATING[myTechRating],
        communicationScore: SCORE_BY_RATING[myCommRating],
        cultureScore: SCORE_BY_RATING[myCultureRating],
        comments: myComments.trim(),
        recommendation: myRecommendation,
        finalizeDecision: Boolean(finalizeDecision && isLead && !applicantClosed),
      }),
    onSuccess: async () => {
      toast.success(myExistingEval ? "Đã cập nhật phiếu đánh giá thành công!" : "Đã ghi nhận phiếu đánh giá thành công!");
      await client.invalidateQueries({ queryKey: ["human-interviews"] });
      await client.invalidateQueries({ queryKey: ["human-interviews", "detail", interviewId] });
      await client.invalidateQueries({ queryKey: ["applications", interview?.applicationId] });
    },
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  // Remind participant mutation
  const remindMutation = useMutation({
    mutationFn: () => humanInterviewApi.remind(interviewId),
    onSuccess: () => toast.success("Đã gửi email nhắc nhở hội đồng thành công!"),
    onError: (e) => toast.error(getApiErrorMessage(e)),
  });

  const askConfirm = useUiStore((s) => s.askConfirm);

  // Ingestion Modal State (Phương án 1: Zoom / Meet / Teams / Upload video)
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [uploadTab, setUploadTab] = useState<"file" | "link">("file");

  // File tab state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const filePlatformSource = useMemo(() => {
    const prov = interview?.configuration?.provider;
    if (prov === "ZOOM") return "ZOOM";
    if (prov === "GOOGLE_MEET") return "GOOGLE_MEET";
    if (prov === "TEAMS") return "TEAMS";
    return "UPLOAD";
  }, [interview?.configuration?.provider]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Link tab state
  const [externalUrl, setExternalUrl] = useState("");
  const externalPlatform = useMemo(() => {
    const prov = interview?.configuration?.provider;
    if (prov === "GOOGLE_MEET") return "GOOGLE_DRIVE";
    if (prov === "TEAMS") return "TEAMS_STREAM";
    if (prov === "ZOOM") return "ZOOM_CLOUD";
    return "OTHER";
  }, [interview?.configuration?.provider]);
  const [externalNotes, setExternalNotes] = useState("");

  // Ingestion Mutations
  const uploadRecordingMutation = useMutation({
    mutationFn: (file: File) => humanInterviewApi.uploadRecording(interviewId, file, filePlatformSource),
    onSuccess: async () => {
      toast.success("Đã tải lên và lưu bản ghi phỏng vấn thành công!");
      await client.invalidateQueries({ queryKey: ["human-interviews", "detail", interviewId] });
      await client.invalidateQueries({ queryKey: ["human-interviews"] });
      setUploadModalOpen(false);
      setSelectedFile(null);
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  const attachLinkMutation = useMutation({
    mutationFn: () =>
      humanInterviewApi.attachRecordingLink(interviewId, {
        recordingUrl: externalUrl.trim(),
        recordingType: externalPlatform,
        source: externalPlatform,
      }),
    onSuccess: async () => {
      toast.success("Đã đính kèm liên kết bản ghi thành công!");
      await client.invalidateQueries({ queryKey: ["human-interviews", "detail", interviewId] });
      await client.invalidateQueries({ queryKey: ["human-interviews"] });
      setUploadModalOpen(false);
      setExternalUrl("");
      setExternalNotes("");
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  const removeRecordingMutation = useMutation({
    mutationFn: () => humanInterviewApi.removeRecording(interviewId),
    onSuccess: async () => {
      toast.success("Đã gỡ bản ghi phỏng vấn.");
      await client.invalidateQueries({ queryKey: ["human-interviews", "detail", interviewId] });
      await client.invalidateQueries({ queryKey: ["human-interviews"] });
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  const handleConfirmRemoveRecording = () => {
    askConfirm({
      title: "Gỡ bản ghi phỏng vấn?",
      description: "Bạn có chắc chắn muốn gỡ video bản ghi này khỏi buổi phỏng vấn? Thao tác này sẽ xóa đường dẫn bản ghi và chuyển player về video mẫu.",
      confirmLabel: "Xác nhận gỡ",
      danger: true,
      onConfirm: async () => {
        await removeRecordingMutation.mutateAsync();
      },
    });
  };

  const conf = interview?.configuration;
  const hasRealRecording = Boolean(conf?.recordingUrl);
  const [showDemoPreview, setShowDemoPreview] = useState(false);
  const showPlayer = hasRealRecording || showDemoPreview;
  const effectiveVideoUrl = conf?.recordingUrl || "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";

  // Check if it's an external web page link (e.g. Zoom cloud viewer or Google Drive viewer)
  const isExternalWebLink = Boolean(
    conf?.recordingUrl &&
    !conf.recordingUrl.endsWith(".mp4") &&
    !conf.recordingUrl.endsWith(".webm") &&
    !conf.recordingUrl.endsWith(".mov") &&
    !conf.recordingUrl.startsWith("/api/v1/interviews/recordings/file/") &&
    (conf.recordingUrl.includes("drive.google.com") ||
      conf.recordingUrl.includes("zoom.us") ||
      conf.recordingUrl.includes("sharepoint.com") ||
      conf.recordingUrl.includes("teams.microsoft.com") ||
      conf.recordingUrl.includes("onedrive.live.com"))
  );

  const recordingSourceInfo = useMemo(() => {
    if (!conf?.recordingUrl) {
      return {
        badge: "Bản ghi demo mẫu",
        color: "bg-slate-800/80 text-slate-300 border-slate-700",
        description: "Hệ thống đang hiển thị video mẫu để bạn thử nghiệm tính năng chấm điểm và mốc thời gian.",
        isDemo: true,
      };
    }
    if (conf.recordingSource === "SMARTHIRE_RECORDER" || conf.provider === "SMARTHIRE") {
      return {
        badge: "SmartHire Room (WebRTC)",
        color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
        description: "Bản ghi trực tiếp được ghi lại từ phòng họp SmartHire Room.",
        isDemo: false,
      };
    }
    if (conf.recordingSource === "ZOOM" || conf.recordingType === "ZOOM_CLOUD" || conf.provider === "ZOOM") {
      return {
        badge: "Zoom Meeting",
        color: "bg-blue-500/20 text-blue-300 border-blue-500/40",
        description: "Bản ghi phỏng vấn được nạp từ Zoom Cloud / tệp ghi hình Zoom.",
        isDemo: false,
      };
    }
    if (conf.recordingSource === "GOOGLE_MEET" || conf.recordingType === "GOOGLE_DRIVE" || conf.provider === "GOOGLE_MEET") {
      return {
        badge: "Google Meet",
        color: "bg-teal-500/20 text-teal-300 border-teal-500/40",
        description: "Bản ghi phỏng vấn từ Google Meet / Google Drive.",
        isDemo: false,
      };
    }
    if (conf.recordingSource === "TEAMS" || conf.recordingType === "TEAMS_STREAM" || conf.provider === "TEAMS") {
      return {
        badge: "Microsoft Teams",
        color: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40",
        description: "Bản ghi phỏng vấn từ Microsoft Teams / Stream.",
        isDemo: false,
      };
    }
    return {
      badge: "Tệp tải lên (.mp4/.webm)",
      color: "bg-violet-500/20 text-violet-300 border-violet-500/40",
      description: "Tệp video được tải lên trực tiếp từ máy tính.",
      isDemo: false,
    };
  }, [conf]);

  // Video controls
  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      void videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const seekTo = (seconds: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = seconds;
    setCurrentTime(seconds);
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const handleSpeedChange = (speed: number) => {
    if (videoRef.current) {
      videoRef.current.playbackRate = speed;
      setPlaybackSpeed(speed);
    }
  };

  const formatSeconds = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  // Chapters State & Mutations
  const [addChapterModalOpen, setAddChapterModalOpen] = useState(false);
  const [newChapterTime, setNewChapterTime] = useState("00:00");
  const [newChapterLabel, setNewChapterLabel] = useState("");
  const [newChapterDesc, setNewChapterDesc] = useState("");

  const isDemoTimeline = !hasRealRecording || showDemoPreview;
  const realChapters = useMemo<VideoChapter[]>(() => {
    if (conf?.chapters && Array.isArray(conf.chapters)) {
      return [...conf.chapters].sort((a, b) => a.time - b.time);
    }
    return [];
  }, [conf?.chapters]);

  const displayedChapters = isDemoTimeline ? VIDEO_CHAPTERS : realChapters;

  const updateChaptersMutation = useMutation({
    mutationFn: (newChapters: VideoChapter[]) => humanInterviewApi.updateChapters(interviewId, newChapters),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["human-interviews", "detail", interviewId] });
      await client.invalidateQueries({ queryKey: ["human-interviews"] });
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  const extractAiChaptersMutation = useMutation({
    mutationFn: () => humanInterviewApi.extractAiChapters(interviewId),
    onSuccess: async () => {
      toast.success("AI đã bóc tách mốc thời gian thành công theo Barem!");
      await client.invalidateQueries({ queryKey: ["human-interviews", "detail", interviewId] });
      await client.invalidateQueries({ queryKey: ["human-interviews"] });
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  const handleOpenAddChapter = () => {
    setNewChapterTime(formatSeconds(currentTime));
    setNewChapterLabel("");
    setNewChapterDesc("");
    setAddChapterModalOpen(true);
  };

  const handleSaveNewChapter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChapterLabel.trim()) return;
    const parts = newChapterTime.split(":");
    let totalSec = 0;
    if (parts.length === 2) {
      totalSec = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    } else {
      totalSec = parseInt(newChapterTime, 10) || 0;
    }
    const chapterObj: VideoChapter = {
      time: Math.max(0, totalSec),
      label: `${newChapterTime} - ${newChapterLabel.trim()}`,
      desc: newChapterDesc.trim() || undefined,
    };
    const nextList = [...realChapters, chapterObj].sort((a, b) => a.time - b.time);
    updateChaptersMutation.mutate(nextList, {
      onSuccess: () => {
        toast.success("Đã thêm mốc thời gian thành công!");
        setAddChapterModalOpen(false);
      },
    });
  };

  const handleDeleteChapter = (idxToDelete: number) => {
    const nextList = realChapters.filter((_, idx) => idx !== idxToDelete);
    updateChaptersMutation.mutate(nextList, {
      onSuccess: () => {
        toast.success("Đã xóa mốc thời gian.");
      },
    });
  };

  // Export Scorecard summary
  const handleExportSummary = () => {
    if (!interview) return;
    const lines = [
      `BÁO CÁO ĐÁNH GIÁ PHỎNG VẤN TRỰC TIẾP`,
      `==================================`,
      `Ứng viên: ${interview.candidateName} (${interview.candidateEmail})`,
      `Vị trí: ${interview.jobTitle}`,
      `Vòng phỏng vấn: ${getRoundLabel(interview.round, t)}`,
      `Thời gian: ${formatDate(interview.start, undefined, locale)} (${formatTime(interview.start, { hour: "2-digit", minute: "2-digit" }, locale)} - ${formatTime(interview.end, { hour: "2-digit", minute: "2-digit" }, locale)})`,
      `Hình thức: ${interview.mode === "ONLINE" ? `Online (${interview.configuration.provider})` : `Trực tiếp (${interview.location})`}`,
      `Trạng thái: ${interview.status}`,
      ``,
      `KẾT QUẢ ĐÁNH GIÁ TỔNG HỢP:`,
      `------------------------`,
      `Điểm tổng kết: ${avgOverallScore != null ? `${avgOverallScore}/100` : "Chưa hoàn tất"}`,
      `Điểm Kỹ thuật: ${avgTechScore != null ? `${avgTechScore}/100` : "N/A"}`,
      `Điểm Giao tiếp: ${avgCommScore != null ? `${avgCommScore}/100` : "N/A"}`,
      `Điểm Văn hóa: ${avgCultureScore != null ? `${avgCultureScore}/100` : "N/A"}`,
      ``,
      `CHI TIẾT PHIẾU ĐÁNH GIÁ TỪNG THÀNH VIÊN:`,
      `--------------------------------------`,
      ...evaluations.map(
        (e) =>
          `- Giám khảo: ${e.evaluatorName} | Điểm: ${e.overallScore}/100 | Đề xuất: ${e.recommendation}\n  Nhận xét: ${e.comments || "Không có ghi chú"}`,
      ),
    ];
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `scorecard-${interview.candidateName.replace(/\s+/g, "_")}-${interview.id}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Đã xuất biên bản đánh giá thành công.");
  };

  const handleDownloadVideo = () => {
    if (!conf?.recordingUrl) {
      toast.info("Đang tải video mẫu demo...");
      const a = document.createElement("a");
      a.href = "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4";
      a.download = `interview-sample-${interview?.id || "demo"}.mp4`;
      a.target = "_blank";
      a.click();
      return;
    }

    if (isExternalWebLink) {
      window.open(conf.recordingUrl, "_blank", "noopener,noreferrer");
      toast.info("Đang mở liên kết bản ghi trên trình duyệt mới...");
      return;
    }

    toast.info("Đang chuẩn bị tải xuống tệp video ghi hình...");
    const a = document.createElement("a");
    a.href = conf.recordingUrl;
    a.download = `interview-recording-${interview?.id || "session"}.mp4`;
    a.target = "_blank";
    a.click();
  };

  if (interviewQuery.isPending) {
    return (
      <div className="space-y-4 p-6">
        <Skeleton className="h-10 w-48 rounded-xl" />
        <SkeletonCard className="h-44" />
        <SkeletonCard className="h-96" />
      </div>
    );
  }

  if (!interview) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <AlertCircle className="size-12 text-rose-500 mb-3" />
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">Không tìm thấy buổi phỏng vấn</h2>
        <p className="text-sm text-slate-500 mt-1 mb-4">Buổi phỏng vấn không tồn tại hoặc bạn không có quyền truy cập.</p>
        <Link
          to={`/recruiter/jobs/${job.id}/interviews`}
          className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white shadow-2xs"
        >
          <ArrowLeft className="size-4" /> Quay lại danh sách
        </Link>
      </div>
    );
  }

  const startTime = formatTime(interview.start, { hour: "2-digit", minute: "2-digit" }, locale);
  const endTime = formatTime(interview.end, { hour: "2-digit", minute: "2-digit" }, locale);
  const startDate = formatDate(interview.start, undefined, locale);

  const displayPlatform =
    interview.mode === "ONLINE"
      ? PROVIDER_DISPLAY_MAP[interview.configuration.provider] || interview.configuration.provider
      : interview.location || "Tại văn phòng";

  const rubricDisplay =
    RUBRIC_DISPLAY_MAP[interview.configuration.rubric] ||
    interview.configuration.rubric ||
    "Kỹ thuật";

  const cvStatus = applicantQuery.data?.data.cvScreeningStatus;
  const cvStatusDisplay =
    cvStatus === "PASSED"
      ? "Đạt"
      : cvStatus === "FAILED"
        ? "Không đạt"
        : cvStatus === "PENDING"
          ? "Đang chờ"
          : "Đạt";

  return (
    <div className="flex flex-col gap-5 pb-16 text-[var(--color-on-surface)] max-w-7xl mx-auto px-2 sm:px-4">
      {/* 1. Header Card: Đồng bộ hoàn toàn với phong cách ApplicantDetailPage */}
      <header className="flex flex-col gap-4 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] px-5 py-4 shadow-2xs lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-center gap-3.5">
          <Link
            to={`/recruiter/jobs/${job.id}/interviews`}
            aria-label="Quay lại danh sách phỏng vấn"
            title="Quay lại danh sách"
            className="grid size-9 shrink-0 place-items-center rounded-full border border-[var(--color-border-default)] bg-[var(--color-surface-alt)] text-slate-700 transition-colors hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-subtle)] hover:text-[var(--color-primary)] cursor-pointer"
          >
            <ArrowLeft className="size-4" aria-hidden="true" />
          </Link>

          <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-primary/10 text-base font-bold text-brand-primary">
            {interview.candidateName
              .split(" ")
              .filter(Boolean)
              .slice(-2)
              .map((w) => w[0])
              .join("")
              .toUpperCase()}
          </span>

          <div className="min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-base font-bold text-slate-900 sm:text-lg">
                {interview.candidateName}
              </h1>
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold",
                  interview.status === "DONE"
                    ? "bg-slate-100 text-slate-700 border border-slate-200 dark:bg-slate-800 dark:text-slate-300"
                    : interview.status === "CONFIRMED"
                      ? "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : "bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300",
                )}
              >
                {interview.status === "DONE" ? "Đã hoàn thành" : interview.status === "CONFIRMED" ? "Đã xác nhận" : "Đang xử lý"}
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                {getRoundLabel(interview.round, t)}
              </span>
            </div>

            <p className="truncate text-xs text-slate-500 sm:text-[13px]">
              {interview.candidateEmail} · {startDate} ({startTime}–{endTime}) · {displayPlatform}
            </p>
          </div>
        </div>

        {/* Action Header Buttons & Composite Score Metric */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-3 lg:border-t-0 lg:pt-0">
          <div className="lg:border-l lg:border-slate-200 lg:pl-5 dark:border-slate-800">
            <div className="flex items-center gap-1.5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Đánh giá chung</p>
              <InfoHint text="Điểm đánh giá tổng hợp từ các thành viên hội đồng phỏng vấn (≥ 80: Mạnh dạn tuyển, ≥ 65: Nên tuyển, < 65: Không tuyển)." />
            </div>
            <p className="mt-0.5 flex items-baseline gap-1.5 tabular-nums">
              <span className="text-xl sm:text-2xl font-bold text-brand-primary">
                {avgOverallScore != null ? avgOverallScore : "—"}
              </span>
              <span className="text-xs text-slate-400">/100</span>
              {evaluations.length > 0 && (
                <span
                  className={cn(
                    "ml-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold border",
                    avgOverallScore && avgOverallScore >= 80
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : avgOverallScore && avgOverallScore >= 65
                        ? "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300"
                        : "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300",
                  )}
                >
                  {avgOverallScore && avgOverallScore >= 80
                    ? "Mạnh dạn tuyển"
                    : avgOverallScore && avgOverallScore >= 65
                      ? "Nên tuyển"
                      : "Không tuyển"}
                </span>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Subtle Meeting Link if online and interview is not completed */}
            {interview.status !== "DONE" &&
              interview.status !== "CANCELLED" &&
              evaluations.length < evaluatorsCount &&
              interview.mode === "ONLINE" &&
              (interview.meetingUrl || interview.configuration.provider === "SMARTHIRE") && (
                <Link
                  to={interview.configuration.provider === "SMARTHIRE" ? `/meet/human/${interview.id}` : interview.meetingUrl!}
                  target={interview.configuration.provider === "SMARTHIRE" ? undefined : "_blank"}
                  className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  title="Mở phòng họp trực tuyến"
                >
                  <Video className="size-3.5 text-slate-400" />
                  <span>Phòng họp</span>
                </Link>
              )}

            <button
              type="button"
              onClick={handleExportSummary}
              className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 cursor-pointer"
            >
              <Download className="size-3.5 text-slate-500" />
              <span>Xuất biên bản</span>
            </button>
          </div>
        </div>
      </header>

      {/* 2. Navigation Tabs Bar: Thẻ Card Nổi Đồng Bộ Stitch Tokens */}
      <nav
        aria-label="Khu vực đánh giá phỏng vấn"
        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-1.5 shadow-2xs"
      >
        <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
          {/* Tab 1: Video ghi hình */}
          <button
            type="button"
            onClick={() => setActiveTab("recording")}
            className={cn(
              "group inline-flex h-9 items-center gap-2 rounded-xl px-3.5 text-xs sm:text-sm font-semibold transition-all cursor-pointer",
              activeTab === "recording"
                ? "bg-[var(--color-primary-soft)] text-brand-primary font-bold shadow-2xs"
                : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200",
            )}
          >
            <Video
              className={cn(
                "size-4 transition-colors",
                activeTab === "recording" ? "text-brand-primary" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300",
              )}
            />
            <span>Video ghi hình</span>
          </button>

          {/* Tab 2: Hội đồng đánh giá */}
          <button
            type="button"
            onClick={() => setActiveTab("rubric")}
            className={cn(
              "group inline-flex h-9 items-center gap-2 rounded-xl px-3.5 text-xs sm:text-sm font-semibold transition-all cursor-pointer",
              activeTab === "rubric"
                ? "bg-[var(--color-primary-soft)] text-brand-primary font-bold shadow-2xs"
                : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200",
            )}
          >
            <FileText
              className={cn(
                "size-4 transition-colors",
                activeTab === "rubric" ? "text-brand-primary" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300",
              )}
            />
            <span>Hội đồng đánh giá ({evaluations.length}/{evaluatorsCount})</span>
          </button>

          {/* Tab 3: Phiếu chấm điểm */}
          <button
            type="button"
            onClick={() => setActiveTab("myScorecard")}
            className={cn(
              "group inline-flex h-9 items-center gap-2 rounded-xl px-3.5 text-xs sm:text-sm font-semibold transition-all cursor-pointer",
              activeTab === "myScorecard"
                ? "bg-[var(--color-primary-soft)] text-brand-primary font-bold shadow-2xs"
                : "text-slate-600 hover:bg-slate-100/70 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200",
            )}
          >
            <FileCheck
              className={cn(
                "size-4 transition-colors",
                activeTab === "myScorecard" ? "text-brand-primary" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300",
              )}
            />
            <span>{canEvaluate ? "Phiếu chấm điểm" : "Phiếu cá nhân"}</span>
            {myExistingEval ? (
              <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800/60">
                <CheckCircle2 className="size-3 text-emerald-600" />
                Đã nộp ({myExistingEval.overallScore}đ)
              </span>
            ) : canEvaluate ? (
              <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-bold text-amber-700 border border-amber-200/60 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800/60">
                Cần chấm
              </span>
            ) : null}
          </button>
        </div>

        {/* Right Info: Barem indicator */}
        <div className="hidden sm:flex items-center gap-2 pr-3 text-xs text-slate-500 dark:text-slate-400">
          <span className="size-1.5 rounded-full bg-brand-primary" />
          <span>Barem: <strong className="font-semibold text-slate-800 dark:text-slate-200">{rubricDisplay}</strong></span>
          <InfoHint text={`Barem tiêu chí đánh giá năng lực ứng viên áp dụng cho buổi phỏng vấn này: ${rubricDisplay}.`} />
        </div>
      </nav>

      {/* TAB 1: VIDEO RECORDING & PLAYBACK / OFFICIAL INGESTION */}
      {activeTab === "recording" && (
        showPlayer ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Demo Notice Banner if viewing demo */}
            {showDemoPreview && !hasRealRecording && (
              <div className="lg:col-span-12 flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-xs text-amber-900 shadow-2xs dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                <div className="flex items-center gap-2">
                  <Eye className="size-4 text-amber-600" />
                  <span className="font-semibold">Đang ở chế độ xem trước player video mẫu (Demo Preview).</span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDemoPreview(false)}
                  className="rounded-lg bg-amber-600 px-3 py-1 font-bold text-white hover:bg-amber-500 cursor-pointer transition-colors"
                >
                  Quay lại nạp bản ghi chính thức
                </button>
              </div>
            )}

            {/* Main Video Player (8 cols) */}
            <div className="lg:col-span-8 space-y-4">
              <div className="relative overflow-hidden rounded-2xl bg-slate-950 shadow-lg ring-1 ring-white/10 aspect-video flex flex-col justify-between group">
                {/* Video Element or External Web Link Placeholder */}
                {isExternalWebLink ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center text-white bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900">
                    <div className="size-14 rounded-2xl bg-brand-primary/20 border border-brand-primary/30 flex items-center justify-center text-brand-primary mb-3">
                      <Film className="size-7" />
                    </div>
                    <h4 className="font-bold text-sm sm:text-base">Bản ghi lưu trữ trên Cloud ngoài</h4>
                    <p className="mt-1 text-xs text-slate-400 max-w-md line-clamp-2 font-mono">
                      {conf?.recordingUrl}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                      <a
                        href={conf?.recordingUrl || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-xl bg-brand-primary px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-brand-primary-hover transition-colors"
                      >
                        <ExternalLink className="size-3.5" />
                        <span>Mở bản ghi trên {recordingSourceInfo.badge}</span>
                      </a>
                      <button
                        type="button"
                        onClick={() => setUploadModalOpen(true)}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3.5 py-2 text-xs font-semibold text-white hover:bg-white/20 transition-colors cursor-pointer"
                      >
                        <Upload className="size-3.5" />
                        <span>Đổi hoặc nạp tệp video khác</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <video
                    ref={videoRef}
                    src={effectiveVideoUrl}
                    onTimeUpdate={handleTimeUpdate}
                    onEnded={() => setIsPlaying(false)}
                    playsInline
                    className="h-full w-full object-cover"
                    poster="/assets/interview-poster.jpg"
                  />
                )}

                {/* Watermark / Session Info Overlay Top */}
                <div className="absolute top-0 inset-x-0 p-3 bg-gradient-to-b from-black/75 to-transparent flex items-center justify-between text-white text-xs z-30 pointer-events-none">
                  <div className="flex items-center gap-2 pointer-events-auto">
                    <span className="size-2 rounded-full bg-red-500 animate-pulse" />
                    <span className="font-semibold text-slate-100">Bản ghi session #{interview.id}</span>
                    <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold border", recordingSourceInfo.color)}>
                      {recordingSourceInfo.badge}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 pointer-events-auto">
                    <button
                      type="button"
                      onClick={() => setUploadModalOpen(true)}
                      className="inline-flex items-center gap-1 bg-black/60 hover:bg-black/90 px-2.5 py-1 rounded-lg text-[11px] font-medium text-white transition-colors cursor-pointer"
                      title="Nạp bản ghi từ Zoom, Meet, Teams hoặc tệp từ máy tính"
                    >
                      <FolderUp className="size-3 text-sky-400" />
                      <span>Quản lý bản ghi</span>
                    </button>

                    {hasRealRecording && (
                      <button
                        type="button"
                        onClick={handleConfirmRemoveRecording}
                        disabled={removeRecordingMutation.isPending}
                        className="inline-flex items-center gap-1 bg-black/60 hover:bg-rose-900/80 px-2 py-1 rounded-lg text-[11px] font-medium text-rose-300 transition-colors cursor-pointer"
                        title="Gỡ bản ghi này"
                      >
                        <Trash2 className="size-3 text-rose-400" />
                        <span className="hidden sm:inline">Gỡ</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleDownloadVideo}
                      className="inline-flex items-center gap-1 bg-black/60 hover:bg-black/90 px-2 py-1 rounded-lg text-[11px] font-medium text-white transition-colors cursor-pointer"
                      title={isExternalWebLink ? "Mở link bản ghi ngoài" : "Tải video (.mp4)"}
                    >
                      {isExternalWebLink ? <ExternalLink className="size-3 text-brand-primary" /> : <Download className="size-3" />}
                      <span className="hidden sm:inline">{isExternalWebLink ? "Mở link" : "Tải"}</span>
                    </button>
                  </div>
                </div>

                {/* Big Center Play/Pause Button when paused (only for playable videos) */}
                {!isExternalWebLink && !isPlaying && (
                  <button
                    type="button"
                    onClick={togglePlay}
                    className="absolute inset-0 m-auto size-16 rounded-full bg-brand-primary/90 text-white shadow-2xl grid place-items-center hover:scale-105 active:scale-95 transition-all cursor-pointer z-10"
                    aria-label="Phát video"
                  >
                    <Play className="size-7 ml-1 fill-white" />
                  </button>
                )}

                {/* Custom Controls Bar at Bottom (only for playable video) */}
                {!isExternalWebLink && (
                  <div className="absolute bottom-0 inset-x-0 p-3 bg-gradient-to-t from-black/85 via-black/50 to-transparent flex flex-col gap-2 text-white z-20 opacity-95 group-hover:opacity-100 transition-opacity">
                    {/* Scrubber Timeline */}
                    <div className="relative flex items-center">
                      <input
                        type="range"
                        min={0}
                        max={duration}
                        value={currentTime}
                        onChange={(e) => seekTo(Number(e.target.value))}
                        className="w-full h-1.5 bg-white/20 accent-brand-primary rounded-lg appearance-none cursor-pointer"
                      />
                    </div>

                    {/* Control Buttons */}
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={togglePlay}
                          className="hover:text-brand-primary transition-colors cursor-pointer"
                          title={isPlaying ? "Tạm dừng" : "Phát"}
                        >
                          {isPlaying ? <Pause className="size-4 fill-current" /> : <Play className="size-4 fill-current" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => seekTo(Math.max(0, currentTime - 10))}
                          className="hover:text-brand-primary transition-colors cursor-pointer"
                          title="Lùi 10s"
                        >
                          <RotateCcw className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => seekTo(Math.min(duration, currentTime + 10))}
                          className="hover:text-brand-primary transition-colors cursor-pointer"
                          title="Tiến 10s"
                        >
                          <RotateCw className="size-3.5" />
                        </button>
                        <span className="font-mono text-[11px] text-slate-300">
                          {formatSeconds(currentTime)} / {formatSeconds(duration)}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        {/* Volume */}
                        <button
                          type="button"
                          onClick={() => setIsMuted((v) => !v)}
                          className="hover:text-brand-primary transition-colors cursor-pointer"
                        >
                          {isMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
                        </button>

                        {/* Speed Selector */}
                        <div className="flex items-center gap-1 rounded bg-white/10 px-1.5 py-0.5">
                          {[1, 1.25, 1.5].map((spd) => (
                            <button
                              key={spd}
                              type="button"
                              onClick={() => handleSpeedChange(spd)}
                              className={cn(
                                "px-1 text-[10px] font-semibold rounded cursor-pointer",
                                playbackSpeed === spd ? "bg-brand-primary text-white" : "text-slate-300 hover:text-white",
                              )}
                            >
                              {spd}x
                            </button>
                          ))}
                        </div>

                        {/* Fullscreen */}
                        <button
                          type="button"
                          onClick={() => {
                            if (videoRef.current) {
                              if (!document.fullscreenElement) {
                                void videoRef.current.requestFullscreen();
                              } else {
                                void document.exitFullscreen();
                              }
                            }
                          }}
                          className="hover:text-brand-primary transition-colors cursor-pointer"
                        >
                          <Maximize className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Video Metadata Card */}
              <div className="rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-2xs dark:border-slate-800 dark:bg-slate-900 text-xs">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-slate-900 dark:text-slate-100">
                      {hasRealRecording ? "Bản ghi hình buổi phỏng vấn" : "Bản ghi hình trực tuyến · SmartHire Cloud Vault"}
                    </p>
                    <span className={cn("px-2 py-0.5 rounded text-[10px] font-semibold border", recordingSourceInfo.color)}>
                      {recordingSourceInfo.badge}
                    </span>
                    <InfoHint text={recordingSourceInfo.description} />
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-[11px] text-slate-400 font-mono">
                      45:12 · {conf?.recordingSize ? `${(conf.recordingSize / (1024 * 1024)).toFixed(1)} MB` : "485 MB"}
                    </span>
                    <button
                      type="button"
                      onClick={() => setUploadModalOpen(true)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
                    >
                      <Upload className="size-3 text-brand-primary" />
                      <span>Đổi bản ghi</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Chapters & Quick Jump Markers (4 cols) */}
            <div className="lg:col-span-4 space-y-4">
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Clock className="size-4 text-brand-primary" />
                    <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      Mốc thời gian chính
                    </h3>
                    {isDemoTimeline ? (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-400">
                        Demo
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-slate-400">
                        {displayedChapters.length} mốc
                      </span>
                    )}
                  </div>

                  {/* Actions for real recording */}
                  {!isDemoTimeline && (
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={extractAiChaptersMutation.isPending}
                        onClick={() => extractAiChaptersMutation.mutate()}
                        className="inline-flex items-center gap-1 rounded-lg border border-purple-200 bg-purple-50/80 px-2 py-1 text-[11px] font-semibold text-purple-700 hover:bg-purple-100 transition-colors cursor-pointer dark:border-purple-900/60 dark:bg-purple-950/40 dark:text-purple-300 disabled:opacity-50"
                        title="Bóc tách mốc thời gian tự động bằng AI theo Barem"
                      >
                        {extractAiChaptersMutation.isPending ? (
                          <LoaderCircle className="size-3 animate-spin" />
                        ) : (
                          <Sparkles className="size-3 text-purple-600 dark:text-purple-400" />
                        )}
                        <span>{extractAiChaptersMutation.isPending ? "Đang xử lý..." : "Bóc tách AI"}</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleOpenAddChapter}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                        title="Thêm mốc thời gian thủ công tại thời điểm hiện tại"
                      >
                        <Plus className="size-3 text-brand-primary" />
                        <span>Thêm mốc</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Empty State when real recording has no chapters yet */}
                {!isDemoTimeline && displayedChapters.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-4 text-center dark:border-slate-800 dark:bg-slate-850/50 space-y-3">
                    <div className="size-9 rounded-full bg-purple-100 text-purple-600 dark:bg-purple-950/60 dark:text-purple-300 mx-auto flex items-center justify-center">
                      <Sparkles className="size-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-xs text-slate-800 dark:text-slate-200">
                        Chưa có mốc thời gian nào
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">
                        Bạn có thể dùng AI để tự động bóc tách các phân đoạn theo Barem hoặc ghim mốc thủ công.
                      </p>
                    </div>
                    <div className="pt-1 flex flex-col sm:flex-row gap-2 justify-center">
                      <button
                        type="button"
                        disabled={extractAiChaptersMutation.isPending}
                        onClick={() => extractAiChaptersMutation.mutate()}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-purple-700 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {extractAiChaptersMutation.isPending ? (
                          <LoaderCircle className="size-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="size-3.5" />
                        )}
                        <span>{extractAiChaptersMutation.isPending ? "Đang phân tích..." : "Trích xuất mốc bằng AI"}</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleOpenAddChapter}
                        className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors cursor-pointer"
                      >
                        <Plus className="size-3.5" />
                        <span>Thêm mốc</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {displayedChapters.map((ch, idx) => (
                      <div
                        key={idx}
                        className="group relative flex items-center rounded-xl border border-slate-100 bg-slate-50/70 hover:border-brand-primary/40 hover:bg-[var(--color-primary-soft)] transition-all dark:border-slate-800 dark:bg-slate-850"
                      >
                        <button
                          type="button"
                          onClick={() => seekTo(ch.time)}
                          className="flex-1 text-left p-2.5 cursor-pointer"
                        >
                          <p className="font-semibold text-xs text-slate-800 group-hover:text-brand-primary transition-colors dark:text-slate-200">
                            {ch.label}
                          </p>
                          {ch.desc && (
                            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-1 dark:text-slate-400">
                              {ch.desc}
                            </p>
                          )}
                        </button>

                        {!isDemoTimeline && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteChapter(idx);
                            }}
                            className="mr-2.5 opacity-0 group-hover:opacity-100 p-1 rounded-md text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-all cursor-pointer"
                            title="Xóa mốc này"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Quick Candidate Application Info */}
              <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Hồ sơ ứng viên</h3>
                  <Link
                    to={`/recruiter/jobs/${job.id}/applicants/${interview.applicationId}`}
                    className="text-xs font-semibold text-brand-primary hover:underline cursor-pointer"
                  >
                    Chi tiết hồ sơ
                  </Link>
                </div>
                <p className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <span>Sàng lọc CV:</span>
                  <strong className="text-emerald-600 font-semibold">{cvStatusDisplay}</strong>
                  <InfoHint text="Kết quả đánh giá và sàng lọc hồ sơ CV ban đầu của ứng viên qua mô hình AI." />
                </p>
                <div className="pt-1 flex gap-2">
                  <Link
                    to={`/recruiter/jobs/${job.id}/cvs`}
                    className="flex-1 text-center rounded-lg border border-slate-200 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                  >
                    Xem CV bóc tách
                  </Link>
                  <Link
                    to={`/recruiter/jobs/${job.id}/rank`}
                    className="flex-1 text-center rounded-lg border border-slate-200 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                  >
                    Xếp hạng
                  </Link>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* GIAO DIỆN CHÍNH THỨC: NẠP BẢN GHI PHỎNG VẤN TRỰC TIẾP (KHÔNG HIỂN THỊ MẪU) */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left: Dedicated Ingestion Workspace (8 cols) */}
            <div className="lg:col-span-8 space-y-4">
              <div className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-5 sm:p-6 shadow-2xs space-y-5">
                {/* Header Info */}
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4 dark:border-slate-800">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span
                      className={cn(
                        "px-3 py-1 rounded-full text-xs font-bold border flex items-center gap-1.5",
                        interview.configuration.provider === "ZOOM"
                          ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300"
                          : interview.configuration.provider === "GOOGLE_MEET"
                            ? "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300"
                            : interview.configuration.provider === "TEAMS"
                              ? "bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300"
                              : "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300",
                      )}
                    >
                      <Video className="size-3.5" />
                      <span>Hình thức: {displayPlatform}</span>
                    </span>
                    <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[11px] font-semibold text-amber-700 border border-amber-200 dark:bg-amber-950/40 dark:text-amber-300">
                      Chưa có video ghi hình
                    </span>
                    <InfoHint
                      text={
                        interview.configuration.provider === "ZOOM"
                          ? "Buổi phỏng vấn được thực hiện qua Zoom Meeting. Bạn có thể tải lên tệp video (.mp4) hoặc dán link Zoom Cloud Recording để hội đồng đối sánh và chấm điểm."
                          : interview.configuration.provider === "GOOGLE_MEET"
                            ? "Buổi phỏng vấn được thực hiện qua Google Meet. Bạn có thể tải lên video ghi hình từ Google Drive hoặc dán đường link Drive để hội đồng chấm điểm."
                            : interview.configuration.provider === "TEAMS"
                              ? "Buổi phỏng vấn được thực hiện qua Microsoft Teams. Bạn có thể tải lên video hoặc dán liên kết Teams / Stream / OneDrive để thẩm định."
                              : interview.configuration.provider === "SMARTHIRE"
                                ? "Buổi phỏng vấn qua SmartHire Room. Bản ghi có thể được tạo trực tiếp từ phòng họp, hoặc bạn có thể tải lên tệp ghi hình thủ công tại đây."
                                : "Vui lòng tải lên tệp video hoặc dán liên kết xem trực tuyến để phục vụ công tác chấm điểm của hội đồng."
                      }
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowDemoPreview(true)}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-brand-primary dark:text-slate-500 cursor-pointer transition-colors"
                    title="Xem thử giao diện trình phát mẫu"
                  >
                    <Eye className="size-3.5" />
                    <span>Xem player mẫu (Demo)</span>
                  </button>
                </div>

                {/* Tabs Switcher: Tải file vs Dán Link */}
                <div className="flex border-b border-slate-200 dark:border-slate-800 gap-6">
                  <button
                    type="button"
                    onClick={() => setUploadTab("file")}
                    className={cn(
                      "pb-3 font-bold text-xs sm:text-sm transition-colors cursor-pointer border-b-2 flex items-center gap-2",
                      uploadTab === "file"
                        ? "border-brand-primary text-brand-primary"
                        : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200",
                    )}
                  >
                    <Upload className="size-4" />
                    <span>Tải tệp video</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setUploadTab("link")}
                    className={cn(
                      "pb-3 font-bold text-xs sm:text-sm transition-colors cursor-pointer border-b-2 flex items-center gap-2",
                      uploadTab === "link"
                        ? "border-brand-primary text-brand-primary"
                        : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200",
                    )}
                  >
                    <LinkIcon className="size-4" />
                    <span>Dán liên kết</span>
                  </button>
                </div>

                {/* TAB A: TẢI FILE TRỰC TIẾP */}
                {uploadTab === "file" && (
                  <div className="space-y-4">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) setSelectedFile(f);
                      }}
                      className="hidden"
                    />

                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        "border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3",
                        selectedFile
                          ? "border-brand-primary bg-brand-primary/5 ring-2 ring-brand-primary/20"
                          : "border-slate-300 hover:border-brand-primary/60 bg-slate-50/60 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-850",
                      )}
                    >
                      <div
                        className={cn(
                          "size-14 rounded-2xl flex items-center justify-center transition-colors shadow-2xs",
                          selectedFile
                            ? "bg-brand-primary text-white"
                            : "bg-slate-200/80 text-slate-600 dark:bg-slate-700 dark:text-slate-300",
                        )}
                      >
                        {selectedFile ? <FileCheck className="size-7" /> : <FolderUp className="size-7" />}
                      </div>
                      {selectedFile ? (
                        <div className="space-y-1">
                          <p className="font-bold text-sm text-brand-primary">{selectedFile.name}</p>
                          <p className="text-xs text-slate-500">
                            Dung lượng: {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB · Nhấp vào đây để chọn tệp khác
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <p className="font-bold text-sm text-slate-800 dark:text-slate-200">
                            Kéo thả tệp video vào đây hoặc <span className="text-brand-primary underline">chọn tệp từ máy tính</span>
                          </p>
                          <p className="text-xs text-slate-400">
                            Định dạng hỗ trợ: .mp4, .webm, .mov · Dung lượng tối đa: 500 MB
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex justify-end pt-2">
                      <button
                        type="button"
                        disabled={!selectedFile || uploadRecordingMutation.isPending}
                        onClick={() => selectedFile && uploadRecordingMutation.mutate(selectedFile)}
                        className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-primary px-6 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-brand-primary-hover disabled:opacity-50 transition-all cursor-pointer"
                      >
                        {uploadRecordingMutation.isPending ? (
                          <LoaderCircle className="size-4 animate-spin" />
                        ) : (
                          <Upload className="size-4" />
                        )}
                        <span>
                          {uploadRecordingMutation.isPending ? "Đang tải lên và mã hóa..." : "Tải lên & Lưu bản ghi"}
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                {/* TAB B: DÁN LINK CLOUD NGOÀI */}
                {uploadTab === "link" && (
                  <div className="space-y-4 pt-1">
                    <div>
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                        Đường dẫn liên kết bản ghi (URL) *
                      </label>
                      <input
                        type="url"
                        value={externalUrl}
                        onChange={(e) => setExternalUrl(e.target.value)}
                        placeholder={
                          interview.configuration.provider === "ZOOM"
                            ? "https://zoom.us/rec/play/..."
                            : interview.configuration.provider === "GOOGLE_MEET"
                              ? "https://drive.google.com/file/d/..."
                              : "https://teams.microsoft.com/... hoặc link chia sẻ OneDrive"
                        }
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-brand-primary focus:bg-white focus:ring-2 focus:ring-brand-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                        Mật mã mở xem / Ghi chú truy cập (nếu có)
                      </label>
                      <input
                        type="text"
                        value={externalNotes}
                        onChange={(e) => setExternalNotes(e.target.value)}
                        placeholder="Ví dụ: Passcode Zoom: Abc#2026 (nếu có yêu cầu mật khẩu)..."
                        className="w-full rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-brand-primary focus:bg-white focus:ring-2 focus:ring-brand-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                      />
                    </div>

                    <div className="pt-2 flex justify-end">
                      <button
                        type="button"
                        disabled={!externalUrl.trim() || attachLinkMutation.isPending}
                        onClick={() => attachLinkMutation.mutate()}
                        className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-primary px-6 text-xs sm:text-sm font-semibold text-white shadow-xs hover:bg-brand-primary-hover disabled:opacity-50 transition-all cursor-pointer"
                      >
                        {attachLinkMutation.isPending ? (
                          <LoaderCircle className="size-4 animate-spin" />
                        ) : (
                          <Check className="size-4" />
                        )}
                        <span>
                          {attachLinkMutation.isPending ? "Đang lưu liên kết..." : "Lưu liên kết bản ghi"}
                        </span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right: Interview Overview & Guidance (4 cols) */}
            <div className="lg:col-span-4 space-y-4">

              <div className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-4 shadow-2xs space-y-2.5 text-xs">
                <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Sparkles className="size-4 text-sky-500" />
                  Hướng dẫn nạp video {displayPlatform}
                </h3>
                <div className="space-y-2 text-slate-600 dark:text-slate-400 leading-relaxed text-[11px]">
                  {interview.configuration.provider === "ZOOM" ? (
                    <>
                      <p>1. Đăng nhập vào Zoom và vào mục <strong>Cloud Recordings</strong> để lấy link chia sẻ hoặc tải tệp <code>.mp4</code> về máy.</p>
                      <p>2. Dán link hoặc kéo thả tệp video vào khu vực bên cạnh.</p>
                      <p>3. Nếu có passcode Zoom, điền vào ô Mật mã để hội đồng dễ dàng xem lại khi chấm điểm.</p>
                    </>
                  ) : interview.configuration.provider === "GOOGLE_MEET" ? (
                    <>
                      <p>1. Bản ghi Google Meet được tự động lưu trong thư mục <strong>Meet Recordings</strong> trên Google Drive của người tạo họp.</p>
                      <p>2. Bạn có thể chia sẻ quyền xem link Drive hoặc tải file <code>.mp4</code> về máy và tải lên tại đây.</p>
                    </>
                  ) : interview.configuration.provider === "TEAMS" ? (
                    <>
                      <p>1. Mở bản ghi cuộc họp trong Microsoft Teams / OneDrive / Stream.</p>
                      <p>2. Sao chép link chia sẻ hoặc tải tệp video về máy tính để nạp vào hệ thống.</p>
                    </>
                  ) : (
                    <>
                      <p>• Trong phòng họp SmartHire Room, người phỏng vấn có thể bấm nút <strong>[Ghi hình REC]</strong> để tự động lưu video vào hồ sơ.</p>
                      <p>• Bạn cũng có thể tải lên tệp video quay ngoài bất kỳ lúc nào.</p>
                    </>
                  )}
                </div>
              </div>

              {/* Quick Candidate Application Info */}
              <div className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">Hồ sơ ứng viên</h3>
                  <Link
                    to={`/recruiter/jobs/${job.id}/applicants/${interview.applicationId}`}
                    className="text-xs font-semibold text-brand-primary hover:underline cursor-pointer"
                  >
                    Chi tiết hồ sơ
                  </Link>
                </div>
                <p className="text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
                  <span>Sàng lọc CV:</span>
                  <strong className="text-emerald-600 font-semibold">{cvStatusDisplay}</strong>
                  <InfoHint text="Kết quả đánh giá và sàng lọc hồ sơ CV ban đầu của ứng viên qua mô hình AI." />
                </p>
                <div className="pt-1 flex gap-2">
                  <Link
                    to={`/recruiter/jobs/${job.id}/cvs`}
                    className="flex-1 text-center rounded-lg border border-slate-200 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                  >
                    Xem CV bóc tách
                  </Link>
                  <Link
                    to={`/recruiter/jobs/${job.id}/rank`}
                    className="flex-1 text-center rounded-lg border border-slate-200 py-1.5 font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300"
                  >
                    Xếp hạng
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )
      )}

      {/* TAB 2: INTERVIEW PANEL & DETAILED RUBRIC SCORECARD */}
      {activeTab === "rubric" && (
        <div className="space-y-6">
          {/* 1. Thành phần Hội đồng phỏng vấn */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3 dark:border-slate-800">
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Users className="size-5 text-brand-primary" />
                  Hội đồng phỏng vấn ({participants.length} thành viên)
                </h2>
                <InfoHint text="Thành phần hội đồng tham gia phỏng vấn và trạng thái nộp phiếu đánh giá năng lực của từng người." />
              </div>
              {evaluations.length < evaluatorsCount && (
                <button
                  type="button"
                  disabled={remindMutation.isPending}
                  onClick={() => remindMutation.mutate()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition-colors cursor-pointer dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300 shadow-2xs"
                >
                  <Mail className="size-3.5" />
                  <span>Nhắc nhở người chưa nộp ({evaluatorsCount - evaluations.length})</span>
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {participants.map((p) => {
                const evalData = evaluations.find((e) => e.evaluatorId === p.userId || e.evaluatorName === p.name);
                const hasEvaluated = Boolean(evalData);
                const isNoteTaker = p.role === "NOTE_TAKER";

                return (
                  <div
                    key={p.userId}
                    className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5 space-y-2.5 dark:border-slate-850 dark:bg-slate-850/60"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-primary/10 text-xs font-bold text-brand-primary mt-0.5">
                        {p.name
                          .split(" ")
                          .filter(Boolean)
                          .slice(-2)
                          .map((w) => w[0])
                          .join("")
                          .toUpperCase()}
                      </span>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="font-bold text-xs sm:text-[13px] text-slate-900 dark:text-slate-100">
                            {p.name}
                          </span>
                          <span
                            className={cn(
                              "rounded-md px-1.5 py-0.5 text-[10px] font-semibold border shrink-0",
                              p.role === "LEAD"
                                ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300"
                                : p.role === "CO_INTERVIEWER"
                                  ? "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300"
                                  : "bg-slate-100 text-slate-600 border border-slate-200 dark:bg-slate-800 dark:text-slate-400",
                            )}
                          >
                            {p.role === "LEAD" ? "Trưởng hội đồng" : p.role === "CO_INTERVIEWER" ? "Người phỏng vấn" : "Thư ký"}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 break-all dark:text-slate-400">{p.email}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-200/60 dark:border-slate-800">
                      <span className="text-slate-500 dark:text-slate-400">Trạng thái:</span>
                      {isNoteTaker ? (
                        <span className="text-slate-400 italic">Thư ký (Không chấm)</span>
                      ) : hasEvaluated ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-600 dark:text-emerald-400">
                          <CheckCircle2 className="size-3.5" />
                          Đã nộp ({evalData?.overallScore}đ)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 font-semibold text-amber-600 dark:text-amber-400">
                          <Clock className="size-3.5" />
                          Chưa nộp phiếu
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 2. Tổng hợp điểm theo Tiêu chí đánh giá */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-center gap-1.5">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <FileCheck className="size-5 text-emerald-600" />
                Điểm trung bình theo tiêu chí đánh giá
              </h2>
              <InfoHint text="Điểm số tổng hợp từ hội đồng phỏng vấn, được quy chuẩn trên thang điểm 100." />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
              {/* Tiêu chí 1: Chuyên môn & Kỹ thuật */}
              <div className="rounded-xl border border-slate-200/70 bg-slate-50/50 p-3.5 space-y-2 dark:border-slate-800 dark:bg-slate-850">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Chuyên môn & Kỹ thuật</span>
                    <InfoHint text="Kiến thức nền tảng, thiết kế hệ thống, thuật toán, live coding canvas và giải quyết bài toán kỹ thuật theo JD." />
                  </div>
                  <span className="font-extrabold text-brand-primary">
                    {avgTechScore != null ? `${avgTechScore}/100` : "—"}
                  </span>
                </div>
                <div className="w-full bg-slate-200/80 rounded-full h-2 dark:bg-slate-700">
                  <div className="bg-brand-primary h-2 rounded-full transition-all" style={{ width: `${avgTechScore ?? 0}%` }} />
                </div>
              </div>

              {/* Tiêu chí 2: Giao tiếp & Làm việc nhóm */}
              <div className="rounded-xl border border-slate-200/70 bg-slate-50/50 p-3.5 space-y-2 dark:border-slate-800 dark:bg-slate-850">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Giao tiếp & Làm việc nhóm</span>
                    <InfoHint text="Khả năng diễn đạt súc tích, cấu trúc trả lời rõ ràng (STAR), lắng nghe và tư duy giải quyết vấn đề nhóm." />
                  </div>
                  <span className="font-extrabold text-sky-600">
                    {avgCommScore != null ? `${avgCommScore}/100` : "—"}
                  </span>
                </div>
                <div className="w-full bg-slate-200/80 rounded-full h-2 dark:bg-slate-700">
                  <div className="bg-sky-500 h-2 rounded-full transition-all" style={{ width: `${avgCommScore ?? 0}%` }} />
                </div>
              </div>

              {/* Tiêu chí 3: Phù hợp văn hóa */}
              <div className="rounded-xl border border-slate-200/70 bg-slate-50/50 p-3.5 space-y-2 dark:border-slate-800 dark:bg-slate-850">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-700 dark:text-slate-300">Phù hợp văn hóa</span>
                    <InfoHint text="Tinh thần chủ động (Ownership), động lực học hỏi công nghệ mới và sự tương thích với giá trị cốt lõi của công ty." />
                  </div>
                  <span className="font-extrabold text-emerald-600">
                    {avgCultureScore != null ? `${avgCultureScore}/100` : "—"}
                  </span>
                </div>
                <div className="w-full bg-slate-200/80 rounded-full h-2 dark:bg-slate-700">
                  <div className="bg-emerald-500 h-2 rounded-full transition-all" style={{ width: `${avgCultureScore ?? 0}%` }} />
                </div>
              </div>
            </div>
          </div>

          {/* 3. Chi tiết phiếu nhận xét của từng người phỏng vấn */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900 space-y-4">
            <div className="flex items-center gap-1.5">
              <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                <Star className="size-5 text-amber-500 fill-amber-400" />
                Chi tiết phiếu nhận xét của từng người phỏng vấn ({evaluations.length} phiếu đã nộp)
              </h2>
              <InfoHint text="Chi tiết điểm số cho từng tiêu chí và nhận xét, bằng chứng thực tế từ mỗi thành viên hội đồng." />
            </div>

            {!evaluations.length && (
              <div className="rounded-xl border border-dashed border-slate-300 p-8 text-center text-xs text-slate-500 dark:border-slate-700">
                Chưa có người phỏng vấn nào nộp phiếu đánh giá cho buổi phỏng vấn này.
              </div>
            )}

            <div className="space-y-4">
              {evaluations.map((ev) => {
                const isMyEvaluation = user?.id === ev.evaluatorId || (myParticipant && myParticipant.userId === ev.evaluatorId);

                return (
                  <div
                    key={ev.id}
                    className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-3 dark:border-slate-800 dark:bg-slate-850/50"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-2.5 dark:border-slate-800">
                      <div className="flex items-center gap-2">
                        <span className="size-2 rounded-full bg-emerald-500" />
                        <strong className="text-xs sm:text-sm text-slate-900 dark:text-slate-100">{ev.evaluatorName}</strong>
                        <span className="text-xs text-slate-400">· {formatDate(ev.createdAt, undefined, locale)}</span>
                      </div>

                      <div className="flex items-center gap-2">
                        {isMyEvaluation && (
                          <button
                            type="button"
                            onClick={() => setActiveTab("myScorecard")}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-brand-primary hover:bg-[var(--color-primary-soft)] hover:border-brand-primary/40 transition-colors shadow-2xs dark:border-slate-700 dark:bg-slate-800 cursor-pointer"
                            title="Chỉnh sửa phiếu chấm của bạn"
                          >
                            <Pencil className="size-3" />
                            <span>Sửa phiếu</span>
                          </button>
                        )}
                        <span className="rounded-md bg-white border border-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-800 dark:bg-slate-800 dark:border-slate-700 dark:text-slate-200">
                          Tổng điểm: {ev.overallScore}/100
                        </span>
                        <span
                          className={cn(
                            "rounded-md px-2.5 py-0.5 text-xs font-bold uppercase",
                            ev.recommendation === "STRONG_HIRE"
                              ? "bg-emerald-600 text-white"
                              : ev.recommendation === "HIRE"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300"
                                : ev.recommendation === "NO_HIRE"
                                  ? "bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300"
                                  : "bg-rose-100 text-rose-900 dark:bg-rose-950/60 dark:text-rose-300",
                          )}
                        >
                          {ev.recommendation === "STRONG_HIRE"
                            ? "Mạnh dạn tuyển"
                            : ev.recommendation === "HIRE"
                              ? "Nên tuyển"
                              : ev.recommendation === "NO_HIRE"
                                ? "Không tuyển"
                                : "Loại"}
                        </span>
                      </div>
                    </div>

                    {/* 3 Sub-scores with standardized names */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                      <div className="rounded-lg bg-white border border-slate-200/60 p-2 dark:bg-slate-800 dark:border-slate-700">
                        <span className="text-slate-500">Chuyên môn & Kỹ thuật:</span>{" "}
                        <strong className="text-slate-800 dark:text-slate-200">{ev.technicalScore}/100</strong>
                      </div>
                      <div className="rounded-lg bg-white border border-slate-200/60 p-2 dark:bg-slate-800 dark:border-slate-700">
                        <span className="text-slate-500">Giao tiếp & Làm việc nhóm:</span>{" "}
                        <strong className="text-slate-800 dark:text-slate-200">{ev.communicationScore}/100</strong>
                      </div>
                      <div className="rounded-lg bg-white border border-slate-200/60 p-2 dark:bg-slate-800 dark:border-slate-700">
                        <span className="text-slate-500">Phù hợp văn hóa:</span>{" "}
                        <strong className="text-slate-800 dark:text-slate-200">{ev.cultureScore}/100</strong>
                      </div>
                    </div>

                    {/* Qualitative comments */}
                    <div className="rounded-lg bg-white border border-slate-200/60 p-3 text-xs space-y-1 dark:bg-slate-800 dark:border-slate-700">
                      <p className="font-semibold text-slate-700 dark:text-slate-300">Nhận xét & Bằng chứng thực tế:</p>
                      <p className="whitespace-pre-wrap text-slate-600 dark:text-slate-400 leading-relaxed">
                        {ev.comments || "Không có ghi chú thêm."}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: MY SCORECARD FORM */}
      {activeTab === "myScorecard" && (
        <div className="max-w-3xl mx-auto w-full space-y-5">
          {!canEvaluate ? (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-8 text-center space-y-4 shadow-2xs dark:border-slate-800 dark:bg-slate-900">
              <div className="size-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-500">
                <Users className="size-6 text-slate-600 dark:text-slate-400" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {myParticipant?.role === "NOTE_TAKER"
                    ? "Vai trò Thư ký (Note Taker) không tham gia chấm điểm"
                    : "Bạn không thuộc Hội đồng đánh giá của buổi phỏng vấn này"}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto leading-relaxed">
                  {myParticipant?.role === "NOTE_TAKER"
                    ? "Vai trò của bạn trong buổi phỏng vấn này là ghi chú biên bản. Điểm số và đề xuất tuyển dụng sẽ do các Giám khảo và Hội đồng trưởng thực hiện."
                    : "Chỉ các thành viên Hội đồng được phân công (Hội đồng trưởng & Phỏng vấn viên) mới có quyền cho điểm và nộp phiếu đánh giá. Bạn có thể xem kết quả tổng hợp tại tab Hội đồng đánh giá."}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab("rubric")}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-brand-primary hover:bg-[var(--color-primary-soft)] hover:border-brand-primary/40 dark:border-slate-700 dark:bg-slate-800 transition-colors cursor-pointer"
              >
                <span>Xem đánh giá của Hội đồng</span>
              </button>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-2xs dark:border-slate-800 dark:bg-slate-900 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                    <FileCheck className="size-5 text-brand-primary" />
                    <span>Phiếu chấm điểm phỏng vấn của bạn</span>
                  </h2>
                  <InfoHint text="Vui lòng đánh giá ứng viên khách quan theo thang điểm 1–5 và nêu rõ bằng chứng nhận xét để hội đồng ra quyết định." />
                </div>
                {myExistingEval && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800">
                    <CheckCircle2 className="size-3.5" />
                    <span>Đã nộp ({myExistingEval.overallScore}/100 điểm)</span>
                  </span>
                )}
              </div>

              {/* Informative banner if already evaluated */}
              {myExistingEval && (
                <div className="rounded-xl border border-sky-200 bg-sky-50/70 p-3 text-xs text-sky-900 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-200 flex items-start gap-2.5">
                  <Sparkles className="size-4 text-sky-600 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    Bạn đã nộp phiếu đánh giá này trước đó. Khi xem lại video ghi hình hoặc đối chiếu với hội đồng, bạn hoàn toàn có thể <strong>điều chỉnh lại điểm số hoặc bổ sung nhận xét</strong> bên dưới và bấm <strong>Cập nhật phiếu đánh giá</strong>.
                  </p>
                </div>
              )}

              {/* Criteria 1: Technical */}
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 space-y-2 dark:border-slate-800 dark:bg-slate-850">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                      1. Năng lực Chuyên môn & Kỹ thuật
                    </h4>
                    <InfoHint text="Kiến thức chuyên sâu, kiến trúc hệ thống, thuật toán, tư duy giải quyết vấn đề." />
                  </div>
                  <span className="text-sm font-extrabold text-brand-primary">{SCORE_BY_RATING[myTechRating]}/100</span>
                </div>
                <div className="grid grid-cols-5 gap-1.5 pt-1">
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setMyTechRating(lvl)}
                      className={cn(
                        "py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer text-center",
                        myTechRating === lvl
                          ? "bg-brand-primary text-white border-brand-primary shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
                      )}
                    >
                      {lvl} sao
                    </button>
                  ))}
                </div>
              </div>

              {/* Criteria 2: Communication */}
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 space-y-2 dark:border-slate-800 dark:bg-slate-850">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                      2. Giao tiếp & Làm việc nhóm
                    </h4>
                    <InfoHint text="Diễn đạt ngắn gọn, lắng nghe, cấu trúc câu trả lời STAR, tương tác thân thiện." />
                  </div>
                  <span className="text-sm font-extrabold text-sky-600">{SCORE_BY_RATING[myCommRating]}/100</span>
                </div>
                <div className="grid grid-cols-5 gap-1.5 pt-1">
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setMyCommRating(lvl)}
                      className={cn(
                        "py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer text-center",
                        myCommRating === lvl
                          ? "bg-sky-600 text-white border-sky-600 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
                      )}
                    >
                      {lvl} sao
                    </button>
                  ))}
                </div>
              </div>

              {/* Criteria 3: Culture */}
              <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 space-y-2 dark:border-slate-800 dark:bg-slate-850">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-slate-100">
                      3. Phù hợp Văn hóa & Động lực phát triển
                    </h4>
                    <InfoHint text="Ownership, chủ động học hỏi, cầu thị, tương thích định hướng phát triển của công ty." />
                  </div>
                  <span className="text-sm font-extrabold text-emerald-600">{SCORE_BY_RATING[myCultureRating]}/100</span>
                </div>
                <div className="grid grid-cols-5 gap-1.5 pt-1">
                  {[1, 2, 3, 4, 5].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setMyCultureRating(lvl)}
                      className={cn(
                        "py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer text-center",
                        myCultureRating === lvl
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
                      )}
                    >
                      {lvl} sao
                    </button>
                  ))}
                </div>
              </div>

              {/* Recommendation Pills */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                  Khuyến nghị tuyển dụng của bạn *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { id: "STRONG_HIRE" as const, label: "Mạnh dạn tuyển", color: "bg-emerald-600 text-white" },
                    { id: "HIRE" as const, label: "Nên tuyển", color: "bg-emerald-100 text-emerald-900 border-emerald-300" },
                    { id: "NO_HIRE" as const, label: "Không tuyển", color: "bg-amber-100 text-amber-900 border-amber-300" },
                    { id: "STRONG_NO_HIRE" as const, label: "Loại rõ ràng", color: "bg-rose-100 text-rose-900 border-rose-300" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setMyRecommendation(item.id)}
                      className={cn(
                        "rounded-xl border p-2.5 text-xs font-bold transition-all cursor-pointer text-center",
                        myRecommendation === item.id
                          ? cn(item.color, "ring-2 ring-brand-primary ring-offset-1")
                          : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
                      )}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Comments textarea */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <label className="block text-xs font-bold text-slate-800 dark:text-slate-200">
                    Nhận xét định tính & Bằng chứng thực tế (Evidence) *
                  </label>
                  <InfoHint text="Tối thiểu 20 ký tự để hội đồng có cơ sở tham chiếu và đối sánh khách quan." />
                </div>
                <textarea
                  rows={4}
                  value={myComments}
                  onChange={(e) => setMyComments(e.target.value)}
                  placeholder="Nêu rõ điểm mạnh, điểm yếu, phản hồi của ứng viên trong các câu hỏi tình huống hoặc live coding..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 p-3 text-xs sm:text-[13px] text-slate-900 placeholder:text-slate-400 outline-none transition-[border-color,box-shadow] focus:border-brand-primary focus:bg-white focus:ring-2 focus:ring-brand-primary/20 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              {/* Lead Hiring Decision Checkbox */}
              {isLead && (
                applicantClosed ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 space-y-1.5 dark:border-emerald-900/40 dark:bg-emerald-950/20">
                    <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wide">
                      Quyết định tuyển dụng cuối cùng
                    </p>
                    <p className="text-xs text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                      <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                      <span>
                        Hồ sơ ứng viên đã được chốt kết quả:{" "}
                        <strong className="font-extrabold">{applicantStatusDisplay}</strong>
                      </span>
                    </p>
                  </div>
                ) : (
                  <div className="rounded-xl border border-rose-200 bg-rose-50/60 p-3.5 space-y-2 dark:border-rose-900/40 dark:bg-rose-950/20">
                    <p className="text-xs font-bold text-rose-800 uppercase tracking-wide">Quyền hạn Hội đồng trưởng (Lead)</p>
                    <label className="flex items-start gap-2.5 text-xs text-rose-900 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={finalizeDecision}
                        onChange={(e) => setFinalizeDecision(e.target.checked)}
                        className="mt-0.5 size-4 accent-brand-primary rounded"
                      />
                      <span>
                        <span className="inline-flex items-center gap-1.5">
                          <strong>Ra quyết định tuyển dụng cuối cùng (Finalize Hiring Decision)</strong>
                          <InfoHint text="Đồng bộ trạng thái hồ sơ ứng viên sang OFFER (nếu Đậu) hoặc REJECTED (nếu Không đạt)." />
                        </span>
                      </span>
                    </label>
                  </div>
                )
              )}

              {/* Submit Action */}
              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  disabled={evaluateMutation.isPending || myComments.trim().length < 10}
                  onClick={() => evaluateMutation.mutate()}
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-primary px-5 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-brand-primary-hover disabled:opacity-50 cursor-pointer"
                >
                  <Send className="size-4" />
                  <span>
                    {evaluateMutation.isPending
                      ? "Đang lưu phiếu..."
                      : myExistingEval
                        ? "Cập nhật phiếu đánh giá"
                        : "Lưu & Nộp phiếu đánh giá"}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL NẠP BẢN GHI PHỎNG VẤN (RECORDING INGESTION) */}
      <DetailDialog
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
        title="Quản lý bản ghi phỏng vấn"
      >
        <div className="space-y-5 text-xs text-slate-700 dark:text-slate-300">
          <p className="text-slate-500 dark:text-slate-400">
            Hỗ trợ nạp video ghi hình từ nền tảng trực tuyến ({displayPlatform}) hoặc tải lên tệp từ máy tính.
          </p>

          {/* Sub-tabs: Tải tệp vs Đính kèm liên kết */}
          <div className="flex border-b border-slate-200 dark:border-slate-700 gap-4">
            <button
              type="button"
              onClick={() => setUploadTab("file")}
              className={cn(
                "pb-2.5 font-bold transition-colors cursor-pointer border-b-2 flex items-center gap-1.5",
                uploadTab === "file"
                  ? "border-brand-primary text-brand-primary"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200",
              )}
            >
              <Upload className="size-3.5" />
              <span>Tải tệp video</span>
            </button>
            <button
              type="button"
              onClick={() => setUploadTab("link")}
              className={cn(
                "pb-2.5 font-bold transition-colors cursor-pointer border-b-2 flex items-center gap-1.5",
                uploadTab === "link"
                  ? "border-brand-primary text-brand-primary"
                  : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200",
              )}
            >
              <LinkIcon className="size-3.5" />
              <span>Dán liên kết</span>
            </button>
          </div>

          {/* TAB 1: TẢI FILE TỪ MÁY */}
          {uploadTab === "file" && (
            <div className="space-y-4">
              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Chọn tệp video (.mp4, .webm, .mov)
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime,video/x-msvideo"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) setSelectedFile(f);
                  }}
                  className="hidden"
                />

                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={cn(
                    "border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-colors flex flex-col items-center justify-center gap-2",
                    selectedFile
                      ? "border-brand-primary/60 bg-brand-primary/5"
                      : "border-slate-300 hover:border-brand-primary/50 bg-slate-50/50 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-850",
                  )}
                >
                  <div className="size-10 rounded-full bg-slate-200/80 dark:bg-slate-700 flex items-center justify-center text-slate-600 dark:text-slate-300">
                    <FolderUp className="size-5" />
                  </div>
                  {selectedFile ? (
                    <div>
                      <p className="font-bold text-sm text-brand-primary">{selectedFile.name}</p>
                      <p className="text-slate-500 mt-0.5">
                        Dung lượng: {(selectedFile.size / (1024 * 1024)).toFixed(1)} MB · Nhấp để chọn tệp khác
                      </p>
                    </div>
                  ) : (
                    <div>
                      <p className="font-semibold text-slate-800 dark:text-slate-200">
                        Nhấp để chọn tệp video hoặc kéo thả vào đây
                      </p>
                      <p className="text-slate-400 mt-0.5">
                        Hỗ trợ MP4, WebM, MOV. Tối đa 500 MB.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={!selectedFile || uploadRecordingMutation.isPending}
                  onClick={() => selectedFile && uploadRecordingMutation.mutate(selectedFile)}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-5 py-2 font-semibold text-white shadow-xs hover:bg-brand-primary-hover disabled:opacity-50 cursor-pointer"
                >
                  {uploadRecordingMutation.isPending ? (
                    <LoaderCircle className="size-3.5 animate-spin" />
                  ) : (
                    <Upload className="size-3.5" />
                  )}
                  <span>
                    {uploadRecordingMutation.isPending ? "Đang tải lên và mã hóa..." : "Tải lên & Lưu bản ghi"}
                  </span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: ĐÍNH KÈM LINK CLOUD NGOÀI */}
          {uploadTab === "link" && (
            <div className="space-y-4">
              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Đường dẫn bản ghi (URL) *
                </label>
                <input
                  type="url"
                  value={externalUrl}
                  onChange={(e) => setExternalUrl(e.target.value)}
                  placeholder={
                    displayPlatform.includes("Meet")
                      ? "https://drive.google.com/file/d/.../view"
                      : displayPlatform.includes("Zoom")
                        ? "https://us02web.zoom.us/rec/share/..."
                        : "https://... (link bản ghi đám mây)"
                  }
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-brand-primary focus:bg-white focus:ring-1 focus:ring-brand-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 font-mono"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1.5">
                  Ghi chú truy cập / Mật mã mở xem (nếu có)
                </label>
                <input
                  type="text"
                  value={externalNotes}
                  onChange={(e) => setExternalNotes(e.target.value)}
                  placeholder="Ví dụ: Passcode: Abc#2026, quyền xem: Chỉ nội bộ công ty..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:border-brand-primary focus:bg-white focus:ring-1 focus:ring-brand-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                />
              </div>

              <div className="pt-2 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  disabled={!externalUrl.trim() || attachLinkMutation.isPending}
                  onClick={() => attachLinkMutation.mutate()}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-primary px-5 py-2 font-semibold text-white shadow-xs hover:bg-brand-primary-hover disabled:opacity-50 cursor-pointer"
                >
                  {attachLinkMutation.isPending ? (
                    <LoaderCircle className="size-3.5 animate-spin" />
                  ) : (
                    <Check className="size-3.5" />
                  )}
                  <span>
                    {attachLinkMutation.isPending ? "Đang lưu liên kết..." : "Lưu liên kết bản ghi"}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      </DetailDialog>

      {/* MODAL THÊM MỐC THỜI GIAN THỦ CÔNG */}
      <DetailDialog
        open={addChapterModalOpen}
        onClose={() => setAddChapterModalOpen(false)}
        title="Thêm mốc thời gian phỏng vấn"
      >
        <form onSubmit={handleSaveNewChapter} className="space-y-4 text-xs text-slate-700 dark:text-slate-300">
          <p className="text-slate-500 dark:text-slate-400">
            Ghim mốc thời gian quan trọng trong video để hội đồng có thể tua nhanh và đối chiếu bằng chứng khi chấm điểm.
          </p>

          <div>
            <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1.5">
              Thời điểm trong video (mm:ss) *
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                required
                value={newChapterTime}
                onChange={(e) => setNewChapterTime(e.target.value)}
                placeholder="Ví dụ: 05:30"
                pattern="^(\d{1,3}):([0-5]\d)$"
                className="w-32 rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 font-mono text-xs text-slate-900 outline-none transition-colors focus:border-brand-primary focus:bg-white focus:ring-1 focus:ring-brand-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
              />
              <button
                type="button"
                onClick={() => setNewChapterTime(formatSeconds(currentTime))}
                className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-[11px] font-semibold text-brand-primary hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800 cursor-pointer"
              >
                Lấy thời điểm hiện tại ({formatSeconds(currentTime)})
              </button>
            </div>
          </div>

          <div>
            <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1.5">
              Tiêu đề phân đoạn / Nội dung mốc *
            </label>
            <input
              type="text"
              required
              value={newChapterLabel}
              onChange={(e) => setNewChapterLabel(e.target.value)}
              placeholder="Ví dụ: Hỏi đáp kiến trúc Microservices & Caching..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 text-xs text-slate-900 outline-none transition-colors focus:border-brand-primary focus:bg-white focus:ring-1 focus:ring-brand-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
            />
          </div>

          <div>
            <label className="block font-bold text-slate-800 dark:text-slate-200 mb-1.5">
              Ghi chú chi tiết (tùy chọn)
            </label>
            <textarea
              rows={2}
              value={newChapterDesc}
              onChange={(e) => setNewChapterDesc(e.target.value)}
              placeholder="Ghi chú thêm về câu trả lời của ứng viên, bằng chứng cần lưu ý..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 text-xs text-slate-900 outline-none transition-colors focus:border-brand-primary focus:bg-white focus:ring-1 focus:ring-brand-primary dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 resize-none"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2.5">
            <button
              type="button"
              onClick={() => setAddChapterModalOpen(false)}
              className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={updateChaptersMutation.isPending}
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand-primary px-5 py-2 font-semibold text-white shadow-xs hover:bg-brand-primary-hover disabled:opacity-50 cursor-pointer"
            >
              {updateChaptersMutation.isPending && <LoaderCircle className="size-3.5 animate-spin" />}
              <span>Lưu mốc</span>
            </button>
          </div>
        </form>
      </DetailDialog>
    </div>
  );
}

