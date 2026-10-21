import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Eye,
  EyeOff,
  HelpCircle,
  Loader2,
  Mail,
  Send,
  ShieldCheck,
} from "lucide-react";
import { companyApi } from "@/api/tenant/companyApi";
import { Button } from "@/components/ux/Button";
import { Card } from "@/components/ux/Card";
import { getApiErrorMessage } from "@/lib/axios";
import { toast } from "@/stores/toastStore";
import { useAuthStore } from "@/features/tenant/auth/stores/authStore";

const emailSettingSchema = z.object({
  mailUsername: z.string().trim().email("Địa chỉ Gmail không hợp lệ"),
  mailPassword: z.string().trim().optional(),
  fromName: z.string().trim().max(128, "Tên người gửi tối đa 128 ký tự").optional(),
});

type EmailSettingFormData = z.infer<typeof emailSettingSchema>;

const inputClass =
  "h-10 sm:h-11 w-full rounded-lg border border-[var(--color-border-default)] bg-surface-card px-3.5 text-sm text-[var(--color-text-primary)] outline-none transition-all duration-150 focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/15 placeholder:text-[var(--color-text-secondary)]/50";

export function CompanyEmailSettingsCard() {
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((s) => s.user);
  const [showPassword, setShowPassword] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [testRecipient, setTestRecipient] = useState(currentUser?.email || "");

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ["tenant", "company", "mail-settings"],
    queryFn: companyApi.getMailSettings,
  });

  const mailSetting = data?.data;

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<EmailSettingFormData>({
    resolver: zodResolver(emailSettingSchema),
    defaultValues: {
      mailUsername: "",
      mailPassword: "",
      fromName: "",
    },
  });

  useEffect(() => {
    if (mailSetting) {
      reset({
        mailUsername: mailSetting.mailUsername || "",
        mailPassword: "",
        fromName: mailSetting.fromName || "",
      });
    }
  }, [mailSetting, reset]);

  const saveMutation = useMutation({
    mutationFn: companyApi.saveMailSettings,
    onSuccess: (res) => {
      queryClient.setQueryData(["tenant", "company", "mail-settings"], res);
      toast.success("Đã lưu cấu hình tài khoản Gmail thành công!");
    },
    onError: (err) => {
      toast.danger(getApiErrorMessage(err, "Không thể lưu cấu hình Gmail"));
    },
  });

  const testMutation = useMutation({
    mutationFn: companyApi.testMailConnection,
    onSuccess: () => {
      toast.success(`Đã gửi email thử nghiệm thành công tới ${testRecipient}!`);
    },
    onError: (err) => {
      toast.danger(getApiErrorMessage(err, "Kiểm tra kết nối thất bại"));
    },
  });

  const onSubmit = (formData: EmailSettingFormData) => {
    if (!mailSetting?.configured && !formData.mailPassword) {
      toast.danger("Vui lòng nhập Mật khẩu ứng dụng (Google App Password) khi thiết lập lần đầu.");
      return;
    }
    saveMutation.mutate({
      mailUsername: formData.mailUsername,
      mailPassword: formData.mailPassword || undefined,
      fromName: formData.fromName || undefined,
      isActive: true,
    });
  };

  const handleTestConnection = () => {
    const values = watch();
    if (!values.mailUsername) {
      toast.danger("Vui lòng nhập địa chỉ Gmail gửi trước khi kiểm tra.");
      return;
    }
    if (!mailSetting?.configured && !values.mailPassword) {
      toast.danger("Vui lòng nhập Mật khẩu ứng dụng (App Password) để kiểm tra kết nối.");
      return;
    }
    if (!testRecipient || !testRecipient.includes("@")) {
      toast.danger("Vui lòng nhập email người nhận thử nghiệm hợp lệ.");
      return;
    }

    testMutation.mutate({
      mailUsername: values.mailUsername,
      mailPassword: values.mailPassword || undefined,
      fromName: values.fromName || undefined,
      testRecipientEmail: testRecipient,
    });
  };

  if (isLoading) {
    return (
      <Card className="p-6 space-y-4">
        <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
          <Loader2 className="size-4 animate-spin" />
          <span>Đang tải cấu hình email...</span>
        </div>
      </Card>
    );
  }

  if (isError) {
    return (
      <Card className="p-6 space-y-3">
        <div className="flex items-center gap-2 text-status-danger text-sm">
          <AlertCircle className="size-5" />
          <span>{getApiErrorMessage(error, "Không thể tải cấu hình email")}</span>
        </div>
      </Card>
    );
  }

  const isConfigured = Boolean(mailSetting?.configured);

  return (
    <Card id="email-settings" className="space-y-6 p-6">
      {/* ──── Header & Status ──── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-[var(--color-border-default)] pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="grid size-9 place-items-center rounded-lg bg-brand-primary/10 text-brand-primary">
              <Mail className="size-5" />
            </div>
            <h2 className="text-lg font-bold text-[var(--color-text-primary)]">
              Tài khoản Gmail gửi thư của Công ty
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[var(--color-text-secondary)]">
            Email gửi lời mời nhân viên, lịch phỏng vấn và kết quả đánh giá sẽ được gửi trực tiếp từ Gmail của công ty bạn.
          </p>
        </div>

        <div>
          {isConfigured ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
              <CheckCircle2 className="size-4" />
              Đã kết nối ({mailSetting?.mailUsername})
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
              <AlertCircle className="size-4" />
              Chưa thiết lập Gmail gửi thư
            </span>
          )}
        </div>
      </div>

      {/* ──── Warning Banner if not configured ──── */}
      {!isConfigured && (
        <div className="flex items-start gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-4 text-xs sm:text-sm text-amber-700 dark:text-amber-300">
          <AlertCircle className="size-5 shrink-0 text-amber-500 mt-0.5" />
          <div className="space-y-1 leading-relaxed">
            <p className="font-semibold">Bắt buộc cấu hình để gửi email:</p>
            <p>
              Hệ thống yêu cầu công ty thiết lập tài khoản Gmail của chính bạn để gửi thư mời nhân viên và thông báo tuyển dụng. Vui lòng nhập Gmail và Mật khẩu ứng dụng bên dưới rồi bấm <strong>Lưu cấu hình</strong>.
            </p>
          </div>
        </div>
      )}

      {/* ──── Form Fields ──── */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Gmail Username */}
          <div className="space-y-1.5">
            <label htmlFor="mailUsername" className="text-xs sm:text-sm font-medium text-[var(--color-text-primary)]">
              Địa chỉ Gmail của Công ty / Admin <span className="text-red-500">*</span>
            </label>
            <input
              id="mailUsername"
              type="email"
              placeholder="VD: tuyendung@gmail.com hoặc admin@gmail.com"
              aria-invalid={!!errors.mailUsername}
              {...register("mailUsername")}
              className={inputClass}
            />
            {errors.mailUsername && (
              <p className="text-xs text-status-danger">{errors.mailUsername.message}</p>
            )}
          </div>

          {/* From Name */}
          <div className="space-y-1.5">
            <label htmlFor="fromName" className="text-xs sm:text-sm font-medium text-[var(--color-text-primary)]">
              Tên hiển thị người gửi (Sender Display Name)
            </label>
            <input
              id="fromName"
              type="text"
              placeholder="VD: Phòng Tuyển dụng ABC Corp"
              aria-invalid={!!errors.fromName}
              {...register("fromName")}
              className={inputClass}
            />
            {errors.fromName && (
              <p className="text-xs text-status-danger">{errors.fromName.message}</p>
            )}
          </div>
        </div>

        {/* Gmail App Password */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label htmlFor="mailPassword" className="text-xs sm:text-sm font-medium text-[var(--color-text-primary)]">
              Mật khẩu ứng dụng Google (App Password 16 ký tự){" "}
              {!isConfigured && <span className="text-red-500">*</span>}
            </label>
            <button
              type="button"
              onClick={() => setShowGuide((prev) => !prev)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-primary hover:underline"
            >
              <HelpCircle className="size-3.5" />
              Cách lấy mật khẩu ứng dụng
            </button>
          </div>

          <div className="relative">
            <input
              id="mailPassword"
              type={showPassword ? "text" : "password"}
              placeholder={
                isConfigured
                  ? "•••••••••••••••• (Để trống nếu giữ nguyên mật khẩu cũ)"
                  : "Dán chuỗi 16 chữ cái (VD: abcd efgh ijkl mnop)"
              }
              {...register("mailPassword")}
              className={`${inputClass} pr-10 font-mono`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            >
              {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
            </button>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)]">
            Đây là mật khẩu 16 ký tự do Google tạo riêng cho ứng dụng, <strong>không phải</strong> mật khẩu đăng nhập Gmail thông thường.
          </p>
        </div>

        {/* ──── Help Guide Accordion ──── */}
        {showGuide && (
          <div className="rounded-lg border border-[var(--color-border-default)] bg-surface-muted p-4 space-y-2 text-xs sm:text-sm text-[var(--color-text-secondary)]">
            <div className="flex items-center gap-1.5 font-semibold text-[var(--color-text-primary)]">
              <ShieldCheck className="size-4 text-brand-primary" />
              <span>3 bước lấy Mật khẩu ứng dụng Google (Google App Password):</span>
            </div>
            <ol className="list-decimal list-inside space-y-1 pl-1 leading-relaxed">
              <li>
                Đảm bảo tài khoản Google đã bật <strong>Xác thực 2 bước (2-Step Verification)</strong>.
              </li>
              <li>
                Truy cập trực tiếp đường link bảo mật:{" "}
                <a
                  href="https://myaccount.google.com/apppasswords"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-brand-primary hover:underline inline-flex items-center gap-0.5"
                >
                  myaccount.google.com/apppasswords
                  <ExternalLink className="size-3" />
                </a>
              </li>
              <li>
                Đặt tên ứng dụng là <code>SmartHire</code> rồi nhấn <strong>Tạo</strong>. Google sẽ hiển thị chuỗi 16 chữ cái (dạng <code>xxxx xxxx xxxx xxxx</code>). Bạn copy và dán vào ô bên trên.
              </li>
            </ol>
          </div>
        )}

        {/* ──── Test Connection Section ──── */}
        <div className="rounded-lg border border-[var(--color-border-default)] bg-surface-card p-4 space-y-3">
          <div className="flex flex-col gap-1">
            <span className="text-xs sm:text-sm font-semibold text-[var(--color-text-primary)]">
              Kiểm tra kết nối & Gửi email thử nghiệm
            </span>
            <p className="text-xs text-[var(--color-text-secondary)]">
              Gửi một email test để đảm bảo thông tin Gmail và Mật khẩu ứng dụng hoạt động chính xác trước khi lưu.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type="email"
              value={testRecipient}
              onChange={(e) => setTestRecipient(e.target.value)}
              placeholder="Nhập email nhận thử nghiệm (VD: your_email@gmail.com)"
              className={`${inputClass} sm:max-w-md`}
            />
            <Button
              type="button"
              variant="secondary"
              onClick={handleTestConnection}
              disabled={testMutation.isPending || saveMutation.isPending}
              className="gap-2 shrink-0"
            >
              {testMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Đang kiểm tra...
                </>
              ) : (
                <>
                  <Send className="size-4" />
                  Kiểm tra kết nối
                </>
              )}
            </Button>
          </div>
        </div>

        {/* ──── Submit Action ──── */}
        <div className="flex justify-end pt-2">
          <Button
            type="submit"
            disabled={saveMutation.isPending || testMutation.isPending}
            className="min-w-[140px] gap-2"
          >
            {saveMutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Đang lưu...
              </>
            ) : (
              "Lưu cấu hình Gmail"
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
}
