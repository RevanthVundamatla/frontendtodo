export const API_BASE =
  import.meta.env.VITE_API_BASE ||
  "https://todolist-backend-4q3m.onrender.com/api";

export const BACKEND_ORIGIN = "https://todolist-backend-4q3m.onrender.com";

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

// ---- FETCH WRAPPER ----
export async function fetchApi(endpoint: string, options: RequestInit = {}) {
  const token = getAuthToken();

  const headers: any = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(data?.message || "API Error");
  }

  return data;
}

export function openTopLevel(url: string) {
  window.location.href = url;
}
