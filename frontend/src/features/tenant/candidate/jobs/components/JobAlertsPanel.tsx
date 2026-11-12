import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, BellOff, Mail, Plus, Trash2 } from "lucide-react";
import { jobAlertApi, type JobAlertView } from "@/api/tenant/jobAlertApi";
import { Button } from "@/components/ux/Button";
import { useT } from "@/i18n";
import { getApiErrorMessage } from "@/lib/axios";
import { toast } from "@/stores/toastStore";

export const JOB_ALERTS_QUERY_KEY = ["candidate-job-alerts"] as const;

export function JobAlertsPanel({
  defaultKeyword = "",
  defaultDepartment = "",
  defaultLocation = "",
}: {
  defaultKeyword?: string;
  defaultDepartment?: string;
  defaultLocation?: string;
}) {
  const t = useT();
  const queryClient = useQueryClient();
  const [keyword, setKeyword] = useState(defaultKeyword);
  const [department, setDepartment] = useState(defaultDepartment);
  const [location, setLocation] = useState(defaultLocation);
  const [workMode, setWorkMode] = useState("");
  const [webEnabled, setWebEnabled] = useState(true);
  const [emailEnabled, setEmailEnabled] = useState(true);

  const alertsQuery = useQuery({
    queryKey: JOB_ALERTS_QUERY_KEY,
    queryFn: jobAlertApi.list,
  });

  const createAlert = useMutation({
    mutationFn: jobAlertApi.create,
    onSuccess: (created) => {
      queryClient.setQueryData<JobAlertView[]>(JOB_ALERTS_QUERY_KEY, (prev) => [created, ...(prev ?? [])]);
      setKeyword("");
      setDepartment("");
      setLocation("");
      setWorkMode("");
      toast.success(t("candidate.core.career.jobAlerts.createdToast"));
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  const toggleAlert = useMutation({
    mutationFn: ({ alert, active }: { alert: JobAlertView; active: boolean }) =>
      jobAlertApi.update(alert.id, {
        keyword: alert.keyword,
        department: alert.department,
        location: alert.location,
        workMode: alert.workMode,
        employmentType: alert.employmentType,
        webEnabled: alert.webEnabled,
        emailEnabled: alert.emailEnabled,
        active,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData<JobAlertView[]>(JOB_ALERTS_QUERY_KEY, (prev) =>
        (prev ?? []).map((item) => (item.id === updated.id ? updated : item)),
      );
      toast.success(t("candidate.core.career.jobAlerts.updatedToast"));
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  const deleteAlert = useMutation({
    mutationFn: jobAlertApi.remove,
    onSuccess: (_res, id) => {
      queryClient.setQueryData<JobAlertView[]>(JOB_ALERTS_QUERY_KEY, (prev) =>
        (prev ?? []).filter((item) => item.id !== id),
      );
      toast.success(t("candidate.core.career.jobAlerts.deletedToast"));
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!webEnabled && !emailEnabled) {
      toast.warning(t("candidate.core.career.jobAlerts.channelRequired"));
      return;
    }
    createAlert.mutate({
      keyword: keyword.trim() || null,
      department: department.trim() || null,
      location: location.trim() || null,
      workMode: workMode || null,
      webEnabled,
      emailEnabled,
      active: true,
    });
  };

  const alerts = alertsQuery.data ?? [];
  const activeCount = alerts.filter((a) => a.active).length;

  return (
    <section
      className="rounded-2xl border border-[var(--color-border-default)] bg-white p-5 shadow-sm sm:p-6"
      aria-labelledby="job-alerts-heading"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--color-primary-subtle)] text-[var(--color-primary)]">
            <Bell className="size-5" aria-hidden="true" />
          </span>
          <div>
            <h2 id="job-alerts-heading" className="text-base font-semibold text-[var(--color-on-surface)]">
              {t("candidate.core.career.jobAlerts.title")}
            </h2>
            <p className="mt-0.5 text-sm text-[var(--color-on-surface-variant)]">
              {t("candidate.core.career.jobAlerts.subtitle")}
            </p>
          </div>
        </div>
        {alerts.length > 0 && (
          <span className="rounded-full bg-[var(--color-primary-subtle)] px-3 py-1 text-xs font-semibold text-[var(--color-primary)]">
            {t("candidate.core.career.jobAlerts.activeCount", { count: activeCount })}
          </span>
        )}
      </div>

      <form onSubmit={handleSubmit} className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="space-y-1 text-xs font-medium text-[var(--color-on-surface-variant)]">
          <span>{t("candidate.core.career.jobAlerts.keywordLabel")}</span>
          <input
            type="text"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder={t("candidate.core.career.jobAlerts.keywordPlaceholder")}
            className="min-h-10 w-full rounded-lg border border-[var(--color-border-default)] bg-white px-3 text-sm text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary)]"
          />
        </label>
        <label className="space-y-1 text-xs font-medium text-[var(--color-on-surface-variant)]">
          <span>{t("candidate.core.career.jobAlerts.departmentLabel")}</span>
          <input
            type="text"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            placeholder={t("candidate.core.career.jobAlerts.departmentPlaceholder")}
            className="min-h-10 w-full rounded-lg border border-[var(--color-border-default)] bg-white px-3 text-sm text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary)]"
          />
        </label>
        <label className="space-y-1 text-xs font-medium text-[var(--color-on-surface-variant)]">
          <span>{t("candidate.core.career.jobAlerts.locationLabel")}</span>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder={t("candidate.core.career.jobAlerts.locationPlaceholder")}
            className="min-h-10 w-full rounded-lg border border-[var(--color-border-default)] bg-white px-3 text-sm text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary)]"
          />
        </label>
        <label className="space-y-1 text-xs font-medium text-[var(--color-on-surface-variant)]">
          <span>{t("candidate.core.career.jobAlerts.workModeLabel")}</span>
          <select
            value={workMode}
            onChange={(e) => setWorkMode(e.target.value)}
            className="min-h-10 w-full rounded-lg border border-[var(--color-border-default)] bg-white px-3 text-sm text-[var(--color-on-surface)] outline-none focus:border-[var(--color-primary)]"
          >
            <option value="">{t("candidate.core.career.jobAlerts.workModeAll")}</option>
            <option value="ONSITE">{t("candidate.core.career.workModes.ONSITE")}</option>
            <option value="HYBRID">{t("candidate.core.career.workModes.HYBRID")}</option>
            <option value="REMOTE">{t("candidate.core.career.workModes.REMOTE")}</option>
          </select>
        </label>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1 sm:col-span-2 lg:col-span-4">
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <label className="inline-flex cursor-pointer items-center gap-2 text-[var(--color-on-surface)]">
              <input
                type="checkbox"
                checked={webEnabled}
                onChange={(e) => setWebEnabled(e.target.checked)}
                className="size-4 accent-[var(--color-primary)]"
              />
              <Bell className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
              <span>{t("candidate.core.career.jobAlerts.webChannel")}</span>
            </label>
            <label className="inline-flex cursor-pointer items-center gap-2 text-[var(--color-on-surface)]">
              <input
                type="checkbox"
                checked={emailEnabled}
                onChange={(e) => setEmailEnabled(e.target.checked)}
                className="size-4 accent-[var(--color-primary)]"
              />
              <Mail className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
              <span>{t("candidate.core.career.jobAlerts.emailChannel")}</span>
            </label>
          </div>
          <Button type="submit" size="sm" disabled={createAlert.isPending}>
            <Plus className="size-4" aria-hidden="true" />
            {createAlert.isPending
              ? t("candidate.core.career.jobAlerts.saving")
              : t("candidate.core.career.jobAlerts.createSubmit")}
          </Button>
        </div>
      </form>

      {alertsQuery.isError ? (
        <p role="alert" className="mt-4 text-xs text-[var(--color-error)]">
          {getApiErrorMessage(alertsQuery.error)}
        </p>
      ) : alerts.length > 0 ? (
        <div className="mt-5 space-y-2 border-t border-[var(--color-border-default)] pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-[var(--color-on-surface-variant)]">
            {t("candidate.core.career.jobAlerts.manageTitle")}
          </p>
          <ul className="space-y-2">
            {alerts.map((alert) => {
              const summary = [
                alert.keyword,
                alert.department,
                alert.location,
                alert.workMode ? t(`candidate.core.career.workModes.${alert.workMode}`) : null,
              ]
                .filter(Boolean)
                .join(" · ");
              return (
                <li
                  key={alert.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-alt)] px-3.5 py-2.5 text-sm"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-[var(--color-on-surface)]">
                      {summary || t("candidate.core.career.jobAlerts.allNewJobs")}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--color-on-surface-variant)]">
                      <span
                        className={`rounded-full px-2 py-0.5 font-medium ${
                          alert.active
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-200 text-slate-600"
                        }`}
                      >
                        {alert.active
                          ? t("candidate.core.career.jobAlerts.activeBadge")
                          : t("candidate.core.career.jobAlerts.pausedBadge")}
                      </span>
                      {alert.webEnabled && <span>• {t("candidate.core.career.jobAlerts.webChannel")}</span>}
                      {alert.emailEnabled && <span>• {t("candidate.core.career.jobAlerts.emailChannel")}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={toggleAlert.isPending}
                      onClick={() => toggleAlert.mutate({ alert, active: !alert.active })}
                      aria-label={
                        alert.active
                          ? t("candidate.core.career.jobAlerts.pausedBadge")
                          : t("candidate.core.career.jobAlerts.activeBadge")
                      }
                    >
                      {alert.active ? <BellOff className="size-4" aria-hidden="true" /> : <Bell className="size-4" aria-hidden="true" />}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={deleteAlert.isPending}
                      onClick={() => deleteAlert.mutate(alert.id)}
                      aria-label={t("candidate.core.career.jobAlerts.deleteButton")}
                    >
                      <Trash2 className="size-4 text-[var(--color-error)]" aria-hidden="true" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <p className="mt-4 border-t border-[var(--color-border-default)] pt-4 text-xs text-[var(--color-on-surface-variant)]">
          {t("candidate.core.career.jobAlerts.empty")}
        </p>
      )}
    </section>
  );
}

