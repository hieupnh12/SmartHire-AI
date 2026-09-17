import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { jobApi } from "@/api/tenant/jobApi";
import type { JobUpsertRequest } from "@/api/types/job";
import { getApiErrorMessage } from "@/lib/axios";
import { queryKeys } from "@/lib/query-keys";
import { Button } from "@/components/ux/Button";
import { button, input, muted, panel } from "@/features/tenant/recruiter/matching/components/rankingUi";
import { SKILL_CATALOG } from "@/features/tenant/recruiter/jobs/skillCatalog";

const field = "space-y-1 text-sm";
const EDUCATION_LEVELS = ["Trung học phổ thông", "Cao đẳng", "Đại học", "Thạc sĩ", "Tiến sĩ"];

export function JobFormPage() {
  const { id } = useParams();
  const editing = Boolean(id);
  const navigate = useNavigate();
  const existing = useQuery({
    queryKey: queryKeys.jobs.detail(id ?? 0),
    queryFn: () => jobApi.get(id!),
    enabled: editing,
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
    headcount: 1,
    deadline: "",
    salaryMin: undefined,
    salaryMax: undefined,
    salaryCurrency: "VND",
    salaryVisible: true,
    minYearsExperience: 1,
    educationLevel: "",
    skills: [],
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
      headcount: job.headcount ?? 1,
      deadline: job.deadline ?? "",
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
    });
  }, [existing.data]);

  const status = existing.data?.data?.status;
  const alreadyPublished = status === "PUBLISHED";
  const selected = form.skills ?? [];
  const selectedNames = useMemo(() => new Set(selected.map((skill) => skill.name.toLowerCase())), [selected]);

  const save = useMutation({
    mutationFn: async (publish: boolean) => {
      const body = payload(form);
      const saved = editing ? await jobApi.update(id!, body) : await jobApi.create(body);
      if (!publish || saved.data.status === "PUBLISHED") return saved;
      return jobApi.publish(saved.data.id);
    },
    onSuccess: (response) => navigate(`/recruiter/jobs/${response.data.id}`),
  });

  const set = (key: keyof JobUpsertRequest, value: string | number | boolean | null) => {
    setForm((current) => ({ ...current, [key]: value }));
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

  return (
    <section className="space-y-6 text-[var(--color-on-surface)]">
      <header>
        <p className={muted}>Tuyển dụng / Việc làm</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight">{editing ? "Sửa job" : "Tạo job mới"}</h1>
      </header>
      {existing.isError && <p role="alert">{getApiErrorMessage(existing.error)}</p>}
      <form className="grid gap-6 lg:grid-cols-2" onSubmit={(e) => { e.preventDefault(); save.mutate(false); }}>
        <div className={`${panel} space-y-4`}>
          <label className={field}><span>Tiêu đề</span><input className={input} required value={form.title} onChange={(e) => set("title", e.target.value)} /></label>
          <label className={field}><span>Mô tả</span><textarea className={input} rows={5} value={form.description} onChange={(e) => set("description", e.target.value)} /></label>
          <label className={field}><span>Trách nhiệm</span><textarea className={input} rows={4} value={form.responsibilities} onChange={(e) => set("responsibilities", e.target.value)} /></label>
          <label className={field}><span>Quyền lợi</span><textarea className={input} rows={4} value={form.benefits} onChange={(e) => set("benefits", e.target.value)} /></label>
        </div>
        <div className={`${panel} space-y-4`}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={field}><span>Địa điểm</span><input className={input} value={form.location} onChange={(e) => set("location", e.target.value)} /></label>
            <label className={field}><span>Phòng ban</span><input className={input} value={form.department} onChange={(e) => set("department", e.target.value)} /></label>
            <label className={field}><span>Employment type</span>
              <select className={input} value={form.employmentType} onChange={(e) => set("employmentType", e.target.value)}>
                <option value="FULL_TIME">Full-time</option>
                <option value="PART_TIME">Part-time</option>
                <option value="CONTRACT">Contract</option>
                <option value="INTERNSHIP">Internship</option>
              </select>
            </label>
            <label className={field}><span>Work mode</span>
              <select className={input} value={form.workMode} onChange={(e) => set("workMode", e.target.value)}>
                <option value="ONSITE">Onsite</option>
                <option value="HYBRID">Hybrid</option>
                <option value="REMOTE">Remote</option>
              </select>
            </label>
            <label className={field}><span>Số lượng</span><input className={input} type="number" min={1} value={form.headcount ?? 1} onChange={(e) => set("headcount", Number(e.target.value))} /></label>
            <label className={field}><span>Deadline</span><input className={input} type="date" value={form.deadline ?? ""} onChange={(e) => set("deadline", e.target.value)} /></label>
            <label className={field}><span>Lương min</span><input className={input} type="number" value={form.salaryMin ?? ""} onChange={(e) => set("salaryMin", e.target.value ? Number(e.target.value) : null)} /></label>
            <label className={field}><span>Lương max</span><input className={input} type="number" value={form.salaryMax ?? ""} onChange={(e) => set("salaryMax", e.target.value ? Number(e.target.value) : null)} /></label>
            <label className={field}><span>Currency</span><input className={input} value={form.salaryCurrency} onChange={(e) => set("salaryCurrency", e.target.value)} /></label>
            <label className={`${field} flex items-center gap-2 pt-6`}>
              <input type="checkbox" checked={form.salaryVisible} onChange={(e) => set("salaryVisible", e.target.checked)} />
              <span>Hiện lương trên trang public</span>
            </label>
            <label className={field}><span>Số năm KN tối thiểu</span><input className={input} type="number" step="0.5" value={form.minYearsExperience ?? ""} onChange={(e) => set("minYearsExperience", e.target.value ? Number(e.target.value) : null)} /></label>
            <label className={field}><span>Trình độ học vấn</span>
              <select className={input} value={form.educationLevel} onChange={(e) => set("educationLevel", e.target.value)}>
                <option value="">Không yêu cầu</option>
                {EDUCATION_LEVELS.map((level) => <option key={level} value={level}>{level}</option>)}
                {form.educationLevel && !EDUCATION_LEVELS.includes(form.educationLevel) && (
                  <option value={form.educationLevel}>{form.educationLevel}</option>
                )}
              </select>
            </label>
          </div>
        </div>
        <div className={`${panel} space-y-4 lg:col-span-2`}>
          <div>
            <p className="font-semibold">Skill yêu cầu (catalog matching CV)</p>
            <p className={muted}>Tích skill theo nhóm. Click lại chip đã chọn để đổi bắt buộc / tùy chọn. Trọng số chia đều khi lưu.</p>
          </div>
          {SKILL_CATALOG.map((group) => (
            <div key={group.category} className="space-y-2">
              <p className="text-sm font-semibold">{group.label}</p>
              <div className="flex flex-wrap gap-2">
                {group.skills.map((name) => {
                  const active = selectedNames.has(name.toLowerCase());
                  const row = selected.find((skill) => skill.name.toLowerCase() === name.toLowerCase());
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => toggleSkill(name, group.category)}
                      className={`rounded-full border px-3 py-1.5 text-sm font-medium ${
                        active
                          ? "border-brand-primary bg-brand-primary text-white"
                          : "border-[var(--color-border-default)] bg-white text-[var(--color-on-surface)] hover:border-brand-primary"
                      }`}
                    >
                      {name}{active && row?.required ? " · bắt buộc" : active ? " · tùy chọn" : ""}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {selected.length > 0 && (
            <div className="flex flex-wrap gap-2 border-t border-[var(--color-border-default)] pt-3">
              {selected.map((skill) => (
                <button
                  key={skill.name}
                  type="button"
                  className={button}
                  onClick={() => toggleRequired(skill.name)}
                >
                  {skill.name}: {skill.required ? "bắt buộc" : "tùy chọn"}
                </button>
              ))}
            </div>
          )}
        </div>
        {save.isError && <p role="alert" className="lg:col-span-2">{getApiErrorMessage(save.error)}</p>}
        <div className="flex flex-wrap gap-3 lg:col-span-2">
          {!alreadyPublished && (
            <Button type="submit" disabled={save.isPending}>{save.isPending ? "Đang lưu…" : "Lưu nháp"}</Button>
          )}
          <Button
            type={alreadyPublished ? "submit" : "button"}
            disabled={save.isPending || selected.length === 0}
            onClick={alreadyPublished ? undefined : () => save.mutate(true)}
          >
            {alreadyPublished ? (save.isPending ? "Đang lưu…" : "Lưu tin đăng") : "Đăng tuyển"}
          </Button>
          <Link to={editing ? `/recruiter/jobs/${id}` : "/recruiter/jobs"}>
            <Button type="button" variant="secondary">Hủy</Button>
          </Link>
          {selected.length === 0 && <p className={muted}>Chọn ít nhất 1 skill trước khi đăng tuyển.</p>}
        </div>
      </form>
    </section>
  );
}

function payload(form: JobUpsertRequest): JobUpsertRequest {
  const skills = form.skills ?? [];
  const weight = skills.length === 0 ? 1 : Math.max(1, Math.round(100 / skills.length));
  return {
    ...form,
    deadline: form.deadline || null,
    skills: skills.map((skill) => ({
      ...skill,
      name: skill.name.trim(),
      weight,
    })),
  };
}
