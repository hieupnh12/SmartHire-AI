import { useState } from "react";
import { X, Key, Sparkles, CheckCircle2, AlertTriangle, Loader2, Eye, EyeOff } from "lucide-react";
import { aiConfigApi, type AiProviderKey } from "@/api/master/aiConfigApi";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialKey?: AiProviderKey | null;
};

export function AddAiKeyModal({ isOpen, onClose, onSuccess, initialKey }: Props) {
  const [provider, setProvider] = useState<string>(initialKey?.provider || "GEMINI");
  const [keyAlias, setKeyAlias] = useState<string>(initialKey?.keyAlias || "");
  const [apiKey, setApiKey] = useState<string>("");
  const [endpointUrl, setEndpointUrl] = useState<string>(initialKey?.endpointUrl || "");
  const [isDefault, setIsDefault] = useState<boolean>(initialKey?.isDefault ?? true);
  const [status, setStatus] = useState<string>(initialKey?.status || "ACTIVE");
  const [showKey, setShowKey] = useState<boolean>(false);

  const [testing, setTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latencyMs?: number } | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    if (!apiKey && !initialKey?.id) {
      setError("Vui lòng nhập API Key để kiểm tra kết nối");
      return;
    }
    setError(null);
    setTesting(true);
    setTestResult(null);

    try {
      const res = await aiConfigApi.testConnection({
        provider,
        apiKey: apiKey || undefined,
        keyId: initialKey?.id,
        endpointUrl: endpointUrl || undefined,
      });
      setTestResult({
        success: res.success,
        message: res.message,
        latencyMs: res.latencyMs,
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.response?.data?.message || err.message || "Lỗi khi kiểm tra kết nối",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyAlias.trim()) {
      setError("Vui lòng nhập tên nhận diện (Alias) cho khóa");
      return;
    }
    if (!initialKey?.id && !apiKey.trim()) {
      setError("Vui lòng nhập API Key");
      return;
    }

    setError(null);
    setSaving(true);
    try {
      await aiConfigApi.saveProviderKey({
        id: initialKey?.id,
        provider,
        keyAlias: keyAlias.trim(),
        apiKey: apiKey.trim() || undefined,
        endpointUrl: endpointUrl.trim() || undefined,
        isDefault,
        status,
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || "Lỗi khi lưu khóa API");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
        >
          <X className="size-5" />
        </button>

        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-xl bg-blue-50 text-blue-700">
            <Key className="size-5" />
          </span>
          <div>
            <h2 className="text-lg font-bold text-slate-950">
              {initialKey ? "Chỉnh sửa API Key" : "Thêm mới AI API Key"}
            </h2>
            <p className="text-xs text-slate-500">Mã hóa chuẩn AES-256 an toàn trước khi lưu vào cơ sở dữ liệu Master</p>
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-semibold text-rose-700">
            <AlertTriangle className="size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSave} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700">Nhà cung cấp (Provider)</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
            >
              <option value="GEMINI">Google Gemini (Khuyên dùng)</option>
              <option value="OPENAI">OpenAI (GPT-4o / mini)</option>
              <option value="ANTHROPIC">Anthropic Claude</option>
              <option value="DEEPSEEK">DeepSeek</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Tên nhận diện (Key Alias)</label>
            <input
              type="text"
              placeholder="VD: Google Gemini Prod 01"
              value={keyAlias}
              onChange={(e) => setKeyAlias(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="block text-xs font-semibold text-slate-700">API Key</label>
              {initialKey && (
                <span className="text-[11px] text-slate-400">Để trống nếu không muốn đổi key cũ</span>
              )}
            </div>
            <div className="relative mt-1.5">
              <input
                type={showKey ? "text" : "password"}
                placeholder={initialKey ? `Hiện tại: ${initialKey.maskedKey || "••••••••"}` : "AIzaSy..."}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 pr-10 text-sm font-mono outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Endpoint URL (Tùy chọn - Proxy / Custom API)</label>
            <input
              type="text"
              placeholder="Mặc định: https://generativelanguage.googleapis.com"
              value={endpointUrl}
              onChange={(e) => setEndpointUrl(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700">Trạng thái (Status)</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2 text-sm font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
            >
              <option value="ACTIVE">Hoạt động (Active)</option>
              <option value="INACTIVE">Tạm dừng (Inactive)</option>
            </select>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3">
            <div>
              <p className="text-xs font-semibold text-slate-800">Đặt làm Key mặc định</p>
              <p className="text-[11px] text-slate-500">Tự động sử dụng cho provider {provider}</p>
            </div>
            <input
              type="checkbox"
              checked={isDefault}
              onChange={(e) => setIsDefault(e.target.checked)}
              className="size-4.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
          </div>

          {testResult && (
            <div
              className={`flex items-start gap-2.5 rounded-xl border p-3 text-xs ${
                testResult.success
                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                  : "border-rose-200 bg-rose-50 text-rose-800"
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="size-4 shrink-0 text-emerald-600 mt-0.5" />
              ) : (
                <AlertTriangle className="size-4 shrink-0 text-rose-600 mt-0.5" />
              )}
              <div className="flex-1">
                <p className="font-semibold">{testResult.message}</p>
                {testResult.latencyMs !== undefined && (
                  <p className="mt-0.5 text-[11px] opacity-80">
                    Thời gian phản hồi (Latency): <strong>{testResult.latencyMs}ms</strong>
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 transition-colors"
            >
              {testing ? <Loader2 className="size-4 animate-spin text-blue-600" /> : <Sparkles className="size-4 text-amber-500" />}
              {testing ? "Đang kiểm tra..." : "Kiểm tra kết nối"}
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="min-h-10 rounded-xl px-4 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving && <Loader2 className="size-4 animate-spin" />}
                {initialKey ? "Cập nhật" : "Lưu khóa"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
