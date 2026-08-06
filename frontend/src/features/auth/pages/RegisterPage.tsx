import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, useNavigate } from "react-router-dom";
import { authApi } from "@/api/authApi";
import { useAuthStore } from "@/features/auth/stores/authStore";
import { getApiErrorMessage } from "@/lib/axios";

const schema = z
  .object({
    fullName: z.string().min(2),
    email: z.string().email(),
    password: z.string().min(8),
    confirmPassword: z.string().min(8),
    role: z.enum(["CANDIDATE", "RECRUITER"]),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type Form = z.infer<typeof schema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const setTokens = useAuthStore((s) => s.setTokens);
  const setUser = useAuthStore((s) => s.setUser);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { role: "CANDIDATE" },
  });

  const mutation = useMutation({
    mutationFn: (data: Form) =>
      authApi.register({
        email: data.email,
        password: data.password,
        fullName: data.fullName,
        role: data.role,
      }),
    onSuccess: async (res, vars) => {
      if (res.success && res.data?.accessToken) {
        setTokens(res.data.accessToken, res.data.refreshToken);
        try {
          const me = await authApi.me();
          if (me.success && me.data) setUser(me.data);
        } catch {
          setUser({
            id: 0,
            email: vars.email,
            fullName: vars.fullName,
            role: vars.role,
          });
        }
        navigate(vars.role === "RECRUITER" ? "/recruiter" : "/candidate", {
          replace: true,
        });
        return;
      }
      navigate("/login", { replace: true });
    },
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-surface-page px-4">
      <form
        onSubmit={handleSubmit((data) => mutation.mutate(data))}
        className="w-full max-w-md space-y-4 rounded-lg bg-surface-card p-8 shadow-sm"
      >
        <h1 className="font-display text-2xl font-bold text-brand-primary">Create account</h1>
        <p className="text-sm text-[var(--color-text-secondary)]">
          <code>POST /api/v1/auth/register</code> · land in role workspace
        </p>
        {(
          [
            ["fullName", "Full name", "text"],
            ["email", "Email", "email"],
            ["password", "Password", "password"],
            ["confirmPassword", "Confirm password", "password"],
          ] as const
        ).map(([name, label, type]) => (
          <div key={name}>
            <label className="mb-1 block text-sm">{label}</label>
            <input
              className="w-full rounded-md border border-[var(--color-border-default)] px-3 py-2"
              type={type}
              {...register(name)}
            />
            {errors[name] && (
              <p className="mt-1 text-xs text-status-danger">{errors[name]?.message}</p>
            )}
          </div>
        ))}
        <div>
          <label className="mb-1 block text-sm">I am a</label>
          <select
            className="w-full rounded-md border border-[var(--color-border-default)] px-3 py-2"
            {...register("role")}
          >
            <option value="CANDIDATE">Candidate</option>
            <option value="RECRUITER">Recruiter</option>
          </select>
        </div>
        {mutation.isError && (
          <p className="text-sm text-status-danger">{getApiErrorMessage(mutation.error)}</p>
        )}
        <button
          type="submit"
          disabled={mutation.isPending}
          className="w-full rounded-md bg-brand-primary px-4 py-2.5 font-medium text-[var(--color-text-inverse)] hover:bg-brand-primary-hover disabled:opacity-60"
        >
          {mutation.isPending ? "Creating…" : "Register"}
        </button>
        <p className="text-center text-sm">
          <Link className="text-brand-secondary" to="/login">
            Back to login
          </Link>
        </p>
      </form>
    </div>
  );
}
