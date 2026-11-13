import { Link, useSearchParams } from "react-router-dom";
import { ArrowRight, Check, Code2, FileSearch, FolderGit2, LayoutTemplate, Lock, Mail, RotateCcw, Sparkles } from "lucide-react";
import { Breadcrumb } from "@/components/ux/Breadcrumb";
import { useT, type TranslateFn } from "@/i18n";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import {
  cvRoleKeys, cvRoles, cvStyleKeys, cvStyles, cvTemplates, isCvRole, isCvStyle,
  type CvLayout, type CvRoleKey, type CvStyleKey,
} from "@/features/tenant/candidate/shared/constants/cvTemplates";

const tint = (percent: number) => `color-mix(in srgb, var(--color-primary) ${percent}%, white)`;

export function getCvStyleLabel(t: TranslateFn, key: CvStyleKey): string {
  const path = `candidate.cv.templates.styles.${key}.label`;
  const value = t(path);
  return value === path ? cvStyles[key].label : value;
}

export function getCvStyleDescription(t: TranslateFn, key: CvStyleKey): string {
  const path = `candidate.cv.templates.styles.${key}.description`;
  const value = t(path);
  return value === path ? cvStyles[key].description : value;
}

export function getCvRoleLabel(t: TranslateFn, key: CvRoleKey): string {
  const path = `candidate.cv.templates.roles.${key}.label`;
  const value = t(path);
  return value === path ? cvRoles[key].label : value;
}

export function getCvRoleFilterLabel(t: TranslateFn, key: CvRoleKey): string {
  const path = `candidate.cv.templates.roles.${key}.filterLabel`;
  const value = t(path);
  return value === path ? cvRoles[key].filterLabel : value;
}

export function CvTemplatesPage() {
  const t = useT();
  const loggedIn = Boolean(useAuthStore((s) => s.accessToken));
  const [params, setParams] = useSearchParams();
  const styleParam = params.get("style");
  const roleParam = params.get("position");
  const style = isCvStyle(styleParam) ? styleParam : null;
  const role = isCvRole(roleParam) ? roleParam : null;
  const visible = cvTemplates.filter((item) => (!style || item.style === style) && (!role || item.roles.includes(role)));

  const setFilter = (key: "style" | "position", value: string | null) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  };

  const heading = [
    t("candidate.cv.templates.headingBase"),
    style && getCvStyleLabel(t, style),
    role && getCvRoleFilterLabel(t, role),
  ].filter(Boolean).join(" · ");

  const description = role
    ? `${t("candidate.cv.templates.roleDescription", { role: getCvRoleLabel(t, role) })}${style ? ` ${getCvStyleDescription(t, style)}` : ""}`
    : style
      ? getCvStyleDescription(t, style)
      : t("candidate.cv.templates.defaultDescription");

  const [countBefore, countAfter] = t("candidate.cv.templates.matchCount", { count: "__COUNT__" }).split("__COUNT__");

  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-slate-200 px-6 py-8 sm:px-10 sm:py-10" style={{ background: `linear-gradient(135deg, ${tint(10)} 0%, #ffffff 70%)` }}>
        <Breadcrumb size="md" items={[{ label: t("candidate.cv.templates.breadcrumbHome"), to: "/" }, { label: t("candidate.cv.templates.breadcrumbCurrent") }]} />
        <div className="mt-4 flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-2xl">
            <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[var(--color-primary)] shadow-sm"><LayoutTemplate className="size-4" aria-hidden="true" />{t("candidate.cv.templates.badge")}</span>
            <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{heading}</h1>
            <p className="mt-3 text-base leading-7 text-slate-600">{description}</p>
          </div>
          <Link to="/cv" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--color-primary-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]">{t("candidate.cv.templates.manageMyCv")}<ArrowRight className="size-4" aria-hidden="true" /></Link>
        </div>
      </section>

      <section aria-label={t("candidate.cv.templates.filtersAria")} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
        <FilterRow label={t("candidate.cv.templates.styleLabel")} allLabel={t("candidate.cv.templates.allOption")} options={cvStyleKeys.map((key) => ({ key, label: getCvStyleLabel(t, key) }))} value={style} onChange={(value) => setFilter("style", value)} />
        <FilterRow label={t("candidate.cv.templates.roleLabel")} allLabel={t("candidate.cv.templates.allOption")} options={cvRoleKeys.map((key) => ({ key, label: getCvRoleFilterLabel(t, key) }))} value={role} onChange={(value) => setFilter("position", value)} />
      </section>

      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-600" role="status">{countBefore}<span className="font-semibold text-slate-900">{visible.length}</span>{countAfter}</p>
        {(style || role) && <button type="button" onClick={() => setParams(new URLSearchParams(), { replace: true })} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-semibold text-[var(--color-primary)] hover:bg-[color-mix(in_srgb,var(--color-primary)_8%,white)]"><RotateCcw className="size-4" aria-hidden="true" />{t("candidate.cv.templates.clearFilters")}</button>}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <FileSearch className="mx-auto size-10 text-slate-300" aria-hidden="true" />
          <p className="mt-3 font-semibold text-slate-800">{t("candidate.cv.templates.emptyTitle")}</p>
          <p className="mt-1 text-sm text-slate-500">{t("candidate.cv.templates.emptyHint")}</p>
        </div>
      ) : (
        <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {visible.map((item) => (
            <li key={item.id}>
              <article className="group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white transition-all duration-200 hover:-translate-y-1 hover:border-[var(--color-primary)] hover:shadow-[0_16px_36px_rgba(15,23,42,0.12)]">
                <div className="relative p-4" style={{ backgroundColor: tint(6) }}>
                  <CvPreview layout={item.layout} role={role ?? item.roles[0] ?? "backend"} />
                  <div className="absolute inset-0 flex items-center justify-center bg-slate-900/40 opacity-0 transition-opacity duration-200 group-focus-within:opacity-100 group-hover:opacity-100">
                    <Link to={`/cv/builder?template=${item.id}`} aria-label={loggedIn ? t("candidate.cv.templates.useTemplateAria", { name: item.name }) : t("candidate.cv.templates.loginToUseAria", { name: item.name })} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 text-sm font-semibold text-white shadow-lg hover:bg-[var(--color-primary-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">{loggedIn ? t("candidate.cv.templates.useTemplate") : <><Lock className="size-4" aria-hidden="true" />{t("candidate.cv.templates.loginToUse")}</>}</Link>
                  </div>
                </div>
                <div className="flex flex-1 flex-col gap-2 border-t border-slate-100 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-lg font-semibold text-slate-900">{item.name}</h2>
                    <span className="rounded-full px-2.5 py-0.5 text-xs font-semibold text-[var(--color-primary)]" style={{ backgroundColor: tint(12) }}>{getCvStyleLabel(t, item.style)}</span>
                  </div>
                  {item.roles.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {item.roles.map((key) => <span key={key} className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${key === role ? "bg-slate-800 text-white" : "bg-slate-100 text-slate-600"}`}>{getCvRoleFilterLabel(t, key)}</span>)}
                    </div>
                  )}
                </div>
              </article>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function FilterRow({ label, allLabel, options, value, onChange }: { label: string; allLabel: string; options: Array<{ key: string; label: string }>; value: string | null; onChange: (value: string | null) => void }) {
  const chip = (key: string | null, text: string) => {
    const active = value === key;
    return (
      <button key={key ?? "all"} type="button" aria-pressed={active} onClick={() => onChange(key)} className={`inline-flex min-h-9 items-center gap-1.5 rounded-full border px-4 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[var(--color-primary)] ${active ? "border-[var(--color-primary)] bg-[var(--color-primary)] text-white" : "border-slate-200 bg-white text-slate-700 hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"}`}>
        {active && <Check className="size-4" aria-hidden="true" />}{text}
      </button>
    );
  };
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <span className="w-28 shrink-0 text-sm font-semibold text-slate-800">{label}</span>
      <div className="flex flex-wrap gap-2">{chip(null, allLabel)}{options.map((option) => chip(option.key, option.label))}</div>
    </div>
  );
}

function Lines({ count, color = "bg-slate-200" }: { count: number; color?: string }) {
  return <div className="space-y-1">{Array.from({ length: count }, (_, index) => <div key={index} className={`h-1 rounded-full ${color}`} style={{ width: `${100 - ((index * 17) % 35)}%` }} />)}</div>;
}

function Section({ title, lines, color = "var(--color-primary)", serif = false }: { title: string; lines: number; color?: string; serif?: boolean }) {
  return (
    <div className="space-y-1.5">
      <p className={`text-[7px] font-bold uppercase tracking-wider ${serif ? "font-serif" : ""}`} style={{ color }}>{title}</p>
      <Lines count={lines} />
    </div>
  );
}

export function CvPreview({ layout, role }: { layout: CvLayout; role: CvRoleKey }) {
  const t = useT();
  const { name, title } = cvRoles[role];
  const frame = "mx-auto aspect-[210/297] w-full max-w-[240px] overflow-hidden rounded-md bg-white shadow-[0_6px_20px_rgba(15,23,42,0.12)]";

  switch (layout) {
    case "split":
      return (
        <div className={`${frame} space-y-3 p-4`} aria-hidden="true">
          <div><p className="text-[11px] font-bold text-slate-900">{name}</p><p className="text-[7px] font-medium text-[var(--color-primary)]">{title}</p></div>
          <div className="grid grid-cols-[1fr_36%] gap-3 border-t border-slate-200 pt-2">
            <div className="space-y-3"><Section title={t("candidate.cv.templates.preview.experience")} lines={5} color="#334155" /><Section title={t("candidate.cv.templates.preview.projects")} lines={3} color="#334155" /></div>
            <div className="space-y-3"><Section title={t("candidate.cv.templates.preview.skills")} lines={4} color="#334155" /><Section title={t("candidate.cv.templates.preview.education")} lines={2} color="#334155" /></div>
          </div>
        </div>
      );
    case "sidebar":
      return (
        <div className={`${frame} grid grid-cols-[38%_1fr]`} aria-hidden="true">
          <div className="space-y-3 bg-[var(--color-primary)] p-3 text-white">
            <div className="mx-auto size-10 rounded-full border-2 border-white/70 bg-white/25" />
            <div className="space-y-1"><p className="text-[7px] font-bold uppercase">{t("candidate.cv.templates.preview.contact")}</p><Lines count={3} color="bg-white/40" /></div>
            <div className="space-y-1"><p className="text-[7px] font-bold uppercase">{t("candidate.cv.templates.preview.skills")}</p><Lines count={4} color="bg-white/40" /></div>
          </div>
          <div className="space-y-3 p-3">
            <div><p className="text-[10px] font-bold leading-tight text-slate-900">{name}</p><p className="text-[7px] font-semibold text-[var(--color-primary)]">{title}</p></div>
            <Section title={t("candidate.cv.templates.preview.portfolio")} lines={2} /><Section title={t("candidate.cv.templates.preview.experience")} lines={4} /><Section title={t("candidate.cv.templates.preview.projects")} lines={2} />
          </div>
        </div>
      );
    case "cards":
      return (
        <div className={`${frame} space-y-2 p-3`} aria-hidden="true">
          <div className="flex items-center gap-2 rounded-md p-2" style={{ backgroundColor: tint(14) }}>
            <div className="size-8 shrink-0 rounded-full bg-[var(--color-primary)]" />
            <div><p className="text-[10px] font-bold leading-tight text-slate-900">{name}</p><p className="text-[7px] font-semibold text-[var(--color-primary)]">{title}</p></div>
          </div>
          {[{ icon: FolderGit2, label: t("candidate.cv.templates.preview.cardsProjects"), lines: 3 }, { icon: Code2, label: t("candidate.cv.templates.preview.cardsTechStack"), lines: 2 }, { icon: Sparkles, label: t("candidate.cv.templates.preview.cardsAchievements"), lines: 2 }].map(({ icon: Icon, label, lines }) => (
            <div key={label} className="space-y-1 rounded-md border border-slate-100 p-2">
              <p className="flex items-center gap-1 text-[7px] font-bold uppercase text-[var(--color-primary)]"><Icon className="size-2.5" />{label}</p>
              <Lines count={lines} />
            </div>
          ))}
        </div>
      );
    case "banner":
      return (
        <div className={frame} aria-hidden="true">
          <div className="border-b-4 border-[var(--color-primary)] bg-slate-800 px-3 py-3 text-white">
            <p className="text-[10px] font-bold leading-tight">{name}</p><p className="text-[7px] text-slate-300">{title}</p>
          </div>
          <div className="grid grid-cols-[1fr_34%] gap-3 p-3">
            <div className="space-y-3"><Section title={t("candidate.cv.templates.preview.managementExperience")} lines={5} color="#1e293b" /><Section title={t("candidate.cv.templates.preview.process")} lines={3} color="#1e293b" /></div>
            <div className="space-y-3 border-l border-slate-100 pl-2"><Section title={t("candidate.cv.templates.preview.certifications")} lines={3} color="#1e293b" /><Section title={t("candidate.cv.templates.preview.education")} lines={2} color="#1e293b" /></div>
          </div>
        </div>
      );
    case "corporate":
      return (
        <div className={`${frame} space-y-2.5 p-4`} aria-hidden="true">
          <div className="border-b-2 border-slate-800 pb-2 text-center"><p className="font-serif text-[11px] font-bold text-slate-900">{name}</p><p className="flex items-center justify-center gap-1 font-serif text-[7px] text-slate-500">{title}<Mail className="size-2" />email@example.com</p></div>
          {[t("candidate.cv.templates.preview.summaryShort"), t("candidate.cv.templates.preview.experience"), t("candidate.cv.templates.preview.projects"), t("candidate.cv.templates.preview.skills")].map((section, index) => <Section key={section} title={section} lines={index === 1 ? 4 : 2} color="#1e293b" serif />)}
        </div>
      );
    case "table":
      return (
        <div className={`${frame} space-y-2 p-4`} style={{ fontFamily: "Tahoma, Verdana, sans-serif" }} aria-hidden="true">
          <div className="flex items-center justify-between">
            <img src="/cv-assets/fpt-software-logo.jpg" alt="" className="h-6 object-contain" />
            <p className="text-[8px] font-bold uppercase text-slate-900">{name}</p>
          </div>
          <div className="flex gap-2">
            <div className="flex-1 space-y-1">
              <p className="text-[6px] font-bold uppercase text-slate-900">Personal details</p>
              {[60, 45, 55, 40].map((width) => <div key={width} className="flex gap-1 pl-1"><div className="h-1 w-1/3 rounded-full bg-slate-300" /><div className="h-1 rounded-full bg-slate-200" style={{ width: `${width}%` }} /></div>)}
            </div>
            <div className="h-10 w-8 border border-slate-700" />
          </div>
          <p className="text-[6px] font-bold uppercase text-slate-900">Software</p>
          <Lines count={2} />
          <p className="bg-[#cccccc] text-center text-[6px] font-bold italic uppercase text-slate-900">Project and practice</p>
          {[0, 1].map((index) => (
            <div key={index} className="space-y-1">
              <div className="grid grid-cols-[28%_1fr_28%] border border-slate-500">
                {[0, 1, 2, 3, 4, 5].map((cell) => <div key={cell} className="border-b border-r border-slate-500 p-0.5 last:border-r-0"><div className={`h-0.5 rounded-full ${cell % 3 === 1 ? "mx-auto w-3/4 bg-slate-500" : "w-2/3 bg-slate-400"}`} /></div>)}
              </div>
              <Lines count={2} />
            </div>
          ))}
        </div>
      );
    default:
      return (
        <div className={`${frame} space-y-3 p-4`} aria-hidden="true">
          <div className="border-b-2 border-[var(--color-primary)] pb-2"><p className="text-[11px] font-bold text-slate-900">{name}</p><p className="text-[7px] font-medium text-slate-500">{title}</p></div>
          <Section title={t("candidate.cv.templates.preview.summaryIntro")} lines={2} /><Section title={t("candidate.cv.templates.preview.experience")} lines={5} /><Section title={t("candidate.cv.templates.preview.skills")} lines={3} />
        </div>
      );
  }
}
