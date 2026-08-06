import { useT } from "@/i18n";
import { Button } from "@/components/ux/Button";
import { cn } from "@/lib/utils";

type Props = {
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
};

export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  className,
}: Props) {
  const t = useT();
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-dashed border-[var(--color-border-default)] bg-surface-card px-6 py-14 text-center",
        className,
      )}
    >
      <p className="font-display text-lg font-semibold text-[var(--color-text-primary)]">
        {title ?? t("common.emptyTitle")}
      </p>
      <p className="mt-2 max-w-sm text-sm text-[var(--color-text-secondary)]">
        {description ?? t("common.emptyHint")}
      </p>
      {onAction && (
        <Button className="mt-5" onClick={onAction}>
          {actionLabel ?? t("common.next")}
        </Button>
      )}
    </div>
  );
}
