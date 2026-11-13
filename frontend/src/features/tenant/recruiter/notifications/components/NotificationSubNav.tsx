import { Inbox, Settings } from "lucide-react";
import { PillNav } from "@/components/ux/PillNav";
import { useT } from "@/i18n";
import { cn } from "@/lib/utils";

export type NotificationTab = "inbox" | "settings";

type Props = {
  jobId?: number;
  activeTab: NotificationTab;
  className?: string;
  onTabChange?: (tab: NotificationTab) => void;
  onDirectionChange?: (direction: "left" | "right") => void;
};

export function NotificationSubNav({
  jobId,
  activeTab,
  className,
  onTabChange,
  onDirectionChange,
}: Props) {
  const t = useT();
  const basePath = jobId != null ? `/recruiter/jobs/${jobId}/notifications` : "/recruiter/notifications";

  const navItems = [
    {
      id: "inbox" as const,
      label: t("recruiter.ops.notifications.tabInbox"),
      to: basePath,
      icon: Inbox,
    },
    {
      id: "settings" as const,
      label: t("recruiter.ops.notifications.tabSettings"),
      to: `${basePath}?tab=settings`,
      icon: Settings,
    },
  ];

  return (
    <nav className={cn("min-w-0", className)}>
      <PillNav
        items={navItems}
        activeId={activeTab}
        ariaLabel={t("recruiter.ops.notifications.tablistAria")}
        onSelect={onTabChange}
        onDirectionChange={onDirectionChange}
        variant="docked"
        dockGroup="notifications"
      />
    </nav>
  );
}

