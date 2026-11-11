import { useState, useEffect } from "react";
import { X, Key, Sparkles, CheckCircle2, AlertTriangle, Loader2, Eye, EyeOff } from "lucide-react";
import { aiConfigApi, type AiProviderKey } from "@/api/master/aiConfigApi";
import { useT } from "@/i18n";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialKey?: AiProviderKey | null;
};

export function AddAiKeyModal({ isOpen, onClose, onSuccess, initialKey }: Props) {
  const t = useT();
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
    const example = (() => {
      switch (p) {
        case "CURSOR": return "Cursor AI / Small Fast Key";
        case "OPENROUTER": return "OpenRouter Universal Key";
        case "GROQ": return "Groq LPU Ultra Fast";
        case "DEEPSEEK": return "DeepSeek V3 / R1 Prod";
        case "OPENAI": return "OpenAI Prod 01";
        case "ANTHROPIC": return "Claude 3.5 Sonnet Key";
        case "MISTRAL": return "Mistral Large / Codestral";
        case "XAI": return "xAI Grok Key";
        case "PERPLEXITY": return "Perplexity Search Key";
        case "OLLAMA": return "Ollama Local Host";
        case "HUGGINGFACE": return "HuggingFace Serverless";
        case "CUSTOM": return "Custom Gateway Proxy";
        default: return "Google Gemini Prod 01";
      }
    })();
    return t("master.ops.aiKeyModal.aliasPrefix", { example });
  };

  const getApiKeyPlaceholder = (p: string) => {
    if (initialKey) {
      return t("master.ops.aiKeyModal.currentMaskedPlaceholder", {
        masked: initialKey.maskedKey || "••••••••",
      });
    }
    switch (p) {
      case "CURSOR": return "crsr_...";
      case "OPENROUTER": return "sk-or-v1-...";
      case "GROQ": return "gsk_...";
      case "DEEPSEEK":
      case "OPENAI": return "sk-...";
      case "ANTHROPIC": return "sk-ant-...";
      case "MISTRAL": return t("master.ops.aiKeyModal.mistralPlaceholder");
      case "XAI": return "xai-...";
      case "PERPLEXITY": return "pplx-...";
      case "OLLAMA": return t("master.ops.aiKeyModal.ollamaPlaceholder");
      case "HUGGINGFACE": return "hf_...";
      default: return "AIzaSy...";
    }
  };

  const getEndpointPlaceholder = (p: string) => {
    if (p === "CUSTOM") return t("master.ops.aiKeyModal.endpointCustomPlaceholder");
    const url = (() => {
      switch (p) {
        case "CURSOR": return "https://api.cursor.com";
        case "OPENROUTER": return "https://openrouter.ai/api/v1/chat/completions";
        case "GROQ": return "https://api.groq.com/openai/v1/chat/completions";
        case "DEEPSEEK": return "https://api.deepseek.com/chat/completions";
        case "OPENAI": return "https://api.openai.com/v1/chat/completions";
        case "ANTHROPIC": return "https://api.anthropic.com/v1/messages";
        case "MISTRAL": return "https://api.mistral.ai/v1/chat/completions";
        case "XAI": return "https://api.x.ai/v1/chat/completions";
        case "PERPLEXITY": return "https://api.perplexity.ai/chat/completions";
        case "OLLAMA": return "http://localhost:11434/v1/chat/completions";
        case "HUGGINGFACE": return "https://router.huggingface.co/hf-inference/models/...";
        default: return "https://generativelanguage.googleapis.com";
      }
    })();
    return t("master.ops.aiKeyModal.endpointDefaultPrefix", { url });
  };

  if (!isOpen) return null;

  const handleTestConnection = async () => {
    if (!apiKey && !initialKey?.id) {
      setError(t("master.ops.aiKeyModal.errorEnterKeyForTest"));
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
        message: err.response?.data?.message || err.message || t("master.ops.aiKeyModal.errorTestFailed"),
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyAlias.trim()) {
      setError(t("master.ops.aiKeyModal.errorEnterAlias"));
      return;
    }
    if (!initialKey?.id && !apiKey.trim() && provider !== "OLLAMA") {
      setError(t("master.ops.aiKeyModal.errorEnterApiKey"));
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
      setError(err.response?.data?.message || err.message || t("master.ops.aiKeyModal.errorSaveFailed"));
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
          aria-label={t("master.ops.aiKeyModal.closeAria")}
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
              {initialKey ? t("master.ops.aiKeyModal.editTitle") : t("master.ops.aiKeyModal.addTitle")}
            </h2>
            <p className="text-xs text-slate-500">{t("master.ops.aiKeyModal.encryptionSubtitle")}</p>
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
            <label className="block text-xs font-semibold text-slate-700">{t("master.ops.aiKeyModal.providerLabel")}</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="mt-1.5 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm font-semibold text-slate-800 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
            >
              <optgroup label={t("master.ops.aiKeyModal.groupTop")}>
                <option value="GEMINI">{t("master.ops.aiKeyModal.optGemini")}</option>
                <option value="OPENAI">{t("master.ops.aiKeyModal.optOpenai")}</option>
                <option value="ANTHROPIC">{t("master.ops.aiKeyModal.optAnthropic")}</option>
                <option value="DEEPSEEK">{t("master.ops.aiKeyModal.optDeepseek")}</option>
              </optgroup>
              <optgroup label={t("master.ops.aiKeyModal.groupFast")}>
                <option value="CURSOR">{t("master.ops.aiKeyModal.optCursor")}</option>
                <option value="OPENROUTER">{t("master.ops.aiKeyModal.optOpenrouter")}</option>
                <option value="GROQ">{t("master.ops.aiKeyModal.optGroq")}</option>
                <option value="MISTRAL">{t("master.ops.aiKeyModal.optMistral")}</option>
                <option value="XAI">{t("master.ops.aiKeyModal.optXai")}</option>
                <option value="PERPLEXITY">{t("master.ops.aiKeyModal.optPerplexity")}</option>
              </optgroup>
              <optgroup label={t("master.ops.aiKeyModal.groupSelfHosted")}>
                <option value="OLLAMA">{t("master.ops.aiKeyModal.optOllama")}</option>
                <option value="HUGGINGFACE">{t("master.ops.aiKeyModal.optHuggingface")}</option>
                <option value="CUSTOM">{t("master.ops.aiKeyModal.optCustom")}</option>
              </optgroup>
            </select>
          </div>

          {/* Key Alias */}
          <div>
            <label className="block text-xs font-semibold text-slate-700">{t("master.ops.aiKeyModal.keyAliasLabel")}</label>
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
              <label className="block text-xs font-semibold text-slate-700">{t("master.ops.aiKeyModal.apiKeyLabel")}</label>
              {initialKey && (
                <span className="text-[11px] text-slate-400">{t("master.ops.aiKeyModal.keepExistingHint")}</span>
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
                aria-label={t("master.ops.aiKeyModal.toggleKeyAria")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showKey ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>

          {/* Custom Endpoint URL */}
          <div>
            <label className="block text-xs font-semibold text-slate-700">{t("master.ops.aiKeyModal.endpointLabel")}</label>
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
                ℹ️ <strong>{t("master.ops.aiKeyModal.cursorInfoTitle")}</strong> {t("master.ops.aiKeyModal.cursorInfoPart1")}{" "}
                <code className="font-mono bg-blue-100 px-1 rounded font-bold text-blue-800">crsr_...</code>
                {t("master.ops.aiKeyModal.cursorInfoPart2")}{" "}
                <code className="font-mono bg-blue-100 px-1 rounded font-bold">https://api.cursor.com/v1/agents</code>{" "}
                {t("master.ops.aiKeyModal.cursorInfoPart3")}{" "}
                <code className="font-mono bg-blue-100 px-1 rounded font-bold">/v1/me</code>{" "}
                {t("master.ops.aiKeyModal.cursorInfoPart4")}
              </div>
            )}
          </div>

          {/* Status Section: Smart handling for Create mode vs Edit mode */}
          {!initialKey ? (
            <div className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50/70 p-3">
              <div className="flex items-center gap-2.5">
                <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <div>
                  <p className="text-xs font-semibold text-emerald-900">{t("master.ops.aiKeyModal.initStatusTitle")}</p>
                  <p className="text-[11px] text-emerald-700">{t("master.ops.aiKeyModal.initStatusDesc")}</p>
                </div>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-emerald-200 bg-white px-2.5 py-1 text-xs font-semibold text-emerald-800 shadow-2xs">
                <input
                  type="checkbox"
                  checked={status === "ACTIVE"}
                  onChange={(e) => setStatus(e.target.checked ? "ACTIVE" : "INACTIVE")}
                  className="size-3.5 accent-emerald-600 rounded"
                />
                <span>{status === "ACTIVE" ? t("master.ops.aiKeyModal.toggleActivate") : t("master.ops.aiKeyModal.toggleDraft")}</span>
              </label>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">{t("master.ops.aiKeyModal.currentStatusLabel")}</label>
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${getStatusColor(status)}`}>
                  {status === "ACTIVE" && t("master.ops.aiKeyModal.statusActive")}
                  {status === "INACTIVE" && t("master.ops.aiKeyModal.statusInactive")}
                  {status === "RATE_LIMITED_OR_INVALID" && t("master.ops.aiKeyModal.statusRateLimited")}
                  {status === "EXPIRED" && t("master.ops.aiKeyModal.statusExpired")}
                </span>
              </div>

              {status === "RATE_LIMITED_OR_INVALID" && (
                <div className="mb-2 rounded-lg border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-800">
                  {t("master.ops.aiKeyModal.rateLimitedNoticeBefore")}{" "}
                  <strong>{t("master.ops.aiKeyModal.rateLimitedNoticeBtn")}</strong>{" "}
                  {t("master.ops.aiKeyModal.rateLimitedNoticeAfter")}
                </div>
              )}

              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
              >
                <option value="ACTIVE">{t("master.ops.aiKeyModal.optStatusActive")}</option>
                <option value="INACTIVE">{t("master.ops.aiKeyModal.optStatusInactive")}</option>
                <option value="RATE_LIMITED_OR_INVALID">{t("master.ops.aiKeyModal.optStatusRateLimited")}</option>
                <option value="EXPIRED">{t("master.ops.aiKeyModal.optStatusExpired")}</option>
              </select>
            </div>
          )}

          {/* Default Key Checkbox */}
          <div className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-3">
            <div>
              <p className="text-xs font-semibold text-slate-800">{t("master.ops.aiKeyModal.setDefaultTitle")}</p>
              <p className="text-[11px] text-slate-500">{t("master.ops.aiKeyModal.setDefaultDesc", { provider })}</p>
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
                    {t("master.ops.aiKeyModal.latencyLabel")} <strong>{testResult.latencyMs}ms</strong>
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
              {testing ? t("master.ops.aiKeyModal.testingBtn") : t("master.ops.aiKeyModal.testConnectionBtn")}
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="min-h-10 rounded-xl px-4 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
              >
                {t("master.ops.aiKeyModal.cancelBtn")}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving && <Loader2 className="size-4 animate-spin" />}
                {initialKey ? t("master.ops.aiKeyModal.updateBtn") : t("master.ops.aiKeyModal.saveKeyBtn")}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
