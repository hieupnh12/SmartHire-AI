import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Check, Clock3, Eye, LockKeyhole, Monitor, Pencil, Save, ShieldCheck, X } from "lucide-react";
import { assessmentApi } from "@/api/tenant/assessmentApi";
import type { QuestionRequest } from "@/api/types/assessment";
import { AssessmentError } from "@/components/ux/assessmentUi";
import { Button } from "@/components/ux/Button";
import {
  hasAnswerValue,
  QuestionAnswerPanel,
  QUESTION_KIND_LABEL,
  type AssessmentQuestionKind,
} from "@/components/ux/QuestionAnswerPanel";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { typeMeta, isSubjectiveKind } from "../constants/excelTemplateMock";
import type { ImportRow } from "../utils/excelImportValidation";
import { hasMinimalContentAndAnswer, isPersistableQuestion } from "../utils/excelImportValidation";
import { clearExcelQuestionDraft } from "../utils/excelQuestionDraft";

const card = "rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)]";
const muted = "text-[var(--color-on-surface-variant)]";
const field = "mt-1 h-10 w-full rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] px-3 text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)] disabled:opacity-70";

function mapDifficulty(raw: string): QuestionRequest["difficulty"] {
  const value = raw.trim().toLowerCase();
  if (!value) return null;
  if (value === "easy" || value.includes("dễ") || value.includes("co ban") || value.includes("cơ bản")) return "Easy";
  if (value === "hard" || value.includes("khó") || value.includes("nâng cao") || value.includes("nang cao")) return "Hard";
  if (value === "medium" || value.includes("vận dụng") || value.includes("van dung") || value.includes("trung")) return "Medium";
  return null;
}

function selectedLetters(answer: string): Set<string> {
  return new Set(
    answer
      .trim()
      .toUpperCase()
      .split(/[,;/|\s]+/)
      .map((part) => part.trim())
      .filter((part) => /^[A-D]$/.test(part)),
  );
}

function toQuestionRequest(item: ImportRow, index: number, defaultScore: number): QuestionRequest {
  const row = item.row;
  const base = {
    questionText: row.content.trim(),
    points: row.score.trim() ? Number(row.score) : defaultScore,
    questionOrder: index,
    difficulty: mapDifficulty(row.difficulty),
    skill: row.skill.trim() || null,
  };

  if (isSubjectiveKind(row.kind)) {
    return {
      ...base,
      questionType: "ESSAY",
      explanation: row.sample.trim() || row.explanation.trim() || null,
      options: [],
    };
  }

  const letters =
    row.kind === "NHIEU_DAP_AN" ? selectedLetters(row.answer) : new Set([row.answer.trim().toUpperCase()].filter((l) => /^[A-D]$/.test(l)));
  const options = [row.optionA, row.optionB, row.optionC, row.optionD]
    .map((optionText, optionIndex) => ({
      optionText: optionText.trim(),
      correct: letters.has(String.fromCharCode(65 + optionIndex)),
    }))
    .filter((option) => option.optionText.length > 0);

  return {
    ...base,
    questionType: row.kind === "NHIEU_DAP_AN" ? "MULTIPLE_CHOICE" : "MCQ",
    explanation: row.explanation.trim() || row.policyNote.trim() || null,
    options,
  };
}

export function AssessmentPublishReview({
  active,
  rows,
  jobId,
  jobTitle,
  defaultScore,
  onBack,
  onEdit,
}: {
  active: boolean;
  rows: ImportRow[];
  jobId: number;
  jobTitle: string;
  defaultScore: number;
  onBack: () => void;
  onEdit: (index: number) => void;
}) {
  const navigate = useNavigate();
  const client = useQueryClient();
  const listPath = `/recruiter/jobs/${jobId}/assessments`;
  const [view, setView] = useState<"audit" | "candidate">("audit");
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showPublish, setShowPublish] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (active) heading.current?.focus();
  }, [active]);
  useEffect(() => {
    if (showPublish) dialog.current?.showModal();
    else dialog.current?.close();
  }, [showPublish]);

  const saveableRows = rows.filter(
    (item) => !item.skipped && item.status !== "INVALID" && isPersistableQuestion(item.row),
  );
  const reviewedCount = rows.filter((item) => !item.skipped).length;
  const total = saveableRows.reduce((sum, item) => sum + (item.row.score.trim() ? Number(item.row.score) : defaultScore), 0);
  const schema = z.object({
    title: z.string().trim().min(1).max(255),
    duration: z.string().regex(/^\d+$/).refine((value) => Number(value) > 0 && Number(value) <= 2147483647),
    passingScore: z.string().refine((value) => value === "" || (/^\d{1,8}(\.\d{1,2})?$/.test(value) && Number(value) <= total)),
  });
  const { register, watch } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: { title: `${jobTitle} — Bài đánh giá`, duration: "30", passingScore: "" },
  });
  const [title, duration, passingScore] = watch(["title", "duration", "passingScore"]);
  const validTitle = schema.shape.title.safeParse(title).success;
  const validDuration = schema.shape.duration.safeParse(duration).success;
  const validPassing = schema.shape.passingScore.safeParse(passingScore).success;

  const kindSummary = [
    ["đơn", saveableRows.filter((item) => item.row.kind === "TRAC_NGHIEM_DON").length],
    ["nhiều đáp án", saveableRows.filter((item) => item.row.kind === "NHIEU_DAP_AN").length],
    ["tự luận", saveableRows.filter((item) => isSubjectiveKind(item.row.kind)).length],
  ]
    .filter(([, count]) => Number(count) > 0)
    .map(([label, count]) => `${count} ${label}`)
    .join(" · ");

  const checks = [
    { title: "Thông tin chung", value: validTitle && validDuration, detail: "Tên đề tối đa 255 ký tự và thời lượng là số phút nguyên dương." },
    {
      title: "Số lượng câu hỏi",
      value: saveableRows.length > 0 && saveableRows.length <= 100,
      detail:
        saveableRows.length === 0
          ? `Chưa có câu đủ nội dung để lưu / ${reviewedCount} câu đã kiểm tra.`
          : `${saveableRows.length} câu sẽ lưu (${kindSummary || "hỗn hợp"}) / ${reviewedCount} câu đã kiểm tra. Không bắt buộc đủ mọi thể loại.`,
    },
    {
      title: "Nội dung & đáp án",
      value: saveableRows.length > 0 && saveableRows.every((item) => hasMinimalContentAndAnswer(item.row)),
      detail:
        "Mỗi câu cần có nội dung; trắc nghiệm cần ≥2 lựa chọn và đáp án. Độ khó / kỹ năng / đáp án mẫu là khuyến nghị, không chặn lưu nháp.",
    },
    {
      title: "Cơ cấu điểm số",
      value:
        Math.abs(total - 10) < 1e-9 &&
        saveableRows.length > 0 &&
        saveableRows.every((item) => {
          const points = Number(item.row.score.trim() || defaultScore);
          return Number.isFinite(points) && points > 0 && points <= 10;
        }),
      detail:
        Math.abs(total - 10) < 1e-9
          ? `Tổng ${total} điểm — đạt yêu cầu (phải đúng 10).`
          : `Tổng ${total} điểm — cần điều chỉnh để tổng đúng 10 điểm.`,
    },
    { title: "Ngưỡng điểm đạt", value: validPassing, detail: passingScore === "" ? "Không đặt ngưỡng điểm đạt." : `Điểm đạt phải từ 0 đến ${total}.` },
  ];
  const passed = checks.filter((check) => check.value).length;
  const canSave = passed === checks.length;
  const selected = rows[Math.min(current, Math.max(rows.length - 1, 0))];
  const difficulties = [
    { label: "Cơ bản", count: rows.filter((item) => item.row.difficulty.trim() && item.row.difficultyTone === "easy").length },
    { label: "Vận dụng", count: rows.filter((item) => item.row.difficulty.trim() && item.row.difficultyTone === "medium").length },
    { label: "Nâng cao", count: rows.filter((item) => item.row.difficulty.trim() && item.row.difficultyTone === "hard").length },
    { label: "Chưa phân loại", count: rows.filter((item) => !item.row.difficulty.trim()).length },
  ];

  const persist = useMutation({
    mutationFn: async () => {
      const toSave = saveableRows;
      if (toSave.length === 0) {
        throw new Error("Không có câu hỏi đủ nội dung để lưu vào đề (cần content; trắc nghiệm cần đáp án + ≥2 lựa chọn).");
      }
      if (toSave.length > 100) {
        throw new Error("Vượt giới hạn 100 câu hỏi.");
      }
      const pointsTotal = toSave.reduce(
        (sum, item) => sum + (item.row.score.trim() ? Number(item.row.score) : defaultScore),
        0,
      );
      if (Math.abs(pointsTotal - 10) >= 1e-9) {
        throw new Error(`Tổng điểm phải đúng 10 (hiện tại ${pointsTotal}).`);
      }
      // Always create DRAFT — publish is done later from assessment detail.
      const test = await assessmentApi.create({
        jobId,
        title: title.trim(),
        description: null,
        durationMinutes: Number(duration),
        passingScore: passingScore === "" ? null : Number(passingScore),
      });
      for (let index = 0; index < toSave.length; index += 1) {
        await assessmentApi.createQuestion(test.id, toQuestionRequest(toSave[index], index, defaultScore));
      }
      return test;
    },
    onSuccess: async (test) => {
      clearExcelQuestionDraft(jobId);
      await client.invalidateQueries({ queryKey: queryKeys.assessments.all() });
      navigate(`${listPath}/${test.id}`, { replace: true });
    },
  });

  const busy = persist.isPending;
  const saved = persist.isSuccess;
  const openSaveDialog = () => setShowPublish(true);

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className={cn(muted, "text-xs")}>Bài đánh giá / {jobTitle}</p>
          <h1 ref={heading} tabIndex={-1} className="mt-2 text-2xl font-semibold tracking-tight outline-none">
            Kiểm định & lưu bản nháp
          </h1>
          <p className="mt-2 text-xs text-[var(--color-primary)]">
            Lưu bản nháp (DRAFT). Cho phép trộn loại câu — không bắt buộc đủ mọi thể loại hay đủ độ khó/kỹ năng.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" onClick={onBack} disabled={busy || saved}>
            <ArrowLeft className="size-4" aria-hidden="true" />
            Quay lại kiểm tra
          </Button>
          <Button
            disabled={!canSave || busy || saved || !validTitle || !validDuration || !validPassing || saveableRows.length === 0}
            onClick={openSaveDialog}
          >
            <Save className="size-4" aria-hidden="true" />
            {busy ? "Đang lưu…" : "Lưu bản nháp"}
          </Button>
        </div>
      </header>

      <AssessmentError error={persist.error} />

      <ol className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Tiến trình tạo bài đánh giá">
        {["Thông tin chung", "Thiết lập câu hỏi", "Kiểm tra & xem trước", "Lưu bản nháp"].map((label, i) => (
          <li
            key={label}
            aria-current={i === (showPublish || saved ? 3 : 2) ? "step" : undefined}
            className={cn(card, "flex items-center gap-3 p-4", i === (showPublish || saved ? 3 : 2) && "ring-2 ring-[var(--color-primary)]")}
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[var(--color-primary-subtle)] text-sm font-semibold text-[var(--color-primary)]">
              {i < 2 || saved ? <Check className="size-4" aria-hidden="true" /> : i + 1}
            </span>
            <span>
              <span className={cn(muted, "block text-[10px] uppercase")}>Bước {i + 1}</span>
              <span className="text-sm font-semibold">{label}</span>
            </span>
          </li>
        ))}
      </ol>

      <fieldset disabled={busy || saved} className={cn(card, "grid gap-4 p-5 sm:grid-cols-2 xl:grid-cols-5")}>
        <legend className="sr-only">Thông tin bài đánh giá</legend>
        <label className="text-xs font-medium sm:col-span-2 xl:col-span-2">
          Tên bài kiểm tra
          <input {...register("title")} aria-invalid={!validTitle} maxLength={255} className={field} />
          {!validTitle && <span className="mt-1 block text-[var(--color-error)]">Nhập tên đề từ 1 đến 255 ký tự.</span>}
        </label>
        <label className="text-xs font-medium">
          Thời gian (phút)
          <input type="number" min={1} step={1} {...register("duration")} aria-invalid={!validDuration} className={field} />
          {!validDuration && <span className="mt-1 block text-[var(--color-error)]">Nhập số phút nguyên dương.</span>}
        </label>
        <label className="text-xs font-medium">
          Điểm đạt (không bắt buộc)
          <input type="number" min={0} max={total} step="0.01" placeholder="Không đặt" {...register("passingScore")} aria-invalid={!validPassing} className={field} />
          {!validPassing && <span className="mt-1 block text-[var(--color-error)]">Điểm đạt phải từ 0 đến {total}, tối đa 2 số thập phân.</span>}
        </label>
        <div>
          <p className={cn(muted, "text-xs")}>Cấu trúc đề</p>
          <p className="mt-2 text-lg font-semibold">
            {rows.length} câu · {total} điểm
          </p>
          <p className={cn(muted, "mt-1 text-xs")}>{jobTitle}</p>
        </div>
      </fieldset>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(300px,0.85fr)_minmax(0,1.65fr)]">
        <aside className="space-y-5">
          <section className={cn(card, "p-5")}>
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-semibold">Báo cáo kiểm định đề thi</h2>
              <span className={cn("rounded-full px-2 py-1 text-xs font-medium", canSave ? "bg-[var(--color-primary-subtle)] text-[var(--color-primary)]" : "bg-[var(--color-error-container)] text-[var(--color-error)]")}>
                {passed}/{checks.length} đạt
              </span>
            </div>
            <div className="mt-4 divide-y divide-[var(--color-border-default)]">
              {checks.map((check) => (
                <div key={check.title} className="flex gap-3 py-3">
                  <ShieldCheck className={cn("mt-0.5 size-5 shrink-0", check.value ? "text-[var(--color-primary)]" : "text-[var(--color-error)]")} aria-hidden="true" />
                  <div>
                    <h3 className="text-sm font-semibold">
                      {check.title}
                      <span className={cn("ml-2 text-xs font-normal", check.value ? muted : "text-[var(--color-error)]")}>{check.value ? "Đạt" : "Cần sửa"}</span>
                    </h3>
                    <p className={cn(muted, "mt-1 text-xs leading-5")}>{check.detail}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
          <section className={cn(card, "p-5")}>
            <h2 className="font-semibold">Phân bổ độ khó</h2>
            <p className={cn(muted, "mt-1 text-xs")}>Tính theo nhãn độ khó của các câu đã nhập.</p>
            <div className="mt-4 space-y-3">
              {difficulties.map((group) => (
                <div key={group.label}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span>{group.label}</span>
                    <span>
                      {group.count} ({rows.length ? Math.round((group.count / rows.length) * 100) : 0}%)
                    </span>
                  </div>
                  <progress className="h-2 w-full overflow-hidden rounded-full accent-[var(--color-primary)]" value={group.count} max={Math.max(rows.length, 1)} aria-label={group.label} />
                </div>
              ))}
            </div>
          </section>
          <section className="space-y-3 rounded-2xl bg-[var(--color-primary-subtle)] p-5">
            <LockKeyhole className="size-5 text-[var(--color-primary)]" aria-hidden="true" />
            <h2 className="font-semibold">Lưu bản nháp</h2>
            <p className={cn(muted, "text-sm leading-6")}>
              Gọi <code className="font-mono text-xs">create_draft_test</code> và{" "}
              <code className="font-mono text-xs">create_question</code>. Đề ở trạng thái DRAFT; xuất bản sau ở trang chi tiết.
            </p>
            <Button className="w-full" disabled={!canSave || busy || saved} onClick={openSaveDialog}>
              <Save className="size-4" aria-hidden="true" />
              Xác nhận lưu bản nháp
            </Button>
            <Button variant="ghost" className="w-full" disabled={busy || saved} onClick={onBack}>
              <Pencil className="size-4" aria-hidden="true" />
              Sửa dữ liệu import
            </Button>
          </section>
        </aside>

        <section className={cn(card, "min-w-0 overflow-hidden")}>
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border-default)] p-4">
            <div className="flex flex-wrap gap-1 rounded-xl bg-[var(--color-surface-container-low)] p-1">
              {(
                [
                  { id: "audit", label: "Giám khảo", icon: ShieldCheck },
                  { id: "candidate", label: "Góc nhìn ứng viên", icon: Monitor },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  aria-pressed={view === tab.id}
                  onClick={() => setView(tab.id)}
                  className={cn(
                    "inline-flex min-h-10 items-center gap-2 rounded-lg px-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]",
                    view === tab.id ? "bg-[var(--color-surface-card)] font-semibold text-[var(--color-primary)] shadow-sm" : muted,
                  )}
                >
                  <tab.icon className="size-4" aria-hidden="true" />
                  {tab.label}
                </button>
              ))}
            </div>
            <span className={cn(muted, "flex items-center gap-1 text-xs")}>
              <Clock3 className="size-4" aria-hidden="true" />
              {validDuration ? duration : "—"} phút · xem trước
            </span>
          </div>
          <div className="space-y-6 p-5 sm:p-6">
            <p className="flex items-start gap-2 rounded-xl bg-[var(--color-surface-container-low)] p-3 text-xs leading-5">
              <Eye className="mt-0.5 size-4 shrink-0 text-[var(--color-primary)]" aria-hidden="true" />
              {view === "audit"
                ? "Chế độ kiểm duyệt: hiển thị đáp án đúng / mẫu và giải thích theo loại câu hỏi."
                : "Chế độ ứng viên: theo loại câu — trắc nghiệm đơn (1 đáp án), nhiều đáp án (chọn nhiều), tự luận (ghi đáp án)."}
            </p>
            <div>
              <div className="mb-3 flex justify-between gap-2">
                <h2 className="text-sm font-semibold">Danh mục câu hỏi</h2>
                <span className={cn(muted, "text-xs")}>
                  Câu {selected ? current + 1 : 0} / {rows.length}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {rows.map((item, index) => (
                  <button
                    key={item.line}
                    type="button"
                    aria-label={`Xem câu ${index + 1}`}
                    aria-current={index === current ? "true" : undefined}
                    onClick={() => setCurrent(index)}
                    className={cn(
                      "grid size-10 place-items-center rounded-lg text-sm font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]",
                      index === current
                        ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                        : hasAnswerValue(answers[item.line])
                          ? "bg-[var(--color-primary-subtle)] text-[var(--color-primary)]"
                          : "bg-[var(--color-surface-container-low)]",
                    )}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>
            </div>
            {selected ? (
              <article className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-lg font-semibold">Câu {current + 1}</h3>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-[var(--color-surface-container)] px-2 py-1 text-[11px] font-medium text-[var(--color-on-surface)]">
                      {QUESTION_KIND_LABEL[selected.row.kind as AssessmentQuestionKind] ?? typeMeta(selected.row.kind).label}
                    </span>
                    <span className="rounded-full bg-[var(--color-primary-subtle)] px-3 py-1 text-xs font-semibold text-[var(--color-primary)]">
                      {selected.row.score.trim() || defaultScore} điểm
                    </span>
                  </div>
                </div>
                <p className={cn(muted, "text-xs")}>
                  {selected.row.skill || "Chưa phân loại kỹ năng"} · {selected.row.difficulty || "Chưa phân loại độ khó"}
                </p>
                <p className="whitespace-pre-wrap break-words text-base font-medium leading-7">{selected.row.content}</p>
                <QuestionAnswerPanel
                  kind={selected.row.kind as AssessmentQuestionKind}
                  questionKey={selected.line}
                  mode={view}
                  value={answers[selected.line] ?? null}
                  onChange={(next) => setAnswers((previous) => ({ ...previous, [selected.line]: next }))}
                  correctAnswer={selected.row.answer}
                  sampleAnswer={selected.row.sample || selected.row.answer}
                  codeSnippet={selected.row.snippet}
                  language={selected.row.language}
                  options={[selected.row.optionA, selected.row.optionB, selected.row.optionC, selected.row.optionD]
                    .map((body, index) => ({
                      id: String.fromCharCode(65 + index),
                      label: String.fromCharCode(65 + index),
                      body,
                    }))
                    .filter((option) => option.body.trim())}
                />
                {view === "audit" && (
                  <div className="rounded-xl bg-[var(--color-surface-container-low)] p-4">
                    <h4 className="text-sm font-semibold">Giải thích dành cho giám khảo</h4>
                    <p className={cn(muted, "mt-2 whitespace-pre-wrap break-words text-sm leading-6")}>
                      {(selected.row.kind === "NHIEU_DAP_AN"
                        ? selected.row.policyNote.trim() || selected.row.explanation.trim()
                        : selected.row.explanation.trim()) || "Người soạn chưa thêm giải thích cho câu hỏi này."}
                    </p>
                  </div>
                )}
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border-default)] pt-4">
                  <Button variant="secondary" disabled={current === 0} onClick={() => setCurrent(current - 1)}>
                    <ArrowLeft className="size-4" aria-hidden="true" />
                    Câu trước
                  </Button>
                  {view === "candidate" && (
                    <span className={cn(muted, "text-xs")}>
                      {hasAnswerValue(answers[selected.line]) ? "Đã trả lời thử nghiệm" : "Chưa trả lời"}
                    </span>
                  )}
                  <Button variant="secondary" disabled={current >= rows.length - 1} onClick={() => setCurrent(current + 1)}>
                    Câu tiếp theo
                    <ArrowRight className="size-4" aria-hidden="true" />
                  </Button>
                </div>
                <Button variant="ghost" disabled={busy || saved} onClick={() => onEdit(selected.line - 2)}>
                  <Pencil className="size-4" aria-hidden="true" />
                  Chỉnh sửa câu này trong bảng Excel
                </Button>
              </article>
            ) : (
              <p className={muted}>Chưa có câu hỏi để xem trước.</p>
            )}
          </div>
        </section>
      </div>

      <dialog
        ref={dialog}
        onCancel={() => !busy && setShowPublish(false)}
        onClose={() => setShowPublish(false)}
        aria-labelledby="publish-review-title"
        aria-describedby="publish-review-description"
        className="m-auto w-[calc(100%_-_2rem)] max-w-lg rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-0 text-[var(--color-on-surface)] shadow-xl backdrop:bg-black/40"
      >
        <div className="space-y-5 p-6">
          <div className="flex items-start justify-between gap-3">
            <span className="grid size-12 place-items-center rounded-xl bg-[var(--color-primary-subtle)] text-[var(--color-primary)]">
              <Save className="size-6" aria-hidden="true" />
            </span>
            <Button autoFocus variant="ghost" size="sm" aria-label="Đóng xác nhận lưu bản nháp" disabled={busy} onClick={() => setShowPublish(false)}>
              <X className="size-5" aria-hidden="true" />
            </Button>
          </div>
          <div>
            <p className="text-xs font-semibold text-[var(--color-primary)]">BƯỚC 4 · LƯU BẢN NHÁP</p>
            <h2 id="publish-review-title" className="mt-2 text-xl font-semibold">
              Lưu bài đánh giá dạng bản nháp
            </h2>
            <p id="publish-review-description" className={cn(muted, "mt-2 text-sm leading-6")}>
              Tạo đề “{title}” với {rows.length} câu hỏi ở trạng thái DRAFT. Bạn có thể xuất bản sau từ trang chi tiết đề.
            </p>
          </div>
          <div className="rounded-xl bg-[var(--color-primary-subtle)] p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-[var(--color-primary)]">
              <ShieldCheck className="size-5" aria-hidden="true" />
              {passed}/{checks.length} điều kiện kiểm định đạt
            </p>
            <p className={cn(muted, "mt-2 text-xs")}>
              Job: {jobTitle} · {duration} phút · {total} điểm · DRAFT
            </p>
          </div>
          <AssessmentError error={persist.error} />
          <div className="flex flex-wrap justify-end gap-2">
            <Button variant="secondary" disabled={busy} onClick={() => setShowPublish(false)}>
              Kiểm tra lại
            </Button>
            <Button disabled={!canSave || busy} onClick={() => persist.mutate()}>
              <Save className="size-4" aria-hidden="true" />
              {busy ? "Đang lưu…" : "Xác nhận lưu bản nháp"}
            </Button>
          </div>
        </div>
      </dialog>
    </section>
  );
}
