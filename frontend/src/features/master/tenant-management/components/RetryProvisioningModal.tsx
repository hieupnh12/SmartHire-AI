import React, { useState, useEffect } from "react";
import { X, RefreshCw, AlertCircle, Building2, Database, Globe } from "lucide-react";
import { masterTenantApi } from "@/api/master/tenantApi";
import type { TenantInfo } from "@/api/master/masterAdminApi";
import { useT } from "@/i18n";
import { toast } from "@/stores/toastStore";

interface RetryProvisioningModalProps {
  tenant: TenantInfo | null;
  onClose: () => void;
  onSuccess: (updated: any) => void;
}

export function RetryProvisioningModal({ tenant, onClose, onSuccess }: RetryProvisioningModalProps) {
  const t = useT();
  const [adminName, setAdminName] = useState("");
  const [adminEmail, setAdminEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tenant) {
      setAdminName(tenant.contactName || "");
      setAdminEmail(tenant.contactEmail || tenant.billingEmail || "");
      setError(null);
    }
  }, [tenant]);

  if (!tenant) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminName.trim()) {
      setError(t("master.commerce.tenantOnboard.validation.adminNameRequired"));
      return;
    }
    if (!adminEmail.trim() || !adminEmail.includes("@")) {
      setError(t("master.commerce.tenantOnboard.validation.adminEmailInvalid"));
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await masterTenantApi.retry(tenant.id, {
        adminName: adminName.trim(),
        adminEmail: adminEmail.trim(),
      });
      toast.success(t("master.commerce.tenantOnboard.submitRetryBtn") + ": " + tenant.name);
      onSuccess(res);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || "Failed to retry provisioning");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl sm:p-7">
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          aria-label={t("common.close")}
          className="absolute right-5 top-5 rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
        >
          <X className="size-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
            <RefreshCw className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-950">{t("master.commerce.tenantOnboard.titleRetry")}</h2>
            <p className="text-xs text-slate-500">{t("master.commerce.tenantOnboard.subtitleRetry")}</p>
          </div>
        </div>

        {/* Tenant Summary */}
        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs text-slate-600 space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-semibold text-slate-800">
              <Building2 className="size-3.5 text-slate-500" />
              {tenant.name}
            </span>
            <span className="font-mono text-slate-500">{tenant.code}</span>
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1.5 text-slate-500">
              <Globe className="size-3 text-slate-400" />
              {tenant.subdomain}.smarthire.top
            </span>
            <span className="flex items-center gap-1.5 font-mono text-slate-500">
              <Database className="size-3 text-slate-400" />
              {tenant.dbName}
            </span>
          </div>
        </div>

        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              {t("master.commerce.tenantOnboard.adminNameLabel")} *
            </label>
            <input
              type="text"
              required
              disabled={loading}
              value={adminName}
              onChange={(e) => setAdminName(e.target.value)}
              placeholder={t("master.commerce.tenantOnboard.adminNamePlaceholder")}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 disabled:bg-slate-50"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-700">
              {t("master.commerce.tenantOnboard.adminEmailLabel")} *
            </label>
            <input
              type="email"
              required
              disabled={loading}
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              placeholder={t("master.commerce.tenantOnboard.adminEmailPlaceholder")}
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 disabled:bg-slate-50"
            />
          </div>

          <p className="text-[11px] text-slate-500 leading-relaxed">
            {t("master.commerce.tenantOnboard.inviteClaimDesc")}
          </p>

          <div className="mt-6 flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              disabled={loading}
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 disabled:opacity-50"
            >
              {t("common.cancel")}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="size-3.5 animate-spin" />
                  <span>{t("master.commerce.tenantOnboard.submittingBtn")}</span>
                </>
              ) : (
                <>
                  <RefreshCw className="size-3.5" />
                  <span>{t("master.commerce.tenantOnboard.submitRetryBtn")}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
