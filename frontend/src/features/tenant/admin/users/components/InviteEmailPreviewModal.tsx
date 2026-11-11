import { DetailDialog } from "@/components/ux/DetailDialog";
import { useT } from "@/i18n";
import { Mail, CheckCircle2, ArrowRight } from "lucide-react";

interface InviteEmailPreviewModalProps {
  open: boolean;
  onClose: () => void;
  workspaceName: string;
  senderEmail: string;
  senderName?: string;
  recipientName: string;
  recipientEmail: string;
  roleName: string;
  acceptUrl?: string;
}

export function InviteEmailPreviewModal({
  open,
  onClose,
  workspaceName,
  senderEmail,
  senderName,
  recipientName,
  recipientEmail,
  roleName,
  acceptUrl = "https://smarthire.top/invite/accept?token=sample-uuid-activation-token",
}: InviteEmailPreviewModalProps) {
  const t = useT();
  const displaySender = senderName || t("tenantAdmin.users.invitePreview.defaultSender", { workspace: workspaceName });
  const displaySenderEmail = senderEmail || "tuyendung@company.com";
  const displayRecipient = recipientName || t("tenantAdmin.users.invitePreview.defaultRecipient");
  const displayRecipientEmail = recipientEmail || "nhansu@company.com";
  const displayRole = roleName || t("tenantAdmin.users.invitePreview.defaultRole");

  return (
    <DetailDialog open={open} title={t("tenantAdmin.users.invitePreview.modalTitle")} onClose={onClose} size="wide">
      <div className="space-y-4">
        {/* Gmail Client Bar Simulation */}
        <div className="flex items-center justify-between rounded-xl bg-slate-900 px-4 py-2.5 text-xs text-slate-300">
          <div className="flex items-center gap-2">
            <span className="flex size-3 items-center justify-center rounded-full bg-rose-500/80" />
            <span className="flex size-3 items-center justify-center rounded-full bg-amber-500/80" />
            <span className="flex size-3 items-center justify-center rounded-full bg-emerald-500/80" />
            <div className="ml-2 flex items-center gap-1.5 font-medium text-slate-200">
              <Mail className="size-3.5 text-rose-400" />
              <span>{t("tenantAdmin.users.invitePreview.gmailInboxBar")}</span>
            </div>
          </div>
          <span className="text-[11px] text-slate-400">{t("tenantAdmin.users.invitePreview.previewTag")}</span>
        </div>

        {/* Email Header Info */}
        <div className="rounded-xl border border-[var(--color-border-default)] bg-surface-card p-4 space-y-3">
          <h3 className="text-base font-bold text-[var(--color-text-primary)]">
            {t("tenantAdmin.users.invitePreview.subject", { workspace: workspaceName })}
          </h3>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-t border-[var(--color-border-default)]/60 pt-3 text-xs text-[var(--color-text-secondary)]">
            <div className="flex items-center gap-2.5">
              <div className="grid size-8 place-items-center rounded-full bg-brand-primary/10 font-bold text-brand-primary">
                {workspaceName.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-semibold text-[var(--color-text-primary)]">
                  {displaySender}{" "}
                  <span className="font-normal text-[var(--color-text-secondary)]">&lt;{displaySenderEmail}&gt;</span>
                </p>
                <p>
                  {t("tenantAdmin.users.invitePreview.toLabel")}{" "}
                  <span className="font-medium text-[var(--color-text-primary)]">{displayRecipient}</span> &lt;{displayRecipientEmail}&gt;
                </p>
              </div>
            </div>
            <div className="text-[11px] text-[var(--color-text-secondary)]">
              {t("tenantAdmin.users.invitePreview.timestamp")}
            </div>
          </div>
        </div>

        {/* Email Body - Mimicking HTML member-invitation template */}
        <div className="rounded-xl border border-slate-200 bg-slate-100 p-4 sm:p-6 overflow-x-auto dark:border-slate-800 dark:bg-slate-950">
          <div className="mx-auto max-w-[620px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            {/* Template Header */}
            <div className="border-b border-slate-100 px-6 py-5 text-center dark:border-slate-800">
              <span className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                SmartHire<span className="text-blue-600">.AI</span>
              </span>
            </div>

            {/* Template Content */}
            <div className="p-6 sm:p-8 space-y-5 text-slate-800 dark:text-slate-200">
              <div className="text-center">
                <span className="inline-block rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-blue-700 dark:border-blue-800 dark:bg-blue-950/60 dark:text-blue-300">
                  {t("tenantAdmin.users.invitePreview.badge")}
                </span>
                <h2 className="mt-2 text-xl font-extrabold text-slate-900 dark:text-white">
                  {t("tenantAdmin.users.invitePreview.heading")}
                </h2>
              </div>

              <p className="text-sm">
                {t("tenantAdmin.users.invitePreview.greetingPrefix")}
                <strong>{displayRecipient}</strong>
                {t("tenantAdmin.users.invitePreview.greetingSuffix")}
              </p>

              <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
                {t("tenantAdmin.users.invitePreview.bodyPart1")}
                <strong className="text-slate-900 dark:text-white">{workspaceName}</strong>
                {t("tenantAdmin.users.invitePreview.bodyPart2")}
                <strong>SmartHire-AI</strong>
                {t("tenantAdmin.users.invitePreview.bodyPart3")}
              </p>

              {/* Details Box */}
              <div className="space-y-2">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-white">
                  {t("tenantAdmin.users.invitePreview.detailsHeading")}
                </p>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs dark:border-slate-800 dark:bg-slate-800/60">
                  <table className="w-full">
                    <tbody className="divide-y divide-slate-200/60 dark:divide-slate-700/60">
                      <tr>
                        <td className="py-2 text-slate-500 dark:text-slate-400 w-36">{t("tenantAdmin.users.invitePreview.detailOrg")}</td>
                        <td className="py-2 font-bold text-slate-900 dark:text-white">{workspaceName}</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-slate-500 dark:text-slate-400">{t("tenantAdmin.users.invitePreview.detailName")}</td>
                        <td className="py-2 font-bold text-slate-900 dark:text-white">{displayRecipient}</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-slate-500 dark:text-slate-400">{t("tenantAdmin.users.invitePreview.detailEmail")}</td>
                        <td className="py-2 font-bold text-slate-900 dark:text-white">{displayRecipientEmail}</td>
                      </tr>
                      <tr>
                        <td className="py-2 text-slate-500 dark:text-slate-400">{t("tenantAdmin.users.invitePreview.detailRole")}</td>
                        <td className="py-2">
                          <span className="inline-block rounded-md border border-slate-300 bg-white px-2 py-0.5 text-xs font-bold text-slate-900 dark:border-slate-700 dark:bg-slate-800 dark:text-white">
                            {displayRole}
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td className="py-2 text-slate-500 dark:text-slate-400">{t("tenantAdmin.users.invitePreview.detailExpiry")}</td>
                        <td className="py-2 font-bold text-amber-600 dark:text-amber-400">{t("tenantAdmin.users.invitePreview.detailExpiryValue")}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Big CTA Button */}
              <div className="text-center py-2">
                <a
                  href={acceptUrl}
                  target="_blank"
                  rel="noreferrer"
                  onClick={(e) => e.preventDefault()}
                  className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-600 to-blue-700 px-7 py-3 text-sm font-bold text-white shadow-md shadow-blue-500/20 hover:from-blue-700 hover:to-blue-800"
                >
                  <span>{t("tenantAdmin.users.invitePreview.ctaButton")}</span>
                  <ArrowRight className="size-4" />
                </a>
              </div>

              {/* Guide Box */}
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 text-xs text-blue-900 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-200 space-y-1.5">
                <p className="font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="size-3.5 text-blue-600 dark:text-blue-400" />
                  {t("tenantAdmin.users.invitePreview.guideTitle")}
                </p>
                <ol className="list-decimal pl-5 space-y-1 text-blue-800 dark:text-blue-300">
                  <li>
                    {t("tenantAdmin.users.invitePreview.guideStep1Prefix")}
                    <strong>{t("tenantAdmin.users.invitePreview.guideStep1Strong")}</strong>
                    {t("tenantAdmin.users.invitePreview.guideStep1Suffix")}
                  </li>
                  <li>{t("tenantAdmin.users.invitePreview.guideStep2")}</li>
                  <li>{t("tenantAdmin.users.invitePreview.guideStep3")}</li>
                </ol>
              </div>

              {/* Security Note */}
              <div className="border-l-2 border-slate-300 pl-3 text-xs italic text-slate-500 dark:border-slate-700 dark:text-slate-400">
                {t("tenantAdmin.users.invitePreview.securityNotePart1")}
                <strong>{t("tenantAdmin.users.invitePreview.securityNoteLabel")}</strong>
                {t("tenantAdmin.users.invitePreview.securityNotePart2")}
                <strong>{t("tenantAdmin.users.invitePreview.securityNoteHours")}</strong>
                {t("tenantAdmin.users.invitePreview.securityNotePart3", { workspace: workspaceName })}
              </div>

              {/* Raw link fallback */}
              <div className="rounded border border-dashed border-slate-300 bg-slate-50 p-2.5 text-[11px] text-slate-500 break-all dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400">
                {t("tenantAdmin.users.invitePreview.fallbackHint")}
                <br />
                <span className="text-blue-600 underline dark:text-blue-400">{acceptUrl}</span>
              </div>
            </div>

            {/* Template Footer */}
            <div className="border-t border-slate-100 bg-slate-50 px-6 py-4 text-center text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-800/30 dark:text-slate-400">
              <div>{t("tenantAdmin.users.invitePreview.footerCopyright")}</div>
              <div className="mt-1">
                {t("tenantAdmin.users.invitePreview.footerAutoPart1")}
                <strong>{workspaceName}</strong>
                {t("tenantAdmin.users.invitePreview.footerAutoPart2")}
              </div>
            </div>
          </div>
        </div>
      </div>
    </DetailDialog>
  );
}
