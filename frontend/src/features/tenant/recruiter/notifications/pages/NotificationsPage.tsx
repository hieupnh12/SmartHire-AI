import { useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Inbox, Settings } from "lucide-react";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";
import { NotificationInbox } from "@/features/tenant/candidate/notifications/components/NotificationInbox";
import { NotificationSettings } from "@/features/tenant/candidate/notifications/components/NotificationSettings";
import { recruiterNotificationCategories } from "@/features/tenant/candidate/notifications/constants/notificationCategories";

const tabs = [
  { key: "inbox", labelKey: "recruiter.ops.notifications.tabInbox", icon: Inbox },
  { key: "settings", labelKey: "recruiter.ops.notifications.tabSettings", icon: Settings },
] as const;

export function NotificationsPage() {
  const t = useT();
  const { id } = useParams<{ id?: string }>();
  const jobId = id ? Number(id) : undefined;
  const [params, setParams] = useSearchParams();
  const active = params.get("tab") === "settings" ? "settings" : "inbox";
  const localizedCategories = useMemo(
    () =>
      recruiterNotificationCategories.map((category) => ({
        ...category,
        label: t(`recruiter.ops.notifications.categories.${category.key}.label`),
        description: t(`recruiter.ops.notifications.categories.${category.key}.description`),
      })),
    [t],
  );

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]" aria-labelledby="recruiter-notifications-title">
      <header className="rounded-3xl border border-[var(--color-border-default)] bg-[linear-gradient(135deg,var(--color-primary-subtle),white_58%)] px-5 py-6 shadow-[var(--shadow-card)] sm:px-7">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)]">
          {jobId
            ? t("recruiter.ops.notifications.eyebrowJob", { jobId })
            : t("recruiter.ops.notifications.eyebrowAll")}
        </p>
        <h1 id="recruiter-notifications-title" className="mt-2 text-3xl font-semibold tracking-tight">
          {active === "settings"
            ? t("recruiter.ops.notifications.titleSettings")
            : jobId
              ? t("recruiter.ops.notifications.titleJob", { jobId })
              : t("recruiter.ops.notifications.titleAll")}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-on-surface-variant)]">
          {active === "settings"
            ? t("recruiter.ops.notifications.subtitleSettings")
            : jobId
              ? t("recruiter.ops.notifications.subtitleJob", { jobId })
              : t("recruiter.ops.notifications.subtitleAll")}
        </p>
      </header>
      <div role="tablist" aria-label={t("recruiter.ops.notifications.tablistAria")} className="flex gap-2">
        {tabs.map(({ key, labelKey, icon: Icon }) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={active === key}
            onClick={() => setParams(key === "settings" ? { tab: key } : {}, { replace: true })}
            className={cn(
              "inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors",
              active === key
                ? "bg-[var(--color-primary)] text-white"
                : "bg-[var(--color-surface-alt)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-primary-subtle)]",
            )}
          >
            <Icon className="size-4" aria-hidden="true" />
            {t(labelKey)}
          </button>
        ))}
      </div>
      <div role="tabpanel">
        {active === "settings" ? (
          <NotificationSettings
            categories={localizedCategories}
            noteText={t("recruiter.ops.notifications.settingsNote")}
          />
        ) : (
          <NotificationInbox jobId={jobId} />
        )}
      </div>
    </section>
  );
}
