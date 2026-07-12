import { CreditCard, Lock, Mail, UserRound } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "../components/Button";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../context/ToastContext";

interface AuthFormValues {
  name?: string;
  email: string;
  password: string;
}

const controlClass =
  "focus-ring w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 pl-10 text-sm text-slate-900 placeholder:text-slate-400 dark:border-slate-700 dark:bg-slate-950 dark:text-white";

export function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const { signIn, signUp, continueDemo, isDemoMode } = useAuth();
  const { notify } = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<AuthFormValues>({
    defaultValues: {
      email: "",
      password: "",
      name: "",
    },
  });

  const submit = async (values: AuthFormValues) => {
    try {
      if (mode === "register") {
        await signUp(values.email, values.password, values.name);
        notify({ severity: "success", title: "Account created", message: "Welcome to Debt Tracker." });
      } else {
        await signIn(values.email, values.password);
        notify({ severity: "success", title: "Signed in", message: "Your dashboard is ready." });
      }
    } catch (error) {
      notify({
        severity: "danger",
        title: "Authentication failed",
        message: error instanceof Error ? error.message : "Please check your credentials and try again.",
      });
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-finance-surface px-4 py-10 dark:bg-slate-950">
      <div className="grid w-full max-w-5xl overflow-hidden rounded-3xl bg-white shadow-card dark:bg-slate-900 lg:grid-cols-[0.95fr_1.05fr]">
        <section className="bg-blue-600 p-8 text-white sm:p-10">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15">
            <CreditCard className="h-7 w-7" />
          </div>
          <h1 className="mt-8 text-3xl font-bold tracking-normal sm:text-4xl">Debt Tracker</h1>
          <p className="mt-4 max-w-md text-sm leading-6 text-blue-50">
            Securely manage personal loans, upcoming installments, payment history, completed loans, and repayment analytics.
          </p>
          <div className="mt-10 grid gap-3 text-sm">
            {["Supabase authentication", "Row-level secured loan data", "Dashboard-first financial workflow"].map((item) => (
              <div key={item} className="rounded-2xl bg-white/12 px-4 py-3 font-semibold">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="p-8 sm:p-10">
          <div className="mb-6 flex rounded-2xl bg-slate-100 p-1 dark:bg-slate-950">
            <button
              type="button"
              className={`focus-ring flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                mode === "login" ? "bg-white text-slate-950 shadow-sm dark:bg-slate-800 dark:text-white" : "text-slate-500"
              }`}
              onClick={() => setMode("login")}
            >
              Login
            </button>
            <button
              type="button"
              className={`focus-ring flex-1 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                mode === "register" ? "bg-white text-slate-950 shadow-sm dark:bg-slate-800 dark:text-white" : "text-slate-500"
              }`}
              onClick={() => setMode("register")}
            >
              Register
            </button>
          </div>

          <h2 className="text-2xl font-bold text-slate-950 dark:text-white">
            {mode === "login" ? "Welcome back" : "Create your account"}
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            {mode === "login" ? "Sign in to continue managing your debt plan." : "Start a private workspace for your loans."}
          </p>

          <form className="mt-8 space-y-4" onSubmit={handleSubmit(submit)}>
            {mode === "register" ? (
              <label className="relative block">
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Name</span>
                <UserRound className="pointer-events-none absolute left-3 top-[2.55rem] h-4 w-4 text-slate-400" />
                <input className={`${controlClass} mt-1`} {...register("name")} />
              </label>
            ) : null}
            <label className="relative block">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Email</span>
              <Mail className="pointer-events-none absolute left-3 top-[2.55rem] h-4 w-4 text-slate-400" />
              <input
                className={`${controlClass} mt-1`}
                type="email"
                {...register("email", { required: "Email is required" })}
              />
              {errors.email ? <span className="mt-1 block text-xs font-medium text-red-600">{errors.email.message}</span> : null}
            </label>
            <label className="relative block">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">Password</span>
              <Lock className="pointer-events-none absolute left-3 top-[2.55rem] h-4 w-4 text-slate-400" />
              <input
                className={`${controlClass} mt-1`}
                type="password"
                {...register("password", { required: "Password is required", minLength: 6 })}
              />
              {errors.password ? (
                <span className="mt-1 block text-xs font-medium text-red-600">Password must be at least 6 characters.</span>
              ) : null}
            </label>
            <Button type="submit" className="w-full" isLoading={isSubmitting}>
              {mode === "login" ? "Login" : "Register"}
            </Button>
          </form>

          {isDemoMode ? (
            <div className="mt-6 rounded-2xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
              <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">Supabase is not configured in this workspace.</p>
              <p className="mt-1 text-sm text-blue-800 dark:text-blue-200">
                Continue in demo mode to explore the full app with local sample data.
              </p>
              <Button type="button" variant="secondary" className="mt-4 w-full" onClick={continueDemo}>
                Continue Demo
              </Button>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}
