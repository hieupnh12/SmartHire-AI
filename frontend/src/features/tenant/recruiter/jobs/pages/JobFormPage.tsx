import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
const EDUCATION_LEVELS = ["Trung học phổ thông", "Cao đẳng", "Đại học", "Thạc sĩ", "Tiến sĩ"];
const EMPLOYMENT_TYPES = [
  { value: "FULL_TIME", label: "Toàn thời gian" },
  { value: "PART_TIME", label: "Bán thời gian" },
  { value: "CONTRACT", label: "Hợp đồng" },
  { value: "INTERNSHIP", label: "Thực tập" },
];
const WORK_MODES = [
  { value: "ONSITE", label: "Tại văn phòng", icon: Building2 },
  { value: "HYBRID", label: "Hybrid", icon: Shuffle },
  { value: "REMOTE", label: "Từ xa", icon: Laptop },
];
const SCREENING_MODES = [
  {
    value: "MANUAL",
    label: "Lọc thủ công",
    icon: UserCheck,
    description: "AI chấm điểm mọi CV, recruiter quyết định ai qua vòng CV.",
  },
  {
    value: "AUTO",
    label: "Lọc tự động",
    icon: Bot,
    description: "Hệ thống tự cho qua CV đạt ngưỡng và đủ kỹ năng bắt buộc.",
  },
];
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
const STEPS: Step[] = [
  {
    label: "Thông tin cơ bản",
    description: "Vị trí, hình thức làm việc và hạn nhận hồ sơ.",
    icon: BriefcaseBusiness,
    tip: "Tiêu đề rõ ràng, có cấp bậc và công nghệ chính (VD: “Senior Backend Developer (Java)”) giúp tin dễ được tìm thấy hơn.",
  },
  {
    label: "Mô tả & quyền lợi",
    description: "Nội dung tin tuyển dụng và mức lương.",
    icon: FileText,
    tip: "Mô tả cụ thể công việc hằng ngày. AI dùng nội dung này làm ngữ cảnh khi chấm CV, nên càng rõ thì điểm càng sát.",
  },
  {
    label: "Yêu cầu ứng viên",
    description: "Kinh nghiệm, học vấn và kỹ năng cần có.",
    icon: GraduationCap,
    tip: "Chỉ đặt Bắt buộc cho kỹ năng thật sự không thể thiếu. CV thiếu kỹ năng bắt buộc sẽ không đạt vòng CV.",
  },
  {
    label: "Sàng lọc & chấm điểm",
    description: "Chế độ lọc CV và trọng số chấm điểm.",
    icon: SlidersHorizontal,
    tip: "Trọng số mặc định phù hợp đa số vị trí kỹ thuật. Mỗi nhóm trọng số phải tổng đúng 100%.",
  },
  {
    label: "Xem lại & đăng",
    description: "Kiểm tra tin như ứng viên sẽ thấy.",
    icon: Eye,
    tip: "Tin đã đăng vẫn sửa được. Có thể lưu nháp để đồng nghiệp xem trước khi đăng.",
  },
];
const LAST_STEP = STEPS.length - 1;

type Issue = { step: number; key: string; message: string; invalid: boolean };

function weightSum(values: number[]) {
  return Math.round(values.reduce((sum, value) => sum + Number(value || 0), 0) * 100) / 100;
}

export function JobFormPage() {
  const { id } = useParams();
  const jobId = id && /^\d+$/.test(id) ? id : undefined;
  const editing = Boolean(jobId);
  const navigate = useNavigate();
  const client = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isAdmin = user?.role === "TENANT_ADMIN" || user?.role === "ADMIN" || user?.role === "SUPER_ADMIN";
  const canCreateJob = isAdmin || (user?.permissions?.includes("JOBS_CREATE") ?? false) || (user?.permissions?.includes("JOBS") ?? false);

  useEffect(() => {
    if (!editing && user && !canCreateJob) {
      toast.danger("Bạn không có quyền tạo tin tuyển dụng mới");
      navigate("/recruiter/jobs", { replace: true });
    }
  }, [editing, user, canCreateJob, navigate]);

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
      toast.danger(getApiErrorMessage(err, "Không thể lưu tin tuyển dụng"));
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
    { step: 0, key: "title", message: "Nhập tiêu đề tin tuyển dụng.", invalid: !form.title.trim() },
    { step: 0, key: "headcount", message: "Số lượng cần tuyển tối thiểu là 1.", invalid: !(Number(form.headcount) >= 1) },
    { step: 1, key: "salary", message: "Lương tối thiểu không được lớn hơn lương tối đa.", invalid: salaryInvalid },
    { step: 3, key: "cv", message: "Trọng số sàng lọc CV phải tổng đúng 100%.", invalid: cvTotal !== 100 },
    { step: 3, key: "gate", message: "Trọng số vòng gửi xe phải tổng đúng 100%.", invalid: gateTotal !== 100 },
  ];
  const publishIssues: Issue[] = [
    ...draftIssues,
    { step: 0, key: "deadline", message: "Hạn nhận hồ sơ phải sau thời điểm hiện tại.", invalid: deadlinePast },
    { step: 1, key: "description", message: "Nhập mô tả công việc để đăng tuyển.", invalid: !(form.description ?? "").trim() },
    { step: 2, key: "skills", message: "Chọn ít nhất 1 kỹ năng để đăng tuyển.", invalid: selected.length === 0 },
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
  const current = STEPS[step];
  const CurrentIcon = current.icon;
  const cancelTo = editing ? `/recruiter/jobs/${id}` : "/recruiter/jobs";
  return (
    <section className="mx-auto flex w-full max-w-[1440px] scroll-mt-24 flex-col gap-6 text-[var(--color-on-surface)] xl:h-full xl:min-h-0 xl:overflow-hidden">
      {existing.isError && <ErrorBox>{getApiErrorMessage(existing.error)}</ErrorBox>}

      <div className="grid items-start gap-6 lg:grid-cols-[256px_minmax(0,1fr)] xl:min-h-0 xl:flex-1 xl:grid-cols-[256px_minmax(0,1fr)_320px] xl:items-stretch">
        <Stepper step={step} complete={stepComplete} issues={activeIssues} onSelect={setStep} />
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
              <span className="shrink-0 rounded-full bg-white px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-primary)] shadow-sm">Bước {step + 1}/{STEPS.length}</span>
              <h2 className="text-base font-semibold leading-6">{current.label}</h2>
              <p className="min-w-0 flex-1 truncate text-xs text-[var(--color-on-surface-variant)] sm:text-right">{current.description}</p>
            </div>
          </div>

          <div ref={topRef} className="flex min-h-0 flex-1 scroll-mt-24 flex-col gap-6 px-6 py-5 xl:overflow-y-auto">
            {stepIssues.length > 0 && (
              <div role="alert" className="rounded-xl bg-[var(--color-error-container)] p-4 text-sm text-[var(--color-on-error-container)]">
                <p className="flex items-center gap-2 font-semibold">
                  <AlertTriangle className="size-4 shrink-0" aria-hidden="true" />
                  Cần sửa {stepIssues.length} mục trước khi tiếp tục
                </p>
                <ul className="mt-1.5 list-disc space-y-0.5 pl-10">
                  {stepIssues.map((issue) => <li key={issue.key}>{issue.message}</li>)}
                </ul>
              </div>
            )}

            {step === 0 && (
              <>
                <FieldGroup title="Vị trí tuyển dụng">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Tiêu đề tin tuyển dụng" required error={errorOf("title")} className="sm:col-span-2" counter={`${form.title.length}/120`}>
                      <input className={inputClass(errorOf("title"))} maxLength={120} placeholder="VD: Senior Backend Developer (Java)" value={form.title} onChange={(e) => set("title", e.target.value)} />
                    </Field>
                    <Field label="Phòng ban">
                      <select className={input} value={form.department} onChange={(e) => set("department", e.target.value)} disabled={directory.isPending}>
                        <option value="">Chọn phòng ban</option>
                        {(directory.data?.data.departments ?? []).map((value) => <option key={value} value={value}>{value}</option>)}
                      </select>
                    </Field>
                    <Field label="Số lượng cần tuyển" required error={errorOf("headcount")}>
                      <input className={cn(inputClass(errorOf("headcount")), "tabular-nums")} type="number" min={1} value={form.headcount ?? 1} onChange={(e) => set("headcount", Number(e.target.value))} />
                    </Field>
                  </div>
                </FieldGroup>

                <FieldGroup title="Hình thức làm việc">
                  <ChoiceGroup label="Loại hình" value={form.employmentType ?? "FULL_TIME"} options={EMPLOYMENT_TYPES} onChange={(v) => set("employmentType", v)} columns="sm:grid-cols-4" />
                  <ChoiceGroup label="Nơi làm việc" value={form.workMode ?? "HYBRID"} options={WORK_MODES} onChange={(v) => set("workMode", v)} columns="sm:grid-cols-3" />
                  <Field label="Địa điểm làm việc">
                    <span className="relative block">
                      <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-on-surface-variant)]" aria-hidden="true" />
                      <select className={cn(input, "pl-9")} value={form.location} onChange={(e) => set("location", e.target.value)} disabled={directory.isPending}>
                        <option value="">Chọn địa điểm công ty</option>
                        {(directory.data?.data.locations ?? []).map((value) => <option key={value} value={value}>{value}</option>)}
                      </select>
                    </span>
                  </Field>
                </FieldGroup>

                <FieldGroup title="Hạn nhận hồ sơ">
                  <Field label="Hết hạn đăng tin" error={errorOf("deadline")} hint="Hết giờ này job tự đóng và AI chấm toàn bộ CV chưa chấm.">
                    <input className={inputClass(errorOf("deadline"))} type="datetime-local" value={form.deadline ?? ""} onChange={(e) => set("deadline", e.target.value)} />
                  </Field>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs text-[var(--color-on-surface-variant)]">Chọn nhanh:</span>
                    {DEADLINE_PRESETS.map((days) => (
                      <button key={days} type="button" className={chipClass(false)} onClick={() => set("deadline", deadlineAfter(days))}>
                        {days} ngày
                      </button>
                    ))}
                    {form.deadline && (
                      <button type="button" className={chipClass(false)} onClick={() => set("deadline", "")}>
                        Không giới hạn
                      </button>
                    )}
                  </div>
                </FieldGroup>
              </>
            )}

            {step === 1 && (
              <>
                <FieldGroup title="Nội dung tin tuyển dụng">
                  <Field label="Mô tả công việc" required error={errorOf("description")} counter={`${(form.description ?? "").length} ký tự`}>
                    <textarea className={inputClass(errorOf("description"))} rows={7} placeholder={"Giới thiệu vị trí, đội ngũ và mục tiêu công việc.\nVD: Tham gia phát triển hệ thống thanh toán phục vụ 2 triệu người dùng…"} value={form.description} onChange={(e) => set("description", e.target.value)} />
                  </Field>
                  <Field label="Trách nhiệm chính" hint="Mỗi dòng một ý. Ứng viên sẽ thấy dạng danh sách.">
                    <textarea className={input} rows={5} placeholder={"Thiết kế và phát triển REST API\nReview code cho thành viên trong nhóm"} value={form.responsibilities} onChange={(e) => set("responsibilities", e.target.value)} />
                  </Field>
                  <Field label="Quyền lợi" hint="Mỗi dòng một ý.">
                    <textarea className={input} rows={5} placeholder={"Lương tháng 13, thưởng hiệu suất\nBảo hiểm sức khỏe cao cấp\n12 ngày phép/năm"} value={form.benefits} onChange={(e) => set("benefits", e.target.value)} />
                  </Field>
                </FieldGroup>

                <FieldGroup title="Mức lương">
                  <div className="grid gap-4 sm:grid-cols-[1fr_1fr_140px]">
                    <Field label="Từ" error={errorOf("salary")}>
                      <input className={cn(inputClass(errorOf("salary")), "tabular-nums")} type="number" min={0} placeholder="15000000" value={form.salaryMin ?? ""} onChange={(e) => set("salaryMin", e.target.value ? Number(e.target.value) : null)} />
                    </Field>
                    <Field label="Đến">
                      <input className={cn(inputClass(errorOf("salary")), "tabular-nums")} type="number" min={0} placeholder="30000000" value={form.salaryMax ?? ""} onChange={(e) => set("salaryMax", e.target.value ? Number(e.target.value) : null)} />
                    </Field>
                    <Field label="Tiền tệ">
                      <select className={input} value={form.salaryCurrency} onChange={(e) => set("salaryCurrency", e.target.value)}>
                        {CURRENCIES.map((currency) => <option key={currency} value={currency}>{currency}</option>)}
                        {form.salaryCurrency && !CURRENCIES.includes(form.salaryCurrency) && (
                          <option value={form.salaryCurrency}>{form.salaryCurrency}</option>
                        )}
                      </select>
                    </Field>
                  </div>
                  <SwitchRow
                    label="Hiển thị mức lương cho ứng viên"
                    description="Tắt để hiển thị “Thỏa thuận” trên trang tuyển dụng."
                    checked={Boolean(form.salaryVisible)}
                    onChange={(checked) => set("salaryVisible", checked)}
                  />
                </FieldGroup>
              </>
            )}

            {step === 2 && (
              <>
                <FieldGroup title="Kinh nghiệm & học vấn">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Số năm kinh nghiệm tối thiểu">
                      <span className="relative block">
                        <input className={cn(input, "pr-12 tabular-nums")} type="number" step="0.5" min={0} value={form.minYearsExperience ?? ""} onChange={(e) => set("minYearsExperience", e.target.value ? Number(e.target.value) : null)} />
                        <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-[var(--color-on-surface-variant)]">năm</span>
                      </span>
                    </Field>
                    <Field label="Trình độ học vấn">
                      <select className={input} value={form.educationLevel} onChange={(e) => set("educationLevel", e.target.value)}>
                        <option value="">Không yêu cầu</option>
                        {EDUCATION_LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}
                        {form.educationLevel && !EDUCATION_LEVELS.includes(form.educationLevel) && (
                          <option value={form.educationLevel}>{form.educationLevel}</option>
                        )}
                      </select>
                    </Field>
                  </div>
                </FieldGroup>

                <FieldGroup
                  title="Kỹ năng yêu cầu"
                  aside={(
                    <span className="rounded-full bg-[var(--color-primary-soft)] px-2.5 py-1 text-xs font-semibold text-[var(--color-primary-hover)]">
                      {selected.length} kỹ năng · {requiredCount} bắt buộc
                    </span>
                  )}
                >
                  {errorOf("skills") && <InlineError>{errorOf("skills")}</InlineError>}
                  <div className="flex gap-2">
                    <label className="relative block flex-1">
                      <span className="sr-only">Tìm hoặc thêm kỹ năng</span>
                      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--color-on-surface-variant)]" aria-hidden="true" />
                      <input
                        className={cn(input, "pl-9")}
                        placeholder="Tìm kỹ năng hoặc nhập kỹ năng mới rồi nhấn Enter"
                        value={skillQuery}
                        onChange={(e) => setSkillQuery(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomSkill(); } }}
                      />
                    </label>
                    <Button variant="secondary" disabled={!canAddCustom} onClick={addCustomSkill}>
                      <Plus className="size-4" aria-hidden="true" />
                      Thêm
                    </Button>
                  </div>

                  <div className="space-y-4">
                    {catalog.length === 0 && (
                      <p className="text-sm text-[var(--color-on-surface-variant)]">Không có trong danh mục. Nhấn “Thêm” để dùng kỹ năng “{skillQuery.trim()}”.</p>
                    )}
                    {catalog.map((group) => (
                      <div key={group.category} className="space-y-2">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">{group.label}</p>
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
                    <p className="text-sm font-semibold">Kỹ năng đã chọn</p>
                    {selected.length === 0 && (
                      <p className="text-sm text-[var(--color-on-surface-variant)]">Chưa chọn kỹ năng nào. Cần ít nhất 1 kỹ năng để đăng tuyển.</p>
                    )}
                    <ul className="flex flex-col gap-2">
                      {selected.map((skill) => (
                        <li key={skill.name} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-[var(--color-surface-card)] px-3 py-2">
                          <span className="text-sm font-medium">{skill.name}</span>
                          <span className="flex items-center gap-2">
                            <Segmented
                              label={`Mức yêu cầu của ${skill.name}`}
                              value={skill.required ? "required" : "optional"}
                              options={[{ value: "required", label: "Bắt buộc" }, { value: "optional", label: "Tùy chọn" }]}
                              onChange={(value) => { if ((value === "required") !== skill.required) toggleRequired(skill.name); }}
                            />
                            <button
                              type="button"
                              aria-label={`Bỏ ${skill.name}`}
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
                <FieldGroup title="Chế độ sàng lọc CV" description="Khi job đóng, AI luôn chấm toàn bộ CV chưa chấm. Chế độ quyết định ai cho ứng viên qua vòng CV.">
                  <ChoiceGroup
                    label="Chế độ sàng lọc CV"
                    hideLabel
                    value={form.screeningMode ?? "MANUAL"}
                    options={SCREENING_MODES}
                    onChange={(v) => set("screeningMode", v)}
                    columns="sm:grid-cols-2"
                  />
                </FieldGroup>

                <FieldGroup
                  title="Trọng số sàng lọc CV"
                  description="Chỉ dùng để tính điểm CV. Tổng phải bằng 100%."
                  aside={<TotalBadge total={cvTotal} />}
                >
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <WeightField label="Kỹ năng bắt buộc" value={cv.skillWeight} onChange={(v) => setCv("skillWeight", v)} />
                    <WeightField label="Kỹ năng tùy chọn" value={cv.preferredWeight} onChange={(v) => setCv("preferredWeight", v)} />
                    <WeightField label="Kinh nghiệm" value={cv.experienceWeight} onChange={(v) => setCv("experienceWeight", v)} />
                    <WeightField label="Học vấn" value={cv.educationWeight} onChange={(v) => setCv("educationWeight", v)} />
                    <WeightField label="Jaccard" value={cv.jaccardWeight} onChange={(v) => setCv("jaccardWeight", v)} />
                    <WeightField label="Ngữ nghĩa (Gemini)" value={cv.semanticWeight} onChange={(v) => setCv("semanticWeight", v)} />
                  </div>
                  <TotalMeter total={cvTotal} />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <WeightField
                      label="Ngưỡng đạt CV"
                      suffix="/100"
                      value={cv.passThreshold}
                      onChange={(v) => setCv("passThreshold", v)}
                      hint="CV đạt khi điểm ≥ ngưỡng và không thiếu kỹ năng bắt buộc."
                    />
                  </div>
                </FieldGroup>

                <FieldGroup
                  title="Trọng số vòng gửi xe"
                  description="Tổng hợp điểm CV, phỏng vấn AI và bài kiểm tra. Độc lập với trọng số CV."
                  aside={<TotalBadge total={gateTotal} />}
                >
                  <div className="grid gap-4 sm:grid-cols-3">
                    <WeightField label="Điểm CV" value={gate.cvWeight} onChange={(v) => setGate("cvWeight", v)} />
                    <WeightField label="Phỏng vấn AI" value={gate.aiInterviewWeight} onChange={(v) => setGate("aiInterviewWeight", v)} />
                    <WeightField label="Bài kiểm tra" value={gate.assessmentWeight} onChange={(v) => setGate("assessmentWeight", v)} />
                  </div>
                  <TotalMeter total={gateTotal} />
                  <div className="grid gap-4 sm:grid-cols-2">
                    <WeightField
                      label="Ngưỡng đạt vòng gửi xe"
                      suffix="/100"
                      value={gate.passThreshold}
                      onChange={(v) => setGate("passThreshold", v)}
                      hint="Chỉ đạt khi đã có đủ điểm các vòng có trọng số > 0."
                    />
                  </div>
                </FieldGroup>
              </>
            )}

            {step === 4 && <ReviewStep form={form} onEdit={setStep} />}
          </div>

          <div className="z-10 flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-b-3xl border-t border-[var(--color-border-default)] bg-[var(--color-surface-card)]/95 px-6 py-4 backdrop-blur">
            <div className="flex flex-wrap items-center gap-2">
              <Link to={cancelTo} className="inline-flex min-h-10 items-center justify-center rounded-[var(--radius-md)] px-3 text-sm font-medium text-[var(--color-on-surface-variant)] transition-colors hover:bg-[var(--color-surface-container-low)] hover:text-[var(--color-on-surface)]">
                Hủy
              </Link>
              {step < LAST_STEP && (
                <Button variant="secondary" disabled={save.isPending} onClick={() => submit(false)}>
                  <Save className="size-4" aria-hidden="true" />
                  {editing ? "Lưu thay đổi" : "Lưu nháp"}
                </Button>
              )}
            </div>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              {step > 0 && (
                <Button variant="ghost" onClick={() => setStep((s) => Math.max(s - 1, 0))}>
                  <ArrowLeft className="size-4" aria-hidden="true" />
                  Quay lại
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
                  Tiếp tục
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Button>
              ) : editing && status !== "DRAFT" ? (
                <Button disabled={save.isPending} onClick={() => submit(false)}>
                  <Save className="size-4" aria-hidden="true" />
                  {save.isPending ? "Đang lưu…" : "Lưu thay đổi"}
                </Button>
              ) : (
                <Button disabled={save.isPending} onClick={() => submit(true)}>
                  <Send className="size-4" aria-hidden="true" />
                  {save.isPending ? "Đang đăng…" : "Đăng tuyển"}
                </Button>
              )}
            </div>
          </div>
        </form>

        <aside className="flex flex-col gap-4 lg:col-start-2 xl:col-start-3 xl:row-start-1 xl:h-full xl:overflow-hidden">
          <PreviewCard form={form} />
          <div className={cn(panel, "space-y-3 p-5")}>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold">Sẵn sàng đăng tuyển</h2>
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
                    <span className={issue.invalid ? "text-[var(--color-on-surface-variant)]" : ""}>{CHECK_LABEL[issue.key]}</span>
                    <span className="sr-only">{issue.invalid ? "(chưa xong)" : "(đã xong)"}</span>
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

const CHECK_LABEL: Record<string, string> = {
  title: "Tiêu đề tin tuyển dụng",
  headcount: "Số lượng cần tuyển",
  salary: "Khoảng lương hợp lệ",
  cv: "Trọng số CV đủ 100%",
  gate: "Trọng số vòng gửi xe đủ 100%",
  deadline: "Hạn nhận hồ sơ trong tương lai",
  description: "Mô tả công việc",
  skills: "Ít nhất 1 kỹ năng",
};

function Stepper({ step, complete, issues, onSelect }: {
  step: number;
  complete: boolean[];
  issues: Issue[];
  onSelect: (step: number) => void;
}) {
  return (
    <nav aria-label="Các bước đăng tin" className={cn(panel, "p-4 lg:sticky lg:top-24 lg:p-3")}>
      <div className="lg:hidden">
        <p className="mb-3 text-sm font-semibold">Bước {step + 1}/{STEPS.length}: {STEPS[step].label}</p>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--color-surface-container)]">
          <div className="h-full rounded-full bg-[var(--color-primary)]" style={{ width: `${((step + 1) / STEPS.length) * 100}%` }} />
        </div>
      </div>
      <p className="hidden px-2 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)] lg:block">
        Các bước đăng tin
      </p>
      <ol className="hidden flex-col lg:flex">
        {STEPS.map((item, index) => {
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
                {hasIssue && <span className="sr-only">(cần sửa)</span>}
                {done && <span className="sr-only">(đã xong)</span>}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function PreviewCard({ form }: { form: JobUpsertRequest }) {
  const skills = form.skills ?? [];
  return (
    <div className={cn(panel, "space-y-4 p-5")}>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[var(--color-on-surface-variant)]">Xem trước tin đăng</p>
      <div className="space-y-1">
        <h3 className={cn("text-base font-semibold leading-6", !form.title.trim() && "text-[var(--color-outline)]")}>
          {form.title.trim() || "Tiêu đề tin tuyển dụng"}
        </h3>
        {form.department && <p className="text-xs text-[var(--color-on-surface-variant)]">{form.department}</p>}
      </div>
      <p className="flex items-center gap-2 text-sm font-semibold text-[var(--color-primary-hover)]">
        <Wallet className="size-4 shrink-0" aria-hidden="true" />
        {salaryText(form)}
      </p>
      <div className="flex flex-wrap gap-1.5">
        <MetaChip icon={MapPin}>{form.location?.trim() || "Chưa có địa điểm"}</MetaChip>
        <MetaChip icon={BriefcaseBusiness}>{labelOf(EMPLOYMENT_TYPES, form.employmentType)}</MetaChip>
        <MetaChip icon={Building2}>{labelOf(WORK_MODES, form.workMode)}</MetaChip>
        <MetaChip icon={Users}>{form.headcount ?? 1} người</MetaChip>
        {form.deadline && <MetaChip icon={CalendarClock}>Hạn {formatDateTime(form.deadline)}</MetaChip>}
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

function ReviewStep({ form, onEdit }: { form: JobUpsertRequest; onEdit: (step: number) => void }) {
  const skills = form.skills ?? [];
  const mode = SCREENING_MODES.find((item) => item.value === form.screeningMode) ?? SCREENING_MODES[0];
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-container-low)] p-5">
        <h3 className="text-xl font-semibold">{form.title.trim() || "Tiêu đề tin tuyển dụng"}</h3>
        <p className="mt-1 flex items-center gap-2 text-sm font-semibold text-[var(--color-primary-hover)]">
          <Wallet className="size-4" aria-hidden="true" />
          {salaryText(form)}
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <MetaChip icon={MapPin}>{form.location?.trim() || "Chưa có địa điểm"}</MetaChip>
          <MetaChip icon={BriefcaseBusiness}>{labelOf(EMPLOYMENT_TYPES, form.employmentType)}</MetaChip>
          <MetaChip icon={Building2}>{labelOf(WORK_MODES, form.workMode)}</MetaChip>
          <MetaChip icon={Users}>{form.headcount ?? 1} người</MetaChip>
          <MetaChip icon={CalendarClock}>{form.deadline ? `Hạn ${formatDateTime(form.deadline)}` : "Không giới hạn thời gian"}</MetaChip>
        </div>
      </div>

      <ReviewSection title="Mô tả công việc" onEdit={() => onEdit(1)}>
        <MultilineText value={form.description} empty="Chưa có mô tả." />
      </ReviewSection>
      <ReviewSection title="Trách nhiệm chính" onEdit={() => onEdit(1)}>
        <BulletList value={form.responsibilities} empty="Chưa nhập trách nhiệm." />
      </ReviewSection>
      <ReviewSection title="Quyền lợi" onEdit={() => onEdit(1)}>
        <BulletList value={form.benefits} empty="Chưa nhập quyền lợi." />
      </ReviewSection>
      <ReviewSection title="Yêu cầu ứng viên" onEdit={() => onEdit(2)}>
        <p className="text-sm">
          Tối thiểu {form.minYearsExperience ?? 0} năm kinh nghiệm · Học vấn: {form.educationLevel || "Không yêu cầu"}
        </p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {skills.length === 0 && <span className="text-sm text-[var(--color-on-surface-variant)]">Chưa chọn kỹ năng.</span>}
          {skills.map((skill) => (
            <span
              key={skill.name}
              className={cn(
                "rounded-full px-2.5 py-0.5 text-xs font-medium",
                skill.required ? "bg-[var(--color-primary-soft)] text-[var(--color-primary-hover)]" : "bg-[var(--color-surface-container-low)]",
              )}
            >
              {skill.name}{skill.required ? " · Bắt buộc" : ""}
            </span>
          ))}
        </div>
      </ReviewSection>
      <ReviewSection title="Sàng lọc" onEdit={() => onEdit(3)}>
        <p className="flex items-center gap-2 text-sm font-medium">
          <mode.icon className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
          {mode.label}
        </p>
        <p className="mt-0.5 text-sm text-[var(--color-on-surface-variant)]">
          {mode.description} Ngưỡng CV {form.cvScreening?.passThreshold ?? INITIAL_CV.passThreshold}/100 · Ngưỡng vòng gửi xe {form.gateScreening?.passThreshold ?? INITIAL_GATE.passThreshold}/100.
        </p>
      </ReviewSection>
    </div>
  );
}

function ReviewSection({ title, onEdit, children }: { title: string; onEdit: () => void; children: ReactNode }) {
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
          Sửa
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

function WeightField({ label, value, onChange, suffix = "%", hint }: {
  label: string;
  value: number;
  onChange: (value: number) => void;
  suffix?: string;
  hint?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      <span className="relative block">
        <input
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
    </Field>
  );
}

function TotalBadge({ total }: { total: number }) {
  const ok = total === 100;
  return (
    <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold tabular-nums", ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>
      {ok ? <CheckCircle2 className="size-3.5" aria-hidden="true" /> : <AlertTriangle className="size-3.5" aria-hidden="true" />}
      Tổng {total}%
    </span>
  );
}

function TotalMeter({ total }: { total: number }) {
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
        {ok ? "Đã đủ 100%." : diff > 0 ? `Còn thiếu ${diff}% để đủ 100%.` : `Vượt ${Math.abs(diff)}% so với 100%.`}
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

function salaryText(form: JobUpsertRequest) {
  if (!form.salaryVisible) return "Thỏa thuận";
  return formatSalaryRange(form.salaryMin, form.salaryMax, form.salaryCurrency ?? "VND");
}

function formatDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });
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
