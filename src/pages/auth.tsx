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

  // Handle OAuth errors from URL
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

  // FIXED Google login (more reliable)
  const startGoogleSignIn = () => {
    try {
      if (!GOOGLE_OAUTH_URL) {
        setError("Google login URL is not configured.");
        return;
      }
      openTopLevel(GOOGLE_OAUTH_URL);
    } catch {
      setError("Unable to start Google sign in.");
    }
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

        login(
          response.data.accessToken,
          response.data.user,
          response.data.refreshToken
        );
        return;
      }

      if (mode === "register") {
        if (!trimmedName || !trimmedEmail || !password) {
          setError("Please fill in your name, email and password.");
          return;
        }

        const response = await fetchApi("/auth/register", {
          method: "POST",
          body: JSON.stringify({
            name: trimmedName,
            email: trimmedEmail,
            password,
          }),
        });

        setMode("verify");
        setMessage(
          response.message || "Registration successful. Verify your email."
        );
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

        login(
          response.data.accessToken,
          response.data.user,
          response.data.refreshToken
        );
        return;
      }

      if (mode === "forgot") {
        const response = await fetchApi("/auth/forgot-password", {
          method: "POST",
          body: JSON.stringify({ email: trimmedEmail }),
        });

        setMode("reset");
        setMessage(response.message || "OTP sent if account exists.");
        return;
      }

      if (mode === "reset") {
        const response = await fetchApi("/auth/reset-password", {
          method: "POST",
          body: JSON.stringify({
            email: trimmedEmail,
            otp: otp.trim(),
            newPassword,
          }),
        });

        setMode("login");
        setOtp("");
        setPassword("");
        setNewPassword("");
        setMessage(response.message || "Password reset successful.");
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

  const resendOtp = async (
    purpose: "email_verification" | "login_mfa" | "password_reset"
  ) => {
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
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100">
      {/* Your UI unchanged (already good) */}
    </main>
  );
}
