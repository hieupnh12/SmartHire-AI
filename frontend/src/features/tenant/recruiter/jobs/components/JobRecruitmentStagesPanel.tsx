import { useEffect, useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Eye, EyeOff, GripVertical } from "lucide-react";
import { jobApi } from "@/api/tenant/jobApi";
import type { RecruitmentStageCode, StageItemInput, StageView } from "@/api/types/job";
import { Button } from "@/components/ux/Button";
import { useT } from "@/i18n";
import { getApiErrorMessage } from "@/lib/axios";
import { toast } from "@/stores/toastStore";
import { button, muted } from "@/features/tenant/recruiter/matching/components/rankingUi";

const CATALOG: Array<{
  stageCode: RecruitmentStageCode;
  name: string;
  locked: boolean;
  terminal: boolean;
}> = [
  { stageCode: "APPLIED", name: "Applied", locked: true, terminal: false },
  { stageCode: "SCREENING", name: "Screening", locked: false, terminal: false },
  { stageCode: "ASSESSMENT", name: "Assessment", locked: false, terminal: false },
  { stageCode: "INTERVIEW", name: "Interview", locked: false, terminal: false },
  { stageCode: "OFFER", name: "Offer", locked: false, terminal: false },
  { stageCode: "HIRED", name: "Hired", locked: true, terminal: true },
];

const MIDDLE_CODES = new Set<RecruitmentStageCode>(["SCREENING", "ASSESSMENT", "INTERVIEW", "OFFER"]);

type StageRow = {
  stageCode: RecruitmentStageCode;
  name: string;
  active: boolean;
  locked: boolean;
  terminal: boolean;
};

function mergeFromViews(stages: StageView[]): StageRow[] {
  const byCode = new Map(stages.map((stage) => [stage.stageCode, stage]));
  return CATALOG.map((def) => {
    const view = byCode.get(def.stageCode);
    return {
      stageCode: def.stageCode,
      name: view?.name ?? def.name,
      active: view?.active ?? true,
      locked: def.locked,
      terminal: def.terminal,
    };
  });
}

function splitRows(rows: StageRow[]): { applied: StageRow; middle: StageRow[]; hired: StageRow } {
  const applied = rows.find((row) => row.stageCode === "APPLIED");
  const hired = rows.find((row) => row.stageCode === "HIRED");
  const middle = rows.filter((row) => MIDDLE_CODES.has(row.stageCode));
  if (!applied || !hired) {
    throw new Error("Invalid stage catalog");
  }
  return { applied, middle, hired };
}

function toPayload(applied: StageRow, middle: StageRow[], hired: StageRow): StageItemInput[] {
  const ordered = [applied, ...middle, hired];
  return ordered.map((row, index) => ({
    stageCode: row.stageCode,
    sortOrder: index,
    active: row.active,
  }));
}

type Props = {
  jobId: number;
  stages: StageView[];
  editable: boolean;
  onSaved?: () => void;
};

export function JobRecruitmentStagesPanel({ jobId, stages, editable, onSaved }: Props) {
  const t = useT();
  const initialRows = useMemo(() => mergeFromViews(stages), [stages]);
  const [rows, setRows] = useState(initialRows);
  const initialPayload = useMemo(() => {
    const parts = splitRows(initialRows);
    return toPayload(parts.applied, parts.middle, parts.hired);
  }, [initialRows]);
  const draftPayload = useMemo(() => {
    const parts = splitRows(rows);
    return toPayload(parts.applied, parts.middle, parts.hired);
  }, [rows]);
  const dirty = JSON.stringify(draftPayload) !== JSON.stringify(initialPayload);

  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => {
    setRows(mergeFromViews(stages));
  }, [stages]);

  const save = useMutation({
    mutationFn: () => jobApi.updateStages(jobId, { stages: draftPayload }),
    onSuccess: (res) => {
      if (!res.success) throw new Error(res.message);
      toast.success(t("recruiter.ops.jobs.stagesPanel.savedToast"));
      onSaved?.();
    },
    onError: (err) => toast.danger(getApiErrorMessage(err, t("recruiter.ops.jobs.stagesPanel.saveError"))),
  });

  const stageDisplayName = (row: StageRow) => {
    const key = `recruiter.ops.jobs.stagesPanel.stageNames.${row.stageCode}`;
    const label = t(key);
    return label === key ? row.name : label;
  };

  const toggleActive = (code: RecruitmentStageCode) => {
    setRows((current) =>
      current.map((row) => (row.stageCode === code ? { ...row, active: !row.active } : row)),
    );
  };

  const reorderMiddle = (from: number, to: number) => {
    if (from === to) return;
    setRows((current) => {
      const { applied, middle, hired } = splitRows(current);
      const nextMiddle = [...middle];
      const [moved] = nextMiddle.splice(from, 1);
      nextMiddle.splice(to, 0, moved);
      return [applied, ...nextMiddle, hired];
    });
  };

  const ordered = useMemo(() => {
    const { applied, middle, hired } = splitRows(rows);
    return { applied, middle, hired, list: [applied, ...middle, hired] as StageRow[] };
  }, [rows]);

  if (!editable) {
    return (
      <div className="space-y-3">
        <p className={`text-sm ${muted}`}>
          {t("recruiter.ops.jobs.stagesPanel.readOnlyNotice")}
        </p>
        <ol className="flex flex-wrap gap-2 text-sm">
          {ordered.list.map((stage, index) => (
            <li
              key={stage.stageCode}
              className={`rounded-lg border border-[var(--color-border-default)] px-3 py-1 ${!stage.active ? "opacity-50 line-through" : ""}`}
            >
              {index + 1}. {stageDisplayName(stage)}
              {stage.terminal ? t("recruiter.ops.jobs.stagesPanel.terminalSuffix") : ""}
              {!stage.active ? t("recruiter.ops.jobs.stagesPanel.hiddenSuffix") : ""}
            </li>
          ))}
        </ol>
      </div>
    );
  }

  let displayIndex = 0;

  return (
    <div className="space-y-4">
      <p className={`text-sm ${muted}`}>
        {t("recruiter.ops.jobs.stagesPanel.editableHint")}
      </p>
      <ul className="space-y-2">
        {ordered.list.map((row) => {
          const index = displayIndex++;
          const isMiddle = MIDDLE_CODES.has(row.stageCode);
          const middleIndex = isMiddle ? ordered.middle.findIndex((m) => m.stageCode === row.stageCode) : -1;

          return (
            <li
              key={row.stageCode}
              draggable={isMiddle}
              onDragStart={() => isMiddle && setDragIndex(middleIndex)}
              onDragOver={(event) => {
                if (!isMiddle || dragIndex === null) return;
                event.preventDefault();
              }}
              onDrop={(event) => {
                event.preventDefault();
                if (!isMiddle || dragIndex === null || middleIndex < 0) return;
                reorderMiddle(dragIndex, middleIndex);
                setDragIndex(null);
              }}
              onDragEnd={() => setDragIndex(null)}
              className={`flex flex-wrap items-center gap-2 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-card)] p-3 ${
                !row.active ? "opacity-60" : ""
              } ${isMiddle ? "cursor-grab active:cursor-grabbing" : ""}`}
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--color-primary-soft)] text-xs font-bold text-brand-primary">
                {index + 1}
              </span>
              {isMiddle ? (
                <GripVertical className="size-4 shrink-0 text-[var(--color-on-surface-variant)]" aria-hidden />
              ) : (
                <span className="size-4 shrink-0" aria-hidden />
              )}
              <span className="min-h-10 min-w-[12rem] flex-1 rounded-lg border border-transparent px-3 py-2 text-sm font-medium">
                {stageDisplayName(row)}
              </span>
              {row.terminal ? (
                <span className="rounded-full bg-[var(--color-primary-soft)] px-2.5 py-1 text-xs font-semibold text-brand-primary">
                  {t("recruiter.ops.jobs.stagesPanel.badgeTerminal")}
                </span>
              ) : row.active ? (
                <span className="rounded-full bg-[var(--color-surface-alt)] px-2.5 py-1 text-xs text-[var(--color-on-surface-variant)]">
                  {t("recruiter.ops.jobs.stagesPanel.badgeActive")}
                </span>
              ) : (
                <span className="rounded-full bg-[var(--color-surface-alt)] px-2.5 py-1 text-xs text-[var(--color-on-surface-variant)]">
                  {t("recruiter.ops.jobs.stagesPanel.badgeHidden")}
                </span>
              )}
              {isMiddle ? (
                <button
                  type="button"
                  className={button}
                  onClick={() => toggleActive(row.stageCode)}
                  aria-label={row.active ? t("recruiter.ops.jobs.stagesPanel.hideStageAria") : t("recruiter.ops.jobs.stagesPanel.showStageAria")}
                >
                  {row.active ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              ) : (
                <span className="size-9 shrink-0" aria-hidden />
              )}
            </li>
          );
        })}
      </ul>
      <div className="flex flex-wrap items-center gap-3 border-t border-[var(--color-border-default)] pt-4">
        <Button type="button" disabled={!dirty || save.isPending} onClick={() => save.mutate()}>
          {save.isPending ? t("recruiter.ops.common.saving") : t("recruiter.ops.jobs.stagesPanel.saveBtn")}
        </Button>
        {dirty && (
          <button
            type="button"
            className={`text-sm font-semibold text-brand-primary ${button}`}
            onClick={() => setRows(initialRows)}
          >
            {t("recruiter.ops.jobs.stagesPanel.undoBtn")}
          </button>
        )}
      </div>
      {save.isError && (
        <p role="alert" className="text-sm text-status-danger">
          {getApiErrorMessage(save.error)}
        </p>
      )}
    </div>
  );
}
