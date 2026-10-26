import { useEffect, useState } from "react";
import {
  BrainCircuit,
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
    "claude-sonnet-4-5",
    "claude-haiku-4-5",
    "claude-sonnet-4",
    "gpt-5.1",
    "gemini-3.5-flash",
    "cursor-small",
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

export function AiEngineConfiguration() {
  const [keys, setKeys] = useState<AiProviderKey[]>([]);
  const [tasks, setTasks] = useState<AiModelConfig[]>([]);
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
  const [savedTaskSuccess, setSavedTaskSuccess] = useState<string | null>(null);

  const [testingKeyId, setTestingKeyId] = useState<number | null>(null);
  const [testResult, setTestResult] = useState<{ id: number; success: boolean; message: string; latencyMs?: number } | null>(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [keysRes, tasksRes, rateLimitRes, pricingsRes] = await Promise.all([
        aiConfigApi.getProviderKeys(),
        aiConfigApi.getTaskConfigs(),
        aiConfigApi.getRateLimitConfig().catch(() => null),
        aiConfigApi.getModelPricings().catch(() => []),
      ]);
      setKeys(keysRes);
      setTasks(tasksRes);
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
      setTimeout(() => setSavedPricingKeySuccess(null), 2500);
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Lỗi khi lưu đơn giá Model");
    } finally {
      setSavingPricingKey(null);
    }
  };

  const handleAddPricing = async () => {
    if (!newPricing.modelName.trim()) {
      alert("Vui lòng nhập tên Model (ví dụ: gemini-2.5-flash hoặc qwen/qwen3.8-27b)");
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
      alert(err.response?.data?.message || err.message || "Lỗi khi thêm đơn giá Model");
    } finally {
      setSavingPricingKey(null);
    }
  };

  const handleDeletePricing = async (id?: number, modelName?: string) => {
    if (!id) return;
    if (!window.confirm(`Xóa đơn giá của model "${modelName || id}"?`)) return;
    try {
      await aiConfigApi.deleteModelPricing(id);
      setPricings((prev) => prev.filter((p) => p.id !== id));
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Không thể xóa đơn giá Model");
    }
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
      setTimeout(() => setSavedRateLimitSuccess(false), 2500);
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Lỗi khi lưu cấu hình Rate Limit");
    } finally {
      setSavingRateLimit(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleTestKey = async (key: AiProviderKey) => {
    if (!key.id) return;
    setTestingKeyId(key.id);
    setTestResult(null);
    try {
      const res = await aiConfigApi.testConnection({
        provider: key.provider,
        keyId: key.id,
        endpointUrl: key.endpointUrl,
      });
      setTestResult({
        id: key.id,
        success: res.success,
        message: res.message,
        latencyMs: res.latencyMs,
      });
      fetchData();
    } catch (err: any) {
      setTestResult({
        id: key.id,
        success: false,
        message: err.response?.data?.message || err.message || "Kiểm tra thất bại",
      });
    } finally {
      setTestingKeyId(null);
    }
  };

  const handleDeleteKey = async (id: number) => {
    if (!window.confirm("Bạn có chắc chắn muốn xóa khóa API này không?")) return;
    try {
      await aiConfigApi.deleteProviderKey(id);
      fetchData();
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Không thể xóa khóa");
    }
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

  const handleSaveTask = async (task: AiModelConfig) => {
    setSavingTask(task.taskType);
    setSavedTaskSuccess(null);
    try {
      await aiConfigApi.updateTaskConfig(task.taskType, task);
      setSavedTaskSuccess(task.taskType);
      setTimeout(() => setSavedTaskSuccess(null), 2500);
    } catch (err: any) {
      alert(err.response?.data?.message || err.message || "Lỗi khi cập nhật cấu hình task");
    } finally {
      setSavingTask(null);
    }
  };

  if (loading) {
    return <PageSkeleton variant="detail" />;
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <HeaderActions>
        <button
          type="button"
          onClick={fetchData}
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
                  const result = testResult?.id === key.id ? testResult : null;

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

                        {result && (
                          <div
                            className={cn(
                              "mt-2 text-right text-[11px] font-medium",
                              result.success ? "text-emerald-700" : "text-rose-700"
                            )}
                          >
                            {result.success ? `✓ Thành công (${result.latencyMs}ms)` : `✗ ${result.message}`}
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* SECTION 2: TASK-TO-MODEL ROUTING */}
      <section className={cn(surface, "overflow-hidden")}>
        <div className="border-b border-slate-100 p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Sliders className="size-5 text-blue-600" />
            <h2 className="text-base font-bold text-slate-950">Phân bổ Model theo Nghiệp vụ</h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Chỉ định chính xác Model AI chính, Model dự phòng (Failover), nhiệt độ ngẫu nhiên (Temperature), giới hạn Max Tokens và thời gian Timeout cho từng tính năng.
          </p>
        </div>

        <div className="divide-y divide-slate-100">
          {tasks.map((task) => {
            const isSaving = savingTask === task.taskType;
            const isSuccess = savedTaskSuccess === task.taskType;
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

            return (
              <div key={task.taskType} className="p-5 sm:p-6 hover:bg-slate-50/40 transition-colors">
                <div className="flex flex-col gap-4">
                  {/* TOP ROW: TASK INFO + ACTIVE TOGGLE + SAVE BUTTON */}
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <span className="grid size-8 place-items-center rounded-lg bg-blue-50 text-blue-700 font-bold text-xs">
                        <BrainCircuit className="size-4" />
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-bold text-slate-900">{task.taskName}</h3>
                          <span className="font-mono text-[11px] text-slate-400">({task.taskType})</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700">
                        <input
                          type="checkbox"
                          checked={task.isActive !== false}
                          onChange={(e) => handleTaskChange(task.taskType, "isActive", e.target.checked)}
                          className="size-3.5 accent-blue-600"
                        />
                        <span>{task.isActive !== false ? "Đang bật" : "Tạm ngưng"}</span>
                      </label>

                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={() => handleSaveTask(task)}
                        className={cn(
                          "inline-flex min-h-9 items-center justify-center gap-2 rounded-xl px-4 text-xs font-semibold shadow-sm transition-all",
                          isSuccess
                            ? "bg-emerald-600 text-white"
                            : "bg-slate-900 text-white hover:bg-blue-600"
                        )}
                      >
                        {isSaving ? (
                          <Loader2 className="size-3.5 animate-spin" />
                        ) : isSuccess ? (
                          <CheckCircle2 className="size-3.5" />
                        ) : (
                          <Save className="size-3.5" />
                        )}
                        {isSuccess ? "Đã lưu!" : "Lưu thay đổi"}
                      </button>
                    </div>
                  </div>

                  {/* CONTROLS GRID (7 FIELDS) */}
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
                    {/* Provider */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500">Provider chính</label>
                      <select
                        value={task.provider}
                        onChange={(e) => handleProviderChange(task.taskType, e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                      >
                        <option value="GEMINI">Google Gemini</option>
                        <option value="OPENAI">OpenAI</option>
                        <option value="ANTHROPIC">Anthropic Claude</option>
                        <option value="CURSOR">Cursor / AI</option>
                        <option value="OPENROUTER">OpenRouter</option>
                        <option value="GROQ">GroqCloud</option>
                        <option value="DEEPSEEK">DeepSeek</option>
                        <option value="MISTRAL">Mistral AI</option>
                        <option value="XAI">xAI Grok</option>
                        <option value="PERPLEXITY">Perplexity</option>
                        <option value="OLLAMA">Ollama (Local)</option>
                        <option value="HUGGINGFACE">Hugging Face</option>
                        <option value="CUSTOM">Custom</option>
                      </select>
                    </div>

                    {/* Model Name (Dropdown from Model Registry) */}
                    <div className="lg:col-span-2">
                      <label className="block text-[11px] font-semibold text-slate-500">Model chính </label>
                      <select
                        value={task.modelName}
                        onChange={(e) => handleTaskChange(task.taskType, "modelName", e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono font-medium text-slate-800 outline-none focus:border-blue-500"
                      >
                        {!hasCurrentModel && task.modelName && (
                          <option value={task.modelName}>⚠️ {task.modelName} (Chưa đăng ký trong bảng đơn giá)</option>
                        )}
                        {availableModels.length === 0 && (
                          <option value="" disabled>-- Chưa có model nào thuộc provider này trong đơn giá --</option>
                        )}
                        {availableModels.map((p) => {
                          const label = p.displayName || p.modelName;
                          return (
                            <option key={p.id ?? p.modelName} value={p.modelName}>
                              {label}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* Max Tokens */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500">Max Output Tokens</label>
                      <input
                        type="number"
                        min="128"
                        max="65536"
                        step="256"
                        value={task.maxTokens ?? 2048}
                        onChange={(e) =>
                          handleTaskChange(task.taskType, "maxTokens", parseInt(e.target.value, 10) || 2048)
                        }
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono font-medium text-slate-800 outline-none focus:border-blue-500"
                      />
                    </div>

                    {/* Temperature */}
                    <div>
                      <div className="flex justify-between">
                        <label className="block text-[11px] font-semibold text-slate-500">Temperature</label>
                        <span className="text-[11px] font-mono text-slate-600">{task.temperature}</span>
                      </div>
                      <input
                        type="range"
                        min="0.0"
                        max="1.0"
                        step="0.05"
                        value={task.temperature}
                        onChange={(e) =>
                          handleTaskChange(task.taskType, "temperature", parseFloat(e.target.value))
                        }
                        className="mt-2.5 w-full accent-blue-600"
                      />
                    </div>

                    {/* Timeout */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500">Timeout (giây)</label>
                      <input
                        type="number"
                        min="5"
                        max="120"
                        value={task.timeoutSeconds}
                        onChange={(e) =>
                          handleTaskChange(task.taskType, "timeoutSeconds", parseInt(e.target.value, 10) || 30)
                        }
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                      />
                    </div>

                  </div>

                  {/* Multi-Level Fallback Waterfall (Cascade Routing) */}
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <label className="text-[11px] font-semibold text-slate-700">
                          Model Dự Phòng
                        </label>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddFallbackStep(task.taskType)}
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-700 hover:underline"
                      >
                        <Plus className="size-3" />
                        Thêm
                      </button>
                    </div>

                    {effectiveSteps.length === 0 ? (
                      <div className="mt-2 rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-3 text-center">
                        <p className="text-[11px] text-slate-400">
                          Chưa có model dự phòng. Khi model chính ({task.provider}:{task.modelName}) gặp lỗi hoặc dính 429, yêu cầu sẽ thất bại ngay.
                        </p>
                        <button
                          type="button"
                          onClick={() => handleAddFallbackStep(task.taskType)}
                          className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:underline"
                        >
                          <Plus className="size-3" />
                          Kích hoạt chuỗi dự phòng (VD: Groq, OpenRouter, Gemini Flash-Lite)
                        </button>
                      </div>
                    ) : (
                      <div className="mt-2 space-y-2">
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
                              className="flex flex-wrap items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/60 p-2"
                            >
                              <span className="rounded-md bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">
                                Cấp {stepIdx + 1}
                              </span>
                              <select
                                value={step.provider || "GEMINI"}
                                onChange={(e) =>
                                  handleFallbackProviderChange(task.taskType, stepIdx, e.target.value)
                                }
                                className="w-28 rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[11px] font-semibold text-slate-700 outline-none focus:border-blue-500"
                              >
                                {Object.keys(MODEL_PRESETS).map((p) => (
                                  <option key={p} value={p}>{p}</option>
                                ))}
                              </select>
                              <select
                                value={step.model || ""}
                                onChange={(e) =>
                                  handleUpdateFallbackStep(task.taskType, stepIdx, "model", e.target.value)
                                }
                                className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-mono font-medium text-slate-800 outline-none focus:border-blue-500"
                              >
                                {!stepHasModel && step.model && (
                                  <option value={step.model}>⚠️ {step.model} (Chưa đăng ký trong đơn giá)</option>
                                )}
                                {stepAvailableModels.length === 0 && (
                                  <option value="" disabled>-- Chưa có model nào thuộc {step.provider} trong đơn giá --</option>
                                )}
                                {stepAvailableModels.map((p) => {
                                  const label = p.displayName || p.modelName;
                                  return (
                                    <option key={p.id ?? p.modelName} value={p.modelName}>
                                      {label}
                                    </option>
                                  );
                                })}
                              </select>
                              <button
                                type="button"
                                onClick={() => handleRemoveFallbackStep(task.taskType, stepIdx)}
                                className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                                title="Xóa cấp dự phòng này"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
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

      {/* SECTION 2.8: MODEL PRICING TABLE (USD / 1M TOKENS) */}
      <section className={cn(surface, "overflow-hidden")}>
        <div className="border-b border-slate-100 p-5 sm:p-6">
          <div className="flex items-center gap-2">
            <Coins className="size-5 text-amber-600" />
            <h2 className="text-base font-bold text-slate-950">
              Danh mục & Đơn giá Model AI (Model Registry & Pricing)
            </h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Quản lý danh mục Model chuẩn hóa cho toàn hệ thống: Tên hiển thị, System Model ID, Context Window, Hỗ trợ JSON Mode và Đơn giá (USD trên 1.000.000 tokens). Danh mục này cấp nguồn trực tiếp cho Dropdown chọn Model tại các tính năng nghiệp vụ bên trên.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="bg-slate-50/80 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Provider</th>
                <th className="px-4 py-3">Tên hiển thị</th>
                <th className="px-4 py-3">Mã Model (ID)</th>
                <th className="px-4 py-3">Context Window</th>
                <th className="px-4 py-3">Giá Input ($/1M)</th>
                <th className="px-4 py-3">Giá Output ($/1M)</th>
                <th className="px-4 py-3 text-center">JSON?</th>
                <th className="px-4 py-3">Trạng thái</th>
                <th className="px-5 py-3 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {pricings.map((pricing) => {
                const isSaving = savingPricingKey === pricing.modelName;
                const isSaved = savedPricingKeySuccess === pricing.modelName;
                return (
                  <tr key={pricing.id ?? pricing.modelName} className="hover:bg-slate-50/50">
                    <td className="px-5 py-3">
                      <select
                        value={pricing.provider}
                        onChange={(e) =>
                          handlePricingChange(pricing.modelName, "provider", e.target.value)
                        }
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
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
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        placeholder="VD: Groq Qwen 3.8 27B"
                        value={pricing.displayName || ""}
                        onChange={(e) =>
                          handlePricingChange(pricing.modelName, "displayName", e.target.value)
                        }
                        className="w-44 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-900 outline-none focus:border-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-slate-900">
                      {pricing.modelName}
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={1000}
                        step={1000}
                        value={pricing.contextWindow ?? 128000}
                        onChange={(e) =>
                          handlePricingChange(
                            pricing.modelName,
                            "contextWindow",
                            parseInt(e.target.value, 10) || 128000
                          )
                        }
                        className="w-28 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-xs font-semibold text-slate-900 outline-none focus:border-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3">
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
                        className="w-28 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-xs font-semibold text-slate-900 outline-none focus:border-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3">
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
                        className="w-28 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-xs font-semibold text-slate-900 outline-none focus:border-blue-500"
                      />
                    </td>
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={pricing.supportsJson !== false}
                        onChange={(e) =>
                          handlePricingChange(pricing.modelName, "supportsJson", e.target.checked)
                        }
                        className="size-3.5 accent-blue-600"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-slate-700">
                        <input
                          type="checkbox"
                          checked={pricing.isActive !== false}
                          onChange={(e) =>
                            handlePricingChange(pricing.modelName, "isActive", e.target.checked)
                          }
                          className="size-3.5 accent-blue-600"
                        />
                        <span>{pricing.isActive !== false ? "Active" : "Inactive"}</span>
                      </label>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          disabled={isSaving}
                          onClick={() => handleSavePricing(pricing)}
                          className={cn(
                            "inline-flex min-h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold text-white transition-colors",
                            isSaved ? "bg-emerald-600" : "bg-slate-900 hover:bg-blue-600"
                          )}
                        >
                          {isSaving ? (
                            <Loader2 className="size-3.5 animate-spin" />
                          ) : isSaved ? (
                            <CheckCircle2 className="size-3.5" />
                          ) : (
                            <Save className="size-3.5" />
                          )}
                          {isSaved ? "Đã lưu" : "Lưu"}
                        </button>
                        {pricing.id && (
                          <button
                            type="button"
                            onClick={() => handleDeletePricing(pricing.id, pricing.modelName)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                            title="Xóa đơn giá model"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}

              {/* ADD NEW PRICING ROW */}
              <tr className="bg-slate-50/70">
                <td className="px-5 py-3">
                  <select
                    value={newPricing.provider}
                    onChange={(e) =>
                      setNewPricing((prev) => ({ ...prev, provider: e.target.value }))
                    }
                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-blue-500"
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
                </td>
                <td className="px-4 py-3">
                  <input
                    type="text"
                    placeholder="Tên hiển thị (VD: Groq Qwen 3.8)"
                    value={newPricing.displayName || ""}
                    onChange={(e) =>
                      setNewPricing((prev) => ({ ...prev, displayName: e.target.value }))
                    }
                    className="w-44 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-900 outline-none focus:border-blue-500"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="text"
                    placeholder="Mã model (vd: qwen/qwen3.8-27b)"
                    value={newPricing.modelName}
                    onChange={(e) =>
                      setNewPricing((prev) => ({ ...prev, modelName: e.target.value }))
                    }
                    className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-900 outline-none focus:border-blue-500"
                  />
                </td>
                <td className="px-4 py-3">
                  <input
                    type="number"
                    min={1000}
                    step={1000}
                    value={newPricing.contextWindow ?? 128000}
                    onChange={(e) =>
                      setNewPricing((prev) => ({
                        ...prev,
                        contextWindow: parseInt(e.target.value, 10) || 128000,
                      }))
                    }
                    className="w-28 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-xs font-semibold text-slate-900 outline-none focus:border-blue-500"
                  />
                </td>
                <td className="px-4 py-3">
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
                    className="w-28 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-xs font-semibold text-slate-900 outline-none focus:border-blue-500"
                  />
                </td>
                <td className="px-4 py-3">
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
                    className="w-28 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 font-mono text-xs font-semibold text-slate-900 outline-none focus:border-blue-500"
                  />
                </td>
                <td className="px-4 py-3 text-center">
                  <input
                    type="checkbox"
                    checked={newPricing.supportsJson !== false}
                    onChange={(e) =>
                      setNewPricing((prev) => ({ ...prev, supportsJson: e.target.checked }))
                    }
                    className="size-3.5 accent-blue-600"
                  />
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">Mặc định Active</td>
                <td className="px-5 py-3 text-right">
                  <button
                    type="button"
                    disabled={savingPricingKey === "__NEW__"}
                    onClick={handleAddPricing}
                    className="inline-flex min-h-8 items-center gap-1.5 rounded-lg bg-blue-600 px-3 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {savingPricingKey === "__NEW__" ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Plus className="size-3.5" />
                    )}
                    Thêm model
                  </button>
                </td>
              </tr>
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
        onSuccess={fetchData}
        initialKey={editingKey}
      />
    </div>
  );
}
