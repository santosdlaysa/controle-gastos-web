"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { getMe, logout as logoutApi } from "@/lib/auth";

type User = { id: number; openId: string; name: string | null; email: string | null; role: "user" | "admin" };

type AuthContextType = {
  user: User | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  logout: () => Promise<void>;
  refetch: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    const me = await getMe();
    setUser(me);
    setLoading(false);
  }, []);

  useEffect(() => { refetch(); }, [refetch]);

  const logout = async () => {
    await logoutApi();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, setUser, logout, refetch }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
