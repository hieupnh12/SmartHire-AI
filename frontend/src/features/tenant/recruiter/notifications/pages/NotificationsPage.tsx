import { useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Inbox, Settings } from "lucide-react";
import { PillNav } from "@/components/ux/PillNav";
import { useT } from "@/i18n";
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
  const [tabDirection, setTabDirection] = useState<"left" | "right">("right");
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
    <section
      className="space-y-6 text-[var(--color-on-surface)]"
      aria-label={t("recruiter.ops.notifications.eyebrowAll")}
    >
      <div className="flex items-center">
        <PillNav
          items={tabs.map((item) => ({ id: item.key, label: t(item.labelKey), icon: item.icon }))}
          activeId={active}
          ariaLabel={t("recruiter.ops.notifications.tablistAria")}
          onSelect={(key) => setParams(key === "settings" ? { tab: key } : {}, { replace: true })}
          onDirectionChange={setTabDirection}
          variant="cradle"
          dockGroup="notifications"
        />
      </div>
      <div
        key={active}
        role="tabpanel"
        className={tabDirection === "left" ? "animate-nav-panel-left" : "animate-nav-panel-right"}
      >
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
