import { useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle, ArrowRight, BookOpenCheck, Check, Clock3, ExternalLink,
  FileStack, LayoutTemplate, ListChecks, Lock, Sigma, X,
} from "lucide-react";
import { Breadcrumb } from "@/components/ux/Breadcrumb";
import { useT } from "@/i18n";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import {
  getActionVerbGroups, getCommonMistakes, getCvSections, getFormatRules,
  getGuideSections, getGuideSources, getProjectAnatomy, getRecruiterFocus,
  getSendChecklist, getStructureVariants, getXyzExamples, guideSourceIds,
} from "@/features/tenant/candidate/cv/constants/cvGuide";

const tint = (percent: number) => `color-mix(in srgb, var(--color-primary) ${percent}%, white)`;
const sourceIndex = (id: string) => guideSourceIds.indexOf(id as (typeof guideSourceIds)[number]) + 1;

function renderStrongTemplate(template: string, strongText: string, cite?: ReactNode) {
  return template.split(/(\{strong\}|\{cite\})/).map((part, index) => {
    if (part === "{strong}") return <strong key={index}>{strongText}</strong>;
    if (part === "{cite}") return <span key={index}>{cite}</span>;
    return part;
  });
}

function renderXyzTemplate(template: string) {
  return template.split(/(\{x\}|\{y\}|\{z\})/).map((part, index) => {
    if (part === "{x}") return <Mark key={index}>[X]</Mark>;
    if (part === "{y}") return <Mark key={index}>[Y]</Mark>;
    if (part === "{z}") return <Mark key={index}>[Z]</Mark>;
    return part;
  });
}

export function CvGuidePage() {
  const t = useT();
  const loggedIn = Boolean(useAuthStore((s) => s.accessToken));
  const guideSources = getGuideSources(t);
  const guideSections = getGuideSections(t);
  const recruiterFocus = getRecruiterFocus(t);
  const cvSections = getCvSections(t);
  const structureVariants = getStructureVariants(t);
  const xyzExamples = getXyzExamples(t);
  const projectAnatomy = getProjectAnatomy(t);
  const actionVerbGroups = getActionVerbGroups(t);
  const formatRules = getFormatRules(t);
  const commonMistakes = getCommonMistakes(t);

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-3xl border border-slate-200 px-6 py-8 sm:px-10 sm:py-10" style={{ background: `linear-gradient(135deg, ${tint(10)} 0%, #ffffff 70%)` }}>
        <Breadcrumb size="md" items={[{ label: t("candidate.cv.guide.breadcrumbHome"), to: "/" }, { label: t("candidate.cv.guide.breadcrumbCurrent") }]} />
        <div className="mt-4 max-w-3xl">
          <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[var(--color-primary)] shadow-sm"><BookOpenCheck className="size-4" aria-hidden="true" />{t("candidate.cv.guide.badge")}</span>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">{t("candidate.cv.guide.title")}</h1>
          <p className="mt-3 text-base leading-7 text-slate-600">{t("candidate.cv.guide.subtitle")}</p>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/cv-templates" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--color-primary)] px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[var(--color-primary-hover)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]"><LayoutTemplate className="size-4" aria-hidden="true" />{t("candidate.cv.guide.chooseTemplate")}</Link>
          <Link to="/cv/builder" className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-5 text-sm font-semibold text-slate-700 transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]">{!loggedIn && <Lock className="size-4" aria-hidden="true" />}{loggedIn ? t("candidate.cv.guide.createNow") : t("candidate.cv.guide.loginToCreate")}<ArrowRight className="size-4" aria-hidden="true" /></Link>
        </div>
        <dl className="mt-8 grid gap-3 sm:grid-cols-3">
          <Stat icon={Clock3} value={t("candidate.cv.guide.stat1Value")} label={t("candidate.cv.guide.stat1Label")} source={sourceIndex("ladders")} />
          <Stat icon={FileStack} value={t("candidate.cv.guide.stat2Value")} label={t("candidate.cv.guide.stat2Label")} source={sourceIndex("itviec-checklist")} />
          <Stat icon={Sigma} value={t("candidate.cv.guide.stat3Value")} label={t("candidate.cv.guide.stat3Label")} source={sourceIndex("bock")} />
        </dl>
      </section>

      <div className="grid gap-8 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <nav aria-label={t("candidate.cv.guide.tocAria")} className="sticky top-24 rounded-2xl border border-slate-200 bg-white p-4">
            <p className="px-2 text-xs font-semibold uppercase tracking-wider text-slate-500">{t("candidate.cv.guide.tocTitle")}</p>
            <ol className="mt-2 space-y-0.5">
              {guideSections.map((section, index) => (
                <li key={section.id}><a href={`#${section.id}`} className="flex min-h-9 items-center gap-2 rounded-lg px-2 text-sm text-slate-600 transition-colors hover:bg-[var(--color-primary-subtle)] hover:text-[var(--color-primary)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]"><span className="w-5 text-xs font-semibold text-slate-400">{index + 1}</span>{section.label}</a></li>
              ))}
            </ol>
          </nav>
        </aside>

        <article className="min-w-0 space-y-6">
          <GuideSection id="doc-cv" index={1} title={t("candidate.cv.guide.sections.recruiterReads")}>
            <p>{renderStrongTemplate(t("candidate.cv.guide.recruiterIntro"), t("candidate.cv.guide.recruiterStrong"), <Cite id="ladders" />)}</p>
            <ul className="mt-4 grid gap-2 sm:grid-cols-2">
              {recruiterFocus.map((item) => <li key={item} className="flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-sm"><Check className="mt-0.5 size-4 shrink-0 text-[var(--color-primary)]" aria-hidden="true" />{item}</li>)}
            </ul>
            <Callout>{t("candidate.cv.guide.recruiterCallout")}</Callout>
          </GuideSection>

          <GuideSection id="cau-truc" index={2} title={t("candidate.cv.guide.sections.structure")}>
            <p>{t("candidate.cv.guide.structureIntro")}<Cite id="itviec-structure" />:</p>
            <ol className="mt-4 space-y-2">
              {cvSections.map((section, index) => (
                <li key={section.title} className="flex gap-3 rounded-xl border border-slate-200 p-3">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full text-xs font-bold text-[var(--color-primary)]" style={{ backgroundColor: tint(12) }}>{index + 1}</span>
                  <div><p className="font-semibold text-slate-900">{section.title}</p><p className="text-sm text-slate-600">{section.detail}</p></div>
                </li>
              ))}
            </ol>
            <p className="mt-5">{renderStrongTemplate(t("candidate.cv.guide.structureOrderHint"), t("candidate.cv.guide.structureOrderStrong"))}</p>
            <div className="mt-3 grid gap-3 md:grid-cols-3">
              {structureVariants.map((variant) => (
                <div key={variant.profile} className="rounded-xl border border-slate-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{variant.profile}</p>
                  <p className="mt-1 font-semibold text-[var(--color-primary)]">{variant.lead}</p>
                  <p className="mt-2 text-sm text-slate-600">{variant.detail}</p>
                </div>
              ))}
            </div>
          </GuideSection>

          <GuideSection id="cong-thuc-xyz" index={3} title={t("candidate.cv.guide.sections.xyzFormula")}>
            <p>{t("candidate.cv.guide.xyzIntro")}<Cite id="bock" />:</p>
            <blockquote className="mt-4 rounded-2xl border-l-4 border-[var(--color-primary)] p-5" style={{ backgroundColor: tint(6) }}>
              <p className="text-lg font-semibold text-slate-900">{renderXyzTemplate(t("candidate.cv.guide.xyzFormulaTemplate"))}</p>
              <p className="mt-2 text-sm text-slate-600">{t("candidate.cv.guide.xyzFormulaSub")}</p>
            </blockquote>
            <div className="mt-5 space-y-3">
              {xyzExamples.map((example) => (
                <div key={example.before} className="grid overflow-hidden rounded-xl border border-slate-200 md:grid-cols-2">
                  <p className="flex items-start gap-2 bg-slate-50 p-4 text-sm text-slate-500"><X className="mt-0.5 size-4 shrink-0 text-[var(--color-error)]" aria-label={t("candidate.cv.guide.badExampleAria")} />{example.before}</p>
                  <p className="flex items-start gap-2 border-t border-slate-200 p-4 text-sm text-slate-800 md:border-l md:border-t-0"><Check className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-label={t("candidate.cv.guide.goodExampleAria")} />{example.after}</p>
                </div>
              ))}
            </div>
            <Callout>{t("candidate.cv.guide.xyzCallout")}</Callout>
          </GuideSection>

          <GuideSection id="du-an" index={4} title={t("candidate.cv.guide.sections.projects")}>
            <p>{t("candidate.cv.guide.projectsIntro")}<Cite id="itviec-project" />:</p>
            <dl className="mt-4 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200">
              {projectAnatomy.map((row) => (
                <div key={row.label} className="grid gap-1 p-4 sm:grid-cols-[220px_1fr] sm:gap-4">
                  <dt className="text-sm font-semibold text-slate-900">{row.label}</dt>
                  <dd className="text-sm text-slate-600">{row.example}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-4 text-sm text-slate-600">{renderStrongTemplate(t("candidate.cv.guide.projectsNote"), t("candidate.cv.guide.projectsNoteStrong"))}</p>
          </GuideSection>

          <GuideSection id="dong-tu" index={5} title={t("candidate.cv.guide.sections.actionVerbs")}>
            <p>{t("candidate.cv.guide.actionVerbsIntro")}<Cite id="harvard" />.</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {actionVerbGroups.map((group) => (
                <div key={group.group} className="rounded-xl border border-slate-200 p-4">
                  <p className="font-semibold text-slate-900">{group.group}<span className="ml-2 text-xs font-normal text-slate-500">{group.meaning}</span></p>
                  <div className="mt-3 flex flex-wrap gap-1.5">{group.verbs.map((verb) => <span key={verb} className="rounded-full px-2.5 py-1 text-xs font-semibold text-[var(--color-primary)]" style={{ backgroundColor: tint(10) }}>{verb}</span>)}</div>
                </div>
              ))}
            </div>
          </GuideSection>

          <GuideSection id="trinh-bay" index={6} title={t("candidate.cv.guide.sections.formattingAts")}>
            <ul className="grid gap-3 sm:grid-cols-2">
              {formatRules.map((rule) => (
                <li key={rule.title} className="rounded-xl border border-slate-200 p-4">
                  <p className="flex items-center gap-2 font-semibold text-slate-900"><Check className="size-4 text-[var(--color-primary)]" aria-hidden="true" />{rule.title}</p>
                  <p className="mt-1 text-sm text-slate-600">{rule.detail}</p>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-slate-500">{t("candidate.cv.guide.formatSourcePrefix")} <Cite id="itviec-checklist" inline /> <Cite id="ladders" inline /></p>
          </GuideSection>

          <GuideSection id="loi-thuong-gap" index={7} title={t("candidate.cv.guide.sections.commonMistakes")}>
            <p>{t("candidate.cv.guide.mistakesIntro")}<Cite id="harvard-hes" />:</p>
            <ol className="mt-4 space-y-2">
              {commonMistakes.map((mistake) => <li key={mistake} className="flex items-start gap-3 rounded-xl border border-[var(--color-error-container)] bg-[var(--color-error-container)]/40 p-3 text-sm text-slate-800"><AlertTriangle className="mt-0.5 size-4 shrink-0 text-[var(--color-error)]" aria-hidden="true" />{mistake}</li>)}
            </ol>
          </GuideSection>

          <GuideSection id="checklist" index={8} title={t("candidate.cv.guide.sections.checklist")}>
            <SendChecklist />
          </GuideSection>

          <GuideSection id="nguon" index={9} title={t("candidate.cv.guide.sections.sources")}>
            <ol className="space-y-2">
              {guideSources.map((source, index) => (
                <li key={source.id} id={`nguon-${source.id}`} className="flex scroll-mt-24 gap-3 text-sm">
                  <span className="w-6 shrink-0 font-semibold text-slate-400">[{index + 1}]</span>
                  <span><a href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-medium text-[var(--color-primary)] hover:underline">{source.title}<ExternalLink className="size-3.5" aria-hidden="true" /><span className="sr-only">{t("candidate.cv.guide.opensNewTab")}</span></a><span className="block text-slate-500">{source.publisher}</span></span>
                </li>
              ))}
            </ol>
          </GuideSection>

          <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-[var(--color-primary)] p-6 text-white sm:p-8">
            <div><h2 className="text-xl font-semibold">{t("candidate.cv.guide.ctaTitle")}</h2><p className="mt-1 text-sm text-white/80">{t("candidate.cv.guide.ctaSubtitle")}</p></div>
            <Link to="/cv/builder" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-[var(--color-primary)] transition-colors hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">{!loggedIn && <Lock className="size-4" aria-hidden="true" />}{loggedIn ? t("candidate.cv.guide.ctaButtonLoggedIn") : t("candidate.cv.guide.loginToCreate")}<ArrowRight className="size-4" aria-hidden="true" /></Link>
          </section>
        </article>
      </div>
    </div>
  );
}

function Stat({ icon: Icon, value, label, source }: { icon: typeof Clock3; value: string; label: string; source: number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <dt className="flex items-center gap-2 text-sm text-slate-600"><Icon className="size-4 text-[var(--color-primary)]" aria-hidden="true" />{label}</dt>
      <dd className="mt-1 text-2xl font-bold text-slate-900">{value}<sup className="ml-1 text-xs font-semibold text-slate-400">[{source}]</sup></dd>
    </div>
  );
}

function GuideSection({ id, index, title, children }: { id: string; index: number; title: string; children: ReactNode }) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-6 text-[15px] leading-7 text-slate-700 sm:p-8">
      <h2 id={`${id}-title`} className="mb-4 flex items-center gap-3 text-xl font-semibold text-slate-900"><span className="text-sm font-bold text-[var(--color-primary)]">{String(index).padStart(2, "0")}</span>{title}</h2>
      {children}
    </section>
  );
}

function Cite({ id, inline = false }: { id: string; inline?: boolean }) {
  const t = useT();
  const index = sourceIndex(id);
  return <a href={`#nguon-${id}`} className={`${inline ? "" : "ml-0.5 align-super text-[11px]"} font-semibold text-[var(--color-primary)] hover:underline`} aria-label={t("candidate.cv.guide.citeAria", { index })}>[{index}]</a>;
}

function Mark({ children }: { children: ReactNode }) {
  return <span className="rounded bg-white px-1.5 text-[var(--color-primary)]">{children}</span>;
}

function Callout({ children }: { children: ReactNode }) {
  return <p className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-700">{children}</p>;
}

function SendChecklist() {
  const t = useT();
  const checklist = getSendChecklist(t);
  const [done, setDone] = useState<Set<number>>(() => new Set());
  const toggle = (index: number) => setDone((current) => {
    const next = new Set(current);
    if (next.has(index)) next.delete(index); else next.add(index);
    return next;
  });

  return (
    <div>
      <div className="flex items-center justify-between gap-4">
        <p className="flex items-center gap-2 text-sm font-semibold text-slate-900"><ListChecks className="size-4 text-[var(--color-primary)]" aria-hidden="true" />{t("candidate.cv.guide.checklistProgress", { done: done.size, total: checklist.length })}</p>
        <div className="h-2 w-40 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuemin={0} aria-valuemax={checklist.length} aria-valuenow={done.size} aria-label={t("candidate.cv.guide.checklistProgressAria")}><div className="h-full rounded-full bg-[var(--color-primary)] transition-[width] duration-200 motion-reduce:transition-none" style={{ width: `${(done.size / checklist.length) * 100}%` }} /></div>
      </div>
      <ul className="mt-4 grid gap-2 sm:grid-cols-2">
        {checklist.map((item, index) => (
          <li key={index}>
            <label className="flex min-h-11 cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm transition-colors hover:border-[var(--color-primary)] has-[:checked]:bg-[var(--color-primary-subtle)]">
              <input type="checkbox" checked={done.has(index)} onChange={() => toggle(index)} className="mt-0.5 size-4 shrink-0 accent-[var(--color-primary)]" />
              <span className={done.has(index) ? "text-slate-500 line-through" : "text-slate-800"}>{item}</span>
            </label>
          </li>
        ))}
      </ul>
    </div>
  );
}
