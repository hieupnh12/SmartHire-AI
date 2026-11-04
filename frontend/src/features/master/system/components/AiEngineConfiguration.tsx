import { useEffect, useState } from "react";
import {
  Key,
  Plus,
  Trash2,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Sliders,
  ShieldCheck,
  Zap,
  Save,
  RefreshCw,
  Gauge,
  Coins,
  ChevronDown,
  ChevronUp,
  Bot,
  Volume2,
  Mic,
  BrainCircuit,
  FileText,
  Target,
  HelpCircle,
  Code2,
  Cpu,
  Layers,
  Search,
  X,
} from "lucide-react";
import {
  aiConfigApi,
  type AiFallbackStep,
  type AiModelConfig,
  type AiModelPricing,
  type AiProviderKey,
  type AiRateLimitConfig,
} from "@/api/master/aiConfigApi";
import { AddAiKeyModal } from "./AddAiKeyModal";
import { HeaderActions } from "@/features/master/shell/HeaderActions";
import { PageSkeleton } from "@/components/ux/Skeleton";
import { cn } from "@/lib/utils";
import { toast } from "@/stores/toastStore";
import { useUiStore } from "@/stores/uiStore";

const surface = "rounded-2xl border border-slate-200 bg-white shadow-[0_4px_14px_-8px_rgba(15,23,42,0.18)]";

const MODEL_PRESETS: Record<string, string[]> = {
  GEMINI: [
    "gemini-3.5-flash-lite",
    "gemini-3.8-flash",
    "gemini-3.7-flash",
    "gemini-3.6-flash",
    "gemini-3.1-pro-preview",
    "gemini-2.5-flash",
    "gemini-2.5-pro",
  ],
  OPENAI: ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo", "o3-mini", "o1-mini"],
  ANTHROPIC: ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022", "claude-3-opus-20240229"],
  CURSOR: [
    "composer-2",
    "composer-2.5",
    "claude-4-sonnet-thinking",
    "claude-3-5-sonnet",
    "gpt-4o",
    "cursor-small",
    "auto-smart",
    "default",
  ],
  OPENROUTER: [
    "anthropic/claude-3.5-sonnet",
    "openai/gpt-4o-mini",
    "meta-llama/llama-3.3-70b-instruct",
    "deepseek/deepseek-chat",
    "deepseek/deepseek-r1",
    "google/gemini-2.5-flash",
  ],
  GROQ: [
    "qwen/qwen3.8-27b",
    "openai/gpt-oss-120b",
    "openai/gpt-oss-20b",
    "whisper-large-v3-turbo",
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
    "mixtral-8x7b-32768",
    "deepseek-r1-distill-llama-70b",
  ],
  DEEPSEEK: ["deepseek-chat", "deepseek-coder", "deepseek-reasoner"],
  MISTRAL: ["mistral-small-latest", "mistral-large-latest", "codestral-latest"],
  XAI: ["grok-2-latest", "grok-beta"],
  PERPLEXITY: ["sonar", "sonar-pro", "sonar-reasoning"],
  OLLAMA: ["llama3.2", "qwen2.5-coder", "deepseek-r1:8b", "mistral"],
  HUGGINGFACE: ["Qwen/Qwen2.5-7B-Instruct", "meta-llama/Meta-Llama-3-8B-Instruct", "mistralai/Mistral-7B-Instruct-v0.2"],
  CUSTOM: ["custom-model-01", "default"],
};

const getProviderBadgeStyle = (p: string) => {
  switch (p) {
    case "GEMINI": return "bg-blue-50 text-blue-700 border border-blue-200";
    case "OPENAI": return "bg-emerald-50 text-emerald-700 border border-emerald-200";
    case "ANTHROPIC": return "bg-amber-50 text-amber-700 border border-amber-200";
    case "CURSOR": return "bg-indigo-50 text-indigo-700 border border-indigo-200";
    case "OPENROUTER": return "bg-fuchsia-50 text-fuchsia-700 border border-fuchsia-200";
    case "GROQ": return "bg-orange-50 text-orange-700 border border-orange-200";
    case "DEEPSEEK": return "bg-cyan-50 text-cyan-700 border border-cyan-200";
    case "MISTRAL": return "bg-rose-50 text-rose-700 border border-rose-200";
    case "XAI": return "bg-slate-100 text-slate-800 border border-slate-300";
    case "OLLAMA": return "bg-teal-50 text-teal-700 border border-teal-200";
    case "PERPLEXITY": return "bg-sky-50 text-sky-700 border border-sky-200";
    default: return "bg-slate-50 text-slate-700 border border-slate-200";
  }
};

const getStatusBadge = (status: string) => {
  switch (status) {
    case "ACTIVE":
      return {
        label: "Hoạt động",
        className: "bg-emerald-50 text-emerald-700 border border-emerald-200",
        dotColor: "bg-emerald-500",
      };
    case "INACTIVE":
      return {
        label: "Tạm dừng",
        className: "bg-slate-100 text-slate-600 border border-slate-200",
        dotColor: "bg-slate-400",
      };
    case "RATE_LIMITED_OR_INVALID":
    case "RATE_LIMITED":
      return {
        label: "Lỗi / Quá tải",
        className: "bg-rose-50 text-rose-700 border border-rose-200",
        dotColor: "bg-rose-500",
      };
    case "EXPIRED":
      return {
        label: "Hết hạn",
        className: "bg-amber-50 text-amber-700 border border-amber-200",
        dotColor: "bg-amber-500",
      };
    default:
      return {
        label: status,
        className: "bg-slate-50 text-slate-700 border border-slate-200",
        dotColor: "bg-slate-400",
      };
  }
};

const getTaskIcon = (taskType: string) => {
  switch (taskType) {
    case "INTERVIEW_GEN":
      return <Bot className="size-4 text-blue-600" />;
    case "INTERVIEW_TTS":
      return <Volume2 className="size-4 text-emerald-600" />;
    case "INTERVIEW_STT":
      return <Mic className="size-4 text-violet-600" />;
    case "INTERVIEW_NLP":
      return <BrainCircuit className="size-4 text-amber-600" />;
    case "CV_PARSING":
      return <FileText className="size-4 text-sky-600" />;
    case "MATCHING":
      return <Target className="size-4 text-rose-600" />;
    case "QUESTION_GEN":
      return <HelpCircle className="size-4 text-indigo-600" />;
    case "CODE_GRADING":
      return <Code2 className="size-4 text-cyan-600" />;
    default:
      return <Cpu className="size-4 text-slate-600" />;
  }
};

const getProviderBadge = (provider: string) => {
  const p = provider?.toUpperCase();
  switch (p) {
    case "GEMINI":
      return "bg-blue-50 text-blue-700 border-blue-200";
    case "OPENAI":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    case "ANTHROPIC":
      return "bg-amber-50 text-amber-800 border-amber-200";
    case "GROQ":
      return "bg-orange-50 text-orange-700 border-orange-200";
    case "DEEPSEEK":
      return "bg-cyan-50 text-cyan-700 border-cyan-200";
    case "MISTRAL":
      return "bg-red-50 text-red-700 border-red-200";
    case "CURSOR":
      return "bg-purple-50 text-purple-700 border-purple-200";
    case "OPENROUTER":
      return "bg-violet-50 text-violet-700 border-violet-200";
    default:
      return "bg-slate-50 text-slate-700 border-slate-200";
  }
};

interface TaskMeta {
  shortName: string;
  description: string;
}

const TASK_METADATA: Record<string, TaskMeta> = {
  INTERVIEW_GEN: {
    shortName: "Sinh câu hỏi phỏng vấn",
    description:
      "Tạo câu hỏi phỏng vấn AI bám sát snapshot JD, yêu cầu kỹ năng của Job và hồ sơ ứng viên; tự động điều phối lượt hỏi chính và hỏi bồi chuyên sâu trong phiên.",
  },
  INTERVIEW_TTS: {
    shortName: "Giọng đọc câu hỏi (TTS)",
    description:
      "Tổng hợp văn bản câu hỏi của AI thành giọng nói tự nhiên thời gian thực (Text-to-Speech) để trò chuyện trực tiếp với ứng viên qua phòng phỏng vấn trực tuyến.",
  },
  INTERVIEW_STT: {
    shortName: "Nhận diện giọng nói (STT)",
    description:
      "Chuyển đổi âm thanh câu trả lời từ microphone của ứng viên thành văn bản theo thời gian thực (Speech-to-Text) phục vụ phân tích ngữ nghĩa và chấm điểm.",
  },
  INTERVIEW_NLP: {
    shortName: "Phân tích câu trả lời (NLP)",
    description:
      "Chấm điểm và nhận xét toàn bộ transcript phỏng vấn theo 4 tiêu chí cốt lõi: Kiến thức chuyên môn, Giải quyết vấn đề, Lập luận và Kỹ năng giao tiếp sau khi kết thúc phiên.",
  },
  CV_PARSING: {
    shortName: "Trích xuất hồ sơ CV",
    description:
      "Đọc và phân tích cấu trúc file CV ứng viên (PDF/DOCX), chuyển đổi thành dữ liệu JSON chuẩn hóa gồm Học vấn, Kinh nghiệm làm việc, Kỹ năng và Dự án.",
  },
  MATCHING: {
    shortName: "Độ phù hợp & Xếp hạng",
    description:
      "So khớp ngữ nghĩa (Semantic Matching) giữa hồ sơ ứng viên và tin tuyển dụng để tính điểm phù hợp (0-100%) và xếp hạng độ ưu tiên cho nhà tuyển dụng.",
  },
  QUESTION_GEN: {
    shortName: "Sinh câu hỏi ngân hàng đề",
    description:
      "Tự động tạo câu hỏi trắc nghiệm (MCQ), nhiều đáp án hoặc tự luận theo chủ đề, độ khó và công nghệ yêu cầu cho ngân hàng đề thi đánh giá kỹ thuật.",
  },
  CODE_GRADING: {
    shortName: "Chấm bài thi Coding & Tự luận",
    description:
      "Chấm điểm tự động bài tập lập trình của ứng viên: phân tích thuật toán, độ phức tạp thời gian/bộ nhớ (Big-O), code smell và tính đúng đắn của test cases.",
  },
};

interface ClusterDefinition {
  id: string;
  title: string;
  icon: any;
  headerBg: string;
  accentColor: string;
  matcher: (taskType: string) => boolean;
  orderMap: Record<string, number>;
}

const CLUSTERS: ClusterDefinition[] = [
  {
    id: "interview",
    title: "Phỏng vấn AI",
    icon: Bot,
    headerBg: "bg-gradient-to-r from-blue-50/90 via-slate-50/40 to-white border-b border-blue-100",
    accentColor: "text-blue-700 border-blue-200/80",
    matcher: (type) => type.startsWith("INTERVIEW_") || type.includes("INTERVIEW"),
    orderMap: {
      INTERVIEW_GEN: 1,
      INTERVIEW_TTS: 2,
      INTERVIEW_STT: 3,
      INTERVIEW_NLP: 4,
    },
  },
  {
    id: "cv_matching",
    title: "Sàng lọc CV & Matching",
    icon: FileText,
    headerBg: "bg-gradient-to-r from-emerald-50/90 via-slate-50/40 to-white border-b border-emerald-100",
    accentColor: "text-emerald-700 border-emerald-200/80",
    matcher: (type) => type.startsWith("CV_") || type.startsWith("MATCHING") || type === "MATCHING",
    orderMap: {
      CV_PARSING: 1,
      MATCHING: 2,
    },
  },
  {
    id: "assessment",
    title: "Đề thi & Đánh giá Kỹ thuật",
    icon: Code2,
    headerBg: "bg-gradient-to-r from-amber-50/90 via-slate-50/40 to-white border-b border-amber-100",
    accentColor: "text-amber-700 border-amber-200/80",
    matcher: (type) =>
      type.startsWith("QUESTION_") || type.startsWith("ASSESS_") || type.startsWith("CODE_") || type === "CODE_GRADING",
    orderMap: {
      QUESTION_GEN: 1,
      CODE_GRADING: 2,
    },
  },
  {
    id: "other",
    title: "Tác vụ khác",
    icon: Layers,
    headerBg: "bg-gradient-to-r from-slate-50 via-slate-50/60 to-white border-b border-slate-200",
    accentColor: "text-slate-700 border-slate-200",
    matcher: () => true,
    orderMap: {},
  },
];

export function AiEngineConfiguration() {
  const askConfirm = useUiStore((s) => s.askConfirm);
  const [keys, setKeys] = useState<AiProviderKey[]>([]);
  const [tasks, setTasks] = useState<AiModelConfig[]>([]);
  const [originalTasks, setOriginalTasks] = useState<AiModelConfig[]>([]);
  const [pricings, setPricings] = useState<AiModelPricing[]>([]);
  const [newPricing, setNewPricing] = useState<AiModelPricing>({
    modelName: "",
    provider: "GEMINI",
    displayName: "",
    contextWindow: 128000,
    supportsJson: true,
    inputPricePer1mTokens: 0.075,
    outputPricePer1mTokens: 0.3,
    isActive: true,
  });
  const [savingPricingKey, setSavingPricingKey] = useState<string | null>(null);
  const [savedPricingKeySuccess, setSavedPricingKeySuccess] = useState<string | null>(null);
  const [isAddingPricing, setIsAddingPricing] = useState(false);
  const [pricingSearch, setPricingSearch] = useState("");
  const [testingModelKey, setTestingModelKey] = useState<string | null>(null);
  const [modelTestResults, setModelTestResults] = useState<
    Record<string, { success: boolean; message: string; latencyMs?: number }>
  >({});

  const [rateLimit, setRateLimit] = useState<AiRateLimitConfig>({
    enabled: true,
    defaultRpmPerTenant: 30,
    defaultTpmPerTenant: 100000,
    tenantRpmOverrides: {},
  });
  const [savingRateLimit, setSavingRateLimit] = useState(false);
  const [savedRateLimitSuccess, setSavedRateLimitSuccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [isAddKeyOpen, setIsAddKeyOpen] = useState(false);
  const [editingKey, setEditingKey] = useState<AiProviderKey | null>(null);

  const [savingTask, setSavingTask] = useState<string | null>(null);

  const [expandedClusters, setExpandedClusters] = useState<Record<string, boolean>>({});
  const [savingClusterId, setSavingClusterId] = useState<string | null>(null);

  const [testingKeyId, setTestingKeyId] = useState<number | null>(null);

  const fetchData = async (isInitial = false) => {
    try {
      if (isInitial || (keys.length === 0 && tasks.length === 0)) {
        setLoading(true);
      }
      setError(null);
      const [keysRes, tasksRes, rateLimitRes, pricingsRes] = await Promise.all([
        aiConfigApi.getProviderKeys(),
        aiConfigApi.getTaskConfigs(),
        aiConfigApi.getRateLimitConfig().catch(() => null),
        aiConfigApi.getModelPricings().catch(() => []),
      ]);
      const sortedKeys = [...keysRes].sort((a, b) => (a.id ?? 0) - (b.id ?? 0));
      setKeys(sortedKeys);
      setTasks(tasksRes);
      setOriginalTasks(JSON.parse(JSON.stringify(tasksRes)));
      setPricings(pricingsRes);
      if (rateLimitRes) {
        setRateLimit({
          enabled: rateLimitRes.enabled ?? true,
          defaultRpmPerTenant: rateLimitRes.defaultRpmPerTenant ?? 30,
          defaultTpmPerTenant: rateLimitRes.defaultTpmPerTenant ?? 100000,
          tenantRpmOverrides: rateLimitRes.tenantRpmOverrides ?? {},
        });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Lỗi khi tải cấu hình AI");
    } finally {
      setLoading(false);
    }
  };

  const handlePricingChange = (
    modelName: string,
    field: keyof AiModelPricing,
    value: string | number | boolean
  ) => {
    setPricings((prev) =>
      prev.map((p) => (p.modelName === modelName ? { ...p, [field]: value } : p))
    );
  };

  const handleSavePricing = async (pricing: AiModelPricing) => {
    try {
      setSavingPricingKey(pricing.modelName);
      setSavedPricingKeySuccess(null);
      const saved = await aiConfigApi.saveModelPricing(pricing);
      setPricings((prev) =>
        prev.map((p) => (p.modelName === pricing.modelName ? saved : p))
      );
      setSavedPricingKeySuccess(pricing.modelName);
      toast.success(`Đã lưu đơn giá Model "${pricing.displayName || pricing.modelName}"`);
      setTimeout(() => setSavedPricingKeySuccess(null), 2500);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Lỗi khi lưu đơn giá Model");
    } finally {
      setSavingPricingKey(null);
    }
  };

  const handleAddPricing = async () => {
    if (!newPricing.modelName.trim()) {
      toast.warning("Vui lòng nhập tên Model (ví dụ: gemini-2.5-flash hoặc qwen/qwen3.8-27b)");
      return;
    }
    try {
      setSavingPricingKey("__NEW__");
      const saved = await aiConfigApi.saveModelPricing({
        ...newPricing,
        modelName: newPricing.modelName.trim(),
        displayName: newPricing.displayName?.trim() || undefined,
      });
      setPricings((prev) => {
        const filtered = prev.filter((p) => p.modelName !== saved.modelName);
        return [...filtered, saved];
      });
      toast.success(`Đã thêm Model "${saved.displayName || saved.modelName}" vào bảng giá`);
      setIsAddingPricing(false);
      setNewPricing({
        modelName: "",
        provider: "GEMINI",
        displayName: "",
        contextWindow: 128000,
        supportsJson: true,
        inputPricePer1mTokens: 0.075,
        outputPricePer1mTokens: 0.3,
        isActive: true,
      });
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Lỗi khi thêm đơn giá Model");
    } finally {
      setSavingPricingKey(null);
    }
  };

  const handleTestModel = async (pricing: AiModelPricing) => {
    setTestingModelKey(pricing.modelName);
    try {
      const res = await aiConfigApi.testConnection({
        provider: pricing.provider,
        modelName: pricing.modelName,
      });
      setModelTestResults((prev) => ({
        ...prev,
        [pricing.modelName]: {
          success: res.success,
          message: res.message,
          latencyMs: res.latencyMs,
        },
      }));
      const cleanMessage = res.message ? res.message.replace(/<[^>]*>/g, "").slice(0, 250) : "";
      if (res.success) {
        toast.success(
          `Model ${pricing.displayName || pricing.modelName} hoạt động (${res.latencyMs || 0}ms)`
        );
      } else {
        toast.error(`Model ${pricing.displayName || pricing.modelName} lỗi: ${cleanMessage}`);
      }
    } catch (err: any) {
      const raw = err.response?.data?.message || err.message || "Kiểm tra kết nối thất bại";
      const clean = raw.replace(/<[^>]*>/g, "").slice(0, 250);
      setModelTestResults((prev) => ({
        ...prev,
        [pricing.modelName]: {
          success: false,
          message: clean,
        },
      }));
      toast.error(`Kiểm tra ${pricing.modelName} thất bại: ${clean}`);
    } finally {
      setTestingModelKey(null);
    }
  };

  const handleDeletePricing = (id?: number, modelName?: string) => {
    if (!id) return;
    askConfirm({
      title: `Xóa đơn giá model "${modelName || id}"?`,
      description: "Model này sẽ bị xóa khỏi danh mục chuẩn hóa của hệ thống. Bạn có chắc chắn muốn tiếp tục?",
      confirmLabel: "Xóa model",
      danger: true,
      onConfirm: async () => {
        try {
          await aiConfigApi.deleteModelPricing(id);
          setPricings((prev) => prev.filter((p) => p.id !== id));
          toast.success(`Đã xóa đơn giá Model "${modelName || id}"`);
        } catch (err: any) {
          toast.error(err.response?.data?.message || err.message || "Không thể xóa đơn giá Model");
        }
      },
    });
  };

  const handleSaveRateLimit = async () => {
    try {
      setSavingRateLimit(true);
      setSavedRateLimitSuccess(false);
      const updated = await aiConfigApi.updateRateLimitConfig(rateLimit);
      if (updated) {
        setRateLimit(updated);
      }
      setSavedRateLimitSuccess(true);
      toast.success("Đã lưu và đồng bộ cấu hình Rate Limit vào Redis");
      setTimeout(() => setSavedRateLimitSuccess(false), 2500);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Lỗi khi lưu cấu hình Rate Limit");
    } finally {
      setSavingRateLimit(false);
    }
  };

  useEffect(() => {
    fetchData(true);
  }, []);

  const handleTestKey = async (key: AiProviderKey) => {
    if (!key.id) return;
    setTestingKeyId(key.id);
    try {
      const res = await aiConfigApi.testConnection({
        provider: key.provider,
        keyId: key.id,
        endpointUrl: key.endpointUrl,
      });
      const cleanMessage = res.message ? res.message.replace(/<[^>]*>/g, "").slice(0, 250) : "";
      if (res.success) {
        toast.success(`Kết nối thành công đến ${key.provider} (${res.latencyMs || 0}ms)`);
      } else {
        toast.error(`Kết nối ${key.provider} thất bại: ${cleanMessage}`);
      }
      // Silently refresh keys to get updated lastTestedAt and status without reloading page
      const updatedKeys = await aiConfigApi.getProviderKeys().catch(() => null);
      if (updatedKeys) {
        setKeys(updatedKeys.sort((a, b) => (a.id ?? 0) - (b.id ?? 0)));
      }
    } catch (err: any) {
      const rawMsg = err.response?.data?.message || err.message || "Kiểm tra thất bại";
      const cleanMsg = rawMsg.replace(/<[^>]*>/g, "").slice(0, 250);
      toast.error(`Kiểm tra ${key.provider} thất bại: ${cleanMsg}`);
    } finally {
      setTestingKeyId(null);
    }
  };

  const handleDeleteKey = (id: number) => {
    askConfirm({
      title: "Xóa khóa API nhà cung cấp?",
      description: "Thao tác này sẽ xóa vĩnh viễn khóa API khỏi hệ thống. Nếu không có khóa dự phòng, các tác vụ AI có thể gặp lỗi.",
      confirmLabel: "Xóa khóa",
      danger: true,
      onConfirm: async () => {
        try {
          await aiConfigApi.deleteProviderKey(id);
          setKeys((prev) => prev.filter((k) => k.id !== id));
          toast.success("Đã xóa khóa API thành công");
        } catch (err: any) {
          toast.error(err.response?.data?.message || err.message || "Không thể xóa khóa");
        }
      },
    });
  };

  const handleTaskChange = (taskType: string, field: keyof AiModelConfig, value: any) => {
    setTasks((prev) =>
      prev.map((t) => (t.taskType === taskType ? { ...t, [field]: value } : t))
    );
  };

  const handleProviderChange = (taskType: string, newProvider: string) => {
    const modelsForNewProvider = pricings.filter(
      (p) => p.provider?.toUpperCase() === newProvider.toUpperCase() && p.isActive !== false
    );
    setTasks((prev) =>
      prev.map((t) => {
        if (t.taskType !== taskType) return t;
        const currentStillValid = modelsForNewProvider.some((m) => m.modelName === t.modelName);
        const nextModel = currentStillValid
          ? t.modelName
          : modelsForNewProvider[0]?.modelName || (MODEL_PRESETS[newProvider]?.[0] ?? t.modelName);
        return {
          ...t,
          provider: newProvider,
          modelName: nextModel,
        };
      })
    );
  };

  const handleFallbackProviderChange = (taskType: string, index: number, newProvider: string) => {
    const modelsForNewProvider = pricings.filter(
      (p) => p.provider?.toUpperCase() === newProvider.toUpperCase() && p.isActive !== false
    );
    setTasks((prev) =>
      prev.map((t) => {
        if (t.taskType !== taskType) return t;
        const currentSteps: AiFallbackStep[] =
          t.fallbackSteps && t.fallbackSteps.length > 0
            ? [...t.fallbackSteps]
            : t.failoverModel
              ? [{ provider: t.failoverProvider || t.provider || "GEMINI", model: t.failoverModel }]
              : [];
        const currentStep = currentSteps[index];
        const currentStillValid = modelsForNewProvider.some((m) => m.modelName === currentStep?.model);
        const nextModel = currentStillValid
          ? currentStep?.model
          : modelsForNewProvider[0]?.modelName || (MODEL_PRESETS[newProvider]?.[0] ?? "default");

        const nextSteps = currentSteps.map((s, idx) =>
          idx === index ? { ...s, provider: newProvider, model: nextModel } : s
        );
        return {
          ...t,
          fallbackSteps: nextSteps,
          failoverProvider: nextSteps[0]?.provider,
          failoverModel: nextSteps[0]?.model,
        };
      })
    );
  };

  const handleAddFallbackStep = (taskType: string) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.taskType !== taskType) return t;
        const currentSteps: AiFallbackStep[] =
          t.fallbackSteps && t.fallbackSteps.length > 0
            ? [...t.fallbackSteps]
            : t.failoverModel
              ? [{ provider: t.failoverProvider || t.provider || "GEMINI", model: t.failoverModel }]
              : [];
        const newStep: AiFallbackStep = {
          provider: "GROQ",
          model: "qwen/qwen3.8-27b",
          timeoutSeconds: 30,
        };
        const nextSteps = [...currentSteps, newStep];
        return {
          ...t,
          fallbackSteps: nextSteps,
          failoverProvider: nextSteps[0]?.provider,
          failoverModel: nextSteps[0]?.model,
        };
      })
    );
  };

  const handleUpdateFallbackStep = (
    taskType: string,
    index: number,
    field: keyof AiFallbackStep,
    value: any
  ) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.taskType !== taskType) return t;
        const currentSteps: AiFallbackStep[] =
          t.fallbackSteps && t.fallbackSteps.length > 0
            ? [...t.fallbackSteps]
            : t.failoverModel
              ? [{ provider: t.failoverProvider || t.provider || "GEMINI", model: t.failoverModel }]
              : [];
        const nextSteps = currentSteps.map((s, idx) =>
          idx === index ? { ...s, [field]: value } : s
        );
        return {
          ...t,
          fallbackSteps: nextSteps,
          failoverProvider: nextSteps[0]?.provider,
          failoverModel: nextSteps[0]?.model,
        };
      })
    );
  };

  const handleRemoveFallbackStep = (taskType: string, index: number) => {
    setTasks((prev) =>
      prev.map((t) => {
        if (t.taskType !== taskType) return t;
        const currentSteps: AiFallbackStep[] =
          t.fallbackSteps && t.fallbackSteps.length > 0
            ? [...t.fallbackSteps]
            : t.failoverModel
              ? [{ provider: t.failoverProvider || t.provider || "GEMINI", model: t.failoverModel }]
              : [];
        const nextSteps = currentSteps.filter((_, idx) => idx !== index);
        return {
          ...t,
          fallbackSteps: nextSteps,
          failoverProvider: nextSteps[0]?.provider || undefined,
          failoverModel: nextSteps[0]?.model || undefined,
        };
      })
    );
  };

  const isTaskDirty = (current: AiModelConfig) => {
    const orig = originalTasks.find((t) => t.taskType === current.taskType);
    if (!orig) return false;
    return (
      current.provider !== orig.provider ||
      current.modelName !== orig.modelName ||
      current.maxTokens !== orig.maxTokens ||
      current.temperature !== orig.temperature ||
      current.timeoutSeconds !== orig.timeoutSeconds ||
      current.isActive !== orig.isActive ||
      JSON.stringify(current.fallbackSteps || []) !== JSON.stringify(orig.fallbackSteps || []) ||
      current.failoverModel !== orig.failoverModel ||
      current.failoverProvider !== orig.failoverProvider
    );
  };

  const isTaskStatusDirty = (current: AiModelConfig) => {
    const orig = originalTasks.find((t) => t.taskType === current.taskType);
    if (!orig) return false;
    return (current.isActive !== false) !== (orig.isActive !== false);
  };

  const handleSaveTask = async (task: AiModelConfig) => {
    setSavingTask(task.taskType);
    try {
      await aiConfigApi.updateTaskConfig(task.taskType, task);
      setOriginalTasks((prev) =>
        prev.map((t) => (t.taskType === task.taskType ? JSON.parse(JSON.stringify(task)) : t))
      );
      toast.success(
        `Đã lưu cấu hình: ${TASK_METADATA[task.taskType]?.shortName || task.taskName} (${task.taskType})`
      );
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Lỗi khi cập nhật cấu hình task");
    } finally {
      setSavingTask(null);
    }
  };

  const handleSaveClusterStatus = async (clusterId: string, statusTasks: AiModelConfig[]) => {
    if (statusTasks.length === 0) return;
    setSavingClusterId(clusterId);
    try {
      await Promise.all(
        statusTasks.map((t) => aiConfigApi.updateTaskConfig(t.taskType, t))
      );
      setOriginalTasks((prev) =>
        prev.map((t) => {
          const saved = statusTasks.find((dt) => dt.taskType === t.taskType);
          return saved ? JSON.parse(JSON.stringify(saved)) : t;
        })
      );
      toast.success(`Đã lưu trạng thái ${statusTasks.length} tác vụ trong cụm!`);
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "Lỗi khi lưu trạng thái cụm tác vụ");
    } finally {
      setSavingClusterId(null);
    }
  };

  const [expandedDrawer, setExpandedDrawer] = useState<Record<string, boolean>>({});

  const toggleDrawer = (taskType: string) => {
    setExpandedDrawer((prev) => ({
      ...prev,
      [taskType]: !prev[taskType],
    }));
  };

  const groupedTasks = CLUSTERS.map((cluster) => {
    const clusterTasks = tasks
      .filter((t) => {
        const firstMatch = CLUSTERS.find((c) => c.matcher(t.taskType));
        return firstMatch?.id === cluster.id;
      })
      .sort((a, b) => {
        const orderA = cluster.orderMap[a.taskType] ?? 99;
        const orderB = cluster.orderMap[b.taskType] ?? 99;
        return orderA - orderB;
      });

    return {
      ...cluster,
      tasks: clusterTasks,
    };
  }).filter((group) => group.tasks.length > 0);

  const displayedClusters = groupedTasks;

  const filteredPricings = pricings.filter((p) => {
    if (!pricingSearch.trim()) return true;
    const q = pricingSearch.toLowerCase();
    return (
      p.modelName.toLowerCase().includes(q) ||
      (p.displayName && p.displayName.toLowerCase().includes(q)) ||
      p.provider.toLowerCase().includes(q)
    );
  });

  const allExpanded =
    groupedTasks.length > 0 && groupedTasks.every((g) => !!expandedClusters[g.id]);

  const toggleCluster = (clusterId: string) => {
    setExpandedClusters((prev) => ({
      ...prev,
      [clusterId]: !prev[clusterId],
    }));
  };

  const toggleAllClusters = () => {
    const nextState = !allExpanded;
    const update: Record<string, boolean> = {};
    groupedTasks.forEach((g) => {
      update[g.id] = nextState;
    });
    setExpandedClusters(update);
  };

  if (loading) {
    return <PageSkeleton variant="detail" />;
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <HeaderActions>
        <button
          type="button"
          onClick={() => fetchData(true)}
          className="inline-flex min-h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className="size-3.5" />
          <span>Làm mới</span>
        </button>
      </HeaderActions>

      {error && (
        <div className="flex items-center gap-2 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
          <AlertTriangle className="size-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* SECTION 1: API KEYS & PROVIDERS */}
      <section className={cn(surface, "overflow-hidden")}>
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-5 sm:p-6">
          <div>
            <div className="flex items-center gap-2">
              <Key className="size-5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-950">Danh sách Khóa API & Nhà cung cấp</h2>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setEditingKey(null);
              setIsAddKeyOpen(true);
            }}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition-colors"
          >
            <Plus className="size-4" />
            Thêm API Key mới
          </button>
        </div>

        {keys.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center">
            <ShieldCheck className="size-10 text-slate-300" />
            <p className="mt-2 text-sm font-semibold text-slate-800">Chưa có khóa API nào trong Master DB</p>
            <p className="mt-1 max-w-sm text-xs text-slate-500">
              Hệ thống hiện đang sử dụng khóa dự phòng từ biến môi trường (.env). Thêm khóa API tại đây để quản trị linh hoạt hơn.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3">Nhà cung cấp</th>
                  <th className="px-4 py-3">Tên nhận diện </th>
                  <th className="px-4 py-3">API Key </th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3">Kiểm tra gần nhất</th>
                  <th className="px-5 py-3 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {keys.map((key) => {
                  const isTesting = testingKeyId === key.id;

                  return (
                    <tr key={key.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-5 py-4 font-semibold text-slate-900">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "rounded-lg px-2.5 py-1 text-xs font-bold",
                              getProviderBadgeStyle(key.provider)
                            )}
                          >
                            {key.provider}
                          </span>
                          {key.isDefault && (
                            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 border border-amber-200">
                              Mặc định
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="px-4 py-4 font-medium text-slate-800">{key.keyAlias}</td>

                      <td className="px-4 py-4 font-mono text-xs text-slate-500">
                        {key.maskedKey || "••••••••••••••••"}
                      </td>

                      <td className="px-4 py-4">
                        {(() => {
                          const badge = getStatusBadge(key.status);
                          return (
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold border",
                                badge.className
                              )}
                            >
                              <i className={cn("size-1.5 rounded-full", badge.dotColor)} />
                              {badge.label}
                            </span>
                          );
                        })()}
                      </td>

                      <td className="px-4 py-4 text-xs text-slate-500">
                        {key.lastTestedAt
                          ? new Date(key.lastTestedAt).toLocaleString("vi-VN")
                          : "Chưa kiểm tra"}
                      </td>

                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            disabled={isTesting}
                            onClick={() => handleTestKey(key)}
                            className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                            title="Kiểm tra kết nối trực tiếp"
                          >
                            {isTesting ? (
                              <Loader2 className="size-3.5 animate-spin text-blue-600" />
                            ) : (
                              <Sparkles className="size-3.5 text-amber-500" />
                            )}
                            Test
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setEditingKey(key);
                              setIsAddKeyOpen(true);
                            }}
                            className="min-h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            Sửa
                          </button>

                          <button
                            type="button"
                            onClick={() => key.id && handleDeleteKey(key.id)}
                            className="min-h-8 rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                            title="Xóa khóa"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* SECTION 2: TASK-TO-MODEL ROUTING (CLUSTERED BY FEATURE FAMILY) */}
      <section className="space-y-4">
        {/* SECTION HEADER & GLOBAL EXPAND/COLLAPSE */}
        <div className={cn(surface, "flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6")}>
          <div>
            <div className="flex items-center gap-2">
              <Sliders className="size-5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-950">Phân bổ Model theo Cụm Nghiệp vụ</h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Chỉ định mô hình AI chính, mô hình dự phòng (Failover) và tham số vận hành theo từng cụm tính năng độc lập.
            </p>
          </div>

          <button
            type="button"
            onClick={toggleAllClusters}
            className="inline-flex min-h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs transition-colors"
          >
            {allExpanded ? <ChevronUp className="size-3.5 text-slate-500" /> : <ChevronDown className="size-3.5 text-slate-500" />}
            <span>{allExpanded ? "Thu gọn tất cả" : "Mở rộng tất cả"}</span>
          </button>
        </div>

        {/* INDEPENDENT CLUSTER CARDS (SPACE-Y-6) */}
        <div className="space-y-6">
          {displayedClusters.length === 0 ? (
            <div className={cn(surface, "p-8 text-center text-xs text-slate-500")}>
              Không tìm thấy tác vụ nào.
            </div>
          ) : (
            displayedClusters.map((cluster) => {
              const isExpanded = !!expandedClusters[cluster.id];
              const isSavingThisCluster = savingClusterId === cluster.id;
              const statusDirtyTasks = cluster.tasks.filter(isTaskStatusDirty);
              const isClusterStatusDirty = statusDirtyTasks.length > 0;
              const ClusterIcon = cluster.icon || Cpu;

              return (
                <div
                  key={cluster.id}
                  className="rounded-2xl border border-slate-200/90 bg-white shadow-xs transition-all relative"
                >
                  {/* CLUSTER CARD HEADER WITH TINT ACCENT & ICON */}
                  <div
                    className={cn(
                      "flex items-center justify-between px-5 py-3.5 transition-colors cursor-pointer select-none",
                      isExpanded ? "rounded-t-2xl border-b" : "rounded-2xl",
                      cluster.headerBg || "bg-gradient-to-r from-blue-50/70 via-slate-50/40 to-white border-blue-100/70"
                    )}
                    onClick={() => toggleCluster(cluster.id)}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className={cn("flex size-7 items-center justify-center rounded-lg border bg-white shadow-2xs", cluster.accentColor || "text-blue-600 border-blue-200/80")}>
                        <ClusterIcon className="size-4" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                        {cluster.title}
                      </span>
                      <span className="rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200/80">
                        {cluster.tasks.length} tác vụ
                      </span>
                      {isClusterStatusDirty && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800 animate-pulse">
                          {statusDirtyTasks.length} đổi trạng thái
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
                      {/* Cluster Save button: ONLY shown when status (Bật/Tắt) is changed on outside tasks */}
                      {isClusterStatusDirty && (
                        <button
                          type="button"
                          disabled={isSavingThisCluster}
                          onClick={() => handleSaveClusterStatus(cluster.id, statusDirtyTasks)}
                          className="inline-flex h-7 items-center gap-1.5 rounded-lg bg-blue-600 px-2.5 text-[11px] font-semibold text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-2xs"
                          title="Lưu trạng thái Bật / Tắt các tác vụ trong cụm này"
                        >
                          {isSavingThisCluster ? (
                            <>
                              <Loader2 className="size-3 animate-spin" />
                              <span>Đang lưu...</span>
                            </>
                          ) : (
                            <>
                              <Save className="size-3" />
                              <span>Lưu cụm ({statusDirtyTasks.length})</span>
                            </>
                          )}
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => toggleCluster(cluster.id)}
                        className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-white/80 transition-colors"
                        title={isExpanded ? "Thu gọn cụm" : "Mở rộng cụm"}
                      >
                        {isExpanded ? (
                          <ChevronUp className="size-4" />
                        ) : (
                          <ChevronDown className="size-4" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* CLUSTER TASKS LIST (RESPONSIVE ROW CARDS - NO TABLE, NO SCROLLBARS) */}
                  {isExpanded && (
                    <div className="divide-y divide-slate-100 rounded-b-2xl">
                      {cluster.tasks.map((task, taskIdx) => {
                        const isSaving = savingTask === task.taskType;
                        const isDirty = isTaskDirty(task);
                        const meta = TASK_METADATA[task.taskType];
                        const displayName = meta?.shortName || task.taskName;
                        const explanation = meta?.description;
                        const availableModels = pricings.filter(
                          (p) => p.provider?.toUpperCase() === task.provider?.toUpperCase() && p.isActive !== false
                        );
                        const hasCurrentModel = availableModels.some((m) => m.modelName === task.modelName);
                        const effectiveSteps: AiFallbackStep[] =
                          task.fallbackSteps && task.fallbackSteps.length > 0
                            ? task.fallbackSteps
                            : task.failoverModel
                              ? [{ provider: task.failoverProvider || task.provider || "GEMINI", model: task.failoverModel }]
                              : [];
                        const isDrawerOpen = !!expandedDrawer[task.taskType];

                        return (
                          <div
                            key={task.taskType}
                            className={cn(
                              "relative transition-all p-4 sm:p-5 hover:z-30 focus-within:z-30",
                              taskIdx % 2 === 1 ? "bg-slate-50/35" : "bg-white",
                              taskIdx === cluster.tasks.length - 1 ? "rounded-b-2xl" : "",
                              "hover:bg-blue-50/20"
                            )}
                          >
                            <div className="flex flex-col gap-3.5 lg:flex-row lg:items-center lg:justify-between">
                              {/* Left: Task Identity & Hover Tooltip */}
                              <div className="flex items-center gap-3 min-w-0">
                                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-100/90 border border-slate-200/80 shadow-2xs">
                                  {getTaskIcon(task.taskType)}
                                </div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="text-sm font-bold text-slate-900 leading-snug">
                                    {displayName}
                                  </span>
                                  {explanation && (
                                    <div className="group/tooltip relative inline-flex items-center">
                                      <button
                                        type="button"
                                        className="inline-flex size-4.5 cursor-help items-center justify-center rounded-full bg-slate-100 text-[11px] font-bold text-slate-500 hover:bg-blue-100 hover:text-blue-700 transition-all border border-slate-200/80 shadow-2xs"
                                        aria-label="Xem giải thích tác vụ"
                                      >
                                        !
                                      </button>
                                      <div className="pointer-events-none invisible opacity-0 group-hover/tooltip:visible group-hover/tooltip:opacity-100 transition-all duration-150 absolute left-0 top-full mt-2 w-80 max-w-[calc(100vw-3rem)] rounded-xl bg-slate-900 p-3.5 text-xs text-slate-200 shadow-2xl z-50 leading-relaxed font-sans font-normal border border-slate-700">
                                        <div className="font-bold text-white border-b border-slate-700/80 pb-1.5 mb-1.5 flex items-center justify-between">
                                          <span>{displayName}</span>
                                          <span className="font-mono text-[10px] text-blue-300 font-semibold px-1.5 py-0.5 rounded bg-blue-950 border border-blue-800">
                                            {task.taskType}
                                          </span>
                                        </div>
                                        <p className="text-slate-300 text-[11.5px] leading-relaxed">
                                          {explanation}
                                        </p>
                                        <div className="absolute bottom-full left-2 -mb-1 border-4 border-transparent border-b-slate-900" />
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Right: Action Controls Bar */}
                              <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
                                {/* Provider Select */}
                                <select
                                  value={task.provider}
                                  onChange={(e) => handleProviderChange(task.taskType, e.target.value)}
                                  className="h-8.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition-all"
                                  title="Chọn nhà cung cấp AI"
                                >
                                  <option value="GEMINI">GEMINI</option>
                                  <option value="OPENAI">OPENAI</option>
                                  <option value="ANTHROPIC">ANTHROPIC</option>
                                  <option value="CURSOR">CURSOR</option>
                                  <option value="OPENROUTER">OPENROUTER</option>
                                  <option value="GROQ">GROQ</option>
                                  <option value="DEEPSEEK">DEEPSEEK</option>
                                  <option value="MISTRAL">MISTRAL</option>
                                  <option value="XAI">XAI</option>
                                  <option value="PERPLEXITY">PERPLEXITY</option>
                                  <option value="OLLAMA">OLLAMA</option>
                                  <option value="HUGGINGFACE">HUGGINGFACE</option>
                                  <option value="CUSTOM">CUSTOM</option>
                                </select>

                                {/* Primary Model Select (Highlighted) */}
                                <div className="flex items-center gap-1.5 min-w-[200px] sm:w-60">
                                  <span className="inline-block size-2 shrink-0 rounded-full bg-blue-600" title="Model chính (Primary)" />
                                  <select
                                    value={task.modelName}
                                    onChange={(e) => handleTaskChange(task.taskType, "modelName", e.target.value)}
                                    className="h-8.5 w-full rounded-lg border border-blue-200/90 bg-blue-50/25 px-2.5 font-mono text-xs font-bold text-blue-950 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition-all"
                                    title="Chọn model chính vận hành tác vụ"
                                  >
                                    {!hasCurrentModel && task.modelName && (
                                      <option value={task.modelName}>⚠️ {task.modelName}</option>
                                    )}
                                    {availableModels.length === 0 && (
                                      <option value="" disabled>-- Chưa có model trong đơn giá --</option>
                                    )}
                                    {availableModels.map((p) => (
                                      <option key={p.id ?? p.modelName} value={p.modelName}>
                                        {p.displayName || p.modelName}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                {/* Status Toggle */}
                                <label className="inline-flex cursor-pointer items-center gap-1.5 px-1 py-1" title={task.isActive !== false ? "Đang bật" : "Đang tắt"}>
                                  <input
                                    type="checkbox"
                                    checked={task.isActive !== false}
                                    onChange={(e) => handleTaskChange(task.taskType, "isActive", e.target.checked)}
                                    className="size-4 accent-blue-600 rounded"
                                  />
                                  <span className="text-xs font-medium text-slate-700">
                                    {task.isActive !== false ? "Bật" : "Tắt"}
                                  </span>
                                </label>

                                {/* Cài đặt Button (Chỉ để nút cài đặt và vào cài đặt) */}
                                <button
                                  type="button"
                                  onClick={() => toggleDrawer(task.taskType)}
                                  className={cn(
                                    "inline-flex h-8.5 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition-all",
                                    isDrawerOpen
                                      ? "border-blue-500 bg-blue-50 text-blue-700 shadow-2xs ring-1 ring-blue-200"
                                      : isDirty
                                        ? "border-amber-300 bg-amber-50/60 text-amber-900 hover:bg-amber-50 hover:border-amber-400"
                                        : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:border-slate-300"
                                  )}
                                  title="Cài đặt chuỗi dự phòng và tham số"
                                >
                                  <Sliders className="size-3.5" />
                                  {isDirty && !isDrawerOpen && (
                                    <span className="size-1.5 rounded-full bg-amber-500 animate-pulse" title="Có thay đổi chưa lưu" />
                                  )}
                                  {isDrawerOpen ? (
                                    <ChevronUp className="size-3.5 text-slate-400" />
                                  ) : (
                                    <ChevronDown className="size-3.5 text-slate-400" />
                                  )}
                                </button>
                              </div>
                            </div>

                            {/* INLINE EXPANDABLE DRAWER (CÀI ĐẶT CHUỖI DỰ PHÒNG & THAM SỐ) */}
                            {isDrawerOpen && (
                              <div className="mt-3.5 rounded-xl border border-slate-200/90 bg-slate-50/70 p-3.5 sm:p-4 shadow-2xs">
                                {/* DRAWER TOP BAR */}
                                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/70 pb-3">
                                  <div className="flex items-center gap-2">
                                    <Sliders className="size-4 text-blue-600" />
                                    <span className="text-xs font-bold uppercase tracking-wider text-slate-800">
                                      Cài đặt
                                    </span>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    {/* Thêm cấp tiếp theo */}
                                    <button
                                      type="button"
                                      onClick={() => handleAddFallbackStep(task.taskType)}
                                      className="inline-flex h-7.5 items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition-colors shadow-2xs"
                                    >
                                      <Plus className="size-3.5" />
                                      <span>Thêm cấp tiếp theo</span>
                                    </button>

                                    {/* Nút lưu hiển thị phía trong cài đặt bên cạnh chỗ thêm cấp tiếp theo */}
                                    {(isDirty || isSaving) && (
                                      <button
                                        type="button"
                                        disabled={isSaving}
                                        onClick={() => handleSaveTask(task)}
                                        className="inline-flex h-7.5 items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white shadow-xs hover:bg-blue-700 transition-all disabled:opacity-60"
                                      >
                                        {isSaving ? (
                                          <>
                                            <Loader2 className="size-3 animate-spin" />
                                            <span>Đang lưu...</span>
                                          </>
                                        ) : (
                                          <>
                                            <Save className="size-3" />
                                            <span>Lưu cấu hình</span>
                                          </>
                                        )}
                                      </button>
                                    )}

                                    {/* Đóng */}
                                    <button
                                      type="button"
                                      onClick={() => setExpandedDrawer((prev) => ({ ...prev, [task.taskType]: false }))}
                                      className="inline-flex h-7.5 items-center gap-1 rounded-md px-2 text-xs font-medium text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 transition-colors"
                                      title="Đóng cài đặt"
                                    >
                                      <span>Đóng</span>
                                      <ChevronUp className="size-3.5" />
                                    </button>
                                  </div>
                                </div>

                                {/* FALLBACK STEPS (CHIA ĐỀU 1 HÀNG 2 CỘT ĐỀU NHAU) */}
                                <div className="mt-3">
                                  {effectiveSteps.length === 0 ? (
                                    <div className="rounded-xl border border-dashed border-slate-200 bg-white/70 py-4 text-center">
                                      <p className="text-xs text-slate-500">Chưa thiết lập mô hình dự phòng (Failover) cho tác vụ này.</p>
                                      <button
                                        type="button"
                                        onClick={() => handleAddFallbackStep(task.taskType)}
                                        className="mt-1.5 inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:underline"
                                      >
                                        <Plus className="size-3" />
                                        <span>Bấm để thêm cấp 1</span>
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                      {effectiveSteps.map((step, stepIdx) => {
                                        const stepAvailableModels = pricings.filter(
                                          (p) =>
                                            p.provider?.toUpperCase() === (step.provider || "GEMINI").toUpperCase() &&
                                            p.isActive !== false
                                        );
                                        const stepHasModel = stepAvailableModels.some((m) => m.modelName === step.model);

                                        return (
                                          <div
                                            key={stepIdx}
                                            className="flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white p-2.5 sm:p-3 shadow-2xs hover:border-blue-300 transition-all"
                                          >
                                            <span className="shrink-0 rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-700 border border-slate-200">
                                              Cấp {stepIdx + 1}
                                            </span>
                                            <select
                                              value={step.provider || "GEMINI"}
                                              onChange={(e) =>
                                                handleFallbackProviderChange(task.taskType, stepIdx, e.target.value)
                                              }
                                              className="h-8 shrink-0 rounded-lg border border-slate-200 bg-white px-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100"
                                            >
                                              {Object.keys(MODEL_PRESETS).map((p) => (
                                                <option key={p} value={p}>{p}</option>
                                              ))}
                                            </select>
                                            <span className="shrink-0 text-slate-400 text-xs font-bold">➔</span>
                                            <select
                                              value={step.model || ""}
                                              onChange={(e) =>
                                                handleUpdateFallbackStep(task.taskType, stepIdx, "model", e.target.value)
                                              }
                                              className="h-8 min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 font-mono text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 truncate"
                                            >
                                              {!stepHasModel && step.model && (
                                                <option value={step.model}>{step.model}</option>
                                              )}
                                              {stepAvailableModels.map((p) => (
                                                <option key={p.id ?? p.modelName} value={p.modelName}>
                                                  {p.displayName || p.modelName}
                                                </option>
                                              ))}
                                            </select>
                                            <button
                                              type="button"
                                              onClick={() => handleRemoveFallbackStep(task.taskType, stepIdx)}
                                              className="shrink-0 rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                                              title="Xóa cấp dự phòng này"
                                            >
                                              <Trash2 className="size-4" />
                                            </button>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>

                                {/* COMPACT OPERATIONAL PARAMETERS */}
                                <div className="mt-3.5 pt-3 border-t border-slate-200/60 flex flex-wrap items-center gap-4 text-xs text-slate-600">
                                  <span className="font-semibold text-slate-700">Tham số vận hành:</span>
                                  <label className="flex items-center gap-1.5">
                                    <span className="text-slate-500">Max Tokens:</span>
                                    <input
                                      type="number"
                                      min={128}
                                      max={128000}
                                      step={256}
                                      value={task.maxTokens ?? 4096}
                                      onChange={(e) => handleTaskChange(task.taskType, "maxTokens", Number(e.target.value))}
                                      className="h-7 w-20 rounded-md border border-slate-200 bg-white px-2 font-mono text-xs text-slate-800 outline-none focus:border-blue-500"
                                    />
                                  </label>
                                  <label className="flex items-center gap-1.5">
                                    <span className="text-slate-500">Temperature:</span>
                                    <input
                                      type="number"
                                      min={0}
                                      max={2}
                                      step={0.1}
                                      value={task.temperature ?? 0.2}
                                      onChange={(e) => handleTaskChange(task.taskType, "temperature", Number(e.target.value))}
                                      className="h-7 w-16 rounded-md border border-slate-200 bg-white px-2 font-mono text-xs text-slate-800 outline-none focus:border-blue-500"
                                    />
                                  </label>
                                  <label className="flex items-center gap-1.5">
                                    <span className="text-slate-500">Timeout (s):</span>
                                    <input
                                      type="number"
                                      min={5}
                                      max={300}
                                      step={5}
                                      value={task.timeoutSeconds ?? 60}
                                      onChange={(e) => handleTaskChange(task.taskType, "timeoutSeconds", Number(e.target.value))}
                                      className="h-7 w-16 rounded-md border border-slate-200 bg-white px-2 font-mono text-xs text-slate-800 outline-none focus:border-blue-500"
                                    />
                                  </label>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </section>

      {/* SECTION 2.5: SHORT-TERM REDIS RATE LIMITING (RPM / TPM) */}
      <section className={cn(surface, "overflow-hidden")}>
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-5 sm:p-6">
          <div>
            <div className="flex items-center gap-2">
              <Gauge className="size-5 text-blue-600" />
              <h2 className="text-base font-bold text-slate-950">
                Bảo vệ Tài nguyên & Giới hạn Tốc độ Ngắn hạn
              </h2>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Chống cạn kiệt tài nguyên / Noisy Neighbor: giới hạn số lượng yêu cầu AI mỗi phút (RPM) và số Tokens mỗi phút (TPM) trên từng Tenant bằng Redis. Vượt ngưỡng sẽ trả về HTTP 429.
            </p>
          </div>
          <label className="inline-flex cursor-pointer items-center gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-800">
            <input
              type="checkbox"
              checked={rateLimit.enabled}
              onChange={(e) => setRateLimit((prev) => ({ ...prev, enabled: e.target.checked }))}
              className="size-4 accent-blue-600"
            />
            <span>{rateLimit.enabled ? "Đang bật Rate Limiter" : "Đang tắt Rate Limiter"}</span>
          </label>
        </div>

        <div className="grid gap-5 p-5 sm:p-6 md:grid-cols-3 md:items-end">
          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Giới hạn RPM mặc định / Tenant (Requests / phút)
            </label>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Số lệnh gọi LLM tối đa trong 1 phút của một doanh nghiệp (khuyến nghị: 20–60 req/phút).
            </p>
            <input
              type="number"
              min={1}
              max={10000}
              disabled={!rateLimit.enabled}
              value={rateLimit.defaultRpmPerTenant}
              onChange={(e) =>
                setRateLimit((prev) => ({
                  ...prev,
                  defaultRpmPerTenant: Math.max(1, parseInt(e.target.value, 10) || 30),
                }))
              }
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">
              Giới hạn TPM mặc định / Tenant (Tokens / phút)
            </label>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Tổng Prompt + Completion tokens tối đa trong 1 phút (khuyến nghị: 60.000–200.000 tokens/phút).
            </p>
            <input
              type="number"
              min={1000}
              step={5000}
              disabled={!rateLimit.enabled}
              value={rateLimit.defaultTpmPerTenant}
              onChange={(e) =>
                setRateLimit((prev) => ({
                  ...prev,
                  defaultTpmPerTenant: Math.max(1000, parseInt(e.target.value, 10) || 100000),
                }))
              }
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
            />
          </div>

          <div className="flex flex-col items-stretch sm:items-end">
            <button
              type="button"
              disabled={savingRateLimit}
              onClick={handleSaveRateLimit}
              className={cn(
                "inline-flex min-h-10 items-center justify-center gap-2 rounded-xl px-5 text-xs font-semibold shadow-sm transition-all",
                savedRateLimitSuccess
                  ? "bg-emerald-600 text-white"
                  : "bg-blue-600 text-white hover:bg-blue-700"
              )}
            >
              {savingRateLimit ? (
                <Loader2 className="size-4 animate-spin" />
              ) : savedRateLimitSuccess ? (
                <CheckCircle2 className="size-4" />
              ) : (
                <Save className="size-4" />
              )}
              {savedRateLimitSuccess ? "Đã đồng bộ Redis!" : "Lưu cấu hình Rate Limit"}
            </button>
          </div>
        </div>
      </section>

      {/* SECTION 2.8: MODEL PRICING & REGISTRY (STREAMLINED + LIVE TEST CONNECTION) */}
      <section className={cn(surface, "overflow-hidden")}>
        {/* SECTION HEADER */}
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 p-5 sm:p-6">
          <div>
            <div className="flex items-center gap-2">
              <Coins className="size-5 text-amber-600" />
              <h2 className="text-base font-bold text-slate-950">
                Danh mục & Đơn giá Model AI
              </h2>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600 border border-slate-200">
                {pricings.length} models
              </span>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Quản lý danh mục Model chuẩn hóa, đơn giá và kiểm tra kết nối trực tiếp đến từng model AI.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Search filter */}
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Tìm model / provider..."
                value={pricingSearch}
                onChange={(e) => setPricingSearch(e.target.value)}
                className="h-8 w-44 rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-100 transition-all placeholder:text-slate-400"
              />
              {pricingSearch && (
                <button
                  type="button"
                  onClick={() => setPricingSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="size-3" />
                </button>
              )}
            </div>

            {/* Toggle Add Model Form */}
            <button
              type="button"
              onClick={() => setIsAddingPricing((prev) => !prev)}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold shadow-2xs transition-all",
                isAddingPricing
                  ? "border border-slate-300 bg-slate-100 text-slate-700 hover:bg-slate-200"
                  : "bg-blue-600 text-white hover:bg-blue-700 shadow-xs"
              )}
            >
              {isAddingPricing ? <X className="size-3.5" /> : <Plus className="size-3.5" />}
              <span>{isAddingPricing ? "Đóng" : "Thêm model"}</span>
            </button>
          </div>
        </div>

        {/* COLLAPSIBLE ADD NEW MODEL FORM */}
        {isAddingPricing && (
          <div className="border-b border-blue-100 bg-gradient-to-r from-blue-50/50 via-slate-50/50 to-white p-4 sm:p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-900">
                Thêm Model Mới vào Danh mục Hệ thống
              </span>
              <button
                type="button"
                onClick={() => setIsAddingPricing(false)}
                className="text-xs text-slate-400 hover:text-slate-600"
              >
                Hủy
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Provider</label>
                <select
                  value={newPricing.provider}
                  onChange={(e) =>
                    setNewPricing((prev) => ({ ...prev, provider: e.target.value }))
                  }
                  className="h-8.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                >
                  <option value="GEMINI">GEMINI</option>
                  <option value="OPENAI">OPENAI</option>
                  <option value="ANTHROPIC">ANTHROPIC</option>
                  <option value="CURSOR">CURSOR</option>
                  <option value="OPENROUTER">OPENROUTER</option>
                  <option value="GROQ">GROQ</option>
                  <option value="DEEPSEEK">DEEPSEEK</option>
                  <option value="MISTRAL">MISTRAL</option>
                  <option value="XAI">XAI</option>
                  <option value="PERPLEXITY">PERPLEXITY</option>
                  <option value="OLLAMA">OLLAMA</option>
                  <option value="HUGGINGFACE">HUGGINGFACE</option>
                  <option value="CUSTOM">CUSTOM</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Mã Model (ID) *</label>
                <input
                  type="text"
                  placeholder="vd: qwen/qwen3.8-27b"
                  value={newPricing.modelName}
                  onChange={(e) =>
                    setNewPricing((prev) => ({ ...prev, modelName: e.target.value }))
                  }
                  className="h-8.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 font-mono text-xs text-slate-900 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tên hiển thị</label>
                <input
                  type="text"
                  placeholder="vd: Qwen 3.8 27B"
                  value={newPricing.displayName || ""}
                  onChange={(e) =>
                    setNewPricing((prev) => ({ ...prev, displayName: e.target.value }))
                  }
                  className="h-8.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-900 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Giá Input ($/1M)</label>
                <input
                  type="number"
                  min={0}
                  step="0.0001"
                  value={newPricing.inputPricePer1mTokens}
                  onChange={(e) =>
                    setNewPricing((prev) => ({
                      ...prev,
                      inputPricePer1mTokens: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="h-8.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 font-mono text-xs text-slate-900 outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Giá Output ($/1M)</label>
                <input
                  type="number"
                  min={0}
                  step="0.0001"
                  value={newPricing.outputPricePer1mTokens}
                  onChange={(e) =>
                    setNewPricing((prev) => ({
                      ...prev,
                      outputPricePer1mTokens: parseFloat(e.target.value) || 0,
                    }))
                  }
                  className="h-8.5 w-full rounded-lg border border-slate-200 bg-white px-2.5 font-mono text-xs text-slate-900 outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddingPricing(false)}
                className="h-8 rounded-lg border border-slate-200 bg-white px-3 text-xs font-medium text-slate-600 hover:bg-slate-50"
              >
                Hủy
              </button>
              <button
                type="button"
                disabled={savingPricingKey === "__NEW__"}
                onClick={handleAddPricing}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50 shadow-xs"
              >
                {savingPricingKey === "__NEW__" ? (
                  <Loader2 className="size-3.5 animate-spin" />
                ) : (
                  <Plus className="size-3.5" />
                )}
                <span>Xác nhận thêm</span>
              </button>
            </div>
          </div>
        )}

        {/* MODEL LIST TABLE (STREAMLINED + NO HORIZONTAL SCROLLBAR + LIVE TEST CONNECTION) */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3 w-[30%]">Model & Provider</th>
                <th className="px-4 py-3 w-[26%]">Đơn giá ($ / 1M Tokens)</th>
                <th className="px-4 py-3 w-[24%]">Kiểm tra kết nối trực tiếp</th>
                <th className="px-4 py-3 w-20 text-center">Trạng thái</th>
                <th className="px-5 py-3 w-24 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {filteredPricings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-xs text-slate-400">
                    Không tìm thấy model nào phù hợp.
                  </td>
                </tr>
              ) : (
                filteredPricings.map((pricing) => {
                  const isSaving = savingPricingKey === pricing.modelName;
                  const isSaved = savedPricingKeySuccess === pricing.modelName;
                  const isTesting = testingModelKey === pricing.modelName;
                  const testResult = modelTestResults[pricing.modelName];

                  return (
                    <tr key={pricing.id ?? pricing.modelName} className="hover:bg-slate-50/60 transition-colors">
                      {/* 1. Model & Provider */}
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={cn(
                              "shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider border",
                              getProviderBadge(pricing.provider)
                            )}
                          >
                            {pricing.provider}
                          </span>
                          <div className="min-w-0">
                            <input
                              type="text"
                              value={pricing.displayName || ""}
                              placeholder={pricing.modelName}
                              onChange={(e) =>
                                handlePricingChange(pricing.modelName, "displayName", e.target.value)
                              }
                              className="h-7 w-44 rounded-md border border-transparent bg-transparent px-1.5 text-xs font-bold text-slate-900 outline-none hover:border-slate-200 focus:border-blue-500 focus:bg-white transition-all"
                              title="Bấm để sửa tên hiển thị"
                            />
                            <div className="font-mono text-[11px] text-slate-400 px-1.5 truncate">
                              {pricing.modelName}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Đơn giá In / Out */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] text-slate-400 font-medium">In:</span>
                            <div className="relative">
                              <span className="pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-mono">$</span>
                              <input
                                type="number"
                                min={0}
                                step="0.0001"
                                value={pricing.inputPricePer1mTokens}
                                onChange={(e) =>
                                  handlePricingChange(
                                    pricing.modelName,
                                    "inputPricePer1mTokens",
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="h-7 w-20 rounded-md border border-slate-200 bg-white pl-4 pr-1.5 font-mono text-xs font-semibold text-slate-900 outline-none focus:border-blue-500"
                                title="Giá input trên 1 triệu tokens"
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-1">
                            <span className="text-[11px] text-slate-400 font-medium">Out:</span>
                            <div className="relative">
                              <span className="pointer-events-none absolute left-1.5 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-mono">$</span>
                              <input
                                type="number"
                                min={0}
                                step="0.0001"
                                value={pricing.outputPricePer1mTokens}
                                onChange={(e) =>
                                  handlePricingChange(
                                    pricing.modelName,
                                    "outputPricePer1mTokens",
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="h-7 w-20 rounded-md border border-slate-200 bg-white pl-4 pr-1.5 font-mono text-xs font-semibold text-slate-900 outline-none focus:border-blue-500"
                                title="Giá output trên 1 triệu tokens"
                              />
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* 3. Kiểm tra kết nối trực tiếp (Live Ping Test) */}
                      <td className="px-4 py-3">
                        {isTesting ? (
                          <div className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 text-xs font-medium text-slate-600">
                            <Loader2 className="size-3 animate-spin text-blue-600" />
                            <span>Đang ping model...</span>
                          </div>
                        ) : testResult ? (
                          <div className="inline-flex items-center gap-1.5">
                            {testResult.success ? (
                              <span
                                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200 shadow-2xs"
                                title={testResult.message || "Kết nối thành công"}
                              >
                                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                                <span>Hoạt động ({testResult.latencyMs ?? 0}ms)</span>
                              </span>
                            ) : (
                              <span
                                className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 border border-rose-200 shadow-2xs max-w-[210px]"
                                title={testResult.message}
                              >
                                <AlertTriangle className="size-3 text-rose-500 shrink-0" />
                                <span className="truncate">Lỗi: {testResult.message}</span>
                              </span>
                            )}
                            <button
                              type="button"
                              onClick={() => handleTestModel(pricing)}
                              className="p-1 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
                              title="Kiểm tra lại kết nối"
                            >
                              <RefreshCw className="size-3.5" />
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleTestModel(pricing)}
                            className="inline-flex h-7 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 text-xs font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300 transition-all shadow-2xs"
                            title="Gửi request kiểm tra kết nối và độ trễ thực tế"
                          >
                            <Zap className="size-3.5 text-amber-500" />
                            <span>Test kết nối</span>
                          </button>
                        )}
                      </td>

                      {/* 4. Trạng thái (Bật/Tắt) */}
                      <td className="px-4 py-3 text-center">
                        <label className="inline-flex cursor-pointer items-center justify-center gap-1" title={pricing.isActive !== false ? "Đang bật" : "Đang tắt"}>
                          <input
                            type="checkbox"
                            checked={pricing.isActive !== false}
                            onChange={(e) =>
                              handlePricingChange(pricing.modelName, "isActive", e.target.checked)
                            }
                            className="size-4 accent-blue-600 rounded"
                          />
                          <span className="text-xs font-medium text-slate-700">
                            {pricing.isActive !== false ? "Bật" : "Tắt"}
                          </span>
                        </label>
                      </td>

                      {/* 5. Thao tác (Lưu, Xóa) */}
                      <td className="px-5 py-3 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            disabled={isSaving}
                            onClick={() => handleSavePricing(pricing)}
                            className={cn(
                              "inline-flex h-7 items-center gap-1 rounded-lg px-2.5 text-xs font-semibold text-white transition-colors shadow-2xs",
                              isSaved ? "bg-emerald-600" : "bg-slate-900 hover:bg-blue-600"
                            )}
                            title="Lưu thay đổi model này"
                          >
                            {isSaving ? (
                              <Loader2 className="size-3 animate-spin" />
                            ) : isSaved ? (
                              <CheckCircle2 className="size-3" />
                            ) : (
                              <Save className="size-3" />
                            )}
                            <span>{isSaved ? "Đã lưu" : "Lưu"}</span>
                          </button>
                          {pricing.id && (
                            <button
                              type="button"
                              onClick={() => handleDeletePricing(pricing.id, pricing.modelName)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                              title="Xóa model khỏi danh mục"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* SECTION 3: RESILIENCE & ARCHITECTURE INFO */}
      <section className="grid gap-5 md:grid-cols-3">
        <div className={cn(surface, "p-5")}>
          <div className="flex items-center gap-2.5 text-blue-700">
            <Zap className="size-5" />
            <h3 className="text-sm font-bold text-slate-950">Zero Downtime Hot-Swap</h3>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Mọi thay đổi cấu hình Model hoặc API Key được đồng bộ tức thời vào Redis Cache và có hiệu lực ngay trong request tiếp theo mà không cần khởi động lại ứng dụng.
          </p>
        </div>

        <div className={cn(surface, "p-5")}>
          <div className="flex items-center gap-2.5 text-emerald-700">
            <ShieldCheck className="size-5" />
            <h3 className="text-sm font-bold text-slate-950">Mã hóa AES-256 GCM</h3>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Khóa API được mã hóa bằng chuẩn mật mã AES-256 trước khi lưu vào Master DB và được che mask trên giao diện người dùng nhằm chống rò rỉ bảo mật.
          </p>
        </div>

        <div className={cn(surface, "p-5")}>
          <div className="flex items-center gap-2.5 text-amber-700">
            <AlertTriangle className="size-5" />
            <h3 className="text-sm font-bold text-slate-950">Cơ chế Heuristic Fallback</h3>
          </div>
          <p className="mt-2 text-xs leading-5 text-slate-500">
            Khi AI Provider gặp sự cố mạng hoặc hết quota, hệ thống tự động fallback về Heuristic Parser hoặc Model dự phòng đã cấu hình để đảm bảo nghiệp vụ không bị gián đoạn.
          </p>
        </div>
      </section>

      {/* ADD / EDIT MODAL */}
      <AddAiKeyModal
        key={editingKey?.id ? `edit-${editingKey.id}` : "create-new"}
        isOpen={isAddKeyOpen}
        onClose={() => {
          setIsAddKeyOpen(false);
          setEditingKey(null);
        }}
        onSuccess={() => fetchData()}
        initialKey={editingKey}
      />
    </div>
  );
}
