import { useState, useEffect } from "react";
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

  useEffect(() => {
    if (isOpen) {
      setProvider(initialKey?.provider || "GEMINI");
      setKeyAlias(initialKey?.keyAlias || "");
      setApiKey("");
      setEndpointUrl(initialKey?.endpointUrl || "");
      setIsDefault(initialKey?.isDefault ?? true);
      setStatus(initialKey?.status || "ACTIVE");
      setShowKey(false);
      setError(null);
      setTestResult(null);
    }
  }, [isOpen, initialKey]);

  const getKeyAliasPlaceholder = (p: string) => {
    switch (p) {
      case "CURSOR": return "VD: Cursor AI / Small Fast Key";
      case "OPENROUTER": return "VD: OpenRouter Universal Key";
      case "GROQ": return "VD: Groq LPU Ultra Fast";
      case "DEEPSEEK": return "VD: DeepSeek V3 / R1 Prod";
      case "OPENAI": return "VD: OpenAI Prod 01";
      case "ANTHROPIC": return "VD: Claude 3.5 Sonnet Key";
      case "MISTRAL": return "VD: Mistral Large / Codestral";
      case "XAI": return "VD: xAI Grok Key";
      case "PERPLEXITY": return "VD: Perplexity Search Key";
      case "OLLAMA": return "VD: Ollama Local Host";
      case "HUGGINGFACE": return "VD: HuggingFace Serverless";
      case "CUSTOM": return "VD: Custom Gateway Proxy";
      default: return "VD: Google Gemini Prod 01";
    }
  };

  const getApiKeyPlaceholder = (p: string) => {
    if (initialKey) return `Hiện tại: ${initialKey.maskedKey || "••••••••"}`;
    switch (p) {
      case "CURSOR": return "crsr_...";
      case "OPENROUTER": return "sk-or-v1-...";
      case "GROQ": return "gsk_...";
      case "DEEPSEEK":
      case "OPENAI": return "sk-...";
      case "ANTHROPIC": return "sk-ant-...";
      case "MISTRAL": return "Nhập Mistral API Key...";
      case "XAI": return "xai-...";
      case "PERPLEXITY": return "pplx-...";
      case "OLLAMA": return "Tùy chọn (để trống nếu không bật auth)";
      case "HUGGINGFACE": return "hf_...";
      default: return "AIzaSy...";
    }
  };

  const getEndpointPlaceholder = (p: string) => {
    switch (p) {
      case "CURSOR": return "Mặc định: https://api.cursor.com";
      case "OPENROUTER": return "Mặc định: https://openrouter.ai/api/v1/chat/completions";
      case "GROQ": return "Mặc định: https://api.groq.com/openai/v1/chat/completions";
      case "DEEPSEEK": return "Mặc định: https://api.deepseek.com/chat/completions";
      case "OPENAI": return "Mặc định: https://api.openai.com/v1/chat/completions";
      case "ANTHROPIC": return "Mặc định: https://api.anthropic.com/v1/messages";
      case "MISTRAL": return "Mặc định: https://api.mistral.ai/v1/chat/completions";
      case "XAI": return "Mặc định: https://api.x.ai/v1/chat/completions";
      case "PERPLEXITY": return "Mặc định: https://api.perplexity.ai/chat/completions";
      case "OLLAMA": return "Mặc định: http://localhost:11434/v1/chat/completions";
      case "HUGGINGFACE": return "Mặc định: https://router.huggingface.co/hf-inference/models/...";
      case "CUSTOM": return "VD: https://api.yourdomain.com/v1/chat/completions";
      default: return "Mặc định: https://generativelanguage.googleapis.com";
    }
  };

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
    if (!initialKey?.id && !apiKey.trim() && provider !== "OLLAMA") {
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

  const getStatusColor = (s: string) => {
    switch (s) {
      case "ACTIVE": return "text-emerald-600 bg-emerald-50 border-emerald-200";
      case "INACTIVE": return "text-slate-600 bg-slate-100 border-slate-200";
      case "RATE_LIMITED_OR_INVALID": return "text-rose-600 bg-rose-50 border-rose-200";
      case "EXPIRED": return "text-amber-700 bg-amber-50 border-amber-200";
      default: return "text-slate-700 bg-slate-50 border-slate-200";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl">
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

        <form onSubmit={handleSave} autoComplete="off" noValidate className="mt-5 space-y-4">
          {/* Dummy inputs to absorb browser password manager auto-fill */}
          <input
            type="text"
            name="fake_user_remembered"
            className="hidden"
            tabIndex={-1}
            autoComplete="username"
            aria-hidden="true"
            style={{ display: "none" }}
          />
          <input
            type="password"
            name="fake_pass_remembered"
            className="hidden"
            tabIndex={-1}
            autoComplete="current-password"
            aria-hidden="true"
            style={{ display: "none" }}
          />

          {/* Provider Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700">Nhà cung cấp (Provider)</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
            >
              <optgroup label="Nhà cung cấp lớn (Top Providers)">
                <option value="GEMINI">Google Gemini (Khuyên dùng)</option>
                <option value="OPENAI">OpenAI (GPT-4o / o3-mini)</option>
                <option value="ANTHROPIC">Anthropic Claude (Claude 3.5 Sonnet / Haiku)</option>
                <option value="DEEPSEEK">DeepSeek (V3 / R1)</option>
              </optgroup>
              <optgroup label="AI Code & Tốc độ cao (Developer & Ultra-Fast)">
                <option value="CURSOR">Cursor (Cloud Agents API)</option>
                <option value="OPENROUTER">OpenRouter (Universal Router - Tất cả Models)</option>
                <option value="GROQ">GroqCloud (LPU Inference siêu tốc)</option>
                <option value="MISTRAL">Mistral AI (Mistral Large / Codestral)</option>
                <option value="XAI">xAI Grok</option>
                <option value="PERPLEXITY">Perplexity AI</option>
              </optgroup>
              <optgroup label="On-Premise & Nguồn mở (Self-Hosted / Open Source)">
                <option value="OLLAMA">Ollama (Chạy mô hình cục bộ Local/Server)</option>
                <option value="HUGGINGFACE">Hugging Face (Inference Endpoints)</option>
                <option value="CUSTOM">Custom OpenAI-Compatible Endpoint</option>
              </optgroup>
            </select>
          </div>

          {/* Key Alias */}
          <div>
            <label className="block text-xs font-semibold text-slate-700">Tên nhận diện (Key Alias)</label>
            <input
              type="text"
              id="ai_provider_key_alias_field"
              name="ai_provider_key_alias_field"
              autoComplete="off"
              data-lpignore="true"
              data-1p-ignore="true"
              data-form-type="other"
              placeholder={getKeyAliasPlaceholder(provider)}
              value={keyAlias}
              onChange={(e) => setKeyAlias(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
            />
          </div>

          {/* API Key with robust anti-autofill */}
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
                id="ai_secret_token_unmasked_input"
                name="ai_secret_token_unmasked_input"
                autoComplete="new-password"
                data-lpignore="true"
                data-1p-ignore="true"
                readOnly
                onFocus={(e) => e.target.removeAttribute("readonly")}
                placeholder={getApiKeyPlaceholder(provider)}
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

          {/* Custom Endpoint URL */}
          <div>
            <label className="block text-xs font-semibold text-slate-700">Endpoint URL (Tùy chọn - Proxy / Custom API)</label>
            <input
              type="text"
              id="ai_endpoint_url_input"
              name="ai_endpoint_url_input"
              autoComplete="off"
              data-lpignore="true"
              placeholder={getEndpointPlaceholder(provider)}
              value={endpointUrl}
              onChange={(e) => setEndpointUrl(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-mono font-medium text-slate-700 outline-none focus:border-blue-500 shadow-2xs"
            />
            {provider === "CURSOR" && (
              <div className="mt-2 rounded-xl border border-blue-200 bg-blue-50/80 p-2.5 text-[11px] text-blue-900 leading-relaxed">
                ℹ️ <strong>Cursor Cloud Agents API:</strong> Khóa API của Cursor bắt đầu bằng <code className="font-mono bg-blue-100 px-1 rounded font-bold text-blue-800">crsr_...</code>. Hệ thống sẽ tự động giao tiếp trực tiếp qua <code className="font-mono bg-blue-100 px-1 rounded font-bold">https://api.cursor.com/v1/agents</code> và kiểm tra tài khoản qua <code className="font-mono bg-blue-100 px-1 rounded font-bold">/v1/me</code> (hỗ trợ composer-2, composer-2.5, claude-4-sonnet-thinking, claude-3-5-sonnet, gpt-4o, cursor-small...).
              </div>
            )}
          </div>

          {/* Status Section: Smart handling for Create mode vs Edit mode */}
          {!initialKey ? (
            <div className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50/70 p-3">
              <div className="flex items-center gap-2.5">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <div>
                  <p className="text-xs font-semibold text-emerald-900">Trạng thái khởi tạo: Hoạt động (Active)</p>
                  <p className="text-[11px] text-emerald-700">Khóa sẵn sàng phục vụ các tác vụ AI ngay sau khi lưu.</p>
                </div>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-2.5 py-1 text-xs font-semibold text-emerald-800 shadow-2xs">
                <input
                  type="checkbox"
                  checked={status === "ACTIVE"}
                  onChange={(e) => setStatus(e.target.checked ? "ACTIVE" : "INACTIVE")}
                  className="size-3.5 accent-emerald-600 rounded"
                />
                <span>{status === "ACTIVE" ? "Kích hoạt" : "Lưu tạm"}</span>
              </label>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">Trạng thái hiện tại</label>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${getStatusColor(status)}`}>
                  {status === "ACTIVE" && "● Hoạt động"}
                  {status === "INACTIVE" && "○ Tạm dừng"}
                  {status === "RATE_LIMITED_OR_INVALID" && "▲ Lỗi kết nối / Quá giới hạn"}
                  {status === "EXPIRED" && "✕ Hết hạn"}
                </span>
              </div>

              {status === "RATE_LIMITED_OR_INVALID" && (
                <div className="mb-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-800">
                  Khóa này từng bị hệ thống ghi nhận lỗi kết nối hoặc cạn Quota. Bạn có thể bấm <strong>Kiểm tra kết nối</strong> ở dưới để tự động xác thực và kích hoạt lại, hoặc chuyển trạng thái bên dưới.
                </div>
              )}

              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
              >
                <option value="ACTIVE">Hoạt động (Active) - Đang sử dụng</option>
                <option value="INACTIVE">Tạm dừng (Inactive) - Tạm thời không gọi</option>
                <option value="RATE_LIMITED_OR_INVALID">Quá giới hạn / Lỗi kết nối (Rate Limited / Invalid)</option>
                <option value="EXPIRED">Hết hạn (Expired) - Khóa đã vô hiệu</option>
              </select>
            </div>
          )}

          {/* Default Key Checkbox */}
          <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3">
            <div>
              <p className="text-xs font-semibold text-slate-800">Đặt làm Key mặc định</p>
              <p className="text-[11px] text-slate-500">Tự động ưu tiên sử dụng khi gọi tác vụ của {provider}</p>
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
