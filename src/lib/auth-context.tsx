import React, { createContext, useContext, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { fetchApi, getAuthToken, removeAuthToken, setAuthToken, setRefreshToken } from "./api";

interface User {
  id: string;
  email: string;
  name: string;
  isPremium?: boolean;
  premiumExpiresAt?: string | null;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (token: string, user: User, refreshToken?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    async function init() {
      const token = getAuthToken();
      if (token) {
        try {
          const profile = await fetchApi("/auth/profile");
          setUser(profile.data || profile.user || profile);
        } catch {
          removeAuthToken();
        }
      }
      setIsLoading(false);
    }
    init();
  }, []);

  const login = (token: string, user: User, refreshToken?: string) => {
    setAuthToken(token);
    if (refreshToken) setRefreshToken(refreshToken);
    setUser(user);
    setLocation("/");
  };

  const logout = async () => {
    try {
      await fetchApi("/auth/logout", { method: "POST" });
    } catch {
      // ignore
    }
    removeAuthToken();
    setUser(null);
    setLocation("/auth");
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
