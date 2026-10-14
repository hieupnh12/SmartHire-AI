import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Bell, ChevronRight, KeyRound, Trash2, UserRound } from "lucide-react";
import { authApi } from "@/api/tenant/authApi";
import { Button } from "@/components/ux/Button";
import { LoadingState, SkeletonCard } from "@/components/ux/Skeleton";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";
import type { AccountProfile } from "@/features/tenant/auth/types";
import { getApiErrorMessage } from "@/lib/axios";
import { toast } from "@/stores/toastStore";
import { useUiStore } from "@/stores/uiStore";

const profileSchema = z.object({
  fullName: z.string().trim().min(1, "Họ tên không được để trống").max(255, "Họ tên tối đa 255 ký tự"),
  phone: z.string().trim().max(32, "Số điện thoại tối đa 32 ký tự").regex(/^$|^[+0-9 ()-]{8,32}$/, "Số điện thoại không hợp lệ"),
  headline: z.string().trim().max(255, "Tiêu đề hồ sơ tối đa 255 ký tự"),
  bio: z.string().trim().max(2000, "Giới thiệu tối đa 2000 ký tự"),
});
type ProfileForm = z.infer<typeof profileSchema>;

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Mật khẩu hiện tại không được để trống"),
  newPassword: z.string().min(6, "Mật khẩu mới tối thiểu 6 ký tự"),
  confirmPassword: z.string(),
}).refine((value) => value.newPassword === value.confirmPassword, { path: ["confirmPassword"], message: "Mật khẩu xác nhận không khớp" });
type PasswordForm = z.infer<typeof passwordSchema>;

const inputClass = "min-h-11 w-full rounded-lg border border-[var(--color-border-default)] bg-white px-3.5 text-sm outline-none transition-colors focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/15 disabled:bg-[var(--color-surface-alt)] disabled:text-[var(--color-on-surface-variant)]";
const PROFILE_KEY = ["auth", "account-profile"] as const;

export function CandidateAccountPage() {
  const profile = useQuery({ queryKey: PROFILE_KEY, queryFn: authApi.profile });

  return <section className="mx-auto max-w-3xl space-y-6 text-[var(--color-on-surface)]" aria-labelledby="account-title">
    <header className="rounded-3xl border border-[var(--color-border-default)] bg-[linear-gradient(135deg,var(--color-primary-subtle),white_58%)] px-5 py-6 shadow-[var(--shadow-card)] sm:px-7">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--color-primary)]">Tài khoản</p>
      <h1 id="account-title" className="mt-2 text-3xl font-semibold tracking-tight">Cài đặt tài khoản</h1>
      <p className="mt-2 text-sm leading-6 text-[var(--color-on-surface-variant)]">Cập nhật thông tin cá nhân, mật khẩu và tùy chọn thông báo của bạn.</p>
    </header>

    {profile.isPending && <LoadingState className="space-y-3" label="Đang tải tài khoản">{[0, 1].map((item) => <SkeletonCard key={item} className="min-h-48" />)}</LoadingState>}
    {profile.error && <div role="alert" className="flex flex-wrap items-center gap-3 rounded-xl bg-[var(--color-error-container)] p-4 text-sm text-[var(--color-on-error-container)]"><p>{getApiErrorMessage(profile.error)}</p><Button variant="secondary" size="sm" onClick={() => profile.refetch()}>Thử lại</Button></div>}

    {profile.data && <>
      <ProfileSection profile={profile.data} />
      <PasswordSection hasPassword={profile.data.hasPassword} />
      <Link to="/notifications?tab=settings" className="flex items-center gap-4 rounded-2xl border border-[var(--color-border-default)] bg-white p-5 shadow-[var(--shadow-card)] transition-colors hover:bg-[var(--color-surface-alt)]">
        <SectionIcon icon={Bell} />
        <span className="min-w-0 flex-1"><span className="block font-semibold">Tùy chọn thông báo</span><span className="block text-sm text-[var(--color-on-surface-variant)]">Chọn kênh và loại thông báo bạn muốn nhận.</span></span>
        <ChevronRight className="size-5 text-[var(--color-on-surface-variant)]" aria-hidden="true" />
      </Link>
      <EraseDataSection />
    </>}
  </section>;
}

function EraseDataSection() {
  const navigate = useNavigate();
  const askConfirm = useUiStore((state) => state.askConfirm);
  const logout = useAuthStore((state) => state.logout);
  const confirmErase = () => askConfirm({
    title: "Xoá dữ liệu cá nhân?",
    description: "Hồ sơ, CV và dữ liệu trích xuất từ CV sẽ bị xoá vĩnh viễn và bạn sẽ được đăng xuất. Lịch sử kết quả các vòng tuyển dụng đã kết thúc vẫn được giữ (không kèm thông tin cá nhân) để áp dụng quy định ứng tuyển.",
    danger: true,
    confirmLabel: "Xoá dữ liệu",
    onConfirm: async () => {
      await authApi.eraseProfile();
      logout();
      toast.success("Đã xoá dữ liệu cá nhân");
      navigate("/");
    },
  });

  return <section className="rounded-2xl border border-[var(--color-error)]/30 bg-white p-5 shadow-[var(--shadow-card)] sm:p-6" aria-labelledby="erase-title">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
      <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--color-error-container)] text-[var(--color-error)]"><Trash2 className="size-5" aria-hidden="true" /></span>
      <div className="min-w-0 flex-1">
        <h2 id="erase-title" className="font-semibold">Xoá dữ liệu cá nhân</h2>
        <p className="text-sm text-[var(--color-on-surface-variant)]">Chỉ thực hiện được khi bạn không còn đơn ứng tuyển đang xét.</p>
      </div>
      <Button variant="danger" onClick={confirmErase}>Xoá dữ liệu</Button>
    </div>
  </section>;
}

function ProfileSection({ profile }: { profile: AccountProfile }) {
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const form = useForm<ProfileForm>({ resolver: zodResolver(profileSchema), defaultValues: toForm(profile) });
  const { register, handleSubmit, reset, formState: { errors, isDirty } } = form;

  useEffect(() => reset(toForm(profile)), [profile, reset]);

  const save = useMutation({
    mutationFn: authApi.updateProfile,
    onSuccess: (saved) => {
      queryClient.setQueryData(PROFILE_KEY, saved);
      if (user) setUser({ ...user, fullName: saved.fullName, phone: saved.phone, headline: saved.headline, bio: saved.bio });
      toast.success("Đã cập nhật hồ sơ");
    },
    onError: (error) => toast.danger(getApiErrorMessage(error)),
  });

  return <form onSubmit={handleSubmit((value) => save.mutate({ fullName: value.fullName, phone: value.phone || null, headline: value.headline || null, bio: value.bio || null }))}
    className="rounded-2xl border border-[var(--color-border-default)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-6" aria-labelledby="profile-title" noValidate>
    <div className="mb-5 flex items-center gap-4"><SectionIcon icon={UserRound} /><div><h2 id="profile-title" className="font-semibold">Thông tin cá nhân</h2><p className="text-sm text-[var(--color-on-surface-variant)]">Nhà tuyển dụng sẽ thấy các thông tin này khi xem hồ sơ của bạn.</p></div></div>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Họ và tên" error={errors.fullName?.message}><input {...register("fullName")} autoComplete="name" className={inputClass} /></Field>
      <Field label="Email"><input value={profile.email} disabled className={inputClass} /></Field>
      <Field label="Số điện thoại" error={errors.phone?.message}><input {...register("phone")} type="tel" autoComplete="tel" placeholder="0901 234 567" className={inputClass} /></Field>
      <Field label="Tiêu đề hồ sơ" error={errors.headline?.message}><input {...register("headline")} placeholder="VD: Backend Developer" className={inputClass} /></Field>
      <div className="sm:col-span-2"><Field label="Giới thiệu bản thân" error={errors.bio?.message}><textarea {...register("bio")} rows={4} className={`${inputClass} py-2.5`} /></Field></div>
    </div>
    <div className="mt-5 flex justify-end gap-2">
      <Button type="button" variant="ghost" disabled={!isDirty || save.isPending} onClick={() => reset(toForm(profile))}>Hủy</Button>
      <Button type="submit" disabled={!isDirty || save.isPending}>{save.isPending ? "Đang lưu…" : "Lưu thay đổi"}</Button>
    </div>
  </form>;
}

function PasswordSection({ hasPassword }: { hasPassword: boolean }) {
  const { register, handleSubmit, reset, formState: { errors } } = useForm<PasswordForm>({ resolver: zodResolver(passwordSchema), defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" } });
  const change = useMutation({
    mutationFn: authApi.changePassword,
    onSuccess: () => { reset(); toast.success("Đổi mật khẩu thành công"); },
    onError: (error) => toast.danger(getApiErrorMessage(error)),
  });

  return <section className="rounded-2xl border border-[var(--color-border-default)] bg-white p-5 shadow-[var(--shadow-card)] sm:p-6" aria-labelledby="password-title">
    <div className="mb-5 flex items-center gap-4"><SectionIcon icon={KeyRound} /><div><h2 id="password-title" className="font-semibold">Đổi mật khẩu</h2><p className="text-sm text-[var(--color-on-surface-variant)]">Dùng mật khẩu tối thiểu 6 ký tự và không trùng mật khẩu cũ.</p></div></div>
    {!hasPassword
      ? <p className="rounded-xl bg-[var(--color-surface-alt)] p-4 text-sm leading-6 text-[var(--color-on-surface-variant)]">Bạn đang đăng nhập bằng Google nên tài khoản chưa có mật khẩu. Để tạo mật khẩu, hãy đăng xuất và chọn "Quên mật khẩu" ở trang đăng nhập.</p>
      : <form onSubmit={handleSubmit((value) => change.mutate({ currentPassword: value.currentPassword, newPassword: value.newPassword }))} noValidate>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Mật khẩu hiện tại" error={errors.currentPassword?.message}><input {...register("currentPassword")} type="password" autoComplete="current-password" className={inputClass} /></Field>
          <Field label="Mật khẩu mới" error={errors.newPassword?.message}><input {...register("newPassword")} type="password" autoComplete="new-password" className={inputClass} /></Field>
          <Field label="Xác nhận mật khẩu" error={errors.confirmPassword?.message}><input {...register("confirmPassword")} type="password" autoComplete="new-password" className={inputClass} /></Field>
        </div>
        <div className="mt-5 flex justify-end"><Button type="submit" disabled={change.isPending}>{change.isPending ? "Đang đổi…" : "Đổi mật khẩu"}</Button></div>
      </form>}
  </section>;
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return <label className="block space-y-1.5 text-sm">
    <span className="font-medium">{label}</span>
    {children}
    {error && <span role="alert" className="block text-xs text-red-600">{error}</span>}
  </label>;
}

function SectionIcon({ icon: Icon }: { icon: React.ElementType }) {
  return <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-[var(--color-primary-subtle)] text-[var(--color-primary)]"><Icon className="size-5" aria-hidden="true" /></span>;
}

function toForm(profile: AccountProfile): ProfileForm {
  return { fullName: profile.fullName, phone: profile.phone ?? "", headline: profile.headline ?? "", bio: profile.bio ?? "" };
}
