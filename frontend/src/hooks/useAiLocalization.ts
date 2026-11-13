import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocale } from "@/i18n";
import { aiLocalizationApi } from "@/api/tenant/aiLocalizationApi";

export type LocalizableAiContent = {
  verdict?: string;
  advice?: string;
  strengths?: string[];
  risks?: string[];
  interviewQuestions?: string[];
  [key: string]: unknown;
};

export type UseAiLocalizationOptions = {
  entityType: string;
  entityId?: number | string | null;
  content?: LocalizableAiContent | null;
  sourceLocale?: string; // default 'vi'
  contentHash?: string | null;
  translationPending?: boolean | null;
  enabled?: boolean;
};

export function useAiLocalization({
  entityType,
  entityId,
  content,
  sourceLocale = "vi",
  contentHash,
  translationPending,
  enabled = true,
}: UseAiLocalizationOptions) {
  const currentLocale = useLocale();
  const [showOriginal, setShowOriginal] = useState(false);

  const normTarget = currentLocale.toLowerCase();
  const normSource = sourceLocale.toLowerCase();
  const isSameLocale = normTarget === normSource;

  // Extract only the evaluative fields to pass for localization
  const evaluativePayload = useMemo(() => {
    if (!content) return null;
    const payload: Record<string, unknown> = {};
    if (content.verdict) payload.verdict = content.verdict;
    if (content.advice) payload.advice = content.advice;
    if (Array.isArray(content.strengths) && content.strengths.length > 0) payload.strengths = content.strengths;
    if (Array.isArray(content.risks) && content.risks.length > 0) payload.risks = content.risks;
    if (Array.isArray(content.interviewQuestions) && content.interviewQuestions.length > 0)
      payload.interviewQuestions = content.interviewQuestions;
    return Object.keys(payload).length > 0 ? payload : null;
  }, [content]);

  const shouldFetch =
    enabled &&
    !isSameLocale &&
    Boolean(entityId) &&
    Boolean(evaluativePayload) &&
    (translationPending !== false || Boolean(contentHash));

  const query = useQuery({
    queryKey: ["aiLocalization", entityType, entityId, normTarget, contentHash ?? JSON.stringify(evaluativePayload)],
    queryFn: async () => {
      if (!entityId || !evaluativePayload) return null;
      return aiLocalizationApi.localize({
        entityType,
        entityId: Number(entityId),
        targetLocale: normTarget,
        sourceLocale: normSource,
        content: evaluativePayload,
      });
    },
    enabled: shouldFetch,
    staleTime: Infinity, // Immutable cache per hash
    gcTime: 1000 * 60 * 60 * 24, // 24 hours in query client memory
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const localizedData = (query.data?.localizedContent as LocalizableAiContent) ?? null;

  const isTranslated = Boolean(localizedData && !isSameLocale);
  const isTranslating = query.isFetching;

  // Effective content to display: if showOriginal is true or no translation yet, show original
  const displayContent: LocalizableAiContent | null = useMemo(() => {
    if (!content) return null;
    if (showOriginal || isSameLocale || !localizedData) {
      return content;
    }
    return {
      ...content,
      verdict: localizedData.verdict ?? content.verdict,
      advice: localizedData.advice ?? content.advice,
      strengths: localizedData.strengths ?? content.strengths,
      risks: localizedData.risks ?? content.risks,
      interviewQuestions: localizedData.interviewQuestions ?? content.interviewQuestions,
    };
  }, [content, localizedData, showOriginal, isSameLocale]);

  const toggleOriginal = () => {
    setShowOriginal((prev) => !prev);
  };

  return {
    displayContent,
    isTranslated,
    isTranslating,
    showOriginal,
    toggleOriginal,
    isSameLocale,
    hasError: query.isError,
  };
}

