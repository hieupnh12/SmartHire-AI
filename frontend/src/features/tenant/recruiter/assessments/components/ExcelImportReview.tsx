import { AssessmentPublishReview } from "./AssessmentPublishReview";
import type { BankSaveActions } from "../utils/bankQuestionAuthoring";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  CheckCircle2,
  Download,
  FileCheck2,
  FileSpreadsheet,
  ListChecks,
  Search,
  ShieldAlert,
  ShieldCheck,
  X,
} from "lucide-react";
import { Button } from "@/components/ux/Button";
import { useT, type TranslateFn } from "@/i18n";
import { cn } from "@/lib/utils";
import { isChoiceKind, typeMeta, type BankQuestion } from "../constants/excelTemplateMock";
import {
  answerDisplay,
  importErrorCsv,
  validateExcelQuestions,
  type ImportRow,
  type ImportStatus,
} from "../utils/excelImportValidation";

const panel = "rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)]";
const muted = "text-[var(--color-on-surface-variant)]";
type Filter = "all" | "valid" | "invalid" | "warning";

function statusMeta(status: ImportStatus, t: TranslateFn) {
  if (status === "VALID") {
    return {
      label: "VALID",
      className: "bg-[var(--color-primary-subtle)] text-[var(--color-primary)]",
      title: t("recruiter.assessments.importReview.statusValidTitle"),
    };
  }
  if (status === "WARNING") {
    return {
      label: "WARNING",
      className: "bg-amber-50 text-amber-800",
      title: t("recruiter.assessments.importReview.statusWarningTitle"),
    };
  }
  return {
    label: "INVALID",
    className: "bg-[var(--color-error-container)] text-[var(--color-error)]",
    title: t("recruiter.assessments.importReview.statusInvalidTitle"),
  };
}

function StatusDetail({ item, defaultScore, confirmed, onEdit }: {
  item: ImportRow;
  defaultScore: number;
  confirmed: boolean;
  onEdit: (index: number) => void;
}) {
  const t = useT();
  const meta = statusMeta(item.status, t);
  return (
    <div className="space-y-2">
      <span className={cn("inline-flex items-center rounded-full px-2.5 py-1 text-[10px] font-bold tracking-wide", meta.className)} title={meta.title}>
        {meta.label}
      </span>

      {item.status === "INVALID" && (
        <div className="text-[var(--color-error)]">
          <p className="font-semibold">{t("recruiter.assessments.importReview.rowInvalidHeading", { line: item.line })}</p>
          <ul className="mt-1.5 space-y-1">
            {item.errors.map((error) => (
              <li key={error} className="flex gap-1.5">
                <span aria-hidden="true">•</span>
                <span>{error}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {item.status === "WARNING" && (
        <div className="text-amber-800">
          <p className="font-semibold">{t("recruiter.assessments.importReview.rowWarningHeading", { line: item.line })}</p>
          <ul className="mt-1.5 space-y-1">
            {item.warnings.map((warning) => (
              <li key={warning} className="flex gap-1.5">
                <span aria-hidden="true">•</span>
                <span>{warning}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {item.status === "VALID" && (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--color-primary-subtle)] px-2.5 py-1 font-medium text-[var(--color-primary)]">
          <CheckCircle2 className="size-3.5" aria-hidden="true" />
          {t("recruiter.assessments.importReview.rowValidBadge", { score: item.row.score.trim() || defaultScore })}
        </span>
      )}

      {item.status === "WARNING" && (
        <p className={cn(muted, "text-[11px]")}>
          {t("recruiter.assessments.importReview.rowWarningHint")}
        </p>
      )}

      {!confirmed && (
        <button
          type="button"
          onClick={() => onEdit(item.line - 2)}
          className="mt-1 block min-h-8 font-semibold text-[var(--color-primary)] underline underline-offset-4"
        >
          {t("recruiter.assessments.importReview.editRowBtn", { line: item.line })}
        </button>
      )}
    </div>
  );
}

export function ExcelImportReview({
  questions,
  jobId,
  jobTitle,
  onBack,
  onEdit,
  generalBank,
}: {
  questions: BankQuestion[];
  jobId: number;
  jobTitle: string;
  onBack: () => void;
  onEdit: (index: number) => void;
  generalBank?: BankSaveActions;
}) {
  const t = useT();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const [defaultScore, setDefaultScore] = useState(5);
  const [policy, setPolicy] = useState<"valid" | "all">("valid");
  const [acknowledged, setAcknowledged] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, [step, confirmed]);

  const rows = useMemo(() => validateExcelQuestions(questions, defaultScore, t), [questions, defaultScore, t]);
  const blank = rows.filter((item) => item.skipped);
  const active = rows.filter((item) => !item.skipped);
  const valid = active.filter((item) => item.status === "VALID" || item.status === "WARNING");
  const invalid = active.filter((item) => item.status === "INVALID");
  const warningOnly = active.filter((item) => item.status === "WARNING");
  const excluded = active.length - valid.length;
  const totalPoints = valid.reduce(
    (sum, item) => sum + (item.row.score.trim() ? Number(item.row.score) : defaultScore),
    0,
  );
  const maxQuestions = generalBank ? 999 : 100;
  const canContinue = valid.length > 0 && valid.length <= maxQuestions && (policy === "valid" || excluded === 0);

  const filtered = active.filter((item) => {
    if (step > 1 && item.status === "INVALID") return false;
    if (step === 1 && filter === "valid" && item.status !== "VALID") return false;
    if (step === 1 && filter === "invalid" && item.status !== "INVALID") return false;
    if (step === 1 && filter === "warning" && item.status !== "WARNING") return false;
    return (
      !search.trim() ||
      [item.row.content, item.row.id, item.row.skill, item.row.difficulty, String(item.line)].some((value) =>
        value.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
      )
    );
  });
  const pageCount = Math.max(1, Math.ceil(filtered.length / 10));
  const safePage = Math.min(page, pageCount - 1);
  const shown = filtered.slice(safePage * 10, safePage * 10 + 10);
  const changeStep = (next: 1 | 2 | 3) => {
    setStep(next);
    setPage(0);
    setSearch("");
  };

  function downloadErrors() {
    const url = URL.createObjectURL(new Blob([importErrorCsv(rows, t)], { type: "text/csv;charset=utf-8;" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = t("recruiter.assessments.importReview.csvFilename");
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  return (
    <>
      <div hidden={step < 2}>
        <AssessmentPublishReview
          active={step >= 2}
          rows={valid}
          jobId={jobId}
          jobTitle={jobTitle}
          defaultScore={defaultScore}
          onBack={() => changeStep(1)}
          onEdit={onEdit}
          generalBank={generalBank}
        />
      </div>
      <section hidden={step >= 2} className={cn(panel, "overflow-hidden text-[var(--color-on-surface)]")}>
        <header className="space-y-6 bg-[var(--color-surface-container-low)]/70 p-4 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex min-w-0 flex-1 gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--color-primary)] text-[var(--color-on-primary)]">
                <FileSpreadsheet className="size-6" aria-hidden="true" />
              </span>
              <div>
                <h1
                  ref={heading}
                  tabIndex={-1}
                  className="text-xl font-semibold tracking-tight outline-none sm:text-2xl"
                >
                  {confirmed ? t("recruiter.assessments.importReview.confirmedHeading") : t("recruiter.assessments.importReview.defaultHeading")}
                </h1>
                <p className={cn(muted, "mt-1 text-sm leading-6")}>
                  {generalBank ? t("recruiter.assessments.importReview.generalBankSubtitle") : t("recruiter.assessments.importReview.assessmentSubtitle")}
                </p>
                <p className="mt-1 text-xs font-medium text-[var(--color-primary)]">{t("recruiter.assessments.importReview.positionLabel", { jobTitle })}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                aria-expanded={showGuide}
                aria-controls="excel-import-guide"
                onClick={() => setShowGuide(!showGuide)}
              >
                <BookOpen className="size-4" aria-hidden="true" />
                {t("recruiter.assessments.importReview.guideBtn")}
              </Button>
              <Button variant="ghost" size="sm" aria-label={t("recruiter.assessments.importReview.closeReviewAria")} onClick={onBack}>
                <X className="size-5" aria-hidden="true" />
              </Button>
            </div>
          </div>
          <ol aria-label={t("recruiter.assessments.importReview.stepsAria")} className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              t("recruiter.assessments.importReview.steps.author"),
              t("recruiter.assessments.importReview.steps.validate"),
              t("recruiter.assessments.importReview.steps.preview"),
              t("recruiter.assessments.importReview.steps.confirm"),
            ].map((label, index) => (
              <li
                key={label}
                aria-current={index === step ? "step" : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-xl p-3",
                  index === step ? "bg-[var(--color-surface-card)] ring-2 ring-[var(--color-primary)]" : "bg-[var(--color-surface-card)]/60",
                )}
              >
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold",
                    index <= step
                      ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]"
                      : "bg-[var(--color-surface-container-high)] text-[var(--color-outline)]",
                  )}
                >
                  {index < step || confirmed ? <Check className="size-4" aria-hidden="true" /> : String.fromCharCode(65 + index)}
                </span>
                <div>
                  <p className={cn(muted, "text-[10px] font-semibold uppercase tracking-wider")}>
                    {t("recruiter.assessments.importReview.stepLetterLabel", { letter: String.fromCharCode(65 + index) })}
                  </p>
                  <p className="text-sm font-semibold">{label}</p>
                </div>
              </li>
            ))}
          </ol>
        </header>

        <div className="space-y-6 p-4 sm:p-6">
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              {
                label: t("recruiter.assessments.importReview.stats.totalTitle"),
                count: active.length,
                hint: blank.length ? t("recruiter.assessments.importReview.stats.skippedHint", { count: blank.length }) : t("recruiter.assessments.importReview.stats.sourceHint"),
                icon: FileSpreadsheet,
                tone: "text-[var(--color-on-surface)]",
              },
              {
                label: t("recruiter.assessments.importReview.stats.validTitle"),
                count: active.filter((item) => item.status === "VALID").length,
                hint: t("recruiter.assessments.importReview.stats.validHint"),
                icon: CheckCircle2,
                tone: "text-[var(--color-primary)]",
              },
              {
                label: t("recruiter.assessments.importReview.stats.invalidTitle"),
                count: invalid.length,
                hint: t("recruiter.assessments.importReview.stats.invalidHint"),
                icon: AlertTriangle,
                tone: "text-[var(--color-error)]",
              },
              {
                label: t("recruiter.assessments.importReview.stats.warningTitle"),
                count: warningOnly.length,
                hint: t("recruiter.assessments.importReview.stats.warningHint"),
                icon: ShieldAlert,
                tone: "text-amber-700",
              },
            ].map(({ label, count, hint, icon: Icon, tone }) => (
              <div key={label} className="rounded-xl bg-[var(--color-surface-container-low)] p-4">
                <div className={cn(muted, "flex items-center justify-between gap-2 text-xs font-medium")}>
                  <span>{label}</span>
                  <Icon className={cn("size-4 shrink-0", tone)} aria-hidden="true" />
                </div>
                <p className={cn("mt-3 text-3xl font-semibold", tone)}>
                  {count}
                  <span className={cn(muted, "ml-2 text-xs font-normal")}>{t("recruiter.assessments.common.rowsUnit")}</span>
                </p>
                <p className={cn(muted, "mt-2 text-xs")}>{hint}</p>
              </div>
            ))}
          </div>

          {confirmed && (
            <div role="status" className="flex items-start gap-3 rounded-xl bg-[var(--color-primary-subtle)] p-4 text-sm">
              <CheckCircle2 className="size-5 shrink-0 text-[var(--color-primary)]" aria-hidden="true" />
              <div>
                <p className="font-semibold">
                  {t("recruiter.assessments.importReview.confirmedStatusTitle", { count: valid.length, points: totalPoints })}
                </p>
                <p className={cn(muted, "mt-1")}>
                  {generalBank ? t("recruiter.assessments.importReview.confirmedGeneralBankHint") : t("recruiter.assessments.importReview.confirmedAssessmentHint")}
                </p>
              </div>
            </div>
          )}

          <div className={cn(panel, "overflow-hidden")}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border-default)] p-4">
              {step === 1 ? (
                <div className="flex flex-wrap gap-1 rounded-xl bg-[var(--color-surface-container-low)] p-1" aria-label={t("recruiter.assessments.importReview.filterAria")}>
                  {(
                    [
                      { id: "all", label: t("recruiter.assessments.common.all"), count: active.length },
                      { id: "valid", label: "VALID", count: active.filter((item) => item.status === "VALID").length },
                      { id: "invalid", label: "INVALID", count: invalid.length },
                      { id: "warning", label: "WARNING", count: warningOnly.length },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      aria-pressed={filter === tab.id}
                      onClick={() => {
                        setFilter(tab.id);
                        setPage(0);
                      }}
                      className={cn(
                        "min-h-9 rounded-lg px-3 text-xs font-medium focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]",
                        filter === tab.id
                          ? "bg-[var(--color-surface-card)] text-[var(--color-primary)] shadow-sm"
                          : muted,
                      )}
                    >
                      {tab.label} ({tab.count})
                    </button>
                  ))}
                </div>
              ) : (
                <h2 className="font-semibold">{step === 2 ? t("recruiter.assessments.importReview.step2PreviewHeading") : t("recruiter.assessments.importReview.step3StructureHeading")}</h2>
              )}
              <Button variant="secondary" size="sm" disabled={!invalid.length && !warningOnly.length} onClick={downloadErrors}>
                <Download className="size-4" aria-hidden="true" />
                {t("recruiter.assessments.importReview.downloadErrorsBtn")}
              </Button>
            </div>

            <div className="p-4">
              <label className="relative block max-w-md">
                <Search className="absolute left-3 top-3 size-4 text-[var(--color-outline)]" aria-hidden="true" />
                <input
                  aria-label={t("recruiter.assessments.importReview.searchAria")}
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value);
                    setPage(0);
                  }}
                  placeholder={t("recruiter.assessments.importReview.searchPlaceholder")}
                  className="h-10 w-full rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] pl-9 pr-3 text-sm outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                />
              </label>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[960px] text-left text-sm">
                <thead className="bg-[var(--color-surface-container-low)] text-xs text-[var(--color-on-surface-variant)]">
                  <tr>
                    {[
                      t("recruiter.assessments.importReview.tableHeaders.line"),
                      t("recruiter.assessments.importReview.tableHeaders.skill"),
                      t("recruiter.assessments.importReview.tableHeaders.content"),
                      t("recruiter.assessments.importReview.tableHeaders.kind"),
                      t("recruiter.assessments.importReview.tableHeaders.difficulty"),
                      t("recruiter.assessments.importReview.tableHeaders.answer"),
                      t("recruiter.assessments.importReview.tableHeaders.status"),
                    ].map(
                      (label) => (
                        <th key={label} scope="col" className="px-4 py-3 font-semibold">
                          {label}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {shown.map((item) => (
                    <tr
                      key={item.line}
                      className={cn(
                        "border-t border-[var(--color-border-default)]",
                        item.status === "INVALID" && "bg-[var(--color-error-container)]/20",
                        item.status === "WARNING" && "bg-amber-50/60",
                      )}
                    >
                      <td className="px-4 py-4 font-mono text-xs">#{item.line}</td>
                      <td className={cn(muted, "max-w-36 break-words px-4 py-4 text-xs")}>{item.row.skill || t("recruiter.assessments.common.dash")}</td>
                      <td className="min-w-64 max-w-sm px-4 py-4">
                        <p className={cn("whitespace-pre-wrap break-words", !item.row.content.trim() && "italic text-[var(--color-error)]")}>
                          {item.row.content.trim() || t("recruiter.assessments.importReview.emptyCellLabel")}
                        </p>
                        {step > 1 && isChoiceKind(item.row.kind) && (
                          <ul className="mt-3 space-y-1 text-xs">
                            {[item.row.optionA, item.row.optionB, item.row.optionC, item.row.optionD].map((option, i) =>
                              option.trim() ? (
                                <li
                                  key={i}
                                  className={
                                    item.row.answer
                                      .trim()
                                      .toUpperCase()
                                      .split(/[,;/|\s]+/)
                                      .includes(String.fromCharCode(65 + i))
                                      ? "font-semibold text-[var(--color-primary)]"
                                      : muted
                                  }
                                >
                                  {String.fromCharCode(65 + i)}. {option}
                                </li>
                              ) : null,
                            )}
                          </ul>
                        )}
                      </td>
                      <td className={cn(muted, "px-4 py-4 text-xs")}>{typeMeta(item.row.kind, t).label}</td>
                      <td className="px-4 py-4 text-xs">{item.row.difficulty || t("recruiter.assessments.common.dash")}</td>
                      <td className="max-w-56 px-4 py-4 font-mono text-xs">
                        <p className="whitespace-pre-wrap break-words">{answerDisplay(item.row)}</p>
                      </td>
                      <td className="min-w-72 px-4 py-4 text-xs">
                        <StatusDetail item={item} defaultScore={defaultScore} confirmed={confirmed} onEdit={onEdit} />
                      </td>
                    </tr>
                  ))}
                  {!shown.length && (
                    <tr>
                      <td colSpan={7} className={cn(muted, "p-10 text-center")}>
                        {t("recruiter.assessments.importReview.emptyTable")}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--color-border-default)] p-4">
              <p className={cn(muted, "text-xs")}>
                {t("recruiter.assessments.importReview.showingRowsRange", {
                  start: filtered.length ? safePage * 10 + 1 : 0,
                  end: Math.min((safePage + 1) * 10, filtered.length),
                  total: filtered.length,
                })}
              </p>
              <div className="flex items-center gap-3">
                <Button variant="secondary" size="sm" disabled={safePage === 0} onClick={() => setPage(safePage - 1)}>
                  {t("recruiter.assessments.importReview.prevBtn")}
                </Button>
                <span className="text-xs">
                  {safePage + 1} / {pageCount}
                </span>
                <Button
                  variant="secondary"
                  size="sm"
                  disabled={safePage + 1 >= pageCount}
                  onClick={() => setPage(safePage + 1)}
                >
                  {t("recruiter.assessments.importReview.nextBtn")}
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr]">
            <div className="space-y-4">
              <h2 className="flex items-center gap-2 font-semibold">
                <ListChecks className="size-5 text-[var(--color-primary)]" aria-hidden="true" />
                {t("recruiter.assessments.importReview.rulesHeading")}
              </h2>
              <ol className={cn(muted, "list-decimal space-y-1.5 pl-5 text-xs leading-6")}>
                <li>{t("recruiter.assessments.importReview.rulesList.r1")}</li>
                <li>{t("recruiter.assessments.importReview.rulesList.r2")}</li>
                <li>{t("recruiter.assessments.importReview.rulesList.r3")}</li>
                <li>{t("recruiter.assessments.importReview.rulesList.r4")}</li>
                <li>{t("recruiter.assessments.importReview.rulesList.r5")}</li>
                <li>{t("recruiter.assessments.importReview.rulesList.r6")}</li>
              </ol>
              <fieldset disabled={confirmed} className="space-y-3">
                <legend className="sr-only">{t("recruiter.assessments.importReview.policyLegend")}</legend>
                {(
                  [
                    {
                      value: "valid",
                      title: t("recruiter.assessments.importReview.policyValidTitle"),
                      hint: t("recruiter.assessments.importReview.policyValidHint"),
                    },
                    {
                      value: "all",
                      title: t("recruiter.assessments.importReview.policyAllTitle"),
                      hint: t("recruiter.assessments.importReview.policyAllHint"),
                    },
                  ] as const
                ).map((option) => (
                  <label
                    key={option.value}
                    className={cn(
                      "flex cursor-pointer gap-3 rounded-xl border p-4",
                      policy === option.value
                        ? "border-[var(--color-primary)] bg-[var(--color-primary-subtle)]"
                        : "border-[var(--color-border-default)]",
                    )}
                  >
                    <input
                      type="radio"
                      name="import-policy"
                      value={option.value}
                      checked={policy === option.value}
                      onChange={() => {
                        setPolicy(option.value);
                        setAcknowledged(false);
                      }}
                      className="mt-1 accent-[var(--color-primary)]"
                    />
                    <span>
                      <span className="block text-sm font-semibold">{option.title}</span>
                      <span className={cn(muted, "mt-1 block text-xs leading-5")}>{option.hint}</span>
                    </span>
                  </label>
                ))}
                <label className="flex flex-wrap items-center gap-3 text-sm">
                  {t("recruiter.assessments.importReview.defaultScoreLabel")}
                  <input
                    type="number"
                    min={1}
                    max={10000}
                    step={1}
                    value={defaultScore}
                    onChange={(event) => {
                      setDefaultScore(Number(event.target.value));
                      setAcknowledged(false);
                    }}
                    className="h-10 w-24 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] px-3 outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                  />
                </label>
              </fieldset>
              <div className="flex gap-3 rounded-xl bg-[var(--color-surface-container-low)] p-4">
                <ShieldCheck className="size-5 shrink-0 text-[var(--color-primary)]" aria-hidden="true" />
                <p className={cn(muted, "text-xs leading-6")}>
                  {generalBank ? t("recruiter.assessments.importReview.generalBankPolicyNote") : t("recruiter.assessments.importReview.assessmentPolicyNote")}
                </p>
              </div>
            </div>

            <aside className="flex flex-col justify-between rounded-2xl bg-[var(--color-surface-container-low)] p-5">
              <div>
                <div className="mb-5 flex items-center justify-between gap-2">
                  <h2 className="font-semibold">{t("recruiter.assessments.importReview.summaryHeading")}</h2>
                  <span className="rounded-full bg-[var(--color-primary-subtle)] px-2 py-1 text-[10px] font-semibold text-[var(--color-primary)]">
                    {t("recruiter.assessments.importReview.newTestBadge")}
                  </span>
                </div>
                <dl className="space-y-3 text-sm">
                  {[
                    [t("recruiter.assessments.importReview.summaryLabels.job"), jobTitle],
                    [t("recruiter.assessments.importReview.summaryLabels.toSave"), t("recruiter.assessments.importReview.summaryCountQuestions", { count: valid.length })],
                    [t("recruiter.assessments.importReview.summaryLabels.blankSkipped"), t("recruiter.assessments.importReview.summaryCountRows", { count: blank.length })],
                    [t("recruiter.assessments.importReview.summaryLabels.invalid"), t("recruiter.assessments.importReview.summaryCountRows", { count: invalid.length })],
                    [t("recruiter.assessments.importReview.summaryLabels.warning"), t("recruiter.assessments.importReview.summaryCountRows", { count: warningOnly.length })],
                    [t("recruiter.assessments.importReview.summaryLabels.totalPoints"), t("recruiter.assessments.importReview.summaryCountPoints", { points: totalPoints })],
                    [t("recruiter.assessments.importReview.summaryLabels.structure"), t("recruiter.assessments.importReview.summaryStructure", { count: valid.length, max: maxQuestions })],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-5">
                      <dt className={muted}>{label}</dt>
                      <dd className="max-w-[55%] text-right font-semibold">{value}</dd>
                    </div>
                  ))}
                </dl>
              </div>
              <div className="mt-6 space-y-3">
                {!canContinue && (
                  <p role="alert" className="text-xs leading-5 text-[var(--color-error)]">
                    {valid.length === 0
                      ? t("recruiter.assessments.importReview.cannotContinueEmpty")
                      : valid.length > maxQuestions
                        ? t("recruiter.assessments.importReview.cannotContinueMax", { max: maxQuestions })
                        : t("recruiter.assessments.importReview.cannotContinueInvalid")}
                  </p>
                )}
                {step === 3 && !confirmed && (
                  <label className="flex items-start gap-2 text-xs leading-5">
                    <input
                      type="checkbox"
                      checked={acknowledged}
                      onChange={(event) => setAcknowledged(event.target.checked)}
                      className="mt-1 accent-[var(--color-primary)]"
                    />
                    <span>
                      {t("recruiter.assessments.importReview.acknowledgeLabel", { valid: valid.length, excluded })}
                    </span>
                  </label>
                )}
                {!confirmed && (
                  <Button
                    className="w-full"
                    disabled={!canContinue || (step === 3 && !acknowledged)}
                    onClick={() => (step < 3 ? changeStep((step + 1) as 2 | 3) : setConfirmed(true))}
                  >
                    {step === 3 ? (
                      <FileCheck2 className="size-4" aria-hidden="true" />
                    ) : (
                      <ArrowRight className="size-4" aria-hidden="true" />
                    )}
                    {step === 1
                      ? t("recruiter.assessments.importReview.previewCountBtn", { count: valid.length })
                      : step === 2
                        ? t("recruiter.assessments.importReview.continueConfirmBtn")
                        : t("recruiter.assessments.importReview.confirmValidBtn", { count: valid.length })}
                  </Button>
                )}
                {step > 1 && !confirmed && (
                  <Button variant="secondary" className="w-full" onClick={() => changeStep((step - 1) as 1 | 2)}>
                    {t("recruiter.assessments.importReview.backStepBtn")}
                  </Button>
                )}
                <Button variant="ghost" className="w-full" onClick={onBack}>
                  <ArrowLeft className="size-4" aria-hidden="true" />
                  {t("recruiter.assessments.importReview.backToExcelBtn")}
                </Button>
              </div>
            </aside>
          </div>

          {showGuide && (
            <section id="excel-import-guide" className="space-y-4 rounded-xl bg-[var(--color-surface-container-low)] p-5">
              <h2 className="flex items-center gap-2 font-semibold">
                <BookOpen className="size-5 text-[var(--color-primary)]" aria-hidden="true" />
                {t("recruiter.assessments.importReview.guideHeading")}
              </h2>
              <div className="grid gap-4 md:grid-cols-3">
                {[
                  [
                    t("recruiter.assessments.importReview.guideCards.c1Title"),
                    t("recruiter.assessments.importReview.guideCards.c1Body"),
                  ],
                  [
                    t("recruiter.assessments.importReview.guideCards.c2Title"),
                    t("recruiter.assessments.importReview.guideCards.c2Body"),
                  ],
                  [
                    t("recruiter.assessments.importReview.guideCards.c3Title"),
                    t("recruiter.assessments.importReview.guideCards.c3Body"),
                  ],
                ].map(([title, text]) => (
                  <div key={title} className="rounded-xl bg-[var(--color-surface-card)] p-4">
                    <h3 className="text-sm font-semibold">{title}</h3>
                    <p className={cn(muted, "mt-2 text-xs leading-6")}>{text}</p>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </section>
    </>
  );
}
