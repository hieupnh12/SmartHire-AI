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
} from "lucide-react";
import {
  aiConfigApi,
  type AiModelConfig,
  type AiProviderKey,
} from "@/api/master/aiConfigApi";
import { AddAiKeyModal } from "./AddAiKeyModal";
import { cn } from "@/lib/utils";

const surface = "rounded-2xl border border-slate-200 bg-white shadow-[0_4px_14px_-8px_rgba(15,23,42,0.18)]";

const MODEL_PRESETS: Record<string, string[]> = {
  GEMINI: ["gemini-3.6-flash", "gemini-2.5-flash", "gemini-3.1-pro-preview", "gemini-2.5-pro"],
  OPENAI: ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo", "o3-mini"],
  ANTHROPIC: ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022", "claude-3-opus-20240229"],
  DEEPSEEK: ["deepseek-chat", "deepseek-coder", "deepseek-reasoner"],
  HUGGINGFACE: ["Qwen/Qwen2.5-7B-Instruct", "meta-llama/Meta-Llama-3-8B-Instruct", "mistralai/Mistral-7B-Instruct-v0.2"],
};

export function AiEngineConfiguration() {
  const [keys, setKeys] = useState<AiProviderKey[]>([]);
  const [tasks, setTasks] = useState<AiModelConfig[]>([]);
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
      const [keysRes, tasksRes] = await Promise.all([
        aiConfigApi.getProviderKeys(),
        aiConfigApi.getTaskConfigs(),
      ]);
      setKeys(keysRes);
      setTasks(tasksRes);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Lỗi khi tải cấu hình AI");
    } finally {
      setLoading(false);
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
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="size-8 animate-spin text-blue-600" />
          <p className="text-sm font-medium">Đang tải cấu hình AI Engine...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* HEADER */}
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="text-sm font-semibold text-blue-700">Hệ thống / AI Engine</span>
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-emerald-700">
              Hot-Swap Active
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">
            Cấu hình AI Engine & Dynamic Models
          </h1>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
            Quản lý tập trung API Keys (mã hóa AES-256), gán Model AI theo từng nghiệp vụ tuyển dụng
            và cập nhật tức thì toàn hệ thống mà không cần build lại code hay khởi động lại server.
          </p>
        </div>

        <button
          type="button"
          onClick={fetchData}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
        >
          <RefreshCw className="size-3.5" />
          Làm mới
        </button>
      </header>

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
            <p className="mt-1 text-xs text-slate-500">
              Các khóa API được mã hóa an toàn khi lưu trữ và giải mã tại runtime khi gọi tác vụ AI.
            </p>
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
                  <th className="px-4 py-3">Tên nhận diện (Alias)</th>
                  <th className="px-4 py-3">API Key (Masked)</th>
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
                              key.provider === "GEMINI"
                                ? "bg-blue-50 text-blue-700"
                                : key.provider === "OPENAI"
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-violet-50 text-violet-700"
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
                        <span
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold",
                            key.status === "ACTIVE"
                              ? "bg-emerald-50 text-emerald-700"
                              : "bg-rose-50 text-rose-700"
                          )}
                        >
                          <i
                            className={cn(
                              "size-1.5 rounded-full",
                              key.status === "ACTIVE" ? "bg-emerald-500" : "bg-rose-500"
                            )}
                          />
                          {key.status === "ACTIVE" ? "Hoạt động" : key.status}
                        </span>
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
            <h2 className="text-base font-bold text-slate-950">Phân bổ Model theo Nghiệp vụ (Task Routing)</h2>
          </div>
          <p className="mt-1 text-xs text-slate-500">
            Chỉ định chính xác Model AI, nhiệt độ ngẫu nhiên (Temperature), giới hạn Tokens và thời gian Timeout cho từng tính năng.
          </p>
        </div>

        <div className="divide-y divide-slate-100">
          {tasks.map((task) => {
            const isSaving = savingTask === task.taskType;
            const isSuccess = savedTaskSuccess === task.taskType;
            const presets = MODEL_PRESETS[task.provider] || MODEL_PRESETS.GEMINI;

            return (
              <div key={task.taskType} className="p-5 sm:p-6 hover:bg-slate-50/40 transition-colors">
                <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
                  {/* TASK INFO */}
                  <div className="max-w-md">
                    <div className="flex items-center gap-2.5">
                      <span className="grid size-8 place-items-center rounded-lg bg-blue-50 text-blue-700 font-bold text-xs">
                        <BrainCircuit className="size-4" />
                      </span>
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">{task.taskName}</h3>
                        <span className="font-mono text-[11px] text-slate-400">{task.taskType}</span>
                      </div>
                    </div>
                  </div>

                  {/* CONTROLS */}
                  <div className="grid flex-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    {/* Provider */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500">Provider</label>
                      <select
                        value={task.provider}
                        onChange={(e) => handleTaskChange(task.taskType, "provider", e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-800 outline-none focus:border-blue-500"
                      >
                        <option value="GEMINI">Google Gemini</option>
                        <option value="OPENAI">OpenAI</option>
                        <option value="ANTHROPIC">Anthropic Claude</option>
                        <option value="DEEPSEEK">DeepSeek</option>
                      </select>
                    </div>

                    {/* Model Name */}
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500">Model Name</label>
                      <input
                        type="text"
                        list={`presets-${task.taskType}`}
                        value={task.modelName}
                        onChange={(e) => handleTaskChange(task.taskType, "modelName", e.target.value)}
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-mono font-medium text-slate-800 outline-none focus:border-blue-500"
                      />
                      <datalist id={`presets-${task.taskType}`}>
                        {presets.map((p) => (
                          <option key={p} value={p} />
                        ))}
                      </datalist>
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
                          handleTaskChange(task.taskType, "timeoutSeconds", parseInt(e.target.value) || 30)
                        }
                        className="mt-1 w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* SAVE BUTTON */}
                  <div className="flex items-center justify-end">
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
              </div>
            );
          })}
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
