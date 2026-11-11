// TypeScript utility for Browser Speech Synthesis (Web Speech API)
// Provides asynchronous voice retrieval and smart selection across Vietnamese, Japanese, and English.

export interface ResolvedVoiceInfo {
  voice: SpeechSynthesisVoice | null;
  lang: string;
  rate: number;
  isNativeMatch: boolean;
}

let cachedVoices: SpeechSynthesisVoice[] = [];

/**
 * Asynchronously loads browser speech synthesis voices across Chrome, Edge, Safari, and Firefox.
 */
export function getBrowserVoices(): Promise<SpeechSynthesisVoice[]> {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    return Promise.resolve([]);
  }

  const immediate = window.speechSynthesis.getVoices();
  if (immediate && immediate.length > 0) {
    cachedVoices = immediate;
    return Promise.resolve(immediate);
  }

  if (cachedVoices.length > 0) {
    return Promise.resolve(cachedVoices);
  }

  return new Promise((resolve) => {
    let resolved = false;

    const onVoices = () => {
      if (resolved) return;
      resolved = true;
      const v = window.speechSynthesis.getVoices();
      cachedVoices = v;
      window.speechSynthesis.onvoiceschanged = null;
      resolve(v);
    };

    window.speechSynthesis.onvoiceschanged = onVoices;

    // Timeout fallback after 350ms in case onvoiceschanged already fired or voices are empty
    setTimeout(() => {
      if (resolved) return;
      resolved = true;
      const fallback = window.speechSynthesis.getVoices();
      if (fallback.length > 0) cachedVoices = fallback;
      resolve(cachedVoices.length > 0 ? cachedVoices : fallback);
    }, 350);
  });
}

/**
 * Smart voice matching for Vietnamese, Japanese, and English.
 * Prioritizes high quality Natural / Neural / Cloud voices from Chrome and Edge.
 */
export function resolveBestVoice(
  language?: string,
  voices?: SpeechSynthesisVoice[]
): ResolvedVoiceInfo {
  const list = voices && voices.length > 0 ? voices : cachedVoices;
  const langLower = (language || "vietnamese").toLowerCase();

  // --- 1. JAPANESE (ja-JP) ---
  if (langLower.includes("japan") || langLower === "ja") {
    const preferredNames = ["nanami", "keita", "google 日本語", "kyoko", "otoya", "ayumi", "haruka", "ichiro"];
    let matched = list.find((v) => {
      const name = v.name.toLowerCase();
      const code = v.lang.toLowerCase().replace("_", "-");
      return (code.startsWith("ja") || code.includes("jp")) && preferredNames.some((p) => name.includes(p));
    });

    if (!matched) {
      matched = list.find((v) => {
        const code = v.lang.toLowerCase().replace("_", "-");
        return code.startsWith("ja") || code.includes("jp");
      });
    }

    return {
      voice: matched ?? null,
      lang: "ja-JP",
      rate: 1.0,
      isNativeMatch: !!matched,
    };
  }

  // --- 2. ENGLISH (en-US) ---
  if (langLower.includes("eng") || langLower === "en") {
    const preferredNames = ["natural", "jenny", "guy", "google us english", "google uk", "samantha", "aria"];
    let matched = list.find((v) => {
      const name = v.name.toLowerCase();
      const code = v.lang.toLowerCase().replace("_", "-");
      return code.startsWith("en") && preferredNames.some((p) => name.includes(p));
    });

    if (!matched) {
      matched = list.find((v) => {
        const code = v.lang.toLowerCase().replace("_", "-");
        return code.startsWith("en");
      });
    }

    return {
      voice: matched ?? null,
      lang: "en-US",
      rate: 1.0,
      isNativeMatch: !!matched,
    };
  }

  // --- 3. VIETNAMESE (vi-VN) ---
  const preferredNames = [
    "hoaimy",
    "hoài my",
    "namminh",
    "nam minh",
    "google tiếng việt",
    "google vietnamese",
    "linh",
    "an",
    "mai",
  ];

  let matched = list.find((v) => {
    const name = v.name.toLowerCase();
    const code = v.lang.toLowerCase().replace("_", "-");
    return code.startsWith("vi") && preferredNames.some((p) => name.includes(p));
  });

  if (!matched) {
    matched = list.find((v) => {
      const code = v.lang.toLowerCase().replace("_", "-");
      return code.startsWith("vi") || code.includes("vi-vn");
    });
  }

  return {
    voice: matched ?? null,
    lang: "vi-VN",
    rate: 0.95,
    isNativeMatch: !!matched,
  };
}

/**
 * Prepares raw assistant text for clear, seamless speech synthesis.
 * Strips reasoning tokens, conversational filler headers, and markdown symbols.
 */
export function prepareCleanSpeechText(raw: string): string {
  if (!raw) return "";

  let cleaned = raw
    .replace(/<think>[\s\S]*?<\/think>/gi, "")
    .replace(/<think>[\s\S]*$/gi, "")
    .replace(/<thought>[\s\S]*?<\/thought>/gi, "")
    .replace(/<thought>[\s\S]*$/gi, "")
    .replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, "")
    .replace(/<reasoning>[\s\S]*$/gi, "")
    .replace(/^#{1,6}\s+.*$/gm, "")
    .replace(/^(AI Interviewer|Interviewer|Assistant|AI|Trợ lý AI|Người phỏng vấn|面接官|AI面接官)\s*[:：\-]\s*/i, "")
    .replace(/^(Certainly|Sure|Alright|Okay|OK)[!.,]?\s*(Here (is|are) (the|your|a) (opening|first|next)?\s*(question|scenario|follow-up)[:.]?\s*)?/i, "")
    .replace(/^(Dưới đây là|Sau đây là)\s*(câu hỏi|lời chào|nội dung phỏng vấn)[^.?!:]*[:：.]\s*/i, "")
    .replace(/^(承知いたしました|かしこまりました|以下が質問です|それでは最初の質問です)[!！。、\s]*([:：]\s*)?/i, "")
    .replace(/^\*\*.*?\*\*[:：]?\s*/, "")
    .replace(/^(Okay|OK|Alright|So|Now|First|Looking at)[^.!?\n]*(mentioned|said|noted|used|focus|question|candidate|user)[^.!?\n]*[.!?\n]+\s*/i, "")
    .trimStart();

  let matched = false;
  do {
    matched = false;
    const before = cleaned;
    cleaned = cleaned
      .replace(/^(Hello|Hi|Greetings|Good (morning|afternoon|evening|day))[!.,]?\s*(and\s+)?(welcome (to (the|this|our|your)?\s*[^.!\n]*)?)?[!.,]?\s*/i, "")
      .replace(/^Welcome to (the|this|our|your)?\s*[^.!\n]*[!.,]\s*/i, "")
      .replace(/^(Let's (begin|start)( the interview)?|To (begin|start)( with)?)[!.,:]?\s*/i, "")
      .replace(/^Thank you for (joining|participating in|attending)[^.!\n]*[!.,]\s*/i, "")
      .trimStart();
    if (cleaned !== before) matched = true;
  } while (matched && cleaned.length > 0);

  const base = cleaned || raw.trimStart();

  return base
    .replace(/[*_#`~]/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^[-*•]\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

