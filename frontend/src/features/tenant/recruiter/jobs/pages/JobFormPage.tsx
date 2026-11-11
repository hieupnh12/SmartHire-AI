import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Bot,
  BriefcaseBusiness,
  Building2,
  CalendarClock,
  Check,
  CheckCircle2,
  Circle,
  CircleHelp,
  Eye,
  FileText,
  GraduationCap,
  Laptop,
  MapPin,
  Pencil,
  Plus,
  Save,
  Search,
  Send,
  Shuffle,
  SlidersHorizontal,
  UserCheck,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from "lucide-react";
import { jobApi } from "@/api/tenant/jobApi";
import { companyApi } from "@/api/tenant/companyApi";
import type { CvScreeningConfig, GateScreeningConfig, JobUpsertRequest } from "@/api/types/job";
import { formatDateTime as formatI18nDateTime, useLocale, useT, type Locale, type TranslateFn } from "@/i18n";
import { getApiErrorMessage } from "@/lib/axios";
import { queryKeys } from "@/lib/query-keys";
import { cn } from "@/lib/utils";
import { formatSalaryRange } from "@/lib/formatSalary";
import { Button } from "@/components/ux/Button";
import { PageSkeleton } from "@/components/ux/Skeleton";
import { input, panel } from "@/features/tenant/recruiter/matching/components/rankingUi";
import { SKILL_CATALOG } from "@/features/tenant/recruiter/jobs/skillCatalog";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import { toast } from "@/stores/toastStore";

const CURRENCIES = ["VND", "USD", "EUR", "JPY"];
const EDUCATION_LEVEL_OPTIONS = [
  { value: "Trung học phổ thông", labelKey: "recruiter.ops.educationLevels.highSchool" },
  { value: "Cao đẳng", labelKey: "recruiter.ops.educationLevels.college" },
  { value: "Đại học", labelKey: "recruiter.ops.educationLevels.bachelor" },
  { value: "Thạc sĩ", labelKey: "recruiter.ops.educationLevels.master" },
  { value: "Tiến sĩ", labelKey: "recruiter.ops.educationLevels.doctorate" },
] as const;
const EDUCATION_WIRE_VALUES = new Set<string>(EDUCATION_LEVEL_OPTIONS.map((item) => item.value));

function getEducationDisplay(value: string | undefined, t: TranslateFn) {
  if (!value) return t("recruiter.ops.common.noRequirement");
  const found = EDUCATION_LEVEL_OPTIONS.find((item) => item.value === value);
  return found ? t(found.labelKey) : value;
}

const EMPLOYMENT_TYPE_DEFS = [
  { value: "FULL_TIME", labelKey: "recruiter.ops.employmentTypes.FULL_TIME" },
  { value: "PART_TIME", labelKey: "recruiter.ops.employmentTypes.PART_TIME" },
  { value: "CONTRACT", labelKey: "recruiter.ops.employmentTypes.CONTRACT" },
  { value: "INTERNSHIP", labelKey: "recruiter.ops.employmentTypes.INTERNSHIP" },
] as const;

const WORK_MODE_DEFS = [
  { value: "ONSITE", labelKey: "recruiter.ops.workModes.ONSITE", icon: Building2 },
  { value: "HYBRID", labelKey: "recruiter.ops.workModes.HYBRID", icon: Shuffle },
  { value: "REMOTE", labelKey: "recruiter.ops.workModes.REMOTE", icon: Laptop },
] as const;

const SCREENING_MODE_DEFS = [
  {
    value: "MANUAL",
    labelKey: "recruiter.ops.jobs.form.screeningModes.MANUAL.label",
    descriptionKey: "recruiter.ops.jobs.form.screeningModes.MANUAL.description",
    icon: UserCheck,
  },
  {
    value: "AUTO",
    labelKey: "recruiter.ops.jobs.form.screeningModes.AUTO.label",
    descriptionKey: "recruiter.ops.jobs.form.screeningModes.AUTO.description",
    icon: Bot,
  },
] as const;

const DEADLINE_PRESETS = [7, 14, 30];
/** Starting values match the previous CV formula so existing jobs stay comparable. Recruiter must keep each group at 100%. */
const INITIAL_CV: CvScreeningConfig = {
  skillWeight: 40,
  preferredWeight: 8,
  experienceWeight: 12,
  educationWeight: 0,
  jaccardWeight: 15,
  semanticWeight: 25,
  passThreshold: 60,
};
const INITIAL_GATE: GateScreeningConfig = {
  cvWeight: 40,
  aiInterviewWeight: 35,
  assessmentWeight: 25,
  passThreshold: 70,
};

type Step = { label: string; description: string; icon: LucideIcon; tip: string };
const STEP_DEFS = [
  { key: "basic", icon: BriefcaseBusiness },
  { key: "content", icon: FileText },
  { key: "requirements", icon: GraduationCap },
  { key: "screening", icon: SlidersHorizontal },
  { key: "review", icon: Eye },
] as const;
const LAST_STEP = STEP_DEFS.length - 1;

type Issue = { step: number; key: string; message: string; invalid: boolean };

function weightSum(values: number[]) {
  return Math.round(values.reduce((sum, value) => sum + Number(value || 0), 0) * 100) / 100;
}

export function JobFormPage() {
  const t = useT();
  const { id } = useParams();
  const jobId = id && /^\d+$/.test(id) ? id : undefined;
  const editing = Boolean(jobId);
  const navigate = useNavigate();
  const client = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "TENANT_ADMIN" || user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
  const canCreateJob = isAdmin || (user?.permissions?.includes("JOBS_CREATE") ?? false) || (user?.permissions?.includes("JOBS") ?? false);

  const steps: Step[] = useMemo(
    () =>
      STEP_DEFS.map((def) => ({
        label: t(`recruiter.ops.jobs.form.steps.${def.key}.label`),
        description: t(`recruiter.ops.jobs.form.steps.${def.key}.description`),
        tip: t(`recruiter.ops.jobs.form.steps.${def.key}.tip`),
        icon: def.icon,
      })),
    [t],
  );
  const employmentTypes = useMemo(
    () => EMPLOYMENT_TYPE_DEFS.map((item) => ({ value: item.value, label: t(item.labelKey) })),
    [t],
  );
  const workModes = useMemo(
    () => WORK_MODE_DEFS.map((item) => ({ value: item.value, label: t(item.labelKey), icon: item.icon })),
    [t],
  );
  const screeningModes = useMemo(
    () =>
      SCREENING_MODE_DEFS.map((item) => ({
        value: item.value,
        label: t(item.labelKey),
        description: t(item.descriptionKey),
        icon: item.icon,
      })),
    [t],
  );

  useEffect(() => {
    if (!editing && user && !canCreateJob) {
      toast.danger(t("recruiter.ops.jobs.form.noCreatePermission"));
      navigate("/recruiter", { replace: true });
    }
  }, [editing, user, canCreateJob, navigate, t]);

  const topRef = useRef<HTMLDivElement>(null);
  const [step, setStep] = useState(0);
  const [showErrors, setShowErrors] = useState<"draft" | "publish" | null>(null);
  const [skillQuery, setSkillQuery] = useState("");
  const existing = useQuery({
    queryKey: queryKeys.jobs.detail(jobId ?? 0),
    queryFn: () => jobApi.get(jobId!),
    enabled: editing,
  });
  const directory = useQuery({
    queryKey: ["tenant", "company", "directory"],
    queryFn: companyApi.getDirectory,
  });
  const [form, setForm] = useState<JobUpsertRequest>({
    title: "",
    description: "",
    responsibilities: "",
    benefits: "",
    location: "",
    employmentType: "FULL_TIME",
    workMode: "HYBRID",
    department: "",
    screeningMode: "MANUAL",
    headcount: 1,
    deadline: "",
    salaryMin: undefined,
    salaryMax: undefined,
    salaryCurrency: "VND",
    salaryVisible: true,
    minYearsExperience: 1,
    educationLevel: "",
    skills: [],
    cvScreening: INITIAL_CV,
    gateScreening: INITIAL_GATE,
  });

  useEffect(() => {
    const job = existing.data?.data;
    if (!job) return;
    setForm({
      title: job.title,
      description: job.description,
      responsibilities: job.responsibilities ?? "",
      benefits: job.benefits ?? "",
      location: job.location ?? "",
      employmentType: job.employmentType ?? "FULL_TIME",
      workMode: job.workMode ?? "HYBRID",
      department: job.department ?? "",
      screeningMode: job.screeningMode ?? "MANUAL",
      headcount: job.headcount ?? 1,
      deadline: toDateTimeLocal(job.deadline),
      salaryMin: job.salaryMin ?? undefined,
      salaryMax: job.salaryMax ?? undefined,
      salaryCurrency: job.salaryCurrency ?? "VND",
      salaryVisible: job.salaryVisible,
      minYearsExperience: job.minYearsExperience ?? undefined,
      educationLevel: job.educationLevel ?? "",
      skills: job.skills.map((skill) => ({
        name: skill.name,
        category: skill.category ?? undefined,
        required: skill.required,
        weight: Number(skill.weight),
        minLevel: skill.minLevel ?? undefined,
      })),
      cvScreening: job.cvScreening ?? INITIAL_CV,
      gateScreening: job.gateScreening ?? INITIAL_GATE,
    });
  }, [existing.data]);

  useEffect(() => {
    if (!topRef.current) return;
    if (topRef.current.scrollHeight > topRef.current.clientHeight) topRef.current.scrollTo({ top: 0, behavior: "smooth" });
    else topRef.current.scrollIntoView({ block: "start", behavior: "smooth" });
  }, [step]);

  const status = existing.data?.data?.status;
  const alreadyPublished = status === "PUBLISHED";
  const selected = form.skills ?? [];
  const selectedNames = useMemo(() => new Set(selected.map((skill) => skill.name.toLowerCase())), [selected]);

  const locationDepts = useMemo(() => {
    if (!form.location || !directory.data?.data.locationDepartments) return [];
    return directory.data.data.locationDepartments[form.location] ?? [];
  }, [form.location, directory.data]);

  const otherDepts = useMemo(() => {
    const all = directory.data?.data.departments ?? [];
    if (locationDepts.length === 0) return all;
    const locSet = new Set(locationDepts.map((d) => d.toLowerCase()));
    return all.filter((d) => !locSet.has(d.toLowerCase()));
  }, [locationDepts, directory.data]);

  const cv = form.cvScreening ?? INITIAL_CV;
  const gate = form.gateScreening ?? INITIAL_GATE;
  const cvTotal = weightSum([
    cv.skillWeight, cv.preferredWeight, cv.experienceWeight, cv.educationWeight, cv.jaccardWeight, cv.semanticWeight,
  ]);
  const gateTotal = weightSum([gate.cvWeight, gate.aiInterviewWeight, gate.assessmentWeight]);

  const save = useMutation({
    mutationFn: async (publish: boolean) => {
      const body = payload(form);
      const saved = editing ? await jobApi.update(id!, body) : await jobApi.create(body);
      if (!publish || saved.data.status === "PUBLISHED") return saved;
      return jobApi.publish(saved.data.id);
    },
    onSuccess: (response) => {
      void client.invalidateQueries({ queryKey: queryKeys.jobs.all });
      navigate(`/recruiter/jobs/${response.data.id}`);
    },
    onError: (err) => {
      toast.danger(getApiErrorMessage(err, t("recruiter.ops.jobs.form.saveError")));
    },
  });

  const set = (key: keyof JobUpsertRequest, value: string | number | boolean | null) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const setCv = (key: keyof CvScreeningConfig, value: number) => {
    setForm((current) => ({ ...current, cvScreening: { ...(current.cvScreening ?? INITIAL_CV), [key]: value } }));
  };

  const setGate = (key: keyof GateScreeningConfig, value: number) => {
    setForm((current) => ({ ...current, gateScreening: { ...(current.gateScreening ?? INITIAL_GATE), [key]: value } }));
  };

  const toggleSkill = (name: string, category: string) => {
    setForm((current) => {
      const skills = current.skills ?? [];
      const exists = skills.some((skill) => skill.name.toLowerCase() === name.toLowerCase());
      if (exists) {
        return { ...current, skills: skills.filter((skill) => skill.name.toLowerCase() !== name.toLowerCase()) };
      }
      return { ...current, skills: [...skills, { name, category, required: true, weight: 1 }] };
    });
  };

  const toggleRequired = (name: string) => {
    setForm((current) => ({
      ...current,
      skills: (current.skills ?? []).map((skill) =>
        skill.name.toLowerCase() === name.toLowerCase() ? { ...skill, required: !skill.required } : skill),
    }));
  };

  const addCustomSkill = () => {
    const name = skillQuery.trim();
    if (!name) return;
    if (!selectedNames.has(name.toLowerCase())) toggleSkill(name, "other");
    setSkillQuery("");
  };

  if (editing && existing.isPending) return <PageSkeleton variant="form" />;

  const salaryInvalid = form.salaryMin != null && form.salaryMax != null && Number(form.salaryMin) > Number(form.salaryMax);
  const deadlinePast = Boolean(form.deadline) && new Date(form.deadline!).getTime() <= Date.now();
  const draftIssues: Issue[] = [
    { step: 0, key: "title", message: t("recruiter.ops.jobs.form.validation.title"), invalid: !form.title.trim() },
    { step: 0, key: "headcount", message: t("recruiter.ops.jobs.form.validation.headcount"), invalid: !(Number(form.headcount) >= 1) },
    { step: 1, key: "salary", message: t("recruiter.ops.jobs.form.validation.salary"), invalid: salaryInvalid },
    { step: 3, key: "cv", message: t("recruiter.ops.jobs.form.validation.cv"), invalid: cvTotal !== 100 },
    { step: 3, key: "gate", message: t("recruiter.ops.jobs.form.validation.gate"), invalid: gateTotal !== 100 },
  ];
  const publishIssues: Issue[] = [
    ...draftIssues,
    { step: 0, key: "deadline", message: t("recruiter.ops.jobs.form.validation.deadline"), invalid: deadlinePast },
    { step: 1, key: "description", message: t("recruiter.ops.jobs.form.validation.description"), invalid: !(form.description ?? "").trim() },
    { step: 2, key: "skills", message: t("recruiter.ops.jobs.form.validation.skills"), invalid: selected.length === 0 },
  ];
  const activeIssues = (showErrors === "publish" ? publishIssues : showErrors === "draft" ? draftIssues : [])
    .filter((issue) => issue.invalid);
  const errorOf = (key: string) => activeIssues.find((issue) => issue.key === key)?.message;
  const stepIssues = activeIssues.filter((issue) => issue.step === step);
  const stepComplete = [
    Boolean(form.title.trim()),
    Boolean((form.description ?? "").trim()) && !salaryInvalid,
    selected.length > 0,
    cvTotal === 100 && gateTotal === 100,
    false,
  ];
  const requiredCount = selected.filter((skill) => skill.required).length;
  const readyCount = publishIssues.filter((issue) => !issue.invalid).length;

  const goNext = () => {
    if (draftIssues.some((issue) => issue.invalid && issue.step === step)) {
      setShowErrors((current) => current ?? "draft");
      return;
    }
    setStep((current) => Math.min(current + 1, LAST_STEP));
  };

  const submit = (publish: boolean) => {
    const strict = publish || alreadyPublished;
    const issues = (strict ? publishIssues : draftIssues).filter((issue) => issue.invalid);
    if (issues.length > 0) {
      setShowErrors(strict ? "publish" : "draft");
      setStep(Math.min(...issues.map((issue) => issue.step)));
      return;
    }
    save.mutate(publish);
  };

  const query = skillQuery.trim().toLowerCase();
  const catalog = SKILL_CATALOG
    .map((group) => ({ ...group, skills: group.skills.filter((name) => !query || name.toLowerCase().includes(query)) }))
    .filter((group) => group.skills.length > 0);
  const canAddCustom = query.length > 0 && !selectedNames.has(query)
    && !SKILL_CATALOG.some((group) => group.skills.some((name) => name.toLowerCase() === query));
  const current = steps[step];
  const CurrentIcon = current.icon;
  const cancelTo = editing ? `/recruiter/jobs/${id}` : "/recruiter";
  return (
    <section className="mx-auto flex w-full max-w-[1440px] scroll-mt-24 flex-col gap-6 text-[var(--color-on-surface)] xl:h-full xl:min-h-0 xl:overflow-hidden">
      {existing.isError && <ErrorBox>{getApiErrorMessage(existing.error)}</ErrorBox>}

      <div className="grid items-start gap-6 lg:grid-cols-[256px_minmax(0,1fr)] xl:min-h-0 xl:flex-1 xl:grid-cols-[256px_minmax(0,1fr)_320px] xl:items-stretch">
        <Stepper steps={steps} step={step} complete={stepComplete} issues={activeIssues} onSelect={setStep} />
        <form
          noValidate
          className={cn(panel, "flex min-w-0 flex-col p-0 xl:h-full xl:min-h-0 xl:overflow-hidden")}
          onSubmit={(e) => { e.preventDefault(); if (step < LAST_STEP) goNext(); }}
        >
          <div className="flex shrink-0 items-center gap-3 border-b border-[var(--color-border-default)] bg-[var(--color-surface-alt)]/55 px-5 py-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-[var(--color-primary-soft)] text-[var(--color-primary)]">
              <CurrentIcon className="size-4" aria-hidden="true" />
            </span>
            <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-3 gap-y-0.5">
              <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-primary)] shadow-sm">
                {t("recruiter.ops.jobs.form.stepCounter", { current: step + 1, total: steps.length })}
              </span>
              <h2 className="text-base font-semibold leading-6">{current.label}</h2>
              <p className="min-w-0 flex-1 truncate text-xs text-[var(--color-on-surface-variant)] sm:text-right">{current.description}</p>
            </div>
          </div>

          <div ref={topRef} className="flex min-h-0 flex-1 scroll-mt-24 flex-col gap-6 px-6 py-5 xl:overflow-y-auto">
            {stepIssues.length > 0 && (
              <div role="alert" className="rounded-xl bg-[var(--color-error-container)] p-4 text-sm text-[var(--color-on-error-container)]">
                <p className="flex items-center gap-2 font-semibold">
                  <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
                  {t("recruiter.ops.jobs.form.fixIssuesCount", { count: stepIssues.length })}
                </p>
                <ul className="mt-1.5 list-disc space-y-0.5 pl-10">
                  {stepIssues.map((issue) => <li key={issue.key}>{issue.message}</li>)}
                </ul>
              </div>
            )}

            {step === 0 && (
              <>
                <FieldGroup title={t("recruiter.ops.jobs.form.groupBasicTitle")}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={t("recruiter.ops.jobs.form.titleLabel")} required error={errorOf("title")} className="sm:col-span-2" counter={`${form.title.length}/120`}>
                      <input className={inputClass(errorOf("title"))} maxLength={120} placeholder={t("recruiter.ops.jobs.form.titlePlaceholder")} value={form.title} onChange={(e) => set("title", e.target.value)} />
                    </Field>
                    <Field label={t("recruiter.ops.jobs.form.departmentLabel")} hint={locationDepts.length > 0 ? t("recruiter.ops.jobs.form.departmentHintLocation", { location: form.location ?? "" }) : undefined}>
                      <select className={input} value={form.department} onChange={(e) => set("department", e.target.value)} disabled={directory.isPending}>
                        <option value="">{t("recruiter.ops.jobs.form.departmentPlaceholder")}</option>
                        {locationDepts.length > 0 ? (
                          <>
                            <optgroup label={t("recruiter.ops.jobs.form.departmentsAtLocation", { location: form.location ?? "" })}>
                              {locationDepts.map((value) => <option key={value} value={value}>{value}</option>)}
                            </optgroup>
                            {otherDepts.length > 0 && (
                              <optgroup label={t("recruiter.ops.jobs.form.otherDepartments")}>
                                {otherDepts.map((value) => <option key={value} value={value}>{value}</option>)}
                              </optgroup>
                            )}
                          </>
                        ) : (
                          (directory.data?.data.departments ?? []).map((value) => <option key={value} value={value}>{value}</option>)
                        )}
                      </select>
                    </Field>
                    <Field label={t("recruiter.ops.jobs.form.headcountLabel")} required error={errorOf("headcount")}>
                      <input className={cn(inputClass(errorOf("headcount")), "tabular-nums")} type="number" min={1} value={form.headcount ?? 1} onChange={(e) => set("headcount", Number(e.target.value))} />
                    </Field>
                  </div>
                </FieldGroup>

                <FieldGroup title={t("recruiter.ops.jobs.form.groupWorkArrangement")}>
                  <ChoiceGroup label={t("recruiter.ops.jobs.form.employmentTypeLabel")} value={form.employmentType ?? "FULL_TIME"} options={employmentTypes} onChange={(v) => set("employmentType", v)} columns="sm:grid-cols-4" />
                  <ChoiceGroup label={t("recruiter.ops.jobs.form.workModeLabel")} value={form.workMode ?? "HYBRID"} options={workModes} onChange={(v) => set("workMode", v)} columns="sm:grid-cols-3" />
                  <Field label={t("recruiter.ops.jobs.form.locationLabel")}>
                    <span className="relative block">
                      <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-on-surface-variant)]" aria-hidden="true" />
                      <select className={cn(input, "pl-9")} value={form.location} onChange={(e) => set("location", e.target.value)} disabled={directory.isPending}>
                        <option value="">{t("recruiter.ops.jobs.form.locationPlaceholder")}</option>
                        {(directory.data?.data.locations ?? []).map((value) => <option key={value} value={value}>{value}</option>)}
                      </select>
                    </span>
                  </Field>
                </FieldGroup>

                <FieldGroup title={t("recruiter.ops.jobs.form.groupDeadline")}>
                  <Field label={t("recruiter.ops.jobs.form.deadlineLabel")} error={errorOf("deadline")} hint={t("recruiter.ops.jobs.form.deadlineHint")}>
                    <input className={inputClass(errorOf("deadline"))} type="datetime-local" value={form.deadline ?? ""} onChange={(e) => set("deadline", e.target.value)} />
                  </Field>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-[var(--color-on-surface-variant)]">{t("recruiter.ops.jobs.form.quickSelect")}</span>
                    {DEADLINE_PRESETS.map((days) => (
                      <button key={days} type="button" className={chipClass(false)} onClick={() => set("deadline", deadlineAfter(days))}>
                        {t("recruiter.ops.jobs.form.daysPreset", { days })}
                      </button>
                    ))}
                    {form.deadline && (
                      <button type="button" className={chipClass(false)} onClick={() => set("deadline", "")}>
                        {t("recruiter.ops.jobs.form.unlimitedDeadline")}
                      </button>
                    )}
                  </div>
                </FieldGroup>
              </>
            )}

            {step === 1 && (
              <>
                <FieldGroup title={t("recruiter.ops.jobs.form.groupContentTitle")}>
                  <Field label={t("recruiter.ops.jobs.form.descriptionLabel")} required error={errorOf("description")} counter={t("recruiter.ops.jobs.form.charCount", { count: (form.description ?? "").length })}>
                    <textarea className={inputClass(errorOf("description"))} rows={7} placeholder={t("recruiter.ops.jobs.form.descriptionPlaceholder")} value={form.description} onChange={(e) => set("description", e.target.value)} />
                  </Field>
                  <Field label={t("recruiter.ops.jobs.form.responsibilitiesLabel")} hint={t("recruiter.ops.jobs.form.responsibilitiesHint")}>
                    <textarea className={input} rows={5} placeholder={t("recruiter.ops.jobs.form.responsibilitiesPlaceholder")} value={form.responsibilities} onChange={(e) => set("responsibilities", e.target.value)} />
                  </Field>
                  <Field label={t("recruiter.ops.jobs.form.benefitsLabel")} hint={t("recruiter.ops.jobs.form.benefitsHint")}>
                    <textarea className={input} rows={5} placeholder={t("recruiter.ops.jobs.form.benefitsPlaceholder")} value={form.benefits} onChange={(e) => set("benefits", e.target.value)} />
                  </Field>
                </FieldGroup>

                <FieldGroup title={t("recruiter.ops.jobs.form.groupSalaryTitle")}>
                  <div className="grid gap-4 sm:grid-cols-[1fr_1fr_140px]">
                    <Field label={t("recruiter.ops.jobs.form.salaryFrom")} error={errorOf("salary")}>
                      <input className={cn(inputClass(errorOf("salary")), "tabular-nums")} type="number" min={0} placeholder="15000000" value={form.salaryMin ?? ""} onChange={(e) => set("salaryMin", e.target.value ? Number(e.target.value) : null)} />
                    </Field>
                    <Field label={t("recruiter.ops.jobs.form.salaryTo")}>
                      <input className={cn(inputClass(errorOf("salary")), "tabular-nums")} type="number" min={0} placeholder="30000000" value={form.salaryMax ?? ""} onChange={(e) => set("salaryMax", e.target.value ? Number(e.target.value) : null)} />
                    </Field>
                    <Field label={t("recruiter.ops.jobs.form.currencyLabel")}>
                      <select className={input} value={form.salaryCurrency} onChange={(e) => set("salaryCurrency", e.target.value)}>
                        {CURRENCIES.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
                        {form.salaryCurrency && !CURRENCIES.includes(form.salaryCurrency) && (
                          <option value={form.salaryCurrency}>{form.salaryCurrency}</option>
                        )}
                      </select>
                    </Field>
                  </div>
                  <SwitchRow
                    label={t("recruiter.ops.jobs.form.salaryVisibleLabel")}
                    description={t("recruiter.ops.jobs.form.salaryVisibleDesc")}
                    checked={Boolean(form.salaryVisible)}
                    onChange={(checked) => set("salaryVisible", checked)}
                  />
                </FieldGroup>
              </>
            )}

            {step === 2 && (
              <>
                <FieldGroup title={t("recruiter.ops.jobs.form.groupExpEduTitle")}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label={t("recruiter.ops.jobs.form.minYearsLabel")}>
                      <span className="relative block">
                        <input className={cn(input, "pr-12 tabular-nums")} type="number" step="0.5" min={0} value={form.minYearsExperience ?? ""} onChange={(e) => set("minYearsExperience", e.target.value ? Number(e.target.value) : null)} />
                        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-[var(--color-on-surface-variant)]">{t("recruiter.ops.jobs.form.yearsUnit")}</span>
                      </span>
                    </Field>
                    <Field label={t("recruiter.ops.jobs.form.educationLabel")}>
                      <select className={input} value={form.educationLevel} onChange={(e) => set("educationLevel", e.target.value)}>
                        <option value="">{t("recruiter.ops.common.noRequirement")}</option>
                        {EDUCATION_LEVEL_OPTIONS.map((level) => (
                          <option key={level.value} value={level.value}>{t(level.labelKey)}</option>
                        ))}
                        {form.educationLevel && !EDUCATION_WIRE_VALUES.has(form.educationLevel) && (
                          <option value={form.educationLevel}>{form.educationLevel}</option>
                        )}
                      </select>
                    </Field>
                  </div>
                </FieldGroup>

                <FieldGroup
                  title={t("recruiter.ops.jobs.form.groupSkillsTitle")}
                  aside={(
                    <span className="rounded-full bg-[var(--color-primary-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--color-primary-hover)]">
                      {t("recruiter.ops.jobs.form.skillsCounter", { total: selected.length, required: requiredCount })}
                    </span>
                  )}
                >
                  {errorOf("skills") && <InlineError>{errorOf("skills")}</InlineError>}
                  <div className="flex gap-2">
                    <label className="relative block flex-1">
                      <span className="sr-only">{t("recruiter.ops.jobs.form.searchSkillsSr")}</span>
                      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-on-surface-variant)]" aria-hidden="true" />
                      <input
                        className={cn(input, "pl-9")}
                        placeholder={t("recruiter.ops.jobs.form.searchSkillsPlaceholder")}
                        value={skillQuery}
                        onChange={(e) => setSkillQuery(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomSkill(); } }}
                      />
                    </label>
                    <Button variant="secondary" disabled={!canAddCustom} onClick={addCustomSkill}>
                      <Plus className="size-4" aria-hidden="true" />
                      {t("recruiter.ops.jobs.form.addSkillBtn")}
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {catalog.length === 0 && (
                      <p className="text-sm text-[var(--color-on-surface-variant)]">
                        {t("recruiter.ops.jobs.form.skillNotInCatalog", { query: skillQuery.trim() })}
                      </p>
                    )}
                    {catalog.map((group) => (
                      <div key={group.category} className="space-y-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">{t(group.labelKey)}</p>
                        <div className="flex flex-wrap gap-2">
                          {group.skills.map((name) => {
                            const active = selectedNames.has(name.toLowerCase());
                            return (
                              <button key={name} type="button" aria-pressed={active} onClick={() => toggleSkill(name, group.category)} className={chipClass(active)}>
                                {active ? <Check className="size-3.5" aria-hidden="true" /> : <Plus className="size-3.5" aria-hidden="true" />}
                                {name}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2 rounded-2xl bg-[var(--color-surface-container-low)] p-4">
                    <p className="text-sm font-semibold">{t("recruiter.ops.jobs.form.selectedSkillsTitle")}</p>
                    {selected.length === 0 && (
                      <p className="text-sm text-[var(--color-on-surface-variant)]">{t("recruiter.ops.jobs.form.noSkillsSelected")}</p>
                    )}
                    <ul className="flex flex-col gap-2">
                      {selected.map((skill) => (
                        <li key={skill.name} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[var(--color-surface-card)] px-3 py-2">
                          <span className="text-sm font-medium">{skill.name}</span>
                          <span className="flex items-center gap-2">
                            <Segmented
                              label={t("recruiter.ops.jobs.form.skillRequirementAria", { name: skill.name })}
                              value={skill.required ? "required" : "optional"}
                              options={[
                                { value: "required", label: t("recruiter.ops.jobs.form.skillRequired") },
                                { value: "optional", label: t("recruiter.ops.jobs.form.skillOptional") },
                              ]}
                              onChange={(value) => { if ((value === "required") !== skill.required) toggleRequired(skill.name); }}
                            />
                            <button
                              type="button"
                              aria-label={t("recruiter.ops.jobs.form.removeSkillAria", { name: skill.name })}
                              onClick={() => toggleSkill(skill.name, skill.category ?? "")}
                              className="grid size-8 place-items-center rounded-lg text-[var(--color-on-surface-variant)] transition-colors hover:bg-[var(--color-error-container)] hover:text-[var(--color-on-error-container)]"
                            >
                              <X className="size-4" aria-hidden="true" />
                            </button>
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </FieldGroup>
              </>
            )}

            {step === 3 && (
              <>
                <FieldGroup title={t("recruiter.ops.jobs.form.groupScreeningMode")} description={t("recruiter.ops.jobs.form.groupScreeningModeDesc")}>
                  <ChoiceGroup
                    label={t("recruiter.ops.jobs.form.groupScreeningMode")}
                    hideLabel
                    value={form.screeningMode ?? "MANUAL"}
                    options={screeningModes}
                    onChange={(v) => set("screeningMode", v)}
                    columns="sm:grid-cols-2"
                  />
                </FieldGroup>

                <FieldGroup
                  title={t("recruiter.ops.jobs.form.groupCvWeights")}
                  description={t("recruiter.ops.jobs.form.groupCvWeightsDesc")}
                  aside={<TotalBadge total={cvTotal} />}
                >
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <WeightField label={t("recruiter.ops.jobs.form.cvRequiredLabel")} help={t("recruiter.ops.jobs.form.cvHelp.required")} value={cv.skillWeight} onChange={(v) => setCv("skillWeight", v)} />
                    <WeightField label={t("recruiter.ops.jobs.form.cvPreferredLabel")} help={t("recruiter.ops.jobs.form.cvHelp.preferred")} value={cv.preferredWeight} onChange={(v) => setCv("preferredWeight", v)} />
                    <WeightField label={t("recruiter.ops.jobs.form.cvExperienceLabel")} help={t("recruiter.ops.jobs.form.cvHelp.experience")} value={cv.experienceWeight} onChange={(v) => setCv("experienceWeight", v)} />
                    <WeightField label={t("recruiter.ops.jobs.form.cvEducationLabel")} help={t("recruiter.ops.jobs.form.cvHelp.education")} value={cv.educationWeight} onChange={(v) => setCv("educationWeight", v)} />
                    <WeightField label={t("recruiter.ops.jobs.form.cvJaccardLabel")} help={t("recruiter.ops.jobs.form.cvHelp.jaccard")} value={cv.jaccardWeight} onChange={(v) => setCv("jaccardWeight", v)} />
                    <WeightField label={t("recruiter.ops.jobs.form.cvSemanticLabel")} help={t("recruiter.ops.jobs.form.cvHelp.semantic")} value={cv.semanticWeight} onChange={(v) => setCv("semanticWeight", v)} />
                  </div>
                  <TotalMeter total={cvTotal} />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <WeightField
                      label={t("recruiter.ops.jobs.form.cvThresholdLabel")}
                      help={t("recruiter.ops.jobs.form.cvHelp.threshold")}
                      suffix="/100"
                      value={cv.passThreshold}
                      onChange={(v) => setCv("passThreshold", v)}
                      hint={t("recruiter.ops.jobs.form.cvThresholdHint")}
                    />
                  </div>
                </FieldGroup>

                <FieldGroup
                  title={t("recruiter.ops.jobs.form.groupGateWeights")}
                  description={t("recruiter.ops.jobs.form.groupGateWeightsDesc")}
                  aside={<TotalBadge total={gateTotal} />}
                >
                  <div className="grid gap-4 sm:grid-cols-3">
                    <WeightField label={t("recruiter.ops.jobs.form.gateCvLabel")} help={t("recruiter.ops.jobs.form.gateHelp.cv")} value={gate.cvWeight} onChange={(v) => setGate("cvWeight", v)} />
                    <WeightField label={t("recruiter.ops.jobs.form.gateAiLabel")} help={t("recruiter.ops.jobs.form.gateHelp.aiInterview")} value={gate.aiInterviewWeight} onChange={(v) => setGate("aiInterviewWeight", v)} />
                    <WeightField label={t("recruiter.ops.jobs.form.gateAssessmentLabel")} help={t("recruiter.ops.jobs.form.gateHelp.assessment")} value={gate.assessmentWeight} onChange={(v) => setGate("assessmentWeight", v)} />
                  </div>
                  <TotalMeter total={gateTotal} />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <WeightField
                      label={t("recruiter.ops.jobs.form.gateThresholdLabel")}
                      help={t("recruiter.ops.jobs.form.gateHelp.threshold")}
                      suffix="/100"
                      value={gate.passThreshold}
                      onChange={(v) => setGate("passThreshold", v)}
                      hint={t("recruiter.ops.jobs.form.gateThresholdHint")}
                    />
                  </div>
                </FieldGroup>
              </>
            )}

            {step === 4 && (
              <ReviewStep
                form={form}
                employmentTypes={employmentTypes}
                workModes={workModes}
                screeningModes={screeningModes}
                onEdit={setStep}
              />
            )}
          </div>

          <div className="z-10 flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-b-3xl border-t border-[var(--color-border-default)] bg-[var(--color-surface-card)]/95 px-6 py-4 backdrop-blur">
            <div className="flex flex-wrap items-center gap-2">
              <Link to={cancelTo} className="inline-flex min-h-10 items-center justify-center rounded-[var(--radius-md)] px-3 text-sm font-medium text-[var(--color-on-surface-variant)] transition-colors hover:bg-[var(--color-surface-container-low)] hover:text-[var(--color-on-surface)]">
                {t("recruiter.ops.common.cancel")}
              </Link>
              {step < LAST_STEP && (
                <Button variant="secondary" disabled={save.isPending} onClick={() => submit(false)}>
                  <Save className="size-4" aria-hidden="true" />
                  {editing ? t("recruiter.ops.jobs.form.saveChangesBtn") : t("recruiter.ops.jobs.form.saveDraftBtn")}
                </Button>
              )}
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              {step > 0 && (
                <Button variant="ghost" onClick={() => setStep((s) => Math.max(s - 1, 0))}>
                  <ArrowLeft className="size-4" aria-hidden="true" />
                  {t("recruiter.ops.common.back")}
                </Button>
              )}
              {save.isError && (
                <span role="alert" className="flex items-center gap-1.5 text-sm text-[var(--color-error)]">
                  <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
                  {getApiErrorMessage(save.error)}
                </span>
              )}
              {step < LAST_STEP ? (
                <Button type="submit">
                  {t("recruiter.ops.jobs.form.continueBtn")}
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Button>
              ) : editing && status !== "DRAFT" ? (
                <Button disabled={save.isPending} onClick={() => submit(false)}>
                  <Save className="size-4" aria-hidden="true" />
                  {save.isPending ? t("recruiter.ops.common.saving") : t("recruiter.ops.jobs.form.saveChangesBtn")}
                </Button>
              ) : (
                <Button disabled={save.isPending} onClick={() => submit(true)}>
                  <Send className="size-4" aria-hidden="true" />
                  {save.isPending ? t("recruiter.ops.jobs.form.publishingBtn") : t("recruiter.ops.jobs.form.publishBtn")}
                </Button>
              )}
            </div>
          </div>
        </form>

        <aside className="flex flex-col gap-4 lg:col-start-2 xl:col-start-3 xl:row-start-1 xl:h-full xl:overflow-hidden">
          <PreviewCard form={form} employmentTypes={employmentTypes} workModes={workModes} />
          <div className={cn(panel, "space-y-3 p-5")}>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">{t("recruiter.ops.jobs.form.readyToPublishTitle")}</h2>
              <span className="text-xs font-semibold tabular-nums text-[var(--color-on-surface-variant)]">{readyCount}/{publishIssues.length}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-container)]">
              <div className="h-full rounded-full bg-[var(--color-primary)] transition-[width] duration-200 motion-reduce:transition-none" style={{ width: `${(readyCount / publishIssues.length) * 100}%` }} />
            </div>
            <ul className="space-y-2">
              {publishIssues.map((issue) => (
                <li key={issue.key}>
                  <button type="button" onClick={() => setStep(issue.step)} className="flex w-full items-start gap-2 rounded-lg px-1 py-0.5 text-left text-sm transition-colors hover:bg-[var(--color-surface-container-low)]">
                    {issue.invalid
                      ? <Circle className="mt-0.5 size-4 shrink-0 text-[var(--color-outline-variant)]" aria-hidden="true" />
                      : <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" aria-hidden="true" />}
                    <span className={issue.invalid ? "text-[var(--color-on-surface-variant)]" : ""}>
                      {t(`recruiter.ops.jobs.form.checklistLabels.${issue.key}`)}
                    </span>
                    <span className="sr-only">
                      {issue.invalid ? t("recruiter.ops.jobs.form.srIncomplete") : t("recruiter.ops.jobs.form.srComplete")}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </section>
  );
}

function Stepper({ steps, step, complete, issues, onSelect }: {
  steps: Step[];
  step: number;
  complete: boolean[];
  issues: Issue[];
  onSelect: (step: number) => void;
}) {
  const t = useT();
  return (
    <nav aria-label={t("recruiter.ops.jobs.form.stepperAria")} className={cn(panel, "p-4 lg:sticky lg:top-24 lg:p-3")}>
      <div className="lg:hidden">
        <p className="mb-3 text-sm font-semibold">
          {t("recruiter.ops.jobs.form.stepSummaryMobile", { current: step + 1, total: steps.length, label: steps[step].label })}
        </p>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-container)]">
          <div className="h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${((step + 1) / steps.length) * 100}%` }} />
        </div>
      </div>
      <p className="hidden px-2 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)] lg:block">
        {t("recruiter.ops.jobs.form.stepperAria")}
      </p>
      <ol className="hidden flex-col lg:flex">
        {steps.map((item, index) => {
          const active = index === step;
          const hasIssue = issues.some((issue) => issue.step === index);
          const done = complete[index] && !active && !hasIssue;
          return (
            <li key={item.label} className="relative pb-1 last:pb-0">
              {index < LAST_STEP && (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute -bottom-1 left-[26px] top-[48px] w-0.5 -translate-x-1/2 rounded-full",
                    index < step ? "bg-[var(--color-primary)]" : "bg-[var(--color-surface-container-high)]",
                  )}
                />
              )}
              <button
                type="button"
                aria-current={active ? "step" : undefined}
                onClick={() => onSelect(index)}
                className={cn(
                  "flex w-full items-start gap-3 rounded-xl p-2 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[var(--color-primary)]",
                  active ? "bg-[var(--color-primary-subtle)]" : "hover:bg-[var(--color-surface-container-low)]",
                )}
              >
                <span
                  className={cn(
                    "grid size-9 shrink-0 place-items-center rounded-full border-2 text-sm font-semibold tabular-nums transition-colors",
                    active && "border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-on-primary)]",
                    !active && hasIssue && "border-[var(--color-error)] bg-[var(--color-error-container)] text-[var(--color-on-error-container)]",
                    !active && !hasIssue && done && "border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary)]",
                    !active && !hasIssue && !done && "border-[var(--color-outline-variant)] bg-[var(--color-surface-card)] text-[var(--color-on-surface-variant)]",
                  )}
                >
                  {hasIssue && !active ? <AlertTriangle className="size-4" aria-hidden="true" /> : done ? <Check className="size-4" aria-hidden="true" /> : index + 1}
                </span>
                <span className="min-w-0 pt-0.5">
                  <span className={cn("block text-sm font-semibold leading-5", active ? "text-[var(--color-primary-hover)]" : hasIssue ? "text-[var(--color-error)]" : "text-[var(--color-on-surface)]")}>
                    {item.label}
                  </span>
                  <span className="mt-0.5 block text-xs leading-4 text-[var(--color-on-surface-variant)]">{item.description}</span>
                </span>
                {hasIssue && <span className="sr-only">{t("recruiter.ops.jobs.form.srNeedsFix")}</span>}
                {done && <span className="sr-only">{t("recruiter.ops.jobs.form.srComplete")}</span>}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function PreviewCard({ form, employmentTypes, workModes }: {
  form: JobUpsertRequest;
  employmentTypes: { value: string; label: string }[];
  workModes: { value: string; label: string }[];
}) {
  const t = useT();
  const locale = useLocale();
  const skills = form.skills ?? [];
  return (
    <div className={cn(panel, "space-y-4 p-5")}>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">{t("recruiter.ops.jobs.form.previewTitle")}</p>
      <div className="space-y-1">
        <h3 className={cn("text-base font-semibold leading-6", !form.title.trim() && "text-[var(--color-outline)]")}>
          {form.title.trim() || t("recruiter.ops.jobs.form.titleFallback")}
        </h3>
        {form.department && <p className="text-xs text-[var(--color-on-surface-variant)]">{form.department}</p>}
      </div>
      <p className="flex items-center gap-2 text-sm font-semibold text-[var(--color-primary-hover)]">
        <Wallet className="size-4 shrink-0" aria-hidden="true" />
        {salaryText(form, t)}
      </p>
      <div className="flex flex-wrap gap-1.5">
        <MetaChip icon={MapPin}>{form.location?.trim() || t("recruiter.ops.jobs.form.locationFallback")}</MetaChip>
        <MetaChip icon={BriefcaseBusiness}>{labelOf(employmentTypes, form.employmentType)}</MetaChip>
        <MetaChip icon={Building2}>{labelOf(workModes, form.workMode)}</MetaChip>
        <MetaChip icon={Users}>{t("recruiter.ops.jobs.detail.headcountUnit", { count: form.headcount ?? 1 })}</MetaChip>
        {form.deadline && (
          <MetaChip icon={CalendarClock}>
            {t("recruiter.ops.jobs.form.deadlinePrefix", { date: formatLocalDateTime(form.deadline, locale) })}
          </MetaChip>
        )}
      </div>
      {skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-t border-[var(--color-border-default)] pt-3">
          {skills.slice(0, 8).map((skill) => (
            <span key={skill.name} className="rounded-md bg-[var(--color-surface-container-low)] px-2 py-0.5 text-xs font-medium">{skill.name}</span>
          ))}
          {skills.length > 8 && <span className="px-1 py-0.5 text-xs text-[var(--color-on-surface-variant)]">+{skills.length - 8}</span>}
        </div>
      )}
    </div>
  );
}

function ReviewStep({ form, employmentTypes, workModes, screeningModes, onEdit }: {
  form: JobUpsertRequest;
  employmentTypes: { value: string; label: string }[];
  workModes: { value: string; label: string }[];
  screeningModes: { value: string; label: string; description: string; icon: LucideIcon }[];
  onEdit: (step: number) => void;
}) {
  const t = useT();
  const locale = useLocale();
  const skills = form.skills ?? [];
  const mode = screeningModes.find((item) => item.value === form.screeningMode) ?? screeningModes[0];
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] p-5">
        <h3 className="text-xl font-semibold">{form.title.trim() || t("recruiter.ops.jobs.form.titleFallback")}</h3>
        <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-[var(--color-primary-hover)]">
          <Wallet className="size-4" aria-hidden="true" />
          {salaryText(form, t)}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <MetaChip icon={MapPin}>{form.location?.trim() || t("recruiter.ops.jobs.form.locationFallback")}</MetaChip>
          <MetaChip icon={BriefcaseBusiness}>{labelOf(employmentTypes, form.employmentType)}</MetaChip>
          <MetaChip icon={Building2}>{labelOf(workModes, form.workMode)}</MetaChip>
          <MetaChip icon={Users}>{t("recruiter.ops.jobs.detail.headcountUnit", { count: form.headcount ?? 1 })}</MetaChip>
          <MetaChip icon={CalendarClock}>
            {form.deadline
              ? t("recruiter.ops.jobs.form.deadlinePrefix", { date: formatLocalDateTime(form.deadline, locale) })
              : t("recruiter.ops.jobs.form.deadlineUnlimited")}
          </MetaChip>
        </div>
      </div>

      <ReviewSection title={t("recruiter.ops.jobs.form.reviewDescriptionTitle")} onEdit={() => onEdit(1)}>
        <MultilineText value={form.description} empty={t("recruiter.ops.jobs.form.reviewDescriptionEmpty")} />
      </ReviewSection>
      <ReviewSection title={t("recruiter.ops.jobs.form.reviewResponsibilitiesTitle")} onEdit={() => onEdit(1)}>
        <BulletList value={form.responsibilities} empty={t("recruiter.ops.jobs.form.reviewResponsibilitiesEmpty")} />
      </ReviewSection>
      <ReviewSection title={t("recruiter.ops.jobs.form.reviewBenefitsTitle")} onEdit={() => onEdit(1)}>
        <BulletList value={form.benefits} empty={t("recruiter.ops.jobs.form.reviewBenefitsEmpty")} />
      </ReviewSection>
      <ReviewSection title={t("recruiter.ops.jobs.form.reviewRequirementsTitle")} onEdit={() => onEdit(2)}>
        <p className="text-sm">
          {t("recruiter.ops.jobs.form.reviewExpEduSummary", {
            years: form.minYearsExperience ?? 0,
            education: getEducationDisplay(form.educationLevel ?? undefined, t),
          })}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {skills.length === 0 && <span className="text-sm text-[var(--color-on-surface-variant)]">{t("recruiter.ops.jobs.form.reviewSkillsEmpty")}</span>}
          {skills.map((skill) => (
            <span
              key={skill.name}
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium",
                skill.required ? "bg-[var(--color-primary-soft)] text-[var(--color-primary-hover)]" : "bg-[var(--color-surface-container-low)]",
              )}
            >
              {skill.name}{skill.required ? t("recruiter.ops.jobs.detail.requiredSkillSuffix") : ""}
            </span>
          ))}
        </div>
      </ReviewSection>
      <ReviewSection title={t("recruiter.ops.jobs.form.reviewScreeningTitle")} onEdit={() => onEdit(3)}>
        <p className="flex items-center gap-2 text-sm font-medium">
          <mode.icon className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
          {mode.label}
        </p>
        <p className="mt-0.5 text-sm text-[var(--color-on-surface-variant)]">
          {t("recruiter.ops.jobs.form.reviewScreeningSummary", {
            description: mode.description,
            cvThreshold: form.cvScreening?.passThreshold ?? INITIAL_CV.passThreshold,
            gateThreshold: form.gateScreening?.passThreshold ?? INITIAL_GATE.passThreshold,
          })}
        </p>
      </ReviewSection>
    </div>
  );
}

function ReviewSection({ title, onEdit, children }: { title: string; onEdit: () => void; children: ReactNode }) {
  const t = useT();
  return (
    <section className="rounded-2xl border border-[var(--color-border-default)] p-4">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold">
          <span className="h-4 w-1 rounded-full bg-[var(--color-primary)]" aria-hidden="true" />
          {title}
        </h3>
        <button
          type="button"
          onClick={onEdit}
          className="inline-flex min-h-8 items-center gap-1 rounded-lg px-2 text-xs font-medium text-[var(--color-primary)] transition-colors hover:bg-[var(--color-primary-subtle)]"
        >
          <Pencil className="size-3.5" aria-hidden="true" />
          {t("recruiter.ops.jobs.form.reviewEditBtn")}
        </button>
      </div>
      {children}
    </section>
  );
}

function MultilineText({ value, empty }: { value?: string; empty: string }) {
  if (!value?.trim()) return <p className="text-sm italic text-[var(--color-outline)]">{empty}</p>;
  return <p className="whitespace-pre-line text-sm leading-6">{value}</p>;
}

function BulletList({ value, empty }: { value?: string; empty: string }) {
  const lines = (value ?? "").split("\n").map((line) => line.replace(/^[-•*]\s*/, "").trim()).filter(Boolean);
  if (lines.length === 0) return <p className="text-sm italic text-[var(--color-outline)]">{empty}</p>;
  return (
    <ul className="list-disc space-y-1 pl-5 text-sm leading-6 marker:text-[var(--color-primary)]">
      {lines.map((line, index) => <li key={index}>{line}</li>)}
    </ul>
  );
}

function MetaChip({ icon: Icon, children }: { icon: LucideIcon; children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-surface-container-low)] px-2.5 py-1 text-xs text-[var(--color-on-surface-variant)]">
      <Icon className="size-3.5 shrink-0" aria-hidden="true" />
      {children}
    </span>
  );
}

function FieldGroup({ title, description, aside, children }: {
  title: string;
  description?: string;
  aside?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4 border-b border-[var(--color-border-default)] pb-6 last:border-b-0 last:pb-0">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold">{title}</h3>
          {description && <p className="mt-0.5 text-sm text-[var(--color-on-surface-variant)]">{description}</p>}
        </div>
        {aside}
      </div>
      {children}
    </section>
  );
}

function ChoiceGroup({ label, hideLabel, value, options, onChange, columns }: {
  label: string;
  hideLabel?: boolean;
  value: string;
  options: { value: string; label: string; icon?: LucideIcon; description?: string }[];
  onChange: (value: string) => void;
  columns: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className={cn("text-sm font-medium", hideLabel && "sr-only")}>{label}</span>
      <div role="radiogroup" aria-label={label} className={cn("grid grid-cols-2 gap-2", columns)}>
        {options.map((option) => {
          const active = option.value === value;
          const Icon = option.icon;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange(option.value)}
              className={cn(
                "relative flex min-h-11 items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]",
                active
                  ? "border-[var(--color-primary)] bg-[var(--color-primary-subtle)] ring-1 ring-[var(--color-primary)]"
                  : "border-[var(--color-border-default)] bg-[var(--color-surface-card)] hover:border-[var(--color-primary)]",
              )}
            >
              {Icon && (
                <span className={cn("grid size-8 shrink-0 place-items-center rounded-lg", active ? "bg-[var(--color-primary)] text-[var(--color-on-primary)]" : "bg-[var(--color-surface-container-low)] text-[var(--color-on-surface-variant)]")}>
                  <Icon className="size-4" aria-hidden="true" />
                </span>
              )}
              <span className="min-w-0 self-center">
                <span className={cn("block text-sm font-medium", active && "text-[var(--color-primary-hover)]")}>{option.label}</span>
                {option.description && <span className="mt-0.5 block text-xs leading-5 text-[var(--color-on-surface-variant)]">{option.description}</span>}
              </span>
              {active && <CheckCircle2 className="absolute right-2.5 top-2.5 size-4 text-[var(--color-primary)]" aria-hidden="true" />}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Segmented({ label, value, options, onChange }: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <span className="inline-flex rounded-lg bg-[var(--color-surface-container-low)] p-0.5" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          onClick={() => onChange(option.value)}
          className={cn(
            "h-8 rounded-md px-3 text-xs font-medium transition-colors",
            value === option.value
              ? "bg-[var(--color-surface-card)] text-[var(--color-primary-hover)] shadow-sm"
              : "text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)]",
          )}
        >
          {option.label}
        </button>
      ))}
    </span>
  );
}

function SwitchRow({ label, description, checked, onChange }: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-xl border border-[var(--color-border-default)] bg-[var(--color-surface-alt)] px-4 py-3">
      <span>
        <span className="block text-sm font-medium">{label}</span>
        <span className="block text-xs text-[var(--color-on-surface-variant)]">{description}</span>
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]",
          checked ? "bg-[var(--color-primary)]" : "bg-[var(--color-outline-variant)]",
        )}
      >
        <span className={cn("inline-block size-5 rounded-full bg-white shadow transition-transform motion-reduce:transition-none", checked ? "translate-x-[22px]" : "translate-x-0.5")} />
      </button>
    </div>
  );
}

function Field({ label, hint, error, counter, required, className, children }: {
  label: string;
  hint?: string;
  error?: string;
  counter?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={cn("flex flex-col gap-1.5", className)}>
      <span className="flex items-center justify-between gap-2 text-sm font-medium">
        <span>
          {label}
          {required && <span className="text-[var(--color-error)]" aria-hidden="true"> *</span>}
        </span>
        {counter && <span className="text-xs font-normal tabular-nums text-[var(--color-on-surface-variant)]">{counter}</span>}
      </span>
      {children}
      {error
        ? <span className="flex items-center gap-1 text-xs text-[var(--color-error)]"><AlertTriangle className="size-3.5 shrink-0" aria-hidden="true" />{error}</span>
        : hint && <span className="text-xs text-[var(--color-on-surface-variant)]">{hint}</span>}
    </label>
  );
}

function InlineError({ children }: { children: ReactNode }) {
  return (
    <p className="flex items-center gap-1.5 text-sm text-[var(--color-error)]">
      <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
      {children}
    </p>
  );
}

function ErrorBox({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="flex items-start gap-2 rounded-xl bg-[var(--color-error-container)] p-3 text-sm text-[var(--color-on-error-container)]">
      <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      {children}
    </p>
  );
}

function WeightField({ label, value, onChange, suffix = "%", hint, help }: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
  hint?: string;
  help?: string;
}) {
  const t = useT();
  const id = useId();
  const control = (
    <span className="relative block">
      <input
        id={id}
        className={`${input} pr-12 tabular-nums`}
        type="number"
        min={0}
        max={100}
        step={0.5}
        value={value}
        onChange={(e) => onChange(e.target.value === "" ? 0 : Number(e.target.value))}
      />
      <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-[var(--color-on-surface-variant)]">{suffix}</span>
    </span>
  );
  if (!help) return <Field label={label} hint={hint}>{control}</Field>;
  // Kept outside <label>: a button inside it would become the label's control instead of the input.
  return (
    <div className="relative flex flex-col gap-1.5">
      <span className="flex items-center gap-1.5 text-sm font-medium">
        <label htmlFor={id}>{label}</label>
        <span className="group inline-flex">
          <button
            type="button"
            aria-label={t("recruiter.ops.jobs.form.weightCalcAria", { label })}
            aria-describedby={`${id}-help`}
            className="grid size-5 place-items-center rounded-full text-[var(--color-outline)] transition-colors hover:text-brand-primary focus-visible:text-brand-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-primary"
          >
            <CircleHelp className="size-4" aria-hidden="true" />
          </button>
          <span
            id={`${id}-help`}
            role="tooltip"
            className="pointer-events-none invisible absolute inset-x-0 top-7 z-50 rounded-lg bg-[var(--color-text-primary)] p-3 text-xs font-normal leading-5 text-[var(--color-text-inverse)] opacity-0 shadow-lg transition-opacity group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100"
          >
            {help}
          </span>
        </span>
      </span>
      {control}
      {hint && <span className="text-xs text-[var(--color-on-surface-variant)]">{hint}</span>}
    </div>
  );
}

function TotalBadge({ total }: { total: number }) {
  const t = useT();
  const ok = total === 100;
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums", ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>
      {ok ? <CheckCircle2 className="size-3.5" aria-hidden="true" /> : <AlertTriangle className="size-3.5" aria-hidden="true" />}
      {t("recruiter.ops.jobs.form.totalBadge", { total })}
    </span>
  );
}

function TotalMeter({ total }: { total: number }) {
  const t = useT();
  const ok = total === 100;
  const diff = Math.round((100 - total) * 100) / 100;
  return (
    <div className="space-y-1.5">
      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--color-surface-container)]">
        <div
          className={cn("h-full rounded-full transition-[width] duration-200 motion-reduce:transition-none", total > 100 ? "bg-[var(--color-error)]" : "bg-[var(--color-primary)]")}
          style={{ width: `${Math.min(Math.max(total, 0), 100)}%` }}
        />
      </div>
      <p className={cn("text-xs", ok ? "text-[var(--color-on-surface-variant)]" : "text-[var(--color-error)]")} role="status">
        {ok
          ? t("recruiter.ops.jobs.form.totalExact")
          : diff > 0
            ? t("recruiter.ops.jobs.form.totalShortfall", { diff })
            : t("recruiter.ops.jobs.form.totalExcess", { diff: Math.abs(diff) })}
      </p>
    </div>
  );
}

function inputClass(error?: string) {
  return cn(input, error && "border-[var(--color-error)] focus-visible:outline-[var(--color-error)]");
}

function chipClass(active: boolean) {
  return cn(
    "inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-primary)]",
    active
      ? "border-[var(--color-primary)] bg-[var(--color-primary-soft)] text-[var(--color-primary-hover)]"
      : "border-[var(--color-border-default)] bg-[var(--color-surface-card)] text-[var(--color-on-surface)] hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-subtle)]",
  );
}

function labelOf(options: { value: string; label: string }[], value?: string) {
  return options.find((option) => option.value === value)?.label ?? value ?? "—";
}

function salaryText(form: JobUpsertRequest, t: TranslateFn) {
  if (!form.salaryVisible) return t("recruiter.ops.jobs.form.salaryNegotiable");
  return formatSalaryRange(form.salaryMin, form.salaryMax, form.salaryCurrency ?? "VND");
}

function formatLocalDateTime(value: string, locale: Locale) {
  return formatI18nDateTime(value, { dateStyle: "short", timeStyle: "short" }, locale);
}

function deadlineAfter(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(23, 59, 0, 0);
  return toDateTimeLocal(date.toISOString());
}

function toDateTimeLocal(value?: string | null) {
  if (!value) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value}T23:59`;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function payload(form: JobUpsertRequest): JobUpsertRequest {
  const skills = form.skills ?? [];
  const weight = skills.length === 0 ? 1 : Math.max(1, Math.round(100 / skills.length));
  return {
    ...form,
    deadline: form.deadline ? new Date(form.deadline).toISOString() : null,
    skills: skills.map((skill) => ({
      ...skill,
      name: skill.name.trim(),
      weight,
    })),
    cvScreening: form.cvScreening,
    gateScreening: form.gateScreening,
  };
}
