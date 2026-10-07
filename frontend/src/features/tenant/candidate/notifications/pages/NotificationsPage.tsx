import { useSearchParams } from "react-router-dom";
import { Inbox, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationInbox } from "../components/NotificationInbox";
import { NotificationSettings } from "../components/NotificationSettings";

const tabs = [
  { key: "inbox", label: "Hộp thư", icon: Inbox },
  { key: "settings", label: "Cài đặt", icon: Settings },
] as const;

export function NotificationsPage() {
  const [params, setParams] = useSearchParams();
  const active = params.get("tab") === "settings" ? "settings" : "inbox";
  return <section className="space-y-6 text-[var(--color-on-surface)]" aria-labelledby="notifications-title">
    <header className="rounded-3xl border border-[var(--color-border-default)] bg-[linear-gradient(135deg,var(--color-primary-subtle),white_58%)] px-5 py-6 shadow-[var(--shadow-card)] sm:px-7">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)]">Thông báo</p>
      <h1 id="notifications-title" className="mt-2 text-3xl font-semibold tracking-tight">{active === "settings" ? "Cài đặt thông báo" : "Hộp thư thông báo"}</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-on-surface-variant)]">{active === "settings" ? "Chọn loại thông báo bạn muốn nhận và kênh nhận: chỉ trên web hoặc thêm qua Gmail." : "Các cập nhật mới nhất về hồ sơ, bài đánh giá và lịch phỏng vấn của bạn."}</p>
    </header>
    <div role="tablist" aria-label="Thông báo" className="flex gap-2">
      {tabs.map(({ key, label, icon: Icon }) => <button key={key} type="button" role="tab" aria-selected={active === key} onClick={() => setParams(key === "settings" ? { tab: key } : {}, { replace: true })}
        className={cn("inline-flex min-h-10 items-center gap-2 rounded-full px-4 text-sm font-semibold transition-colors", active === key ? "bg-[var(--color-primary)] text-white" : "bg-[var(--color-surface-alt)] text-[var(--color-on-surface-variant)] hover:bg-[var(--color-primary-subtle)]")}>
        <Icon className="size-4" aria-hidden="true" />{label}
      </button>)}
    </div>
    <div role="tabpanel">{active === "settings" ? <NotificationSettings /> : <NotificationInbox />}</div>
  </section>;
}
