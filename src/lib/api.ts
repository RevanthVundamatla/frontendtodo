export const API_BASE =
  (import.meta.env.VITE_API_BASE as string | undefined) ||
  "https://todolist-backend-4q3m.onrender.com";

// remove /api dependency confusion
export const BACKEND_ORIGIN = API_BASE;

// FIXED GOOGLE URL (no duplication risk)
export const GOOGLE_OAUTH_URL = `${BACKEND_ORIGIN}/api/auth/google`;

const TOKEN_KEY = "token";
const REFRESH_KEY = "refreshToken";

export function getAuthToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function removeAuthToken() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY);
}

export function setRefreshToken(token: string) {
  if (token) localStorage.setItem(REFRESH_KEY, token);
}

let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  refreshInFlight = (async () => {
    try {
      const response = await fetch(`${API_BASE}/api/auth/refresh-token`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) return null;

      const newAccess = data?.data?.accessToken;
      const newRefresh = data?.data?.refreshToken;

      if (newAccess) setAuthToken(newAccess);
      if (newRefresh) setRefreshToken(newRefresh);

      return newAccess || null;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

async function rawFetch(endpoint: string, options: RequestInit, token: string | null) {
  const headers = new Headers(options.headers || {});

  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (!(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });
}

export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const token = getAuthToken();

  let response = await rawFetch(endpoint, options, token);

  if (
    response.status === 401 &&
    token &&
    endpoint !== "/api/auth/refresh-token" &&
    endpoint !== "/api/auth/login"
  ) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      response = await rawFetch(endpoint, options, newToken);
    }
  }

  let data: any;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    const error: any = new Error(
      data?.error || data?.message || "An error occurred"
    );
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export function openTopLevel(url: string) {
  try {
    if (window.top && window.top !== window.self) {
      window.top.location.href = url;
      return;
    }
  } catch {
    const win = window.open(url, "_blank", "noopener");
    if (win) return;
  }
  window.location.href = url;
}
