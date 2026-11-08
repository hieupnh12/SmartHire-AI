import { useParams, useSearchParams } from "react-router-dom";
import { Inbox, Settings } from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationInbox } from "@/features/tenant/candidate/notifications/components/NotificationInbox";
import { NotificationSettings } from "@/features/tenant/candidate/notifications/components/NotificationSettings";
import { recruiterNotificationCategories } from "@/features/tenant/candidate/notifications/constants/notificationCategories";

const tabs = [
  { key: "inbox", label: "Hộp thư", icon: Inbox },
  { key: "settings", label: "Cài đặt", icon: Settings },
] as const;

export function NotificationsPage() {
  const { id } = useParams<{ id?: string }>();
  const jobId = id ? Number(id) : undefined;
  const [params, setParams] = useSearchParams();
  const active = params.get("tab") === "settings" ? "settings" : "inbox";
  return (
    <section className="space-y-6 text-[var(--color-on-surface)]" aria-labelledby="recruiter-notifications-title">
      <header className="rounded-3xl border border-[var(--color-border-default)] bg-[linear-gradient(135deg,var(--color-primary-subtle),white_58%)] px-5 py-6 shadow-[var(--shadow-card)] sm:px-7">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)]">
          {jobId ? `Thông báo • Tin tuyển dụng #${jobId}` : "Thông báo tuyển dụng"}
        </p>
        <h1 id="recruiter-notifications-title" className="mt-2 text-3xl font-semibold tracking-tight">
          {active === "settings"
            ? "Cài đặt thông báo nhân viên"
            : jobId
              ? `Thông báo tin tuyển dụng #${jobId}`
              : "Hộp thư thông báo tuyển dụng"}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--color-on-surface-variant)]">
          {active === "settings"
            ? "Tùy chọn nhận thông báo trên Web hoặc gửi qua Gmail cho từng nhóm sự kiện tuyển dụng."
            : jobId
              ? `Chỉ hiển thị các thông báo thuộc tin tuyển dụng #${jobId}: ứng viên nộp hồ sơ, kết quả AI Interview, bài đánh giá và lịch phỏng vấn.`
              : "Tổng hợp thông báo từ tất cả các tin tuyển dụng: ứng viên nộp hồ sơ, kết quả AI Interview, bài đánh giá và lịch phỏng vấn."}
        </p>
      </header>
      <div role="tablist" aria-label="Thông báo" className="flex gap-2">
        {tabs.map(({ key, label, icon: Icon }) => (
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
            {label}
          </button>
        ))}
      </div>
      <div role="tabpanel">
        {active === "settings" ? (
          <NotificationSettings
            categories={recruiterNotificationCategories}
            noteText="Thay đổi được lưu ngay. Tắt cả hai kênh, bạn vẫn có thể theo dõi tiến trình trực tiếp trên danh sách tin tuyển dụng."
          />
        ) : (
          <NotificationInbox jobId={jobId} />
        )}
      </div>
    </section>
  );
}
