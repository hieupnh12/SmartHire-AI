import { useT } from "@/i18n";
import { EmptyState } from "@/components/ux/EmptyState";
import { Card } from "@/components/ux/Card";
import { PageSkeleton } from "@/components/ux/Skeleton";
import { useState } from "react";
import { Button } from "@/components/ux/Button";

export function HomePage() {
  const t = useT();
  const [loadingDemo, setLoadingDemo] = useState(false);

  return (
    <section className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">{t("nav.home")}</h1>
        <p className="mt-2 max-w-2xl text-[var(--color-text-secondary)]">
          {t("welcome.candidateBlurb")}
        </p>
      </div>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-lg font-semibold">{t("nav.applications")}</h2>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setLoadingDemo(true);
              window.setTimeout(() => setLoadingDemo(false), 900);
            }}
          >
            {t("common.loading")}
          </Button>
        </div>
        <div className="mt-4">
          {loadingDemo ? (
            <PageSkeleton />
          ) : (
            <EmptyState
              title={t("common.emptyTitle")}
              description={t("common.emptyHint")}
              actionLabel={t("nav.jobs")}
              onAction={() => {
                window.location.href = "/candidate/jobs";
              }}
            />
          )}
        </div>
      </Card>
    </section>
  );
}
