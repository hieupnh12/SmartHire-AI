import { locales, localeLabels, useI18nStore, type Locale } from "@/i18n";
import { useT } from "@/i18n";

export function LanguageSwitcher() {
  const t = useT();
  const locale = useI18nStore((s) => s.locale);
  const setLocale = useI18nStore((s) => s.setLocale);

  return (
    <label className="inline-flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
      <span className="sr-only">{t("common.language")}</span>
      <select
        className="min-h-11 rounded-[var(--radius-md)] border border-[var(--color-border-default)] bg-surface-card px-3 text-sm text-[var(--color-text-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-border-focus)]"
        value={locale}
        onChange={(e) => setLocale(e.target.value as Locale)}
        aria-label={t("common.language")}
      >
        {locales.map((l) => (
          <option key={l} value={l}>
            {localeLabels[l]}
          </option>
        ))}
      </select>
    </label>
  );
}
