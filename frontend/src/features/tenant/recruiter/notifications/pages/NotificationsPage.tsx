import { useMemo, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useT } from "@/i18n";
import { NotificationInbox } from "@/features/tenant/candidate/notifications/components/NotificationInbox";
import { NotificationSettings } from "@/features/tenant/candidate/notifications/components/NotificationSettings";
import { recruiterNotificationCategories } from "@/features/tenant/candidate/notifications/constants/notificationCategories";
import {
  NotificationSubNav,
  type NotificationTab,
} from "../components/NotificationSubNav";

export function NotificationsPage() {
  const t = useT();
  const { id } = useParams<{ id?: string }>();
  const jobId = id ? Number(id) : undefined;
  const [params, setParams] = useSearchParams();
  const activeTab: NotificationTab =
    params.get("tab") === "settings" ? "settings" : "inbox";
  const [tabDirection, setTabDirection] = useState<"left" | "right">("right");

  const handleTabChange = (nextTab: NotificationTab) => {
    const nextParams = new URLSearchParams(params);
    if (nextTab === "inbox") {
      nextParams.delete("tab");
    } else {
      nextParams.set("tab", nextTab);
    }
    setParams(nextParams, { replace: true });
  };

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
      className="flex flex-col gap-3.5 text-[var(--color-on-surface)]"
      aria-label={t("recruiter.ops.notifications.eyebrowAll")}
    >
      <NotificationSubNav
        jobId={jobId}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        onDirectionChange={setTabDirection}
      />
      <div
        key={activeTab}
        role="tabpanel"
        className={tabDirection === "left" ? "animate-nav-panel-left" : "animate-nav-panel-right"}
      >
        {activeTab === "settings" ? (
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
