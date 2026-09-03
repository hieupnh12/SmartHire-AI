import { Link } from "react-router-dom";
import { useT } from "@/i18n";
import { LanguageSwitcher } from "@/components/ux/LanguageSwitcher";
import { Button } from "@/components/ux/Button";
import { Card } from "@/components/ux/Card";
import { Tooltip } from "@/components/ux/Tooltip";
import { useUiStore } from "@/stores/uiStore";

export function WelcomePage() {
  const t = useT();
  const preview = import.meta.env.VITE_REQUIRE_AUTH !== "true";
  const openShortcuts = useUiStore((s) => s.openShortcuts);

  const roles = [
    {
      title: t("welcome.forCandidate"),
      path: "/candidate",
      body: t("welcome.candidateBlurb"),
    },
    {
      title: t("welcome.forRecruiter"),
      path: "/recruiter",
      body: t("welcome.recruiterBlurb"),
    },
    {
      title: t("welcome.forAdmin"),
      path: "/admin",
      body: t("welcome.adminBlurb"),
    },
  ];

  return (
    <div className="min-h-screen bg-surface-page">
      <header className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-5 sm:px-6">
        <span className="font-display text-xl font-bold text-brand-primary sm:text-2xl">
          {t("brand.name")}
        </span>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <LanguageSwitcher />
          <Tooltip content={t("common.shortcuts")}>
            <Button variant="ghost" size="sm" onClick={openShortcuts} aria-label={t("common.shortcuts")}>
              ?
            </Button>
          </Tooltip>
          <Link
            to="/login"
            className="inline-flex min-h-11 items-center px-3 text-sm hover:text-brand-primary"
          >
            {t("common.login")}
          </Link>
          <Link to="/register">
            <Button size="md">{t("common.register")}</Button>
          </Link>
        </div>
      </header>

      <main id="main-content" className="mx-auto max-w-5xl px-4 pb-20 pt-10 sm:px-6 sm:pt-16">
        <p className="text-sm font-medium text-brand-secondary">{t("brand.tagline")}</p>
        <h1 className="font-display mt-3 max-w-2xl text-3xl font-bold tracking-tight text-[var(--color-text-primary)] sm:text-4xl md:text-5xl">
          {t("welcome.title")}
        </h1>
        <p className="mt-4 max-w-xl text-base text-[var(--color-text-secondary)] sm:text-lg">
          {t("welcome.subtitle")}
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link to="/register">
            <Button size="lg">{t("welcome.createAccount")}</Button>
          </Link>
          <Link to="/login">
            <Button size="lg" variant="secondary">
              {t("welcome.signIn")}
            </Button>
          </Link>
        </div>

        <section className="mt-16 grid gap-4 sm:mt-20 sm:grid-cols-2 md:grid-cols-3 md:gap-6">
          {roles.map((r) => (
            <Card key={r.path} className="flex flex-col">
              <h2 className="font-display text-lg font-semibold sm:text-xl">{r.title}</h2>
              <p className="mt-2 flex-1 text-sm text-[var(--color-text-secondary)]">{r.body}</p>
              {preview && (
                <Link
                  to={r.path}
                  className="mt-4 inline-flex min-h-11 items-center text-sm font-medium text-brand-secondary hover:underline"
                >
                  {t("welcome.preview")} →
                </Link>
              )}
            </Card>
          ))}
        </section>
      </main>
    </div>
  );
}
