import { FormEvent, useEffect, useState } from "react";
import { useAuth } from "../lib/auth-context";
import { fetchApi, GOOGLE_OAUTH_URL, openTopLevel } from "../lib/api";

const oauthErrorMessages: Record<string, string> = {
  google_auth_failed: "Google sign in was cancelled or failed. Please try again.",
  oauth_token_generation_failed: "We could not finish your Google sign in. Please try again.",
  oauth_profile_failed: "Signed in with Google, but loading your profile failed.",
};

type AuthMode = "login" | "register" | "verify" | "mfa" | "forgot" | "reset";

export function AuthPage() {
  const { login } = useAuth();
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const clearFeedback = () => {
    setMessage("");
    setError("");
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const errorCode = params.get("error");
    if (errorCode) {
      setError(oauthErrorMessages[errorCode] || "Sign in failed. Please try again.");
      const url = new URL(window.location.href);
      url.searchParams.delete("error");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  const startGoogleSignIn = () => {
    openTopLevel(GOOGLE_OAUTH_URL);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    clearFeedback();
    setIsSubmitting(true);

    try {
      const trimmedEmail = email.trim().toLowerCase();
      const trimmedName = name.trim();

      if (mode === "login") {
        const response = await fetchApi("/auth/login", {
          method: "POST",
          body: JSON.stringify({ email: trimmedEmail, password }),
        });

        if (response.requiresMFA) {
          setMode("mfa");
          setMessage(response.message || "Enter the OTP sent to your email.");
          return;
        }

        login(response.data.accessToken, response.data.user, response.data.refreshToken);
        return;
      }

      if (mode === "register") {
        if (!trimmedName || !trimmedEmail || !password) {
          setError("Please fill in your name, email and password.");
          return;
        }
        const response = await fetchApi("/auth/register", {
          method: "POST",
          body: JSON.stringify({ name: trimmedName, email: trimmedEmail, password }),
        });
        setMode("verify");
        setMessage(response.message || "Registration successful. Verify your email with the OTP.");
        return;
      }

      if (mode === "verify") {
        const response = await fetchApi("/auth/verify-email", {
          method: "POST",
          body: JSON.stringify({ email: trimmedEmail, otp: otp.trim() }),
        });
        setMode("login");
        setOtp("");
        setMessage(response.message || "Email verified. You can now sign in.");
        return;
      }

      if (mode === "mfa") {
        const response = await fetchApi("/auth/verify-mfa", {
          method: "POST",
          body: JSON.stringify({ email: trimmedEmail, otp: otp.trim() }),
        });
        login(response.data.accessToken, response.data.user, response.data.refreshToken);
        return;
      }

      if (mode === "forgot") {
        const response = await fetchApi("/auth/forgot-password", {
          method: "POST",
          body: JSON.stringify({ email: trimmedEmail }),
        });
        setMode("reset");
        setMessage(response.message || "If the account exists, an OTP has been sent.");
        return;
      }

      if (mode === "reset") {
        const response = await fetchApi("/auth/reset-password", {
          method: "POST",
          body: JSON.stringify({ email: trimmedEmail, otp: otp.trim(), newPassword }),
        });
        setMode("login");
        setOtp("");
        setPassword("");
        setNewPassword("");
        setMessage(response.message || "Password reset successful. Sign in with your new password.");
      }
    } catch (err) {
      const text = err instanceof Error ? err.message : "Something went wrong.";
      if (text.toLowerCase().includes("email not verified")) {
        setMode("verify");
      }
      setError(text);
    } finally {
      setIsSubmitting(false);
    }
  };

  const resendOtp = async (purpose: "email_verification" | "login_mfa" | "password_reset") => {
    clearFeedback();
    setIsSubmitting(true);
    try {
      const response = await fetchApi("/auth/resend-otp", {
        method: "POST",
        body: JSON.stringify({ email, purpose }),
      });
      setMessage(response.message || "OTP sent.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not resend OTP.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const title = {
    login: "Welcome back",
    register: "Create your workspace",
    verify: "Verify your email",
    mfa: "Confirm your sign in",
    forgot: "Reset your password",
    reset: "Set a new password",
  }[mode];

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,hsl(160_65%_85%),transparent_32%),linear-gradient(135deg,hsl(155_50%_96%),hsl(178_42%_91%))] text-foreground">
      <div className="mx-auto grid min-h-screen w-full max-w-6xl items-center gap-10 px-5 py-10 lg:grid-cols-[1fr_460px]">
        <section className="space-y-8">
          <div className="inline-flex rounded-full border border-primary/20 bg-white/65 px-4 py-2 text-sm font-medium text-primary shadow-sm backdrop-blur">
            Task clarity for busy days
          </div>
          <div className="space-y-5">
            <h1 className="max-w-3xl text-5xl font-black tracking-tight text-emerald-950 md:text-7xl">
              Turn a noisy day into a calm plan.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-emerald-900/75">
              Capture tasks, add priority, track progress, and keep your list synced with the existing Todo backend.
            </p>
          </div>
          <div className="grid max-w-2xl gap-4 sm:grid-cols-3">
            {["Prioritize work", "Filter focus", "Finish with momentum"].map((item) => (
              <div key={item} className="rounded-3xl border border-white/70 bg-white/55 p-5 font-semibold text-emerald-950 shadow-sm backdrop-blur transition hover:-translate-y-1">
                {item}
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-[2rem] border border-white/75 bg-white/85 p-6 shadow-2xl shadow-emerald-900/10 backdrop-blur-xl sm:p-8">
          <div className="mb-7">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Todo List</p>
            <h2 className="mt-2 text-3xl font-black text-emerald-950">{title}</h2>
          </div>

          {(mode === "login" || mode === "register") && (
            <div className="mb-5 space-y-3">
              <button
                type="button"
                onClick={startGoogleSignIn}
                className="flex w-full items-center justify-center gap-3 rounded-2xl border border-emerald-100 bg-white px-5 py-3 font-semibold text-emerald-950 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
              >
                <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
                  <path fill="#4285F4" d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" />
                  <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" />
                  <path fill="#FBBC05" d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" />
                  <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" />
                </svg>
                Continue with Google
              </button>
              <div className="flex items-center gap-3">
                <span className="h-px flex-1 bg-emerald-100" />
                <span className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-700/70">or</span>
                <span className="h-px flex-1 bg-emerald-100" />
              </div>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            {mode === "register" && (
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-emerald-950">Name</span>
                <input className="w-full rounded-2xl border border-emerald-100 bg-white px-4 py-3 outline-none ring-primary/30 transition focus:ring-4" value={name} onChange={(event) => setName(event.target.value)} required minLength={2} />
              </label>
            )}

            <label className="block space-y-2">
              <span className="text-sm font-semibold text-emerald-950">Email</span>
              <input className="w-full rounded-2xl border border-emerald-100 bg-white px-4 py-3 outline-none ring-primary/30 transition focus:ring-4" value={email} onChange={(event) => setEmail(event.target.value)} type="email" required />
            </label>

            {(mode === "login" || mode === "register") && (
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-emerald-950">Password</span>
                <input className="w-full rounded-2xl border border-emerald-100 bg-white px-4 py-3 outline-none ring-primary/30 transition focus:ring-4" value={password} onChange={(event) => setPassword(event.target.value)} type="password" required minLength={6} />
              </label>
            )}

            {(mode === "verify" || mode === "mfa" || mode === "reset") && (
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-emerald-950">OTP code</span>
                <input className="w-full rounded-2xl border border-emerald-100 bg-white px-4 py-3 tracking-[0.45em] outline-none ring-primary/30 transition focus:ring-4" value={otp} onChange={(event) => setOtp(event.target.value)} required />
              </label>
            )}

            {mode === "reset" && (
              <label className="block space-y-2">
                <span className="text-sm font-semibold text-emerald-950">New password</span>
                <input className="w-full rounded-2xl border border-emerald-100 bg-white px-4 py-3 outline-none ring-primary/30 transition focus:ring-4" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} type="password" required minLength={6} />
              </label>
            )}

            {message && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">{message}</div>}
            {error && <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{error}</div>}

            <button className="w-full rounded-2xl bg-primary px-5 py-3 font-bold text-primary-foreground shadow-lg shadow-emerald-700/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60" disabled={isSubmitting}>
              {isSubmitting ? "Working..." : mode === "login" ? "Sign in" : mode === "register" ? "Create account" : mode === "forgot" ? "Send reset OTP" : mode === "reset" ? "Reset password" : "Continue"}
            </button>
          </form>

          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm">
            {mode !== "login" && <button className="font-semibold text-primary" onClick={() => { clearFeedback(); setMode("login"); }}>Back to sign in</button>}
            {mode === "login" && <button className="font-semibold text-primary" onClick={() => { clearFeedback(); setMode("register"); }}>Create account</button>}
            {mode === "login" && <button className="font-semibold text-emerald-700" onClick={() => { clearFeedback(); setMode("forgot"); }}>Forgot password</button>}
            {mode === "verify" && <button className="font-semibold text-emerald-700" onClick={() => resendOtp("email_verification")}>Resend OTP</button>}
            {mode === "mfa" && <button className="font-semibold text-emerald-700" onClick={() => resendOtp("login_mfa")}>Resend OTP</button>}
            {mode === "reset" && <button className="font-semibold text-emerald-700" onClick={() => resendOtp("password_reset")}>Resend OTP</button>}
          </div>
        </section>
      </div>
    </main>
  );
}