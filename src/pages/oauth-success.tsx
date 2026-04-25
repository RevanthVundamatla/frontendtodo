import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { fetchApi, setAuthToken, removeAuthToken } from "../lib/api";
import { useAuth } from "../lib/auth-context";

function decodeJwt(token: string): Record<string, any> | null {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function OAuthSuccessPage() {
  const { login } = useAuth();
  const [, setLocation] = useLocation();
  const [error, setError] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");

    if (!token) {
      setError("Missing sign-in token from Google.");
      setTimeout(() => setLocation("/auth?error=google_auth_failed"), 1500);
      return;
    }

    setAuthToken(token);

    (async () => {
      try {
        const profile = await fetchApi("/auth/profile");
        const user = profile.data || profile.user || profile;
        login(token, user);
      } catch (err) {
        // Backend currently signs the OAuth JWT with { id, email } while the
        // protect middleware reads `userId`, which makes /auth/profile fail.
        // Fall back to the token payload so users can still enter the workspace.
        const decoded = decodeJwt(token);
        if (decoded && (decoded.id || decoded.userId) && decoded.email) {
          login(token, {
            id: decoded.id || decoded.userId,
            email: decoded.email,
            name: decoded.name || decoded.email.split("@")[0],
          });
          return;
        }
        removeAuthToken();
        const message = err instanceof Error ? err.message : "Could not complete Google sign in.";
        setError(message);
        setTimeout(() => setLocation("/auth?error=oauth_profile_failed"), 1500);
      }
    })();
  }, [login, setLocation]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,hsl(160_65%_85%),transparent_32%),linear-gradient(135deg,hsl(155_50%_96%),hsl(178_42%_91%))] px-4 text-emerald-950">
      <div className="w-full max-w-md rounded-3xl border border-white/70 bg-white/85 px-8 py-10 text-center shadow-2xl shadow-emerald-900/10 backdrop-blur-xl">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-primary">Todo List</p>
        <h1 className="mt-3 text-2xl font-black">
          {error ? "Sign in failed" : "Finishing Google sign in..."}
        </h1>
        <p className="mt-3 text-sm text-emerald-900/75">
          {error ? error : "Hold on while we open your workspace."}
        </p>
      </div>
    </main>
  );
}
