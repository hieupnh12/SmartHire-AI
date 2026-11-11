import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { questionBankApi } from "@/api/tenant/questionBankApi";
import type { QuestionRequest } from "@/api/types/assessment";
import { queryKeys } from "@/lib/query-keys";
import { useT } from "@/i18n";
import { toast } from "@/stores/toastStore";
import { useOptionalRecruitmentJob } from "@/features/tenant/recruiter/jobs/components/JobRecruitmentWorkspace";
import { AssessmentSubNav } from "@/features/tenant/recruiter/assessments/components/AssessmentSubNav";
import {
  pollCodingDrafts,
  similarIds,
  SKILLS,
  uid,
  type CodingLanguage,
  type DraftItem,
  type QuestionKind,
} from "./types";
import { AiStudioHeader } from "./components/AiStudioHeader";
import { AiConfigSidebar } from "./components/AiConfigSidebar";
import { AiReviewWorkspace } from "./components/AiReviewWorkspace";
import type {
  RealtimeStage,
  SocketStatus,
} from "./components/AiRealtimeProgressCard";

interface SavedDraftsStorage {
  drafts: DraftItem[];
  selected?: string[];
  batchCount?: number;
  savedAt?: number;
}

function loadSavedDrafts(key: string): SavedDraftsStorage | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed?.drafts) && parsed.drafts.length > 0) {
      return parsed;
    }
  } catch {
    // ignore
  }
  return null;
}

export function AiQuestionGeneratorPage() {
  const t = useT();
  const navigate = useNavigate();
  const { id: routeJobId } = useParams();
  const client = useQueryClient();
  const job = useOptionalRecruitmentJob();

  const isJobContext = Boolean(job);
  const backPath = isJobContext
    ? `/recruiter/jobs/${job!.id}/assessments/question-bank`
    : "/recruiter/question-bank";

  const effectiveJobId = job?.id ?? (routeJobId && !isNaN(Number(routeJobId)) ? Number(routeJobId) : undefined);
  const storageKey = useMemo(() => {
    return effectiveJobId
      ? `smarthire_ai_drafts_job_${effectiveJobId}`
      : "smarthire_ai_drafts_global";
  }, [effectiveJobId]);

  const jobSkills = useMemo(
    () => (job?.skills?.map((s) => s.name).filter(Boolean) as string[]) || [],
    [job],
  );
  const skills = jobSkills.length ? jobSkills : SKILLS;

  // Tham số cấu hình AI
  const [skill, setSkill] = useState(skills[0] || "Java");
  const [difficulty, setDifficulty] = useState<"Easy" | "Medium" | "Hard">("Medium");
  const [questionType, setQuestionType] = useState<QuestionKind>("MCQ");
  const [count, setCount] = useState(3);
  const [topic, setTopic] = useState(job?.title || "");
  const [language, setLanguage] = useState<"vi" | "en">("vi");
  const [codingLanguage, setCodingLanguage] = useState<CodingLanguage>("java");
  const [includeJd, setIncludeJd] = useState(Boolean(job));

  // Tiến trình Real-time & WebSocket state
  const [stage, setStage] = useState<RealtimeStage>("analyzing");
  const [progressPercent, setProgressPercent] = useState<number>(15);
  const [socketStatus, setSocketStatus] = useState<SocketStatus>("connected");
  const [statusMessage, setStatusMessage] = useState<string>("");
  const abortControllerRef = useRef<AbortController | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [streamedCount, setStreamedCount] = useState<number>(0);

  // Quản lý câu hỏi nháp & đợt sinh (Batching) với localStorage persistence
  const [drafts, setDrafts] = useState<DraftItem[]>(() => {
    return loadSavedDrafts(storageKey)?.drafts ?? [];
  });
  const [selected, setSelected] = useState<Set<string>>(() => {
    const saved = loadSavedDrafts(storageKey);
    if (saved) {
      if (Array.isArray(saved.selected) && saved.selected.length > 0) {
        return new Set(saved.selected);
      }
      return new Set(saved.drafts.map((d: DraftItem) => d.id));
    }
    return new Set();
  });
  const [batchCount, setBatchCount] = useState<number>(() => {
    return loadSavedDrafts(storageKey)?.batchCount ?? 0;
  });
  const [generationMode, setGenerationMode] = useState<"APPEND" | "REPLACE">(() => {
    const saved = loadSavedDrafts(storageKey);
    return saved && saved.drafts.length > 0 ? "APPEND" : "REPLACE";
  });
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  const workspaceRef = useRef<HTMLDivElement>(null);
  const isMountedRef = useRef(false);
  const prevKeyRef = useRef(storageKey);

  // Tự động lưu bản nháp vào localStorage mỗi khi thay đổi
  useEffect(() => {
    if (!isMountedRef.current) {
      isMountedRef.current = true;
      return;
    }
    try {
      if (drafts.length > 0) {
        localStorage.setItem(
          storageKey,
          JSON.stringify({
            drafts,
            selected: Array.from(selected),
            batchCount,
            savedAt: Date.now(),
          }),
        );
      } else {
        localStorage.removeItem(storageKey);
      }
    } catch (e) {
      console.warn("Could not save AI drafts to localStorage", e);
    }
  }, [drafts, selected, batchCount, storageKey]);

  // Đồng bộ mô hình AI đang kích hoạt giữa các câu hỏi trong cùng phiên làm việc
  useEffect(() => {
    const known = drafts.find((d) => {
      const meta = d.authoringMetadata as Record<string, unknown> | null | undefined;
      const model = typeof meta?.model === "string" ? meta.model.trim() : "";
      return model.length > 0 && model !== "Coding AI Engine";
    });
    if (known) {
      const meta = known.authoringMetadata as Record<string, unknown> | null | undefined;
      const model = typeof meta?.model === "string" ? meta.model.trim() : "";
      if (model.length > 0) {
        try {
          localStorage.setItem("smarthire_active_ai_model", model);
        } catch {}
      }
    }
  }, [drafts]);

  // Nạp lại bản nháp nếu chuyển đổi context giữa các job
  useEffect(() => {
    if (prevKeyRef.current !== storageKey) {
      prevKeyRef.current = storageKey;
      const saved = loadSavedDrafts(storageKey);
      if (saved) {
        setDrafts(saved.drafts);
        setSelected(
          Array.isArray(saved.selected) && saved.selected.length > 0
            ? new Set(saved.selected)
            : new Set(saved.drafts.map((d: DraftItem) => d.id)),
        );
        setBatchCount(typeof saved.batchCount === "number" ? saved.batchCount : 1);
        setGenerationMode("APPEND");
      } else {
        setDrafts([]);
        setSelected(new Set());
        setBatchCount(0);
        setGenerationMode("REPLACE");
      }
    }
  }, [storageKey]);

  const coding = questionType === "CODING";

  const patchDraft = (id: string, patch: Partial<QuestionRequest>) => {
    setDrafts((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, question: { ...item.question, ...patch } } : item,
      ),
    );
  };

  const patchOption = (
    id: string,
    optionIndex: number,
    patch: { optionText?: string; correct?: boolean },
  ) => {
    setDrafts((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const options = (item.question.options ?? []).map((option, j) => {
          if (j !== optionIndex) {
            if (patch.correct === true && item.question.questionType === "MCQ") {
              return { ...option, correct: false };
            }
            return option;
          }
          return { ...option, ...patch };
        });
        return { ...item, question: { ...item.question, options } };
      }),
    );
  };

  const removeDraft = (id: string) => {
    setDrafts((prev) => prev.filter((item) => item.id !== id));
    setSelected((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    toast.info(t("recruiter.assessments.aiStudio.removedDraftToast"));
  };

  const clearAllDrafts = () => {
    if (window.confirm(t("recruiter.assessments.aiStudio.clearAllConfirm"))) {
      setDrafts([]);
      setSelected(new Set());
      setBatchCount(0);
      setGenerationMode("REPLACE");
      try {
        localStorage.removeItem(storageKey);
      } catch {
        // ignore
      }
      toast.info(t("recruiter.assessments.aiStudio.clearAllSuccess"));
    }
  };

  const jobContext = useMemo(() => {
    if (!job) return "";
    return [
      job.title,
      job.description,
      job.responsibilities,
      jobSkills.length ? t("recruiter.assessments.aiStudio.jdSkillsPrefix", { skills: jobSkills.join(", ") }) : "",
    ]
      .filter(Boolean)
      .join("\n\n");
  }, [job, jobSkills, t]);

  useEffect(() => {
    return () => {
      if (progressTimerRef.current) clearInterval(progressTimerRef.current);
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleCancelGenerate = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    setStage("analyzing");
    setProgressPercent(0);
    toast.info(t("recruiter.assessments.aiStudio.cancelledToast"));
  };

  const startProgressSimulation = () => {
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    setStage("analyzing");
    setProgressPercent(15);
    setStatusMessage(
      includeJd && job
        ? t("recruiter.assessments.aiStudio.stageAnalyzingJd")
        : t("recruiter.assessments.aiStudio.stageAnalyzingSkill", { skill }),
    );

    const startTime = Date.now();
    const typeLabel =
      questionType === "CODING"
        ? t("recruiter.assessments.common.questionTypes.badgeCode")
        : questionType === "ESSAY"
          ? t("recruiter.assessments.aiStudio.questionTypes.essayLabel")
          : t("recruiter.assessments.aiStudio.questionTypes.mcqLabel");

    progressTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime;
      if (elapsed < 1600) {
        setStage("analyzing");
        setProgressPercent(Math.min(35, 15 + Math.floor((elapsed / 1600) * 20)));
      } else if (elapsed < 3800) {
        setStage("generating");
        setStatusMessage(
          t("recruiter.assessments.aiStudio.stageGeneratingTitle", { count, type: typeLabel, skill }),
        );
        setProgressPercent(Math.min(75, 35 + Math.floor(((elapsed - 1600) / 2200) * 40)));
      } else {
        setStage("verifying");
        setStatusMessage(t("recruiter.assessments.aiStudio.stageVerifyingTitle"));
        setProgressPercent((prev) => Math.min(94, prev + 1));
      }
    }, 200);
  };

  const generate = useMutation({
    mutationFn: async () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      const controller = new AbortController();
      abortControllerRef.current = controller;
      setStreamedCount(0);
      setSocketStatus("connected");

      const contextText = includeJd ? jobContext.trim() : "";
      if (coding) {
        startProgressSimulation();
        const instructions = [topic.trim(), contextText].filter(Boolean).join("\n\n");
        return pollCodingDrafts(
          {
            skill,
            difficulty,
            count,
            language: codingLanguage,
            instructions,
          },
          controller.signal,
          t,
        );
      }

      // 100% Real-Time SSE Stream with instant question_created push from Backend
      const targetBatch = batchCount + 1;
      let hasClearedForReplace = false;

      return questionBankApi.generateStream(
        {
          skill,
          difficulty,
          questionType,
          count,
          topic: topic.trim() || undefined,
          language,
          context: contextText || undefined,
        },
        {
          onStarted: () => {
            setSocketStatus("connected");
          },
          onProgress: (event) => {
            setStage(event.stage);
            setStatusMessage(event.message);
            setProgressPercent(event.progressPercent);
          },
          onQuestionCreated: (event) => {
            setStreamedCount((prev) => prev + 1);
            const newDraftItem: DraftItem = {
              id: uid(),
              batch: targetBatch,
              question: event.question,
              authoringMetadata: event.authoringMetadata,
            };

            setDrafts((prev) => {
              if (generationMode === "REPLACE" && !hasClearedForReplace) {
                hasClearedForReplace = true;
                return [newDraftItem];
              }
              if (generationMode === "REPLACE") {
                return [...prev, newDraftItem];
              }
              // APPEND mode: Đưa các câu hỏi của đợt sinh mới nhất lên trên đầu danh sách,
              // các câu trong cùng đợt này giữ đúng thứ tự xuất hiện (1, 2, 3...)
              const currentBatchItems = prev.filter((d) => d.batch === targetBatch);
              const otherBatchItems = prev.filter((d) => d.batch !== targetBatch);
              return [...currentBatchItems, newDraftItem, ...otherBatchItems];
            });

            setSelected((prev) => {
              const next = new Set(prev);
              next.add(newDraftItem.id);
              return next;
            });
          },
          onCompleted: (event) => {
            setStage("completed");
            setProgressPercent(100);
            if (event.count < count) {
              setStatusMessage(t("recruiter.assessments.aiStudio.streamPartialMessage", { done: event.count, requested: count }));
              toast.info(
                t("recruiter.assessments.aiStudio.streamPartialToastTitle", { done: event.count, requested: count }),
                t("recruiter.assessments.aiStudio.streamPartialToastDesc"),
              );
            } else {
              setStatusMessage(t("recruiter.assessments.aiStudio.streamCompleteMessage", { count: event.count }));
            }
          },
          onError: (err) => {
            setSocketStatus("reconnecting");
            throw err;
          },
        },
        controller.signal,
      );
    },
    onSuccess: (items) => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
      setStage("completed");
      setProgressPercent(100);
      if (items.length < count) {
        setStatusMessage(t("recruiter.assessments.aiStudio.streamPartialMessage", { done: items.length, requested: count }));
      } else {
        setStatusMessage(t("recruiter.assessments.aiStudio.streamCompleteMessage", { count: items.length }));
      }

      const nextBatch = batchCount + 1;
      setBatchCount(nextBatch);
      setGenerationMode("APPEND");

      if (coding) {
        const newDraftItems: DraftItem[] = items.map((raw) => ({
          id: uid(),
          batch: nextBatch,
          question: raw.question,
          authoringMetadata: raw.authoringMetadata,
        }));

        if (generationMode === "APPEND" && drafts.length > 0) {
          // Đưa toàn bộ các câu code mới lên đầu danh sách nháp
          setDrafts((prev) => [...newDraftItems, ...prev]);
          setSelected((prev) => {
            const next = new Set(prev);
            newDraftItems.forEach((d) => next.add(d.id));
            return next;
          });
        } else {
          setDrafts(newDraftItems);
          setSelected(new Set(newDraftItems.map((d) => d.id)));
        }
      }

      toast.success(
        t("recruiter.assessments.aiStudio.studioCreatedTitle", { count: items.length }),
        t("recruiter.assessments.aiStudio.studioCreatedDesc"),
      );

      const dupes = items.filter((item) => similarIds(item.authoringMetadata).length > 0).length;
      if (dupes > 0) {
        toast.warning(
          t("recruiter.assessments.aiStudio.duplicateWarningTitle"),
          t("recruiter.assessments.aiStudio.duplicateWarningDesc", { count: dupes }),
        );
      }
    },
    onError: (err: unknown) => {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current);
        progressTimerRef.current = null;
      }
      const isAbort =
        (err as { name?: string })?.name === "AbortError" ||
        (err as { name?: string })?.name === "CanceledError" ||
        (err instanceof DOMException && err.name === "AbortError");
      if (isAbort) {
        return;
      }
      const msg = err instanceof Error ? err.message : t("recruiter.assessments.aiStudio.generateErrorFallback");
      toast.error(t("recruiter.assessments.aiStudio.generateErrorTitle"), msg);
    },
  });

  const save = useMutation({
    mutationFn: async () => {
      const picked = drafts
        .filter((item) => selected.has(item.id))
        .map((item) => ({
          question: item.question,
          authoringMetadata: item.authoringMetadata,
        }));
      if (!picked.length) throw new Error(t("recruiter.assessments.aiStudio.pickAtLeastOneError"));
      return questionBankApi.create(picked);
    },
    onSuccess: async (saved) => {
      const remainingDrafts = drafts.filter((item) => !selected.has(item.id));
      if (remainingDrafts.length > 0) {
        setDrafts(remainingDrafts);
        setSelected(new Set());
      } else {
        setDrafts([]);
        setSelected(new Set());
        setBatchCount(0);
        try {
          localStorage.removeItem(storageKey);
        } catch {
          // ignore
        }
      }
      toast.success(
        t("recruiter.assessments.aiStudio.saveSuccessTitle", { count: saved.length }),
        t("recruiter.assessments.aiStudio.saveSuccessDesc"),
      );
      await client.invalidateQueries({ queryKey: queryKeys.assessments.all() });
      navigate(backPath);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : t("recruiter.assessments.aiStudio.saveErrorFallback");
      toast.error(t("recruiter.assessments.aiStudio.saveErrorTitle"), msg);
    },
  });

  const busy = generate.isPending || save.isPending;
  const selectedCount = selected.size;

  const filteredDrafts = useMemo(() => {
    if (typeFilter === "ALL") return drafts;
    return drafts.filter((item) => item.question.questionType === typeFilter);
  }, [drafts, typeFilter]);

  const toggleSelectAll = () => {
    if (selected.size === filteredDrafts.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filteredDrafts.map((d) => d.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleStartGenerate = () => {
    if (workspaceRef.current) {
      const yOffset = -90;
      const y = workspaceRef.current.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: Math.max(0, y), behavior: "smooth" });
    }
    generate.mutate();
  };

  return (
    <section className="space-y-4 text-[var(--color-on-surface)]">
      {/* Tầng 1: SubNav chính của Job (nếu nằm trong Job Workspace) */}
      {job && <AssessmentSubNav jobId={job.id} activeTab="bank" />}

      {/* Tầng 2: Studio Header Bar */}
      <AiStudioHeader
        job={job}
        backPath={backPath}
        busy={busy}
        selectedCount={selectedCount}
        isSaving={save.isPending}
        onSave={() => save.mutate()}
        drafts={drafts}
        filteredDrafts={filteredDrafts}
        selected={selected}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        toggleSelectAll={toggleSelectAll}
        clearAllDrafts={clearAllDrafts}
      />

      {/* Tầng 3: Không gian Split Studio 2 Cột Toàn Màn Hình */}
      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[380px_minmax(0,1fr)] xl:grid-cols-[420px_minmax(0,1fr)]">
        {/* CỘT TRÁI: Bảng điều khiển tham số AI */}
        <AiConfigSidebar
          job={job}
          skills={skills}
          skill={skill}
          setSkill={setSkill}
          difficulty={difficulty}
          setDifficulty={setDifficulty}
          questionType={questionType}
          setQuestionType={setQuestionType}
          count={count}
          setCount={setCount}
          topic={topic}
          setTopic={setTopic}
          language={language}
          setLanguage={setLanguage}
          codingLanguage={codingLanguage}
          setCodingLanguage={setCodingLanguage}
          includeJd={includeJd}
          setIncludeJd={setIncludeJd}
          draftsCount={drafts.length}
          batchCount={batchCount}
          generationMode={generationMode}
          setGenerationMode={setGenerationMode}
          busy={busy}
          isGenerating={generate.isPending}
          onGenerate={handleStartGenerate}
          onCancel={handleCancelGenerate}
        />

        {/* CỘT PHẢI: Không gian kiểm duyệt & Chỉnh sửa nháp */}
        <div ref={workspaceRef} className="min-w-0">
          <AiReviewWorkspace
            drafts={drafts}
            filteredDrafts={filteredDrafts}
            selected={selected}
            selectedCount={selectedCount}
            batchCount={batchCount}
            coding={coding}
            count={count}
            skill={skill}
            questionType={questionType}
            hasJdContext={includeJd && Boolean(job)}
            busy={busy}
            isGenerating={generate.isPending}
            isSaving={save.isPending}
            generateError={generate.error}
            saveError={save.error}
            stage={stage}
            progressPercent={progressPercent}
            socketStatus={socketStatus}
            statusMessage={statusMessage}
            streamedCount={streamedCount}
            onCancelGenerate={handleCancelGenerate}
            backPath={backPath}
            onNavigateBack={() => navigate(backPath)}
            onSave={() => save.mutate()}
            onToggleSelect={toggleSelect}
            onRemoveDraft={removeDraft}
            onPatchDraft={patchDraft}
            onPatchOption={patchOption}
          />
        </div>
      </div>
    </section>
  );
}

export default AiQuestionGeneratorPage;
